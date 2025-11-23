import { db } from "./db";
import { schools } from "@shared/schema";
import { parseSurveyCSV } from "./surveyParser";
import { fetchSnapshotData } from "./snapshotScraper";
import { eq } from "drizzle-orm";
import path from "path";

export async function syncSchoolData() {
  console.log("Starting school data sync...");
  
  const csvPath = path.join(process.cwd(), "attached_assets", "NYCPublicSchoolsAllDataLeadershipView22Nov2025_1763856012085.csv");
  
  console.log("Parsing survey CSV...");
  const surveyData = await parseSurveyCSV(csvPath);
  console.log(`Parsed survey data for ${surveyData.size} schools`);
  
  const existingSchools = await db.select().from(schools);
  console.log(`Found ${existingSchools.length} existing schools in database`);
  
  let updated = 0;
  let errors = 0;
  
  for (const school of existingSchools) {
    try {
      const survey = surveyData.get(school.dbn);
      
      if (!survey) {
        console.log(`⚠ No survey data found for ${school.dbn} - will still fetch snapshot data`);
      }
      
      console.log(`Fetching snapshot data for ${school.dbn} - ${school.name}...`);
      const snapshot = await fetchSnapshotData(school.dbn);
      
      const updateData: any = {
        last_updated: new Date(),
      };
      
      if (survey) {
        updateData.student_safety = survey.studentSafety;
        updateData.student_teacher_trust = survey.studentTeacherTrust;
        updateData.student_engagement = survey.studentEngagement;
        updateData.teacher_quality = survey.teacherQuality;
        updateData.teacher_collaboration = survey.teacherCollaboration;
        updateData.teacher_leadership = survey.teacherLeadership;
        updateData.guardian_satisfaction = survey.guardianSatisfaction;
        updateData.guardian_communication = survey.guardianCommunication;
        updateData.guardian_school_trust = survey.guardianSchoolTrust;
      }
      
      if (snapshot) {
        if (snapshot.economicNeedIndex !== null) updateData.economic_need_index = snapshot.economicNeedIndex;
        if (snapshot.attendanceRate !== null) updateData.attendance_rate = snapshot.attendanceRate;
        if (snapshot.qualityRatingInstruction !== null) updateData.quality_rating_instruction = snapshot.qualityRatingInstruction;
        if (snapshot.qualityRatingSafety !== null) updateData.quality_rating_safety = snapshot.qualityRatingSafety;
        if (snapshot.qualityRatingFamily !== null) updateData.quality_rating_family = snapshot.qualityRatingFamily;
        if (snapshot.principalName !== null) updateData.principal_name = snapshot.principalName;
        if (snapshot.website !== null) updateData.website = snapshot.website;
        if (snapshot.phone !== null) updateData.phone = snapshot.phone;
        if (snapshot.elaProficiency !== null) updateData.ela_proficiency = snapshot.elaProficiency;
        if (snapshot.mathProficiency !== null) updateData.math_proficiency = snapshot.mathProficiency;
        if (snapshot.enrollment !== null) updateData.enrollment = snapshot.enrollment;
      }
      
      await db.update(schools)
        .set(updateData)
        .where(eq(schools.dbn, school.dbn));
      
      updated++;
      const dataTypes = [];
      if (survey) dataTypes.push('survey');
      if (snapshot) dataTypes.push('snapshot');
      console.log(`✓ Updated ${school.dbn} with ${dataTypes.join(' + ')} data (${updated}/${existingSchools.length})`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      errors++;
      console.error(`✗ Error updating ${school.dbn}:`, error);
    }
  }
  
  console.log(`\nSync complete:`);
  console.log(`- Updated: ${updated} schools`);
  console.log(`- Errors: ${errors}`);
  console.log(`- Total processed: ${existingSchools.length} schools`);
}

export async function syncSingleSchool(dbn: string) {
  console.log(`Syncing data for school: ${dbn}`);
  
  const csvPath = path.join(process.cwd(), "attached_assets", "NYCPublicSchoolsAllDataLeadershipView22Nov2025_1763856012085.csv");
  const surveyData = await parseSurveyCSV(csvPath);
  const survey = surveyData.get(dbn);
  
  if (!survey) {
    console.log(`⚠ No survey data found for ${dbn} - will still fetch snapshot data`);
  }
  
  const snapshot = await fetchSnapshotData(dbn);
  
  const [school] = await db.select().from(schools).where(eq(schools.dbn, dbn)).limit(1);
  
  if (!school) {
    throw new Error(`School ${dbn} not found in database`);
  }
  
  const updateData: any = {
    last_updated: new Date(),
  };
  
  if (survey) {
    updateData.student_safety = survey.studentSafety;
    updateData.student_teacher_trust = survey.studentTeacherTrust;
    updateData.student_engagement = survey.studentEngagement;
    updateData.teacher_quality = survey.teacherQuality;
    updateData.teacher_collaboration = survey.teacherCollaboration;
    updateData.teacher_leadership = survey.teacherLeadership;
    updateData.guardian_satisfaction = survey.guardianSatisfaction;
    updateData.guardian_communication = survey.guardianCommunication;
    updateData.guardian_school_trust = survey.guardianSchoolTrust;
  }
  
  if (snapshot) {
    if (snapshot.economicNeedIndex !== null) updateData.economic_need_index = snapshot.economicNeedIndex;
    if (snapshot.attendanceRate !== null) updateData.attendance_rate = snapshot.attendanceRate;
    if (snapshot.qualityRatingInstruction !== null) updateData.quality_rating_instruction = snapshot.qualityRatingInstruction;
    if (snapshot.qualityRatingSafety !== null) updateData.quality_rating_safety = snapshot.qualityRatingSafety;
    if (snapshot.qualityRatingFamily !== null) updateData.quality_rating_family = snapshot.qualityRatingFamily;
    if (snapshot.principalName !== null) updateData.principal_name = snapshot.principalName;
    if (snapshot.website !== null) updateData.website = snapshot.website;
    if (snapshot.phone !== null) updateData.phone = snapshot.phone;
    if (snapshot.elaProficiency !== null) updateData.ela_proficiency = snapshot.elaProficiency;
    if (snapshot.mathProficiency !== null) updateData.math_proficiency = snapshot.mathProficiency;
    if (snapshot.enrollment !== null) updateData.enrollment = snapshot.enrollment;
  }
  
  await db.update(schools)
    .set(updateData)
    .where(eq(schools.dbn, dbn));
  
  const dataTypes = [];
  if (survey) dataTypes.push('survey');
  if (snapshot) dataTypes.push('snapshot');
  console.log(`✓ Successfully synced ${dbn} with ${dataTypes.join(' + ')} data`);
}
