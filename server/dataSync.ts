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
        console.log(`No survey data found for ${school.dbn}`);
        continue;
      }
      
      console.log(`Fetching snapshot data for ${school.dbn} - ${school.name}...`);
      const snapshot = await fetchSnapshotData(school.dbn);
      
      await db.update(schools)
        .set({
          student_safety: survey.studentSafety,
          student_teacher_trust: survey.studentTeacherTrust,
          student_engagement: survey.studentEngagement,
          teacher_quality: survey.teacherQuality,
          teacher_collaboration: survey.teacherCollaboration,
          teacher_leadership: survey.teacherLeadership,
          guardian_satisfaction: survey.guardianSatisfaction,
          guardian_communication: survey.guardianCommunication,
          guardian_school_trust: survey.guardianSchoolTrust,
          economic_need_index: snapshot?.economicNeedIndex,
          attendance_rate: snapshot?.attendanceRate,
          quality_rating_instruction: snapshot?.qualityRatingInstruction,
          quality_rating_safety: snapshot?.qualityRatingSafety,
          quality_rating_family: snapshot?.qualityRatingFamily,
          principal_name: snapshot?.principalName,
          website: snapshot?.website,
          phone: snapshot?.phone,
          ela_proficiency: snapshot?.elaProficiency ?? school.ela_proficiency,
          math_proficiency: snapshot?.mathProficiency ?? school.math_proficiency,
          enrollment: snapshot?.enrollment ?? school.enrollment,
          last_updated: new Date(),
        })
        .where(eq(schools.dbn, school.dbn));
      
      updated++;
      console.log(`✓ Updated ${school.dbn} (${updated}/${existingSchools.length})`);
      
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
    throw new Error(`No survey data found for ${dbn}`);
  }
  
  const snapshot = await fetchSnapshotData(dbn);
  
  const [school] = await db.select().from(schools).where(eq(schools.dbn, dbn)).limit(1);
  
  if (!school) {
    throw new Error(`School ${dbn} not found in database`);
  }
  
  await db.update(schools)
    .set({
      student_safety: survey.studentSafety,
      student_teacher_trust: survey.studentTeacherTrust,
      student_engagement: survey.studentEngagement,
      teacher_quality: survey.teacherQuality,
      teacher_collaboration: survey.teacherCollaboration,
      teacher_leadership: survey.teacherLeadership,
      guardian_satisfaction: survey.guardianSatisfaction,
      guardian_communication: survey.guardianCommunication,
      guardian_school_trust: survey.guardianSchoolTrust,
      economic_need_index: snapshot?.economicNeedIndex,
      attendance_rate: snapshot?.attendanceRate,
      quality_rating_instruction: snapshot?.qualityRatingInstruction,
      quality_rating_safety: snapshot?.qualityRatingSafety,
      quality_rating_family: snapshot?.qualityRatingFamily,
      principal_name: snapshot?.principalName,
      website: snapshot?.website,
      phone: snapshot?.phone,
      ela_proficiency: snapshot?.elaProficiency ?? school.ela_proficiency,
      math_proficiency: snapshot?.mathProficiency ?? school.math_proficiency,
      enrollment: snapshot?.enrollment ?? school.enrollment,
      last_updated: new Date(),
    })
    .where(eq(schools.dbn, dbn));
  
  console.log(`✓ Successfully synced ${dbn}`);
}
