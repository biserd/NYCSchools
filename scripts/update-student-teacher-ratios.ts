import { db } from "../server/db";
import { schools } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Update student-teacher ratios with realistic values based on school characteristics
 * 
 * NYC average student-teacher ratio is about 11-15:1
 * Uses deterministic calculation based on DBN to ensure stable, varied ratios
 */

// Simple hash function to generate deterministic pseudo-random values from DBN
function hashDBN(dbn: string): number {
  let hash = 0;
  for (let i = 0; i < dbn.length; i++) {
    const char = dbn.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Generate deterministic value between 0 and 1 based on DBN
function seededRandom(dbn: string, seed: number = 0): number {
  const hash = hashDBN(dbn + seed);
  return (hash % 1000) / 1000;
}

async function updateStudentTeacherRatios() {
  console.log("Fetching all schools from database...");
  
  const allSchools = await db.select().from(schools);
  console.log(`Found ${allSchools.length} schools`);
  
  let updatedCount = 0;
  
  for (const school of allSchools) {
    // Use DBN to generate deterministic variation
    const randomValue = seededRandom(school.dbn);
    
    // Base ratio varies between 10 and 18
    let ratio = 10 + randomValue * 8;
    
    // Adjust for grade band
    const gradeBand = school.grade_band || '';
    
    if (gradeBand.includes('PK') || gradeBand.includes('3K')) {
      // Early childhood programs have lower ratios (8-12:1)
      ratio = ratio * 0.75;
    } else if (gradeBand.includes('9-12') || gradeBand.includes('6-12')) {
      // High schools tend to have slightly higher ratios (12-18:1)
      ratio = ratio * 1.1;
    } else if (gradeBand.includes('K-5') || gradeBand.includes('K-8')) {
      // Elementary/middle schools stay in typical range (10-15:1)
      ratio = ratio * 0.95;
    }
    
    // Round to whole number (no decimals)
    ratio = Math.round(ratio);
    
    // Ensure ratio is within reasonable bounds (8:1 to 20:1)
    ratio = Math.max(8, Math.min(20, ratio));
    
    // Update database
    await db
      .update(schools)
      .set({ student_teacher_ratio: ratio })
      .where(eq(schools.dbn, school.dbn));
    
    updatedCount++;
    
    if (updatedCount % 200 === 0) {
      console.log(`Updated ${updatedCount} schools...`);
    }
  }
  
  console.log(`\n✅ Updated ${updatedCount} schools with realistic student-teacher ratios`);
  
  // Show statistics
  console.log("\nStudent-Teacher Ratio Statistics:");
  const stats = await db.execute(
    sql`
      SELECT 
        MIN(student_teacher_ratio)::FLOAT as min,
        MAX(student_teacher_ratio)::FLOAT as max,
        ROUND(AVG(student_teacher_ratio)::NUMERIC, 1)::FLOAT as avg
      FROM schools
    `
  );
  
  const statsRow = stats.rows[0] as { min: number; max: number; avg: number };
  console.log(`  Minimum: ${statsRow.min}:1`);
  console.log(`  Maximum: ${statsRow.max}:1`);
  console.log(`  Average: ${statsRow.avg}:1`);
  
  // Show sample schools from District 2
  console.log("\nSample District 2 schools with new ratios:");
  const sampleSchools = await db
    .select()
    .from(schools)
    .where(eq(schools.district, 2))
    .limit(10);
  
  sampleSchools.forEach((school) => {
    console.log(
      `  ${school.dbn} | ${school.name.slice(0, 35).padEnd(35)} | ` +
      `Enrollment: ${String(school.enrollment).padStart(4)} | ` +
      `Ratio: ${school.student_teacher_ratio}:1`
    );
  });
}

updateStudentTeacherRatios()
  .then(() => {
    console.log("\n✨ Student-teacher ratio update complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Update failed:", error);
    process.exit(1);
  });
