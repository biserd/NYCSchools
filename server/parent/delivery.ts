import {hasAssistantAccess,preferences,quietNow,type AssistantEnvironment} from './service';
import {parentWhatsappReady,verifyTwilioSignature} from './whatsapp';
export const PARENT_STATUS_PATH='/api/parent/whatsapp/status';

export async function pruneParentData(env:AssistantEnvironment,now=Date.now()) {
  // Keep short-lived drafts only for confirmation/retry, never a chat transcript.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM parent_drafts WHERE expires_at<?').bind(now-86400000),
    env.DB.prepare('DELETE FROM parent_usage WHERE day<?').bind(new Date(now-35*86400000).toISOString().slice(0,10)),
    env.DB.prepare('DELETE FROM parent_whatsapp_receipts WHERE received_at<?').bind(now-7*86400000),
    env.DB.prepare("DELETE FROM parent_reminders WHERE created_at<? AND status NOT IN ('pending','sending')").bind(now-90*86400000),
    env.DB.prepare('DELETE FROM parent_checkout_attempts WHERE expires_at<?').bind(now-86400000),
  ]);
}

// D1 is the durable outbox. Atomic claims prevent two cron invocations dispatching
// the same reminder. Network uncertainty is quarantined, NEVER blindly retried.
export async function processReminders(env:AssistantEnvironment,transport:typeof fetch=fetch,now=Date.now()) {
  if(env.PARENT_REMINDERS_ENABLED!=='true'||!parentWhatsappReady(env,now)||!/^HX[a-f0-9]{32}$/i.test(env.PARENT_REMINDER_CONTENT_SID||''))return;
  await env.DB.prepare("UPDATE parent_reminders SET status='uncertain',failure_code='worker_interrupted' WHERE status='sending' AND claim_at<?").bind(now-300000).run();
  const due=await env.DB.prepare("SELECT id,user_id,event_id FROM parent_reminders WHERE status='pending' AND next_attempt_at<=? ORDER BY next_attempt_at LIMIT 25").bind(now).all<{id:string;user_id:string;event_id:string}>();
  for(const r of due.results) {
    const p=await preferences(r.user_id,env);
    const phone=await env.DB.prepare('SELECT phone FROM parent_whatsapp_links WHERE user_id=? AND consent_at IS NOT NULL').bind(r.user_id).first<string>('phone');
    if(!p.reminderConsent||!phone||!await hasAssistantAccess(r.user_id,env,now)) {await env.DB.prepare("UPDATE parent_reminders SET status='canceled',failure_code='access_or_consent_ended' WHERE id=? AND status='pending'").bind(r.id).run();continue;}
    if(quietNow(now,p)){await env.DB.prepare("UPDATE parent_reminders SET next_attempt_at=? WHERE id=? AND status='pending'").bind(now+900000,r.id).run();continue;}
    const date=await env.DB.prepare('SELECT date FROM tuck_events WHERE id=?').bind(r.event_id).first<string>('date');
    if(!date||Date.parse(date+'T23:59:59Z')+14*3600000<now){await env.DB.prepare("UPDATE parent_reminders SET status='expired' WHERE id=? AND status='pending'").bind(r.id).run();continue;}
    const monthStart=Date.UTC(new Date(now).getUTCFullYear(),new Date(now).getUTCMonth(),1);
    const claimed=await env.DB.prepare(`UPDATE parent_reminders SET status='sending',claim_at=?,attempts=attempts+1 WHERE id=? AND status='pending' AND (SELECT count(*) FROM parent_reminders WHERE user_id=? AND claim_at>=? AND status NOT IN ('pending','canceled'))<100 RETURNING attempts`).bind(now,r.id,r.user_id,monthStart).first<{attempts:number}>();
    if(!claimed){
      await env.DB.prepare("UPDATE parent_reminders SET status='limit_reached',failure_code='monthly_limit' WHERE id=? AND status='pending' AND (SELECT count(*) FROM parent_reminders WHERE user_id=? AND claim_at>=? AND status NOT IN ('pending','canceled','limit_reached'))>=100").bind(r.id,r.user_id,monthStart).run();
      continue;
    }
    // Last-moment consent check before handing off to the provider.
    if(!(await preferences(r.user_id,env)).reminderConsent||!await env.DB.prepare('SELECT 1 FROM parent_whatsapp_links WHERE user_id=? AND phone=? AND consent_at IS NOT NULL').bind(r.user_id,phone).first()) {await env.DB.prepare("UPDATE parent_reminders SET status='canceled' WHERE id=?").bind(r.id).run();continue;}
    const form=new URLSearchParams({From:env.TWILIO_WHATSAPP_FROM!,To:phone,ContentSid:env.PARENT_REMINDER_CONTENT_SID!,StatusCallback:`${env.APP_URL}${PARENT_STATUS_PATH}?id=${r.id}`});
    try {
      const response=await transport(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,{method:'POST',headers:{Authorization:`Basic ${btoa(env.TWILIO_ACCOUNT_SID+':'+env.TWILIO_AUTH_TOKEN)}`,'Content-Type':'application/x-www-form-urlencoded'},body:form.toString(),signal:AbortSignal.timeout(10000)});
      if(response.status===429&&claimed.attempts<4){await env.DB.prepare("UPDATE parent_reminders SET status='pending',next_attempt_at=?,failure_code='rate_limited' WHERE id=? AND status='sending'").bind(now+Math.min(3600000,60000*2**claimed.attempts),r.id).run();continue;}
      if(!response.ok){await env.DB.prepare("UPDATE parent_reminders SET status=?,failure_code=? WHERE id=? AND status='sending'").bind(response.status>=500?'uncertain':'failed',`http_${response.status}`,r.id).run();continue;}
      const result=await response.json() as {sid?:string};
      if(!/^SM[a-f0-9]{32}$/i.test(result.sid||''))throw new Error('Invalid provider response');
      await env.DB.prepare("UPDATE parent_reminders SET status=CASE WHEN status='sending' THEN 'accepted' ELSE status END,message_sid=? WHERE id=? AND (message_sid IS NULL OR message_sid=?)").bind(result.sid!,r.id,result.sid!).run();
    } catch {await env.DB.prepare("UPDATE parent_reminders SET status='uncertain',failure_code='transport_uncertain' WHERE id=? AND status='sending'").bind(r.id).run();}
  }
}
export async function reminderStatusWebhook(request:Request,env:AssistantEnvironment) {
  if(!parentWhatsappReady(env))return new Response('Unavailable',{status:503});
  const url=new URL(request.url),id=url.searchParams.get('id');
  if(request.method!=='POST'||!id||!/^[a-f0-9-]{36}$/.test(id)||url.href!==`${env.APP_URL}${PARENT_STATUS_PATH}?id=${id}`)return new Response('Invalid callback',{status:400});
  if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return new Response('Invalid content',{status:415});
  const {readBoundedBody}=await import('./whatsapp');const body=await readBoundedBody(request);if(body===null)return new Response('Too large',{status:413});
  const form=new URLSearchParams(body);
  if(!await verifyTwilioSignature(url.href,form,request.headers.get('x-twilio-signature')||'',env.TWILIO_AUTH_TOKEN!)||form.get('AccountSid')!==env.TWILIO_ACCOUNT_SID)return new Response('Invalid signature',{status:403});
  const sid=form.get('MessageSid')||'',status=form.get('MessageStatus')||'';
  if(!/^SM[a-f0-9]{32}$/i.test(sid))return new Response('Invalid SID',{status:400});
  if(['delivered','read','failed','undelivered'].includes(status)) {
    await env.DB.prepare(`UPDATE parent_reminders SET status=?,message_sid=?,failure_code=? WHERE id=? AND (message_sid IS NULL OR message_sid=?) AND status IN ('sending','accepted','uncertain','delivered') AND (status!='delivered' OR ?='read')`).bind(status==='undelivered'?'failed':status,sid,/^\d+$/.test(form.get('ErrorCode')||'')?form.get('ErrorCode'):null,id,sid,status).run();
  }
  return new Response(null,{status:204});
}
