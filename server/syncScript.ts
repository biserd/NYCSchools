import { syncSchoolData } from "./dataSync";

console.log("NYC School Data Sync");
console.log("===================\n");

syncSchoolData()
  .then(() => {
    console.log("\n✓ Sync completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Sync failed:", error);
    process.exit(1);
  });
