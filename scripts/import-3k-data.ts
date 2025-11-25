import { db } from "../server/db";
import { schools } from "../shared/schema";
import { eq } from "drizzle-orm";
import XLSX from "xlsx";
import fs from "fs";
import https from "https";

const ELEMENTARY_DIRECTORY_URL = "https://infohub.nyced.org/docs/default-source/default-document-library/ose/fall-2025---es-directory-data.xlsx";
const DOWNLOAD_PATH = "/tmp/es-directory-3k.xlsx";

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from ${url}...`);
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded to ${dest}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function extractDBNsWith3K(data: any[]): Set<string> {
  const dbns = new Set<string>();
  
  for (const row of data) {
    let has3K = false;
    
    // Check admission_process field
    const admissionProcess = (row.admission_process || '').toLowerCase();
    if (admissionProcess.includes('3k') || admissionProcess.includes('3-k')) {
      has3K = true;
    }
    
    // Check program names (name_prog1 through name_prog7)
    if (!has3K) {
      for (let i = 1; i <= 7; i++) {
        const progName = row[`name_prog${i}`] || '';
        if (progName.toLowerCase().includes('3-k') || progName.toLowerCase().includes('3k')) {
          has3K = true;
          break;
        }
      }
    }
    
    if (has3K) {
      // Extract DBN from schooldbn field
      if (row.schooldbn) {
        const dbn = String(row.schooldbn).toUpperCase().trim();
        if (dbn.match(/^\d{2}[A-Z]\d{3}$/)) {
          dbns.add(dbn);
        }
      }
      
      // Also extract DBN from program codes (first 6 chars)
      for (let i = 1; i <= 7; i++) {
        const code = row[`code_prog${i}`] || '';
        if (code.length >= 6) {
          const potentialDbn = code.substring(0, 6).toUpperCase();
          if (potentialDbn.match(/^\d{2}[A-Z]\d{3}$/)) {
            dbns.add(potentialDbn);
          }
        }
      }
    }
  }
  
  return dbns;
}

async function import3KData() {
  console.log("=== Importing 3-K Program Data from NYC DOE Directory ===\n");
  
  // Check if file exists, otherwise download
  if (!fs.existsSync(DOWNLOAD_PATH)) {
    console.log("1. Downloading Elementary Schools Directory...");
    await downloadFile(ELEMENTARY_DIRECTORY_URL, DOWNLOAD_PATH);
  } else {
    console.log("1. Using cached Elementary Schools Directory file...");
  }
  
  console.log("\n2. Reading Excel file...");
  const workbook = XLSX.readFile(DOWNLOAD_PATH);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { range: 0 });
  console.log(`   Total records in directory: ${data.length}`);
  
  console.log("\n3. Extracting DBNs with 3-K programs...");
  const dbnsWith3K = extractDBNsWith3K(data);
  console.log(`   Found ${dbnsWith3K.size} unique DBNs with 3-K programs`);
  
  console.log("\n4. Fetching schools from database...");
  const allSchools = await db.select({ dbn: schools.dbn, name: schools.name }).from(schools);
  console.log(`   Total schools in database: ${allSchools.length}`);
  
  console.log("\n5. Resetting all has_3k flags to false...");
  await db.update(schools).set({ has_3k: false });
  console.log("   Reset complete.");
  
  console.log("\n6. Updating database with 3-K data...");
  let updated = 0;
  let matched = 0;
  
  for (const school of allSchools) {
    const schoolDbn = school.dbn.toUpperCase().trim();
    
    if (dbnsWith3K.has(schoolDbn)) {
      matched++;
      await db
        .update(schools)
        .set({ has_3k: true })
        .where(eq(schools.dbn, school.dbn));
      updated++;
      
      if (updated % 50 === 0) {
        console.log(`   Updated ${updated} schools...`);
      }
    }
  }
  
  console.log(`\n✅ Import complete!`);
  console.log(`   Schools with 3-K in directory: ${dbnsWith3K.size}`);
  console.log(`   Schools matched in our database: ${matched}`);
  console.log(`   Schools updated with has_3k=true: ${updated}`);
  
  // Show sample updated schools
  console.log("\n7. Sample schools with 3-K programs:");
  const sampleSchools = await db
    .select()
    .from(schools)
    .where(eq(schools.has_3k, true))
    .limit(10);
  
  sampleSchools.forEach((school) => {
    console.log(`   ${school.dbn} | ${school.name.slice(0, 40)} | District ${school.district}`);
  });
  
  // Count by district
  console.log("\n8. 3-K schools by district:");
  const allSchoolsWith3K = await db
    .select({ district: schools.district })
    .from(schools)
    .where(eq(schools.has_3k, true));
  
  const districtCounts: Record<string, number> = {};
  allSchoolsWith3K.forEach(s => {
    districtCounts[s.district] = (districtCounts[s.district] || 0) + 1;
  });
  
  const sortedDistricts = Object.entries(districtCounts).sort((a, b) => a[0].localeCompare(b[0]));
  sortedDistricts.forEach(([district, count]) => {
    console.log(`   District ${district}: ${count} schools`);
  });
}

import3KData()
  .then(() => {
    console.log("\n✨ 3-K data import finished!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
