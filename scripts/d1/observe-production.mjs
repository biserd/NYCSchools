// Short, bounded verification. Never persist or print request URLs, headers or log bodies.
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','tail','nyc-schools-ratings','--config','wrangler.jsonc','--format','json'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
let buffer='',events=0,exceptions=0,serverErrors=0,connected=false;
child.stdout.on('data',chunk=>{buffer+=chunk.toString();let start=buffer.indexOf('{');while(start>=0){let depth=0,quoted=false,escaped=false,end=-1;for(let i=start;i<buffer.length;i++){const c=buffer[i];if(escaped){escaped=false;continue;}if(quoted&&c==='\\'){escaped=true;continue;}if(c==='"'){quoted=!quoted;continue;}if(!quoted){if(c==='{')depth++;if(c==='}'&&--depth===0){end=i+1;break;}}}if(end<0)break;try{const value=JSON.parse(buffer.slice(start,end));if(value.outcome){connected=true;events++;exceptions+=(value.exceptions?.length||0);if((value.event?.response?.status||0)>=500)serverErrors++;}}catch{}buffer=buffer.slice(end);start=buffer.indexOf('{');}if(buffer.length>1000000)buffer='';});
child.stderr.on('data',()=>{});
await new Promise(resolve=>setTimeout(resolve,5000));
const paths=['/','/api/schools','/api/twok-centers','/api/nyceec-centers','/api/private-schools','/api/schools/02M475','/api/surveys/school/02M475','/api/safety/public/06G262','/api/safe-and-strong','/sitemap.xml'];
const checks=[];for(const path of paths){const start=Date.now();const r=await fetch('https://nycschoolsratings.com'+path);await r.arrayBuffer();checks.push({path,status:r.status,ms:Date.now()-start});}
await new Promise(resolve=>setTimeout(resolve,15000));child.kill();
const result={checkedAt:new Date().toISOString(),connected,events,exceptions,serverErrors,checks};
await writeFile('.wrangler/d1-production-observation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
if(!connected||exceptions||serverErrors||checks.some(c=>c.status!==200))process.exitCode=1;
