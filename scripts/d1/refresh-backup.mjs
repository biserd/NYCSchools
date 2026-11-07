import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='.wrangler/2026-refresh/prod-before';await mkdir(dir,{recursive:true});
export async function command(args,config='wrangler.jsonc'){
 return new Promise((resolve,reject)=>{const p=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args,'--config',config],{windowsHide:true});p.stdout.setEncoding('utf8');p.stderr.setEncoding('utf8');let out='',err='';p.stdout.on('data',v=>out+=v);p.stderr.on('data',v=>err+=v);p.on('error',reject);p.on('close',c=>c===0?resolve(out):reject(Error(err||out)));});
}
const manifest=[];
for(const table of ['schools','school_historical_scores','hs_regents','enrollment_data']){
 const raw=await command(['d1','execute','nyc-schools-ratings-production','--remote','--command',`SELECT * FROM ${table}`,'--json']);
 const result=JSON.parse(raw);if(!result[0]?.success)throw Error('Backup failed '+table);
 const body=JSON.stringify(result[0].results);await writeFile(`${dir}/${table}.json`,body);
 manifest.push({table,rows:result[0].results.length,sha256:createHash('sha256').update(body).digest('hex')});console.log(table+': '+result[0].results.length+' public records backed up');
}
await writeFile(`${dir}/manifest.json`,JSON.stringify({created:new Date().toISOString(),database:'35237f81-df27-4908-be1a-1226faf501e0',tables:manifest},null,2));
