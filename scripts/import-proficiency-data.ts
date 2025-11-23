import { db } from "../server/db";
import { schools } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

interface ProficiencyRecord {
  dbn: string;
  year: string;
  elaProf: number | null;
  mathProf: number | null;
}

async function importProficiencyData() {
  console.log("Reading ELA/Math proficiency data...");
  
  const csvPath = "/tmp/ela_results.csv";
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n");
  const headers = lines[0].split(",");
  
  // Find column indices
  const dbnIdx = headers.indexOf("DBN");
  const categoryIdx = headers.indexOf("Category");
  const yearIdx = headers.indexOf("Year");
  const elaIdx = headers.indexOf("ELA %L3+L4");
  const mathIdx = headers.indexOf("MATH %L3 + L4");
  
  console.log(`Column indices - DBN: ${dbnIdx}, Category: ${categoryIdx}, Year: ${yearIdx}, ELA: ${elaIdx}, Math: ${mathIdx}`);
  
  // Parse data and keep only "All Students" category with most recent year per school
  const schoolData = new Map<string, ProficiencyRecord>();
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const columns = lines[i].split(",");
    const dbn = columns[dbnIdx]?.trim();
    const category = columns[categoryIdx]?.trim();
    const year = columns[yearIdx]?.trim();
    const elaRaw = columns[elaIdx]?.trim();
    const mathRaw = columns[mathIdx]?.trim();
    
    // Only process "All Students" category
    if (category !== "All Students" || !dbn) continue;
    
    // Parse percentages (convert from 0-1 decimal to 0-100 percentage)
    const elaProf = elaRaw && elaRaw !== "s" && elaRaw !== "No Data" 
      ? Math.round(parseFloat(elaRaw) * 100) 
      : null;
    const mathProf = mathRaw && mathRaw !== "s" && mathRaw !== "No Data" 
      ? Math.round(parseFloat(mathRaw) * 100) 
      : null;
    
    // Skip if both values are null
    if (elaProf === null && mathProf === null) continue;
    
    // Keep most recent year for each school
    const existing = schoolData.get(dbn);
    if (!existing || year > existing.year) {
      schoolData.set(dbn, {
        dbn,
        year,
        elaProf,
        mathProf,
      });
    }
  }
  
  console.log(`Found proficiency data for ${schoolData.size} schools`);
  
  // Update database
  let updatedCount = 0;
  let notFoundCount = 0;
  
  for (const [dbn, data] of schoolData.entries()) {
    try {
      // Check if school exists in database
      const existingSchool = await db.select().from(schools).where(eq(schools.dbn, dbn)).limit(1);
      
      if (existingSchool.length === 0) {
        notFoundCount++;
        continue;
      }
      
      // Update proficiency data
      await db
        .update(schools)
        .set({
          ela_proficiency: data.elaProf ?? 50, // Keep 50 as fallback if null
          math_proficiency: data.mathProf ?? 50,
        })
        .where(eq(schools.dbn, dbn));
      
      updatedCount++;
      
      if (updatedCount % 100 === 0) {
        console.log(`Updated ${updatedCount} schools...`);
      }
    } catch (error) {
      console.error(`Error updating school ${dbn}:`, error);
    }
  }
  
  console.log(`\n✅ Import complete!`);
  console.log(`   Updated: ${updatedCount} schools`);
  console.log(`   Not found in DB: ${notFoundCount} schools`);
  
  // Show sample of updated data
  console.log("\nSample of updated schools (District 2):");
  const sampleSchools = await db
    .select()
    .from(schools)
    .where(eq(schools.district, 2))
    .limit(5);
  
  sampleSchools.forEach((school) => {
    console.log(`${school.dbn} | ${school.name.slice(0, 40)} | ELA: ${school.ela_proficiency}% | Math: ${school.math_proficiency}%`);
  });
}

importProficiencyData()
  .then(() => {
    console.log("\n✨ Data import finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });
