import { sql } from 'drizzle-orm';
import type { Express } from 'express';
import { db } from './db';
import { buildNysedProfileAssessments, type AssessmentRow } from '../shared/nysed-profile-assessments';

export async function getNysedProfileAssessments(dbn:string) {
  const rows=await db.all<AssessmentRow>(sql`
    SELECT f.subject, f.assessment, f.grade, f.spring_year AS year, f.definition,
      f.institution_id AS institutionId, f.beds_code AS bedsCode, r.source_url AS sourceUrl,
      r.id AS releaseId, r.released_on AS releasedOn, f.tested, f.proficient,
      f.published_percent AS publishedPercent, f.result_status AS status,
      d.district AS districtNumber, d.tested AS districtTested, d.proficient AS districtProficient
    FROM school_assessment_archive_results f JOIN school_assessment_archive_releases r ON r.id=f.release_id
    LEFT JOIN school_assessment_archive_district_science d ON f.subject='science'
      AND d.release_id=f.release_id AND d.spring_year=f.spring_year AND d.assessment=f.assessment
      AND d.population=f.population AND d.definition=f.definition
      -- Compare only a district-operated school identified in that same geographic district.
      AND substr(f.beds_code,7,2)='01' AND d.beds_code=substr(f.beds_code,1,8)||'0000'
      AND d.district=CAST(substr(f.dbn,1,2) AS INTEGER)
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
