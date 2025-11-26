import { db } from "../server/db";
import { schools } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";

async function updateEnrollment() {
  const enrollmentData = JSON.parse(fs.readFileSync('/tmp/enrollment_data.json', 'utf-8'));
  
  console.log(`Updating enrollment for ${enrollmentData.length} schools...`);
  
  let updated = 0;
  let notFound = 0;
  
  for (const { dbn, enrollment } of enrollmentData) {
    const result = await db
      .update(schools)
      .set({ enrollment })
      .where(eq(schools.dbn, dbn))
      .returning({ dbn: schools.dbn });
    
    if (result.length > 0) {
      updated++;
    } else {
      notFound++;
    }
    
    if ((updated + notFound) % 200 === 0) {
      console.log(`Progress: ${updated + notFound}/${enrollmentData.length} (${updated} updated, ${notFound} not found)`);
    }
  }
  
  console.log(`\nComplete! Updated: ${updated}, Not found: ${notFound}`);
  process.exit(0);
}

updateEnrollment().catch(console.error);
