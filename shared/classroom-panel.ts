import { classSizeDate,classSizeGrade,type CityClassSizeProfile } from './city-class-size';
import { classroomTakeawayHeadline,type ClassroomTakeaway } from './classroom-family';
import { enrollmentPeriods,type SchoolEnrollment } from './school-enrollment';

export type ClassroomCoverage = { classSizes:boolean; enrollment:boolean };
export type ClassroomTeaser = { headline:string; detail:string; source:'enrollment'|'classes'|'caps' };
export type SchoolClassroomPanel =
  | { state:'unavailable' }
  | { state:'locked'; coverage:ClassroomCoverage; teaser:ClassroomTeaser }
  | { state:'unlocked'; classes:CityClassSizeProfile|null; register:SchoolEnrollment|null; takeaway:ClassroomTakeaway|null; teaser:ClassroomTeaser };

const n=new Intl.NumberFormat('en-US');

// The only member-data projection allowed in anonymous HTML and API responses.
// Copy a single, sourced observation; never return the source objects or chart rows.
export function publicClassroomTeaser(takeaway:ClassroomTakeaway|null,classes:CityClassSizeProfile|null):ClassroomTeaser {
  if (takeaway) {
    const headline=classroomTakeawayHeadline(takeaway);
    const grade=classSizeGrade(takeaway.grade);
    if (takeaway.enrollment) {
      const { previous,current }=takeaway.enrollment.grade;
      const total=takeaway.enrollment.total;
      const direction=total.current.count!<total.previous.count!?'fell':'rose';
      return {headline,source:'enrollment',detail:
        `${grade} enrollment went from ${n.format(previous.count!)} in the ${enrollmentPeriods.previous.year} audited register to ${n.format(current.count!)} in the ${enrollmentPeriods.current.label} count, while total K–12 enrollment ${direction}. Enrollment is not a count of open seats.`};
    }
    if (takeaway.range) {
      return {headline,source:'classes',detail:
        `On ${classSizeDate(takeaway.observedOn)}, NYCPS reported ${takeaway.range.min}–${takeaway.range.max} students per classroom for ${grade}, ${takeaway.range.program}. Class sizes can change during the year.`};
    }
    if (takeaway.cap) {
      return {headline,source:'caps',detail:
        `NYCPS recorded ${n.format(takeaway.cap.eligible)} eligible ${grade.toLowerCase()} classes in the ${classSizeDate(takeaway.observedOn)} compliance count. That count is separate from the school’s class-size average.`};
    }
  }
  if (classes) {
    const byCourse=classes.rows.some(row=>row.band!=='K5');
    const byGrade=classes.rows.some(row=>row.band==='K5');
    const grain=byCourse&&byGrade?'by grade group and course':byCourse?'by course':'by grade or class group';
    return {headline:byCourse?'Class size can vary by course':'Look at your child’s grade or class group',source:'classes',detail:
      `NYCPS reports this school’s class sizes ${grain} as of ${classSizeDate(classes.observedOn)}. The schoolwide pupil–teacher ratio does not tell you how many students are in a classroom.`};
  }
  return {headline:'Look at the grade your child would enter',source:'enrollment',detail:
    'The NYCPS register shows how many students are enrolled. It does not say how many places are available or how students are grouped in classrooms.'};
}
