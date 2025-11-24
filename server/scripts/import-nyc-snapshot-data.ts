/**
 * NYC DOE Snapshot Data Import Script
 * 
 * This script fetches school data from NYC Open Data Portal and populates
 * snapshot fields in the schools database table.
 * 
 * Data Sources:
 * - School Quality Reports (dnpx-dfnc): Quality ratings, attendance, teacher experience
 * - Demographic Snapshot (c7ru-d68s): Economic need, ELL %, IEP %, contact info
 * 
 * Features:
 * - Handles pagination for large datasets
 * - Batch updates for efficiency
 * - Progress logging every 100 schools
 * - Graceful error handling
 * - Preserves existing school data
 * 
 * Usage:
 *   tsx server/scripts/import-nyc-snapshot-data.ts
 * 
 * Fields Updated:
 * - economic_need_index, ell_percent, iep_percent
 * - attendance_rate, teacher_attendance_rate
 * - quality_rating_instruction, quality_rating_safety, quality_rating_family
 * - next_level_readiness, admission_method, accountability_status
 * - principal_name, principal_experience_years, teacher_experience_percent
 * - website, phone
 */

import { db } from "../db";
import { schools, type School } from "@shared/schema";
import { storage } from "../storage";
import { eq } from "drizzle-orm";

// NYC Open Data API base URLs
const SCHOOL_QUALITY_API = "https://data.cityofnewyork.us/resource/dnpx-dfnc.json";
const DEMOGRAPHIC_API = "https://data.cityofnewyork.us/resource/c7ru-d68s.json";

interface SchoolQualityRecord {
  dbn: string;
  school_name?: string;
  report_year?: string;
  metric_category?: string;
  metric_variable_name?: string;
  metric_value?: string;
  rating_category?: string;
  rating_text?: string;
}

interface DemographicRecord {
  dbn: string;
  school_name?: string;
  year?: string;
  economic_need_index?: string;
  percent_ell?: string;
  percent_swd?: string;
  asian_1?: string;
  black_1?: string;
  hispanic_1?: string;
  white_1?: string;
  multi_racial_1?: string;
  principal_name?: string;
  website?: string;
  phone?: string;
  admission_method?: string;
  accountability_status?: string;
}

// Fetch data with pagination from NYC Open Data Portal
async function fetchWithPagination<T>(
  baseUrl: string, 
  whereClause: string, 
  limit = 50000
): Promise<T[]> {
  const allRecords: T[] = [];
  let offset = 0;
  let hasMore = true;

  console.log(`Fetching from ${baseUrl}...`);

  while (hasMore) {
    try {
      const url = `${baseUrl}?$where=${encodeURIComponent(whereClause)}&$limit=${limit}&$offset=${offset}`;
      console.log(`  Fetching records ${offset} to ${offset + limit}...`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`API request failed: ${response.status} ${response.statusText}`);
        break;
      }

      const records = await response.json() as T[];
      
      if (records.length === 0) {
        hasMore = false;
      } else {
        allRecords.push(...records);
        offset += records.length;
        
        if (records.length < limit) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error(`Error fetching data at offset ${offset}:`, error);
      hasMore = false;
    }
  }

  console.log(`  Total records fetched: ${allRecords.length}`);
  return allRecords;
}

// Fetch School Quality Reports data
async function fetchSchoolQualityData(): Promise<Map<string, Partial<School>>> {
  console.log("\n📊 Fetching School Quality Reports data...");
  
  const records = await fetchWithPagination<SchoolQualityRecord>(
    SCHOOL_QUALITY_API,
    "report_year='2024' OR report_year='2023'"
  );

  const schoolData = new Map<string, Partial<School>>();

  for (const record of records) {
    if (!record.dbn) continue;

    const dbn = record.dbn.trim();
    if (!schoolData.has(dbn)) {
      schoolData.set(dbn, {});
    }

    const school = schoolData.get(dbn)!;
    const metricName = record.metric_variable_name?.toLowerCase() || "";
    const metricValue = record.metric_value;
    const ratingText = record.rating_text;

    // Map attendance rates
    if (metricName.includes("student") && metricName.includes("attendance")) {
      const value = parseFloat(metricValue || "0");
      if (!isNaN(value)) {
        school.attendance_rate = Math.round(value);
      }
    }

    if (metricName.includes("teacher") && metricName.includes("attendance")) {
      const value = parseFloat(metricValue || "0");
      if (!isNaN(value)) {
        school.teacher_attendance_rate = Math.round(value);
      }
    }

    // Map quality ratings
    if (record.rating_category) {
      const category = record.rating_category.toLowerCase();
      
      if (category.includes("instruction") || category.includes("rigorous")) {
        school.quality_rating_instruction = ratingText || metricValue;
      }
      
      if (category.includes("safety") || category.includes("supportive")) {
        school.quality_rating_safety = ratingText || metricValue;
      }
      
      if (category.includes("family") || category.includes("community")) {
        school.quality_rating_family = ratingText || metricValue;
      }
    }

    // Map next level readiness
    if (metricName.includes("6th grade") || metricName.includes("next level")) {
      const value = parseFloat(metricValue || "0");
      if (!isNaN(value)) {
        school.next_level_readiness = Math.round(value);
      }
    }

    // Map teacher experience
    if (metricName.includes("teacher") && metricName.includes("experience")) {
      const value = parseFloat(metricValue || "0");
      if (!isNaN(value)) {
        school.teacher_experience_percent = Math.round(value);
      }
    }

    // Map principal experience
    if (metricName.includes("principal") && metricName.includes("year")) {
      const value = parseFloat(metricValue || "0");
      if (!isNaN(value)) {
        school.principal_experience_years = value;
      }
    }
  }

  console.log(`  Processed quality data for ${schoolData.size} schools`);
  return schoolData;
}

// Fetch Demographic Snapshot data
async function fetchDemographicData(): Promise<Map<string, Partial<School>>> {
  console.log("\n📈 Fetching Demographic Snapshot data...");
  
  const records = await fetchWithPagination<DemographicRecord>(
    DEMOGRAPHIC_API,
    "year='2021-22' OR year='2022-23'"
  );

  const schoolData = new Map<string, Partial<School>>();

  for (const record of records) {
    if (!record.dbn) continue;

    const dbn = record.dbn.trim();
    
    const school: Partial<School> = {};

    // Economic need index (convert from decimal to 0-100)
    if (record.economic_need_index) {
      const value = parseFloat(record.economic_need_index);
      if (!isNaN(value)) {
        // If value is between 0-1, multiply by 100
        school.economic_need_index = value <= 1 
          ? Math.round(value * 100) 
          : Math.round(value);
      }
    }

    // ELL percentage
    if (record.percent_ell) {
      const value = parseFloat(record.percent_ell);
      if (!isNaN(value)) {
        school.ell_percent = value <= 1 
          ? Math.round(value * 100) 
          : Math.round(value);
      }
    }

    // Students with disabilities percentage
    if (record.percent_swd) {
      const value = parseFloat(record.percent_swd);
      if (!isNaN(value)) {
        school.iep_percent = value <= 1 
          ? Math.round(value * 100) 
          : Math.round(value);
      }
    }

    // Race/Ethnicity Demographics (convert from decimal to 0-100)
    if (record.asian_1) {
      const value = parseFloat(record.asian_1);
      if (!isNaN(value)) {
        school.asian_percent = value <= 1 
          ? Math.round(value * 100) 
          : Math.round(value);
      }
    }

    if (record.black_1) {
      const value = parseFloat(record.black_1);
      if (!isNaN(value)) {
        school.black_percent = value <= 1 
          ? Math.round(value * 100) 
          : Math.round(value);
      }
    }

    if (record.hispanic_1) {
      const value = parseFloat(record.hispanic_1);
      if (!isNaN(value)) {
        school.hispanic_percent = value <= 1 
          ? Math.round(value * 100) 
          : Math.round(value);
      }
    }

    if (record.white_1) {
      const value = parseFloat(record.white_1);
      if (!isNaN(value)) {
        school.white_percent = value <= 1 
          ? Math.round(value * 100) 
          : Math.round(value);
      }
    }

    if (record.multi_racial_1) {
      const value = parseFloat(record.multi_racial_1);
      if (!isNaN(value)) {
        school.multi_racial_percent = value <= 1 
          ? Math.round(value * 100) 
          : Math.round(value);
      }
    }

    // Contact and administrative info
    if (record.principal_name) {
      school.principal_name = record.principal_name.trim();
    }

    if (record.website) {
      school.website = record.website.trim();
    }

    if (record.phone) {
      school.phone = record.phone.trim();
    }

    if (record.admission_method) {
      school.admission_method = record.admission_method.trim();
    }

    if (record.accountability_status) {
      school.accountability_status = record.accountability_status.trim();
    }

    schoolData.set(dbn, school);
  }

  console.log(`  Processed demographic data for ${schoolData.size} schools`);
  return schoolData;
}

// Merge data from multiple sources
function mergeSchoolData(
  qualityData: Map<string, Partial<School>>,
  demographicData: Map<string, Partial<School>>
): Map<string, Partial<School>> {
  console.log("\n🔄 Merging data from all sources...");

  const merged = new Map<string, Partial<School>>();

  // Start with quality data
  for (const [dbn, data] of Array.from(qualityData)) {
    merged.set(dbn, { ...data });
  }

  // Merge demographic data
  for (const [dbn, data] of Array.from(demographicData)) {
    if (merged.has(dbn)) {
      merged.set(dbn, { ...merged.get(dbn), ...data });
    } else {
      merged.set(dbn, data);
    }
  }

  console.log(`  Total unique schools with snapshot data: ${merged.size}`);
  return merged;
}

// Main import function
async function importSnapshotData() {
  console.log("🚀 Starting NYC DOE Snapshot data import...");
  console.log("=" .repeat(60));

  try {
    // Step 1: Fetch data from APIs
    const qualityData = await fetchSchoolQualityData();
    const demographicData = await fetchDemographicData();

    // Step 2: Merge data
    const mergedData = mergeSchoolData(qualityData, demographicData);

    // Step 3: Get existing schools from database
    console.log("\n📚 Loading existing schools from database...");
    const existingSchools = await db.select().from(schools);
    console.log(`  Found ${existingSchools.length} schools in database`);

    // Step 4: Update schools with snapshot data
    console.log("\n💾 Updating schools with snapshot data...");
    
    let updatedCount = 0;
    let skippedCount = 0;
    const batchSize = 100;
    const schoolsToUpdate: School[] = [];

    for (const existingSchool of existingSchools) {
      const snapshotData = mergedData.get(existingSchool.dbn);

      if (!snapshotData || Object.keys(snapshotData).length === 0) {
        skippedCount++;
        continue;
      }

      // Merge existing school with snapshot data
      const updatedSchool: School = {
        ...existingSchool,
        ...snapshotData,
      };

      schoolsToUpdate.push(updatedSchool);

      // Process in batches using storage interface
      if (schoolsToUpdate.length >= batchSize) {
        await storage.upsertSchools(schoolsToUpdate);
        updatedCount += schoolsToUpdate.length;
        console.log(`  ✓ Updated ${updatedCount} schools...`);
        schoolsToUpdate.length = 0; // Clear array
      }
    }

    // Update remaining schools
    if (schoolsToUpdate.length > 0) {
      await storage.upsertSchools(schoolsToUpdate);
      updatedCount += schoolsToUpdate.length;
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ Import completed successfully!");
    console.log(`   Updated: ${updatedCount} schools`);
    console.log(`   Skipped (no data): ${skippedCount} schools`);
    console.log(`   Total in database: ${existingSchools.length} schools`);

    // Show sample of updated data
    await showSampleData();

  } catch (error) {
    console.error("\n❌ Import failed:", error);
    throw error;
  }
}

// Show sample of updated data
async function showSampleData(): Promise<void> {
  console.log("\n📋 Sample of updated schools (first 5 with complete data):");
  console.log("-".repeat(60));

  const sampleSchools = await db
    .select()
    .from(schools)
    .limit(100);

  let shown = 0;
  for (const school of sampleSchools) {
    if (shown >= 5) break;
    
    // Only show schools with at least some snapshot data
    if (!school.economic_need_index && !school.attendance_rate) {
      continue;
    }

    console.log(`\n${school.dbn} - ${school.name.slice(0, 50)}`);
    console.log(`  Economic Need: ${school.economic_need_index || "N/A"}%`);
    console.log(`  Attendance: ${school.attendance_rate || "N/A"}%`);
    console.log(`  ELL: ${school.ell_percent || "N/A"}% | IEP: ${school.iep_percent || "N/A"}%`);
    console.log(`  Quality Ratings - Instruction: ${school.quality_rating_instruction || "N/A"}`);
    console.log(`  Principal: ${school.principal_name || "N/A"}`);
    
    shown++;
  }
}

// Run the import
importSnapshotData()
  .then(() => {
    console.log("\n✨ Data import finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Import failed with error:", error);
    process.exit(1);
  });
