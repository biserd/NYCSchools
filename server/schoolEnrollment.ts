import type { Express } from 'express';
import { classroomPreviewEnabled,readClassroomD1,type PilotRead } from './classroomPilot';
import type { RegisterCell } from '../shared/classroomPilot';
import { enrollmentGrades,enrollmentMissing,enrollmentPeriods,isEnrollmentDbn,makeEnrollment,type SchoolEnrollment } from '../shared/school-enrollment';
import { requireSchoolResearchAccess } from './schoolResearchAccess';

const {previous,current}=enrollmentPeriods;
const registerParams=(dbn:string)=>[dbn,previous.id,previous.yearKey,current.id,current.yearKey,current.observedOn];
const registerScope=`FROM classroom_pilot_register r
  INNER JOIN schools s ON s.dbn=r.dbn
  INNER JOIN classroom_pilot_releases p ON p.id=r.release_id
  WHERE r.dbn=? AND p.dataset='register' AND
    ((p.id=? AND p.status='audited' AND p.school_year=? AND p.observed_on IS NULL) OR
     (p.id=? AND p.status='preliminary' AND p.school_year=? AND p.observed_on=?))`;

export async function hasSchoolEnrollment(dbn:string,read:PilotRead=readClassroomD1) {
  if (!isEnrollmentDbn(dbn)) return false;
  const grades = enrollmentGrades.map(() => '?').join(',');
  const rows=await read<{found:number}>(`SELECT 1 AS found ${registerScope} AND (
    (r.grade IN ('Total K-12','Total') AND r.value_status!='missing') OR
    (r.grade IN (${grades}) AND (r.enrolled>0 OR r.value_status='suppressed'))) LIMIT 1`,
    [...registerParams(dbn),...enrollmentGrades]);
  return rows.length>0;
}

export async function loadSchoolEnrollment(dbn:string,read:PilotRead=readClassroomD1):Promise<SchoolEnrollment|null> {
  if(!isEnrollmentDbn(dbn))return null;
  const rows=await read<RegisterCell&{grade:string;releaseId:string}>(`SELECT r.grade,r.release_id AS releaseId,
      r.enrolled AS count,r.value_status AS status ${registerScope}`,registerParams(dbn));
  const cells=new Map(rows.map(({grade,releaseId,count,status})=>[grade+'|'+releaseId,{count,status}]));
  return makeEnrollment(['Total K-12','Total',...enrollmentGrades].map(grade=>({grade,
    previous:cells.get(grade+'|'+previous.id)??enrollmentMissing,current:cells.get(grade+'|'+current.id)??enrollmentMissing,
  })));
}

export function registerSchoolEnrollmentRoutes(app:Express){
  app.get('/api/schools/:dbn/enrollment-snapshots',requireSchoolResearchAccess,async(req,res)=>{
    if(!classroomPreviewEnabled())return res.json(null);
    const dbn=String(req.params.dbn).toUpperCase();
    if(!/^\d{2}[A-Z]\d{3}$/.test(dbn))return res.status(400).json({message:'Invalid school code'});
    try{
      return res.json(await loadSchoolEnrollment(dbn));
    }catch(error){
      console.error('[SCHOOL_ENROLLMENT]',error);
      return res.status(503).json({message:'Enrollment temporarily unavailable'});
    }
  });
}
