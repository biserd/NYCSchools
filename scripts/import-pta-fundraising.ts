import XLSX from 'xlsx';
import { db } from '../server/db';
import { schools } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface PTAData {
  dbn: string;
  schoolName: string;
  totalIncome: number;
}

interface EnrollmentData {
  dbn: string;
  totalEnrollment: number;
}

async function importPTAData() {
  console.log('Loading PTA fundraising data from Excel...');
  
  const workbook = XLSX.readFile('/tmp/pta-fundraising-2023-24.xlsx');
  
  // Parse School sheet for financial data
  const schoolSheet = workbook.Sheets['School'];
  const schoolData = XLSX.utils.sheet_to_json<any>(schoolSheet, { header: 1 });
  
  // Parse Student Demographics sheet for enrollment data
  const demographicsSheet = workbook.Sheets['Student Demographics'];
  const demographicsData = XLSX.utils.sheet_to_json<any>(demographicsSheet, { header: 1 });
  
  // Build enrollment lookup by DBN
  const enrollmentByDBN = new Map<string, number>();
  for (let i = 1; i < demographicsData.length; i++) {
    const row = demographicsData[i];
    if (row && row[0] && row[3]) {
      const dbn = String(row[0]).trim();
      const enrollment = Number(row[3]) || 0;
      if (enrollment > 0) {
        enrollmentByDBN.set(dbn, enrollment);
      }
    }
  }
  console.log(`Loaded enrollment data for ${enrollmentByDBN.size} schools`);
  
  // Parse PTA financial data
  const ptaDataList: PTAData[] = [];
  for (let i = 1; i < schoolData.length; i++) {
    const row = schoolData[i];
    if (!row || !row[0]) continue;
    
    const dbn = String(row[0]).trim();
    const schoolName = String(row[1] || '').trim();
    const totalIncome = Number(row[4]) || 0; // Total Income column (index 4)
    
    if (dbn && totalIncome > 0) {
      ptaDataList.push({
        dbn,
        schoolName,
        totalIncome: Math.round(totalIncome),
      });
    }
  }
  
  console.log(`Found ${ptaDataList.length} schools with PTA income data`);
  
  // Get existing schools from database
  const existingSchools = await db.select({ dbn: schools.dbn, enrollment: schools.enrollment }).from(schools);
  const existingDBNs = new Set(existingSchools.map(s => s.dbn));
  const enrollmentMap = new Map(existingSchools.map(s => [s.dbn, s.enrollment]));
  
  console.log(`Found ${existingDBNs.size} schools in database`);
  
  let updated = 0;
  let notFound = 0;
  let topFundraisers: { dbn: string; name: string; total: number; perStudent: number }[] = [];
  
  for (const pta of ptaDataList) {
    if (!existingDBNs.has(pta.dbn)) {
      notFound++;
      continue;
    }
    
    // Use enrollment from our database first, fallback to DOE data
    const enrollment = enrollmentMap.get(pta.dbn) || enrollmentByDBN.get(pta.dbn) || 0;
    const perStudent = enrollment > 0 ? Math.round(pta.totalIncome / enrollment) : null;
    
    await db.update(schools)
      .set({
        pta_fundraising_total: pta.totalIncome,
        pta_fundraising_year: '2023-24',
        pta_per_student: perStudent,
      })
      .where(eq(schools.dbn, pta.dbn));
    
    updated++;
    
    // Track top fundraisers
    if (pta.totalIncome >= 100000) {
      topFundraisers.push({
        dbn: pta.dbn,
        name: pta.schoolName,
        total: pta.totalIncome,
        perStudent: perStudent || 0,
      });
    }
  }
  
  // Sort top fundraisers
  topFundraisers.sort((a, b) => b.total - a.total);
  
  console.log(`\n=== Import Complete ===`);
  console.log(`Updated: ${updated} schools`);
  console.log(`Not found in database: ${notFound} schools`);
  
  console.log(`\n=== Top 20 PTA Fundraisers (2023-24) ===`);
  topFundraisers.slice(0, 20).forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (${s.dbn}): $${s.total.toLocaleString()} ($${s.perStudent}/student)`);
  });
  
  // Stats
  const allTotals = ptaDataList.filter(p => existingDBNs.has(p.dbn)).map(p => p.totalIncome);
  const totalRaised = allTotals.reduce((a, b) => a + b, 0);
  const avgRaised = Math.round(totalRaised / allTotals.length);
  const over100k = allTotals.filter(t => t >= 100000).length;
  const over500k = allTotals.filter(t => t >= 500000).length;
  const over1m = allTotals.filter(t => t >= 1000000).length;
  
  console.log(`\n=== Statistics ===`);
  console.log(`Total raised across all PTAs: $${totalRaised.toLocaleString()}`);
  console.log(`Average per school: $${avgRaised.toLocaleString()}`);
  console.log(`Schools raising $100k+: ${over100k}`);
  console.log(`Schools raising $500k+: ${over500k}`);
  console.log(`Schools raising $1M+: ${over1m}`);
  
  process.exit(0);
}

importPTAData().catch(console.error);
