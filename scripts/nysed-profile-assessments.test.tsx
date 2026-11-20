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
const fixture=buildNysedProfileAssessments([base,latest,{...latest,assessment:'CombinedScience',grade:8},{...latest,assessment:'RegentsScience8',grade:8}]);
const [science]=fixture.science;
assert.equal(fixture.science.length,1);
assert.equal(science.grade,5);
assert.equal(science.latest.percent?.toFixed(1),'83.1');
assert.equal(science.prior?.percent?.toFixed(1),'71.3');
assert.equal(science.deltaPp?.toFixed(1),'11.9');
const html=renderToStaticMarkup(<NysedProfileAssessmentContent data={fixture}/>);
for (const phrase of ['62 of 87 proficient','69 of 83 proficient','+11.9 pp','Science test results by grade','Spring 2025','Spring 2026']) assert.ok(html.includes(phrase),phrase);
assert.ok(!html.includes('data-testid="nysed-science-grade-8"'));
for (const alternate of [
  {...base,year:2024}, {...base,definition:'different definition'}, {...base,releaseId:'old'},
  {...base,institutionId:'800000000000'}, {...base,bedsCode:'310200010000'},
  {...base,status:'published_percent' as const,proficient:null},
  {...base,status:'suppressed' as const,proficient:null,publishedPercent:null},
]) assert.equal(buildNysedProfileAssessments([alternate,latest]).science[0].deltaPp,null);
const withheld=buildNysedProfileAssessments([base,{...latest,status:'suppressed',proficient:null,publishedPercent:null}]).science[0];
assert.equal(withheld.latest.percent,null);
assert.equal(withheld.latestAvailable?.year,2025);
assert.equal(withheld.deltaPp,null);
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
const nonComparableTotal=buildNysedProfileAssessments([
  {...base,subject:'ela',assessment:'ELA3_8',grade:0},
  {...latest,subject:'ela',assessment:'ELA3_8',grade:0},
  {...base,subject:'ela',assessment:'ELA3',grade:3},
  {...latest,subject:'ela',assessment:'ELA4',grade:4},
]);
assert.equal(nonComparableTotal.ela.find(s=>s.grade===0)?.deltaPp,null);
const sqlite=new DatabaseSync(':memory:');
sqlite.exec("CREATE TABLE schools(dbn TEXT PRIMARY KEY); INSERT INTO schools VALUES ('02M158'),('84Q704');");
sqlite.exec(readFileSync('migrations-d1/0014_nysed_profile_assessments.sql','utf8'));
const hash='0'.repeat(64);
sqlite.prepare('INSERT INTO school_assessment_archive_releases VALUES (?,?,?,?,?)').run(base.releaseId,sourceUrl,base.releasedOn,hash,hash);
const insert=sqlite.prepare('INSERT INTO school_assessment_archive_results VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
const insertRow=(row:AssessmentRow)=>insert.run(row.releaseId,'02M158',row.year,row.subject,row.assessment,row.grade,'All Students',
  row.definition,row.institutionId,row.bedsCode,hash,null,row.tested,row.proficient,row.publishedPercent,row.status);
insertRow(base);
insertRow(latest);
assert.throws(()=>insertRow(latest),/UNIQUE/);
const database=wrapDatabase(drizzle(async(query,params)=>({rows:sqlite.prepare(query).all(...params)}),{schema}));
await withDatabaseInstance(database,async()=>{
  assert.equal((await getNysedProfileAssessments('02M158')).science[0].deltaPp?.toFixed(1),'11.9');
  assert.deepEqual(await getNysedProfileAssessments('84Q704'),{science:[],ela:[],math:[]});
});
console.log('NYSED counts, zero/suppression, temporal and definition guards, and separate science/charter views passed.');
