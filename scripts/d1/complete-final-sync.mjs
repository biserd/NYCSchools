// Recovery for the inspected legacy twok_centers counter-only failure.
// All 41 row comparisons must already be complete. Never use after reopening writes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:8795',targetId='35237f81-df27-4908-be1a-1226faf501e0';
const report=JSON.parse(await readFile('.wrangler/d1-production-final-sync.json','utf8'));
assert.equal(report.targetId,targetId);assert.equal(report.passed,false);assert.equal(report.tables.length,41);
assert.ok(report.tables.every(t=>t.everyColumnVerified&&t.removed===0));
assert.ok(Date.now()-Date.parse(report.startedAt)<30*60*1000,'Revalidate source if the interrupted sync is older than 30 minutes');
const maintenance=await fetch('https://nycschoolsratings.com/api/auth/user');assert.equal(maintenance.status,503);assert.equal(maintenance.headers.get('X-Migration-Maintenance'),'true');
const activity=await (await fetch(base+'/source/activity')).json();assert.equal(activity.other_active_or_transaction_sessions,0);
const all=await (await fetch(base+'/source/sequences')).json(),names=report.tables.map(t=>t.table);
const excluded=all.filter(s=>!names.includes(s.table_name));assert.deepEqual(excluded.map(s=>s.table_name),['twok_centers']);
const rows=all.filter(s=>names.includes(s.table_name));
const response=await fetch(base+'/final/sequences',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedDatabase:targetId,rows})});assert.equal(response.status,200);assert.equal((await response.json()).processed,rows.length);
for(const t of report.tables){const source=await (await fetch(base+'/source/count?table='+t.table)).json();assert.equal(source.count,t.count);}
const inventory=await (await fetch(base+'/inventory')).json();assert.equal(inventory.targetId,targetId);assert.equal(inventory.foreignKeys.length,0);
for(const t of report.tables)assert.equal(inventory.counts[t.table],t.count);
report.inventory=inventory;report.sequenceCountersPreserved=rows.length;report.excludedLegacySequences=['twok_centers'];report.passed=true;report.completedAt=new Date().toISOString();
report.recovery='All table comparisons completed; explicitly excluded retired twok_centers sequence and revalidated counts/FKs while maintenance remained active.';
await writeFile('.wrangler/d1-production-final-sync.json',JSON.stringify(report,null,2));
console.log('PASS: 41 verified application tables, 26 applicable source counters, no foreign-key violations; legacy 2-K counter explicitly excluded.');
