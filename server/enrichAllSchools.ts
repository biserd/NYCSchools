import { db } from "./db";
import { schools } from "@shared/schema";
import { fetchSnapshotData } from "./snapshotScraper";
import { eq } from "drizzle-orm";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function enrichAllSchools() {
  console.log("Starting school enrichment with NYC DOE Snapshot data");
  console.log("====================================================\n");
  
  const allSchools = await db.select({ dbn: schools.dbn, name: schools.name }).from(schools);
  console.log(`Found ${allSchools.length} schools to enrich\n`);
  
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  
  for (let i = 0; i < allSchools.length; i++) {
    const school = allSchools[i];
    const progress = `[${i + 1}/${allSchools.length}]`;
    
    try {
      console.log(`${progress} Fetching ${school.dbn} - ${school.name}`);
      
      const snapshotData = await fetchSnapshotData(school.dbn);
      
      if (!snapshotData) {
        console.log(`  ⚠️  No data available`);
        failCount++;
      } else {
        // Update school with snapshot data
        await db.update(schools)
          .set({
            economic_need_index: snapshotData.economicNeedIndex,
            attendance_rate: snapshotData.attendanceRate,
            quality_rating_instruction: snapshotData.qualityRatingInstruction,
            quality_rating_safety: snapshotData.qualityRatingSafety,
            quality_rating_family: snapshotData.qualityRatingFamily,
            principal_name: snapshotData.principalName,
            website: snapshotData.website,
            phone: snapshotData.phone,
            enrollment: snapshotData.enrollment ?? undefined,
            ela_proficiency: snapshotData.elaProficiency ?? undefined,
            math_proficiency: snapshotData.mathProficiency ?? undefined,
          })
          .where(eq(schools.dbn, school.dbn));
        
        console.log(`  ✓ Enriched with snapshot data`);
        successCount++;
      }
      
      // Rate limiting: wait 2 seconds between requests to be respectful
      if (i < allSchools.length - 1) {
        await sleep(2000);
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failCount++;
    }
    
    // Progress summary every 50 schools
    if ((i + 1) % 50 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${allSchools.length} ---`);
      console.log(`Success: ${successCount}, Failed: ${failCount}, Skipped: ${skippedCount}\n`);
    }
  }
  
  console.log("\n====================================================");
  console.log("Enrichment Complete!");
  console.log(`Total: ${allSchools.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log("====================================================");
}

enrichAllSchools().catch(console.error);
