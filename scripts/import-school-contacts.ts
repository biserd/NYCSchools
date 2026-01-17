import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from '../server/db';
import { schools } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function importSchoolContacts() {
  console.log('Reading LCGMS CSV file...');
  
  const csvContent = readFileSync('/tmp/lcgms_data.csv', 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Record<string, any>[];
  
  console.log(`Found ${records.length} rows in LCGMS data`);
  
  let updated = 0;
  let notFound = 0;
  let skipped = 0;
  
  for (const row of records) {
    // The LCGMS uses "ATS System Code" which is the DBN (e.g., 01M015)
    const dbn = row['ATS System Code']?.trim();
    const principalName = row['Principal Name']?.trim();
    const phone = row['Principal Phone Number']?.trim();
    
    if (!dbn || dbn === '') {
      skipped++;
      continue;
    }
    
    // Check if school exists in our database
    const existingSchool = await db.select({ dbn: schools.dbn }).from(schools).where(eq(schools.dbn, dbn)).limit(1);
    
    if (existingSchool.length === 0) {
      notFound++;
      continue;
    }
    
    // Update the school with contact info
    await db.update(schools)
      .set({
        principal_name: principalName || null,
        phone: phone || null,
      })
      .where(eq(schools.dbn, dbn));
    
    updated++;
    
    if (updated % 100 === 0) {
      console.log(`Updated ${updated} schools...`);
    }
  }
  
  console.log(`\nImport complete:`);
  console.log(`- Updated: ${updated} schools`);
  console.log(`- Not found in DB: ${notFound} schools`);
  console.log(`- Skipped (no DBN): ${skipped} schools`);
}

importSchoolContacts()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
