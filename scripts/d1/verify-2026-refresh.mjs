// Compare every public-data value with the rehearsed import; never read account tables.
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const production = process.argv.includes('--production');
const name = production ? 'nyc-schools-ratings-production' : 'nyc-schools-ratings-d1-staging';
const config = production ? 'wrangler.jsonc' : 'wrangler.d1-staging.jsonc';
const root = '.wrangler/2026-refresh';
const expected = JSON.parse(await readFile(`${root}/expected.json`, 'utf8'));
const keys = { schools:['dbn'], school_historical_scores:['dbn','year'], hs_regents:['dbn','year','exam_name'], enrollment_data:['dbn','school_year','grade'], school_demographics_history:['dbn','school_year'], school_profile_metadata:['dbn'] };
const evidence = { database:name, checked:new Date().toISOString(), tables:{} };
for (const [table, rows] of Object.entries(expected)) {
  const raw = await new Promise((resolve,reject) => {
    const child = spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute',name,'--remote','--config',config,'--command',`SELECT * FROM ${table}`,'--json'],{windowsHide:true});
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    let out='',err='';child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);
    child.on('error',reject);child.on('close',code=>code ? reject(Error(err||out)) : resolve(out));
  });
  const result = JSON.parse(raw); assert.equal(result[0].success,true);
  const actual = result[0].results;
  const key = row => JSON.stringify(keys[table].map(k=>row[k]));
  // Enrollment source history can have several legacy records per grain; retain IDs there.
  const existing = ['school_historical_scores','hs_regents','enrollment_data'].includes(table)
    ? JSON.parse(await readFile(`${root}/prod-before/${table}.json`,'utf8')) : [];
  const actualById = new Map(actual.map(r=>[r.id,r]));
  for (const row of existing) assert.deepEqual(actualById.get(row.id),row,`${table} changed original ID ${row.id}`);
  // New ingestion timestamps record the actual remote import, not rehearsal time.
  if(table==='enrollment_data'){
    const oldIds=new Set(existing.map(r=>r.id));
    const backup=JSON.parse(await readFile(`${root}/prod-before/manifest.json`,'utf8'));
    for(const r of actual)if(!oldIds.has(r.id))assert.ok(r.ingested_at>=Date.parse(backup.created)&&r.ingested_at<=Date.now(), 'New enrollment ingestion time outside the import window');
  }
  const canonical = r => Object.fromEntries(Object.entries(r).filter(([k])=>k!=='id'&&!(table==='enrollment_data'&&k==='ingested_at')).sort(([a],[b])=>a.localeCompare(b)));
  const ordered = rs => rs.map(r=>key(r)+' '+JSON.stringify(canonical(r))).sort();
  const want=ordered(rows), got=ordered(actual);
  assert.equal(got.length,want.length,`${table}: row count differs`);
  const mismatch=want.findIndex((row,i)=>row!==got[i]);
  if(mismatch!==-1)throw Error(`${table} first mismatch: expected ${want[mismatch]}; actual ${got[mismatch]}`);
  evidence.tables[table]={rows:actual.length,allSourceValuesMatch:true,oldRowsUnchanged:existing.length,ingestionTimes:table==='enrollment_data'?'Original times unchanged; new times verified against the remote import window':undefined};
  console.log(`${table}: ${actual.length} rows, all values match; ${existing.length} originals unchanged`);
}
await writeFile(`${root}/${production?'production':'staging'}-validation.json`,JSON.stringify(evidence,null,2));
