import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='.wrangler/d1-export';
function norm(v){if(Array.isArray(v))return v.map(norm);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,norm(v[k])]));return v;}
const report=[];
for(const file of (await readdir(dir)).filter(f=>f.endsWith('.meta.json'))){
 const {table,columns,count}=JSON.parse(await readFile(`${dir}/${file}`,'utf8'));
 const hashes=new Set();let sourceCount=0;
 const hash=row=>createHash('sha256').update(JSON.stringify(norm(row))).digest('hex');
 for(const page of (await readdir(dir)).filter(f=>new RegExp(`^${table}\\.\\d+\\.json$`).test(f))){
  for(const row of JSON.parse(await readFile(`${dir}/${page}`,'utf8'))){
   for(const c of columns){const k=c.column_name,v=row[k];if(v===null)continue;if(c.data_type.startsWith('timestamp'))row[k]=Date.parse(v);else if(c.data_type==='boolean')row[k]=v?1:0;else if(['jsonb','json','ARRAY'].includes(c.data_type))row[k]=JSON.stringify(v);}
   hashes.add(hash(row));sourceCount++;
  }
 }
 let stageCount=0;
 for(let offset=0;offset<count;offset+=5000){
  const r=await fetch(`http://127.0.0.1:8793/rows?table=${table}&offset=${offset}`);if(!r.ok)throw Error(await r.text());
  const rows=await r.json();for(const row of rows){if(!hashes.delete(hash(row)))throw Error(`Unexpected or changed row in ${table}, offset ${offset}`);stageCount++;}
 }
 if(stageCount!==count||sourceCount!==count||hashes.size)throw Error(`Copy mismatch ${table}`);
 report.push({table,count,allRowsSha256Matched:true});console.log(`VERIFIED ${table}: ${count} rows, all values match`);
}
const r=await fetch('http://127.0.0.1:8793/inventory');const inventory=await r.json();if(!r.ok||inventory.foreignKeys.length)throw Error(JSON.stringify(inventory));
await writeFile('.wrangler/d1-copy-verification.json',JSON.stringify({report,inventory},null,2));
