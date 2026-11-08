// Real model, isolated staging accounts only. Never sends email, WhatsApp or payments.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
import bcrypt from 'bcryptjs';
const base='https://nyc-schools-ratings-d1-staging.biser-d.workers.dev';
const config='wrangler.d1-staging.jsonc',database='nyc-schools-ratings-d1-staging';
const label=process.argv.includes('--baseline')?'baseline':'optimized',full=process.argv.includes('--full');
const rounds=Number(process.argv.find(a=>a.startsWith('--rounds='))?.split('=')[1]||1);
assert.ok(rounds>=1&&rounds<=3);const ids=[],results=[],timings=[];let cookie='';
mkdirSync('.wrangler/family-audit',{recursive:true});
function sql(command){return JSON.parse(execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute',database,'--remote','--config',config,'--command',command,'--json'],{encoding:'utf8',windowsHide:true,maxBuffer:1024*1024}));}
const tail=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','tail','--config',config,'--format','json'],{windowsHide:true,stdio:['ignore','pipe','ignore']});
let buffer='';tail.stdout.on('data',chunk=>{buffer+=chunk.toString().replace(/\r/g,'');let end;while((end=buffer.indexOf('\n}\n'))>=0){const raw=buffer.slice(0,end+2);buffer=buffer.slice(end+3);try{const event=JSON.parse(raw.slice(raw.indexOf('{')));for(const log of event.logs||[])for(const text of log.message||[]){try{const value=JSON.parse(text);if(value.message==='Parent Agent timing'&&value.stage==='agent_runtime')timings.push(value);}catch{}}}catch{}}});
async function call(path,method='GET',body){const r=await fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(90000)});const set=r.headers.getSetCookie();if(set.length)cookie=set.map(c=>c.split(';')[0]).join('; ');let value;try{value=await r.json();}catch{value=null;}return{status:r.status,value};}
async function ask(name,message,check){const start=Date.now();let result;try{result=await call('/api/tuck/assistant/message','POST',{message});assert.equal(result.status,200);assert.ok(result.value?.message?.length>3);await check?.(result.value);results.push({round:ids.length,name,passed:true,ms:Date.now()-start,replyCharacters:result.value.message.length});}catch(error){results.push({round:ids.length,name,passed:false,ms:Date.now()-start,error:error.message,reply:result?.value?.message});}console.log(JSON.stringify(results.at(-1)));}
try{
 for(let round=0;round<rounds;round++){
  const id=randomUUID(),email=`family-benchmark-${id}@example.invalid`,password=randomBytes(24).toString('hex'),hash=await bcrypt.hash(password,10);ids.push(id);cookie='';
  sql(`INSERT INTO users(id,email,password,first_name,email_unsubscribed) VALUES ('${id}','${email}','${hash}','Temporary performance check',1);`);
  assert.equal((await call('/api/login','POST',{email,password})).status,200);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const date=new Date(Date.parse(today+'T12:00:00Z')+86400000).toISOString().slice(0,10);
  assert.equal((await call('/api/tuck/events','POST',{title:'Performance check school visit',date,eventTime:'10:00',requestId:randomUUID()})).status,201);
  await ask('greeting','Hi',v=>assert.ok(!/could not safely interpret|didn.t quite understand/i.test(v.message)));
  await ask('today','What day is today?',v=>assert.match(v.message,new RegExp(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'long'}).format(new Date()),'i')));
  await ask('calendar','What is on my family calendar in the next seven days? Include my saved events and official school closures.',v=>{assert.match(v.message,/Performance check school visit/i);assert.match(v.message,/Veterans/i);});
  await ask('UES schools','Give me the top three elementary schools on the UES with profile links.',v=>{assert.ok(v.sources?.some(s=>s.url.includes('/school/')));assert.match(v.message,/Upper East Side|UES/i);});
  if(full){
   await ask('UWS follow-up','What about on the UWS instead?',v=>{assert.ok(v.sources?.some(s=>s.url.includes('/school/')));assert.match(v.message,/Upper West Side|UWS/i);});
   const before=(await call('/api/tuck/overview')).value.events.length;
   await ask('natural date draft','Add a calendar event called Benchmark pickup tomorrow at 11am, with no WhatsApp reminder.',v=>assert.ok(v.draftId));
   assert.equal((await call('/api/tuck/overview')).value.events.length,before,'Draft cannot save immediately');
   await ask('confirmation','Yes, save it.',async()=>{const data=(await call('/api/tuck/overview')).value;assert.equal(data.events.length,before+1);assert.ok(data.events.some(e=>e.title==='Benchmark pickup'&&e.date===date&&e.eventTime==='11:00'));});
   await ask('edit draft','Move Benchmark pickup to noon on the same date. Keep everything else unchanged.',v=>assert.ok(v.draftId));
   await ask('edit confirmation','Yes, save that change.',async()=>{const data=(await call('/api/tuck/overview')).value;assert.equal(data.events.find(e=>e.title==='Benchmark pickup').eventTime,'12:00');});
  }
  await call('/api/tuck/assistant/context','DELETE');await call('/api/logout','POST');
 }
}finally{
 if(cookie)try{await call('/api/tuck/assistant/context','DELETE');await call('/api/logout','POST');}catch{}
 const quoted=ids.map(id=>`'${id}'`).join(',');if(quoted){const cleanup=sql(`DELETE FROM sessions WHERE json_extract(sess,'$.userId') IN (${quoted}); DELETE FROM users WHERE id IN (${quoted}); SELECT count(*) remaining FROM users WHERE id IN (${quoted});`);assert.equal(cleanup.at(-1).results[0].remaining,0);}
 tail.kill();const sorted=results.map(r=>r.ms).sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);const summary={n:sorted.length,passed:results.filter(r=>r.passed).length,medianMs:sorted.length?(sorted.length%2?sorted[middle]:Math.round((sorted[middle-1]+sorted[middle])/2)):null,p90Ms:sorted[Math.ceil(sorted.length*.9)-1],maxMs:sorted.at(-1)};
 writeFileSync(`.wrangler/family-audit/${label}-latency.json`,JSON.stringify({at:new Date().toISOString(),base,label,summary,results,timings,temporaryAccountsCleaned:true,noMessagesOrPayments:true},null,2));console.log(JSON.stringify(summary));
}
if(results.some(r=>!r.passed))process.exitCode=1;
