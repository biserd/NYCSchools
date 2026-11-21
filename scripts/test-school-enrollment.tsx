import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { openPilotSqlite } from './data/classroom-pilot-sqlite';
import { hasSchoolEnrollment,loadSchoolEnrollment } from '../server/schoolEnrollment';
import { loadClassroomPilot } from '../server/classroomPilot';
import { ClassroomPilotSchool } from '../shared/ClassroomPilotContent';
import { SchoolEnrollmentVisual } from '../shared/SchoolEnrollmentVisual';
import { enrollmentChange,enrollmentFromPilot,enrollmentPeriods } from '../shared/school-enrollment';

const {db,read}=openPilotSqlite();
const schools=db.prepare('INSERT INTO schools VALUES (?,?)');
for(const row of [['02M158','P.S. 158'],['24Q007','P.S. 7'],['02M475','Stuyvesant'],['84Q706','Charter'],['96M990','Prior only'],
  ['96M991','Suppression'],['96M992','Forecast only'],['96M993','Same name']])schools.run(...row);
const put=db.prepare('INSERT INTO classroom_pilot_register VALUES (?,?,?,?,?)');
const prior=enrollmentPeriods.previous.id,latest=enrollmentPeriods.current.id;
put.run(prior,'96M990','Total K-12',50,'reported');
put.run(prior,'96M990','1',10,'reported');
put.run(prior,'96M991','K',0,'reported');
put.run(latest,'96M991','K',9,'reported');
put.run(prior,'96M991','1',null,'suppressed');
put.run(latest,'96M991','1',5,'reported');
put.run(prior,'96M991','2',0,'reported');
put.run(latest,'96M991','2',0,'reported');
put.run('register-2027-28-forecast','96M992','K',7000,'reported');
put.run(latest,'96M994','K',50,'reported'); // source identifier with no canonical profile

const ps=await loadSchoolEnrollment('02M158',read);
assert.equal(await hasSchoolEnrollment('02M158',read),true);
assert.ok(ps);
assert.deepEqual(ps.totals.map(p=>[p.grade,p.previous.count,p.current.count]),[['Total K-12',550,528],['Total',599,587]]);
assert.deepEqual(ps.grades.filter(p=>p.grade==='K').map(p=>[p.previous.count,p.current.count]),[[92,96]]);
const pilot=await loadClassroomPilot(read);
assert.ok(pilot);
assert.deepEqual(enrollmentFromPilot(pilot),ps);
const pilotHtml=renderToStaticMarkup(<ClassroomPilotSchool data={pilot}/>);
assert.equal(pilotHtml.split('data-testid="school-enrollment-visual"').length,2);
assert.match(pilotHtml,/4 of 5 eligible official kindergarten classes met the cap/);
assert.match(pilotHtml,/id="enrollment-and-class-size"/);
const queens=await loadSchoolEnrollment('24Q007',read);
const stuy=await loadSchoolEnrollment('02M475',read);
assert.ok(queens?.grades.some(g=>g.grade==='K'));
assert.ok(stuy?.grades.some(g=>g.grade==='9')&&!stuy.grades.some(g=>g.grade==='K'));
for(const dbn of ['84Q706','96M992','96M993','96M994']){
  assert.equal(await loadSchoolEnrollment(dbn,read),null,dbn);
  assert.equal(await hasSchoolEnrollment(dbn,read),false,dbn);
}
const priorOnly=await loadSchoolEnrollment('96M990',read);
assert.ok(priorOnly);
assert.equal(priorOnly.totals[0].current.status,'missing');
assert.equal(enrollmentChange(priorOnly.totals[0]),null);
const single=renderToStaticMarkup(<SchoolEnrollmentVisual data={priorOnly}/>);
assert.match(single,/No preliminary count was reported/);
assert.doesNotMatch(single,/Up \d|Down \d|No change/);
const suppressed=await loadSchoolEnrollment('96M991',read);
assert.ok(suppressed);
assert.deepEqual(suppressed.grades.map(p=>[p.grade,p.previous.status,p.previous.count,enrollmentChange(p)]),[['K','reported',0,9],['1','suppressed',null,null]]);
const visible=renderToStaticMarkup(<SchoolEnrollmentVisual data={suppressed}/>);
assert.match(visible,/Suppressed/);
assert.match(visible,/Up 9 students/);
assert.match(visible,/Oct\. 31, 2026 preliminary/);
assert.match(visible,/nofollow noopener noreferrer/);
console.log('Verified exact DBN matching, original P.S. 158 values and layout, grade scope, single-period display, suppression, zero and forecast exclusion.');
