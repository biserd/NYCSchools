import { db } from "../server/db";
import { schools } from "../shared/schema";
import { eq } from "drizzle-orm";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

async function importEnrollmentByLevel() {
  console.log("Importing enrollment data by grade level...\n");

  // Elementary Schools (K-5)
  console.log("=== Elementary Schools ===");
  const esWb = XLSX.readFile('attached_assets/fall-2025-es-directory-data.xlsx');
  const esSheet = esWb.Sheets[esWb.SheetNames[0]];
  const esData = XLSX.utils.sheet_to_json(esSheet) as any[];
  
  let esUpdated = 0;
  for (const row of esData) {
    const dbn = row.schooldbn;
    const enrollment = parseInt(row.totalstudents);
    if (dbn && !isNaN(enrollment) && enrollment > 0) {
      const result = await db
        .update(schools)
        .set({ elementary_enrollment: enrollment })
        .where(eq(schools.dbn, dbn))
        .returning({ dbn: schools.dbn });
      if (result.length > 0) esUpdated++;
    }
  }
  console.log(`Updated ${esUpdated} schools with elementary enrollment`);

  // Middle Schools (6-8)
  console.log("\n=== Middle Schools ===");
  const msWb = XLSX.readFile('attached_assets/fall-2025-ms-directory-data.xlsx');
  const msSheet = msWb.Sheets['Data'];
  const msData = XLSX.utils.sheet_to_json(msSheet) as any[];
  
  let msUpdated = 0;
  for (const row of msData) {
    const dbn = row.schooldbn;
    const enrollment = parseInt(row.totalstudents);
    if (dbn && !isNaN(enrollment) && enrollment > 0) {
      const result = await db
        .update(schools)
        .set({ middle_enrollment: enrollment })
        .where(eq(schools.dbn, dbn))
        .returning({ dbn: schools.dbn });
      if (result.length > 0) msUpdated++;
    }
  }
  console.log(`Updated ${msUpdated} schools with middle enrollment`);

  // High Schools (9-12)
  console.log("\n=== High Schools ===");
  const hsWb = XLSX.readFile('attached_assets/fall-2025-hs-directory-data.xlsx');
  const hsSheet = hsWb.Sheets['Data'];
  const hsData = XLSX.utils.sheet_to_json(hsSheet) as any[];
  
  let hsUpdated = 0;
  for (const row of hsData) {
    const dbn = row.dbn;
    const enrollment = parseInt(row.total_students);
    if (dbn && !isNaN(enrollment) && enrollment > 0) {
      const result = await db
        .update(schools)
        .set({ high_school_enrollment: enrollment })
        .where(eq(schools.dbn, dbn))
        .returning({ dbn: schools.dbn });
      if (result.length > 0) hsUpdated++;
    }
  }
  console.log(`Updated ${hsUpdated} schools with high school enrollment`);

  // Now update the total enrollment to be the sum of all levels
  console.log("\n=== Updating Total Enrollment ===");
  await db.execute(`
    UPDATE schools 
    SET enrollment = COALESCE(elementary_enrollment, 0) + COALESCE(middle_enrollment, 0) + COALESCE(high_school_enrollment, 0)
    WHERE elementary_enrollment IS NOT NULL OR middle_enrollment IS NOT NULL OR high_school_enrollment IS NOT NULL
  `);
  console.log("Total enrollment updated for schools with level-specific data");

  console.log("\n=== Complete! ===");
  process.exit(0);
}

importEnrollmentByLevel().catch(console.error);
