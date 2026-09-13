import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const access=JSON.parse(await readFile('.wrangler/staging-access.json','utf8'));
const base='https://nyc-schools-ratings-staging.biser-d.workers.dev';
const authorization='Basic '+Buffer.from(access.username+':'+access.password).toString('base64');
const results=[];
async function get(path,options={}) {
 const r=await fetch(base+path,{headers:{Authorization:authorization},signal:AbortSignal.timeout(60000),...options});
 const body=await r.text();results.push({path,status:r.status,bytes:body.length,noindex:r.headers.get('x-robots-tag')});
 assert.equal(r.status,200,path+' '+body.slice(0,200));assert.match(r.headers.get('x-robots-tag'),/noindex/);return body;
}
const denied=await fetch(base);assert.equal(denied.status,401);results.push({test:'Anonymous homepage denied',status:denied.status});
const noAsset=await fetch(base+'/favicon.png');assert.equal(noAsset.status,401);results.push({test:'Anonymous assets denied',status:noAsset.status});
const mutation=await fetch(base+'/api/cron/seed-twok-centers',{method:'POST',headers:{Authorization:authorization}});assert.equal(mutation.status,403);
results.push({test:'Authenticated mutation denied',status:mutation.status});
await get('/');
const schools=JSON.parse(await get('/api/schools'));
assert.equal(schools.length,2408);
const twok=JSON.parse(await get('/api/schools?has_2k=true'));
assert.equal(twok.length,615);assert.equal(new Set(twok.map(s=>s.dbn)).size,615);
const overlap=twok.find(s=>s.dbn==='10XAPN');assert(overlap.has_3k&&overlap.has_prek);assert.equal(overlap.enrollment,null);
assert.equal(overlap.academics_score,null);
assert.equal(twok.find(s=>s.dbn==='06G009').enrollment,null);
for(const flag of ['has_3k','has_prek']) assert(JSON.parse(await get('/api/schools?'+flag+'=true')).some(s=>s.dbn==='10XAPN'));
assert.equal(JSON.parse(await get('/api/twok-centers')).length,615);
assert.equal(JSON.parse(await get('/api/twok-centers-stats')).totalCenters,615);
for(const dbn of ['06G262','10XAPN','27H581','06G009']) {
 const school=twok.find(s=>s.dbn===dbn);
 const slug=school.name.toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')+'-'+dbn.toLowerCase();
 const html=await get('/school/'+dbn.toLowerCase()+'-'+slug.slice(0,-dbn.length-1));
 assert(!/0 students enrolled|Rating -1|ratingValue[^,}]*-1/.test(html));
 assert(/not applicable/i.test(html));
 for(const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
   const json=JSON.parse(block[1]);
   assert(!/"numberOfStudents":0|"ratingValue":-1/.test(JSON.stringify(json)));
 }
}
await get('/school/31r005-ps-005-huguenot');
await get('/robots.txt');
await writeFile('reports/twok/staging-http-test.json',JSON.stringify({at:new Date().toISOString(),base,results},null,2));
console.log(JSON.stringify(results,null,2));
