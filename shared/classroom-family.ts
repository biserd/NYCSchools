import { classSizeGrade, type CityClassSizeProfile, type ClassSizeCaps, type ClassSizeRow } from './city-class-size';
import { PILOT_SCHOOL, type PilotData } from './classroomPilot';
import { enrollmentChange, enrollmentPeriods, type EnrollmentPair, type SchoolEnrollment } from './school-enrollment';

const isGrade = (value:string) => /^(?:K|[1-5])$/.test(value);
const gradeOrder = (value:string) => value === 'K' ? 0 : Number(value);
const integer = (value:number) => Number.isSafeInteger(value) && value > 0;
const reported = (pair:EnrollmentPair) => [pair.previous,pair.current].every(
  cell => cell.status === 'reported' && cell.count !== null && integer(cell.count),
);
const programKey = (label:string) => label.trim().toLowerCase().replace(/[^a-z]/g,'');
const numericBound = (value:string|null) => value && /^\d+$/.test(value) && integer(Number(value)) ? Number(value) : null;

export type ClassroomTakeaway = {
  grade:string;
  observedOn:string;
  enrollment:{grade:EnrollmentPair;total:EnrollmentPair}|null;
  range:{min:number;max:number;classes:number;program:string}|null;
  cap:ClassSizeCaps|null;
  distribution:{size:number;program:string}[];
  benchmark:{school:number;district:number;districtNumber:number}|null;
};

export function classroomTakeawayHeadline(data:ClassroomTakeaway) {
  const label=classSizeGrade(data.grade);
  const grade=data.grade==='K'?'kindergarten':label;
  if (data.enrollment) {
    const gradeUp=data.enrollment.grade.current.count!>data.enrollment.grade.previous.count!;
    return data.grade==='K'&&gradeUp
      ? 'A smaller school, a bigger kindergarten'
      : `${label} enrollment moved differently from the school total`;
  }
  if (data.distribution.length || data.range) return `Class sizes varied in ${grade}`;
  return `Not all reported ${grade} classes met the cap`;
}

function pilotProgramRow(rows:ClassSizeRow[],program:string){
  return rows.filter(row=>programKey(row.program)===(program==='Gen Ed'?'generaleducation':'integratedcoteaching')||
    programKey(row.program)===programKey(program));
}

// The pilot is the only release here with individual classroom size frequencies.
// Show those bins only if every program reconciles back to the same citywide snapshot.
function exactPilotClasses(dbn:string,grade:string,date:string,rows:ClassSizeRow[],pilot?:PilotData|null){
  const distribution=pilot?.school.distribution;
  if(dbn!==PILOT_SCHOOL||grade!=='K'||date!==enrollmentPeriods.current.observedOn||!distribution?.length)return [];
  if(!distribution.every(row=>row.size!==null&&integer(row.size)&&integer(row.classes)&&row.size*row.classes===row.students))return [];
  for(const program of new Set(distribution.map(row=>row.program))){
    const row=pilotProgramRow(rows,program);
    const bins=distribution.filter(r=>r.program===program);
    if(row.length!==1||bins.reduce((n,r)=>n+r.students,0)!==row[0].students||bins.reduce((n,r)=>n+r.classes,0)!==row[0].classes)return [];
  }
  return distribution.flatMap(row=>Array.from({length:row.classes},()=>({size:row.size!,program:row.program})))
    .sort((a,b)=>a.size-b.size||a.program.localeCompare(b.program));
}

function exactPilotBenchmark(rows:ClassSizeRow[],distribution:ClassroomTakeaway['distribution'],data:CityClassSizeProfile,pilot?:PilotData|null){
  if(!pilot||!distribution.length||data.district!==2)return null;
  const included=[...new Set(distribution.map(row=>row.program))].map(label=>pilotProgramRow(rows,label)[0]);
  if(!included.every(row=>row.districtStudents!==null&&integer(row.districtStudents)&&row.districtClasses!==null&&integer(row.districtClasses)))return null;
  const districtStudents=included.reduce((count,row)=>count+row.districtStudents!,0);
  const districtClasses=included.reduce((count,row)=>count+row.districtClasses!,0);
  if(districtStudents!==pilot.district.students||districtClasses!==pilot.district.classes)return null;
  return {school:distribution.reduce((count,row)=>count+row.size,0)/distribution.length,
    district:districtStudents/districtClasses,districtNumber:data.district};
}

export function getClassroomTakeaway(dbn:string,data?:CityClassSizeProfile|null,register?:SchoolEnrollment|null,pilot?:PilotData|null):ClassroomTakeaway|null{
  if(!data)return null;
  const total=register?.totals.find(pair=>pair.grade==='Total K-12');
  const totalChange=total&&reported(total)?enrollmentChange(total):null;
  const rows=data.rows.filter(row=>row.band==='K5'&&isGrade(row.groupName)&&integer(row.classes)&&integer(row.students));
  const grades=[...new Set(rows.map(row=>row.groupName))].sort((a,b)=>gradeOrder(a)-gradeOrder(b));
  let fallback:ClassroomTakeaway|null=null;
  for(const grade of grades){
    const gradeRows=rows.filter(row=>row.groupName===grade);
    const pair=register?.grades.find(row=>row.grade===grade);
    const gradeChange=pair&&reported(pair)?enrollmentChange(pair):null;
    const enrollment=data.observedOn===enrollmentPeriods.current.observedOn&&total&&pair&&totalChange&&gradeChange&&
      Math.sign(totalChange)!==Math.sign(gradeChange)&&pair.previous.count!<total.previous.count!&&pair.current.count!<total.current.count!
      ?{grade:pair,total}:null;
    const ranges=gradeRows.flatMap(row=>{
      const min=numericBound(row.minimum),max=numericBound(row.maximum);
      return min!==null&&max!==null&&min<max&&row.classes>1&&row.students>=min*row.classes&&row.students<=max*row.classes
        ?[{min,max,classes:row.classes,program:row.program}]:[];
    }).sort((a,b)=>b.classes-a.classes||a.program.localeCompare(b.program));
    const caps=data.caps.filter(row=>row.scope==='grade'&&row.groupName===grade);
    const cap=caps.length===1&&integer(caps[0].eligible)&&Number.isSafeInteger(caps[0].meeting)&&
      caps[0].meeting>=0&&caps[0].meeting<=caps[0].eligible?caps[0]:null;
    const distribution=exactPilotClasses(dbn,grade,data.observedOn,gradeRows,pilot);
    const benchmark=exactPilotBenchmark(gradeRows,distribution,data,pilot);
    const range=ranges[0]??null;
    const takeaway={grade,observedOn:data.observedOn,enrollment,range,cap,distribution,benchmark};
    if(enrollment||distribution.length)return takeaway;
    if(!fallback&&(range||cap&&cap.meeting<cap.eligible))fallback=takeaway;
  }
  return fallback;
}
