import XLSX from "xlsx";
import path from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../server/db";
import { schools, schoolHistoricalScores } from "../shared/schema";

const YEAR = 2025;
const ASSESSMENT_YEAR = "2024-25";

function readTestedCounts(fileName: string, sheetName: string): Map<string, number> {
  const workbook = XLSX.readFile(path.join(process.cwd(), "attached_assets", fileName));
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets[sheetName]);
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (
      row.Year === YEAR &&
      row.Grade === "All Grades" &&
      row.Category === "All Students" &&
      typeof row.DBN === "string" &&
      typeof row["Number Tested"] === "number"
    ) {
      counts.set(row.DBN, row["Number Tested"]);
    }
  }
  return counts;
}

async function main() {
  const elaCounts = readTestedCounts("school-ela-results-2018-2025.xlsx", "ELA - All");
  const mathCounts = readTestedCounts("school-math-results-2018-2025.xlsx", "Math - All");
  const dbns = new Set([...elaCounts.keys(), ...mathCounts.keys()]);
  let updated = 0;

  for (const dbn of dbns) {
    const elaTested = elaCounts.get(dbn) ?? null;
    const mathTested = mathCounts.get(dbn) ?? null;

    await db.update(schools).set({
      ela_tested_count: elaTested,
      math_tested_count: mathTested,
      assessment_year: ASSESSMENT_YEAR,
      assessment_source: "NYC DOE / NYSED Grades 3-8 Results",
      academics_score: sql`
        case
          when ${schools.ela_proficiency} is not null and ${schools.math_proficiency} is not null
          then round((${schools.ela_proficiency} + ${schools.math_proficiency})::numeric / 2)
          else ${schools.academics_score}
        end
      `,
    }).where(eq(schools.dbn, dbn));

    await db.update(schoolHistoricalScores).set({
      ela_tested_count: elaTested,
      math_tested_count: mathTested,
      data_source: "NYC DOE / NYSED Grades 3-8 Results",
    }).where(and(
      eq(schoolHistoricalScores.dbn, dbn),
      eq(schoolHistoricalScores.year, YEAR),
    ));
    updated++;
  }

  console.log(`Imported 2025 ELA/Math tested counts for ${updated} schools.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});