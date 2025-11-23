/**
 * Script to read NYC school locations from downloaded CSV and update database with coordinates
 * Data source: https://data.cityofnewyork.us/Education/2019-2020-School-Locations/wg9x-4ke6
 */

import { db } from "../server/db";
import { schools } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";

interface NYCOpenDataSchool {
  system_code: string;  // This is the DBN (e.g., "15K001")
  location_code: string;  // Building code (e.g., "K001")
  location_name: string;
  latitude: string;
  longitude: string;
  geographical_district_code: string;
  primary_address_line_1: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

async function readSchoolLocations(): Promise<NYCOpenDataSchool[]> {
  console.log("Reading school locations from CSV file...");
  
  const csvPath = "/tmp/school-locations.csv";
  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvText.split('\n');
  
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  
  // Find column indices
  const systemCodeIdx = headers.indexOf('system_code');  // This is the DBN!
  const locationCodeIdx = headers.indexOf('location_code');
  const locationNameIdx = headers.indexOf('location_name');
  const latIdx = headers.indexOf('latitude');
  const lngIdx = headers.indexOf('longitude');
  const districtIdx = headers.indexOf('geographical_district_code');
  const addressIdx = headers.indexOf('primary_address_line_1');
  
  const data: NYCOpenDataSchool[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseCSVLine(lines[i]);
    
    const systemCode = values[systemCodeIdx];  // DBN
    const lat = values[latIdx];
    const lng = values[lngIdx];
    
    if (systemCode && lat && lng) {
      data.push({
        system_code: systemCode,
        location_code: values[locationCodeIdx] || '',
        location_name: values[locationNameIdx] || '',
        latitude: lat,
        longitude: lng,
        geographical_district_code: values[districtIdx] || '',
        primary_address_line_1: values[addressIdx] || ''
      });
    }
  }
  
  console.log(`Read ${data.length} schools from CSV`);
  
  return data;
}

async function geocodeAllSchools() {
  try {
    // Read NYC Open Data school locations from CSV
    const nycSchools = await readSchoolLocations();
    
    // Create a map of DBN (system_code) to coordinates
    const coordsMap = new Map<string, { lat: number; lng: number }>();
    
    for (const school of nycSchools) {
      if (school.system_code && school.latitude && school.longitude) {
        const lat = parseFloat(school.latitude);
        const lng = parseFloat(school.longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          // system_code matches our DBN format (e.g., "15K001")
          coordsMap.set(school.system_code, { lat, lng });
        }
      }
    }
    
    console.log(`\nCreated coordinate map for ${coordsMap.size} schools`);
    
    // Get all schools from our database
    const allSchools = await db.select().from(schools);
    console.log(`Found ${allSchools.length} schools in database`);
    
    // Update schools with coordinates
    let updated = 0;
    let notFound = 0;
    
    for (const school of allSchools) {
      const coords = coordsMap.get(school.dbn);
      
      if (coords) {
        await db
          .update(schools)
          .set({
            latitude: coords.lat,
            longitude: coords.lng,
          })
          .where(eq(schools.dbn, school.dbn));
        
        updated++;
        
        if (updated % 100 === 0) {
          console.log(`Updated ${updated} schools...`);
        }
      } else {
        notFound++;
        console.log(`⚠ No coordinates found for ${school.dbn}: ${school.name}`);
      }
    }
    
    console.log(`\n✅ Geocoding complete!`);
    console.log(`   Updated: ${updated} schools`);
    console.log(`   Not found: ${notFound} schools`);
    console.log(`   Total: ${allSchools.length} schools`);
    
    // Show sample of updated schools
    const sampleSchools = await db
      .select({
        dbn: schools.dbn,
        name: schools.name,
        latitude: schools.latitude,
        longitude: schools.longitude,
      })
      .from(schools)
      .where(eq(schools.district, 1))
      .limit(5);
    
    console.log(`\n📍 Sample schools with coordinates (District 1):`);
    for (const school of sampleSchools) {
      console.log(`   ${school.dbn} - ${school.name}: (${school.latitude}, ${school.longitude})`);
    }
    
  } catch (error) {
    console.error("Error geocoding schools:", error);
    throw error;
  }
}

// Run the script
geocodeAllSchools()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });
