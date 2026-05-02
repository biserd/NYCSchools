/**
 * Neighborhood Safety Index — sync + lookup logic.
 *
 *   1. `syncNypdComplaints` pulls the last ~24 months of NYPD complaint
 *      data (current YTD + historic) into the local `nypd_complaints` table.
 *      This is one bulk Socrata pull instead of 16k+ within_circle calls.
 *
 *   2. `recomputeSafetyIndex` walks every (school, radius) combination
 *      across all three school types (public/private/NYCEEC), aggregates
 *      complaint counts inside each radius using a bbox prefilter +
 *      Haversine distance, and upserts a row per combination.
 *
 *   3. After raw scores are written, `assignPercentilesAndIndex` ranks
 *      schools citywide per radius and converts the weighted risk score
 *      into the parent-facing 0–100 safety index.
 *
 *   4. `getSafetyIndex` is the read path used by the API route.
 */

import { db } from "../db";
import { sql, and, eq, between, gte, lte } from "drizzle-orm";
import {
  nypdComplaints,
  schoolSafetyIndex,
  schools,
  privateSchools,
  nyceecCenters,
  appSettings,
  SAFETY_RADIUS_OPTIONS,
  SAFETY_OFFENSE_WEIGHTS,
  VIOLENT_FELONY_OFFENSES,
  getSafetyLabel,
  type SafetyIndexResponse,
  type InsertNypdComplaint,
} from "@shared/schema";
import { streamSocrata, type NypdComplaintRow } from "./socrataClient";

type SchoolType = "public" | "private" | "nyceec";

interface SchoolPoint {
  type: SchoolType;
  key: string;
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_000;
const NYC_LAT = 40.7128;
const METERS_PER_DEG_LAT = 111_320;
function metersPerDegLng(latDeg: number) {
  return METERS_PER_DEG_LAT * Math.cos((latDeg * Math.PI) / 180);
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

// ---------------------------------------------------------------------------
// 1. Pull NYPD complaints from Socrata into local cache
// ---------------------------------------------------------------------------

function parseRow(row: NypdComplaintRow): InsertNypdComplaint | null {
  const id = row.cmplnt_num;
  if (!id) return null;

  const dateStr = row.cmplnt_fr_dt;
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  let lat: number | undefined;
  let lng: number | undefined;
  if (row.latitude && row.longitude) {
    lat = parseFloat(row.latitude);
    lng = parseFloat(row.longitude);
  } else if (row.lat_lon?.latitude && row.lat_lon?.longitude) {
    lat = parseFloat(row.lat_lon.latitude);
    lng = parseFloat(row.lat_lon.longitude);
  }
  if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
    return null;
  }
  // Sanity: drop rows clearly outside NYC bounding box
  if (lat < 40.4 || lat > 41.0 || lng < -74.3 || lng > -73.6) return null;

  return {
    cmplntNum: String(id),
    complaintDate: date,
    lawCatCd: (row.law_cat_cd ?? null)?.toString().toUpperCase() ?? null,
    ofnsDesc: (row.ofns_desc ?? null)?.toString().toUpperCase() ?? null,
    pdDesc: (row.pd_desc ?? null)?.toString().toUpperCase() ?? null,
    borough: (row.boro_nm ?? null)?.toString().toUpperCase() ?? null,
    latitude: lat,
    longitude: lng,
  };
}

async function bulkUpsertComplaints(rows: InsertNypdComplaint[]) {
  if (rows.length === 0) return;
  // Drizzle's onConflictDoUpdate doesn't easily express column-by-column
  // upserts when the conflict target IS the PK. We just do "do nothing"
  // since complaint records are immutable.
  await db.insert(nypdComplaints).values(rows).onConflictDoNothing();
}

export interface SyncOptions {
  /** Months of data to pull. Defaults to 24 (covers current + prior year). */
  months?: number;
  /** Optional cap for development/testing. */
  maxRows?: number;
}

export async function syncNypdComplaints(opts: SyncOptions = {}): Promise<{
  inserted: number;
  cutoffISO: string;
}> {
  const months = opts.months ?? 24;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffISO = cutoff.toISOString().slice(0, 19); // SoQL: YYYY-MM-DDTHH:mm:ss

  const select = "cmplnt_num, cmplnt_fr_dt, law_cat_cd, ofns_desc, pd_desc, boro_nm, latitude, longitude";
  const where = `cmplnt_fr_dt >= '${cutoffISO}' AND latitude IS NOT NULL AND longitude IS NOT NULL`;

  const datasets = ["5uac-w243", "qgea-i56i"]; // YTD + historic
  let total = 0;
  const buffer: InsertNypdComplaint[] = [];
  const BATCH = 5_000;

  for (const dataset of datasets) {
    console.log(`[safety-sync] streaming ${dataset} since ${cutoffISO}…`);
    let datasetCount = 0;
    try {
      for await (const raw of streamSocrata<NypdComplaintRow>({
        dataset,
        select,
        where,
        order: "cmplnt_fr_dt",
        pageSize: 50_000,
        maxRows: opts.maxRows,
      })) {
        const parsed = parseRow(raw);
        if (!parsed) continue;
        buffer.push(parsed);
        datasetCount++;
        if (buffer.length >= BATCH) {
          await bulkUpsertComplaints(buffer);
          total += buffer.length;
          buffer.length = 0;
        }
      }
    } catch (err) {
      console.error(`[safety-sync] error pulling ${dataset}:`, err);
      // Continue with next dataset rather than aborting whole sync
    }
    console.log(`[safety-sync] ${dataset}: streamed ${datasetCount} rows`);
  }

  if (buffer.length > 0) {
    await bulkUpsertComplaints(buffer);
    total += buffer.length;
    buffer.length = 0;
  }

  // Trim anything older than the cutoff to keep the table bounded
  await db.execute(sql`
    DELETE FROM nypd_complaints
    WHERE complaint_date < ${cutoff}
  `);

  console.log(`[safety-sync] complaint cache total inserted: ${total}`);
  return { inserted: total, cutoffISO };
}

// ---------------------------------------------------------------------------
// 2. Recompute per-school safety scores
// ---------------------------------------------------------------------------

async function loadAllSchoolPoints(): Promise<SchoolPoint[]> {
  const points: SchoolPoint[] = [];

  const pub = await db
    .select({ key: schools.dbn, lat: schools.latitude, lng: schools.longitude })
    .from(schools);
  for (const p of pub) {
    if (p.lat != null && p.lng != null) {
      points.push({ type: "public", key: p.key, lat: p.lat, lng: p.lng });
    }
  }

  const priv = await db
    .select({
      key: privateSchools.ncesId,
      lat: privateSchools.latitude,
      lng: privateSchools.longitude,
    })
    .from(privateSchools);
  for (const p of priv) {
    if (p.lat != null && p.lng != null && p.key) {
      points.push({ type: "private", key: p.key, lat: p.lat, lng: p.lng });
    }
  }

  const ec = await db
    .select({
      key: nyceecCenters.locCode,
      lat: nyceecCenters.latitude,
      lng: nyceecCenters.longitude,
    })
    .from(nyceecCenters);
  for (const p of ec) {
    if (p.lat != null && p.lng != null && p.key) {
      points.push({ type: "nyceec", key: p.key, lat: p.lat, lng: p.lng });
    }
  }

  return points;
}

interface ComplaintLite {
  date: Date;
  lat: number;
  lng: number;
  cat: string | null;     // 'FELONY' | 'MISDEMEANOR' | 'VIOLATION'
  ofns: string | null;
  isViolent: boolean;
}

/**
 * Load all complaints once and keep them in memory. ~800k rows × ~80 bytes
 * each ≈ 65 MB; comfortably fits and lets us avoid a query per school.
 */
async function loadComplaintsInMemory(periodStart: Date): Promise<ComplaintLite[]> {
  const rows = await db
    .select({
      complaintDate: nypdComplaints.complaintDate,
      latitude: nypdComplaints.latitude,
      longitude: nypdComplaints.longitude,
      lawCatCd: nypdComplaints.lawCatCd,
      ofnsDesc: nypdComplaints.ofnsDesc,
    })
    .from(nypdComplaints)
    .where(gte(nypdComplaints.complaintDate, periodStart));

  return rows.map((r) => ({
    date: r.complaintDate,
    lat: r.latitude,
    lng: r.longitude,
    cat: r.lawCatCd,
    ofns: r.ofnsDesc,
    isViolent:
      r.lawCatCd === "FELONY" &&
      !!r.ofnsDesc &&
      VIOLENT_FELONY_OFFENSES.has(r.ofnsDesc),
  }));
}

interface RadiusAggregate {
  total: number;
  felony: number;
  violentFelony: number;
  misdemeanor: number;
  violation: number;
  byCategory: Map<string, number>;
}

function emptyAgg(): RadiusAggregate {
  return {
    total: 0,
    felony: 0,
    violentFelony: 0,
    misdemeanor: 0,
    violation: 0,
    byCategory: new Map(),
  };
}

function bumpAgg(agg: RadiusAggregate, c: ComplaintLite) {
  agg.total++;
  if (c.cat === "FELONY") {
    agg.felony++;
    if (c.isViolent) agg.violentFelony++;
  } else if (c.cat === "MISDEMEANOR") {
    agg.misdemeanor++;
  } else if (c.cat === "VIOLATION") {
    agg.violation++;
  }
  if (c.ofns) {
    agg.byCategory.set(c.ofns, (agg.byCategory.get(c.ofns) ?? 0) + 1);
  }
}

function topCategories(byCategory: Map<string, number>, n = 3) {
  return Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([category, count]) => ({ category, count }));
}

function weightedScore(agg: RadiusAggregate, areaSqKm: number) {
  const otherFelony = Math.max(0, agg.felony - agg.violentFelony);
  const raw =
    agg.violentFelony * SAFETY_OFFENSE_WEIGHTS.violentFelony +
    otherFelony * SAFETY_OFFENSE_WEIGHTS.felony +
    agg.misdemeanor * SAFETY_OFFENSE_WEIGHTS.misdemeanor +
    agg.violation * SAFETY_OFFENSE_WEIGHTS.violation;
  return raw / Math.max(areaSqKm, 0.0001);
}

interface PerSchoolRow {
  schoolType: SchoolType;
  schoolKey: string;
  radiusMeters: number;
  current: RadiusAggregate;
  prior: RadiusAggregate;
  weightedRiskScore: number;
}

export async function recomputeSafetyIndex(): Promise<{
  rowsWritten: number;
  schoolCount: number;
}> {
  const now = new Date();
  const periodEnd = now;
  const periodStart = new Date(now);
  periodStart.setMonth(periodStart.getMonth() - 12);
  const priorStart = new Date(now);
  priorStart.setMonth(priorStart.getMonth() - 24);
  const priorEnd = periodStart;

  console.log(
    `[safety-recompute] window: current ${periodStart.toISOString()}→${periodEnd.toISOString()}, prior ${priorStart.toISOString()}→${priorEnd.toISOString()}`,
  );

  const points = await loadAllSchoolPoints();
  console.log(`[safety-recompute] schools with coords: ${points.length}`);

  // Single load of last 24mo of complaints
  const allComplaints = await loadComplaintsInMemory(priorStart);
  console.log(`[safety-recompute] complaints loaded: ${allComplaints.length}`);

  const radii = SAFETY_RADIUS_OPTIONS.map((r) => r.meters);
  const maxRadius = Math.max(...radii);

  const allRows: PerSchoolRow[] = [];

  for (const school of points) {
    const latDelta = maxRadius / METERS_PER_DEG_LAT;
    const lngDelta = maxRadius / metersPerDegLng(school.lat);
    const minLat = school.lat - latDelta;
    const maxLat = school.lat + latDelta;
    const minLng = school.lng - lngDelta;
    const maxLng = school.lng + lngDelta;

    // Local bbox subset
    const nearby: ComplaintLite[] = [];
    for (const c of allComplaints) {
      if (
        c.lat >= minLat &&
        c.lat <= maxLat &&
        c.lng >= minLng &&
        c.lng <= maxLng
      ) {
        nearby.push(c);
      }
    }
    if (nearby.length === 0) {
      // Still emit zero-rows so the school has data
      for (const radiusMeters of radii) {
        allRows.push({
          schoolType: school.type,
          schoolKey: school.key,
          radiusMeters,
          current: emptyAgg(),
          prior: emptyAgg(),
          weightedRiskScore: 0,
        });
      }
      continue;
    }

    // Per-radius aggregates (current + prior)
    const aggs = new Map<number, { current: RadiusAggregate; prior: RadiusAggregate }>();
    for (const r of radii) aggs.set(r, { current: emptyAgg(), prior: emptyAgg() });

    for (const c of nearby) {
      const d = haversineMeters(school.lat, school.lng, c.lat, c.lng);
      const isCurrent = c.date >= periodStart && c.date <= periodEnd;
      const isPrior = c.date >= priorStart && c.date < periodStart;
      if (!isCurrent && !isPrior) continue;
      for (const r of radii) {
        if (d <= r) {
          const slot = aggs.get(r)!;
          if (isCurrent) bumpAgg(slot.current, c);
          else bumpAgg(slot.prior, c);
        }
      }
    }

    for (const r of radii) {
      const slot = aggs.get(r)!;
      const areaSqKm = Math.PI * (r / 1000) ** 2;
      allRows.push({
        schoolType: school.type,
        schoolKey: school.key,
        radiusMeters: r,
        current: slot.current,
        prior: slot.prior,
        weightedRiskScore: weightedScore(slot.current, areaSqKm),
      });
    }
  }

  // Compute citywide percentiles per radius (lower risk = higher safety_index)
  const byRadius = new Map<number, PerSchoolRow[]>();
  for (const row of allRows) {
    const arr = byRadius.get(row.radiusMeters) ?? [];
    arr.push(row);
    byRadius.set(row.radiusMeters, arr);
  }

  const indexByRow = new Map<PerSchoolRow, { safetyIndex: number; percentile: number }>();
  byRadius.forEach((rows) => {
    const sorted = [...rows].sort((a, b) => a.weightedRiskScore - b.weightedRiskScore);
    const n = sorted.length;
    sorted.forEach((row, i) => {
      // Percentile of *risk* — lower is better. Convert to safety index.
      const riskPercentile = n > 1 ? Math.round((i / (n - 1)) * 100) : 50;
      const safetyIndex = 100 - riskPercentile;
      indexByRow.set(row, { safetyIndex, percentile: 100 - riskPercentile });
    });
  });

  // Bulk upsert in chunks
  const CHUNK = 1000;
  let written = 0;
  for (let i = 0; i < allRows.length; i += CHUNK) {
    const slice = allRows.slice(i, i + CHUNK);
    const values = slice.map((row) => {
      const { safetyIndex, percentile } = indexByRow.get(row)!;
      const priorTotal = row.prior.total;
      const delta = priorTotal > 0 ? ((row.current.total - priorTotal) / priorTotal) * 100 : null;
      let trend: string;
      if (priorTotal < 10 && row.current.total < 10) {
        trend = "insufficient_data";
      } else if (delta == null) {
        trend = "insufficient_data";
      } else if (delta <= -10) {
        trend = "improving";
      } else if (delta >= 10) {
        trend = "worsening";
      } else {
        trend = "stable";
      }

      return {
        schoolType: row.schoolType,
        schoolKey: row.schoolKey,
        radiusMeters: row.radiusMeters,
        periodStart,
        periodEnd,
        totalReports: row.current.total,
        felonyReports: row.current.felony,
        violentFelonyReports: row.current.violentFelony,
        misdemeanorReports: row.current.misdemeanor,
        violationReports: row.current.violation,
        topCategories: topCategories(row.current.byCategory),
        weightedRiskScore: row.weightedRiskScore,
        safetyIndex,
        percentileCitywide: percentile,
        trend,
        trendDelta: delta,
        priorPeriodTotal: priorTotal,
        lastCalculatedAt: new Date(),
      };
    });

    await db
      .insert(schoolSafetyIndex)
      .values(values)
      .onConflictDoUpdate({
        target: [
          schoolSafetyIndex.schoolType,
          schoolSafetyIndex.schoolKey,
          schoolSafetyIndex.radiusMeters,
        ],
        set: {
          periodStart: sql`excluded.period_start`,
          periodEnd: sql`excluded.period_end`,
          totalReports: sql`excluded.total_reports`,
          felonyReports: sql`excluded.felony_reports`,
          violentFelonyReports: sql`excluded.violent_felony_reports`,
          misdemeanorReports: sql`excluded.misdemeanor_reports`,
          violationReports: sql`excluded.violation_reports`,
          topCategories: sql`excluded.top_categories`,
          weightedRiskScore: sql`excluded.weighted_risk_score`,
          safetyIndex: sql`excluded.safety_index`,
          percentileCitywide: sql`excluded.percentile_citywide`,
          trend: sql`excluded.trend`,
          trendDelta: sql`excluded.trend_delta`,
          priorPeriodTotal: sql`excluded.prior_period_total`,
          lastCalculatedAt: sql`excluded.last_calculated_at`,
        },
      });
    written += values.length;
  }

  console.log(`[safety-recompute] wrote ${written} rows for ${points.length} schools`);
  return { rowsWritten: written, schoolCount: points.length };
}

// ---------------------------------------------------------------------------
// 3. Read path
// ---------------------------------------------------------------------------

export async function getSafetyIndex(
  schoolType: SchoolType,
  schoolKey: string,
  radiusMeters: number,
): Promise<SafetyIndexResponse | null> {
  const rows = await db
    .select()
    .from(schoolSafetyIndex)
    .where(
      and(
        eq(schoolSafetyIndex.schoolType, schoolType),
        eq(schoolSafetyIndex.schoolKey, schoolKey),
        eq(schoolSafetyIndex.radiusMeters, radiusMeters),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const radiusMiles = radiusMeters / 1609.344;
  const { label, tone } = getSafetyLabel(row.safetyIndex);

  return {
    schoolType: row.schoolType as SchoolType,
    schoolKey: row.schoolKey,
    radiusMeters: row.radiusMeters,
    radiusMiles: Math.round(radiusMiles * 100) / 100,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    totalReports: row.totalReports,
    felonyReports: row.felonyReports,
    violentFelonyReports: row.violentFelonyReports,
    misdemeanorReports: row.misdemeanorReports,
    violationReports: row.violationReports,
    topCategories: row.topCategories ?? [],
    weightedRiskScore: row.weightedRiskScore,
    safetyIndex: row.safetyIndex,
    label,
    tone,
    percentileCitywide: row.percentileCitywide ?? null,
    trend: (row.trend as SafetyIndexResponse["trend"]) ?? null,
    trendDelta: row.trendDelta ?? null,
    priorPeriodTotal: row.priorPeriodTotal ?? null,
    lastCalculatedAt: row.lastCalculatedAt.toISOString(),
    availableRadii: SAFETY_RADIUS_OPTIONS.map((r) => r.meters),
  };
}
