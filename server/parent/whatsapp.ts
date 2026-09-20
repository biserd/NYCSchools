// Signed ingress shared by the connection preview and gated Parent Assistant.
export const PARENT_WEBHOOK_PATH = '/api/parent/whatsapp/inbound';
export interface ParentAgentQueueJob {
  version:1;
  inboundSid:string;
  userId:string;
  phone:string;
  message:string;
  receivedAt:number;
}
export type ParentWhatsappEnvironment = Pick<Env, 'DB' | 'ENVIRONMENT' | 'APP_URL'> & {
  STAGING_EXPIRES_AT?: string;
  PARENT_WHATSAPP_ENABLED?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_WHATSAPP_FROM?: string;
  TWILIO_AUTH_TOKEN?: string;
  PARENT_ASSISTANT_ENABLED?:string;
  PARENT_AGENT_QUEUE?:Queue<ParentAgentQueueJob>;
  PARENT_AGENT_QUEUE_NAME?:string;
};
const phonePattern = /^whatsapp:\+[1-9]\d{7,14}$/;
const sidPattern = /^SM[a-f0-9]{32}$/i;
const encoder = new TextEncoder();
const stopWords = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REVOKE', 'OPTOUT']);

export function parentWhatsappReady(env: ParentWhatsappEnvironment, now = Date.now()) {
  const environmentAllowed = env.ENVIRONMENT === 'production' ||
    (env.ENVIRONMENT === 'staging' && now < Date.parse(env.STAGING_EXPIRES_AT || ''));
  return environmentAllowed && env.PARENT_WHATSAPP_ENABLED === 'true' && env.APP_URL.startsWith('https://') &&
    /^AC[a-f0-9]{32}$/i.test(env.TWILIO_ACCOUNT_SID || '') && !!env.TWILIO_AUTH_TOKEN &&
    phonePattern.test(env.TWILIO_WHATSAPP_FROM || '');
}
export async function hashLinkToken(token: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(token))), b => b.toString(16).padStart(2, '0')).join('');
}
function xml(text = '') {
  const escaped = text.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${text ? `<Message>${escaped}</Message>` : ''}</Response>`,
    { headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
export async function readBoundedBody(request: Request): Promise<string | null> {
  if (Number(request.headers.get('content-length')) > 16_384) return null;
  const reader = request.body?.getReader();
  if (!reader) return '';
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 16_384) { await reader.cancel(); return null; }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(body);
}

export async function verifyTwilioSignature(url: string, form: URLSearchParams, signature: string, authToken: string) {
  // All form parameters participate, including future fields added by Twilio.
  // Fail closed on duplicate keys instead of interpreting an ambiguous payload.
  const names = [...form.keys()];
  if (names.length !== new Set(names).size || !/^[A-Za-z0-9+/]{27}=$/.test(signature)) return false;
  const input = url + names.sort().map(key => key + form.get(key)).join('');
  const key = await crypto.subtle.importKey('raw', encoder.encode(authToken), { name: 'HMAC', hash: 'SHA-1' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, Uint8Array.from(atob(signature), char => char.charCodeAt(0)), encoder.encode(input));
}

export async function parentWhatsappWebhook(request: Request, env: ParentWhatsappEnvironment): Promise<Response> {
  const now = Date.now();
  if (!parentWhatsappReady(env, now)) return new Response('WhatsApp preview is not configured', { status: 503 });
  const url = new URL(request.url);
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  const canonical = new URL(PARENT_WEBHOOK_PATH, env.APP_URL).href;
  if (url.href !== canonical) return new Response('Invalid webhook URL', { status: 400 });
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded') {
    return new Response('Expected form data', { status: 415 });
  }
  const body = await readBoundedBody(request);
  if (body === null) return new Response('Request too large', { status: 413 });
  const form = new URLSearchParams(body);
  if (!await verifyTwilioSignature(canonical, form, request.headers.get('x-twilio-signature') || '', env.TWILIO_AUTH_TOKEN!)) {
    return new Response('Invalid signature', { status: 403 });
  }
  const from = form.get('From') || '', sid = form.get('MessageSid') || '';
  if (form.get('AccountSid') !== env.TWILIO_ACCOUNT_SID || form.get('To') !== env.TWILIO_WHATSAPP_FROM || !phonePattern.test(from) || !sidPattern.test(sid)) {
    return new Response('Invalid sender envelope', { status: 403 });
  }
  // User approved testing from any WhatsApp number. Calendar data still requires
  // a single-use link created in an authenticated NYC School Ratings session.
  const text = (form.get('Body') || '').trim();
  const command = text.toUpperCase();
  const assistantOn=Reflect.get(env,'PARENT_ASSISTANT_ENABLED')==='true';
  const isStop = form.get('OptOutType')?.toUpperCase() === 'STOP' || stopWords.has(command);

  // Side effects (link/disconnect) are idempotent. Receipts suppress duplicate
  // replies; only opaque provider SIDs/timestamps are retained, not conversations.
  if (await env.DB.prepare('SELECT message_sid FROM parent_whatsapp_receipts WHERE message_sid=?').bind(sid).first()) return xml();
  if (isStop) {
    await env.DB.batch([
      env.DB.prepare('UPDATE parent_preferences SET reminder_consent_at=NULL WHERE user_id IN (SELECT user_id FROM parent_whatsapp_links WHERE phone=?)').bind(from),
      env.DB.prepare("UPDATE parent_reminders SET status='canceled' WHERE status='pending' AND user_id IN (SELECT user_id FROM parent_whatsapp_links WHERE phone=?)").bind(from),
      env.DB.prepare('UPDATE parent_whatsapp_links SET phone=NULL, consent_at=NULL, token_hash=NULL, token_expires_at=NULL WHERE phone=?').bind(from),
      env.DB.prepare('INSERT OR IGNORE INTO parent_whatsapp_receipts(message_sid,received_at) VALUES (?,?)').bind(sid, now),
    ]);
    // Advanced Opt-Out already sends its own confirmation if OptOutType exists.
    return xml(form.get('OptOutType') ? '' : 'NYC School Ratings WhatsApp disconnected. No school messages will be sent.');
  }

  // Atomic claim + daily cap. Stop is never rate-limited. A lost response may
  // require the tester to send a new message; never auto-resend an uncertain reply.
  const receipt = await env.DB.prepare(`INSERT INTO parent_whatsapp_receipts(message_sid,received_at)
    SELECT ?,? WHERE (SELECT count(*) FROM parent_whatsapp_receipts WHERE received_at>=?) < ?
    ON CONFLICT(message_sid) DO NOTHING RETURNING message_sid`).bind(sid, now, now - 86_400_000, Reflect.get(env,'PARENT_ASSISTANT_ENABLED')==='true'?10000:50).first();
  if (!receipt) return xml();
  if (form.get('OptOutType')?.toUpperCase() === 'START' || ['START', 'UNSTOP'].includes(command)) {
    return xml(form.get('OptOutType') ? '' : `To reconnect, sign in and create a new link at ${env.APP_URL}/family. START does not reconnect your account.`);
  }
  if (text.length > 2000 || form.get('NumMedia') !== '0') return xml('This preview supports text only. Send HELP for available commands.');
  const token = /^LINK ([a-f0-9]{48})$/i.exec(text)?.[1];
  if (token) {
    const linked = await env.DB.prepare(`UPDATE parent_whatsapp_links SET phone=?, consent_at=?, last_inbound_at=?, token_hash=NULL, token_expires_at=NULL
      WHERE token_hash=? AND token_expires_at>? AND NOT EXISTS (SELECT 1 FROM parent_whatsapp_links WHERE phone=?) RETURNING user_id`)
      .bind(from, now, now, await hashLinkToken(token.toLowerCase()), now, from).first();
    return xml(linked ? (assistantOn?`Connected to NYC School Ratings. Send EVENTS for your dates or ask a school question. Only reminders you explicitly schedule or confirm will be sent. STOP disconnects.`:'Connected to NYC School Ratings preview. Send EVENTS for your family dates, STATUS to check the connection, or STOP to disconnect. Automatic reminders and AI are not enabled yet.') :
      'Link expired, already used, or this phone is already linked. Check My Family, disconnect there if needed, and create a new link.');
  }
  const linked = await env.DB.prepare('SELECT user_id FROM parent_whatsapp_links WHERE phone=? AND consent_at IS NOT NULL').bind(from).first<{ user_id: string }>();
  if (!linked) return xml(`NYC School Ratings. Sign in at ${env.APP_URL}/family to link your account. No automated reminders are enabled for this phone.`);
  await env.DB.prepare('UPDATE parent_whatsapp_links SET last_inbound_at=? WHERE user_id=? AND phone=?').bind(now, linked.user_id, from).run();
  if (env.PARENT_ASSISTANT_ENABLED==='true' && !['EVENTS','STATUS','HELP'].includes(command)) {
    const {confirmDraft,rejectDraft}=await import('./assistant');
    const confirmation=/^(CONFIRM|DISCARD) ([a-f0-9-]{36})$/i.exec(text);
    if(!confirmation){
      if(!env.PARENT_AGENT_QUEUE)return xml('Assistant temporarily unavailable. Please try again shortly.');
      await env.DB.prepare(`INSERT INTO parent_agent_deliveries(inbound_sid,user_id,created_at,status)
        VALUES (?,?,?,'pending') ON CONFLICT(inbound_sid) DO NOTHING`).bind(sid,linked.user_id,now).run();
      try {
        await env.PARENT_AGENT_QUEUE.send({version:1,inboundSid:sid,userId:linked.user_id,phone:from,message:text,receivedAt:now});
        // Twilio receives an immediate successful acknowledgement. The Queue
        // sends the requested answer as a separate WhatsApp message.
        return xml();
      } catch(error) {
        console.error(JSON.stringify({message:'Parent Agent enqueue failed',kind:error instanceof Error?error.name:'unknown'}));
        await env.DB.prepare("UPDATE parent_agent_deliveries SET status='failed',completed_at=?,failure_code='enqueue_failed' WHERE inbound_sid=? AND status='pending'").bind(Date.now(),sid).run();
        return xml('Assistant temporarily unavailable. Please try again shortly.');
      }
    }
    try {
      const result=await (confirmation[1].toUpperCase()==='CONFIRM'?confirmDraft:rejectDraft)(linked.user_id,env,confirmation[2]);
      const draft='draftId' in result && 'summary' in result ? `\n${result.summary}\nReply CONFIRM ${result.draftId} to save, or DISCARD ${result.draftId}. Expires in 10 minutes.` : '';
      const reply=result.message+draft;
      return xml(reply.length>1500?`${reply.slice(0,1380)}\nMore details: ${env.APP_URL}/family`:reply);
    } catch(error) {
      const {TuckError}=await import('../tuck/store');
      return xml(error instanceof TuckError?error.message:'Assistant temporarily unavailable. Check My Family on the website before retrying to see whether your action was saved.');
    }
  }
  if (command === 'EVENTS') {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
    const events = await env.DB.prepare(`SELECT e.title,e.date FROM tuck_events e JOIN tuck_households h ON h.id=e.household_id
      JOIN parent_whatsapp_links w ON w.user_id=h.owner_user_id
      WHERE h.owner_user_id=? AND w.phone=? AND w.consent_at IS NOT NULL AND e.date>=? ORDER BY e.date,e.id LIMIT 5`)
      .bind(linked.user_id, from, today).all<{ title: string; date: string }>();
    return xml(events.results.length ? `Your next family dates (entered by you, not verified school announcements):\n${events.results.map(e => `${e.date}: ${e.title}`).join('\n')}` : 'No upcoming family dates. Add them in My Family. These are your manually entered dates, not an imported school calendar.');
  }
  if(assistantOn)return xml(command==='STATUS'?`Connected to NYC School Ratings. Assistant access depends on your active paid plan. Only requested reminders are sent. Check ${env.APP_URL}/family. Send STOP to disconnect.`:`Send EVENTS for your next dates. With an active paid plan, ask about a school or give an event date and reminder date/time. Active Research Pass customers are grandfathered through their original expiry. Sending a question submits it to our AI interpreter; review any draft, then reply CONFIRM with its ID. STOP disconnects. Settings: ${env.APP_URL}/family`);
  return xml(command === 'STATUS' ? 'Connected to NYC School Ratings preview. Automatic reminders and AI are not enabled. Send STOP to disconnect.' :
    'NYC School Ratings preview commands: EVENTS (your next 5 family dates), STATUS, HELP, STOP. This is a connection test, not the full Parent Assistant yet.');
}

function validParentAgentJob(value:unknown):value is ParentAgentQueueJob {
  if(!value||typeof value!=='object')return false;
  const job=value as Partial<ParentAgentQueueJob>;
  return job.version===1&&typeof job.userId==='string'&&job.userId.length>0&&job.userId.length<=128&&
    typeof job.inboundSid==='string'&&sidPattern.test(job.inboundSid)&&typeof job.phone==='string'&&phonePattern.test(job.phone)&&
    typeof job.message==='string'&&job.message.length>0&&job.message.length<=2000&&typeof job.receivedAt==='number'&&Number.isFinite(job.receivedAt);
}

function queuedReply(result:Record<string,unknown>,appUrl:string) {
  const message=typeof result.message==='string'?result.message:'Assistant temporarily unavailable. Please try again.';
  const draft=typeof result.draftId==='string'&&typeof result.summary==='string'
    ? `\n${result.summary}\nReply CONFIRM ${result.draftId} to save, or DISCARD ${result.draftId}. Expires in 10 minutes.`:'';
  const reply=message+draft;
  return reply.length>1500?`${reply.slice(0,1380)}\nMore details: ${appUrl}/family`:reply;
}

async function markDelivery(env:ParentWhatsappEnvironment,sid:string,status:string,failureCode:string|null,providerSid:string|null=null) {
  await env.DB.prepare(`UPDATE parent_agent_deliveries SET status=?,completed_at=?,failure_code=?,provider_sid=?
    WHERE inbound_sid=? AND status='processing'`).bind(status,Date.now(),failureCode,providerSid,sid).run();
}

/** Durable, privacy-minimized consumer for slow assistant work. */
export async function consumeParentAgentQueue(batch:MessageBatch<unknown>,env:ParentWhatsappEnvironment,transport:typeof fetch=fetch):Promise<void> {
  for(const queued of batch.messages){
    if(!validParentAgentJob(queued.body)){queued.ack();continue;}
    const job=queued.body,now=Date.now();
    let claimedDelivery=false;
    try {
      const existing=await env.DB.prepare('SELECT status,claim_at FROM parent_agent_deliveries WHERE inbound_sid=? AND user_id=?').bind(job.inboundSid,job.userId).first<{status:string;claim_at:number|null}>();
      if(!existing){queued.ack();continue;}
      if(existing.status==='processing'){
        if((existing.claim_at||0)<now-300000)await env.DB.prepare("UPDATE parent_agent_deliveries SET status='uncertain',completed_at=?,failure_code='worker_interrupted' WHERE inbound_sid=? AND status='processing'").bind(now,job.inboundSid).run();
        queued.ack();continue;
      }
      if(existing.status!=='pending'){queued.ack();continue;}
      const claim=await env.DB.prepare("UPDATE parent_agent_deliveries SET status='processing',claim_at=?,attempts=attempts+1 WHERE inbound_sid=? AND user_id=? AND status='pending' RETURNING attempts").bind(now,job.inboundSid,job.userId).first();
      if(!claim){queued.ack();continue;}
      claimedDelivery=true;
      const linked=await env.DB.prepare('SELECT 1 FROM parent_whatsapp_links WHERE user_id=? AND phone=? AND consent_at IS NOT NULL').bind(job.userId,job.phone).first();
      if(!linked){await markDelivery(env,job.inboundSid,'canceled','connection_ended');queued.ack();continue;}

      let reply:string;
      try {
        const {answerParent}=await import('./assistant');
        reply=queuedReply(await answerParent(job.userId,env,{message:job.message}) as Record<string,unknown>,env.APP_URL);
      } catch(error) {
        const {TuckError}=await import('../tuck/store');
        reply=error instanceof TuckError?error.message:'Assistant temporarily unavailable. Please try again. Your calendar was not changed unless you already confirmed a draft.';
      }
      // Re-check STOP/disconnect immediately before the provider handoff.
      if(!await env.DB.prepare('SELECT 1 FROM parent_whatsapp_links WHERE user_id=? AND phone=? AND consent_at IS NOT NULL').bind(job.userId,job.phone).first()){
        await markDelivery(env,job.inboundSid,'canceled','connection_ended');queued.ack();continue;
      }
      const form=new URLSearchParams({From:env.TWILIO_WHATSAPP_FROM!,To:job.phone,Body:reply});
      try {
        const response=await transport(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,{method:'POST',headers:{Authorization:`Basic ${btoa(env.TWILIO_ACCOUNT_SID+':'+env.TWILIO_AUTH_TOKEN)}`,'Content-Type':'application/x-www-form-urlencoded'},body:form.toString(),signal:AbortSignal.timeout(10000)});
        if(!response.ok){await markDelivery(env,job.inboundSid,response.status===429?'failed':'uncertain',`http_${response.status}`);queued.ack();continue;}
        const result=await response.json() as {sid?:string};
        if(!sidPattern.test(result.sid||'')){await markDelivery(env,job.inboundSid,'uncertain','invalid_provider_response');queued.ack();continue;}
        await markDelivery(env,job.inboundSid,'accepted',null,result.sid!);
      } catch {await markDelivery(env,job.inboundSid,'uncertain','transport_uncertain');}
      queued.ack();
    } catch(error) {
      console.error(JSON.stringify({message:'Parent Agent queue processing failed',kind:error instanceof Error?error.name:'unknown',attempt:queued.attempts}));
      if(claimedDelivery){
        try {await markDelivery(env,job.inboundSid,'uncertain','worker_error');} catch { /* best effort; never risk a duplicate reply */ }
        queued.ack();
      } else queued.retry({delaySeconds:Math.min(300,10*2**Math.max(0,queued.attempts-1))});
    }
  }
}
