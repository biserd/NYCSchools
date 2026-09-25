import assert from 'node:assert/strict';

const origin=process.env.MUSE_TEST_ORIGIN || 'https://nyc-schools-ratings-d1-staging.biser-d.workers.dev';
let nextId=1;
async function rpc(method,params) {
  const body={jsonrpc:'2.0',id:nextId++,method,...(params?{params}:{})};
  const response=await fetch(`${origin}/mcp/muse`,{method:'POST',headers:{'content-type':'application/json','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify(body)});
  const value=await response.json();
  assert.equal(value.id,body.id);
  return {status:response.status,value,bytes:JSON.stringify(value).length};
}
const call=(name,args)=>rpc('tools/call',{name,arguments:args});
const discovery=await fetch(`${origin}/.well-known/mcp.json`).then(r=>r.json());
assert.equal(discovery.transport.type,'streamable-http');
const overview=await fetch(`${origin}/mcp/muse`).then(r=>r.json());
assert.deepEqual(overview.tools,['search_schools','get_school_details','compare_schools']);
const discovered=await rpc('server/discover');
assert.equal(discovered.value.result.serverInfo.name,'nyc-school-ratings');
const listed=await rpc('tools/list');
assert.deepEqual(listed.value.result.tools.map(tool=>tool.name),overview.tools);

const search=await call('search_schools',{has_2k:true,limit:2});
assert.ok(search.value.result.structuredContent.schools.length>0);
assert.ok(search.value.result.structuredContent.schools.every(s=>s.programs.has_2k===true));
assert.ok(search.bytes<15000,'search result must fit a conversational response');
const first=search.value.result.structuredContent.schools[0];
assert.ok(first.canonical_url.startsWith('https://nycschoolsratings.com/school/'));
assert.equal((await fetch(first.canonical_url,{method:'HEAD'})).status,200);

const ambiguous=await call('search_schools',{query:'PS 15',limit:2});
assert.ok(ambiguous.value.result.structuredContent.total_matches>=2,'name ambiguity should not collapse identifiers');
const charter=await call('search_schools',{school_type:'charter',borough:'Brooklyn',limit:1});
assert.ok(charter.value.result.structuredContent.schools.length>0);
assert.equal(charter.value.result.structuredContent.schools[0].school_type,'charter');
const earlyType=await call('search_schools',{school_type:'early_childhood_provider',has_2k:true,limit:1});
assert.equal(earlyType.value.result.structuredContent.schools[0].school_type,'early_childhood_provider');
const detail=await call('get_school_details',{dbn:'02M545'});
const profile=detail.value.result.structuredContent;
assert.equal(profile.dbn,'02M545');
assert.equal(profile.canonical_url.startsWith('https://nycschoolsratings.com/school/'),true);
assert.equal((await fetch(profile.canonical_url,{method:'HEAD'})).status,200);
assert.ok(profile.academics.assessment_year===null || typeof profile.academics.assessment_year==='string');
assert.equal(typeof profile.academics.high_school_outcomes.latest_graduation_cohort_year,'number');
assert.ok(profile.rating.definition.includes('not an official NYCPS rating'));
assert.ok(detail.bytes<18000,'profile result must fit a conversational response');

const early=await call('get_school_details',{dbn:first.dbn});
assert.equal(early.value.result.structuredContent.rating.overall_score,null);
assert.equal(early.value.result.structuredContent.academics.ela_proficiency,null);
assert.ok(early.value.result.structuredContent.surveys.every(s=>s.scope!=='center_wide'||s.note.includes('not results for a specific 2-K')));
const matchedCenter=await call('get_school_details',{dbn:'06MAQR'});
const centerSurveys=matchedCenter.value.result.structuredContent.surveys.filter(s=>s.scope==='center_wide');
assert.deepEqual(centerSurveys.map(s=>s.instrument).sort(),['b5-family','b5-teacher'],'exactly matched center instruments should not be duplicated');

const compare=await call('compare_schools',{dbns:['02M545','02M234']});
const comparison=compare.value.result.structuredContent;
assert.equal(comparison.schools.length,2);
assert.equal(comparison.schools[0].rating.overall_score,profile.rating.overall_score);
assert.ok(compare.bytes<35000,'comparison result must stay bounded');
for(const s of comparison.schools) assert.equal((await fetch(s.canonical_url,{method:'HEAD'})).status,200);

assert.equal((await call('get_school_details',{dbn:'wrong'})).value.error.code,-32602);
assert.equal((await call('get_school_details',{dbn:'02M999'})).value.error.code,-32000);
assert.equal((await call('compare_schools',{dbns:['02M545','02M545']})).value.error.code,-32602);
assert.equal((await call('search_schools',{limit:21})).value.error.code,-32602);
assert.ok((await call('get_favorites',{})).value.error);
assert.ok((await call('find_schools_for_address',{address:'not supplied'})).value.error);

let throttled=false;
for(let n=0;n<40;n++){
  const response=await rpc('ping');
  if(response.status===429){throttled=true;break;}
}
assert.ok(throttled,'public connector should rate-limit repeated calls from one client');
console.log(JSON.stringify({staging:origin,discovery:true,tools:overview.tools,verifiedTwoK:first.dbn,birthToFiveCenter:'06MAQR',birthToFiveInstruments:centerSurveys.length,ambiguousMatches:ambiguous.value.result.structuredContent.total_matches,detailYear:profile.academics.assessment_year,latestGraduationCohort:profile.academics.high_school_outcomes.latest_graduation_cohort_year,comparisonCount:comparison.schools.length,rateLimited:throttled,canonicalUrlsVerified:4},null,2));
