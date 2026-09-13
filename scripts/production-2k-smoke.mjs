import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base='https://nycschoolsratings.com';
const results=[];
async function get(path,status=200){
 const r=await fetch(base+path,{signal:AbortSignal.timeout(60000)});
 const body=await r.text();assert.equal(r.status,status,path);
 assert(!r.headers.has('www-authenticate'));
 results.push({path,status:r.status,noindex:r.headers.get('x-robots-tag'),bytes:body.length});
 return body;
}
const home=await get('/');assert(!/Staging unavailable/.test(home));
const all=JSON.parse(await get('/api/schools'));assert.equal(all.length,2408);
const twok=JSON.parse(await get('/api/schools?has_2k=true'));assert.equal(twok.length,615);assert.equal(new Set(twok.map(s=>s.dbn)).size,615);
const overlap=twok.find(s=>s.dbn==='10XAPN');assert(overlap.has_3k&&overlap.has_prek);assert.equal(overlap.enrollment,null);assert.equal(overlap.academics_score,null);
for(const flag of ['has_3k','has_prek'])assert(JSON.parse(await get('/api/schools?'+flag+'=true')).some(s=>s.dbn==='10XAPN'));
assert.equal(JSON.parse(await get('/api/twok-centers')).length,615);
assert.equal(JSON.parse(await get('/api/twok-centers-stats')).totalCenters,615);
for(const dbn of ['06G262','10XAPN','27H581','06G009']){
 const s=twok.find(s=>s.dbn===dbn);const slug=s.name.toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
 const html=await get('/school/'+dbn.toLowerCase()+'-'+slug);
 assert(/not applicable/i.test(html));assert(!/0 students enrolled|Rating -1|ratingValue[^,}]*-1/.test(html));
 assert(!/name="robots" content="noindex/.test(html));
}
await get('/school/31r005-ps-005-huguenot');
await get('/api/profile',401);await get('/api/admin/early-childhood',401);
await get('/api/stripe/config');
const robots=await get('/robots.txt');assert(!/^Disallow: \/\s*$/m.test(robots));
await writeFile('reports/twok/production-http-test.json',JSON.stringify({at:new Date().toISOString(),base,results},null,2));
console.log(JSON.stringify(results,null,2));
