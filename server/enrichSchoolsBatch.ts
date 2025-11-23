import { db } from "./db";
import { schools } from "@shared/schema";
import { fetchSnapshotData } from "./snapshotScraper";
import { eq, isNull, or } from "drizzle-orm";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function enrichSchoolsBatch() {
  const limit = parseInt(process.argv[2]) || 10; // Default to 10 schools if not specified
  
  console.log(`Starting enrichment batch (limit: ${limit} schools)`);
  console.log("====================================================\n");
  
  // Find schools that haven't been enriched yet (missing economic_need_index or attendance_rate)
  const schoolsToEnrich = await db
    .select({ dbn: schools.dbn, name: schools.name })
    .from(schools)
    .where(
      or(
        isNull(schools.economic_need_index),
        isNull(schools.attendance_rate)
      )
    )
    .limit(limit);
  
  console.log(`Found ${schoolsToEnrich.length} schools to enrich\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < schoolsToEnrich.length; i++) {
    const school = schoolsToEnrich[i];
    const progress = `[${i + 1}/${schoolsToEnrich.length}]`;
    
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
        
        const fields = [];
        if (snapshotData.economicNeedIndex !== null) fields.push(`ENI: ${snapshotData.economicNeedIndex}%`);
        if (snapshotData.attendanceRate !== null) fields.push(`Att: ${snapshotData.attendanceRate}%`);
        if (snapshotData.enrollment !== null) fields.push(`Enr: ${snapshotData.enrollment}`);
        
        console.log(`  ✓ ${fields.join(', ')}`);
        successCount++;
      }
      
      // Rate limiting: wait 2 seconds between requests
      if (i < schoolsToEnrich.length - 1) {
        await sleep(2000);
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failCount++;
    }
  }
  
  console.log("\n====================================================");
  console.log("Batch Complete!");
  console.log(`Success: ${successCount}, Failed: ${failCount}`);
  console.log("====================================================");
  
  // Show remaining count
  const remaining = await db
    .select({ dbn: schools.dbn })
    .from(schools)
    .where(
      or(
        isNull(schools.economic_need_index),
        isNull(schools.attendance_rate)
      )
    );
  
  console.log(`\nRemaining schools to enrich: ${remaining.length}`);
  if (remaining.length > 0) {
    console.log(`Run again with: tsx server/enrichSchoolsBatch.ts ${Math.min(remaining.length, 100)}`);
  }
}

enrichSchoolsBatch().catch(console.error);
