import { db } from '../server/db';
import { schools } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';

interface LocationRecord {
  system_code?: string;
  primary_address_line_1?: string;
  state_code?: string;
}

async function updateAddresses() {
  console.log('Loading school locations...');
  
  const data: LocationRecord[] = JSON.parse(readFileSync('./attached_assets/nyc_school_locations.json', 'utf-8'));
  console.log(`Found ${data.length} records`);
  
  const allDbSchools = await db.select({ dbn: schools.dbn, address: schools.address }).from(schools);
  const dbSchoolsMap = new Map(allDbSchools.map(s => [s.dbn.toUpperCase(), s.address]));
  console.log(`Schools in database: ${dbSchoolsMap.size}`);
  
  let updated = 0;
  
  for (const loc of data) {
    const dbn = loc.system_code?.trim().toUpperCase();
    const streetAddress = loc.primary_address_line_1?.trim();
    
    if (!dbn || !streetAddress) continue;
    
    const currentAddress = dbSchoolsMap.get(dbn);
    if (!currentAddress || currentAddress === 'TBD' || currentAddress.length < 10) {
      const fullAddress = streetAddress + ', New York, NY';
      
      await db.update(schools)
        .set({ address: fullAddress })
        .where(eq(schools.dbn, dbn));
      
      updated++;
    }
  }
  
  console.log(`Updated ${updated} schools with proper addresses`);
}

updateAddresses()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
