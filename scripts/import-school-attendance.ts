import xlsx from "xlsx";
import { db } from "../server/db";
import { schoolAttendance } from "../shared/schema";
import { sql } from "drizzle-orm";

const FILE_PATH = "attached_assets/school-attendance-results.xlsx";

function parseNum(val: any): number | null {
  if (val === null || val === undefined || val === "" || val === "s" || val === "N/A") return null;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function parseInt2(val: any): number | null {
  if (val === null || val === undefined || val === "" || val === "s" || val === "N/A") return null;
  const n = typeof val === "number" ? Math.round(val) : parseInt(String(val));
  return isNaN(n) ? null : n;
}

interface AttendanceRow {
  dbn: string;
  year: string;
  grade: string;
  total_days: number | null;
  days_absent: number | null;
  days_present: number | null;
  attendance_rate: number | null;
  students_contributing: number | null;
  chronically_absent_count: number | null;
  chronic_absenteeism_rate: number | null;
}

interface SubgroupRow {
  dbn: string;
  year: string;
  grade: string;
  category: string;
  chronic_absenteeism_rate: number | null;
}

async function importAttendance() {
  console.log("Reading attendance file (this may take a minute for 84MB file)...");
  const wb = xlsx.readFile(FILE_PATH);

  // Step 1: Parse "All Students" sheet for base records
  console.log("\n--- Parsing 'All Students' sheet ---");
  const allSheet = wb.Sheets["All Students"];
  const allData: any[][] = xlsx.utils.sheet_to_json(allSheet, { header: 1 });

  const baseRecords = new Map<string, AttendanceRow>();
  let allRowCount = 0;

  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (!row || !row[0]) continue;

    const dbn = String(row[0]).trim();
    const grade = String(row[2] || "All Grades").trim();
    const year = String(row[3]).trim();

    // Only use "All Grades" rows
    if (grade !== "All Grades") continue;

    const key = `${dbn}|${year}`;
    baseRecords.set(key, {
      dbn,
      year,
      grade,
      total_days: parseInt2(row[5]),
      days_absent: parseInt2(row[6]),
      days_present: parseInt2(row[7]),
      attendance_rate: parseNum(row[8]),
      students_contributing: parseInt2(row[9]),
      chronically_absent_count: parseInt2(row[10]),
      chronic_absenteeism_rate: parseNum(row[11]),
    });
    allRowCount++;
  }
  console.log(`Parsed ${allRowCount} base records from All Students`);

  // Step 2: Parse subgroup sheets
  const subgroupSheets: { sheet: string; field: string; categoryMap: Record<string, string> }[] = [
    {
      sheet: "SWD",
      field: "swd",
      categoryMap: { "SWD": "ca_rate_swd", "Not SWD": "ca_rate_not_swd" },
    },
    {
      sheet: "Ethnicity",
      field: "ethnicity",
      categoryMap: {
        "Asian": "ca_rate_asian",
        "Black": "ca_rate_black",
        "Hispanic": "ca_rate_hispanic",
        "White": "ca_rate_white",
        "Other": "ca_rate_other",
        "Multi-Racial": "ca_rate_other",
      },
    },
    {
      sheet: "Gender",
      field: "gender",
      categoryMap: { "Male": "ca_rate_male", "Female": "ca_rate_female" },
    },
    {
      sheet: "Poverty",
      field: "poverty",
      categoryMap: { "Poverty": "ca_rate_poverty", "Not Poverty": "ca_rate_not_poverty" },
    },
    {
      sheet: "ELL",
      field: "ell",
      categoryMap: { "ELL": "ca_rate_ell", "Not ELL": "ca_rate_not_ell" },
    },
    {
      sheet: "STH",
      field: "sth",
      categoryMap: { "STH": "ca_rate_sth", "Not STH": "ca_rate_not_sth" },
    },
  ];

  for (const sg of subgroupSheets) {
    console.log(`\n--- Parsing '${sg.sheet}' sheet ---`);
    const ws = wb.Sheets[sg.sheet];
    if (!ws) {
      console.log(`  Sheet '${sg.sheet}' not found, skipping`);
      continue;
    }
    const data: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
    let matchCount = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue;

      const dbn = String(row[0]).trim();
      const grade = String(row[2] || "All Grades").trim();
      const year = String(row[3]).trim();
      const category = String(row[4] || "").trim();

      if (grade !== "All Grades") continue;

      const key = `${dbn}|${year}`;
      const base = baseRecords.get(key);
      if (!base) continue;

      const fieldName = sg.categoryMap[category];
      if (fieldName) {
        (base as any)[fieldName] = parseNum(row[11]); // % Chronically Absent column
        matchCount++;
      }
    }
    console.log(`  Merged ${matchCount} subgroup records`);
  }

  // Step 3: Insert into database
  console.log("\n--- Inserting into database ---");
  await db.execute(sql`TRUNCATE TABLE school_attendance`);

  const records = Array.from(baseRecords.values());
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const insertBatch = batch.map((r) => ({
      dbn: r.dbn,
      year: r.year,
      grade: r.grade,
      total_days: r.total_days,
      days_absent: r.days_absent,
      days_present: r.days_present,
      attendance_rate: r.attendance_rate,
      students_contributing: r.students_contributing,
      chronically_absent_count: r.chronically_absent_count,
      chronic_absenteeism_rate: r.chronic_absenteeism_rate,
      ca_rate_swd: (r as any).ca_rate_swd ?? null,
      ca_rate_not_swd: (r as any).ca_rate_not_swd ?? null,
      ca_rate_asian: (r as any).ca_rate_asian ?? null,
      ca_rate_black: (r as any).ca_rate_black ?? null,
      ca_rate_hispanic: (r as any).ca_rate_hispanic ?? null,
      ca_rate_white: (r as any).ca_rate_white ?? null,
      ca_rate_other: (r as any).ca_rate_other ?? null,
      ca_rate_male: (r as any).ca_rate_male ?? null,
      ca_rate_female: (r as any).ca_rate_female ?? null,
      ca_rate_poverty: (r as any).ca_rate_poverty ?? null,
      ca_rate_not_poverty: (r as any).ca_rate_not_poverty ?? null,
      ca_rate_ell: (r as any).ca_rate_ell ?? null,
      ca_rate_not_ell: (r as any).ca_rate_not_ell ?? null,
      ca_rate_sth: (r as any).ca_rate_sth ?? null,
      ca_rate_not_sth: (r as any).ca_rate_not_sth ?? null,
      data_source: "NYC DOE InfoHub",
    }));

    await db.insert(schoolAttendance).values(insertBatch);
    inserted += batch.length;
    if (inserted % 5000 === 0 || i + BATCH_SIZE >= records.length) {
      console.log(`  Inserted ${inserted}/${records.length} records`);
    }
  }

  // Summary
  const yearCounts = await db.execute(sql`
    SELECT year, COUNT(*) as cnt FROM school_attendance GROUP BY year ORDER BY year
  `);
  console.log("\n--- Summary by Year ---");
  for (const row of yearCounts.rows) {
    console.log(`  ${row.year}: ${row.cnt} schools`);
  }

  const totalSchools = await db.execute(sql`
    SELECT COUNT(DISTINCT dbn) as cnt FROM school_attendance
  `);
  console.log(`\nTotal unique schools: ${totalSchools.rows[0].cnt}`);
  console.log("Import complete!");
  process.exit(0);
}

importAttendance().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
