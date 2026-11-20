/** Read-only reconciliation of the published classroom cohort and source manifest. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [target,...extra]=process.argv.slice(2);
assert.ok(['--staging','--production'].includes(target)&&!extra.length);
const production=target==='--production';
const config=production?'wrangler.jsonc':'wrangler.d1-staging.jsonc';
const database=production?'nyc-schools-ratings-production':'nyc-schools-ratings-d1-staging';
const id=production?'35237f81-df27-4908-be1a-1226faf501e0':'e48a9ae9-4948-4dae-863a-06f6b026b436';
const conf=JSON.parse(readFileSync(config,'utf8'));
assert.equal(conf.vars.ENVIRONMENT,production?'production':'staging');
assert.ok(conf.d1_databases.some(d=>d.binding==='DB'&&d.database_name===database&&d.database_id===id));
const local=JSON.parse(readFileSync('dist/classroom-pilot/audit.json','utf8'));
const statements=[
  `SELECT (SELECT COUNT(*) FROM classroom_pilot_releases) AS releases, (SELECT COUNT(*) FROM classroom_pilot_register) AS registers,
    (SELECT COUNT(*) FROM classroom_pilot_classes) AS classProgramRows, (SELECT COUNT(*) FROM classroom_pilot_caps) AS capRows`,
  `SELECT r.status, COUNT(*) AS schools, SUM(e.enrolled) AS students FROM classroom_pilot_register e
    JOIN classroom_pilot_releases r ON r.id=e.release_id WHERE e.grade='Total K-12' AND r.status IN ('audited','preliminary') GROUP BY r.status ORDER BY r.status`,
  `SELECT r.release_label, c.program, COUNT(DISTINCT c.dbn) AS schools, SUM(c.students) AS students, SUM(c.classes) AS classes
    FROM classroom_pilot_classes c JOIN classroom_pilot_releases r ON r.id=c.release_id WHERE c.grade='K'
    GROUP BY r.release_label, c.program ORDER BY r.release_label, c.program`,
  `SELECT c.program, c.students, c.classes FROM classroom_pilot_classes c JOIN classroom_pilot_releases r ON r.id=c.release_id
    WHERE r.observed_on='2026-10-31' AND c.dbn='02M158' AND c.grade='K' ORDER BY c.program`,
  `SELECT eligible, meeting FROM classroom_pilot_caps WHERE dbn='02M158' AND grade='K'`,
  `SELECT r.summary_json, (SELECT COUNT(DISTINCT dbn) FROM classroom_pilot_classes WHERE release_id=r.id) AS schools
    FROM classroom_pilot_releases r WHERE dataset='class_size' AND observed_on='2026-10-31'`,
];
const result=JSON.parse(execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute',database,'--remote','--config',config,
  '--json','--command',statements.join('; ')],{encoding:'utf8',maxBuffer:4*1024*1024,windowsHide:true}));
assert.equal(result.length,statements.length);
assert.ok(result.every(r=>r.success&&r.meta?.changed_db===false));
const [totals,register,programs,school,cap,current]=result.map(r=>r.results);
assert.deepEqual(totals,[local.rows]);
assert.deepEqual(register,[
  {status:'audited',schools:local.registry.beforeSchools,students:local.registry.beforeTotal},
  {status:'preliminary',schools:local.registry.afterSchools,students:local.registry.afterTotal},
]);
assert.equal(programs.length,6);
for(const row of programs){
  const key=row.release_label.includes('February')?'february-2025-26':row.release_label.includes('2026')?'november-2026-27':'november-2025-26';
  assert.deepEqual([row.students,row.classes],local[key].programs[row.program],row.release_label+' '+row.program);
}
assert.deepEqual(school,[{program:'Gen Ed',students:74,classes:4},{program:'ICT',students:21,classes:1}]);
assert.deepEqual(cap,[{eligible:5,meeting:4}]);
assert.equal(current.length,1);
assert.equal(current[0].schools,35);
const summary=JSON.parse(current[0].summary_json);
assert.deepEqual(summary.matched,local['november-2026-27'].matched);
assert.deepEqual(summary.schoolDistribution,local['november-2026-27'].schoolDistribution);
console.log(`Verified ${database}: ${totals[0].registers} register cells, all six program totals, P.S. 158 cap and classes, and the 31-point analysis.`);
