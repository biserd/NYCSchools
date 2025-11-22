import { storage } from "./storage";
import * as fs from "fs";
import * as path from "path";

async function seedDatabase() {
  console.log("Seeding database with schools data...");
  
  // Read the schools.json file
  const schoolsPath = path.join(process.cwd(), "client", "public", "schools.json");
  const schoolsData = JSON.parse(fs.readFileSync(schoolsPath, "utf-8"));
  
  // Insert schools into database
  await storage.upsertSchools(schoolsData);
  
  console.log(`Successfully seeded ${schoolsData.length} schools`);
}

seedDatabase()
  .then(() => {
    console.log("Database seeding complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  });
