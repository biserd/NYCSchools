import XLSX from "xlsx";
import { db } from "../server/db";
import { schoolDiscipline } from "../shared/schema";
import { sql } from "drizzle-orm";

interface FileConfig {
  path: string;
  year: string;
  dbnCol: string;
  nameCol: string;
  categoryCol: string;
  districtCol: string;
  removalCol: string;
  principalCol: string;
  superintendentCol: string;
  totalCol: string;
  totalsSheet: string;
  raceSheet: string;
  genderSheet: string;
  swdSheet: string;
  ellSheet: string;
  sthSheet: string;
}

const FILES: FileConfig[] = [
  {
    path: "attached_assets/suspension-data-2024-25.xlsx",
    year: "2024-25",
    dbnCol: "SchoolDBN", nameCol: "Location_Name", categoryCol: "Location_Category_Description", districtCol: "Administrative_District_Code",
    removalCol: "REMOVAL", principalCol: "PRINCIPAL", superintendentCol: "SUPERINTENDENT", totalCol: "TOTAL REMOVALS/SUSPENSIONS",
    totalsSheet: "Annual Report --R-P-S TOTALS",
    raceSheet: "Annual Report -- RACE", genderSheet: "Annual Report --GENDER",
    swdSheet: "Annual Report - SWD", ellSheet: "Annual Report - ELL", sthSheet: "Annual Report--STH",
  },
  {
    path: "attached_assets/suspension-data-2023-24.xlsx",
    year: "2023-24",
    dbnCol: "SchoolDBN", nameCol: "Location_Name", categoryCol: "Location_Category_Description", districtCol: "Administrative_District_Code",
    removalCol: "REMOVAL", principalCol: "PRINCIPAL", superintendentCol: "SUPERINTENDENT", totalCol: "TOTAL REMOVALS/SUSPENSIONS",
    totalsSheet: "Annual Report--R-P-S TOTALS",
    raceSheet: "Annual Report -- RACE", genderSheet: "Annual Report --GENDER",
    swdSheet: "Annual Report - SWD", ellSheet: "Annual Report - ELL", sthSheet: "Annual Report--STH",
  },
  {
    path: "attached_assets/suspension-data-2022-23.xlsx",
    year: "2022-23",
    dbnCol: "System_Code", nameCol: "Location_Name", categoryCol: "Location_Category_Description", districtCol: "Administrative_District_Code",
    removalCol: "REMOVAL", principalCol: "PRINCIPAL", superintendentCol: "SUPERINTENDENT", totalCol: "TOTAL REMOVALS/SUSPENSIONS",
    totalsSheet: "Annual Report--R-P-S TOTALS",
    raceSheet: "Annual Report -- RACE", genderSheet: "Annual Report --GENDER",
    swdSheet: "Annual Report - SWD", ellSheet: "Annual Report - ELL", sthSheet: "Annual Report--STH",
  },
  {
    path: "attached_assets/suspension-data-2021-22.xlsx",
    year: "2021-22",
    dbnCol: "System_Code", nameCol: "Location_Name", categoryCol: "Location_Category_Description", districtCol: "Administrative_District_Code",
    removalCol: "REMOVAL", principalCol: "PRINCIPAL", superintendentCol: "SUPERINTENDENT", totalCol: "TOTAL REMOVALS/SUSPENSIONS",
    totalsSheet: "Annual Report--R-P-S TOTALS",
    raceSheet: "Annual Report -- RACE", genderSheet: "Annual Report --GENDER",
    swdSheet: "Annual Report - SWD", ellSheet: "Annual Report - ELL", sthSheet: "Annual Report--STH",
  },
  {
    path: "attached_assets/suspension-data-2019-20.xlsx",
    year: "2019-20",
    dbnCol: "DBN", nameCol: "Location_Name", categoryCol: "Location_Category_Description", districtCol: "Administrative_District_Code",
    removalCol: "REMOVAL", principalCol: "PRINCIPAL", superintendentCol: "SUPERINTENDENT", totalCol: "SY1920_TOTAL_REMOVALS_SUSPENSIONS",
    totalsSheet: "Annual Report--R-P-S TOTALS",
    raceSheet: "Annual Report -- RACE", genderSheet: "Annual Report --GENDER",
    swdSheet: "Annual Report - SWD", ellSheet: "Annual Report - ELL", sthSheet: "Annual Report--STH",
  },
  {
    path: "attached_assets/suspension-data-2018-19.xlsx",
    year: "2018-19",
    dbnCol: "DBN", nameCol: "LOCATION NAME", categoryCol: "LOCATION CATEGORY", districtCol: "ADMINISTRATIVE DISTRICT",
    removalCol: "REMOVALS", principalCol: "PRINCIPAL", superintendentCol: "SUPERINTENDENT", totalCol: "SY1819 TOTAL REMOVALS/SUSPENSIONS",
    totalsSheet: "Annual Report-- R-P-S TOTALS",
    raceSheet: "Annual Report-- RACE", genderSheet: "Annual Report-- GENDER",
    swdSheet: "Annual Report-- IEP", ellSheet: "Annual Report-- ELL", sthSheet: "Annual Report-- STH",
  },
];

function parseNum(val: any): number | null {
  if (val === null || val === undefined || val === "" || val === "R" || val === "r" || val === "s" || val === "S") return null;
  const n = typeof val === "number" ? val : Number(val);
  return isNaN(n) ? null : n;
}

function readSheetAsMap(wb: XLSX.WorkBook, sheetName: string, dbnCol: string): Map<string, Record<string, any>> {
  const map = new Map<string, Record<string, any>>();
  const sheetNames = wb.SheetNames;
  const normalize = (s: string) => s.replace(/[\s-]+/g, "").toUpperCase();
  const target = normalize(sheetName);
  const matchingSheet = sheetNames.find(s => normalize(s) === target || normalize(s).includes(target));
  if (!matchingSheet) {
    console.log(`  Warning: Sheet "${sheetName}" not found. Available: ${sheetNames.join(", ")}`);
    return map;
  }
  const ws = wb.Sheets[matchingSheet];
  const rows = XLSX.utils.sheet_to_json(ws) as Record<string, any>[];
  for (const row of rows) {
    const dbn = String(row[dbnCol] || "").trim();
    if (dbn && /^\d{2}[A-Z]\d{3}$/i.test(dbn)) {
      map.set(dbn, row);
    }
  }
  return map;
}

async function importFile(config: FileConfig): Promise<number> {
  console.log(`\nProcessing ${config.year} from ${config.path}...`);
  const wb = XLSX.readFile(config.path);
  
  const totalsMap = readSheetAsMap(wb, config.totalsSheet, config.dbnCol);
  console.log(`  Totals sheet: ${totalsMap.size} schools`);
  
  const raceMap = readSheetAsMap(wb, config.raceSheet, config.dbnCol);
  const genderMap = readSheetAsMap(wb, config.genderSheet, config.dbnCol);
  const swdMap = readSheetAsMap(wb, config.swdSheet, config.dbnCol);
  const ellMap = readSheetAsMap(wb, config.ellSheet, config.dbnCol);
  const sthMap = readSheetAsMap(wb, config.sthSheet, config.dbnCol);
  console.log(`  Subgroup sheets: race=${raceMap.size}, gender=${genderMap.size}, swd=${swdMap.size}, ell=${ellMap.size}, sth=${sthMap.size}`);

  const records: any[] = [];
  
  for (const [dbn, row] of totalsMap) {
    const total = parseNum(row[config.totalCol]);
    const removals = parseNum(row[config.removalCol]);
    const principal = parseNum(row[config.principalCol]);
    const superintendent = parseNum(row[config.superintendentCol]);

    const race = raceMap.get(dbn) || {};
    const gender = genderMap.get(dbn) || {};
    const swd = swdMap.get(dbn) || {};
    const ell = ellMap.get(dbn) || {};
    const sth = sthMap.get(dbn) || {};

    const findCol = (obj: Record<string, any>, ...patterns: string[]): any => {
      for (const p of patterns) {
        for (const key of Object.keys(obj)) {
          if (key.toUpperCase().includes(p.toUpperCase())) return obj[key];
        }
      }
      return null;
    };

    const raceTotal = (race: Record<string, any>, group: string): number | null => {
      let sum: number | null = null;
      for (const suffix of ["REMOVAL", "PRINCIPAL", "SUPERINTENDENT"]) {
        const key = Object.keys(race).find(k => k.toUpperCase().includes(group.toUpperCase()) && k.toUpperCase().includes(suffix));
        if (key) {
          const v = parseNum(race[key]);
          if (v !== null) sum = (sum || 0) + v;
        }
      }
      return sum;
    };

    records.push({
      dbn,
      year: config.year,
      school_name: row[config.nameCol] || null,
      category: row[config.categoryCol] || null,
      total_suspensions: total,
      teacher_removals: removals,
      principal_suspensions: principal,
      superintendent_suspensions: superintendent,
      susp_black: raceTotal(race, "BLACK"),
      susp_hispanic: raceTotal(race, "HISPANIC"),
      susp_white: raceTotal(race, "WHITE"),
      susp_asian: raceTotal(race, "ASIAN"),
      susp_multi_racial: raceTotal(race, "MULTI"),
      susp_native_american: raceTotal(race, "INDIAN"),
      susp_male: (() => {
        let sum: number | null = null;
        for (const suffix of ["REMOVAL", "PRINCIPAL", "SUPERINTENDENT"]) {
          const key = Object.keys(gender).find(k => k.toUpperCase().includes("MALE") && !k.toUpperCase().includes("FEMALE") && k.toUpperCase().includes(suffix));
          if (key) {
            const v = parseNum(gender[key]);
            if (v !== null) sum = (sum || 0) + v;
          }
        }
        return sum;
      })(),
      susp_female: (() => {
        let sum: number | null = null;
        for (const suffix of ["REMOVAL", "PRINCIPAL", "SUPERINTENDENT"]) {
          const key = Object.keys(gender).find(k => k.toUpperCase().includes("FEMALE") && k.toUpperCase().includes(suffix));
          if (key) {
            const v = parseNum(gender[key]);
            if (v !== null) sum = (sum || 0) + v;
          }
        }
        return sum;
      })(),
      susp_swd: (() => {
        let sum: number | null = null;
        for (const suffix of ["REMOVAL", "PRINCIPAL", "SUPERINTENDENT"]) {
          const key = Object.keys(swd).find(k => k.toUpperCase().includes("SWD") && k.toUpperCase().includes(suffix));
          if (key) {
            const v = parseNum(swd[key]);
            if (v !== null) sum = (sum || 0) + v;
          }
        }
        return sum;
      })(),
      susp_gen_ed: (() => {
        let sum: number | null = null;
        for (const suffix of ["REMOVAL", "PRINCIPAL", "SUPERINTENDENT"]) {
          const key = Object.keys(swd).find(k => k.toUpperCase().includes("GEN ED") && k.toUpperCase().includes(suffix));
          if (key) {
            const v = parseNum(swd[key]);
            if (v !== null) sum = (sum || 0) + v;
          }
        }
        return sum;
      })(),
      susp_ell: (() => {
        let sum: number | null = null;
        for (const suffix of ["REMOVAL", "PRINCIPAL", "SUPERINTENDENT"]) {
          const key = Object.keys(ell).find(k => k.toUpperCase().includes("ELL") && !k.toUpperCase().includes("NON") && k.toUpperCase().includes(suffix));
          if (key) {
            const v = parseNum(ell[key]);
            if (v !== null) sum = (sum || 0) + v;
          }
        }
        return sum;
      })(),
      susp_non_ell: (() => {
        let sum: number | null = null;
        for (const suffix of ["REMOVAL", "PRINCIPAL", "SUPERINTENDENT"]) {
          const key = Object.keys(ell).find(k => k.toUpperCase().includes("NON-ELL") && k.toUpperCase().includes(suffix));
          if (key) {
            const v = parseNum(ell[key]);
            if (v !== null) sum = (sum || 0) + v;
          }
        }
        return sum;
      })(),
      susp_sth: (() => {
        let sum: number | null = null;
        for (const suffix of ["REMOVAL", "PRINCIPAL", "SUPERINTENDENT"]) {
          const key = Object.keys(sth).find(k => k.toUpperCase().includes("STH") && !k.toUpperCase().includes("NON") && k.toUpperCase().includes(suffix));
          if (key) {
            const v = parseNum(sth[key]);
            if (v !== null) sum = (sum || 0) + v;
          }
        }
        return sum;
      })(),
      susp_non_sth: (() => {
        let sum: number | null = null;
        for (const suffix of ["REMOVAL", "PRINCIPAL", "SUPERINTENDENT"]) {
          const key = Object.keys(sth).find(k => k.toUpperCase().includes("NON-STH") && k.toUpperCase().includes(suffix));
          if (key) {
            const v = parseNum(sth[key]);
            if (v !== null) sum = (sum || 0) + v;
          }
        }
        return sum;
      })(),
    });
  }

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    await db.insert(schoolDiscipline).values(batch);
    inserted += batch.length;
  }
  console.log(`  Inserted ${inserted} records for ${config.year}`);
  return inserted;
}

async function main() {
  console.log("=== NYC DOE School Discipline Data Import ===");
  console.log("Source: InfoHub LL93 Annual Reports on Student Discipline\n");

  await db.delete(schoolDiscipline);
  console.log("Cleared existing discipline data.");

  let totalInserted = 0;
  for (const config of FILES) {
    try {
      totalInserted += await importFile(config);
    } catch (err) {
      console.error(`Error processing ${config.year}:`, err);
    }
  }

  const result = await db.execute(sql`SELECT COUNT(DISTINCT dbn) as schools, COUNT(*) as records FROM school_discipline`);
  console.log(`\n=== Import Complete ===`);
  console.log(`Total records: ${totalInserted}`);
  console.log(`DB verification: ${JSON.stringify(result.rows[0])}`);
  
  const sample = await db.execute(sql`SELECT dbn, year, total_suspensions, teacher_removals, principal_suspensions, superintendent_suspensions, susp_black, susp_hispanic, susp_male FROM school_discipline WHERE total_suspensions IS NOT NULL ORDER BY total_suspensions DESC LIMIT 5`);
  console.log("\nTop 5 schools by total suspensions:");
  sample.rows.forEach((r: any) => console.log(`  ${r.dbn} (${r.year}): ${r.total_suspensions} total (R:${r.teacher_removals}, P:${r.principal_suspensions}, S:${r.superintendent_suspensions})`));

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
