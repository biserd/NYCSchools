/**
 * NYC School District to Borough Mapping
 * Based on NYC Department of Education community school district structure
 */

export type Borough = "Manhattan" | "Bronx" | "Brooklyn" | "Queens" | "Staten Island";

const DISTRICT_TO_BOROUGH: Record<number, Borough> = {
  // Manhattan (Districts 1-6)
  1: "Manhattan",
  2: "Manhattan",
  3: "Manhattan",
  4: "Manhattan",
  5: "Manhattan",
  6: "Manhattan",
  
  // Bronx (Districts 7-12)
  7: "Bronx",
  8: "Bronx",
  9: "Bronx",
  10: "Bronx",
  11: "Bronx",
  12: "Bronx",
  
  // Brooklyn (Districts 13-23, 32)
  13: "Brooklyn",
  14: "Brooklyn",
  15: "Brooklyn",
  16: "Brooklyn",
  17: "Brooklyn",
  18: "Brooklyn",
  19: "Brooklyn",
  20: "Brooklyn",
  21: "Brooklyn",
  22: "Brooklyn",
  23: "Brooklyn",
  32: "Brooklyn",
  
  // Queens (Districts 24-30)
  24: "Queens",
  25: "Queens",
  26: "Queens",
  27: "Queens",
  28: "Queens",
  29: "Queens",
  30: "Queens",
  
  // Staten Island (District 31)
  31: "Staten Island",
};

/**
 * Extract district number from DBN code
 * DBN format: ##X### where ## is district, X is borough code, ### is school number
 * Example: 02M158 -> district 2 (Manhattan)
 */
export function extractDistrictFromDBN(dbn: string): number {
  const districtStr = dbn.substring(0, 2);
  const district = parseInt(districtStr, 10);
  return isNaN(district) ? 0 : district;
}

/**
 * Get borough from DBN code
 * Returns null if DBN is invalid or not in NYC 5 boroughs
 */
export function getBoroughFromDBN(dbn: string): Borough | null {
  const district = extractDistrictFromDBN(dbn);
  return DISTRICT_TO_BOROUGH[district] || null;
}

/**
 * Check if a DBN belongs to a NYC 5-borough school
 */
export function isNYC5Borough(dbn: string): boolean {
  return getBoroughFromDBN(dbn) !== null;
}

/**
 * Get all valid NYC 5-borough districts
 */
export function getNYCDistricts(): number[] {
  return Object.keys(DISTRICT_TO_BOROUGH).map(d => parseInt(d, 10));
}

/**
 * Get all schools for a specific borough
 */
export function getDistrictsForBorough(borough: Borough): number[] {
  return Object.entries(DISTRICT_TO_BOROUGH)
    .filter(([_, b]) => b === borough)
    .map(([d, _]) => parseInt(d, 10));
}
