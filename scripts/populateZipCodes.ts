import { db } from '../server/db';
import { schools } from '../shared/schema';
import { eq, isNull, isNotNull, and } from 'drizzle-orm';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint, Feature, Polygon, MultiPolygon } from '@turf/helpers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ZipCodeFeature {
  type: 'Feature';
  properties: {
    ZCTA5CE10: string; // Zip code
    [key: string]: any;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: ZipCodeFeature[];
}

// NYC zip code ranges
const NYC_ZIP_PREFIXES = ['100', '101', '102', '103', '104', '110', '111', '112', '113', '114', '116'];

async function populateZipCodes() {
  console.log('Starting zip code population...');
  
  // Load the GeoJSON file
  const geojsonPath = path.join(__dirname, 'nyc_zip_codes.geojson');
  
  if (!fs.existsSync(geojsonPath)) {
    console.error('GeoJSON file not found at:', geojsonPath);
    console.log('Please download the NYC zip code GeoJSON file first.');
    process.exit(1);
  }
  
  const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8')) as GeoJSONCollection;
  
  // Filter to only NYC zip codes
  const nycZipFeatures = geojsonData.features.filter(feature => {
    const zip = feature.properties.ZCTA5CE10;
    return NYC_ZIP_PREFIXES.some(prefix => zip.startsWith(prefix));
  });
  
  console.log(`Found ${nycZipFeatures.length} NYC zip code boundaries`);
  
  // Get all schools with coordinates but no zip code
  const schoolsToUpdate = await db.select()
    .from(schools)
    .where(and(
      isNotNull(schools.latitude),
      isNotNull(schools.longitude),
      isNull(schools.zip_code)
    ));
  
  console.log(`Found ${schoolsToUpdate.length} schools with coordinates needing zip codes`);
  
  let updatedCount = 0;
  let notFoundCount = 0;
  
  for (const school of schoolsToUpdate) {
    if (!school.latitude || !school.longitude) continue;
    
    const schoolPoint = turfPoint([school.longitude, school.latitude]);
    let foundZip: string | null = null;
    
    // Check each zip code polygon
    for (const feature of nycZipFeatures) {
      try {
        if (booleanPointInPolygon(schoolPoint, feature as Feature<Polygon | MultiPolygon>)) {
          foundZip = feature.properties.ZCTA5CE10;
          break;
        }
      } catch (err) {
        // Skip invalid geometries
        continue;
      }
    }
    
    if (foundZip) {
      await db.update(schools)
        .set({ zip_code: foundZip })
        .where(eq(schools.dbn, school.dbn));
      updatedCount++;
      
      if (updatedCount % 100 === 0) {
        console.log(`Updated ${updatedCount} schools...`);
      }
    } else {
      notFoundCount++;
      console.log(`No zip found for school: ${school.name} (${school.dbn}) at ${school.latitude}, ${school.longitude}`);
    }
  }
  
  console.log(`\nCompleted!`);
  console.log(`Updated: ${updatedCount} schools`);
  console.log(`Not found: ${notFoundCount} schools`);
}

populateZipCodes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
