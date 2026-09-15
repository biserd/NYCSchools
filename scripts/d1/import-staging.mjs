import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const manifest=JSON.parse(await readFile('.wrangler/d1-import/manifest.json','utf8'));
const checkpoint='.wrangler/d1-import/completed.json';
let completed=[];try{completed=JSON.parse(await readFile(checkpoint,'utf8'));}catch{}
for(const {file,table} of manifest){
 if(completed.includes(file))continue;
 const result=await new Promise((resolve,reject)=>{
  const p=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','nyc-schools-ratings-d1-staging','--remote','--config','wrangler.d1-staging.jsonc','--file',file,'--yes'],{env:process.env,windowsHide:true});
  let output='';p.stdout.on('data',c=>output+=c);p.stderr.on('data',c=>output+=c);p.on('error',reject);p.on('close',code=>resolve({code,output}));
 });
 await writeFile(`${file}.log`,result.output);
 if(result.code!==0)throw Error(`Import failed ${file}: ${result.output}`);
 completed.push(file);await writeFile(checkpoint,JSON.stringify(completed));
 console.log(`Imported ${table} (${completed.length}/${manifest.length})`);
}
