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

async function importHSGraduation() {
  console.log('Starting HS graduation data import...');
  console.log('');
  console.log('USAGE: Place the InfoHub graduation Excel file in attached_assets/');
  console.log('Expected file: attached_assets/graduation-results.xlsx');
  console.log('Download from: https://infohub.nyced.org/reports/academics/graduation-results');
  console.log('');

  const filePath = process.argv[2] || 'attached_assets/graduation-results.xlsx';

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.readFile(filePath);
  } catch (err) {
    console.error(`Could not read file: ${filePath}`);
    console.error('Please provide the path to the InfoHub graduation Excel file as an argument.');
    console.error('Example: npx tsx scripts/import-hs-graduation.ts attached_assets/graduation-results.xlsx');
    process.exit(1);
  }

  console.log('Available sheets:', wb.SheetNames);

  const existingSchools = await db.select({ dbn: schools.dbn }).from(schools);
  const schoolDbns = new Set(existingSchools.map(s => s.dbn.toUpperCase()));
  console.log(`Found ${schoolDbns.size} schools in database`);

  let totalImported = 0;
  let totalSkipped = 0;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];
    
    if (rows.length === 0) continue;

    const sampleRow = rows[0];
    const headers = Object.keys(sampleRow);
    console.log(`\nSheet "${sheetName}": ${rows.length} rows`);
    console.log('Sample headers:', headers.slice(0, 15).join(', '));

    const dbnCol = headers.find(h => /^dbn$/i.test(h)) || headers.find(h => /dbn/i.test(h));
    if (!dbnCol) {
      console.log(`  Skipping sheet - no DBN column found`);
      continue;
    }

    const cohortCol = headers.find(h => /cohort.*year/i.test(h)) || headers.find(h => /cohort/i.test(h)) || headers.find(h => /^year$/i.test(h));
    const totalCohortCol = headers.find(h => /total.*cohort/i.test(h)) || headers.find(h => /^cohort.*size/i.test(h)) || headers.find(h => /^#.*cohort/i.test(h));
    
    const findCol = (patterns: RegExp[]) => {
      for (const p of patterns) {
        const found = headers.find(h => p.test(h));
        if (found) return found;
      }
      return undefined;
    };

    const grad4yrCol = findCol([/4.*year.*grad/i, /grad.*rate.*4/i, /4.*yr/i, /four.*year/i]);
    const grad5yrCol = findCol([/5.*year.*grad/i, /grad.*rate.*5/i, /5.*yr/i, /five.*year/i]);
    const grad6yrCol = findCol([/6.*year.*grad/i, /grad.*rate.*6/i, /6.*yr/i, /six.*year/i]);
    const dropoutCol = findCol([/dropout/i, /drop.*out/i]);
    const stillEnrolledCol = findCol([/still.*enrolled/i, /enrolled/i]);
    const regentsDiplomaCol = findCol([/regent.*diploma(?!.*adv)/i, /^regent.*%/i]);
    const advRegentsCol = findCol([/adv.*regent/i, /advanced.*regent/i]);
    const localDiplomaCol = findCol([/local.*diploma/i, /local/i]);

    console.log(`  Columns found: DBN=${dbnCol}, Cohort=${cohortCol}, 4yr=${grad4yrCol}, 5yr=${grad5yrCol}, 6yr=${grad6yrCol}`);

    for (const row of rows) {
      const dbn = String(row[dbnCol] || '').trim().toUpperCase();
      if (!dbn || !schoolDbns.has(dbn)) {
        totalSkipped++;
        continue;
      }

      let cohortYear = 0;
      if (cohortCol) {
        const rawCohort = String(row[cohortCol] || '');
        const yearMatch = rawCohort.match(/(\d{4})/);
        if (yearMatch) cohortYear = parseInt(yearMatch[1]);
      }
      if (!cohortYear) {
        totalSkipped++;
        continue;
      }

      const grad4yr = grad4yrCol ? parsePct(row[grad4yrCol]) : null;
      if (grad4yr === null && !grad5yrCol && !grad6yrCol) {
        totalSkipped++;
        continue;
      }

      const classYear = cohortYear + 4;

      await db
        .insert(hsGraduation)
        .values({
          dbn,
          cohort_year: cohortYear,
          cohort_label: `Class of ${classYear}`,
          total_cohort: totalCohortCol ? parseCount(row[totalCohortCol]) : null,
          grad_rate_4yr: grad4yr,
          grad_rate_5yr: grad5yrCol ? parsePct(row[grad5yrCol]) : null,
          grad_rate_6yr: grad6yrCol ? parsePct(row[grad6yrCol]) : null,
          dropout_rate: dropoutCol ? parsePct(row[dropoutCol]) : null,
          still_enrolled_rate: stillEnrolledCol ? parsePct(row[stillEnrolledCol]) : null,
          diploma_regents_pct: regentsDiplomaCol ? parsePct(row[regentsDiplomaCol]) : null,
          diploma_advanced_regents_pct: advRegentsCol ? parsePct(row[advRegentsCol]) : null,
          diploma_local_pct: localDiplomaCol ? parsePct(row[localDiplomaCol]) : null,
          data_source: 'NYC DOE InfoHub',
        })
        .onConflictDoNothing();
      
      totalImported++;
    }
  }

  console.log(`\nImport complete: ${totalImported} records imported, ${totalSkipped} skipped`);
  process.exit(0);
}

importHSGraduation().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
