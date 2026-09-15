import {mkdir,writeFile,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=`.wrangler/d1-refresh-backup-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(root,{recursive:true});
const base='http://127.0.0.1:8793';
const inventory=await (await fetch(base+'/inventory')).json();
if(inventory.foreignKeys.length)throw Error('Foreign key errors before refresh');
const manifest={createdAt:new Date().toISOString(),databaseId:'e48a9ae9-4948-4dae-863a-06f6b026b436',tables:[]};
for(const table of ['nypd_complaints','school_safety_index','app_settings']){
 const expected=inventory.counts[table],hash=createHash('sha256');let count=0;
 for(let offset=0;offset<expected;offset+=5000){
  const r=await fetch(`${base}/rows?table=${table}&offset=${offset}`);if(!r.ok)throw Error(await r.text());
  const rows=await r.json();if(rows.length!==Math.min(5000,expected-offset))throw Error(`Incomplete ${table}`);
  const text=rows.map(row=>JSON.stringify(row)).join('\n')+'\n';hash.update(text);count+=rows.length;
  await appendFile(`${root}/${table}.ndjson`,text);
 }
 manifest.tables.push({table,count,sha256:hash.digest('hex')});console.log(`Backed up ${table}: ${count}`);
}
await writeFile(`${root}/manifest.json`,JSON.stringify(manifest,null,2));
console.log(`Complete backup: ${root}`);
