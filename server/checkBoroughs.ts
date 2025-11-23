import { db } from "./db";
import { schools } from "@shared/schema";
import { isNYC5Borough, getBoroughFromDBN } from "../shared/boroughMapping";

async function checkBoroughs() {
  const allSchools = await db.select({ dbn: schools.dbn, name: schools.name }).from(schools);
  
  const boroughCounts: Record<string, number> = {
    "Manhattan": 0,
    "Bronx": 0,
    "Brooklyn": 0,
    "Queens": 0,
    "Staten Island": 0,
    "Non-NYC": 0
  };
  
  const nonNYC: string[] = [];
  
  for (const school of allSchools) {
    const borough = getBoroughFromDBN(school.dbn);
    if (borough) {
      boroughCounts[borough]++;
    } else {
      boroughCounts["Non-NYC"]++;
      if (nonNYC.length < 10) {
        nonNYC.push(`${school.dbn} - ${school.name}`);
      }
    }
  }
  
  console.log("Schools by Borough:");
  console.log("==================");
  Object.entries(boroughCounts).forEach(([borough, count]) => {
    console.log(`${borough}: ${count} schools`);
  });
  
  if (nonNYC.length > 0) {
    console.log("\nExample Non-NYC Schools (first 10):");
    nonNYC.forEach(school => console.log(`  - ${school}`));
  }
  
  console.log(`\nTotal: ${allSchools.length} schools`);
  console.log(`NYC 5-Borough: ${allSchools.length - boroughCounts["Non-NYC"]}`);
  console.log(`Non-NYC: ${boroughCounts["Non-NYC"]}`);
}

checkBoroughs().catch(console.error);
