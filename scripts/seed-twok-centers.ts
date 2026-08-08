import { db } from "../server/db";
import { twokCenters } from "../shared/schema";
import { sql } from "drizzle-orm";
import fs from "fs";
import { parse } from "csv-parse/sync";

const BOROUGH_MAP: Record<string, string> = {
  bronx: "Bronx",
  brooklyn: "Brooklyn",
  manhattan: "Manhattan",
  queens: "Queens",
  "staten island": "Staten Island",
};

function normBorough(raw: string): string {
  const key = (raw || "").toLowerCase().trim();
  return BOROUGH_MAP[key] ?? raw;
}

function programType(programName: string): string {
  const n = (programName || "").toLowerCase();
  if (n.includes("expanded day")) return "EDFY";
  if (n.includes("school day")) return "SDY";
  return "EDFY";
}

async function main() {
  const csv = fs.readFileSync("attached_assets/nyc-2k-schools_1786231670808.csv", "utf-8");
  const rows: Record<string, string>[] = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  });

  const records = rows
    .map((r) => {
      const dbn = (r["school.dbn"] || "").trim();
      if (!dbn) return null;

      const latRaw = (r["school.address.latitude"] || "").replace(/['"]/g, "").trim();
      const lonRaw = (r["school.address.longitude"] || "").replace(/['"]/g, "").trim();

      return {
        dbn,
        name: (r["school.name"] || r["name"] || dbn).trim(),
        borough: normBorough(r["school.district.borough"] || ""),
        district: r["school.district.code"] ? parseInt(r["school.district.code"], 10) || null : null,
        address: (r["school.address.address_1"] || r["school.full_address"] || "").trim() || "N/A",
        zipCode: (r["school.address.zip_code"] || "").trim() || null,
        latitude: latRaw ? parseFloat(latRaw) : null,
        longitude: lonRaw ? parseFloat(lonRaw) : null,
        phone: (r["telephone"] || r["program.provider_phone_number"] || "").trim() || null,
        email: (r["email"] || r["program.provider_email"] || "").trim() || null,
        website: (r["independent_website"] || r["program.provider_website"] || "").trim() || null,
        programName: (r["program.name"] || "2-K").trim(),
        programType: programType(r["program.name"] || ""),
        schoolType: (r["school.school_type.name"] || "PUBLIC").trim(),
      };
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof rows.map>[0]>[];

  console.log(`Seeding ${records.length} 2-K centers…`);

  // Upsert in batches of 100
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    await db
      .insert(twokCenters)
      .values(batch)
      .onConflictDoUpdate({
        target: twokCenters.dbn,
        set: {
          name: sql`EXCLUDED.name`,
          borough: sql`EXCLUDED.borough`,
          district: sql`EXCLUDED.district`,
          address: sql`EXCLUDED.address`,
          zipCode: sql`EXCLUDED.zip_code`,
          latitude: sql`EXCLUDED.latitude`,
          longitude: sql`EXCLUDED.longitude`,
          phone: sql`EXCLUDED.phone`,
          email: sql`EXCLUDED.email`,
          website: sql`EXCLUDED.website`,
          programName: sql`EXCLUDED.program_name`,
          programType: sql`EXCLUDED.program_type`,
          schoolType: sql`EXCLUDED.school_type`,
          lastUpdated: sql`NOW()`,
        },
      });
    console.log(`  ✓ batch ${Math.floor(i / 100) + 1}: ${batch.length} rows`);
  }

  const [{ count }] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*)::text AS count FROM twok_centers`
  );
  console.log(`Done. twok_centers now has ${count} rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
