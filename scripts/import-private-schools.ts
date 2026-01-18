/**
 * Import NYC Private Schools from NCES Private School Universe Survey (PSS)
 * 
 * Data Source: https://nces.ed.gov/surveys/pss/pssdata.asp
 * Latest available: 2021-22 school year
 * 
 * Usage: npx tsx scripts/import-private-schools.ts
 */

import { db } from '../server/db';
import { privateSchools, privateSchoolHistory } from '../shared/schema';
import { sql } from 'drizzle-orm';

// PSS data column mappings (based on NCES codebook)
interface PssRecord {
  PPIN: string;        // Private School Permanent ID (NCES ID)
  PINST: string;       // School name
  PADDRS: string;      // Street address
  PCITY: string;       // City
  PSTABB: string;      // State abbreviation
  PZIP: string;        // ZIP code
  P100: string;        // Phone
  WEBSITE: string;     // Website
  LOGR: string;        // Lowest grade offered
  HIGR: string;        // Highest grade offered
  NUMSTUDS: string;    // Total enrollment
  NUMTEACH: string;    // Number of teachers (FTE)
  PCTELIG: string;     // Percent eligible for free/reduced lunch
  RESSION: string;     // Religious orientation (1-26)
  ORIENT: string;      // Orientation category
  TYPOLOGY: string;    // School typology
  CESSION: string;     // Coeducational status
  LEVEL: string;       // School level
  LATITUDE: string;    // Latitude
  LONGITUDE: string;   // Longitude
  DAYS: string;        // Days in school year
  HRDAY: string;       // Hours per day
  // Grade enrollment fields
  PK?: string;
  K?: string;
  G1?: string;
  G2?: string;
  G3?: string;
  G4?: string;
  G5?: string;
  G6?: string;
  G7?: string;
  G8?: string;
  G9?: string;
  G10?: string;
  G11?: string;
  G12?: string;
  UG?: string;
}

// Map NCES religious orientation codes to readable labels
const RELIGIOUS_ORIENTATION_MAP: Record<string, string> = {
  '1': 'Roman Catholic',
  '2': 'African Methodist Episcopal',
  '3': 'Amish',
  '4': 'Assembly of God',
  '5': 'Baptist',
  '6': 'Brethren',
  '7': 'Calvinist',
  '8': 'Christian (unspecified)',
  '9': 'Church of Christ',
  '10': 'Church of God',
  '11': 'Church of God in Christ',
  '12': 'Church of the Nazarene',
  '13': 'Disciples of Christ',
  '14': 'Episcopal',
  '15': 'Greek Orthodox',
  '16': 'Islamic',
  '17': 'Jewish',
  '18': 'Latter Day Saints',
  '19': 'Lutheran Church - Missouri Synod',
  '20': 'Evangelical Lutheran Church in America',
  '21': 'Wisconsin Evangelical Lutheran Synod',
  '22': 'Other Lutheran',
  '23': 'Mennonite',
  '24': 'Methodist',
  '25': 'Pentecostal',
  '26': 'Presbyterian',
  '27': 'Quaker',
  '28': 'Seventh-Day Adventist',
  '29': 'Other',
  '30': 'Nonsectarian',
};

// Map religious codes to simplified affiliation
function getSimplifiedAffiliation(code: string): string {
  const num = parseInt(code);
  if (num === 1) return 'Catholic';
  if (num === 17) return 'Jewish';
  if (num === 14) return 'Episcopal';
  if (num === 27) return 'Quaker';
  if ([19, 20, 21, 22].includes(num)) return 'Lutheran';
  if (num === 5) return 'Baptist';
  if (num === 24) return 'Methodist';
  if (num === 26) return 'Presbyterian';
  if (num === 16) return 'Islamic';
  if (num === 15) return 'Greek Orthodox';
  if (num === 30) return 'Non-Religious';
  if (num >= 2 && num <= 29) return 'Other Christian';
  return 'Other Religious';
}

// Map coed status codes
function getCoedStatus(code: string): 'coed' | 'male' | 'female' {
  switch (code) {
    case '1': return 'coed';
    case '2': return 'male';
    case '3': return 'female';
    default: return 'coed';
  }
}

// Convert grade codes to display format
function formatGradeRange(low: string, high: string): string {
  const gradeMap: Record<string, string> = {
    'PK': 'Pre-K',
    'K': 'K',
    '1': '1',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    '11': '11',
    '12': '12',
    'UG': 'Ungraded',
  };
  
  const lowDisplay = gradeMap[low] || low;
  const highDisplay = gradeMap[high] || high;
  
  if (lowDisplay === highDisplay) return lowDisplay;
  return `${lowDisplay}-${highDisplay}`;
}

// Map ZIP codes to NYC boroughs
function getBoroughFromZip(zip: string): string | null {
  const zipNum = parseInt(zip?.substring(0, 5));
  if (isNaN(zipNum)) return null;
  
  // Manhattan: 10001-10282
  if (zipNum >= 10001 && zipNum <= 10282) return 'Manhattan';
  
  // Bronx: 10451-10475
  if (zipNum >= 10451 && zipNum <= 10475) return 'Bronx';
  
  // Brooklyn: 11201-11256
  if (zipNum >= 11201 && zipNum <= 11256) return 'Brooklyn';
  
  // Queens: 11004-11697 (various ranges)
  if ((zipNum >= 11004 && zipNum <= 11109) ||
      (zipNum >= 11351 && zipNum <= 11697)) return 'Queens';
  
  // Staten Island: 10301-10314
  if (zipNum >= 10301 && zipNum <= 10314) return 'Staten Island';
  
  return null;
}

// Parse CSV row
function parseCsvRow(row: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  return values;
}

// Download and parse PSS data
async function downloadPssData(): Promise<PssRecord[]> {
  console.log('Downloading PSS data from NCES...');
  
  // Use the 2021-22 public-use data file (ZIP contains the full CSV)
  const zipUrl = 'https://nces.ed.gov/surveys/pss/zip/pss2122_pu_csv.zip';
  
  console.log('Fetching ZIP file...');
  const response = await fetch(zipUrl);
  if (!response.ok) {
    throw new Error(`Failed to download PSS data: ${response.status}`);
  }
  
  // Save ZIP to temp file and extract
  const arrayBuffer = await response.arrayBuffer();
  const zipBuffer = Buffer.from(arrayBuffer);
  
  const fs = await import('fs');
  const path = await import('path');
  const { execSync } = await import('child_process');
  
  const tempDir = '/tmp/pss_data';
  const zipPath = path.join(tempDir, 'pss2122.zip');
  
  // Create temp directory
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Write ZIP file
  fs.writeFileSync(zipPath, zipBuffer);
  console.log('Extracting ZIP file...');
  
  // Extract ZIP
  execSync(`cd ${tempDir} && unzip -o ${zipPath}`, { stdio: 'pipe' });
  
  // Find the CSV file
  const files = fs.readdirSync(tempDir);
  const csvFile = files.find(f => f.endsWith('.csv') && f.includes('pss'));
  
  if (!csvFile) {
    // List files for debugging
    console.log('Files in temp dir:', files);
    throw new Error('CSV file not found in ZIP');
  }
  
  console.log(`Found CSV file: ${csvFile}`);
  
  // Read CSV
  const csvPath = path.join(tempDir, csvFile);
  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file appears to be empty');
  }
  
  // Parse header
  const headers = parseCsvRow(lines[0]);
  console.log(`Found ${headers.length} columns, ${lines.length - 1} schools total`);
  console.log('Sample headers:', headers.slice(0, 20).join(', '));
  
  // Parse data rows
  const records: PssRecord[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvRow(lines[i]);
    
    // Create record object from column mappings
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header.toUpperCase()] = values[idx] || '';
    });
    
    // Only include NY state schools
    if (record.PSTABB !== 'NY') continue;
    
    // Only include NYC schools (check ZIP code)
    const borough = getBoroughFromZip(record.PZIP);
    if (!borough) continue;
    
    records.push(record as unknown as PssRecord);
  }
  
  // Cleanup temp files
  try {
    fs.rmSync(tempDir, { recursive: true });
  } catch (e) {
    // Ignore cleanup errors
  }
  
  console.log(`Found ${records.length} NYC private schools`);
  return records;
}

// Transform PSS record to our schema
function transformPssRecord(pss: PssRecord, dataSourceYear: number): typeof privateSchools.$inferInsert {
  const religiousCode = pss.RESSION || pss.ORIENT || '30';
  const isReligious = religiousCode !== '30';
  const borough = getBoroughFromZip(pss.PZIP);
  
  // Parse enrollment by grade
  const enrollmentByGrade: Record<string, number> = {};
  const gradeFields = ['PK', 'K', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12', 'UG'];
  gradeFields.forEach(grade => {
    const value = parseInt((pss as unknown as Record<string, string>)[grade] || '0');
    if (value > 0) {
      enrollmentByGrade[grade] = value;
    }
  });
  
  // Calculate student-teacher ratio
  const enrollment = parseInt(pss.NUMSTUDS) || 0;
  const teachers = parseFloat(pss.NUMTEACH) || 0;
  const studentTeacherRatio = teachers > 0 ? Math.round((enrollment / teachers) * 10) / 10 : null;
  
  // Calculate school day minutes (hours per day * 60)
  const hoursPerDay = parseFloat(pss.HRDAY) || 0;
  const schoolDayMinutes = hoursPerDay > 0 ? Math.round(hoursPerDay * 60) : null;
  
  return {
    ncesId: pss.PPIN,
    name: pss.PINST,
    address: pss.PADDRS,
    city: pss.PCITY,
    state: pss.PSTABB || 'NY',
    zipCode: pss.PZIP?.substring(0, 5),
    phone: pss.P100 || null,
    website: pss.WEBSITE || null,
    borough,
    neighborhood: null, // Will be enriched via Geoclient
    latitude: pss.LATITUDE ? parseFloat(pss.LATITUDE) : null,
    longitude: pss.LONGITUDE ? parseFloat(pss.LONGITUDE) : null,
    bbl: null, // Will be enriched via Geoclient
    bin: null, // Will be enriched via Geoclient
    gradesOffered: formatGradeRange(pss.LOGR, pss.HIGR),
    lowestGrade: pss.LOGR || null,
    highestGrade: pss.HIGR || null,
    enrollment: enrollment || null,
    enrollmentByGrade: Object.keys(enrollmentByGrade).length > 0 ? enrollmentByGrade : null,
    teachersFte: teachers || null,
    studentTeacherRatio,
    coedStatus: getCoedStatus(pss.CESSION),
    religiousAffiliation: getSimplifiedAffiliation(religiousCode),
    religiousOrientation: RELIGIOUS_ORIENTATION_MAP[religiousCode] || null,
    isReligious,
    programEmphasis: [], // PSS doesn't have detailed program emphasis
    schoolType: 'day', // Default to day school
    hasExtendedDay: false,
    schoolDayMinutes,
    schoolYearDays: pss.DAYS ? parseInt(pss.DAYS) : null,
    tuitionElementary: null, // PSS doesn't include tuition
    tuitionMiddle: null,
    tuitionHigh: null,
    hasFinancialAid: null,
    financialAidPercent: null,
    accreditation: [],
    networkAffiliation: null,
    applicationDeadline: null,
    hasRollingAdmissions: null,
    admissionsSelectivity: null,
    requiresInterview: null,
    requiresTesting: null,
    testingTypes: [],
    dataSourceYear,
    dataSourceVersion: 'PSS 2021-22',
  };
}

// Main import function
async function importPrivateSchools() {
  try {
    console.log('Starting NYC private schools import from NCES PSS...\n');
    
    // Download and parse PSS data
    const pssRecords = await downloadPssData();
    
    if (pssRecords.length === 0) {
      console.log('No NYC private schools found in PSS data');
      return;
    }
    
    // Transform records
    console.log('\nTransforming records...');
    const dataSourceYear = 2022; // 2021-22 school year
    const schools = pssRecords.map(pss => transformPssRecord(pss, dataSourceYear));
    
    // Upsert into database
    console.log(`\nInserting ${schools.length} private schools into database...`);
    
    const chunkSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < schools.length; i += chunkSize) {
      const chunk = schools.slice(i, i + chunkSize);
      
      await db
        .insert(privateSchools)
        .values(chunk)
        .onConflictDoUpdate({
          target: privateSchools.ncesId,
          set: {
            name: sql`excluded.name`,
            address: sql`excluded.address`,
            city: sql`excluded.city`,
            state: sql`excluded.state`,
            zipCode: sql`excluded.zip_code`,
            phone: sql`excluded.phone`,
            website: sql`excluded.website`,
            borough: sql`excluded.borough`,
            latitude: sql`excluded.latitude`,
            longitude: sql`excluded.longitude`,
            gradesOffered: sql`excluded.grades_offered`,
            lowestGrade: sql`excluded.lowest_grade`,
            highestGrade: sql`excluded.highest_grade`,
            enrollment: sql`excluded.enrollment`,
            enrollmentByGrade: sql`excluded.enrollment_by_grade`,
            teachersFte: sql`excluded.teachers_fte`,
            studentTeacherRatio: sql`excluded.student_teacher_ratio`,
            coedStatus: sql`excluded.coed_status`,
            religiousAffiliation: sql`excluded.religious_affiliation`,
            religiousOrientation: sql`excluded.religious_orientation`,
            isReligious: sql`excluded.is_religious`,
            schoolDayMinutes: sql`excluded.school_day_minutes`,
            schoolYearDays: sql`excluded.school_year_days`,
            dataSourceYear: sql`excluded.data_source_year`,
            dataSourceVersion: sql`excluded.data_source_version`,
            updatedAt: new Date(),
          },
        });
      
      inserted += chunk.length;
      console.log(`  Progress: ${inserted}/${schools.length}`);
    }
    
    // Also add to history table for tracking
    console.log('\nAdding historical data entries...');
    
    for (let i = 0; i < schools.length; i += chunkSize) {
      const chunk = schools.slice(i, i + chunkSize);
      
      const historyRecords = chunk.map(school => ({
        ncesId: school.ncesId,
        schoolYear: dataSourceYear,
        enrollment: school.enrollment,
        teachersFte: school.teachersFte,
        studentTeacherRatio: school.studentTeacherRatio,
        tuitionElementary: school.tuitionElementary,
        tuitionMiddle: school.tuitionMiddle,
        tuitionHigh: school.tuitionHigh,
        schoolDayMinutes: school.schoolDayMinutes,
        schoolYearDays: school.schoolYearDays,
        dataSourceVersion: school.dataSourceVersion,
      }));
      
      await db
        .insert(privateSchoolHistory)
        .values(historyRecords)
        .onConflictDoNothing();
    }
    
    console.log('\n✅ Import complete!');
    console.log(`   Total private schools imported: ${schools.length}`);
    
    // Print summary by borough
    const byBorough = schools.reduce((acc, s) => {
      const borough = s.borough || 'Unknown';
      acc[borough] = (acc[borough] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n   Schools by borough:');
    Object.entries(byBorough).sort((a, b) => b[1] - a[1]).forEach(([borough, count]) => {
      console.log(`     ${borough}: ${count}`);
    });
    
    // Print summary by religious affiliation
    const byReligion = schools.reduce((acc, s) => {
      const affiliation = s.religiousAffiliation || 'Unknown';
      acc[affiliation] = (acc[affiliation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n   Schools by religious affiliation:');
    Object.entries(byReligion).sort((a, b) => b[1] - a[1]).forEach(([affiliation, count]) => {
      console.log(`     ${affiliation}: ${count}`);
    });
    
  } catch (error) {
    console.error('Error importing private schools:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run import
importPrivateSchools();
