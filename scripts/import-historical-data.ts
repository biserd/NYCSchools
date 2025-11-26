import XLSX from 'xlsx';
import { db } from '../server/db';
import { schoolHistoricalScores, schools } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

interface ScoreData {
  dbn: string;
  year: number;
  ela_proficiency: number | null;
  math_proficiency: number | null;
}

async function importHistoricalData() {
  console.log('Starting historical data import...');
  
  // Get list of schools we have in the database to match DBNs
  const existingSchools = await db.select({ dbn: schools.dbn }).from(schools);
  const schoolDbns = new Set(existingSchools.map(s => s.dbn.toUpperCase()));
  console.log(`Found ${schoolDbns.size} schools in database`);

  // Read ELA data
  console.log('\nReading ELA data...');
  const elaWb = XLSX.readFile('attached_assets/school-ela-results-2018-2025.xlsx');
  const elaSheet = elaWb.Sheets['ELA - All'];
  const elaData = XLSX.utils.sheet_to_json(elaSheet) as any[];
  
  // Read Math data
  console.log('Reading Math data...');
  const mathWb = XLSX.readFile('attached_assets/school-math-results-2018-2025.xlsx');
  const mathSheet = mathWb.Sheets['Math - All'];
  const mathData = XLSX.utils.sheet_to_json(mathSheet) as any[];

  // Filter to only "All Grades" and "All Students" rows
  const elaFiltered = elaData.filter(row => 
    row['Grade'] === 'All Grades' && 
    row['Category'] === 'All Students' &&
    row['DBN'] &&
    row['Year']
  );
  console.log(`Filtered ELA rows: ${elaFiltered.length}`);

  const mathFiltered = mathData.filter(row => 
    row['Grade'] === 'All Grades' && 
    row['Category'] === 'All Students' &&
    row['DBN'] &&
    row['Year']
  );
  console.log(`Filtered Math rows: ${mathFiltered.length}`);

  // Create a map to combine ELA and Math data by DBN+Year
  const scoreMap = new Map<string, ScoreData>();

  // Helper to safely parse proficiency
  const parseProficiency = (value: any): number | null => {
    if (value == null || value === '' || value === 's' || value === 'N/A') return null;
    const num = Number(value);
    if (isNaN(num)) return null;
    return Math.round(num);
  };

  // Process ELA data
  for (const row of elaFiltered) {
    const dbn = String(row['DBN']).toUpperCase();
    const year = Number(row['Year']);
    
    if (!schoolDbns.has(dbn)) continue; // Skip schools not in our database
    if (isNaN(year)) continue;
    
    const key = `${dbn}-${year}`;
    if (!scoreMap.has(key)) {
      scoreMap.set(key, { dbn, year, ela_proficiency: null, math_proficiency: null });
    }
    const score = scoreMap.get(key)!;
    score.ela_proficiency = parseProficiency(row['% Level 3+4']);
  }

  // Process Math data
  for (const row of mathFiltered) {
    const dbn = String(row['DBN']).toUpperCase();
    const year = Number(row['Year']);
    
    if (!schoolDbns.has(dbn)) continue;
    if (isNaN(year)) continue;
    
    const key = `${dbn}-${year}`;
    if (!scoreMap.has(key)) {
      scoreMap.set(key, { dbn, year, ela_proficiency: null, math_proficiency: null });
    }
    const score = scoreMap.get(key)!;
    score.math_proficiency = parseProficiency(row['% Level 3+4']);
  }

  console.log(`\nTotal combined score records: ${scoreMap.size}`);

  // Filter out records with no data
  const validScores = Array.from(scoreMap.values()).filter(
    s => s.ela_proficiency !== null || s.math_proficiency !== null
  );
  console.log(`Valid score records (with data): ${validScores.length}`);

  // Clear existing historical data
  console.log('Clearing existing historical data...');
  try {
    await db.delete(schoolHistoricalScores);
  } catch (e) {
    console.log('Note: table may be empty, continuing...');
  }

  // Insert in smaller batches with delays
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < validScores.length; i += BATCH_SIZE) {
    const batch = validScores.slice(i, i + BATCH_SIZE);
    try {
      await db.insert(schoolHistoricalScores).values(batch);
      inserted += batch.length;
      if (inserted % 500 === 0 || i + BATCH_SIZE >= validScores.length) {
        console.log(`Inserted ${inserted}/${validScores.length} records...`);
      }
    } catch (err) {
      console.error(`Error inserting batch at ${i}:`, err);
      throw err;
    }
    // Small delay to avoid overwhelming connection
    await new Promise(r => setTimeout(r, 50));
  }

  // Show sample data
  console.log('\n=== Sample Data ===');
  const sampleSchools = ['02M475', '01M539', '02M051']; // Stuyvesant, NEST+M, PS 51
  for (const dbn of sampleSchools) {
    const history = await db.select()
      .from(schoolHistoricalScores)
      .where(eq(schoolHistoricalScores.dbn, dbn))
      .orderBy(schoolHistoricalScores.year);
    
    if (history.length > 0) {
      console.log(`\n${dbn}:`);
      for (const h of history) {
        console.log(`  ${h.year}: ELA=${h.ela_proficiency}%, Math=${h.math_proficiency}%`);
      }
    }
  }

  // Show statistics
  const totalRecords = await db.select().from(schoolHistoricalScores);
  const yearsSet = new Set(totalRecords.map(r => r.year));
  console.log(`\n=== Import Complete ===`);
  console.log(`Total records: ${totalRecords.length}`);
  console.log(`Years covered: ${Array.from(yearsSet).sort().join(', ')}`);
  console.log(`Schools with history: ${new Set(totalRecords.map(r => r.dbn)).size}`);
}

importHistoricalData()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Import failed:', err);
    process.exit(1);
  });
