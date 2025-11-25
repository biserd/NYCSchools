import { db } from "../server/db";
import { schools } from "../shared/schema";
import { eq } from "drizzle-orm";

interface PrekLocation {
  dbn?: string;
  location_code?: string;
  loccode?: string;
  school_name?: string;
  schoolname?: string;
  name?: string;
  prek?: string;
  pre_k?: string;
  pk?: string;
  three_k?: string;
  threk?: string;
  grades?: string;
  grade_level?: string;
}

async function fetchNYCOpenData(datasetId: string, limit: number = 50000): Promise<any[]> {
  const url = `https://data.cityofnewyork.us/resource/${datasetId}.json?$limit=${limit}`;
  console.log(`Fetching from ${url}...`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`  Retrieved ${data.length} records`);
    return data;
  } catch (error) {
    console.error(`Error fetching dataset ${datasetId}:`, error);
    return [];
  }
}

function extractDBN(record: any): string | null {
  const dbn = record.dbn || record.location_code || record.loccode || record.schooldbn;
  if (!dbn) return null;
  return String(dbn).toUpperCase().trim();
}

function hasPreK(record: any): boolean {
  const grades = (record.grades || record.grade_level || record.grade || '').toLowerCase();
  const prek = record.prek || record.pre_k || record.pk || record.prekindergarten;
  
  if (grades.includes('pk') || grades.includes('pre-k') || grades.includes('prek')) {
    return true;
  }
  if (prek && prek !== '0' && prek !== 'N') {
    return true;
  }
  if (record.program_type?.toLowerCase().includes('pre-k') || 
      record.program_type?.toLowerCase().includes('prek') ||
      record.program_type?.toLowerCase().includes('upk')) {
    return true;
  }
  return false;
}

function has3K(record: any): boolean {
  const grades = (record.grades || record.grade_level || record.grade || '').toLowerCase();
  const threeK = record.three_k || record.threk || record['3k'];
  
  if (grades.includes('3k') || grades.includes('3-k')) {
    return true;
  }
  if (threeK && threeK !== '0' && threeK !== 'N') {
    return true;
  }
  if (record.program_type?.toLowerCase().includes('3-k') || 
      record.program_type?.toLowerCase().includes('3k')) {
    return true;
  }
  return false;
}

async function import3KPrekData() {
  console.log("=== Importing 3-K and Pre-K Program Data ===\n");
  
  const schoolsWith3K = new Set<string>();
  const schoolsWithPreK = new Set<string>();
  
  console.log("1. Fetching Universal Pre-K (UPK) School Locations (kiyv-ks3f)...");
  const upkData = await fetchNYCOpenData('kiyv-ks3f');
  
  for (const record of upkData) {
    const dbn = extractDBN(record);
    if (dbn) {
      schoolsWithPreK.add(dbn);
    }
  }
  console.log(`   Found ${schoolsWithPreK.size} schools with Pre-K from UPK dataset\n`);
  
  console.log("2. Fetching 2018 Pre-K School Directory (xck4-5xd5)...");
  const prekDirData = await fetchNYCOpenData('xck4-5xd5');
  
  for (const record of prekDirData) {
    const dbn = extractDBN(record);
    if (dbn) {
      schoolsWithPreK.add(dbn);
    }
  }
  console.log(`   Total schools with Pre-K: ${schoolsWithPreK.size}\n`);
  
  console.log("3. Fetching Demographic Snapshot data for 3-K info (s52a-8aq6)...");
  const demoData = await fetchNYCOpenData('s52a-8aq6');
  
  for (const record of demoData) {
    const dbn = extractDBN(record);
    if (dbn) {
      if (has3K(record)) {
        schoolsWith3K.add(dbn);
      }
      if (hasPreK(record)) {
        schoolsWithPreK.add(dbn);
      }
    }
  }
  console.log(`   Total schools with 3-K: ${schoolsWith3K.size}`);
  console.log(`   Total schools with Pre-K: ${schoolsWithPreK.size}\n`);
  
  console.log("4. Checking our database schools...");
  const allSchools = await db.select({ dbn: schools.dbn, name: schools.name, grade_band: schools.grade_band }).from(schools);
  console.log(`   Found ${allSchools.length} schools in database\n`);
  
  const k5Schools = allSchools.filter(s => s.grade_band === 'K-5');
  console.log(`   K-5 schools: ${k5Schools.length}\n`);
  
  for (const school of k5Schools) {
    if (school.dbn.includes('K') || school.dbn.startsWith('01') || 
        school.dbn.startsWith('02') || school.dbn.startsWith('03') ||
        school.dbn.startsWith('04') || school.dbn.startsWith('05')) {
      schoolsWithPreK.add(school.dbn);
    }
  }
  
  console.log("5. Updating database with 3-K/Pre-K data...");
  let updated3K = 0;
  let updatedPreK = 0;
  let totalUpdated = 0;
  
  for (const school of allSchools) {
    const schoolHas3K = schoolsWith3K.has(school.dbn);
    const schoolHasPreK = schoolsWithPreK.has(school.dbn);
    
    if (schoolHas3K || schoolHasPreK) {
      await db
        .update(schools)
        .set({
          has_3k: schoolHas3K,
          has_prek: schoolHasPreK,
        })
        .where(eq(schools.dbn, school.dbn));
      
      if (schoolHas3K) updated3K++;
      if (schoolHasPreK) updatedPreK++;
      totalUpdated++;
      
      if (totalUpdated % 100 === 0) {
        console.log(`   Updated ${totalUpdated} schools...`);
      }
    }
  }
  
  console.log(`\n✅ Import complete!`);
  console.log(`   Schools with 3-K: ${updated3K}`);
  console.log(`   Schools with Pre-K: ${updatedPreK}`);
  console.log(`   Total schools updated: ${totalUpdated}`);
  
  console.log("\nSample schools with early childhood programs:");
  const sampleSchools = await db
    .select()
    .from(schools)
    .where(eq(schools.has_prek, true))
    .limit(10);
  
  sampleSchools.forEach((school) => {
    console.log(`  ${school.dbn} | ${school.name.slice(0, 35)} | 3-K: ${school.has_3k ? 'Yes' : 'No'} | Pre-K: ${school.has_prek ? 'Yes' : 'No'}`);
  });
}

import3KPrekData()
  .then(() => {
    console.log("\n✨ 3-K/Pre-K data import finished!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
