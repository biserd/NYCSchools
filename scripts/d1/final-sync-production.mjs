import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:8795',targetId='35237f81-df27-4908-be1a-1226faf501e0';
const initial=JSON.parse(await readFile('.wrangler/d1-production-initial-copy.json','utf8'));assert.ok(initial.initialCopyPassed);assert.equal(initial.targetId,targetId);
const tables=initial.tables.map(t=>t.table),report={startedAt:new Date().toISOString(),targetId,tables:[],passed:false};
async function frozen(){const r=await fetch('https://nycschoolsratings.com/api/auth/user',{headers:{'Cache-Control':'no-cache'}});assert.equal(r.status,503);assert.equal(r.headers.get('X-Migration-Maintenance'),'true');}
async function get(path){const r=await fetch(base+path,{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,`Read failed: ${path.split('?')[0]}`);return r.json();}
async function post(path,rows){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedDatabase:targetId,rows}),signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,`Reconcile failed: ${path.split('?')[0]}`);assert.equal((await r.json()).processed,rows.length);}
const normalize=v=>Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;
const hash=r=>createHash('sha256').update(JSON.stringify(normalize(r))).digest('hex');
await frozen();const inventory=await get('/inventory'),deletions=[];
for(const table of tables){
 await frozen();const {keys}=await get(`/final/schema?table=${table}`),columns=await get(`/source/columns?table=${table}`),{count}=await get(`/source/count?table=${table}`),pageSize=table==='nypd_complaints'?5000:500;
 const target=new Map(),sourceHashes=new Set();let merged=0;
 const key=row=>JSON.stringify(keys.map(k=>row[k]));
 for(let offset=0;offset<inventory.counts[table];offset+=pageSize)for(const row of await get(`/rows?table=${table}&offset=${offset}`))target.set(key(row),hash(row));
 for(let offset=0;offset<count;offset+=pageSize){
  const rows=await get(`/source/rows?table=${table}&offset=${offset}`),changed=[];assert.equal(rows.length,Math.min(pageSize,count-offset));
  for(const row of rows){for(const c of columns){const v=row[c.column_name];if(v===null)continue;if(c.data_type.startsWith('timestamp')){row[c.column_name]=Date.parse(v);assert.ok(Number.isFinite(row[c.column_name]));}else if(c.data_type==='boolean')row[c.column_name]=v?1:0;else if(['jsonb','json','ARRAY'].includes(c.data_type))row[c.column_name]=JSON.stringify(v);}
   const fingerprint=hash(row);sourceHashes.add(fingerprint);if(target.get(key(row))!==fingerprint)changed.push(row);target.delete(key(row));
  }
  if(changed.length){await post(`/final/merge?table=${table}`,changed);merged+=changed.length;}
 }
 const removed=[...target.keys()].map(encoded=>Object.fromEntries(JSON.parse(encoded).map((v,i)=>[keys[i],v])));deletions.push({table,rows:removed});
 // Re-read every copied value after applying updates; no private rows in reports.
 for(let offset=0;offset<count+removed.length;offset+=pageSize)for(const row of await get(`/rows?table=${table}&offset=${offset}`)){
  if(!target.has(key(row)))assert.ok(sourceHashes.delete(hash(row)),`Post-merge mismatch: ${table}`);
 }
 assert.equal(sourceHashes.size,0);assert.equal((await get(`/source/count?table=${table}`)).count,count);
 report.tables.push({table,count,merged,removed:removed.length,everyColumnVerified:true});await writeFile('.wrangler/d1-production-final-sync.json',JSON.stringify(report,null,2));console.log(`Final verified ${table}: ${count}; updated ${merged}; removed ${removed.length}`);
}
for(const {table,rows} of deletions.reverse())for(let i=0;i<rows.length;i+=500)await post(`/final/delete?table=${table}`,rows.slice(i,i+500));
const allSequences=await get('/source/sequences');
const excludedSequences=allSequences.filter(s=>!tables.includes(s.table_name));
assert.ok(excludedSequences.every(s=>s.table_name==='twok_centers'),'Unexpected non-application sequence');
const sequences=allSequences.filter(s=>tables.includes(s.table_name));await post('/final/sequences',sequences);report.sequenceCountersPreserved=sequences.length;
report.excludedLegacySequences=excludedSequences.map(s=>s.table_name);
await frozen();report.inventory=await get('/inventory');assert.equal(report.inventory.foreignKeys.length,0);
for(const t of report.tables)assert.equal(report.inventory.counts[t.table],t.count);
report.passed=true;report.completedAt=new Date().toISOString();await writeFile('.wrangler/d1-production-final-sync.json',JSON.stringify(report,null,2));console.log('PASS: all source tables and values reconciled under production maintenance; foreign keys valid.');
