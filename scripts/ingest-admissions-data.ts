/**
 * Admissions Data Ingestion Script
 * 
 * Downloads and parses NYC DOE Local Law 72 data files:
 * - 2025-26 Applications & Offers (K, 3K, Pre-K)
 * - 2024-25 Applications & Offers
 * - 2024-25 Enrollment
 * 
 * Usage: npx tsx scripts/ingest-admissions-data.ts
 */

import * as XLSX from 'xlsx';
import { db } from '../server/db';
import { admissionsOffers, enrollmentData, admissionsMetrics, schools, InsertAdmissionsOffers, InsertEnrollmentData, InsertAdmissionsMetrics } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// Data source URLs from InfoHub
const DATA_SOURCES = {
  offers_2025_26: {
    url: 'https://infohub.nyced.org/docs/default-source/default-document-library/ose/fall-2025-admissions_72_suppressed.xlsx',
    schoolYear: '2025-2026',
    type: 'offers'
  },
  offers_2024_25: {
    url: 'https://infohub.nyced.org/docs/default-source/default-document-library/ose/fall-2024-admissions-72-suppressed.xlsx',
    schoolYear: '2024-2025',
    type: 'offers'
  },
  enrollment_2024_25: {
    url: 'https://infohub.nyced.org/docs/default-source/default-document-library/ose/fall-2024-admissions_part-ii_suppressed.xlsx',
    schoolYear: '2024-2025',
    type: 'enrollment'
  }
};

// Grade band column prefixes and normalized names
const GRADE_COLUMNS = [
  { prefix: '3K', normalizedName: '3K' },
  { prefix: 'Pre-K', normalizedName: 'PK' },
  { prefix: 'Kindergarten', normalizedName: 'K' },
];

// Check if a value is suppressed or N/A
function isSuppressedValue(val: any): boolean {
  if (val === null || val === undefined) return false;
  const str = String(val).trim().toLowerCase();
  return str === 's' || str === '<5' || str === '*' || str === 'na' || str === 'n/a' || str === '';
}

// Parse numeric value, handling suppression
function parseNumeric(val: any): { value: number | null; suppressed: boolean } {
  if (val === null || val === undefined || val === '') {
    return { value: null, suppressed: false };
  }
  
  if (isSuppressedValue(val)) {
    return { value: null, suppressed: true };
  }
  
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  return { value: isNaN(num) ? null : Math.round(num), suppressed: false };
}

// Download XLSX file from URL
async function downloadXLSX(url: string): Promise<XLSX.WorkBook> {
  console.log(`Downloading: ${url}`);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  console.log(`  Sheets: ${workbook.SheetNames.join(', ')}`);
  return workbook;
}

// Batch insert helper
async function batchInsert<T>(
  table: any, 
  records: T[], 
  batchSize: number = 500
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await db.insert(table).values(batch as any);
    inserted += batch.length;
  }
  return inserted;
}

// Process Applications & Offers file (column-per-grade format)
async function processOffersFile(workbook: XLSX.WorkBook, schoolYear: string, sourceFile: string) {
  const sheet = workbook.Sheets['School'];
  if (!sheet) {
    console.log('  ERROR: No "School" sheet found');
    return { inserted: 0, skipped: 0 };
  }

  const data = XLSX.utils.sheet_to_json(sheet, { raw: false }) as any[];
  console.log(`  Found ${data.length} rows`);

  const records: InsertAdmissionsOffers[] = [];
  let skipped = 0;

  console.log(`  Processing grades: ${GRADE_COLUMNS.map(g => g.prefix).join(', ')}`);

  for (const row of data) {
    const dbn = String(row['School DBN'] || '').trim();
    if (!dbn || dbn.length < 5) {
      skipped++;
      continue;
    }

    const category = String(row['Category'] || '').trim();
    
    // Only process "All Students" category
    if (category !== 'All Students') {
      skipped++;
      continue;
    }

    // Process each grade band
    for (const gradeConfig of GRADE_COLUMNS) {
      const seatsCol = `${gradeConfig.prefix} Seats Available`;
      const applicantsCol = `${gradeConfig.prefix} Total Applicants`;
      const trueApplicantsCol = `${gradeConfig.prefix} True Applicants`;
      const offersCol = `${gradeConfig.prefix} Offers`;

      const seats = parseNumeric(row[seatsCol]);
      const applicants = parseNumeric(row[applicantsCol]);
      const trueApplicants = parseNumeric(row[trueApplicantsCol]);
      const offers = parseNumeric(row[offersCol]);

      // Skip if all values are null/suppressed (school doesn't offer this grade)
      if (seats.value === null && applicants.value === null && offers.value === null) {
        continue;
      }

      const isSuppressed = seats.suppressed || applicants.suppressed || offers.suppressed;

      records.push({
        dbn,
        schoolYear,
        gradeBand: gradeConfig.normalizedName,
        category,
        seatsAvailable: seats.value,
        totalApplicants: applicants.value,
        trueApplicants: trueApplicants.value,
        offers: offers.value,
        isSuppressed,
        sourceFile
      });
    }
  }

  // Clear existing data for this school year and bulk insert
  console.log(`  Clearing existing data for ${schoolYear}...`);
  await db.delete(admissionsOffers).where(eq(admissionsOffers.schoolYear, schoolYear));
  
  console.log(`  Inserting ${records.length} records...`);
  const inserted = await batchInsert(admissionsOffers, records);

  return { inserted, skipped };
}

// Process Enrollment file
async function processEnrollmentFile(workbook: XLSX.WorkBook, schoolYear: string, sourceFile: string) {
  const sheet = workbook.Sheets['School'];
  if (!sheet) {
    console.log('  ERROR: No "School" sheet found');
    return { inserted: 0, skipped: 0 };
  }

  const data = XLSX.utils.sheet_to_json(sheet, { raw: false }) as any[];
  console.log(`  Found ${data.length} rows`);

  // Check what columns exist
  const headers = Object.keys(data[0]);
  console.log(`  Sample columns: ${headers.slice(0, 10).join(', ')}...`);

  // Look for exact column names (LL72 uses "3K Students", "Pre-K Students", "Kindergarten Students")
  const enrollmentColumns = [
    { colName: '3K Students', normalizedName: '3K' },
    { colName: 'Pre-K Students', normalizedName: 'PK' },
    { colName: 'Kindergarten Students', normalizedName: 'K' },
  ];

  // Find matching columns
  const foundColumns: { colName: string; normalizedName: string }[] = [];
  for (const ec of enrollmentColumns) {
    if (headers.includes(ec.colName)) {
      foundColumns.push({ colName: ec.colName, normalizedName: ec.normalizedName });
    }
  }
  
  console.log(`  Found enrollment columns: ${foundColumns.map(c => c.colName).join(', ') || 'NONE'}`);

  if (foundColumns.length === 0) {
    console.log('  WARNING: No enrollment columns found, trying alternate format...');
    // The enrollment file might have a different structure - let's check
    const sampleRow = data.find((r: any) => r['Category'] === 'All Students') as any;
    if (sampleRow) {
      console.log('  Sample row keys:', Object.keys(sampleRow).join(', '));
    }
    return { inserted: 0, skipped: data.length };
  }

  const records: InsertEnrollmentData[] = [];
  let skipped = 0;

  for (const row of data) {
    const dbn = String(row['School DBN'] || '').trim();
    if (!dbn || dbn.length < 5) {
      skipped++;
      continue;
    }

    // Only process "All Students" if category exists
    if (row['Category'] && String(row['Category']).trim() !== 'All Students') {
      skipped++;
      continue;
    }

    for (const col of foundColumns) {
      const enrolled = parseNumeric(row[col.colName]);
      
      if (enrolled.value === null) continue;

      records.push({
        dbn,
        schoolYear,
        grade: col.normalizedName,
        enrolled: enrolled.value,
        isSuppressed: enrolled.suppressed,
        sourceFile
      });
    }
  }

  // Clear and insert
  console.log(`  Clearing existing enrollment data for ${schoolYear}...`);
  await db.delete(enrollmentData).where(eq(enrollmentData.schoolYear, schoolYear));
  
  console.log(`  Inserting ${records.length} enrollment records...`);
  const inserted = await batchInsert(enrollmentData, records);

  return { inserted, skipped };
}

// Compute metrics for all schools with Bayesian smoothing
async function computeMetrics() {
  console.log('\nComputing admissions metrics...');

  // Get all offers data
  const offersData = await db.select().from(admissionsOffers);
  console.log(`  Found ${offersData.length} offer records`);
  
  // Get enrollment data
  const enrollData = await db.select().from(enrollmentData);
  console.log(`  Found ${enrollData.length} enrollment records`);
  
  // Get district info from schools table
  const schoolsData = await db.select({
    dbn: schools.dbn,
    district: schools.district
  }).from(schools);
  
  const schoolDistricts = new Map(schoolsData.map(s => [s.dbn, s.district]));
  
  // Group enrollment by DBN + grade for easy lookup
  const enrollmentMap = new Map<string, number>();
  for (const e of enrollData) {
    if (e.enrolled !== null) {
      enrollmentMap.set(`${e.dbn}-${e.grade}-${e.schoolYear}`, e.enrolled);
    }
  }

  // Calculate district-level average yields for 2024-25 (for smoothing)
  const districtYields = new Map<number, { totalEnrolled: number; totalOffers: number }>();
  
  for (const offer of offersData.filter(o => o.schoolYear === '2024-2025')) {
    const district = schoolDistricts.get(offer.dbn);
    if (!district || !offer.offers) continue;
    
    const enrolled = enrollmentMap.get(`${offer.dbn}-${offer.gradeBand}-${offer.schoolYear}`);
    if (enrolled === undefined) continue;
    
    if (!districtYields.has(district)) {
      districtYields.set(district, { totalEnrolled: 0, totalOffers: 0 });
    }
    const d = districtYields.get(district)!;
    d.totalEnrolled += enrolled;
    d.totalOffers += offer.offers;
  }
  
  // Compute district average yields
  const districtAvgYield = new Map<number, number>();
  for (const [district, data] of districtYields) {
    if (data.totalOffers > 0) {
      districtAvgYield.set(district, data.totalEnrolled / data.totalOffers);
    }
  }
  
  // Global average yield as fallback
  let globalTotalEnrolled = 0;
  let globalTotalOffers = 0;
  for (const d of districtYields.values()) {
    globalTotalEnrolled += d.totalEnrolled;
    globalTotalOffers += d.totalOffers;
  }
  const globalAvgYield = globalTotalOffers > 0 ? globalTotalEnrolled / globalTotalOffers : 0.85;
  
  console.log(`  Global average yield: ${(globalAvgYield * 100).toFixed(1)}%`);
  console.log(`  Districts with yield data: ${districtAvgYield.size}`);

  // Build metrics records
  const metricsRecords: InsertAdmissionsMetrics[] = [];
  const ALPHA = 50; // Pseudo-count for Bayesian smoothing

  for (const offer of offersData) {
    if (offer.category !== 'All Students') continue;
    
    const district = schoolDistricts.get(offer.dbn);
    const districtYield = district ? districtAvgYield.get(district) : undefined;
    const priorYield = districtYield ?? globalAvgYield;
    
    // Get enrollment if available
    const enrolled = enrollmentMap.get(`${offer.dbn}-${offer.gradeBand}-${offer.schoolYear}`);
    
    // Compute metrics
    const seats = offer.seatsAvailable;
    const applicants = offer.totalApplicants;
    const trueApps = offer.trueApplicants;
    const offers = offer.offers;
    
    let appsPerSeat: number | null = null;
    let trueAppsPerSeat: number | null = null;
    let offerRate: number | null = null;
    let trueOfferRate: number | null = null;
    let yieldVal: number | null = null;
    let fillRate: number | null = null;
    let estimatedYield: number | null = null;
    let estimatedFillRate: number | null = null;
    let estimationMethod: string | null = null;
    
    if (seats && seats > 0) {
      if (applicants !== null) {
        appsPerSeat = Math.round((applicants / seats) * 100) / 100;
      }
      if (trueApps !== null) {
        trueAppsPerSeat = Math.round((trueApps / seats) * 100) / 100;
      }
      if (enrolled !== undefined) {
        fillRate = Math.round((enrolled / seats) * 1000) / 1000;
      }
    }
    
    if (applicants && applicants > 0 && offers !== null) {
      offerRate = Math.round((offers / applicants) * 1000) / 1000;
    }
    
    if (trueApps && trueApps > 0 && offers !== null) {
      trueOfferRate = Math.round((offers / trueApps) * 1000) / 1000;
    }
    
    if (offers && offers > 0 && enrolled !== undefined) {
      yieldVal = Math.round((enrolled / offers) * 1000) / 1000;
    }
    
    // For 2025-26, estimate fill rate using Bayesian-smoothed yield
    if (offer.schoolYear === '2025-2026' && offers && seats && seats > 0) {
      // Get historical yield for this school from 2024-25
      const prevOffers = offersData.find(o => 
        o.dbn === offer.dbn && 
        o.gradeBand === offer.gradeBand && 
        o.schoolYear === '2024-2025' &&
        o.category === 'All Students'
      );
      
      const prevEnrolled = enrollmentMap.get(`${offer.dbn}-${offer.gradeBand}-2024-2025`);
      
      let schoolYield = priorYield;
      
      if (prevOffers?.offers && prevOffers.offers > 0 && prevEnrolled !== undefined) {
        const rawYield = prevEnrolled / prevOffers.offers;
        // Bayesian shrinkage: (O_s * Y_s + α * µ_d) / (O_s + α)
        schoolYield = (prevOffers.offers * rawYield + ALPHA * priorYield) / (prevOffers.offers + ALPHA);
        estimationMethod = 'historical_yield';
      } else {
        estimationMethod = 'district_average';
      }
      
      estimatedYield = Math.round(schoolYield * 1000) / 1000;
      const estimatedEnrolled = Math.min(seats, offers * schoolYield);
      estimatedFillRate = Math.round((estimatedEnrolled / seats) * 1000) / 1000;
    }
    
    metricsRecords.push({
      dbn: offer.dbn,
      schoolYear: offer.schoolYear,
      gradeBand: offer.gradeBand,
      appsPerSeat,
      trueAppsPerSeat,
      offerRate,
      trueOfferRate,
      yield: yieldVal,
      fillRate,
      estimatedYield,
      estimatedFillRate,
      estimationMethod,
      seatsAvailable: seats,
      totalApplicants: applicants,
      trueApplicants: trueApps,
      offers: offers,
      enrolled: enrolled ?? null,
      districtAvgYield: Math.round(priorYield * 1000) / 1000
    });
  }

  // Clear and insert metrics
  console.log(`  Clearing existing metrics...`);
  await db.delete(admissionsMetrics);
  
  console.log(`  Inserting ${metricsRecords.length} metric records...`);
  const inserted = await batchInsert(admissionsMetrics, metricsRecords);
  
  console.log(`  Inserted ${inserted} metric records`);
  return inserted;
}

// Main ingestion function
async function main() {
  console.log('===========================================');
  console.log('NYC DOE Admissions Data Ingestion');
  console.log('===========================================\n');

  try {
    // Process 2025-26 Applications & Offers
    console.log('Processing 2025-26 Applications & Offers...');
    const wb2526 = await downloadXLSX(DATA_SOURCES.offers_2025_26.url);
    const result2526 = await processOffersFile(wb2526, DATA_SOURCES.offers_2025_26.schoolYear, 'fall-2025-admissions_72_suppressed.xlsx');
    console.log(`  Inserted: ${result2526.inserted}, Skipped: ${result2526.skipped}\n`);

    // Process 2024-25 Applications & Offers
    console.log('Processing 2024-25 Applications & Offers...');
    const wb2425 = await downloadXLSX(DATA_SOURCES.offers_2024_25.url);
    const result2425 = await processOffersFile(wb2425, DATA_SOURCES.offers_2024_25.schoolYear, 'fall-2024-admissions-72-suppressed.xlsx');
    console.log(`  Inserted: ${result2425.inserted}, Skipped: ${result2425.skipped}\n`);

    // Process 2024-25 Enrollment
    console.log('Processing 2024-25 Enrollment...');
    const wbEnroll = await downloadXLSX(DATA_SOURCES.enrollment_2024_25.url);
    const resultEnroll = await processEnrollmentFile(wbEnroll, DATA_SOURCES.enrollment_2024_25.schoolYear, 'fall-2024-admissions_part-ii_suppressed.xlsx');
    console.log(`  Inserted: ${resultEnroll.inserted}, Skipped: ${resultEnroll.skipped}\n`);

    // Compute metrics
    await computeMetrics();

    console.log('\n===========================================');
    console.log('Ingestion Complete!');
    console.log('===========================================');
    
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
