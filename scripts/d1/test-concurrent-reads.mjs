import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base='https://nyc-schools-ratings-d1-staging.biser-d.workers.dev';
const paths=['/api/schools/02M475','/api/twok-centers-stats','/api/nyceec-centers-stats','/api/safety/public/06G262','/api/private-schools-stats','/api/surveys/school/02M475','/api/schools/02M475/history','/api/districts/citywide'];
const results=[];let next=0;
await Promise.all(Array.from({length:4},async()=>{
 while(next<64){const index=next++,path=paths[index%paths.length],start=performance.now();
  try{const r=await fetch(base+path,{signal:AbortSignal.timeout(15000)});await r.arrayBuffer();results.push({path,status:r.status,ms:Math.round(performance.now()-start)});}
  catch{results.push({path,status:0,ms:Math.round(performance.now()-start)});}
 }
}));
const times=results.map(r=>r.ms).sort((a,b)=>a-b);
const report={testedAt:new Date().toISOString(),concurrency:4,requests:results.length,errors:results.filter(r=>r.status!==200),medianMs:times[Math.floor(times.length/2)],p95Ms:times[Math.ceil(times.length*.95)-1],maxMs:times.at(-1),results};
const phase=process.argv[2]||'baseline';assert.match(phase,/^[a-z-]+$/);
await writeFile(`.wrangler/d1-concurrent-read-${phase}-verification.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,results:undefined},null,2));assert.equal(report.errors.length,0);
