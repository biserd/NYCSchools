import XLSX from 'xlsx';
import { db } from '../server/db';
import { hsRegents, schools } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

const parsePct = (value: any): number | null => {
  if (value == null || value === '' || value === 's' || value === 'N/A' || value === '-' || value === 'na') return null;
  const str = String(value).replace('%', '').trim();
  const num = Number(str);
  if (isNaN(num)) return null;
  return Math.round(num * 10) / 10;
};

const parseCount = (value: any): number | null => {
  if (value == null || value === '' || value === 's' || value === 'N/A' || value === '-' || value === 'na') return null;
  const num = Number(String(value).replace(',', '').trim());
  if (isNaN(num)) return null;
  return Math.round(num);
};

const normalizeExamName = (raw: string): string => {
  const s = raw.trim();
  if (/comprehensive english/i.test(s)) return 'English Language Arts';
  if (/^english/i.test(s) || /ela/i.test(s)) return 'English Language Arts';
  if (/cc\s*algebra\s*1/i.test(s) || /algebra\s*i(?!\s*i)/i.test(s) || /^algebra$/i.test(s)) return 'Algebra I';
  if (/cc\s*geometry/i.test(s) || /^geometry$/i.test(s)) return 'Geometry';
  if (/cc\s*algebra\s*2/i.test(s) || /algebra\s*(ii|2)/i.test(s) || /trig/i.test(s)) return 'Algebra II / Trigonometry';
  if (/living.*env/i.test(s) || /biology/i.test(s)) return 'Living Environment';
  if (/earth.*sci/i.test(s)) return 'Earth Science';
  if (/chemistry/i.test(s)) return 'Chemistry';
  if (/physics/i.test(s)) return 'Physics';
  if (/global.*hist.*geo\s*ii/i.test(s)) return 'Global History & Geography II';
  if (/global.*hist/i.test(s)) return 'Global History & Geography';
  if (/u\.?s\.?\s*hist/i.test(s) || /american.*hist/i.test(s)) return 'US History & Government';
  if (/framework/i.test(s) && /us/i.test(s)) return 'US History & Government';
  return s;
};

async function importHSRegents() {
  console.log('Starting HS Regents exam data import from official NYC DOE InfoHub data...');
  console.log('Source: https://infohub.nyced.org/reports/academics/test-results');
  console.log('');

  const filePath = process.argv[2] || 'attached_assets/regents-results.xlsx';

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.readFile(filePath);
  } catch (err) {
    console.error(`Could not read file: ${filePath}`);
    console.error('Download from: https://infohub.nyced.org/reports/academics/test-results');
    process.exit(1);
  }

  console.log('Available sheets:', wb.SheetNames);

  const existingSchools = await db.select({ dbn: schools.dbn }).from(schools);
  const schoolDbns = new Set(existingSchools.map(s => s.dbn.toUpperCase()));
  console.log(`Found ${schoolDbns.size} schools in database`);

  console.log('\n--- Processing "All Students" sheet ---');
  const sheet = wb.Sheets['All Students'];
  if (!sheet) {
    console.error('Could not find "All Students" sheet');
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(sheet) as any[];
  console.log(`  ${rows.length} rows`);

  if (rows.length > 0) {
    console.log('  Headers:', Object.keys(rows[0]).join(', '));
  }

  let totalImported = 0;
  let totalSkipped = 0;
  const batch: any[] = [];

  for (const row of rows) {
    const dbn = String(row['School DBN'] || '').trim().toUpperCase();
    if (!dbn || !schoolDbns.has(dbn)) {
      totalSkipped++;
      continue;
    }

    const category = String(row['Category'] || '').trim();
    if (category && !/all\s*students/i.test(category)) {
      continue;
    }

    const year = Number(row['Year']);
    if (!year || isNaN(year)) {
      totalSkipped++;
      continue;
    }

    const rawExam = String(row['Regents Exam'] || '').trim();
    if (!rawExam) {
      totalSkipped++;
      continue;
    }
    const examName = normalizeExamName(rawExam);

    const totalTested = parseCount(row['Total Tested']);
    const meanScore = parsePct(row['Mean Score']);
    const passRate = parsePct(row['Percent Scoring 65 or Above']);
    const collegeReadyRate = parsePct(row['Percent Scoring 80 or Above']);

    if (passRate === null && meanScore === null) {
      totalSkipped++;
      continue;
    }

    batch.push({
      dbn,
      year,
      exam_name: examName,
      total_tested: totalTested,
      pass_rate: passRate,
      college_ready_rate: collegeReadyRate,
      mastery_rate: null,
      mean_score: meanScore,
      data_source: 'NYC DOE InfoHub',
    });

    if (batch.length >= 500) {
      try {
        await db.insert(hsRegents).values(batch).onConflictDoNothing();
        totalImported += batch.length;
      } catch (err) {
        console.error('Batch insert error:', err);
      }
      batch.length = 0;
      process.stdout.write(`  Inserted ${totalImported} records...\r`);
    }
  }

  if (batch.length > 0) {
    try {
      await db.insert(hsRegents).values(batch).onConflictDoNothing();
      totalImported += batch.length;
    } catch (err) {
      console.error('Final batch insert error:', err);
    }
  }

  console.log(`\nImport complete: ${totalImported} records imported, ${totalSkipped} skipped`);
  process.exit(0);
}

importHSRegents().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
