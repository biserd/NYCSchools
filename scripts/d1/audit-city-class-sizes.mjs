/** Compare imported snapshot grain and coverage against the audited official workbooks. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [target,...extra]=process.argv.slice(2);
assert.ok(['--staging','--production'].includes(target)&&extra.length===0);
const live=target==='--production';
const config=live?'wrangler.jsonc':'wrangler.d1-staging.jsonc';
const db=live?'nyc-schools-ratings-production':'nyc-schools-ratings-d1-staging';
const expectedId=live?'35237f81-df27-4908-be1a-1226faf501e0':'e48a9ae9-4948-4dae-863a-06f6b026b436';
const cfg=JSON.parse(readFileSync(config,'utf8'));
assert.equal(cfg.vars.ENVIRONMENT,live?'production':'staging');
assert.ok(cfg.d1_databases.some(s=>s.binding==='DB'&&s.database_name===db&&s.database_id===expectedId));
const expected=JSON.parse(readFileSync('dist/class-size-citywide/audit.json','utf8'));
const queries=[
  'SELECT id,observed_on,revision,sources_json FROM city_class_size_releases ORDER BY id',
  `SELECT release_id,scope,count(*) AS rows,sum(benchmark_verified) AS verified FROM city_class_size_sections GROUP BY release_id,scope`,
  `SELECT c.release_id,substr(c.scope_id,3,1) AS dbn_borough,count(DISTINCT c.scope_id) AS profiles
    FROM city_class_size_sections c JOIN schools s ON s.dbn=c.scope_id WHERE c.scope='school' GROUP BY c.release_id,substr(c.scope_id,3,1)`,
  `SELECT count(*) AS count FROM city_class_size_caps`,
  `SELECT scope,scope_id,sum(students) AS students,sum(classes) AS classes FROM city_class_size_sections
    WHERE release_id='november-2026-27' AND band='K5' AND group_name='K' AND program IN ('Gen Ed','ICT') AND scope_id IN ('02','02M158') GROUP BY scope,scope_id ORDER BY scope`,
  `SELECT eligible,meeting FROM city_class_size_caps WHERE release_id='november-2026-27' AND dbn='02M158' AND scope='grade' AND group_name='K'`,
];
const result=JSON.parse(execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute',db,'--remote','--config',config,
  '--json','--command',queries.join('; ')],{encoding:'utf8',maxBuffer:1024*1024,windowsHide:true}));
assert.equal(result.length,queries.length);
assert.ok(result.every(r=>r.success&&r.meta.changed_db===false));
const [releases,counts,profiles,caps,k,cap]=result.map(x=>x.results);
assert.equal(releases.length,expected.totals.releases);
assert.equal(counts.reduce((sum,row)=>sum+row.rows,0),expected.totals.sections);
assert.deepEqual(caps,[{count:expected.totals.caps}]);
for(const row of releases){
  const source=expected.releases[row.id];
  assert.deepEqual([row.observed_on,row.revision,JSON.parse(row.sources_json)],[source.observed,source.revision,source.sources]);
  assert.deepEqual(counts.find(c=>c.release_id===row.id&&c.scope==='school')?.rows,source.school_rows);
  const district=counts.find(c=>c.release_id===row.id&&c.scope==='district');
  assert.deepEqual([district?.rows,district?.verified],[source.district_rows,source.district_rows_verified]);
  assert.deepEqual(Object.fromEntries(profiles.filter(p=>p.release_id===row.id).map(p=>[p.dbn_borough,p.profiles])),source.matched_by_borough);
}
assert.deepEqual(k,[{scope:'district',scope_id:'02',students:2052,classes:102},{scope:'school',scope_id:'02M158',students:95,classes:5}]);
assert.deepEqual(cap,[{eligible:5,meeting:4}]);
console.log(`${db}: ${expected.totals.sections} section rows and ${expected.totals.caps} cap records verified; ${expected.releases['november-2026-27'].matched_profiles} current profiles across all five boroughs.`);
