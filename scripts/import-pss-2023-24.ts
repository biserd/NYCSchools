import { db } from "../server/db";
import { privateSchools, privateSchoolHistory } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, "../attached_assets/2023-24_1768776948181.csv");

const GRADE_CODE_MAP: Record<string, string> = {
  "-1": "UG",
  "1": "UG",
  "2": "PK",
  "3": "K",
  "4": "1",
  "5": "2",
  "6": "3",
  "7": "4",
  "8": "5",
  "9": "6",
  "10": "7",
  "11": "8",
  "12": "9",
  "13": "10",
  "14": "11",
  "15": "12",
  "16": "13",
  "17": "12",
};

const COED_CODE_MAP: Record<string, string> = {
  "1": "coed",
  "2": "female",
  "3": "male",
  "-1": "coed",
};

const RELIGIOUS_CODE_MAP: Record<string, string> = {
  "1": "Catholic",
  "2": "Other Religious",
  "3": "Non-Religious",
  "-1": "Unknown",
};

const ORIENT_CODE_MAP: Record<string, string> = {
  "1": "Roman Catholic",
  "8": "Protestant/Christian",
  "14": "Episcopal",
  "15": "Friends/Quaker",
  "16": "Greek Orthodox",
  "17": "Islamic",
  "18": "Jewish",
  "27": "Seventh-day Adventist",
  "30": "Non-Denominational",
};

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n");
  const headerLine = lines.find(line => line.startsWith("PSS_SCHOOL_ID"));
  if (!headerLine) {
    throw new Error("Could not find header line in CSV");
  }
  
  const headerIndex = lines.indexOf(headerLine);
  const headers = headerLine.split(",").map(h => h.trim());
  
  const records: Record<string, string>[] = [];
  
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("Source:")) continue;
    
    const values = parseCSVLine(line);
    if (values.length < 5) continue;
    
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || "";
    });
    
    records.push(record);
  }
  
  return records;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  return values;
}

function formatPhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function parseNumber(value: string): number | null {
  if (!value || value === "" || value === "-1" || value === "-2") return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

function parseInt(value: string): number | null {
  if (!value || value === "" || value === "-1" || value === "-2") return null;
  const num = Number.parseInt(value, 10);
  return isNaN(num) ? null : num;
}

function getGradesOffered(low: string, high: string): string {
  const lowGrade = GRADE_CODE_MAP[low] || low;
  const highGrade = GRADE_CODE_MAP[high] || high;
  
  if (lowGrade === highGrade) return lowGrade;
  return `${lowGrade}-${highGrade}`;
}

function buildEnrollmentByGrade(record: Record<string, string>): Record<string, number> {
  const enrollment: Record<string, number> = {};
  
  const gradeFields: [string, string][] = [
    ["PSS_ENROLL_UG", "UG"],
    ["PSS_ENROLL_PK", "PK"],
    ["PSS_ENROLL_K", "K"],
    ["PSS_ENROLL_1", "1"],
    ["PSS_ENROLL_2", "2"],
    ["PSS_ENROLL_3", "3"],
    ["PSS_ENROLL_4", "4"],
    ["PSS_ENROLL_5", "5"],
    ["PSS_ENROLL_6", "6"],
    ["PSS_ENROLL_7", "7"],
    ["PSS_ENROLL_8", "8"],
    ["PSS_ENROLL_9", "9"],
    ["PSS_ENROLL_10", "10"],
    ["PSS_ENROLL_11", "11"],
    ["PSS_ENROLL_12", "12"],
  ];
  
  for (const [field, grade] of gradeFields) {
    const count = parseInt(record[field]);
    if (count !== null && count > 0) {
      enrollment[grade] = count;
    }
  }
  
  return enrollment;
}

function getAssociations(record: Record<string, string>): string[] {
  const associations: string[] = [];
  
  for (let i = 1; i <= 15; i++) {
    const field = `PSS_ASSOC_${i}`;
    const value = record[field];
    if (value && value.trim() && value !== "null") {
      associations.push(value.trim());
    }
  }
  
  return associations;
}

function getBoroughFromZip(zipCode: string): string | null {
  const zip = zipCode?.trim();
  if (!zip) return null;
  
  if (zip.startsWith("100") || zip.startsWith("101") || zip.startsWith("102")) {
    return "Manhattan";
  }
  if (zip.startsWith("104")) {
    return "Bronx";
  }
  if (zip.startsWith("112") || zip.startsWith("111") || zip.startsWith("114") || zip.startsWith("116")) {
    return "Brooklyn";
  }
  if (zip.startsWith("113") || zip.startsWith("114") || zip.startsWith("116")) {
    return "Queens";
  }
  if (zip.startsWith("103")) {
    return "Staten Island";
  }
  
  return "Manhattan";
}

async function importPSS202324() {
  console.log("Reading CSV file...");
  const csvContent = fs.readFileSync(CSV_PATH, "utf-8");
  const records = parseCSV(csvContent);
  
  console.log(`Parsed ${records.length} records from 2023-24 PSS data`);
  
  let updated = 0;
  let inserted = 0;
  let errors = 0;
  
  for (const record of records) {
    const ncesId = record["PSS_SCHOOL_ID"];
    if (!ncesId) continue;
    
    try {
      const existingSchool = await db.select().from(privateSchools).where(eq(privateSchools.ncesId, ncesId)).limit(1);
      
      const loGrade = record["LoGrade"] || "";
      const hiGrade = record["HiGrade"] || "";
      const lowestGrade = GRADE_CODE_MAP[loGrade] || loGrade || null;
      const highestGrade = GRADE_CODE_MAP[hiGrade] || hiGrade || null;
      
      const totalEnrollment = parseInt(record["PSS_ENROLL_T"]);
      const schoolDays = parseInt(record["PSS_SCH_DAYS"]);
      const schoolHours = parseNumber(record["PSS_STU_DAY_HRS"]);
      const schoolDayMinutes = schoolHours ? Math.round(schoolHours * 60) : null;
      
      const coedCode = record["PSS_COED"];
      const coedStatus = COED_CODE_MAP[coedCode] || "coed";
      
      const religCode = record["PSS_RELIG"];
      const orientCode = record["PSS_ORIENT"];
      const religiousAffiliation = RELIGIOUS_CODE_MAP[religCode] || "Unknown";
      const religiousOrientation = ORIENT_CODE_MAP[orientCode] || null;
      const isReligious = religCode !== "3" && religCode !== "-1";
      
      const updateData = {
        name: record["PSS_INST"] || "",
        address: record["PSS_ADDRESS"] || "",
        city: record["PSS_CITY"] || "",
        state: record["PSS_STABB"] || "NY",
        zipCode: record["PSS_ZIP5"] || null,
        phone: formatPhone(record["PSS_PHONE"]),
        borough: getBoroughFromZip(record["PSS_ZIP5"]),
        
        gradesOffered: getGradesOffered(loGrade, hiGrade),
        lowestGrade,
        highestGrade,
        
        enrollment: totalEnrollment,
        enrollmentByGrade: buildEnrollmentByGrade(record),
        teachersFte: parseNumber(record["PSS_FTE_TEACH"]),
        studentTeacherRatio: parseNumber(record["PSS_STDTCH_RT"]),
        
        coedStatus,
        religiousAffiliation,
        religiousOrientation,
        isReligious,
        
        schoolDayMinutes,
        schoolYearDays: schoolDays,
        
        asianPercent: parseNumber(record["PSS_ASIAN_PCT"]),
        blackPercent: parseNumber(record["PSS_BLACK_PCT"]),
        hispanicPercent: parseNumber(record["PSS_HISP_PCT"]),
        whitePercent: parseNumber(record["PSS_WHITE_PCT"]),
        pacificIslanderPercent: parseNumber(record["PSS_PACISL_PCT"]),
        americanIndianPercent: parseNumber(record["PSS_INDIAN_PCT"]),
        multiRacialPercent: parseNumber(record["PSS_TWOMORE_PCT"]),
        
        hasLibrary: record["PSS_LIBRARY"] === "Yes",
        associations: getAssociations(record),
        
        dataSourceYear: 2024,
        dataSourceVersion: "PSS 2023-24",
        updatedAt: new Date(),
      };
      
      if (existingSchool.length > 0) {
        await db.update(privateSchools)
          .set(updateData)
          .where(eq(privateSchools.ncesId, ncesId));
        updated++;
        console.log(`Updated: ${record["PSS_INST"]} (${ncesId})`);
      } else {
        await db.insert(privateSchools).values({
          ncesId,
          ...updateData,
        });
        inserted++;
        console.log(`Inserted: ${record["PSS_INST"]} (${ncesId})`);
      }
      
      await db.insert(privateSchoolHistory).values({
        ncesId,
        schoolYear: 2024,
        enrollment: totalEnrollment,
        teachersFte: parseNumber(record["PSS_FTE_TEACH"]),
        studentTeacherRatio: parseNumber(record["PSS_STDTCH_RT"]),
        schoolDayMinutes,
        schoolYearDays: schoolDays,
        dataSourceVersion: "PSS 2023-24",
      }).onConflictDoNothing();
      
    } catch (error) {
      console.error(`Error processing ${ncesId}:`, error);
      errors++;
    }
  }
  
  console.log("\n=== Import Summary ===");
  console.log(`Total records: ${records.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);
  
  const totalSchools = await db.select().from(privateSchools);
  console.log(`Total schools in database: ${totalSchools.length}`);
}

importPSS202324()
  .then(() => {
    console.log("Import complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });
