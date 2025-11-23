import { syncSingleSchool } from "./dataSync";

async function main() {
  console.log("Syncing PS 158 Bayard Taylor (02M158)...\n");
  await syncSingleSchool("02M158");
  console.log("\n✓ Sync complete!");
}

main().catch(console.error);
