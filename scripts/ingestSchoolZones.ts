import { db } from "../server/db";
import { schoolZones } from "../shared/schema";

interface GeoJSONFeature {
  type: "Feature";
  properties: {
    OBJECTID?: number;
    DBN?: string;
    SCHOOLNAME?: string;
    DISTRICT?: string;
    REMARKS?: string;
    SchoolName?: string;
    School_DBN?: string;
    Dist?: string;
    [key: string]: unknown;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

const NYC_OPEN_DATA_URLS = {
  elementary: "https://data.cityofnewyork.us/resource/cmjf-yawu.geojson?$limit=2000",
  middle: "https://data.cityofnewyork.us/resource/t26j-jbq7.geojson?$limit=2000",
  high: "https://data.cityofnewyork.us/resource/ruu9-egea.geojson?$limit=2000",
};

async function fetchZoneData(url: string): Promise<GeoJSONCollection> {
  console.log(`Fetching zone data from: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  
  if (Array.isArray(data)) {
    return {
      type: "FeatureCollection",
      features: data.map((item: Record<string, unknown>) => ({
        type: "Feature",
        properties: item,
        geometry: item.the_geom || item.geometry,
      })) as GeoJSONFeature[],
    };
  }
  
  return data as GeoJSONCollection;
}

function extractDbn(properties: GeoJSONFeature["properties"]): string | null {
  const dbn = properties.DBN || 
              properties.School_DBN || 
              properties.dbn || 
              properties.school_dbn;
  
  if (!dbn) return null;
  
  const dbnStr = String(dbn).trim();
  if (dbnStr.length < 6) return null;
  
  return dbnStr;
}

function extractSchoolName(properties: GeoJSONFeature["properties"]): string | null {
  const name = properties.SCHOOLNAME || 
               properties.SchoolName || 
               properties.schoolname ||
               properties.school_name;
  return name ? String(name) : null;
}

function extractDistrict(properties: GeoJSONFeature["properties"]): number | null {
  const dist = properties.DISTRICT || 
               properties.Dist || 
               properties.district ||
               properties.dist;
  
  if (!dist) return null;
  
  const distNum = parseInt(String(dist), 10);
  return isNaN(distNum) ? null : distNum;
}

async function ingestZones(gradeLevel: "elementary" | "middle" | "high"): Promise<number> {
  const url = NYC_OPEN_DATA_URLS[gradeLevel];
  const data = await fetchZoneData(url);
  
  console.log(`\n${gradeLevel.toUpperCase()} ZONES:`);
  console.log(`Total features received: ${data.features?.length || 0}`);
  
  if (!data.features || data.features.length === 0) {
    console.log(`No features found for ${gradeLevel} zones`);
    return 0;
  }
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  for (const feature of data.features) {
    const dbn = extractDbn(feature.properties);
    
    if (!dbn) {
      skippedCount++;
      continue;
    }
    
    const geometry = feature.geometry || feature.properties.the_geom;
    
    if (!geometry || !geometry.type || !geometry.coordinates) {
      console.log(`  Skipping ${dbn}: No valid geometry`);
      skippedCount++;
      continue;
    }
    
    try {
      const remarksValue = feature.properties.REMARKS || feature.properties.remarks;
      await db.insert(schoolZones).values({
        dbn: dbn,
        schoolName: extractSchoolName(feature.properties),
        district: extractDistrict(feature.properties),
        gradeLevel: gradeLevel,
        geometry: geometry as unknown,
        remarks: remarksValue ? String(remarksValue) : null,
      });
      insertedCount++;
    } catch (error) {
      console.log(`  Error inserting ${dbn}:`, error);
      skippedCount++;
    }
  }
  
  console.log(`  Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
  return insertedCount;
}

async function main() {
  console.log("=== NYC School Zone Ingestion ===");
  console.log("Data source: NYC Open Data (Official NYC DOE School Zones 2024-2025)");
  console.log("");
  
  console.log("Clearing existing zone data...");
  await db.delete(schoolZones);
  
  let totalInserted = 0;
  
  for (const gradeLevel of ["elementary", "middle", "high"] as const) {
    try {
      const count = await ingestZones(gradeLevel);
      totalInserted += count;
    } catch (error) {
      console.error(`Error ingesting ${gradeLevel} zones:`, error);
    }
  }
  
  console.log("\n=== SUMMARY ===");
  console.log(`Total zones inserted: ${totalInserted}`);
  console.log("Zone data ingestion complete!");
  
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
