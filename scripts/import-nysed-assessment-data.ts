import { db } from "../server/db";
import { schools, schoolHistoricalScores } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

interface AssessmentRecord {
  dbn: string;
  year: number;
  elaProf: number | null;
  mathProf: number | null;
  scienceProf: number | null;
  elaByGrade: { [grade: number]: number | null };
  mathByGrade: { [grade: number]: number | null };
  scienceByGrade: { [grade: number]: number | null };
}

const DATA_SOURCE = "NYSED";

function parsePercentage(value: string | undefined): number | null {
  if (!value || value === "s" || value === "-" || value === "No Data" || value === "N/A" || value.trim() === "") {
    return null;
  }
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  if (num <= 1 && num >= 0) {
    return Math.round(num * 100);
  }
  return Math.round(num);
}

function parseSchoolYear(yearStr: string): number {
  const match = yearStr.match(/(\d{4})-?(\d{2,4})?/);
  if (match) {
    return parseInt(match[1]);
  }
  return parseInt(yearStr);
}

async function importNYSEDData(csvPath: string, assessmentYear: string) {
  console.log(`\n📊 NYSED Assessment Data Import`);
  console.log(`================================`);
  console.log(`File: ${csvPath}`);
  console.log(`Assessment Year: ${assessmentYear}`);
  console.log(`Data Source: ${DATA_SOURCE}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    console.log(`\nExpected CSV format with columns:`);
    console.log(`  - DBN (or BEDS_CODE)`);
    console.log(`  - YEAR (e.g., "2024-25" or "2024")`);
    console.log(`  - SUBJECT (ELA, Math, Science)`);
    console.log(`  - GRADE (3, 4, 5, 6, 7, 8, or "All Grades")`);
    console.log(`  - PERCENT_PROFICIENT (or similar column)`);
    console.log(`  - SUBGROUP (should filter for "All Students")`);
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n");
  const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
  
  console.log(`\nDetected columns: ${headers.join(", ")}`);
  
  const findColumn = (possibleNames: string[]): number => {
    for (const name of possibleNames) {
      const idx = headers.findIndex(h => h.includes(name.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  
  const dbnIdx = findColumn(["dbn", "beds", "entity_cd", "school_code"]);
  const yearIdx = findColumn(["year", "school_year", "sy"]);
  const subjectIdx = findColumn(["subject", "assessment", "test"]);
  const gradeIdx = findColumn(["grade", "grade_level"]);
  const profIdx = findColumn(["proficient", "l3_l4", "level3_4", "percent_prof", "pct_prof", "%l3+l4"]);
  const subgroupIdx = findColumn(["subgroup", "category", "demographic", "student_group"]);
  
  console.log(`Column mapping - DBN: ${dbnIdx}, Year: ${yearIdx}, Subject: ${subjectIdx}, Grade: ${gradeIdx}, Proficient: ${profIdx}, Subgroup: ${subgroupIdx}`);
  
  if (dbnIdx < 0 || profIdx < 0) {
    console.error(`❌ Required columns not found. Need at least DBN and proficiency percentage columns.`);
    process.exit(1);
  }
  
  const schoolData = new Map<string, AssessmentRecord>();
  let rowsProcessed = 0;
  let rowsSkipped = 0;
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const columns = lines[i].split(",").map(c => c.trim().replace(/"/g, ""));
    let dbn = columns[dbnIdx]?.trim();
    
    if (!dbn || dbn.length < 5) {
      rowsSkipped++;
      continue;
    }
    
    if (dbn.length === 12 && !dbn.includes("-")) {
      dbn = `${dbn.slice(0, 2)}${dbn.slice(7, 8)}${dbn.slice(8, 11)}`;
    }
    
    const subgroup = subgroupIdx >= 0 ? columns[subgroupIdx]?.toLowerCase() : "all students";
    if (subgroupIdx >= 0 && !subgroup.includes("all student") && !subgroup.includes("total")) {
      rowsSkipped++;
      continue;
    }
    
    const year = yearIdx >= 0 ? parseSchoolYear(columns[yearIdx]) : parseSchoolYear(assessmentYear);
    const subject = subjectIdx >= 0 ? columns[subjectIdx]?.toLowerCase() : "";
    const gradeStr = gradeIdx >= 0 ? columns[gradeIdx]?.trim() : "";
    const profValue = parsePercentage(columns[profIdx]);
    
    if (profValue === null) {
      rowsSkipped++;
      continue;
    }
    
    let record = schoolData.get(dbn);
    if (!record) {
      record = {
        dbn,
        year,
        elaProf: null,
        mathProf: null,
        scienceProf: null,
        elaByGrade: {},
        mathByGrade: {},
        scienceByGrade: {},
      };
      schoolData.set(dbn, record);
    }
    
    const gradeNum = parseInt(gradeStr);
    const isAllGrades = gradeStr.toLowerCase().includes("all") || gradeStr === "" || isNaN(gradeNum);
    
    if (subject.includes("ela") || subject.includes("english") || subject.includes("reading")) {
      if (isAllGrades) {
        record.elaProf = profValue;
      } else if (gradeNum >= 3 && gradeNum <= 8) {
        record.elaByGrade[gradeNum] = profValue;
      }
    } else if (subject.includes("math")) {
      if (isAllGrades) {
        record.mathProf = profValue;
      } else if (gradeNum >= 3 && gradeNum <= 8) {
        record.mathByGrade[gradeNum] = profValue;
      }
    } else if (subject.includes("science") || subject.includes("sci")) {
      if (isAllGrades) {
        record.scienceProf = profValue;
      } else if (gradeNum === 5 || gradeNum === 8) {
        record.scienceByGrade[gradeNum] = profValue;
      }
    } else if (!subject) {
      record.elaProf = profValue;
    }
    
    rowsProcessed++;
  }
  
  console.log(`\n📈 Parsed ${rowsProcessed} data rows, skipped ${rowsSkipped} rows`);
  console.log(`   Found data for ${schoolData.size} unique schools`);
  
  let updatedSchools = 0;
  let notFoundSchools = 0;
  let historicalRecords = 0;
  
  for (const [dbn, data] of schoolData.entries()) {
    try {
      const existingSchool = await db.select().from(schools).where(eq(schools.dbn, dbn)).limit(1);
      
      if (existingSchool.length === 0) {
        notFoundSchools++;
        continue;
      }
      
      const updateData: Record<string, any> = {
        assessment_year: assessmentYear,
        assessment_source: DATA_SOURCE,
      };
      
      if (data.elaProf !== null) updateData.ela_proficiency = data.elaProf;
      if (data.mathProf !== null) updateData.math_proficiency = data.mathProf;
      if (data.scienceProf !== null) updateData.science_proficiency = data.scienceProf;
      
      if (data.elaByGrade[3] !== undefined) updateData.ela_grade3 = data.elaByGrade[3];
      if (data.elaByGrade[4] !== undefined) updateData.ela_grade4 = data.elaByGrade[4];
      if (data.elaByGrade[5] !== undefined) updateData.ela_grade5 = data.elaByGrade[5];
      if (data.elaByGrade[6] !== undefined) updateData.ela_grade6 = data.elaByGrade[6];
      if (data.elaByGrade[7] !== undefined) updateData.ela_grade7 = data.elaByGrade[7];
      if (data.elaByGrade[8] !== undefined) updateData.ela_grade8 = data.elaByGrade[8];
      
      if (data.mathByGrade[3] !== undefined) updateData.math_grade3 = data.mathByGrade[3];
      if (data.mathByGrade[4] !== undefined) updateData.math_grade4 = data.mathByGrade[4];
      if (data.mathByGrade[5] !== undefined) updateData.math_grade5 = data.mathByGrade[5];
      if (data.mathByGrade[6] !== undefined) updateData.math_grade6 = data.mathByGrade[6];
      if (data.mathByGrade[7] !== undefined) updateData.math_grade7 = data.mathByGrade[7];
      if (data.mathByGrade[8] !== undefined) updateData.math_grade8 = data.mathByGrade[8];
      
      if (data.scienceByGrade[5] !== undefined) updateData.science_grade5 = data.scienceByGrade[5];
      if (data.scienceByGrade[8] !== undefined) updateData.science_grade8 = data.scienceByGrade[8];
      
      await db.update(schools).set(updateData).where(eq(schools.dbn, dbn));
      updatedSchools++;
      
      const existingHistory = await db
        .select()
        .from(schoolHistoricalScores)
        .where(and(eq(schoolHistoricalScores.dbn, dbn), eq(schoolHistoricalScores.year, data.year)))
        .limit(1);
      
      if (existingHistory.length === 0) {
        await db.insert(schoolHistoricalScores).values({
          dbn,
          year: data.year,
          ela_proficiency: data.elaProf,
          math_proficiency: data.mathProf,
          science_proficiency: data.scienceProf,
          data_source: DATA_SOURCE,
          data_source_release: new Date().toISOString().split("T")[0],
        });
        historicalRecords++;
      } else {
        await db
          .update(schoolHistoricalScores)
          .set({
            ela_proficiency: data.elaProf,
            math_proficiency: data.mathProf,
            science_proficiency: data.scienceProf,
            data_source: DATA_SOURCE,
            data_source_release: new Date().toISOString().split("T")[0],
          })
          .where(and(eq(schoolHistoricalScores.dbn, dbn), eq(schoolHistoricalScores.year, data.year)));
      }
      
      if (updatedSchools % 100 === 0) {
        console.log(`   Updated ${updatedSchools} schools...`);
      }
    } catch (error) {
      console.error(`Error processing school ${dbn}:`, error);
    }
  }
  
  console.log(`\n✅ Import Complete!`);
  console.log(`   Schools updated: ${updatedSchools}`);
  console.log(`   Schools not found in DB: ${notFoundSchools}`);
  console.log(`   Historical records added/updated: ${historicalRecords}`);
  
  console.log("\nSample of updated schools (District 3):");
  const sampleSchools = await db
    .select()
    .from(schools)
    .where(eq(schools.district, 3))
    .limit(5);
  
  sampleSchools.forEach((school) => {
    console.log(`${school.dbn} | ${school.name.slice(0, 35).padEnd(35)} | ELA: ${school.ela_proficiency ?? "-"}% | Math: ${school.math_proficiency ?? "-"}% | Science: ${school.science_proficiency ?? "-"}% | Year: ${school.assessment_year ?? "-"}`);
  });
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log(`
Usage: npx tsx scripts/import-nysed-assessment-data.ts <csv_path> <assessment_year>

Examples:
  npx tsx scripts/import-nysed-assessment-data.ts /tmp/nysed_2024-25.csv "2024-25"
  npx tsx scripts/import-nysed-assessment-data.ts data/assessment_results.csv "2023-24"

Expected CSV columns (flexible matching):
  - DBN or BEDS_CODE: School identifier (will be converted to NYC DBN format)
  - YEAR: School year (e.g., "2024-25")
  - SUBJECT: ELA, Math, or Science
  - GRADE: Grade level (3-8) or "All Grades"
  - PERCENT_PROFICIENT: Proficiency percentage (0-100 or 0-1)
  - SUBGROUP: Student group (filters for "All Students")

Data Source: NYSED (New York State Education Department)
Download from: https://data.nysed.gov/downloads.php
`);
  process.exit(1);
}

const csvPath = args[0];
const assessmentYear = args[1];

importNYSEDData(csvPath, assessmentYear)
  .then(() => {
    console.log("\n✨ NYSED data import finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });
