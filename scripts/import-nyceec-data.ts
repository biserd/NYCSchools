import { db } from "../server/db";
import { nyceecCenters, type InsertNyceecCenter } from "../shared/schema";

interface UPKLocationRecord {
  loccode: string;
  prek_type: string;
  borough: string;
  locname: string;
  phone?: string;
  address: string;
  zip?: string;
  seats?: string;
  latitude?: string;
  longitude?: string;
  email?: string;
  website?: { url: string } | string;
  meals?: string;
  indoor_outdoor?: string;
  extended_day?: string;
  sems_code?: string;
  community_board?: string;
  community_council?: string;
  nta?: string;
}

async function fetchNYCOpenData(datasetId: string, limit: number = 50000): Promise<any[]> {
  const url = `https://data.cityofnewyork.us/resource/${datasetId}.json?$limit=${limit}`;
  console.log(`Fetching from ${url}...`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`  Retrieved ${data.length} records`);
    return data;
  } catch (error) {
    console.error(`Error fetching dataset ${datasetId}:`, error);
    return [];
  }
}

function extractDistrict(semsCode: string | undefined): number | null {
  if (!semsCode) return null;
  const match = semsCode.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parseBoolean(value: string | undefined, trueValues: string[] = ['1', '2', 'Y', 'Yes']): boolean {
  if (!value) return false;
  return trueValues.includes(value);
}

function parseDayLength(value: string | undefined): string {
  switch (value) {
    case '1': return 'Full Day';
    case '2': return 'Half Day AM';
    case '3': return 'Half Day PM';
    default: return value || 'Unknown';
  }
}

function parseWebsite(website: { url: string } | string | undefined): string | null {
  if (!website) return null;
  if (typeof website === 'string') return website;
  return website.url || null;
}

function transformRecord(record: UPKLocationRecord): InsertNyceecCenter {
  return {
    locCode: record.loccode.toUpperCase(),
    name: record.locname,
    centerType: record.prek_type || 'NYCEEC',
    borough: record.borough.toUpperCase(),
    district: extractDistrict(record.sems_code),
    address: record.address,
    zipCode: record.zip || null,
    latitude: record.latitude ? parseFloat(record.latitude) : null,
    longitude: record.longitude ? parseFloat(record.longitude) : null,
    nta: record.nta?.trim() || null,
    phone: record.phone || null,
    email: record.email || null,
    website: parseWebsite(record.website),
    seats: record.seats ? parseInt(record.seats, 10) : null,
    dayLength: parseDayLength(record.meals),
    extendedDay: parseBoolean(record.extended_day, ['1', '2']),
    mealsProvided: parseBoolean(record.meals, ['1', '2', '3', '4', '5']),
    indoorOutdoor: record.indoor_outdoor || null,
    semsCode: record.sems_code || null,
    communityBoard: record.community_board || null,
    councilDistrict: record.community_council || null,
  };
}

async function importNyceecData() {
  console.log("=== Importing NYCEEC Early Childhood Center Data ===\n");
  
  console.log("1. Fetching Universal Pre-K (UPK) School Locations (kiyv-ks3f)...");
  const upkData = await fetchNYCOpenData('kiyv-ks3f');
  
  if (upkData.length === 0) {
    console.error("No data retrieved. Exiting.");
    process.exit(1);
  }
  
  console.log("\n2. Processing records...");
  
  const centers: InsertNyceecCenter[] = [];
  const byType: Record<string, number> = {};
  const byBorough: Record<string, number> = {};
  
  for (const record of upkData as UPKLocationRecord[]) {
    if (!record.loccode || !record.locname || !record.address) {
      continue;
    }
    
    const center = transformRecord(record);
    centers.push(center);
    
    byType[center.centerType] = (byType[center.centerType] || 0) + 1;
    byBorough[center.borough] = (byBorough[center.borough] || 0) + 1;
  }
  
  console.log(`   Processed ${centers.length} valid centers`);
  console.log("\n   By Type:");
  for (const [type, count] of Object.entries(byType)) {
    console.log(`     ${type}: ${count}`);
  }
  console.log("\n   By Borough:");
  for (const [borough, count] of Object.entries(byBorough)) {
    const boroughName = {
      'M': 'Manhattan',
      'X': 'Bronx',
      'K': 'Brooklyn',
      'Q': 'Queens',
      'R': 'Staten Island'
    }[borough] || borough;
    console.log(`     ${boroughName}: ${count}`);
  }
  
  console.log("\n3. Inserting into database...");
  
  const chunkSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < centers.length; i += chunkSize) {
    const chunk = centers.slice(i, i + chunkSize);
    
    await db.insert(nyceecCenters)
      .values(chunk)
      .onConflictDoUpdate({
        target: nyceecCenters.locCode,
        set: {
          name: chunk[0].name,
          centerType: chunk[0].centerType,
          borough: chunk[0].borough,
          district: chunk[0].district,
          address: chunk[0].address,
          zipCode: chunk[0].zipCode,
          latitude: chunk[0].latitude,
          longitude: chunk[0].longitude,
          nta: chunk[0].nta,
          phone: chunk[0].phone,
          email: chunk[0].email,
          website: chunk[0].website,
          seats: chunk[0].seats,
          dayLength: chunk[0].dayLength,
          extendedDay: chunk[0].extendedDay,
          mealsProvided: chunk[0].mealsProvided,
          indoorOutdoor: chunk[0].indoorOutdoor,
          semsCode: chunk[0].semsCode,
          communityBoard: chunk[0].communityBoard,
          councilDistrict: chunk[0].councilDistrict,
          lastUpdated: new Date(),
        },
      });
    
    inserted += chunk.length;
    
    if (inserted % 500 === 0 || inserted === centers.length) {
      console.log(`   Inserted ${inserted}/${centers.length} centers...`);
    }
  }
  
  console.log("\n✅ Import complete!");
  console.log(`   Total centers imported: ${centers.length}`);
  
  console.log("\nSample NYCEEC centers:");
  const samples = centers
    .filter(c => c.centerType === 'NYCEEC')
    .slice(0, 5);
  for (const center of samples) {
    console.log(`   - ${center.name} (${center.locCode})`);
    console.log(`     ${center.address}, ${center.borough} ${center.zipCode}`);
    console.log(`     Seats: ${center.seats || 'N/A'} | District: ${center.district || 'N/A'}`);
  }
  
  process.exit(0);
}

importNyceecData().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
