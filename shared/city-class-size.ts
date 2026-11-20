export type ClassSizeBand='K5'|'MS'|'HS';
export type Counts={students:number;classes:number};
export type ClassSizeRow=Counts&{
  band:ClassSizeBand; groupName:string; department:string; program:string; minimum:string|null; maximum:string|null;
  districtStudents:number|null; districtClasses:number|null;
  previousStudents:number|null; previousClasses:number|null;
};
export type ClassSizeCaps={scope:'grade'|'course';groupName:string;eligible:number;meeting:number};
export type CityClassSizeProfile={observedOn:string;previousOn:string|null;releaseLabel:string;district:number|null;rows:ClassSizeRow[];caps:ClassSizeCaps[]};
export const CITY_CLASS_SOURCE='https://infohub.nyced.org/reports/government-reports/class-size-reports';
export const CITY_CAP_SOURCE='https://infohub.nyced.org/docs/default-source/default-document-library/fy27---table-c---2026-27-class-size-compliance-by-school.xlsx';
export const CLASS_SIZE_ARTICLE='/blog/does-falling-enrollment-mean-smaller-classes';
export function classAverage(students:number|null,classes:number|null){
  return students!=null&&classes!=null&&classes>0?(students/classes).toFixed(1):null;
}
export function classSizeGrade(group:string){
  return group==='K'?'Kindergarten':/^\d+$/.test(group)?`Grade ${group}`:group==='K-8 SC'?'Mixed grades K–8 (self-contained)':group.replace(/^Bridge - ES /,'Mixed grades ');
}
export function classSizeDate(snapshot:string){
  return new Date(snapshot+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
}
