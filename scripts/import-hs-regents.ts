import XLSX from 'xlsx';
import { db } from '../server/db';
import { hsRegents, schools } from '../shared/schema';
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

const normalizeExamName = (raw: string): string => {
  const s = raw.trim();
  if (/english/i.test(s) || /ela/i.test(s) || /comprehensive english/i.test(s)) return 'English';
  if (/algebra\s*(i|1)(?!\s*\/)/i.test(s) || /^algebra$/i.test(s) || /cc.*algebra/i.test(s)) return 'Algebra I';
  if (/geometry/i.test(s)) return 'Geometry';
  if (/algebra\s*(ii|2|\/trig)/i.test(s) || /trig/i.test(s)) return 'Algebra II / Trigonometry';
  if (/living.*env/i.test(s) || /biology/i.test(s)) return 'Living Environment';
  if (/earth.*sci/i.test(s)) return 'Earth Science';
  if (/chemistry/i.test(s)) return 'Chemistry';
  if (/physics/i.test(s)) return 'Physics';
  if (/global.*hist/i.test(s)) return 'Global History';
  if (/us.*hist/i.test(s) || /u\.s\./i.test(s) || /american.*hist/i.test(s)) return 'US History';
  return s;
};

async function importHSRegents() {
  console.log('Starting HS Regents exam data import...');
  console.log('');
  console.log('USAGE: Place the InfoHub Regents Excel file in attached_assets/');
  console.log('Expected file: attached_assets/regents-results.xlsx');
  console.log('Download from: https://infohub.nyced.org/reports/academics/test-results');
  console.log('');

  const filePath = process.argv[2] || 'attached_assets/regents-results.xlsx';

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.readFile(filePath);
  } catch (err) {
    console.error(`Could not read file: ${filePath}`);
    console.error('Please provide the path to the InfoHub Regents Excel file as an argument.');
    console.error('Example: npx tsx scripts/import-hs-regents.ts attached_assets/regents-results.xlsx');
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

    const headers = Object.keys(rows[0]);
    console.log(`\nSheet "${sheetName}": ${rows.length} rows`);
    console.log('Sample headers:', headers.slice(0, 15).join(', '));

    const dbnCol = headers.find(h => /^dbn$/i.test(h)) || headers.find(h => /dbn/i.test(h));
    if (!dbnCol) {
      console.log(`  Skipping sheet - no DBN column found`);
      continue;
    }

    const findCol = (patterns: RegExp[]) => {
      for (const p of patterns) {
        const found = headers.find(h => p.test(h));
        if (found) return found;
      }
      return undefined;
    };

    const yearCol = findCol([/^year$/i, /school.*year/i, /sy/i]);
    const examCol = findCol([/regents.*exam/i, /exam.*name/i, /subject/i, /^exam$/i, /test/i]);
    const totalTestedCol = findCol([/total.*tested/i, /number.*tested/i, /^n$/i, /^tested$/i, /num.*test/i]);
    const passRateCol = findCol([/pass.*rate/i, /pct.*pass/i, /%.*65/i, /scoring.*65/i, /65\+/i, /percent.*pass/i]);
    const collegeReadyCol = findCol([/college.*ready/i, /80\+/i, /scoring.*80/i, /pct.*80/i]);
    const masteryCol = findCol([/mastery/i, /90\+/i, /scoring.*90/i]);
    const meanScoreCol = findCol([/mean.*score/i, /avg.*score/i, /average/i]);

    console.log(`  Columns: DBN=${dbnCol}, Year=${yearCol}, Exam=${examCol}, PassRate=${passRateCol}`);

    const filterCol = headers.find(h => /category/i.test(h)) || headers.find(h => /group/i.test(h)) || headers.find(h => /demographic/i.test(h));
    
    for (const row of rows) {
      if (filterCol) {
        const category = String(row[filterCol] || '').trim();
        if (category && !/all.*student/i.test(category) && !/total/i.test(category)) {
          continue;
        }
      }

      const dbn = String(row[dbnCol] || '').trim().toUpperCase();
      if (!dbn || !schoolDbns.has(dbn)) {
        totalSkipped++;
        continue;
      }

      let year = 0;
      if (yearCol) {
        const rawYear = String(row[yearCol] || '');
        const yearMatch = rawYear.match(/(\d{4})/);
        if (yearMatch) year = parseInt(yearMatch[1]);
      }
      if (!year) {
        totalSkipped++;
        continue;
      }

      let examName = '';
      if (examCol) {
        examName = normalizeExamName(String(row[examCol] || ''));
      }
      if (!examName) {
        totalSkipped++;
        continue;
      }

      const passRate = passRateCol ? parsePct(row[passRateCol]) : null;
      if (passRate === null) {
        totalSkipped++;
        continue;
      }

      await db
        .insert(hsRegents)
        .values({
          dbn,
          year,
          exam_name: examName,
          total_tested: totalTestedCol ? parseCount(row[totalTestedCol]) : null,
          pass_rate: passRate,
          college_ready_rate: collegeReadyCol ? parsePct(row[collegeReadyCol]) : null,
          mastery_rate: masteryCol ? parsePct(row[masteryCol]) : null,
          mean_score: meanScoreCol ? parsePct(row[meanScoreCol]) : null,
          data_source: 'NYC DOE InfoHub',
        })
        .onConflictDoNothing();
      
      totalImported++;
    }
  }

  console.log(`\nImport complete: ${totalImported} records imported, ${totalSkipped} skipped`);
  process.exit(0);
}

importHSRegents().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
