import { db } from "./db";
import { schools } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import path from "path";
import fs from "fs";

interface SchoolSeed {
  dbn: string;
  name: string;
  district: number;
  grade_band: string;
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

async function parseSchoolsFromCSV(filePath: string): Promise<SchoolSeed[]> {
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
      
      schoolSeeds.push({
        dbn,
        name,
        district,
        grade_band,
        student_safety: parseScore(values[columnIndices.studentSafety]),
        student_teacher_trust: parseScore(values[columnIndices.studentTeacherTrust]),
        student_engagement: parseScore(values[columnIndices.studentEngagement]),
        teacher_quality: parseScore(values[columnIndices.teacherQuality]),
        teacher_collaboration: parseScore(values[columnIndices.teacherCollaboration]),
        teacher_leadership: parseScore(values[columnIndices.teacherLeadership]),
        guardian_satisfaction: parseScore(values[columnIndices.guardianSatisfaction]),
        guardian_communication: parseScore(values[columnIndices.guardianCommunication]),
        guardian_school_trust: parseScore(values[columnIndices.guardianSchoolTrust]),
      });
    } catch (error) {
      errors.push(`Row ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  if (errors.length > 0) {
    console.log(`\n⚠ Encountered ${errors.length} parsing errors (skipped invalid rows)`);
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

function calculateScoreFromSurvey(scores: (number | null)[]): number {
  const validScores = scores.filter(s => s !== null) as number[];
  if (validScores.length > 0) {
    return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
  }
  return 65;
}

async function smartImportSchools(schoolSeeds: SchoolSeed[]) {
  let newSchools = 0;
  let updatedSchools = 0;
  let skippedSchools = 0;
  let errors = 0;
  
  console.log("\nPhase 1: Inserting new schools with minimal defaults...");
  
  for (const seed of schoolSeeds) {
    try {
      const existing = await db.select().from(schools).where(eq(schools.dbn, seed.dbn)).limit(1);
      
      if (existing.length > 0) {
        const existingSchool = existing[0];
        const updates: any = {};
        
        if (seed.student_safety !== null && existingSchool.student_safety === null) updates.student_safety = seed.student_safety;
        if (seed.student_teacher_trust !== null && existingSchool.student_teacher_trust === null) updates.student_teacher_trust = seed.student_teacher_trust;
        if (seed.student_engagement !== null && existingSchool.student_engagement === null) updates.student_engagement = seed.student_engagement;
        if (seed.teacher_quality !== null && existingSchool.teacher_quality === null) updates.teacher_quality = seed.teacher_quality;
        if (seed.teacher_collaboration !== null && existingSchool.teacher_collaboration === null) updates.teacher_collaboration = seed.teacher_collaboration;
        if (seed.teacher_leadership !== null && existingSchool.teacher_leadership === null) updates.teacher_leadership = seed.teacher_leadership;
        if (seed.guardian_satisfaction !== null && existingSchool.guardian_satisfaction === null) updates.guardian_satisfaction = seed.guardian_satisfaction;
        if (seed.guardian_communication !== null && existingSchool.guardian_communication === null) updates.guardian_communication = seed.guardian_communication;
        if (seed.guardian_school_trust !== null && existingSchool.guardian_school_trust === null) updates.guardian_school_trust = seed.guardian_school_trust;
        
        if (Object.keys(updates).length > 0) {
          await db.update(schools).set(updates).where(eq(schools.dbn, seed.dbn));
          updatedSchools++;
          if (updatedSchools % 100 === 0) {
            console.log(`  Updated ${updatedSchools} existing schools with new survey data...`);
          }
        } else {
          skippedSchools++;
        }
      } else {
        const academicScore = calculateScoreFromSurvey([seed.teacher_quality, seed.student_engagement]);
        const climateScore = calculateScoreFromSurvey([seed.student_safety, seed.guardian_satisfaction]);
        const progressScore = calculateScoreFromSurvey([seed.teacher_collaboration, seed.teacher_leadership]);
        
        await db.insert(schools).values({
          dbn: seed.dbn,
          name: seed.name,
          district: seed.district,
          address: "TBD",
          grade_band: seed.grade_band,
          academics_score: academicScore,
          climate_score: climateScore,
          progress_score: progressScore,
          ela_proficiency: 50,
          math_proficiency: 50,
          enrollment: 400,
          student_teacher_ratio: 14.0,
          student_safety: seed.student_safety,
          student_teacher_trust: seed.student_teacher_trust,
          student_engagement: seed.student_engagement,
          teacher_quality: seed.teacher_quality,
          teacher_collaboration: seed.teacher_collaboration,
          teacher_leadership: seed.teacher_leadership,
          guardian_satisfaction: seed.guardian_satisfaction,
          guardian_communication: seed.guardian_communication,
          guardian_school_trust: seed.guardian_school_trust,
        });
        newSchools++;
        if (newSchools % 100 === 0) {
          console.log(`  Inserted ${newSchools} new schools...`);
        }
      }
    } catch (error) {
      errors++;
      if (errors <= 10) {
        console.error(`✗ Error processing ${seed.dbn}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }
  
  return { newSchools, updatedSchools, skippedSchools, errors };
}

async function main() {
  console.log("NYC School Smart Import");
  console.log("=======================\n");
  console.log("This import will:");
  console.log("- Add NEW schools from CSV that don't exist in database");
  console.log("- Fill NULL survey fields in existing schools");
  console.log("- PRESERVE all existing enriched data (addresses, snapshot data, etc.)");
  console.log("");
  
  const csvPath = path.join(process.cwd(), "attached_assets", "NYCPublicSchoolsAllDataLeadershipView22Nov2025_1763856012085.csv");
  
  console.log("Parsing CSV file...");
  const schoolSeeds = await parseSchoolsFromCSV(csvPath);
  console.log(`✓ Parsed ${schoolSeeds.length} schools from CSV\n`);
  
  const result = await smartImportSchools(schoolSeeds);
  
  console.log("\n=======================");
  console.log("Import Summary:");
  console.log(`- New schools added: ${result.newSchools}`);
  console.log(`- Existing schools updated (filled NULL fields): ${result.updatedSchools}`);
  console.log(`- Schools skipped (no updates needed): ${result.skippedSchools}`);
  console.log(`- Errors: ${result.errors}`);
  
  const finalCount = await db.select().from(schools);
  console.log(`\nDatabase now contains ${finalCount.length} total schools`);
  console.log("\n✓ Smart import complete!");
}

main().catch(console.error);
