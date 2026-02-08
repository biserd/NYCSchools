import XLSX from 'xlsx';
import fs from 'fs';
import { db } from '../server/db';
import { hsAdmissionsProgram } from '../shared/schema';

const parseNum = (value: any): number | null => {
  if (value == null || value === '' || value === 's' || value === 'N/A' || value === '-') return null;
  const str = String(value).replace(',', '').trim();
  const num = Number(str);
  if (isNaN(num)) return null;
  return num;
};

const parseFloat = (value: any): number | null => {
  if (value == null || value === '' || value === 's' || value === 'N/A' || value === '-') return null;
  const str = String(value).replace(',', '').trim();
  const num = Number(str);
  if (isNaN(num)) return null;
  return Math.round(num * 100) / 100;
};

const parseBool = (value: any): boolean | null => {
  if (value == null || value === '') return null;
  const v = String(value).trim().toUpperCase();
  if (v === 'Y' || v === 'YES' || v === '1' || v === 'TRUE') return true;
  if (v === 'N' || v === 'NO' || v === '0' || v === 'FALSE') return false;
  return null;
};

const cleanStr = (value: any): string | null => {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
};

async function importHsAdmissions() {
  console.log('Starting HS Admissions & Programs import...');
  console.log('Source: NYC DOE Fall 2025 HS Directory Data (official)');
  console.log('');

  const excelPath = 'attached_assets/fall-2025-hs-directory-data.xlsx';
  const jsonPath = 'attached_assets/hs_directory.json';

  const wb = XLSX.readFile(excelPath);
  const ws = wb.Sheets['Data'];
  const excelRows: any[] = XLSX.utils.sheet_to_json(ws);
  console.log(`Excel: ${excelRows.length} schools loaded`);

  let jsonData: any[] = [];
  try {
    jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`JSON: ${jsonData.length} schools loaded (for offer rates)`);
  } catch (e) {
    console.log('JSON file not available, continuing without offer rates');
  }

  const jsonByDbn = new Map<string, any>();
  jsonData.forEach(r => {
    if (r.dbn) jsonByDbn.set(r.dbn, r);
  });

  await db.delete(hsAdmissionsProgram);
  console.log('Cleared existing HS admissions data');

  let totalPrograms = 0;
  let totalSchools = 0;
  const records: any[] = [];

  for (const row of excelRows) {
    const dbn = cleanStr(row.dbn);
    if (!dbn) continue;

    const schoolName = cleanStr(row.school_name);
    const overviewParagraph = cleanStr(row.overview_paragraph);
    const isSpecialized = cleanStr(row.specialized);

    const acadOps: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const ao = cleanStr(row[`academicopportunities${i}`]);
      if (ao) acadOps.push(ao);
    }
    const academicOpportunities = acadOps.length > 0 ? acadOps.join(' | ') : null;

    const jsonRow = jsonByDbn.get(dbn);

    let schoolHasPrograms = false;

    for (let n = 1; n <= 11; n++) {
      const programName = cleanStr(row[`program${n}`]);
      if (!programName) continue;

      schoolHasPrograms = true;

      const specializedCode = cleanStr(row[`code${n}`]);
      const specializedApplicants = parseNum(row[`applicants${n}specialized`]);
      const specializedSeats = parseNum(row[`seats${n}specialized`]);
      const specializedAppsPerSeat = parseFloat(row[`appperseat${n}specialized`]);
      const hasSpecialized = specializedCode != null && specializedApplicants != null;

      let offerRate1: string | null = null;
      let offerRate2: string | null = null;
      let offerRate3: string | null = null;

      if (jsonRow) {
        offerRate1 = cleanStr(jsonRow[`offer_rate1_${n}`]);
        offerRate2 = cleanStr(jsonRow[`offer_rate2_${n}`]);
        offerRate3 = cleanStr(jsonRow[`offer_rate3_${n}`]);
      }

      let priority1 = cleanStr(row[`priority1_prog${n}`]);
      let priority2 = cleanStr(row[`priority2_prog${n}`]);
      let priority3 = cleanStr(row[`priority3_prog${n}`]);

      if (!priority1 && jsonRow) {
        priority1 = cleanStr(jsonRow[`admissionspriority1${n}`]);
        if (priority1) priority1 = priority1.replace(/^Priority to /i, '').replace(/^Then to /i, '');
      }
      if (!priority2 && jsonRow) {
        priority2 = cleanStr(jsonRow[`admissionspriority2${n}`]);
        if (priority2) priority2 = priority2.replace(/^Priority to /i, '').replace(/^Then to /i, '');
      }
      if (!priority3 && jsonRow) {
        priority3 = cleanStr(jsonRow[`admissionspriority3${n}`]);
        if (priority3) priority3 = priority3.replace(/^Priority to /i, '').replace(/^Then to /i, '');
      }

      let auditionInfo: string | null = null;
      if (jsonRow) {
        auditionInfo = cleanStr(jsonRow[`auditioninformation${n}`]);
      }
      if (!auditionInfo) {
        auditionInfo = cleanStr(row[`auditioninformation${n}`]);
      }

      records.push({
        dbn,
        program_number: n,
        program_name: programName,
        interest_area: cleanStr(row[`interest${n}`]),
        program_description: cleanStr(row[`prgdesc${n}`]),
        eligibility: cleanStr(row[`eligibility${n}`]),
        admission_method: cleanStr(row[`method${n}`]),
        grade9_ge_applicants: parseNum(row[`grade9geapplicants${n}`]),
        grade9_swd_applicants: parseNum(row[`grade9swdapplicants${n}`]),
        seats_ge: parseNum(row[`seats9ge${n}`]),
        seats_swd: parseNum(row[`seats9swd${n}`]),
        applicants_per_seat_ge: parseFloat(row[`grade9geapplicantsperseat${n}`]),
        applicants_per_seat_swd: parseFloat(row[`grade9swdapplicantsperseat${n}`]),
        filled_flag_ge: parseBool(row[`grade9gefilledflag${n}`]),
        filled_flag_swd: parseBool(row[`grade9swdfilledflag${n}`]),
        seats_10plus: parseNum(row[`seats10${n}`]),
        requirement_1: cleanStr(row[`requirement_1_${n}`]),
        requirement_2: cleanStr(row[`requirement_2_${n}`]),
        requirement_3: cleanStr(row[`requirement_3_${n}`]),
        requirement_4: cleanStr(row[`requirement_4_${n}`]),
        audition_info: auditionInfo,
        priority_1: priority1,
        priority_2: priority2,
        priority_3: priority3,
        offer_rate_1: offerRate1,
        offer_rate_2: offerRate2,
        offer_rate_3: offerRate3,
        specialized_code: specializedCode,
        specialized_applicants: specializedApplicants,
        specialized_seats: specializedSeats,
        specialized_apps_per_seat: specializedAppsPerSeat,
        is_specialized: hasSpecialized || (isSpecialized === 'Yes' || isSpecialized === 'Y'),
        school_name: schoolName,
        overview_paragraph: n === 1 ? overviewParagraph : null,
        academic_opportunities: n === 1 ? academicOpportunities : null,
        data_year: '2025-26',
        data_source: 'NYC DOE HS Directory',
      });

      totalPrograms++;
    }

    if (schoolHasPrograms) totalSchools++;
  }

  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await db.insert(hsAdmissionsProgram).values(batch);
  }

  console.log(`\nImport complete!`);
  console.log(`Schools: ${totalSchools}`);
  console.log(`Programs: ${totalPrograms}`);

  const methods = new Map<string, number>();
  records.forEach(r => {
    if (r.admission_method) {
      methods.set(r.admission_method, (methods.get(r.admission_method) || 0) + 1);
    }
  });
  console.log('\nAdmission methods:');
  [...methods.entries()].sort((a, b) => b[1] - a[1]).forEach(([m, c]) => {
    console.log(`  ${m}: ${c}`);
  });

  const specializedCount = records.filter(r => r.is_specialized).length;
  console.log(`\nSpecialized HS programs: ${specializedCount}`);

  process.exit(0);
}

importHsAdmissions().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
