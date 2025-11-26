import XLSX from 'xlsx';
import { db } from '../server/db';
import { schools } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

interface BilingualProgram {
  dbn: string;
  schoolName: string;
  program: 'Dual Language' | 'Transitional Bilingual Education';
  language: string;
}

async function importDualLanguageData() {
  console.log('Reading bilingual program data...');
  
  const workbook = XLSX.readFile('/tmp/bilingual-program-list.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
  
  // Skip header row, parse programs
  const programs: BilingualProgram[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue;
    
    programs.push({
      dbn: row[2],
      schoolName: row[3],
      program: row[5] as 'Dual Language' | 'Transitional Bilingual Education',
      language: row[6],
    });
  }
  
  console.log(`Parsed ${programs.length} program entries`);
  
  // Group by school DBN
  const schoolPrograms = new Map<string, {
    hasDualLanguage: boolean;
    hasTransitionalBilingual: boolean;
    dualLanguageLanguages: Set<string>;
  }>();
  
  for (const program of programs) {
    if (!schoolPrograms.has(program.dbn)) {
      schoolPrograms.set(program.dbn, {
        hasDualLanguage: false,
        hasTransitionalBilingual: false,
        dualLanguageLanguages: new Set(),
      });
    }
    
    const school = schoolPrograms.get(program.dbn)!;
    
    if (program.program === 'Dual Language') {
      school.hasDualLanguage = true;
      school.dualLanguageLanguages.add(program.language);
    } else if (program.program === 'Transitional Bilingual Education') {
      school.hasTransitionalBilingual = true;
    }
  }
  
  console.log(`Found ${schoolPrograms.size} unique schools with bilingual programs`);
  
  // Get all languages for reference
  const allLanguages = new Set<string>();
  for (const [, data] of schoolPrograms) {
    for (const lang of data.dualLanguageLanguages) {
      allLanguages.add(lang);
    }
  }
  console.log('Languages found:', [...allLanguages].sort().join(', '));
  
  // Update database
  let updatedCount = 0;
  let notFoundCount = 0;
  const notFoundDBNs: string[] = [];
  
  for (const [dbn, data] of schoolPrograms) {
    // Check if school exists
    const existingSchool = await db.select({ dbn: schools.dbn })
      .from(schools)
      .where(eq(schools.dbn, dbn))
      .limit(1);
    
    if (existingSchool.length === 0) {
      notFoundCount++;
      notFoundDBNs.push(dbn);
      continue;
    }
    
    // Update the school
    await db.update(schools)
      .set({
        has_dual_language: data.hasDualLanguage,
        has_transitional_bilingual: data.hasTransitionalBilingual,
        dual_language_languages: data.hasDualLanguage ? [...data.dualLanguageLanguages] : null,
      })
      .where(eq(schools.dbn, dbn));
    
    updatedCount++;
  }
  
  console.log(`\nResults:`);
  console.log(`- Updated: ${updatedCount} schools`);
  console.log(`- Not found in database: ${notFoundCount} schools`);
  
  if (notFoundDBNs.length > 0 && notFoundDBNs.length <= 20) {
    console.log('DBNs not found:', notFoundDBNs.join(', '));
  }
  
  // Show some statistics
  const dualLangCount = [...schoolPrograms.values()].filter(s => s.hasDualLanguage).length;
  const tbeCount = [...schoolPrograms.values()].filter(s => s.hasTransitionalBilingual).length;
  console.log(`\nProgram breakdown:`);
  console.log(`- Dual Language: ${dualLangCount} schools`);
  console.log(`- Transitional Bilingual: ${tbeCount} schools`);
  
  // Language breakdown
  const langCounts = new Map<string, number>();
  for (const [, data] of schoolPrograms) {
    for (const lang of data.dualLanguageLanguages) {
      langCounts.set(lang, (langCounts.get(lang) || 0) + 1);
    }
  }
  console.log(`\nDual Language by language:`);
  [...langCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([lang, count]) => {
      console.log(`  ${lang}: ${count} schools`);
    });
}

importDualLanguageData()
  .then(() => {
    console.log('\nImport completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
