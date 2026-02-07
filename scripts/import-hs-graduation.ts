import XLSX from 'xlsx';
import { db } from '../server/db';
import { hsGraduation, schools } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

const parsePct = (value: any): number | null => {
  if (value == null || value === '' || value === 's' || value === 'N/A' || value === '-') return null;
  const str = String(value).replace('%', '').trim();
  const num = Number(str);
  if (isNaN(num)) return null;
  return Math.round(num * 10) / 10;
};

const parseCount = (value: any): number | null => {
  if (value == null || value === '' || value === 's' || value === 'N/A' || value === '-') return null;
  const num = Number(String(value).replace(',', '').trim());
  if (isNaN(num)) return null;
  return Math.round(num);
};

interface GradRecord {
  dbn: string;
  cohort_year: number;
  cohort_label: string;
  total_cohort: number | null;
  grad_rate_4yr: number | null;
  grad_rate_5yr: number | null;
  grad_rate_6yr: number | null;
  dropout_rate: number | null;
  still_enrolled_rate: number | null;
  diploma_regents_pct: number | null;
  diploma_advanced_regents_pct: number | null;
  diploma_local_pct: number | null;
  grad_rate_male: number | null;
  grad_rate_female: number | null;
  grad_rate_asian: number | null;
  grad_rate_black: number | null;
  grad_rate_hispanic: number | null;
  grad_rate_white: number | null;
  grad_rate_ell: number | null;
  grad_rate_swd: number | null;
  grad_rate_econ_disadv: number | null;
}

async function importHSGraduation() {
  console.log('Starting HS graduation data import from official NYC DOE InfoHub data...');
  console.log('Source: https://infohub.nyced.org/reports/academics/graduation-results');
  console.log('');

  const filePath = process.argv[2] || 'attached_assets/graduation-results-school.xlsx';

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.readFile(filePath);
  } catch (err) {
    console.error(`Could not read file: ${filePath}`);
    console.error('Download from: https://infohub.nyced.org/reports/academics/graduation-results');
    process.exit(1);
  }

  console.log('Available sheets:', wb.SheetNames);

  const existingSchools = await db.select({ dbn: schools.dbn }).from(schools);
  const schoolDbns = new Set(existingSchools.map(s => s.dbn.toUpperCase()));
  console.log(`Found ${schoolDbns.size} schools in database`);

  const records = new Map<string, GradRecord>();
  const key = (dbn: string, year: number) => `${dbn}|${year}`;

  const getOrCreate = (dbn: string, cohortYear: number): GradRecord => {
    const k = key(dbn, cohortYear);
    if (!records.has(k)) {
      records.set(k, {
        dbn,
        cohort_year: cohortYear,
        cohort_label: `Class of ${cohortYear + 4}`,
        total_cohort: null,
        grad_rate_4yr: null,
        grad_rate_5yr: null,
        grad_rate_6yr: null,
        dropout_rate: null,
        still_enrolled_rate: null,
        diploma_regents_pct: null,
        diploma_advanced_regents_pct: null,
        diploma_local_pct: null,
        grad_rate_male: null,
        grad_rate_female: null,
        grad_rate_asian: null,
        grad_rate_black: null,
        grad_rate_hispanic: null,
        grad_rate_white: null,
        grad_rate_ell: null,
        grad_rate_swd: null,
        grad_rate_econ_disadv: null,
      });
    }
    return records.get(k)!;
  };

  console.log('\n--- Processing "All" sheet (main graduation rates) ---');
  const allSheet = wb.Sheets['All'];
  if (allSheet) {
    const rows = XLSX.utils.sheet_to_json(allSheet) as any[];
    console.log(`  ${rows.length} rows`);

    let processed = 0;
    for (const row of rows) {
      const dbn = String(row['DBN'] || '').trim().toUpperCase();
      if (!dbn || !schoolDbns.has(dbn)) continue;

      const cohortYear = Number(row['Cohort Year']);
      if (!cohortYear || isNaN(cohortYear)) continue;

      const cohortType = String(row['Cohort'] || '').toLowerCase();
      const gradPct = parsePct(row['% Grads']);
      const dropoutPct = parsePct(row['% Dropout']);
      const stillEnrolledPct = parsePct(row['% Still Enrolled']);
      const totalCohort = parseCount(row['# Total Cohort']);

      const advRegentsPctCohort = parsePct(row['% Advanced Regents of Cohort']);
      const regentsWithoutAdvPctCohort = parsePct(row['% Regents without Advanced of Cohort']);
      const localPctCohort = parsePct(row['% Local of Cohort']);

      const rec = getOrCreate(dbn, cohortYear);

      if (cohortType.includes('4 year') && cohortType.includes('august')) {
        rec.grad_rate_4yr = gradPct;
        rec.dropout_rate = dropoutPct;
        rec.still_enrolled_rate = stillEnrolledPct;
        rec.total_cohort = totalCohort;
        rec.diploma_advanced_regents_pct = advRegentsPctCohort;
        rec.diploma_regents_pct = regentsWithoutAdvPctCohort;
        rec.diploma_local_pct = localPctCohort;
      } else if (cohortType.includes('5 year') && cohortType.includes('august')) {
        rec.grad_rate_5yr = gradPct;
      } else if (cohortType.includes('6 year') && cohortType.includes('august')) {
        rec.grad_rate_6yr = gradPct;
      } else if (cohortType.includes('4 year') && cohortType.includes('june') && rec.grad_rate_4yr === null) {
        rec.grad_rate_4yr = gradPct;
        rec.dropout_rate = dropoutPct;
        rec.still_enrolled_rate = stillEnrolledPct;
        rec.total_cohort = totalCohort;
        rec.diploma_advanced_regents_pct = advRegentsPctCohort;
        rec.diploma_regents_pct = regentsWithoutAdvPctCohort;
        rec.diploma_local_pct = localPctCohort;
      } else if (cohortType.includes('5 year') && cohortType.includes('june') && rec.grad_rate_5yr === null) {
        rec.grad_rate_5yr = gradPct;
      } else if (cohortType.includes('6 year') && cohortType.includes('june') && rec.grad_rate_6yr === null) {
        rec.grad_rate_6yr = gradPct;
      }

      processed++;
    }
    console.log(`  Processed ${processed} rows into ${records.size} unique school-cohort records`);
  }

  console.log('\n--- Processing "Gender" sheet ---');
  const genderSheet = wb.Sheets['Gender'];
  if (genderSheet) {
    const rows = XLSX.utils.sheet_to_json(genderSheet) as any[];
    console.log(`  ${rows.length} rows`);
    let matched = 0;
    for (const row of rows) {
      const dbn = String(row['DBN'] || '').trim().toUpperCase();
      const cohortYear = Number(row['Cohort Year']);
      const cohortType = String(row['Cohort'] || '').toLowerCase();
      const category = String(row['Category'] || '').toLowerCase();

      if (!cohortType.includes('4 year') || !cohortType.includes('august')) continue;

      const k = key(dbn, cohortYear);
      const rec = records.get(k);
      if (!rec) continue;

      const gradPct = parsePct(row['% Grads']);
      if (gradPct === null) continue;

      if (category === 'male') { rec.grad_rate_male = gradPct; matched++; }
      else if (category === 'female') { rec.grad_rate_female = gradPct; matched++; }
    }
    console.log(`  Matched ${matched} gender records`);
  }

  console.log('\n--- Processing "Ethnicity" sheet ---');
  const ethSheet = wb.Sheets['Ethnicity'];
  if (ethSheet) {
    const rows = XLSX.utils.sheet_to_json(ethSheet) as any[];
    console.log(`  ${rows.length} rows`);
    let matched = 0;
    for (const row of rows) {
      const dbn = String(row['DBN'] || '').trim().toUpperCase();
      const cohortYear = Number(row['Cohort Year']);
      const cohortType = String(row['Cohort'] || '').toLowerCase();
      const category = String(row['Category'] || '').toLowerCase();

      if (!cohortType.includes('4 year') || !cohortType.includes('august')) continue;

      const k = key(dbn, cohortYear);
      const rec = records.get(k);
      if (!rec) continue;

      const gradPct = parsePct(row['% Grads']);
      if (gradPct === null) continue;

      if (category.includes('asian')) { rec.grad_rate_asian = gradPct; matched++; }
      else if (category.includes('black')) { rec.grad_rate_black = gradPct; matched++; }
      else if (category.includes('hispanic')) { rec.grad_rate_hispanic = gradPct; matched++; }
      else if (category.includes('white')) { rec.grad_rate_white = gradPct; matched++; }
    }
    console.log(`  Matched ${matched} ethnicity records`);
  }

  console.log('\n--- Processing "ELL" sheet ---');
  const ellSheet = wb.Sheets['ELL'];
  if (ellSheet) {
    const rows = XLSX.utils.sheet_to_json(ellSheet) as any[];
    console.log(`  ${rows.length} rows`);
    let matched = 0;
    for (const row of rows) {
      const dbn = String(row['DBN'] || '').trim().toUpperCase();
      const cohortYear = Number(row['Cohort Year']);
      const cohortType = String(row['Cohort'] || '').toLowerCase();
      const category = String(row['Category'] || '').toLowerCase();

      if (!cohortType.includes('4 year') || !cohortType.includes('august')) continue;

      const k = key(dbn, cohortYear);
      const rec = records.get(k);
      if (!rec) continue;

      const gradPct = parsePct(row['% Grads']);
      if (gradPct === null) continue;

      if (category.includes('english language learner') || category === 'ell' || category === 'yes') {
        rec.grad_rate_ell = gradPct; matched++;
      }
    }
    console.log(`  Matched ${matched} ELL records`);
  }

  console.log('\n--- Processing "SWD" sheet ---');
  const swdSheet = wb.Sheets['SWD'];
  if (swdSheet) {
    const rows = XLSX.utils.sheet_to_json(swdSheet) as any[];
    console.log(`  ${rows.length} rows`);
    let matched = 0;
    for (const row of rows) {
      const dbn = String(row['DBN'] || '').trim().toUpperCase();
      const cohortYear = Number(row['Cohort Year']);
      const cohortType = String(row['Cohort'] || '').toLowerCase();
      const category = String(row['Category'] || '').toLowerCase();

      if (!cohortType.includes('4 year') || !cohortType.includes('august')) continue;

      const k = key(dbn, cohortYear);
      const rec = records.get(k);
      if (!rec) continue;

      const gradPct = parsePct(row['% Grads']);
      if (gradPct === null) continue;

      if (category.includes('student with disability') || category === 'swd' || category === 'yes') {
        rec.grad_rate_swd = gradPct; matched++;
      }
    }
    console.log(`  Matched ${matched} SWD records`);
  }

  console.log('\n--- Processing "Poverty" sheet ---');
  const povSheet = wb.Sheets['Poverty'];
  if (povSheet) {
    const rows = XLSX.utils.sheet_to_json(povSheet) as any[];
    console.log(`  ${rows.length} rows`);
    let matched = 0;
    for (const row of rows) {
      const dbn = String(row['DBN'] || '').trim().toUpperCase();
      const cohortYear = Number(row['Cohort Year']);
      const cohortType = String(row['Cohort'] || '').toLowerCase();
      const category = String(row['Category'] || '').toLowerCase();

      if (!cohortType.includes('4 year') || !cohortType.includes('august')) continue;

      const k = key(dbn, cohortYear);
      const rec = records.get(k);
      if (!rec) continue;

      const gradPct = parsePct(row['% Grads']);
      if (gradPct === null) continue;

      if (category.includes('econ') || category.includes('economically') || category.includes('poverty') || category === 'yes') {
        rec.grad_rate_econ_disadv = gradPct; matched++;
      }
    }
    console.log(`  Matched ${matched} poverty records`);
  }

  console.log(`\n--- Inserting ${records.size} graduation records into database ---`);

  let inserted = 0;
  let errors = 0;
  const batch: any[] = [];

  for (const rec of records.values()) {
    if (rec.grad_rate_4yr === null && rec.grad_rate_5yr === null && rec.grad_rate_6yr === null) continue;

    batch.push({
      ...rec,
      data_source: 'NYC DOE InfoHub',
    });

    if (batch.length >= 500) {
      try {
        await db.insert(hsGraduation).values(batch).onConflictDoNothing();
        inserted += batch.length;
      } catch (err) {
        console.error('Batch insert error:', err);
        errors += batch.length;
      }
      batch.length = 0;
      process.stdout.write(`  Inserted ${inserted} records...\r`);
    }
  }

  if (batch.length > 0) {
    try {
      await db.insert(hsGraduation).values(batch).onConflictDoNothing();
      inserted += batch.length;
    } catch (err) {
      console.error('Final batch insert error:', err);
      errors += batch.length;
    }
  }

  console.log(`\nImport complete: ${inserted} records inserted, ${errors} errors`);
  process.exit(0);
}

importHSGraduation().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
