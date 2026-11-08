// Local-only full-stack Family preview. Isolated D1 + synthetic households.
// No Stripe, mail, Twilio requests, cron or live AI. Never used by the Worker.
import express from 'express';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {getPlatformProxy} from 'wrangler';
import {createDatabase,withDatabaseInstance} from '../../server/db';
import {tuckRouter} from '../../server/tuck/routes';
import {prepareAgentCalendarDraft,familyCalendarEvidence} from '../../server/parent/agent-runtime';
import {localParts,requireAssistant,type AssistantEnvironment} from '../../server/parent/service';
import {resolveAccess} from '../../shared/plans';
const port=8806,origin=`http://127.0.0.1:${port}`;
const platform=await getPlatformProxy({configPath:'wrangler.family-local.jsonc',persist:false});
const DB=platform.env.DB as D1Database;
for(const file of (await readdir('migrations-d1')).filter(f=>f.endsWith('.sql')).sort())for(const statement of (await readFile('migrations-d1/'+file,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await DB.prepare(statement).run();
const env={DB,ENVIRONMENT:'production',APP_URL:'https://preview.example.invalid',PARENT_ASSISTANT_ENABLED:'true',PARENT_AGENT_SDK_ENABLED:'false',PARENT_WHATSAPP_ENABLED:'true',PARENT_REMINDERS_ENABLED:'true',TWILIO_ACCOUNT_SID:`AC${'a'.repeat(32)}`,TWILIO_AUTH_TOKEN:'LOCAL-SYNTHETIC-NOT-A-CREDENTIAL',TWILIO_WHATSAPP_FROM:'whatsapp:+12125550101',PARENT_REMINDER_CONTENT_SID:`HX${'b'.repeat(32)}`} as AssistantEnvironment;
await DB.prepare("INSERT INTO schools(dbn,name,district,address,grade_band) VALUES ('02M234','P.S. 234 Independence School',2,'Synthetic preview address','K-5'),('03M087','P.S. 087 William Sherman',3,'Synthetic preview address','K-5'),('02M999','Sample High School',2,'Synthetic preview address','9-12')").run();
const modes=['paid','grandfathered','free','disconnected','empty','checkout'];
const phones=new Map<string,string>();
for(const [i,mode]of modes.entries()){
 const id='preview-'+mode,paid=mode!=='free'&&mode!=='checkout';phones.set(id,'whatsapp:+121255501'+String(i+11));
 await DB.prepare('INSERT INTO users(id,email,password,subscription_plan,subscription_status) VALUES (?,?,?,?,?)').bind(id,mode+'@example.invalid','no-login',paid?'season_pass':'free',paid?'active':'free').run();
 if(!['empty','free','checkout'].includes(mode)){
   const house=crypto.randomUUID(),child=crypto.randomUUID();await DB.prepare('INSERT INTO tuck_households(id,owner_user_id) VALUES (?,?)').bind(house,id).run();
   await DB.prepare("INSERT INTO tuck_children(id,household_id,nickname,school_dbn) VALUES (?,?,'Noah','02M234')").bind(child,house).run();
   const date=localParts(Date.now()+86400000,'America/New_York').date;
   await DB.prepare("INSERT INTO tuck_events(id,household_id,child_id,title,date,event_time,detail) VALUES (?,?,?,'School visit',?,'10:00','Bring your questions for the school.')").bind(crypto.randomUUID(),house,child,date).run();
 }
 if(paid&&mode!=='disconnected')await DB.prepare('INSERT INTO parent_whatsapp_links(user_id,phone,token_issued_at,consent_at) VALUES (?,?,0,1)').bind(id,phones.get(id)).run();
}
const app=express(),history=new Map<string,Array<{id:string;role:string;content:string}>>();app.use(express.json());
app.use((req,res,next)=>{
 const query=String(req.query.preview||''),cookie=/family_preview_mode=([^;]+)/.exec(req.headers.cookie||'')?.[1];
 const mode=[...modes,'guest'].includes(query)?query:[...modes,'guest'].includes(cookie||'')?cookie!:'paid';
 if(query)res.cookie('family_preview_mode',mode,{httpOnly:true,sameSite:'strict'});
 if(!['GET','HEAD'].includes(req.method)&&req.get('origin')!==origin)return res.status(403).json({message:'Use the local preview page.'});
 (req as any).previewMode=mode;Object.defineProperty(req,'session',{value:{userId:mode==='guest'?undefined:'preview-'+mode}});
 void withDatabaseInstance(createDatabase(DB),async()=>next()).catch(next);
});
const auth:express.RequestHandler=(req,res,next)=>req.session.userId?next():void res.status(401).json({message:'Unauthorized'});
app.get('/api/auth/user',(req,res)=>req.session.userId?res.json({id:req.session.userId,email:'preview@example.invalid',firstName:'Preview'}):res.status(401).json({message:'Unauthorized'}));
app.get('/api/plans',(_req,res)=>res.json({familyPremium:{available:false,guestAvailable:false}}));
app.get('/api/subscription',auth,async(req,res)=>{
 const user=await DB.prepare('SELECT subscription_status,subscription_plan,subscription_expires_at FROM users WHERE id=?').bind(req.session.userId).first<{subscription_status:string;subscription_plan:string;subscription_expires_at:number|null}>();
 const family=await DB.prepare('SELECT status,current_period_end,cancel_at_period_end FROM family_subscriptions WHERE user_id=?').bind(req.session.userId).first<{status:string;current_period_end:number;cancel_at_period_end:number}>();
 const access=resolveAccess({subscriptionStatus:user!.subscription_status,subscriptionPlan:user!.subscription_plan,subscriptionExpiresAt:user!.subscription_expires_at?new Date(user!.subscription_expires_at):null},family?{status:family.status,currentPeriodEnd:new Date(family.current_period_end),cancelAtPeriodEnd:!!family.cancel_at_period_end}:null,new Date(),true);
 res.json({status:access.research?'active':'free',plan:access.research?'premium':'free',access});
});
let checkoutChecks=0;
app.get('/api/family/checkout/status',async(req,res)=>{
 if(req.query.session_id!=='cs_test_FamilyPreviewCheckout12345')return res.status(400).json({message:'Local sample session only.'});
 if(++checkoutChecks>=2){await DB.prepare("INSERT OR IGNORE INTO family_subscriptions(stripe_subscription_id,user_id,status,current_period_end,cancel_at_period_end,last_event_created) VALUES ('sub_local_preview','preview-checkout','active',?,0,1)").bind(Date.now()+30*86400000).run();return res.json({status:'paid',value:9.99,currency:'usd'});}
 res.json({status:'pending'});
});
app.get('/api/tuck/assistant/history',auth,(req,res)=>res.json({messages:history.get(req.session.userId!)||[]}));
app.delete('/api/tuck/assistant/context',auth,(req,res)=>{history.set(req.session.userId!,[]);res.sendStatus(204);});
app.post('/api/tuck/assistant/message',auth,async(req,res)=>{
 const id=req.session.userId!,message=String(req.body.message||'');let result:{message:string;[key:string]:unknown};
 await requireAssistant(id,env);
 if(/remind/i.test(message)){
   const date=localParts(Date.now()+86400000,'America/New_York').date;
   result=await prepareAgentCalendarDraft(id,env,{title:'Drop off Noah',eventDate:date,eventTime:'08:00',reminderDate:date,reminderTime:'08:00',endDate:null,eventId:null,childId:null,sourceId:null});
 }else if(/dates|closed|calendar|events/i.test(message)){
   const evidence=await familyCalendarEvidence(id,env);result={message:'Local preview, using the real shared calendar tool:\n'+evidence.events.map(e=>`${e.date}: ${e.title}`).join('\n')};
 }else result={message:'This local preview has live AI turned off. You can test the calendar, forms and reminder drafts here without sending messages.'};
 history.set(id,[...(history.get(id)||[]),{id:crypto.randomUUID(),role:'user',content:message},{id:crypto.randomUUID(),role:'assistant',content:result.message}].slice(-30));res.json(result);
});
app.post('/api/tuck/whatsapp/link',auth,async(req,res)=>{if(req.body.consent!==true)return res.status(400).json({message:'Consent required.'});res.json({url:origin+'/preview/connect',expiresAt:Date.now()+600000});});
app.get('/preview/connect',auth,async(req,res)=>{await DB.prepare('INSERT INTO parent_whatsapp_links(user_id,phone,token_issued_at,consent_at) VALUES (?,?,0,1) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,consent_at=1').bind(req.session.userId,phones.get(req.session.userId!)).run();res.type('html').send('<h1>Local preview connected</h1><p>No real WhatsApp account was contacted. Close this tab and return to Family.</p>');});
app.use('/api/tuck',tuckRouter(auth,()=>origin,async()=>env));
app.get('/family',async(_req,res)=>{const html=await readFile('dist/public/index.html','utf8');res.type('html').send(html.replace('<body>','<body><div style="padding:8px 16px;background:#fef3c7;color:#78350f;font:13px system-ui">Local Family preview · sample household · live AI, messaging and payments disabled</div>'));});
app.use(express.static(resolve('dist/public')));
app.get('/{*path}',async(_req,res)=>res.sendFile(resolve('dist/public/index.html')));
app.use((error:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error.status||500).json({message:error.message||'Preview error'}));
const server=app.listen(port,'127.0.0.1',()=>console.log(`Isolated Family preview: ${origin}/family`));
process.on('SIGINT',()=>{server.close();void platform.dispose().then(()=>process.exit(0));});
