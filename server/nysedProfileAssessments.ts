import { sql } from 'drizzle-orm';
import type { Express } from 'express';
import { db } from './db';
import { buildNysedProfileAssessments, type AssessmentRow } from '../shared/nysed-profile-assessments';

export async function getNysedProfileAssessments(dbn:string) {
  const rows=await db.all<AssessmentRow>(sql`
    SELECT f.subject, f.assessment, f.grade, f.spring_year AS year, f.definition,
      f.institution_id AS institutionId, f.beds_code AS bedsCode, r.source_url AS sourceUrl,
      r.id AS releaseId, r.released_on AS releasedOn, f.tested, f.proficient,
      f.published_percent AS publishedPercent, f.result_status AS status
    FROM school_assessment_archive_results f JOIN school_assessment_archive_releases r ON r.id=f.release_id
    WHERE f.dbn=${dbn} AND f.population='All Students'`);
  return buildNysedProfileAssessments(rows);
}

export function registerNysedProfileAssessmentRoutes(app:Express) {
  app.get('/api/schools/:dbn/nysed-assessments',async(req,res)=>{
    const dbn=String(req.params.dbn).toUpperCase();
    if(!/^\d{2}[A-Z0-9]{4}$/.test(dbn)) return res.status(400).json({message:'Invalid DBN'});
    try {
      return res.json(await getNysedProfileAssessments(dbn));
    } catch(error) {
      console.error('[NYSED_PROFILE_ASSESSMENTS]',error);
      return res.status(503).json({message:'Assessment details unavailable'});
    }
  });
}
