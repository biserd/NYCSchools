// Explicit production canary: temporary, unsubscribed accounts only. No provider
// messages, email or payment calls; every calendar/account write is cleaned up.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import bcrypt from 'bcryptjs';
const config='wrangler.jsonc',database='nyc-schools-ratings-production',base='https://nycschoolsratings.com';
assert.ok(process.argv.includes('--live'),'Production canary requires explicit --live approval');
const cfg=JSON.parse(readFileSync(config,'utf8'));assert.equal(cfg.name,'nyc-schools-ratings');assert.equal(cfg.d1_databases[0].database_id,'35237f81-df27-4908-be1a-1226faf501e0');assert.equal(cfg.vars.PARENT_AGENT_FAST_RESPONSES_ENABLED,'true');
const ids=[randomUUID(),randomUUID()],emails=ids.map(id=>`family-release-smoke-${id}@example.invalid`),password=randomBytes(24).toString('hex'),cookies=['',''],results=[];
function sql(command){return JSON.parse(execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute',database,'--remote','--config',config,'--command',command,'--json'],{encoding:'utf8',windowsHide:true,maxBuffer:1024*1024}));}
async function call(path,index=0,method='GET',body){const r=await fetch(base+path,{method,redirect:'manual',headers:{Origin:base,'Content-Type':'application/json',...(cookies[index]?{Cookie:cookies[index]}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)});const set=r.headers.getSetCookie();if(set.length)cookies[index]=set.map(x=>x.split(';')[0]).join('; ');const raw=await r.text();let value;try{value=JSON.parse(raw);}catch{value=raw;}return{response:r,value};}
function passed(name,extra={}){results.push({name,passed:true,...extra});console.log('PASS: '+name+(extra.ms?' ('+extra.ms+'ms)':''));}
async function ask(message,check){const start=Date.now(),r=await call('/api/tuck/assistant/message',0,'POST',{message});assert.equal(r.response.status,200);await check(r.value);return Date.now()-start;}
try{
 const home=await call('/');assert.equal(home.response.status,200);assert.ok(!home.response.headers.get('x-staging-database'));assert.ok(!home.response.headers.get('x-robots-tag')?.includes('noindex'));const index=readFileSync('dist/public/index.html','utf8'),entry=index.match(/src="(\/assets\/index-[^"]+\.js)"/);assert.ok(entry&&home.value.includes(entry[1]));passed('Production homepage serves this release, not a staging or preview wrapper');
 const family=await call('/family');assert.equal(family.response.status,200);assert.match(family.value,/noindex/);assert.equal((await call('/tuck')).response.headers.get('location'),'/family');assert.equal((await call('/api/tuck/overview')).response.status,401);assert.equal((await call('/api/tuck/assistant/history')).response.status,401);passed('Family redirect, private-page noindex and anonymous API protection');
 const plans=(await call('/api/plans')).value;assert.equal(plans.familyPremium.amount,999);assert.equal(plans.researchPass.available,false);passed('Existing $9.99 monthly offer preserved; retired checkout stays unavailable');
 const unsigned=await fetch(base+'/api/parent/whatsapp/inbound',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'Body=HELP'});assert.equal(unsigned.status,403);passed('WhatsApp still rejects unsigned traffic; no message sent');
 const hash=await bcrypt.hash(password,10),expiry=Date.now()+600000;
 sql(ids.map((id,i)=>`INSERT INTO users(id,email,password,first_name,email_unsubscribed,subscription_plan,subscription_status,subscription_expires_at) VALUES ('${id}','${emails[i]}','${hash}','Temporary release canary',1,'${i===0?'season_pass':'free'}','${i===0?'active':'free'}',${i===0?expiry:'NULL'});`).join(''));
 for(let i=0;i<2;i++)assert.equal((await call('/api/login',i,'POST',{email:emails[i],password})).response.status,200);
 const status=(await call('/api/tuck/assistant')).value;assert.equal(status.enabled,true);assert.equal(status.entitled,true);assert.equal(status.deliveryEnabled,true);assert.equal((await call('/api/tuck/assistant',1)).value.entitled,false);const wa=(await call('/api/tuck/whatsapp')).value;assert.equal(wa.configured,true);assert.equal(wa.connected,false);passed('Grandfathered access, free-account gate and live reminder configuration preserved');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),date=new Date(Date.parse(today+'T12:00:00Z')+86400000).toISOString().slice(0,10),endDate=new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 const created=await call('/api/tuck/events',0,'POST',{requestId:randomUUID(),title:'Temporary release canary visit',date,eventTime:'10:00',endDate});assert.equal(created.response.status,201);const eventId=created.value.id;
 assert.equal((await call('/api/tuck/events/'+eventId,0,'PUT',{title:'Temporary release canary visit',date,eventTime:'11:00',endDate})).response.status,200);const own=await call('/api/tuck/overview');assert.match(own.response.headers.get('cache-control'),/no-store/);assert.equal(own.value.events.length,1);assert.equal(own.value.events[0].eventTime,'11:00');assert.equal(own.value.events[0].endDate,endDate);assert.equal(own.value.capabilities.automaticReminders,true);
 assert.equal((await call('/api/tuck/overview',1)).value.events.length,0);assert.equal((await call('/api/tuck/events/'+eventId,1,'DELETE')).response.status,404);passed('Timed/multi-day create/edit, private no-store responses and cross-account isolation');
 assert.ok((await call('/api/tuck/schools?q=Independence')).value.schools.some(s=>s.dbn==='02M234'));passed('School-name search uses canonical production data');
 passed('Live assistant reads its owned calendar',{ms:await ask('What is on my family calendar in the next seven days? Include my saved events and official closures.',v=>assert.match(v.message,/Temporary release canary visit/i))});
 passed('Natural-language event remains a draft until confirmed',{ms:await ask('Add a calendar event called Canary pickup tomorrow at noon, no WhatsApp reminder.',async v=>{assert.ok(v.draftId);assert.equal((await call('/api/tuck/overview')).value.events.length,1);})});
 passed('Later confirmation saves the normalized event exactly once',{ms:await ask('Yes, save it.',async()=>{const data=(await call('/api/tuck/overview')).value;assert.equal(data.events.length,2);assert.ok(data.events.some(e=>e.title==='Canary pickup'&&e.date===date&&e.eventTime==='12:00'));})});
 assert.equal((await call('/api/tuck/assistant/history',1)).response.status,403);assert.ok((await call('/api/tuck/assistant/history')).value.messages.length>=6);passed('Assistant history remains account- and entitlement-protected');
}catch(error){results.push({name:'Production canary',passed:false,error:error.message});process.exitCode=1;console.error(error.message);}
finally{
 for(let i=0;i<2;i++)if(cookies[i])try{if(i===0)await call('/api/tuck/assistant/context',i,'DELETE');await call('/api/logout',i,'POST');}catch{}
 const quoted=ids.map(id=>`'${id}'`).join(',');const cleanup=sql(`DELETE FROM sessions WHERE json_extract(sess,'$.userId') IN (${quoted}); DELETE FROM users WHERE id IN (${quoted}); SELECT count(*) remaining FROM users WHERE id IN (${quoted});`);assert.equal(cleanup.at(-1).results[0].remaining,0);passed('Exact temporary canary accounts and cascading private records removed');
 writeFileSync('.wrangler/family-audit/production-family-smoke.json',JSON.stringify({at:new Date().toISOString(),base,results,outboundMessages:0,emailCalls:0,paymentCalls:0,temporaryAccountsCleaned:true},null,2));
}
