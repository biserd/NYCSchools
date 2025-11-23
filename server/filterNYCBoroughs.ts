import { db } from "./db";
import { schools } from "@shared/schema";
import { isNYC5Borough } from "../shared/boroughMapping";
import { inArray } from "drizzle-orm";

async function filterToNYCBoroughs() {
  console.log("Filtering database to NYC 5-borough schools only");
  console.log("=================================================\n");
  
  const allSchools = await db.select({ dbn: schools.dbn }).from(schools);
  console.log(`Current total: ${allSchools.length} schools`);
  
  const nonNYCDbns = allSchools
    .filter(school => !isNYC5Borough(school.dbn))
    .map(school => school.dbn);
  
  console.log(`Non-NYC schools to remove: ${nonNYCDbns.length}`);
  
  if (nonNYCDbns.length > 0) {
    for (let i = 0; i < nonNYCDbns.length; i += 100) {
      const batch = nonNYCDbns.slice(i, i + 100);
      await db.delete(schools).where(inArray(schools.dbn, batch));
      console.log(`Deleted batch ${Math.floor(i/100) + 1}/${Math.ceil(nonNYCDbns.length/100)}`);
    }
  }
  
  const remaining = await db.select({ dbn: schools.dbn }).from(schools);
  console.log(`\n✓ Complete! Database now contains ${remaining.length} NYC 5-borough schools`);
}

filterToNYCBoroughs().catch(console.error);
