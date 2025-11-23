import { fetchSnapshotData } from "./snapshotScraper";

async function test() {
  console.log("Testing snapshot scraper on known schools...\n");
  
  const testSchools = ["02M158", "01M015", "03M171"];
  
  for (const dbn of testSchools) {
    const data = await fetchSnapshotData(dbn);
    console.log(`\n${dbn}:`);
    if (data) {
      console.log(`  Economic Need Index: ${data.economicNeedIndex ?? 'N/A'}`);
      console.log(`  Attendance Rate: ${data.attendanceRate ?? 'N/A'}`);
      console.log(`  Enrollment: ${data.enrollment ?? 'N/A'}`);
      console.log(`  ELA Proficiency: ${data.elaProficiency ?? 'N/A'}`);
      console.log(`  Math Proficiency: ${data.mathProficiency ?? 'N/A'}`);
      console.log(`  Quality - Instruction: ${data.qualityRatingInstruction ?? 'N/A'}`);
      console.log(`  Quality - Safety: ${data.qualityRatingSafety ?? 'N/A'}`);
      console.log(`  Principal: ${data.principalName ?? 'N/A'}`);
    } else {
      console.log("  No data returned");
    }
  }
}

test().catch(console.error);
