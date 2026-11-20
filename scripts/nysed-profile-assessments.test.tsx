import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { withDatabaseInstance, wrapDatabase } from '../server/db';
import { getNysedProfileAssessments } from '../server/nysedProfileAssessments';
import * as schema from '../shared/schema';
import { buildNysedProfileAssessments, type AssessmentRow } from '../shared/nysed-profile-assessments';
import { NysedProfileAssessmentContent } from '../shared/NysedProfileAssessmentContent';

const sourceUrl='https://data.nysed.gov/files/essa/25-26/SRC2026.zip';
const base:AssessmentRow={subject:'science',assessment:'Science5',grade:5,year:2025,definition:'grade-v1',
  institutionId:'800000048386',bedsCode:'310200010158',releaseId:'nov-release',sourceUrl,releasedOn:'2026-11-19',
  tested:87,proficient:62,publishedPercent:71,status:'count'};
const latest:AssessmentRow={...base,year:2026,tested:83,proficient:69,publishedPercent:83};
const district={districtNumber:2,districtTested:2013,districtProficient:1320};
const fixture=buildNysedProfileAssessments([base,{...latest,...district},{...latest,assessment:'CombinedScience',grade:8},{...latest,assessment:'RegentsScience8',grade:8}]);
const [science]=fixture.science;
assert.equal(fixture.science.length,1);
assert.equal(science.grade,5);
assert.equal(science.latest.percent?.toFixed(1),'83.1');
assert.equal(science.prior?.percent?.toFixed(1),'71.3');
assert.equal(science.deltaPp?.toFixed(1),'11.9');
assert.equal(science.districtComparison?.percent.toFixed(1),'65.6');
assert.equal(science.districtComparison?.differencePp.toFixed(1),'17.6');
const html=renderToStaticMarkup(<NysedProfileAssessmentContent data={fixture}/>);
for (const phrase of ['62 of 87 proficient','69 of 83 proficient','+11.9 pp','Science test results by grade','Spring 2025','Spring 2026',
  '17.6 pp above the District 2 average','1,320 of 2,013 proficient']) assert.ok(html.includes(phrase),phrase);
assert.ok(!html.includes('data-testid="nysed-science-grade-8"'));
for (const alternate of [
  {...base,year:2024}, {...base,definition:'different definition'}, {...base,releaseId:'old'},
  {...base,institutionId:'800000000000'}, {...base,bedsCode:'310200010000'},
  {...base,status:'published_percent' as const,proficient:null},
  {...base,status:'suppressed' as const,proficient:null,publishedPercent:null},
]) assert.equal(buildNysedProfileAssessments([alternate,latest]).science[0].deltaPp,null);
const withheld=buildNysedProfileAssessments([base,{...latest,...district,status:'suppressed',proficient:null,publishedPercent:null}]).science[0];
assert.equal(withheld.latest.percent,null);
assert.equal(withheld.latestAvailable?.year,2025);
assert.equal(withheld.deltaPp,null);
assert.equal(withheld.districtComparison,undefined);
assert.equal(buildNysedProfileAssessments([{...latest,tested:0,proficient:null,publishedPercent:null,status:'zero_tested'}]).science.length,0);
const zero=buildNysedProfileAssessments([{...latest,tested:12,proficient:0,publishedPercent:0}]).science[0];
assert.equal(zero.latest.percent,0);
assert.equal(zero.latest.smallSample,true);
const charter=buildNysedProfileAssessments([
  {...base,subject:'math',assessment:'MATH8',grade:8},
  {...latest,subject:'math',assessment:'MATH8',grade:8},
  {...latest,subject:'math',assessment:'Combined8Math',grade:8},
  {...latest,subject:'math',assessment:'RegentsMath8',grade:8},
  {...latest,subject:'math',assessment:'MATH3_8',grade:0},
  {...latest,subject:'ela',assessment:'ELA3_8_EST',grade:0},
  {...latest,subject:'ela',assessment:'ELA5',grade:5},
]);
assert.deepEqual(charter.math.map(s=>s.assessment),['MATH8']);
assert.deepEqual(charter.ela.map(s=>s.assessment),['ELA5']);
const directions=buildNysedProfileAssessments([
  ...[3,4,5,6].flatMap((grade,i)=>[
    {...base,subject:'ela' as const,assessment:`ELA${grade}`,grade,tested:20,proficient:10},
    {...latest,subject:'ela' as const,assessment:`ELA${grade}`,grade,tested:20,proficient:[14,6,10,null][i],
      status:i===3?'suppressed' as const:'count' as const},
  ]),
]);
const directionHtml=renderToStaticMarkup(<NysedProfileAssessmentContent data={directions}/>);
for(const value of ['data-direction="higher"','bg-emerald-100','+20.0 pp higher','data-direction="lower"','bg-red-100','−20.0 pp lower',
  'data-direction="flat"','No change','Not comparable']) assert.ok(directionHtml.includes(value),value);
const nonComparableTotal=buildNysedProfileAssessments([
  {...base,subject:'ela',assessment:'ELA3_8',grade:0},
  {...latest,subject:'ela',assessment:'ELA3_8',grade:0},
  {...base,subject:'ela',assessment:'ELA3',grade:3},
  {...latest,subject:'ela',assessment:'ELA4',grade:4},
]);
assert.equal(nonComparableTotal.ela.find(s=>s.grade===0)?.deltaPp,null);
const sqlite=new DatabaseSync(':memory:');
sqlite.exec("CREATE TABLE schools(dbn TEXT PRIMARY KEY); INSERT INTO schools VALUES ('02M158'),('84Q704'),('84Q706');");
sqlite.exec(readFileSync('migrations-d1/0014_nysed_profile_assessments.sql','utf8'));
sqlite.exec(readFileSync('migrations-d1/0015_nysed_district_science.sql','utf8'));
const hash='0'.repeat(64);
sqlite.prepare('INSERT INTO school_assessment_archive_releases VALUES (?,?,?,?,?)').run(base.releaseId,sourceUrl,base.releasedOn,hash,hash);
const insert=sqlite.prepare('INSERT INTO school_assessment_archive_results VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
const insertRow=(row:AssessmentRow,dbn='02M158')=>insert.run(row.releaseId,dbn,row.year,row.subject,row.assessment,row.grade,'All Students',
  row.definition,row.institutionId,row.bedsCode,hash,null,row.tested,row.proficient,row.publishedPercent,row.status);
insertRow(base);
insertRow(latest);
insertRow({...latest,bedsCode:'310200860001'},'84Q706');
const insertDistrict=sqlite.prepare('INSERT INTO school_assessment_archive_district_science VALUES (?,?,?,?,?,?,?,?,?,?,?)');
const benchmark=[base.releaseId,2,2026,'Science5','All Students',base.definition,'800000048410','310200010000',2197,2013,1320] as const;
insertDistrict.run(...benchmark);
insertDistrict.run(base.releaseId,2,2025,'Science5','All Students',base.definition,'800000048410','310200010000',2233,1960,1318);
assert.throws(()=>insertDistrict.run(...benchmark),/UNIQUE/);
assert.throws(()=>insertRow(latest),/UNIQUE/);
const database=wrapDatabase(drizzle(async(query,params)=>({rows:sqlite.prepare(query).all(...params)}),{schema}));
await withDatabaseInstance(database,async()=>{
  const ps=(await getNysedProfileAssessments('02M158')).science[0];
  assert.equal(ps.deltaPp?.toFixed(1),'11.9');
  assert.equal(ps.districtComparison?.differencePp.toFixed(1),'17.6');
  assert.equal((await getNysedProfileAssessments('84Q706')).science[0].districtComparison,undefined);
  sqlite.exec("UPDATE school_assessment_archive_district_science SET definition='different' WHERE spring_year=2026");
  assert.equal((await getNysedProfileAssessments('02M158')).science[0].districtComparison,undefined);
  assert.deepEqual(await getNysedProfileAssessments('84Q704'),{science:[],ela:[],math:[]});
});
console.log('NYSED counts, zero/suppression, temporal and definition guards, and separate science/charter views passed.');
