import type { Express } from 'express';
import { PILOT_SCHOOL } from '../shared/classroomPilot';
import { getClassroomTakeaway } from '../shared/classroom-family';
import { publicClassroomTeaser,type SchoolClassroomPanel } from '../shared/classroom-panel';
import { cityClassSizesEnabled,loadCityClassSizes } from './cityClassSizes';
import { classroomPreviewEnabled,loadClassroomPilot } from './classroomPilot';
import { loadSchoolEnrollment } from './schoolEnrollment';
import { hasSchoolResearchAccess } from './schoolResearchAccess';

export async function getSchoolClassroomPanel(dbn:string,entitled:boolean):Promise<SchoolClassroomPanel> {
  const enrollmentEnabled=classroomPreviewEnabled();
  const [classes,register]=await Promise.all([
    cityClassSizesEnabled() ? loadCityClassSizes(dbn) : null,
    enrollmentEnabled ? loadSchoolEnrollment(dbn) : null,
  ]);
  if (!classes && !register) return {state:'unavailable'};
  if (!entitled) {
    const takeaway=getClassroomTakeaway(dbn,classes,register);
    return {state:'locked',coverage:{classSizes:!!classes,enrollment:!!register},teaser:publicClassroomTeaser(takeaway,classes)};
  }
  const pilot=classes && enrollmentEnabled && dbn===PILOT_SCHOOL
    ? await loadClassroomPilot().catch(error=>{console.error('[SCHOOL_CLASSROOM_PILOT]',error);return null;})
    : null;
  const takeaway=getClassroomTakeaway(dbn,classes,register,pilot);
  return {state:'unlocked',classes,register,takeaway,teaser:publicClassroomTeaser(takeaway,classes)};
}

export function registerSchoolClassroomPanelRoutes(app:Express) {
  app.get('/api/schools/:dbn/classroom-panel',async(req,res)=>{
    res.set('Cache-Control','private, no-store').vary('Cookie');
    const dbn=String(req.params.dbn).toUpperCase();
    if (!/^\d{2}[A-Z]\d{3}$/.test(dbn)) return res.status(400).json({message:'Invalid school code'});
    try {
      const entitled=await hasSchoolResearchAccess(req.session?.userId);
      return res.json(await getSchoolClassroomPanel(dbn,entitled));
    } catch (error) {
      console.error('[SCHOOL_CLASSROOM_PANEL]',error);
      return res.status(503).json({message:'Classroom data is temporarily unavailable.'});
    }
  });
}
