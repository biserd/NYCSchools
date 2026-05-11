/**
 * Import NYC charter schools from NYC Open Data (LCGMS dataset wg9x-4ke6).
 *
 * Inserts (or upserts) all schools where managed_by_name = 'Charter' into
 * the `schools` table. We use the school's geographical_district_code so
 * that charters appear in normal district-based filtering. Test scores are
 * left NULL — the existing NYSED importer will back-fill them on its next
 * run, matched by DBN.
 *
 * Run with: npx tsx scripts/import-charter-schools.ts
 */

import { db } from "../server/db";
import { schools } from "../shared/schema";
import { sql, eq } from "drizzle-orm";

const SOURCE_URL =
  "https://data.cityofnewyork.us/resource/wg9x-4ke6.json?$where=managed_by_name='Charter'&$limit=1000";

interface RawCharter {
  system_code?: string;
  location_name?: string;
  primary_address_line_1?: string;
  grades_final_text?: string;
  grades_text?: string;
  longitude?: string;
  latitude?: string;
  geographical_district_code?: string;
  principal_name?: string;
  principal_phone_number?: string;
  status_descriptions?: string;
}

function deriveGradeBand(gradesText: string | undefined): string {
  if (!gradesText) return "K-5";
  const grades = gradesText.toUpperCase();
  const hasHS = /\b(09|10|11|12)\b/.test(grades);
  const hasMS = /\b(06|07|08)\b/.test(grades);
  const hasES = /\b(0K|01|02|03|04|05)\b/.test(grades) || grades.includes("PK");

  if (hasHS && hasES) return "K-12";
  if (hasHS && hasMS) return "6-12";
  if (hasHS) return "9-12";
  if (hasMS && hasES) return "K-8";
  if (hasMS) return "6-8";
  return "K-5";
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function main() {
  console.log("Fetching charters from NYC Open Data...");
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const raw = (await res.json()) as RawCharter[];
  console.log(`Got ${raw.length} charter rows from upstream.`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let invalidDistrict = 0;

  for (const r of raw) {
    const dbn = (r.system_code || "").trim().toUpperCase();
    if (!dbn || !dbn.startsWith("84")) {
      skipped++;
      continue;
    }
    if ((r.status_descriptions || "").toLowerCase() !== "open") {
      // skip closed/proposed charters
      skipped++;
      continue;
    }
    const name = (r.location_name || "").trim();
    if (!name) {
      skipped++;
      continue;
    }

    let district = parseInt(r.geographical_district_code || "0", 10);
    if (isNaN(district) || district < 1 || district > 32) {
      // Fallback to borough-based district guess from DBN letter
      const boroughLetter = dbn.charAt(2);
      const fallback: Record<string, number> = {
        M: 4, // Manhattan – a generic central district
        X: 9, // Bronx
        K: 16, // Brooklyn
        Q: 28, // Queens
        R: 31, // Staten Island
      };
      district = fallback[boroughLetter] || 1;
      invalidDistrict++;
    }

    const address = titleCase(r.primary_address_line_1 || "").trim() || "New York, NY";
    const gradeBand = deriveGradeBand(r.grades_final_text || r.grades_text);
    const lat = r.latitude ? parseFloat(r.latitude) : null;
    const lng = r.longitude ? parseFloat(r.longitude) : null;
    const principal = r.principal_name && r.principal_name !== "NULL" ? r.principal_name : null;
    const phone = r.principal_phone_number && r.principal_phone_number !== "NULL" ? r.principal_phone_number : null;

    // Check if it already exists
    const existing = await db.select({ dbn: schools.dbn }).from(schools).where(eq(schools.dbn, dbn)).limit(1);

    if (existing.length > 0) {
      // Update only metadata, never overwrite scores/test data
      await db
        .update(schools)
        .set({
          name,
          district,
          address,
          grade_band: gradeBand,
          latitude: lat ?? undefined,
          longitude: lng ?? undefined,
          principal_name: principal ?? undefined,
          phone: phone ?? undefined,
          last_updated: new Date(),
        })
        .where(eq(schools.dbn, dbn));
      updated++;
    } else {
      await db.insert(schools).values({
        dbn,
        name,
        district,
        address,
        grade_band: gradeBand,
        // Required NOT NULL columns — use 0 placeholders; the UI handles
        // missing/zero values gracefully and the NYSED importer back-fills
        // proficiency once it next runs.
        academics_score: 0,
        climate_score: 0,
        progress_score: 0,
        enrollment: 0,
        student_teacher_ratio: 0,
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
        principal_name: principal ?? undefined,
        phone: phone ?? undefined,
        accountability_status: "Charter School",
      });
      inserted++;
    }
  }

  console.log("---");
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Used borough fallback district for: ${invalidDistrict}`);

  // Verify
  const totalCharters = await db.execute(
    sql`SELECT COUNT(*)::int AS n FROM schools WHERE dbn LIKE '84%'`,
  );
  console.log(`Charters now in DB: ${(totalCharters.rows[0] as any).n}`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
