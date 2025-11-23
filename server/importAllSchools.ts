import { db } from "./db";
import { schools } from "@shared/schema";
import { parseSurveyCSV } from "./surveyParser";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";

interface SchoolSeed {
  dbn: string;
  name: string;
  district: number;
  address: string;
  grade_band: string;
  academics_score: number;
  climate_score: number;
  progress_score: number;
  ela_proficiency: number;
  math_proficiency: number;
  enrollment: number;
  student_teacher_ratio: number;
  student_safety: number | null;
  student_teacher_trust: number | null;
  student_engagement: number | null;
  teacher_quality: number | null;
  teacher_collaboration: number | null;
  teacher_leadership: number | null;
  guardian_satisfaction: number | null;
  guardian_communication: number | null;
  guardian_school_trust: number | null;
}

function extractDistrictFromDbn(dbn: string): number {
  const districtStr = dbn.substring(0, 2);
  const district = parseInt(districtStr, 10);
  return isNaN(district) || district < 1 || district > 32 ? 1 : district;
}

function extractSchoolNameFromCSV(nameField: string): string {
  const parts = nameField.split(" - ");
  if (parts.length < 2) {
    return nameField.trim();
  }
  return parts.slice(1).join(" - ").trim();
}

function deriveGradeBandFromName(name: string): string {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes("high school") || lowerName.includes("h.s.")) {
    return "9-12";
  }
  if (lowerName.includes("middle school") || lowerName.includes("m.s.") || 
      lowerName.includes("junior high") || lowerName.includes("j.h.s.")) {
    return "6-8";
  }
  if (lowerName.includes("p.s.") || lowerName.includes("elementary") || 
      lowerName.includes("primary")) {
    return "K-5";
  }
  if (lowerName.includes("k-8")) {
    return "K-8";
  }
  
  return "K-5";
}

async function parseAllSchoolsFromCSV(filePath: string): Promise<SchoolSeed[]> {
  const schoolSeeds: SchoolSeed[] = [];
  const errors: string[] = [];
  
  const csvContent = fs.readFileSync(filePath, "utf-8");
  const lines = csvContent.split("\n");
  
  if (lines.length < 3) {
    throw new Error("CSV file is too short");
  }
  
  const headerLine = lines[1];
  const headers = parseCSVLine(headerLine);
  
  const columnIndices = {
    name: 0,
    studentSafety: headers.indexOf("Safety"),
    studentTeacherTrust: headers.indexOf("Student-Teacher Trust"),
    studentEngagement: headers.indexOf("Skills For Success"),
    teacherQuality: headers.indexOf("Strong Core Instruction"),
    teacherCollaboration: headers.indexOf("Peer Collaboration"),
    teacherLeadership: headers.indexOf("Instructional Leadership"),
    guardianSatisfaction: headers.lastIndexOf("Family Satisfaction with Child's Education"),
    guardianCommunication: headers.lastIndexOf("Outreach to Parents"),
    guardianSchoolTrust: headers.lastIndexOf("Parent-Principal Trust"),
  };
  
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const values = parseCSVLine(line);
      const nameField = values[0];
      if (!nameField) continue;
      
      const dbnMatch = nameField.match(/^([0-9]{2}[A-Z][0-9]{3})/);
      if (!dbnMatch) {
        errors.push(`Row ${i}: No valid DBN found in "${nameField}"`);
        continue;
      }
      
      const dbn = dbnMatch[1];
      const name = extractSchoolNameFromCSV(nameField);
      const district = extractDistrictFromDbn(dbn);
      const grade_band = deriveGradeBandFromName(name);
      
      const surveyScores = {
        studentSafety: parseScore(values[columnIndices.studentSafety]),
        studentTeacherTrust: parseScore(values[columnIndices.studentTeacherTrust]),
        studentEngagement: parseScore(values[columnIndices.studentEngagement]),
        teacherQuality: parseScore(values[columnIndices.teacherQuality]),
        teacherCollaboration: parseScore(values[columnIndices.teacherCollaboration]),
        teacherLeadership: parseScore(values[columnIndices.teacherLeadership]),
        guardianSatisfaction: parseScore(values[columnIndices.guardianSatisfaction]),
        guardianCommunication: parseScore(values[columnIndices.guardianCommunication]),
        guardianSchoolTrust: parseScore(values[columnIndices.guardianSchoolTrust]),
      };
      
      const academics_score = calculateDefaultAcademicScore(surveyScores);
      const climate_score = calculateDefaultClimateScore(surveyScores);
      const progress_score = calculateDefaultProgressScore(surveyScores);
      
      schoolSeeds.push({
        dbn,
        name,
        district,
        address: "Address to be updated",
        grade_band,
        academics_score,
        climate_score,
        progress_score,
        ela_proficiency: 50,
        math_proficiency: 50,
        enrollment: 400,
        student_teacher_ratio: 14.0,
        student_safety: surveyScores.studentSafety,
        student_teacher_trust: surveyScores.studentTeacherTrust,
        student_engagement: surveyScores.studentEngagement,
        teacher_quality: surveyScores.teacherQuality,
        teacher_collaboration: surveyScores.teacherCollaboration,
        teacher_leadership: surveyScores.teacherLeadership,
        guardian_satisfaction: surveyScores.guardianSatisfaction,
        guardian_communication: surveyScores.guardianCommunication,
        guardian_school_trust: surveyScores.guardianSchoolTrust,
      });
    } catch (error) {
      errors.push(`Row ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  if (errors.length > 0) {
    console.log(`\n⚠ Encountered ${errors.length} errors during parsing (first 10):`);
    errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
  }
  
  return schoolSeeds;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

function parseScore(value: string | undefined): number | null {
  if (!value || value === "" || value === "N/A") {
    return null;
  }
  const num = parseFloat(value);
  return isNaN(num) ? null : Math.round(num);
}

function calculateDefaultAcademicScore(scores: {
  teacherQuality: number | null;
  studentEngagement: number | null;
}): number {
  const validScores: number[] = [];
  if (scores.teacherQuality !== null) validScores.push(scores.teacherQuality);
  if (scores.studentEngagement !== null) validScores.push(scores.studentEngagement);
  
  if (validScores.length > 0) {
    return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
  }
  return 65;
}

function calculateDefaultClimateScore(scores: {
  studentSafety: number | null;
  guardianSatisfaction: number | null;
}): number {
  const validScores: number[] = [];
  if (scores.studentSafety !== null) validScores.push(scores.studentSafety);
  if (scores.guardianSatisfaction !== null) validScores.push(scores.guardianSatisfaction);
  
  if (validScores.length > 0) {
    return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
  }
  return 70;
}

function calculateDefaultProgressScore(scores: {
  teacherCollaboration: number | null;
  teacherLeadership: number | null;
}): number {
  const validScores: number[] = [];
  if (scores.teacherCollaboration !== null) validScores.push(scores.teacherCollaboration);
  if (scores.teacherLeadership !== null) validScores.push(scores.teacherLeadership);
  
  if (validScores.length > 0) {
    return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
  }
  return 70;
}

async function importSchoolsInBatches(schoolSeeds: SchoolSeed[], batchSize: number = 100) {
  let imported = 0;
  let updated = 0;
  let errors = 0;
  
  for (let i = 0; i < schoolSeeds.length; i += batchSize) {
    const batch = schoolSeeds.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(schoolSeeds.length / batchSize);
    
    try {
      await db.insert(schools)
        .values(batch)
        .onConflictDoUpdate({
          target: schools.dbn,
          set: {
            name: sql`excluded.name`,
            district: sql`excluded.district`,
            address: sql`excluded.address`,
            grade_band: sql`excluded.grade_band`,
            academics_score: sql`excluded.academics_score`,
            climate_score: sql`excluded.climate_score`,
            progress_score: sql`excluded.progress_score`,
            ela_proficiency: sql`excluded.ela_proficiency`,
            math_proficiency: sql`excluded.math_proficiency`,
            enrollment: sql`excluded.enrollment`,
            student_teacher_ratio: sql`excluded.student_teacher_ratio`,
            student_safety: sql`excluded.student_safety`,
            student_teacher_trust: sql`excluded.student_teacher_trust`,
            student_engagement: sql`excluded.student_engagement`,
            teacher_quality: sql`excluded.teacher_quality`,
            teacher_collaboration: sql`excluded.teacher_collaboration`,
            teacher_leadership: sql`excluded.teacher_leadership`,
            guardian_satisfaction: sql`excluded.guardian_satisfaction`,
            guardian_communication: sql`excluded.guardian_communication`,
            guardian_school_trust: sql`excluded.guardian_school_trust`,
          }
        });
      
      imported += batch.length;
      console.log(`✓ Batch ${batchNum}/${totalBatches}: Processed ${batch.length} schools (Total: ${imported}/${schoolSeeds.length})`);
    } catch (error) {
      errors += batch.length;
      console.error(`✗ Batch ${batchNum}/${totalBatches} failed:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  return { imported, errors };
}

async function main() {
  console.log("NYC School Bulk Import");
  console.log("======================\n");
  
  const csvPath = path.join(process.cwd(), "attached_assets", "NYCPublicSchoolsAllDataLeadershipView22Nov2025_1763856012085.csv");
  
  console.log("Step 1: Parsing CSV file...");
  const schoolSeeds = await parseAllSchoolsFromCSV(csvPath);
  console.log(`✓ Parsed ${schoolSeeds.length} schools from CSV\n`);
  
  console.log("Step 2: Importing schools to database in batches...");
  const result = await importSchoolsInBatches(schoolSeeds, 100);
  
  console.log("\n======================");
  console.log("Import Summary:");
  console.log(`- Total processed: ${schoolSeeds.length} schools`);
  console.log(`- Successfully imported/updated: ${result.imported} schools`);
  console.log(`- Errors: ${result.errors}`);
  console.log("\n✓ Import complete!");
  
  const finalCount = await db.select().from(schools);
  console.log(`\nDatabase now contains ${finalCount.length} total schools`);
}

main().catch(console.error);
