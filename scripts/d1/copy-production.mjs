import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:8795',targetId='35237f81-df27-4908-be1a-1226faf501e0';
const tables=['schools','nyceec_centers','private_schools','school_survey_releases','school_survey_results','school_historical_scores','hs_admissions_program','hs_graduation','hs_regents','school_attendance','school_discipline','nyceec_ai_insights','admissions_offers','enrollment_data','admissions_metrics','private_school_history','school_zones','school_safety_index','nypd_complaints','users','sessions','oauth_clients','api_keys','ai_chat_sessions','favorites','reviews','user_profiles','tracked_schools','ai_chat_messages','password_reset_tokens','magic_link_tokens','processed_webhook_events','oauth_authorization_codes','oauth_access_tokens','oauth_refresh_tokens','api_key_rate_state','api_request_log','api_abuse_alerts','nyceec_reviews','contact_submissions','app_settings'];
async function get(path){const r=await fetch(base+path,{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,`Copy request failed: ${path.split('?')[0]}`);return r.json();}
const normalize=v=>Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;
const hash=row=>createHash('sha256').update(JSON.stringify(normalize(row))).digest('hex');
const inventory=await get('/inventory');assert.equal(inventory.targetId,targetId);
assert.ok(Object.values(inventory.counts).every(n=>n===0),'Initial copy requires an empty target. Never blindly retry a partial import.');
const report={startedAt:new Date().toISOString(),targetId,source:'Live production Neon, read-only transactions',consistentSnapshot:false,requiresFinalWriteFreezeAndRevalidation:true,privateDataWrittenToLocalFiles:false,tables:[]};
for(const table of tables){
 const columns=await get(`/source/columns?table=${table}`),{count}=await get(`/source/count?table=${table}`),pageSize=table==='nypd_complaints'?5000:500;
 const hashes=new Set();let copied=0;
 for(let offset=0;offset<count;offset+=pageSize){
  const rows=await get(`/source/rows?table=${table}&offset=${offset}`);assert.equal(rows.length,Math.min(pageSize,count-offset),`Source changed: ${table}`);
  for(const row of rows){for(const c of columns){const v=row[c.column_name];if(v===null)continue;
   if(c.data_type.startsWith('timestamp')){row[c.column_name]=Date.parse(v);assert.ok(Number.isFinite(row[c.column_name]));}
   else if(c.data_type==='boolean')row[c.column_name]=v?1:0;
   else if(['jsonb','json','ARRAY'].includes(c.data_type))row[c.column_name]=JSON.stringify(v);
  }assert.ok(!hashes.has(hash(row)),`Duplicate row fingerprint: ${table}`);hashes.add(hash(row));}
  const r=await fetch(`${base}/import?table=${table}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedDatabase:targetId,rows}),signal:AbortSignal.timeout(60000)});
  assert.equal(r.status,200,`Import failed: ${table}; inspect target before retry`);assert.equal((await r.json()).inserted,rows.length);copied+=rows.length;
  if(offset%50000===0)console.log(`${table}: copied ${copied}/${count}`);
 }
 for(let offset=0;offset<count;offset+=pageSize)for(const row of await get(`/rows?table=${table}&offset=${offset}`))assert.ok(hashes.delete(hash(row)),`Target mismatch: ${table}`);
 assert.equal(hashes.size,0);assert.equal((await get(`/source/count?table=${table}`)).count,count,`Source count changed: ${table}`);
 report.tables.push({table,count,everyCopiedColumnMatched:true});await writeFile('.wrangler/d1-production-initial-copy.json',JSON.stringify(report,null,2));console.log(`Verified ${table}: ${count}`);
}
report.inventory=await get('/inventory');assert.equal(report.inventory.foreignKeys.length,0);
report.completedAt=new Date().toISOString();report.initialCopyPassed=true;
await writeFile('.wrangler/d1-production-initial-copy.json',JSON.stringify(report,null,2));
console.log('Initial production copy verified. NOT a final consistent cutover snapshot.');
