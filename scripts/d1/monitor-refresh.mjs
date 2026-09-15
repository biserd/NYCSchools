import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:8793';
const report=process.argv.includes('--resume')?JSON.parse(await readFile('.wrangler/d1-refresh-load-test.json','utf8')):{startedAt:new Date().toISOString(),queueExecutions:0,maxCpuMs:0,maxWallMs:0,failedExecutions:[],samples:[],finished:false};
const monitorStartedAt=Date.now();
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','tail','nyc-schools-ratings-d1-staging','--config','wrangler.d1-staging.jsonc','--format','json'],{windowsHide:true});
let buffer='';
child.stdout.on('data',chunk=>{
 buffer+=chunk;let end;
 while((end=buffer.indexOf('\n}\n'))>=0){const text=buffer.slice(0,end+2);buffer=buffer.slice(end+3);const start=text.indexOf('{');if(start<0)continue;
  try{const event=JSON.parse(text.slice(start));if(event.event?.queue!=='nyc-schools-d1-stage-safety')continue;
   report.queueExecutions++;report.maxCpuMs=Math.max(report.maxCpuMs,event.cpuTime||0);report.maxWallMs=Math.max(report.maxWallMs,event.wallTime||0);
   if(event.outcome!=='ok')report.failedExecutions.push({at:event.eventTimestamp,outcome:event.outcome,exceptions:event.exceptions});
  }catch{/* Ignore Wrangler non-JSON startup notices. */}
 }
});
child.stderr.on('data',chunk=>process.stderr.write(chunk));
async function status(){
 const r=await fetch(base+'/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:'SELECT key,value FROM app_settings WHERE key IN (?,?)',params:['d1_safety_refresh_job','safety_recompute_run_state'],method:'all'})});
 if(!r.ok)throw Error(await r.text());return Object.fromEntries((await r.json()).rows.map(([k,v])=>[k,JSON.parse(v)]));
}
try{
 for(let tick=0;tick<240;tick++){
  const states=await status(),job=states.d1_safety_refresh_job,run=states.safety_recompute_run_state;
  report.samples.push({at:new Date().toISOString(),job,run});
  console.log(JSON.stringify({phase:job?.phase,dataset:job?.dataset,received:job?.received,updatedAt:job?.updatedAt,finalizedAt:run?.finalizedAt,queueExecutions:report.queueExecutions,maxCpuMs:report.maxCpuMs,maxWallMs:report.maxWallMs,errors:report.failedExecutions.length}));
  if(job?.phase==='complete'){report.finished=true;report.completedAt=new Date().toISOString();break;}
  if(job&&Date.now()-Math.max(Date.parse(job.updatedAt),monitorStartedAt)>300000)throw Error('Refresh checkpoint stalled for five minutes; inspect retries/dead-letter queue before resuming');
  await writeFile('.wrangler/d1-refresh-load-test.json',JSON.stringify(report,null,2));
  await new Promise(r=>setTimeout(r,15000));
 }
 if(!report.finished)throw Error('Refresh did not finish within the monitoring window');
}finally{child.kill();await writeFile('.wrangler/d1-refresh-load-test.json',JSON.stringify(report,null,2));}
