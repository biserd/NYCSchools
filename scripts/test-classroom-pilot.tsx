import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadClassroomPilot, classroomPreviewEnabled } from '../server/classroomPilot';
import { ClassroomPilotDistrict, ClassroomPilotDraft, ClassroomPilotSchool } from '../shared/ClassroomPilotContent';
import { classroomMovement } from '../shared/ClassroomEnrollmentScatter';
import { classTotals, latestObservationVersions, CLASSROOM_ARTICLE_PATH, PILOT_DISTRICT_PATH, PILOT_SCHOOL_PATH } from '../shared/classroomPilot';
import { openPilotSqlite } from './data/classroom-pilot-sqlite';

const {db,read} = openPilotSqlite();
db.exec("INSERT INTO schools VALUES ('02M158','P.S. 158 Bayard Taylor')");
let data = await loadClassroomPilot(read);
assert.ok(data);
assert.deepEqual(Object.values(classTotals(data.school.programs)), [95,5,19]);
assert.deepEqual(data.school.programs.map(x=>[x.program,x.students,x.classes]), [['Gen Ed',74,4],['ICT',21,1]]);
assert.deepEqual([data.district.rows.length,data.district.students,data.district.classes], [35,2052,102]);
assert.equal((data.district.students/data.district.classes).toFixed(1),'20.1');
assert.deepEqual([data.priorDistrict.students,data.priorDistrict.classes], [2042,107]);
assert.equal(data.sources.priorClasses,'February 2026');
assert.equal(data.school.cap?.meeting,4);
assert.equal(data.school.cap?.eligible,5);
assert.deepEqual([data.school.previousK.count,data.school.currentK.count],[92,96]);
assert.deepEqual([data.school.previousK12.count,data.school.currentK12.count],[550,528]);
assert.deepEqual([data.school.previousTotal.count,data.school.currentTotal.count],[599,587]);
assert.deepEqual(data.school.grades.map(row=>row.grade),['PreK','K','1','2','3','4','5']);
assert.deepEqual(data.school.grades.find(row=>row.grade==='PreK')?.current,{count:59,status:'reported'});
assert.deepEqual([data.summary.matchedSchools,data.summary.matchedBefore-data.summary.matchedAfter], [1622,22634]);
assert.deepEqual(data.school.distribution.map(({program,size,classes})=>[program,size,classes]), [
  ['Gen Ed',18,2],['Gen Ed',19,2],['ICT',21,1],
]);
assert.equal(data.school.distribution.reduce((sum,row)=>sum+row.students,0),95);
assert.deepEqual(data.matched?.matrix,{
  falling:{smaller:10,unchanged:0,larger:3},flat:{smaller:0,unchanged:1,larger:1},rising:{smaller:1,unchanged:0,larger:15},
});
assert.equal(Object.values(data.matched!.matrix!).flatMap(Object.values).reduce((a,b)=>a+b,0),data.matched!.schools);
const points=data.matched?.points??[];
assert.equal(points.length,31);
assert.equal(new Set(points.map(point=>point.dbn)).size,31);
const dots={falling:{smaller:0,unchanged:0,larger:0},flat:{smaller:0,unchanged:0,larger:0},rising:{smaller:0,unchanged:0,larger:0}};
const classSum=db.prepare('SELECT SUM(students) AS students,SUM(classes) AS classes FROM classroom_pilot_classes WHERE dbn=? AND release_id=?');
const registerValue=db.prepare("SELECT enrolled FROM classroom_pilot_register WHERE dbn=? AND release_id=? AND grade='K'");
for(const point of points){
  for(const [period,releaseId,registerId] of ([
    ['before','class-february-2025-26','register-2025-26-audited'],
    ['after','class-november-2026-27','register-2026-27-preliminary'],
  ] as const)){
    const students=classSum.get(point.dbn,releaseId);
    const register=registerValue.get(point.dbn,registerId);
    assert.deepEqual(point[period],{students:students?.students,classes:students?.classes,enrolled:register?.enrolled});
  }
  const {enrollment,average}=classroomMovement(point);
  dots[enrollment<0?'falling':enrollment>0?'rising':'flat'][average<0?'smaller':average>0?'larger':'unchanged']++;
}
assert.deepEqual(dots,data.matched?.matrix);
assert.deepEqual(classroomMovement(points.find(point=>point.dbn==='02M124')!),{enrollment:-11,average:6.5});
assert.deepEqual(data.matched?.examples?.map(({dbn,before,after})=>[dbn,before.enrolled,after.enrolled,before.classes,after.classes]),
  [['02M124',59,48,2,1],['02M051',61,49,3,3]]);
assert.equal(data.district.rows.find(x=>x.dbn==='02M158')?.path,PILOT_SCHOOL_PATH);
assert.ok(data.district.rows.filter(x=>x.dbn!=='02M158').every(x=>x.path===null));
assert.ok(db.prepare("SELECT 1 FROM classroom_pilot_releases WHERE status='forecast'").get());
assert.throws(()=>db.exec("INSERT INTO classroom_pilot_register SELECT * FROM classroom_pilot_register LIMIT 1"),/UNIQUE/);
assert.throws(()=>db.exec("INSERT INTO classroom_pilot_classes SELECT * FROM classroom_pilot_classes LIMIT 1"),/UNIQUE/);
assert.throws(()=>db.exec("INSERT INTO classroom_pilot_caps SELECT * FROM classroom_pilot_caps LIMIT 1"),/UNIQUE/);

const observations=latestObservationVersions([
  {id:'october-preliminary',observedOn:'2026-10-31',revision:1},
  {id:'october-revised',observedOn:'2026-10-31',revision:2},
  {id:'june',observedOn:'2027-06-15',revision:1},
]);
assert.deepEqual(observations.map(x=>x.id),['october-revised','june']);
const school = renderToStaticMarkup(<ClassroomPilotSchool data={data}/>);
const district = renderToStaticMarkup(<ClassroomPilotDistrict data={data}/>);
const draft = renderToStaticMarkup(<ClassroomPilotDraft data={data}/>);
for (const html of [school,district,draft]) {
  assert.match(html,/<table/);
  assert.match(html,/nofollow noopener noreferrer/);
  assert.doesNotMatch(html,/href="https:\/\/nycschoolsratings\.com/);
}
assert.ok(school.includes(PILOT_DISTRICT_PATH+'#kindergarten-class-size')&&school.includes(CLASSROOM_ARTICLE_PATH));
assert.ok(district.includes(PILOT_SCHOOL_PATH)&&district.includes(CLASSROOM_ARTICLE_PATH));
assert.ok(draft.includes(PILOT_SCHOOL_PATH)&&draft.includes(PILOT_DISTRICT_PATH));
assert.match(school,/classroom-parent-outcome.*A smaller school, a bigger kindergarten/);
assert.match(school,/18–21 students per classroom/);
assert.match(school,/4 of 5 eligible official kindergarten classes met the cap/);
assert.match(draft,/13 of 31 comparable schools enrolled fewer kindergarteners/);
assert.match(draft,/10 had smaller classes on average, 3 had larger classes/);
assert.match(draft,/matched-school-matrix/);
assert.match(draft,/enrollment-movement-chart/);
assert.equal([...draft.matchAll(/data-school-point=/g)].length,31);
assert.match(draft,/Yung Wing/);
assert.match(draft,/Elias Howe/);

db.exec(`UPDATE classroom_pilot_register SET enrolled = 0 WHERE release_id='register-2026-27-preliminary' AND dbn='02M158' AND grade='K';
  UPDATE classroom_pilot_register SET enrolled=NULL,value_status='suppressed' WHERE release_id='register-2025-26-audited' AND dbn='02M158' AND grade='K';
  DELETE FROM classroom_pilot_register WHERE release_id='register-2025-26-audited' AND dbn='02M158' AND grade='Total K-12';
  DELETE FROM classroom_pilot_caps WHERE dbn='02M158';`);
data = await loadClassroomPilot(read);
assert.ok(data);
assert.deepEqual(data.school.currentK,{count:0,status:'reported'});
assert.deepEqual(data.school.previousK,{count:null,status:'suppressed'});
assert.deepEqual(data.school.previousK12,{count:null,status:'missing'});
assert.equal(data.school.cap,null);
assert.doesNotMatch(renderToStaticMarkup(<ClassroomPilotSchool data={data}/>),/classes met the cap/);
process.env.CLASSROOM_PILOT_ENABLED='true';
process.env.ENVIRONMENT='production';
assert.equal(classroomPreviewEnabled(),true);
process.env.CLASSROOM_PILOT_ENABLED='false';
assert.equal(classroomPreviewEnabled(),false);
process.env.CLASSROOM_PILOT_ENABLED='true';
process.env.ENVIRONMENT='staging';
assert.equal(classroomPreviewEnabled(),true);
console.log('Passed official benchmarks, uniqueness, versioning, sample-missingness, preview gating, and rendered source/link checks.');
