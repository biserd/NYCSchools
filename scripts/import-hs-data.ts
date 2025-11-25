import { db } from "../server/db";
import { schools } from "../shared/schema";
import { eq, like, or } from "drizzle-orm";

interface HsDirectoryData {
  dbn: string;
  school_name: string;
  graduation_rate?: string;
  college_career_rate?: string;
  attendance_rate?: string;
  pct_stu_safe?: string;
  advancedplacement_courses?: string;
  method1?: string;
  total_students?: string;
}

interface SatData {
  dbn: string;
  school_name: string;
  num_of_sat_test_takers?: string;
  sat_critical_reading_avg_score?: string;
  sat_math_avg_score?: string;
  sat_writing_avg_score?: string;
}

const SPECIALIZED_HS_DBNS = [
  "10X445", // Bronx High School of Science
  "02M475", // Stuyvesant High School
  "13K430", // Brooklyn Technical High School
  "28Q687", // Queens High School for the Sciences at York College
  "31R605", // Staten Island Technical High School
  "05M692", // High School for Math, Science and Engineering at City College
  "02M416", // High School of American Studies at Lehman College
  "03M485", // Fiorello H. LaGuardia High School of Music & Art and Performing Arts
  "10X696", // High School for Language and Innovation
];

async function fetchHsDirectory(): Promise<HsDirectoryData[]> {
  console.log("Fetching high school directory data from NYC Open Data...");
  
  let allData: HsDirectoryData[] = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const url = `https://data.cityofnewyork.us/resource/8b6c-7uty.json?$limit=${limit}&$offset=${offset}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch HS directory: ${response.status}`);
    }
    
    const data = await response.json() as HsDirectoryData[];
    
    if (data.length === 0) break;
    
    allData = allData.concat(data);
    offset += limit;
    
    if (data.length < limit) break;
  }
  
  console.log(`   Fetched ${allData.length} high school records from directory`);
  return allData;
}

async function fetchSatData(): Promise<SatData[]> {
  console.log("Fetching SAT score data from NYC Open Data...");
  
  let allData: SatData[] = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const url = `https://data.cityofnewyork.us/resource/f9bf-2cp4.json?$limit=${limit}&$offset=${offset}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch SAT data: ${response.status}`);
    }
    
    const data = await response.json() as SatData[];
    
    if (data.length === 0) break;
    
    allData = allData.concat(data);
    offset += limit;
    
    if (data.length < limit) break;
  }
  
  console.log(`   Fetched ${allData.length} SAT score records`);
  return allData;
}

function parsePercentage(value: string | undefined): number | null {
  if (!value || value === 's' || value === 'N/A') return null;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return null;
  if (parsed <= 1) {
    return Math.round(parsed * 100);
  }
  return Math.round(parsed);
}

function parseScore(value: string | undefined): number | null {
  if (!value || value === 's' || value === 'N/A') return null;
  const parsed = parseInt(value);
  if (isNaN(parsed)) return null;
  return parsed;
}

function countApCourses(apString: string | undefined): number {
  if (!apString) return 0;
  const courses = apString.split(',').map(c => c.trim()).filter(c => c.length > 0);
  return courses.length;
}

function parseAdmissionMethod(method: string | undefined): string | null {
  if (!method) return null;
  const methodLower = method.toLowerCase();
  
  if (methodLower.includes('screened')) return 'screened';
  if (methodLower.includes('ed. opt')) return 'educational_option';
  if (methodLower.includes('unscreened')) return 'unscreened';
  if (methodLower.includes('limited')) return 'limited_unscreened';
  if (methodLower.includes('audition')) return 'audition';
  if (methodLower.includes('test')) return 'test';
  if (methodLower.includes('zoned')) return 'zoned';
  
  return method;
}

async function importHighSchoolData() {
  console.log("=== Importing High School Metrics Data ===\n");

  console.log("1. Fetching schools from database...");
  const allSchools = await db.select({ dbn: schools.dbn, name: schools.name, grade_band: schools.grade_band }).from(schools);
  console.log(`   Total schools in database: ${allSchools.length}`);

  const hsSchools = allSchools.filter(s => 
    s.grade_band?.includes('12') || 
    s.grade_band?.includes('9') ||
    s.name?.toLowerCase().includes('high school')
  );
  console.log(`   High schools identified: ${hsSchools.length}`);

  console.log("\n2. Fetching external data sources...");
  const [hsDirectory, satData] = await Promise.all([
    fetchHsDirectory(),
    fetchSatData()
  ]);

  const hsDirectoryByDbn = new Map<string, HsDirectoryData>();
  for (const hs of hsDirectory) {
    if (hs.dbn) {
      hsDirectoryByDbn.set(hs.dbn.toUpperCase(), hs);
    }
  }

  const satByDbn = new Map<string, SatData>();
  for (const sat of satData) {
    if (sat.dbn) {
      satByDbn.set(sat.dbn.toUpperCase(), sat);
    }
  }

  console.log("\n3. Resetting high school metric flags...");
  await db.update(schools).set({
    graduation_rate_4yr: null,
    graduation_rate_6yr: null,
    college_readiness_rate: null,
    college_enrollment_rate: null,
    sat_avg_reading: null,
    sat_avg_math: null,
    sat_avg_total: null,
    regents_pass_rate: null,
    ap_course_count: null,
    ap_pass_rate: null,
    is_specialized_hs: false,
    hs_admission_method: null,
  });
  console.log("   Reset complete.");

  const specializedSet = new Set(SPECIALIZED_HS_DBNS.map(d => d.toUpperCase()));

  console.log("\n4. Updating high school data...");
  let updated = 0;
  let skipped = 0;

  for (const school of hsSchools) {
    const dbn = school.dbn.toUpperCase();
    const hsData = hsDirectoryByDbn.get(dbn);
    const satInfo = satByDbn.get(dbn);

    if (!hsData && !satInfo) {
      skipped++;
      continue;
    }

    const gradRate4yr = hsData ? parsePercentage(hsData.graduation_rate) : null;
    const collegeCareerRate = hsData ? parsePercentage(hsData.college_career_rate) : null;
    const apCount = hsData ? countApCourses(hsData.advancedplacement_courses) : null;
    const admissionMethod = hsData ? parseAdmissionMethod(hsData.method1) : null;
    
    const satReading = satInfo ? parseScore(satInfo.sat_critical_reading_avg_score) : null;
    const satMath = satInfo ? parseScore(satInfo.sat_math_avg_score) : null;
    let satTotal: number | null = null;
    if (satReading && satMath) {
      satTotal = satReading + satMath;
    }

    const isSpecialized = specializedSet.has(dbn);

    await db.update(schools)
      .set({
        graduation_rate_4yr: gradRate4yr,
        college_readiness_rate: collegeCareerRate,
        sat_avg_reading: satReading,
        sat_avg_math: satMath,
        sat_avg_total: satTotal,
        ap_course_count: apCount,
        is_specialized_hs: isSpecialized,
        hs_admission_method: admissionMethod,
      })
      .where(eq(schools.dbn, school.dbn));

    updated++;

    if (updated <= 10) {
      console.log(`   ✓ ${dbn} | Grad: ${gradRate4yr ?? 'N/A'}% | SAT: ${satTotal ?? 'N/A'} | AP: ${apCount ?? 0} | ${school.name?.slice(0, 35)}`);
    }
  }

  console.log(`   ... and ${Math.max(0, updated - 10)} more schools updated`);

  console.log("\n5. Marking specialized high schools...");
  let specializedCount = 0;
  for (const dbn of SPECIALIZED_HS_DBNS) {
    const result = await db.update(schools)
      .set({ is_specialized_hs: true })
      .where(eq(schools.dbn, dbn.toUpperCase()));
    specializedCount++;
  }
  console.log(`   Marked ${specializedCount} specialized high schools`);

  console.log("\n=== High School Data Import Complete ===");
  console.log(`   Schools updated: ${updated}`);
  console.log(`   Schools skipped (no data): ${skipped}`);
  console.log(`   Specialized high schools: ${specializedCount}`);
}

importHighSchoolData()
  .then(() => {
    console.log("\nImport finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });
