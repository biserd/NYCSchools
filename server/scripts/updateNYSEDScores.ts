/**
 * NYSED Data Update Script
 * 
 * Updates school_historical_scores table with the latest ELA/Math proficiency data
 * from NYSED State Report Card (SRC) database.
 * 
 * Data source: https://data.nysed.gov/files/essa/24-25/SRC2025.zip
 * Release date: December 3, 2025
 * 
 * Usage:
 *   npx tsx server/scripts/updateNYSEDScores.ts
 */

import { db } from "../db";
import { schoolHistoricalScores, schools } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const DATA_SOURCE_RELEASE = "2025-12-03";
const NYSED_DATA_DIR = "/tmp/nysed";

interface NYSEDRecord {
  entityCode: string; // BEDS code like "310100010015"
  dbn: string; // Converted DBN like "01M015"
  year: number;
  elaProficiency: number | null;
  mathProficiency: number | null;
  elaTested: number | null;
  elaEligible: number | null;
  mathTested: number | null;
  mathEligible: number | null;
}

// Convert NYSED BEDS code to NYC DOE DBN format
// BEDS: 310100010015 -> DBN: 01M015
// BEDS format: 3101 (NYC) + 00 (district) + 01 (borough) + 0015 (school)
// DBN format: 01 (district) + M (borough letter) + 015 (school)
function bedsCodeToDbn(bedsCode: string): string | null {
  // Only process NYC schools (start with 31)
  if (!bedsCode.startsWith("31")) return null;
  
  // Extract parts from BEDS code
  // Format: 31 01 00 01 0015
  //         ^^ NYC prefix
  //            ^^ district (01-32)
  //               ^^ always 00
  //                  ^^ borough code (01=M, 02=X, 03=K, 04=Q, 05=R)
  //                     ^^^^ school number
  
  const district = bedsCode.substring(2, 4);
  const boroughCode = bedsCode.substring(6, 8);
  const schoolNum = bedsCode.substring(8, 12);
  
  // Convert borough code to letter
  const boroughMap: Record<string, string> = {
    "01": "M", // Manhattan
    "02": "X", // Bronx
    "03": "K", // Brooklyn
    "04": "Q", // Queens
    "05": "R", // Staten Island
  };
  
  const boroughLetter = boroughMap[boroughCode];
  if (!boroughLetter) return null;
  
  // Remove leading zeros from school number but keep at least 3 digits
  const schoolNumClean = schoolNum.replace(/^0+/, "").padStart(3, "0");
  
  return `${district}${boroughLetter}${schoolNumClean}`;
}

// Parse a CSV line respecting quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.replace(/^"|"$/g, ""));
  
  return result;
}

// Parse NYSED ELA/Math CSV files
function parseNYSEDData(elaPath: string, mathPath: string): Map<string, NYSEDRecord> {
  const records = new Map<string, NYSEDRecord>();
  
  // Parse ELA data
  const elaContent = fs.readFileSync(elaPath, "utf-8");
  const elaLines = elaContent.split("\n");
  const elaHeaders = parseCSVLine(elaLines[0]).map(header => header.toUpperCase());
  const elaTestedIndex = elaHeaders.findIndex(header => ["TOTAL_TESTED", "NUM_TESTED", "NUMBER_TESTED"].includes(header));
  const elaEligibleIndex = elaHeaders.findIndex(header => ["TOTAL_ENROLLED", "NUM_ENROLLED", "NUMBER_ENROLLED", "ELIGIBLE_COUNT"].includes(header));
  
  console.log(`Parsing ELA data from ${elaPath}...`);
  
  for (let i = 1; i < elaLines.length; i++) { // Skip header
    const line = elaLines[i].trim();
    if (!line) continue;
    
    const fields = parseCSVLine(line);
    const entityCode = fields[1]?.replace(/"/g, "");
    const year = parseInt(fields[3], 10);
    const assessmentName = fields[4]?.replace(/"/g, "");
    const subgroup = fields[5]?.replace(/"/g, "");
    // ELA columns: ... LEVEL4_%TESTED(18), NUM_PROF(19), PER_PROF(20), ...
    const perProf = fields[20]?.replace(/"/g, "");
    const tested = elaTestedIndex >= 0 ? parseInt(fields[elaTestedIndex], 10) : NaN;
    const eligible = elaEligibleIndex >= 0 ? parseInt(fields[elaEligibleIndex], 10) : NaN;
    
    // Only process NYC schools (31*), 2024-2025 data, ELA3_8, All Students
    if (!entityCode?.startsWith("31")) continue;
    if (year !== 2024 && year !== 2025) continue;
    if (assessmentName !== "ELA3_8") continue;
    if (subgroup !== "All Students") continue;
    
    const dbn = bedsCodeToDbn(entityCode);
    if (!dbn) continue;
    
    const key = `${dbn}-${year}`;
    const elaProficiency = perProf && perProf !== "s" ? parseInt(perProf, 10) : null;
    
    if (!records.has(key)) {
      records.set(key, {
        entityCode,
        dbn,
        year,
        elaProficiency,
        mathProficiency: null,
        elaTested: Number.isFinite(tested) ? tested : null,
        elaEligible: Number.isFinite(eligible) ? eligible : null,
        mathTested: null,
        mathEligible: null,
      });
    } else {
      records.get(key)!.elaProficiency = elaProficiency;
      records.get(key)!.elaTested = Number.isFinite(tested) ? tested : null;
      records.get(key)!.elaEligible = Number.isFinite(eligible) ? eligible : null;
    }
  }
  
  console.log(`Found ${records.size} ELA records for NYC schools`);
  
  // Parse Math data
  const mathContent = fs.readFileSync(mathPath, "utf-8");
  const mathLines = mathContent.split("\n");
  const mathHeaders = parseCSVLine(mathLines[0]).map(header => header.toUpperCase());
  const mathTestedIndex = mathHeaders.findIndex(header => ["TOTAL_TESTED", "NUM_TESTED", "NUMBER_TESTED"].includes(header));
  const mathEligibleIndex = mathHeaders.findIndex(header => ["TOTAL_ENROLLED", "NUM_ENROLLED", "NUMBER_ENROLLED", "ELIGIBLE_COUNT"].includes(header));
  
  console.log(`Parsing Math data from ${mathPath}...`);
  
  let mathRecordsAdded = 0;
  for (let i = 1; i < mathLines.length; i++) {
    const line = mathLines[i].trim();
    if (!line) continue;
    
    const fields = parseCSVLine(line);
    const entityCode = fields[1]?.replace(/"/g, "");
    const year = parseInt(fields[3], 10);
    const assessmentName = fields[4]?.replace(/"/g, "");
    const subgroup = fields[5]?.replace(/"/g, "");
    // Math CSV has 2 extra columns (LEVEL5_COUNT, LEVEL5_%TESTED), so PER_PROF is at index 22
    const perProf = fields[22]?.replace(/"/g, "");
    const tested = mathTestedIndex >= 0 ? parseInt(fields[mathTestedIndex], 10) : NaN;
    const eligible = mathEligibleIndex >= 0 ? parseInt(fields[mathEligibleIndex], 10) : NaN;
    
    // Only process NYC schools (31*), 2024-2025 data, MATH3_8, All Students
    if (!entityCode?.startsWith("31")) continue;
    if (year !== 2024 && year !== 2025) continue;
    if (assessmentName !== "MATH3_8") continue;
    if (subgroup !== "All Students") continue;
    
    const dbn = bedsCodeToDbn(entityCode);
    if (!dbn) continue;
    
    const key = `${dbn}-${year}`;
    const mathProficiency = perProf && perProf !== "s" ? parseInt(perProf, 10) : null;
    
    if (records.has(key)) {
      records.get(key)!.mathProficiency = mathProficiency;
      records.get(key)!.mathTested = Number.isFinite(tested) ? tested : null;
      records.get(key)!.mathEligible = Number.isFinite(eligible) ? eligible : null;
      mathRecordsAdded++;
    } else {
      records.set(key, {
        entityCode,
        dbn,
        year,
        elaProficiency: null,
        mathProficiency,
        elaTested: null,
        elaEligible: null,
        mathTested: Number.isFinite(tested) ? tested : null,
        mathEligible: Number.isFinite(eligible) ? eligible : null,
      });
    }
  }
  
  console.log(`Added Math data to ${mathRecordsAdded} records`);
  console.log(`Total records: ${records.size}`);
  
  return records;
}

async function updateHistoricalScores(records: Map<string, NYSEDRecord>) {
  // Get all existing schools from our database
  const existingSchools = await db.select({ dbn: schools.dbn }).from(schools);
  const schoolDbns = new Set(existingSchools.map(s => s.dbn.toUpperCase()));
  
  console.log(`Found ${schoolDbns.size} schools in database`);
  
  let updated = 0;
  let inserted = 0;
  let skipped = 0;
  
  for (const [key, record] of Array.from(records.entries())) {
    const dbnUpper = record.dbn.toUpperCase();
    
    // Only process schools that exist in our database
    if (!schoolDbns.has(dbnUpper)) {
      skipped++;
      continue;
    }
    
    // Check if record already exists
    const existing = await db
      .select()
      .from(schoolHistoricalScores)
      .where(
        and(
          eq(schoolHistoricalScores.dbn, dbnUpper),
          eq(schoolHistoricalScores.year, record.year)
        )
      );
    
    if (existing.length > 0) {
      // Update existing record
      await db
        .update(schoolHistoricalScores)
        .set({
          ela_proficiency: record.elaProficiency,
          math_proficiency: record.mathProficiency,
           ela_tested_count: record.elaTested,
           ela_eligible_count: record.elaEligible,
           ela_participation_rate: record.elaTested != null && record.elaEligible ? Math.round(100 * record.elaTested / record.elaEligible) : null,
           math_tested_count: record.mathTested,
           math_eligible_count: record.mathEligible,
           math_participation_rate: record.mathTested != null && record.mathEligible ? Math.round(100 * record.mathTested / record.mathEligible) : null,
          data_source_release: DATA_SOURCE_RELEASE,
        })
        .where(
          and(
            eq(schoolHistoricalScores.dbn, dbnUpper),
            eq(schoolHistoricalScores.year, record.year)
          )
        );
      updated++;
    } else {
      // Insert new record
      await db.insert(schoolHistoricalScores).values({
        dbn: dbnUpper,
        year: record.year,
        ela_proficiency: record.elaProficiency,
        math_proficiency: record.mathProficiency,
        ela_tested_count: record.elaTested,
        ela_eligible_count: record.elaEligible,
        ela_participation_rate: record.elaTested != null && record.elaEligible ? Math.round(100 * record.elaTested / record.elaEligible) : null,
        math_tested_count: record.mathTested,
        math_eligible_count: record.mathEligible,
        math_participation_rate: record.mathTested != null && record.mathEligible ? Math.round(100 * record.mathTested / record.mathEligible) : null,
        data_source_release: DATA_SOURCE_RELEASE,
      });
      inserted++;
    }
    
    if ((updated + inserted) % 100 === 0) {
      console.log(`Progress: ${updated} updated, ${inserted} inserted, ${skipped} skipped`);
    }
  }
  
  console.log(`\nFinal: ${updated} updated, ${inserted} inserted, ${skipped} skipped (not in DB)`);
}

async function updateCurrentSchoolScores() {
  // Update the schools table with the latest (2025) scores
  console.log("\nUpdating current school scores from 2025 data...");
  
  const latestScores = await db
    .select()
    .from(schoolHistoricalScores)
    .where(eq(schoolHistoricalScores.year, 2025));
  
  let schoolsUpdated = 0;
  
  for (const score of latestScores) {
    if (score.ela_proficiency !== null || score.math_proficiency !== null) {
      await db
        .update(schools)
        .set({
          ela_proficiency: score.ela_proficiency ?? undefined,
          math_proficiency: score.math_proficiency ?? undefined,
           ela_tested_count: score.ela_tested_count,
           ela_eligible_count: score.ela_eligible_count,
           ela_participation_rate: score.ela_participation_rate,
           math_tested_count: score.math_tested_count,
           math_eligible_count: score.math_eligible_count,
           math_participation_rate: score.math_participation_rate,
           ...(score.ela_proficiency != null && score.math_proficiency != null
             ? { academics_score: Math.round((score.ela_proficiency + score.math_proficiency) / 2) }
             : {}),
           assessment_year: "2024-25",
           assessment_source: "NYSED",
          last_updated: new Date(),
        })
        .where(eq(schools.dbn, score.dbn));
      schoolsUpdated++;
    }
  }
  
  console.log(`Updated ${schoolsUpdated} schools with latest 2025 scores`);
}

async function main() {
  console.log("=== NYSED Data Update Script ===");
  console.log(`Data source release: ${DATA_SOURCE_RELEASE}`);
  console.log("");
  
  const elaPath = path.join(NYSED_DATA_DIR, "ela_all.csv");
  const mathPath = path.join(NYSED_DATA_DIR, "math_all.csv");
  
  if (!fs.existsSync(elaPath) || !fs.existsSync(mathPath)) {
    console.error("Error: CSV files not found. Please run the NYSED export first:");
    console.error("  cd /tmp/nysed");
    console.error('  mdb-export SRC2025_Group1.mdb "Annual EM ELA" > ela_all.csv');
    console.error('  mdb-export SRC2025_Group1.mdb "Annual EM MATH" > math_all.csv');
    process.exit(1);
  }
  
  // Parse NYSED data
  const records = parseNYSEDData(elaPath, mathPath);
  
  // Update database
  await updateHistoricalScores(records);
  
  // Update current school scores
  await updateCurrentSchoolScores();
  
  console.log("\n=== Update complete ===");
}

main().catch(console.error);
