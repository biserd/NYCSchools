import { db } from '../server/db';
import { schools } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';

interface SchoolLocation {
  system_code?: string;
  location_code?: string;
  principal_name?: string;
  principal_phone_number?: string;
  status_descriptions?: string;
}

async function importSchoolContacts() {
  console.log('Reading NYC school locations JSON...');
  
  const jsonContent = readFileSync('./attached_assets/nyc_school_locations.json', 'utf-8');
  const records: SchoolLocation[] = JSON.parse(jsonContent);
  
  console.log(`Found ${records.length} total records in locations data`);
  
  const openSchools = records.filter(s => (s.status_descriptions || '').includes('Open'));
  console.log(`Open schools: ${openSchools.length}`);
  
  const allDbSchools = await db.select({ dbn: schools.dbn }).from(schools);
  const dbDbnSet = new Set(allDbSchools.map(s => s.dbn.toUpperCase()));
  console.log(`Schools in database: ${dbDbnSet.size}`);
  
  let updated = 0;
  let notFound = 0;
  let skipped = 0;
  
  for (const row of records) {
    const systemCode = row.system_code?.trim().toUpperCase();
    const principalName = row.principal_name?.trim();
    const phone = row.principal_phone_number?.trim();
    
    if (!systemCode || systemCode === '') {
      skipped++;
      continue;
    }
    
    if (!principalName && !phone) {
      skipped++;
      continue;
    }
    
    if (!dbDbnSet.has(systemCode)) {
      notFound++;
      continue;
    }
    
    await db.update(schools)
      .set({
        principal_name: principalName || null,
        phone: phone || null,
      })
      .where(eq(schools.dbn, systemCode));
    
    updated++;
    
    if (updated % 200 === 0) {
      console.log(`Updated ${updated} schools...`);
    }
  }
  
  console.log(`\nImport complete:`);
  console.log(`- Updated: ${updated} schools`);
  console.log(`- Not found in DB: ${notFound}`);
  console.log(`- Skipped (no data): ${skipped}`);
  
  const stillMissing = await db.select({ dbn: schools.dbn, name: schools.school_name })
    .from(schools)
    .where(eq(schools.principal_name, ''));
  
  console.log(`\nSchools still missing contact info: check database for NULL principal_name`);
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
