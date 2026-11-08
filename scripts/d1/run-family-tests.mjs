import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const names=['test-tuck','test-parent-assistant','test-parent-whatsapp','test-family-billing','test-subscription-funnel','test-family-experience','test-parent-model'];
let failures=0;
async function run(name){return new Promise(resolveRun=>{
 const child=spawn(process.execPath,['--import','tsx','--import',pathToFileURL(resolve('scripts/d1/offline-test-guard.mjs')).href,'scripts/d1/'+name+'.ts'],{windowsHide:true,env:{...process.env,WRANGLER_SEND_METRICS:'false',CI:'true'}});
 let output='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);
 child.on('close',code=>{process.stdout.write(`${name}: ${code===0?'PASS':'FAIL'}\n${output}`);if(code!==0)failures++;resolveRun();});
});}
for(let i=0;i<names.length;i+=2)await Promise.all(names.slice(i,i+2).map(run));
if(failures)process.exitCode=1;
