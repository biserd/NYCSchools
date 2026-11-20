import type { PilotData, RegisterCell } from './classroomPilot';

export const enrollmentPeriods = {
  previous:{id:'register-2025-26-audited',year:'2025–26',label:'Audited register',yearKey:'2025-26',observedOn:null,status:'audited'},
  current:{id:'register-2026-27-preliminary',year:'2026–27',label:'Oct. 31, 2026 preliminary',yearKey:'2026-27',observedOn:'2026-10-31',status:'preliminary'},
} as const;
export const enrollmentGrades = ['3K','PreK','K',...Array.from({length:12},(_,i)=>String(i+1))];
export const enrollmentMissing:RegisterCell={count:null,status:'missing'};
export type EnrollmentPair = {grade:string;previous:RegisterCell;current:RegisterCell};
export type SchoolEnrollment = {totals:EnrollmentPair[];grades:EnrollmentPair[]};
export const isEnrollmentDbn=(dbn:string)=>/^\d{2}[MXKQR]\d{3}$/.test(dbn)&&!dbn.startsWith('84');
export const enrollmentGradeName=(grade:string)=>grade==='K'?'Kindergarten':grade==='PreK'?'Pre-K':grade==='3K'?'3-K':`Grade ${grade}`;
export const hasRegisterValue=(cell:RegisterCell)=>cell.status!=='missing';
export const enrollmentChange=(p:EnrollmentPair)=>p.previous.count===null||p.current.count===null?null:p.current.count-p.previous.count;

export function makeEnrollment(pairs:EnrollmentPair[]):SchoolEnrollment|null {
  const available=pairs.filter(p=>hasRegisterValue(p.previous)||hasRegisterValue(p.current));
  if(!available.length)return null;
  const totals=['Total K-12','Total'].flatMap(grade=>available.find(p=>p.grade===grade)??[]);
  // Do not plot the source's zero-filled grade columns when the register has no students in either period.
  // A reported zero is retained for grades with a positive or suppressed count in the other period.
  const grades=enrollmentGrades.flatMap(grade=>available.find(p=>p.grade===grade&&
    ((p.previous.count??0)>0||(p.current.count??0)>0||p.previous.status==='suppressed'||p.current.status==='suppressed'))??[]);
  return totals.length||grades.length?{totals,grades}:null;
}

export function enrollmentFromPilot({school}:PilotData){
  return makeEnrollment([
    {grade:'Total K-12',previous:school.previousK12,current:school.currentK12},
    {grade:'Total',previous:school.previousTotal,current:school.currentTotal},
    ...school.grades.filter(p=>p.grade!=='K'),
    {grade:'K',previous:school.previousK,current:school.currentK},
  ]);
}
