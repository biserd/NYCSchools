import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClassroomFamilyTakeaway } from '../shared/ClassroomFamilyTakeaway';
import { ClassroomPaywall } from '../shared/ClassroomPaywall';
import { SchoolPremiumGate,SchoolUpgradeButton } from '../shared/SchoolPremiumGate';
import { getClassroomTakeaway } from '../shared/classroom-family';
import { publicClassroomTeaser } from '../shared/classroom-panel';
import type { CityClassSizeProfile, ClassSizeRow } from '../shared/city-class-size';
import { enrollmentFromPilot } from '../shared/school-enrollment';
import { loadClassroomPilot } from '../server/classroomPilot';
import { openPilotSqlite } from './data/classroom-pilot-sqlite';

const {db,read}=openPilotSqlite();
db.exec("INSERT INTO schools VALUES ('02M158','P.S. 158 Bayard Taylor')");
const pilot=await loadClassroomPilot(read);
assert.ok(pilot);
const enrollment=enrollmentFromPilot(pilot);
assert.ok(enrollment);

const gen:ClassSizeRow={band:'K5',groupName:'K',department:'',program:'Gen Ed',students:74,classes:4,
  minimum:'18',maximum:'19',previousStudents:null,previousClasses:null,districtStudents:1972,districtClasses:98};
const ict:ClassSizeRow={...gen,program:'ICT',students:21,classes:1,minimum:'21',maximum:'21',districtStudents:80,districtClasses:4};
const classes:CityClassSizeProfile={observedOn:'2026-10-31',previousOn:'2025-10-31',releaseLabel:'November',
  district:2,rows:[gen,ict],caps:[{scope:'grade',groupName:'K',eligible:5,meeting:4}]};
const ps=getClassroomTakeaway('02M158',classes,enrollment,pilot);
assert.ok(ps);
assert.deepEqual(ps.distribution.map(row=>row.size),[18,18,19,19,21]);
assert.equal(ps.enrollment?.grade.current.count,96);
const html=renderToStaticMarkup(<ClassroomFamilyTakeaway data={ps}/>);
assert.match(html,/A smaller school, a bigger kindergarten/);
assert.match(html,/4 of 5 eligible official kindergarten classes/);
assert.match(html,/19\.0.*20\.1/);
assert.match(html,/nofollow noopener noreferrer/);
const teaser=publicClassroomTeaser(ps,classes);
const locked=renderToStaticMarkup(<ClassroomPaywall coverage={{classSizes:true,enrollment:true}} teaser={teaser}/>);
assert.match(locked,/blur-\[5px\]/);
assert.match(locked,/data-testid="classroom-panel-card"><div class="bg-primary\/5 p-4 sm:p-5" data-testid="classroom-public-takeaway"/);
assert.match(locked,/border-t[^"]*" data-testid="classroom-paywall"/);
assert.match(locked,/Upgrade to Premium/);
assert.match(locked,/What this means for your family.*A smaller school, a bigger kindergarten/);
assert.match(locked,/from 92.*to 96/);
assert.match(locked,/NYCPS enrollment register/);
assert.doesNotMatch(locked,/Already a member|Sign in|4 of 5|20\.1|classroom-parent-outcome|550 to 528/);
assert.deepEqual(Object.keys(teaser).sort(),['detail','headline','source']);
const gate=renderToStaticMarkup(<SchoolPremiumGate kind="chart" title="Unlock Historical Trends" description="Compare reported results." action={{onClick:()=>{},testId:'test-upgrade'}}/>);
const pricing=renderToStaticMarkup(<SchoolUpgradeButton href="/pricing"/>);
for(const markup of [locked,gate,pricing]){
  assert.match(markup,/lucide-crown/);
  assert.match(markup,/data-school-upgrade="true"/);
  assert.match(markup,/Upgrade to Premium/);
}
assert.match(gate,/bg-background\/45[^"]*" data-testid="school-premium-overlay"/);
assert.doesNotMatch(gate,/backdrop-blur|bg-background\/(?:90|95)/);

const nonPilot=getClassroomTakeaway('24Q007',classes,null,pilot);
assert.ok(nonPilot?.range);
assert.deepEqual(nonPilot.distribution,[]);
assert.equal(nonPilot.enrollment,null);
assert.match(publicClassroomTeaser(nonPilot,classes).detail,/18–19 students per classroom.*Gen Ed/);
assert.doesNotMatch(renderToStaticMarkup(<ClassroomFamilyTakeaway data={nonPilot}/>),/Published classroom sizes/);

const otherDate=getClassroomTakeaway('02M158',{...classes,observedOn:'2027-10-31'},enrollment,pilot);
assert.ok(otherDate?.range);
assert.equal(otherDate.enrollment,null);
assert.deepEqual(otherDate.distribution,[]);
const inconsistent=getClassroomTakeaway('02M158',{...classes,rows:[gen,{...ict,students:22}]},enrollment,pilot);
assert.deepEqual(inconsistent?.distribution,[]);
assert.equal(inconsistent?.benchmark,null);
const noBenchmark=getClassroomTakeaway('02M158',{...classes,rows:[gen,{...ict,districtClasses:null}]},enrollment,pilot);
assert.equal(noBenchmark?.benchmark,null);
const invalid={...classes,rows:[{...gen,minimum:'<15'}],caps:[{scope:'grade' as const,groupName:'K',eligible:0,meeting:0}]};
assert.equal(getClassroomTakeaway('02M158',invalid),null);
assert.equal(getClassroomTakeaway('02M158',null,enrollment,pilot),null);
assert.equal(getClassroomTakeaway('02M158',{...classes,rows:[{...gen,band:'HS'}]},enrollment,pilot),null);
const secondary=publicClassroomTeaser(null,{...classes,rows:[{...gen,band:'HS'}]});
assert.match(secondary.detail,/by course/);
assert.doesNotMatch(secondary.detail,/Gen Ed|74/);
const suppressed={...enrollment,grades:enrollment.grades.map(pair=>pair.grade==='K'?{...pair,previous:{count:null,status:'suppressed' as const}}:pair)};
assert.equal(getClassroomTakeaway('02M158',classes,suppressed)?.enrollment,null);
console.log('School profile takeaway: exact pilot, source-aligned benchmark, reusable ranges, caps, and missing-data boundaries passed.');
