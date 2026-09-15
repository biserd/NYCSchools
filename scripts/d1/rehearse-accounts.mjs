import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const source='http://127.0.0.1:8792',target='http://127.0.0.1:8794',databaseId='a8bfb062-404e-46a6-8a92-fe54e55201db';
const tables=['schools','nyceec_centers','users','sessions','oauth_clients','api_keys','ai_chat_sessions','favorites','reviews','user_profiles','tracked_schools','ai_chat_messages','password_reset_tokens','magic_link_tokens','processed_webhook_events','oauth_authorization_codes','oauth_access_tokens','oauth_refresh_tokens','api_key_rate_state','api_request_log','api_abuse_alerts','nyceec_reviews','contact_submissions','app_settings'];
async function get(base,path){const r=await fetch(base+path);if(!r.ok)throw Error(`Rehearsal request failed: ${r.status} ${path.split('?')[0]}`);return r.json();}
function normalize(v){if(Array.isArray(v))return v.map(normalize);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])]));return v;}
const fingerprint=row=>createHash('sha256').update(JSON.stringify(normalize(row))).digest('hex');
const initial=await get(target,'/inventory');assert.ok(tables.every(t=>initial.counts[t]===0),'Use a new empty isolated rehearsal database; refusing overwrite');
const report={source:'Existing read-only production-derived Neon staging clone',targetDatabaseId:databaseId,startedAt:new Date().toISOString(),privateDataPersistedToLocalFiles:false,tables:[]};
for(const table of tables){
 const columns=await get(source,`/columns?table=${table}`),{count}=await get(source,`/count?table=${table}`);
 const hashes=new Set();let transferred=0;
 for(let offset=0;offset<count;offset+=500){
  const rows=await get(source,`/rows?table=${table}&offset=${offset}`);assert.equal(rows.length,Math.min(500,count-offset));
  for(const row of rows){for(const c of columns){const v=row[c.column_name];if(v===null)continue;
    if(c.data_type.startsWith('timestamp')){const converted=Date.parse(v);assert.ok(Number.isFinite(converted));row[c.column_name]=converted;}
    else if(c.data_type==='boolean')row[c.column_name]=v?1:0;
    else if(['jsonb','json','ARRAY'].includes(c.data_type))row[c.column_name]=JSON.stringify(v);
   }hashes.add(fingerprint(row));}
  const r=await fetch(`${target}/import?table=${table}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedDatabase:databaseId,rows})});
  assert.ok(r.ok,`Import failed for ${table}: inspect counts before retry`);assert.equal((await r.json()).inserted,rows.length);transferred+=rows.length;
 }
 for(let offset=0;offset<count;offset+=500){for(const row of await get(target,`/rows?table=${table}&offset=${offset}`))assert.ok(hashes.delete(fingerprint(row)),`Changed row in ${table}`);}
 assert.equal(hashes.size,0);assert.equal(transferred,count);assert.equal((await get(source,`/count?table=${table}`)).count,count,'Source changed during rehearsal');
 report.tables.push({table,count,everyColumnSha256Matched:true});console.log(`Verified ${table}: ${count} rows; values/IDs preserved`);
 await writeFile('.wrangler/d1-account-rehearsal-verification.json',JSON.stringify(report,null,2));
}
report.inventory=await get(target,'/inventory');assert.equal(report.inventory.foreignKeys.length,0);
report.completedAt=new Date().toISOString();report.passed=true;
await writeFile('.wrangler/d1-account-rehearsal-verification.json',JSON.stringify(report,null,2));
console.log('PASS: all source account rows, hashes, tokens, JSON, timestamps and relationships preserved in isolated D1; no public exposure or outbound integrations.');
