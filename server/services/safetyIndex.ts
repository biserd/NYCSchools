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
        // Use :id order — Socrata's historic NYPD complaint dataset times
        // out on `cmplnt_fr_dt` ordering at deep offsets. :id is the
        // primary key index and paginates reliably.
        order: ":id",
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

// Resumable run state — persisted in app_settings so a restart-killed run
// can be picked up by the next cron call exactly where it left off.
const SAFETY_RUN_STATE_KEY = "safety_recompute_run_state";

interface RecomputeRunState {
  runStartedAt: string;          // ISO — marker for "rows persisted in this run"
  periodStart: string;           // ISO
  periodEnd: string;             // ISO
  priorStart: string;            // ISO
  totalSchools: number;
  finalizedAt?: string;          // ISO — set once percentile pass finishes
}

async function readRunState(): Promise<RecomputeRunState | null> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, SAFETY_RUN_STATE_KEY))
    .limit(1);
  if (!rows.length) return null;
  try {
    return JSON.parse(rows[0].value) as RecomputeRunState;
  } catch {
    return null;
  }
}

async function writeRunState(state: RecomputeRunState): Promise<void> {
  const value = JSON.stringify(state);
  await db
    .insert(appSettings)
    .values({
      key: SAFETY_RUN_STATE_KEY,
      value,
      description: "In-progress state for resumable safety-index recompute",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

/**
 * Compute the citywide safety_index + percentile_citywide via a single SQL
 * UPDATE that ranks every school per radius. Called at the end of a run
 * once all schools have per-row weighted_risk_score persisted.
 */
async function finalizeSafetyPercentiles(runStartedAt: Date): Promise<number> {
  const result = await db.execute<{ updated: string }>(sql`
    WITH ranked AS (
      SELECT id,
             percent_rank() OVER (
               PARTITION BY radius_meters
               ORDER BY weighted_risk_score
             ) AS rp
      FROM school_safety_index
      WHERE last_calculated_at >= ${runStartedAt}
    )
    UPDATE school_safety_index s
    SET safety_index = GREATEST(0, LEAST(100, 100 - ROUND(ranked.rp * 100)::int)),
        percentile_citywide = GREATEST(0, LEAST(100, 100 - ROUND(ranked.rp * 100)::int))
    FROM ranked
    WHERE s.id = ranked.id
    RETURNING (1)::text AS updated
  `);
  // Drizzle's neon driver returns either `.rows` or array-shape — handle both.
  const rows = (result as any).rows ?? (result as any);
  return Array.isArray(rows) ? rows.length : 0;
}

export async function recomputeSafetyIndex(): Promise<{
  rowsWritten: number;
  schoolCount: number;
  resumed: boolean;
  finalized: boolean;
  remainingSchools: number;
}> {
  // ---- Determine current run window (resume or start fresh) ---------------
  const existing = await readRunState();
  const isResume = !!(existing && !existing.finalizedAt);
  const now = new Date();

  const runStartedAt = isResume ? new Date(existing!.runStartedAt) : now;
  const periodEnd = isResume ? new Date(existing!.periodEnd) : now;
  const periodStart = isResume
    ? new Date(existing!.periodStart)
    : (() => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 12);
        return d;
      })();
  const priorStart = isResume
    ? new Date(existing!.priorStart)
    : (() => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 24);
        return d;
      })();

  console.log(
    `[safety-recompute] ${isResume ? "RESUMING" : "starting"} run @ ${runStartedAt.toISOString()} window current ${periodStart.toISOString()}→${periodEnd.toISOString()}`,
  );

  // ---- Determine which schools are still pending --------------------------
  const allPoints = await loadAllSchoolPoints();
  console.log(`[safety-recompute] schools with coords: ${allPoints.length}`);

  // Schools whose row was already persisted in *this* run can be skipped.
  // We pick any one row per school (radius doesn't matter — they're all
  // written together inside one batch upsert below).
  const doneRows = await db.execute<{
    school_type: string;
    school_key: string;
  }>(sql`
    SELECT DISTINCT school_type, school_key
    FROM school_safety_index
    WHERE last_calculated_at >= ${runStartedAt}
  `);
  const doneRowsArr = (doneRows as any).rows ?? (doneRows as any);
  const doneSet = new Set<string>();
  for (const r of doneRowsArr as Array<{ school_type: string; school_key: string }>) {
    doneSet.add(`${r.school_type}|${r.school_key}`);
  }
  const points = allPoints.filter((p) => !doneSet.has(`${p.type}|${p.key}`));
  console.log(
    `[safety-recompute] ${doneSet.size} schools already done in this run; ${points.length} remaining`,
  );

  // Persist run state so subsequent calls resume correctly.
  const stateToWrite: RecomputeRunState = {
    runStartedAt: runStartedAt.toISOString(),
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    priorStart: priorStart.toISOString(),
    totalSchools: allPoints.length,
  };
  await writeRunState(stateToWrite);

  // ---- If nothing left to compute, just (re)finalize percentiles ----------
  if (points.length === 0) {
    console.log(`[safety-recompute] all schools done; running final percentile pass`);
    const updated = await finalizeSafetyPercentiles(runStartedAt);
    await writeRunState({ ...stateToWrite, finalizedAt: new Date().toISOString() });
    console.log(`[safety-recompute] finalized ${updated} rows`);
    return {
      rowsWritten: 0,
      schoolCount: allPoints.length,
      resumed: isResume,
      finalized: true,
      remainingSchools: 0,
    };
  }

  // ---- Load complaints into memory + sort by lat once ---------------------
  const allComplaints = await loadComplaintsInMemory(priorStart);
  console.log(`[safety-recompute] complaints loaded: ${allComplaints.length}`);

  const radii = SAFETY_RADIUS_OPTIONS.map((r) => r.meters);
  const maxRadius = Math.max(...radii);

  const sortedByLat = allComplaints.slice().sort((a, b) => a.lat - b.lat);
  const lats = new Float64Array(sortedByLat.length);
  for (let i = 0; i < sortedByLat.length; i++) lats[i] = sortedByLat[i].lat;
  const lowerBound = (target: number): number => {
    let lo = 0;
    let hi = lats.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (lats[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  console.log(`[safety-recompute] complaints sorted by lat`);

  // ---- Per-batch processing + persistence ---------------------------------
  // Persist every BATCH schools (= BATCH * radii.length rows) so a restart
  // mid-run only loses ~BATCH schools of work.
  const BATCH = 100;
  let processed = 0;
  let writtenTotal = 0;
  let pendingRows: PerSchoolRow[] = [];

  const flushBatch = async () => {
    if (pendingRows.length === 0) return;
    const stamp = new Date(); // each batch's lastCalculatedAt > runStartedAt
    const values = pendingRows.map((row) => {
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
        // safety_index/percentile_citywide are placeholders here; the final
        // SQL pass after the last batch overwrites them with citywide ranks.
        safetyIndex: 50,
        percentileCitywide: 50,
        trend,
        trendDelta: delta,
        priorPeriodTotal: priorTotal,
        lastCalculatedAt: stamp,
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
    writtenTotal += values.length;
    pendingRows = [];
  };

  for (const school of points) {
    const latDelta = maxRadius / METERS_PER_DEG_LAT;
    const lngDelta = maxRadius / metersPerDegLng(school.lat);
    const minLat = school.lat - latDelta;
    const maxLat = school.lat + latDelta;
    const minLng = school.lng - lngDelta;
    const maxLng = school.lng + lngDelta;

    const startIdx = lowerBound(minLat);
    const endIdx = lowerBound(maxLat);
    const nearby: ComplaintLite[] = [];
    for (let i = startIdx; i < endIdx; i++) {
      const c = sortedByLat[i];
      if (c.lng >= minLng && c.lng <= maxLng) {
        nearby.push(c);
      }
    }

    if (nearby.length === 0) {
      for (const radiusMeters of radii) {
        pendingRows.push({
          schoolType: school.type,
          schoolKey: school.key,
          radiusMeters,
          current: emptyAgg(),
          prior: emptyAgg(),
          weightedRiskScore: 0,
        });
      }
    } else {
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
        pendingRows.push({
          schoolType: school.type,
          schoolKey: school.key,
          radiusMeters: r,
          current: slot.current,
          prior: slot.prior,
          weightedRiskScore: weightedScore(slot.current, areaSqKm),
        });
      }
    }

    processed++;

    // Flush + yield every BATCH schools so progress is durable and the
    // dev server stays responsive.
    if (processed % BATCH === 0) {
      await flushBatch();
      console.log(
        `[safety-recompute] processed ${processed}/${points.length} schools (total ${doneSet.size + processed}/${allPoints.length}); written so far ${writtenTotal}`,
      );
      await new Promise<void>((resolve) => setImmediate(resolve));
    } else if (processed % 25 === 0) {
      // Yield more frequently than we flush to keep the loop responsive.
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }

  await flushBatch();
  console.log(
    `[safety-recompute] processed all ${processed}/${points.length} remaining schools; total written this call ${writtenTotal}`,
  );

  // ---- If every school is now done, finalize percentiles ------------------
  const remaining = await db.execute<{ remaining: string }>(sql`
    SELECT (${allPoints.length}::int - COUNT(DISTINCT (school_type || '|' || school_key)))::text AS remaining
    FROM school_safety_index
    WHERE last_calculated_at >= ${runStartedAt}
  `);
  const remRows = (remaining as any).rows ?? (remaining as any);
  const remainingSchools = Number(remRows[0]?.remaining ?? 0);

  let finalized = false;
  if (remainingSchools <= 0) {
    console.log(`[safety-recompute] all schools done; running final percentile pass`);
    const updated = await finalizeSafetyPercentiles(runStartedAt);
    await writeRunState({
      ...stateToWrite,
      finalizedAt: new Date().toISOString(),
    });
    finalized = true;
    console.log(`[safety-recompute] finalized ${updated} rows`);
  } else {
    console.log(
      `[safety-recompute] ${remainingSchools} schools still pending; trigger cron again to resume`,
    );
  }

  return {
    rowsWritten: writtenTotal,
    schoolCount: allPoints.length,
    resumed: isResume,
    finalized,
    remainingSchools,
  };
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

// ---------------------------------------------------------------------------
// 5. Monthly sync runner + status (used by cron endpoint and CLI script)
// ---------------------------------------------------------------------------

const SAFETY_SYNC_STATUS_KEY = "safety_sync_status";

export interface SafetySyncStatus {
  lastRunAt: string | null;
  lastDurationMs: number | null;
  lastInserted: number | null;
  lastSchoolCount: number | null;
  lastRowsWritten: number | null;
  lastError: string | null;
  totalComplaintRows: number;
  totalSafetyRows: number;
  oldestComplaintDate: string | null;
  newestComplaintDate: string | null;
}

interface RecordedSafetyStatus {
  lastRunAt: string;
  lastDurationMs: number;
  lastInserted: number | null;
  lastSchoolCount: number | null;
  lastRowsWritten: number | null;
  lastError: string | null;
}

async function readSavedSafetyStatus(): Promise<RecordedSafetyStatus | null> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, SAFETY_SYNC_STATUS_KEY))
    .limit(1);
  if (!rows.length) return null;
  try {
    return JSON.parse(rows[0].value) as RecordedSafetyStatus;
  } catch {
    return null;
  }
}

async function writeSavedSafetyStatus(status: RecordedSafetyStatus): Promise<void> {
  const value = JSON.stringify(status);
  await db
    .insert(appSettings)
    .values({
      key: SAFETY_SYNC_STATUS_KEY,
      value,
      description: "Last-run state for the monthly Neighborhood Safety Index sync",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function getSafetySyncStatus(): Promise<SafetySyncStatus> {
  const saved = await readSavedSafetyStatus();
  const counts = await db.execute<{
    complaint_count: string;
    safety_count: string;
    oldest: Date | null;
    newest: Date | null;
  }>(sql`
    SELECT
      (SELECT COUNT(*) FROM nypd_complaints) AS complaint_count,
      (SELECT COUNT(*) FROM school_safety_index) AS safety_count,
      (SELECT MIN(complaint_date) FROM nypd_complaints) AS oldest,
      (SELECT MAX(complaint_date) FROM nypd_complaints) AS newest
  `);
  const row = (counts as any).rows?.[0] ?? (counts as any)[0] ?? {};
  return {
    lastRunAt: saved?.lastRunAt ?? null,
    lastDurationMs: saved?.lastDurationMs ?? null,
    lastInserted: saved?.lastInserted ?? null,
    lastSchoolCount: saved?.lastSchoolCount ?? null,
    lastRowsWritten: saved?.lastRowsWritten ?? null,
    lastError: saved?.lastError ?? null,
    totalComplaintRows: Number(row.complaint_count ?? 0),
    totalSafetyRows: Number(row.safety_count ?? 0),
    oldestComplaintDate: row.oldest ? new Date(row.oldest).toISOString() : null,
    newestComplaintDate: row.newest ? new Date(row.newest).toISOString() : null,
  };
}

export interface SafetySyncRunResult {
  success: boolean;
  durationMs: number;
  inserted: number | null;
  schoolCount: number | null;
  rowsWritten: number | null;
  cutoffISO: string | null;
  error: string | null;
  resumed: boolean;
  finalized: boolean;
  remainingSchools: number | null;
}

/**
 * Runs the full monthly pipeline: pull recent NYPD complaints, then
 * recompute every school's safety index. Designed to be called from a
 * scheduler (cron endpoint or Replit Scheduled Deployment). Idempotent —
 * the underlying pull uses upserts so re-running is safe.
 */
export async function runSafetySync(opts: SyncOptions & { skipPull?: boolean } = {}): Promise<SafetySyncRunResult> {
  const startedAt = Date.now();
  const result: SafetySyncRunResult = {
    success: false,
    durationMs: 0,
    inserted: null,
    schoolCount: null,
    rowsWritten: null,
    cutoffISO: null,
    error: null,
    resumed: false,
    finalized: false,
    remainingSchools: null,
  };

  try {
    if (!opts.skipPull) {
      console.log(`[safety-sync] starting pull (months=${opts.months ?? 24}${opts.maxRows ? `, maxRows=${opts.maxRows}` : ""})`);
      const pull = await syncNypdComplaints({ months: opts.months, maxRows: opts.maxRows });
      result.inserted = pull.inserted;
      result.cutoffISO = pull.cutoffISO;
    } else {
      console.log("[safety-sync] skipPull set; only recomputing");
    }

    console.log("[safety-sync] recomputing per-school safety index");
    const recompute = await recomputeSafetyIndex();
    result.schoolCount = recompute.schoolCount;
    result.rowsWritten = recompute.rowsWritten;
    result.resumed = recompute.resumed;
    result.finalized = recompute.finalized;
    result.remainingSchools = recompute.remainingSchools;
    result.success = true;
  } catch (err: any) {
    result.error = err?.message ?? String(err);
    console.error("[safety-sync] FAILED:", err);
  } finally {
    result.durationMs = Date.now() - startedAt;
    try {
      await writeSavedSafetyStatus({
        lastRunAt: new Date().toISOString(),
        lastDurationMs: result.durationMs,
        lastInserted: result.inserted,
        lastSchoolCount: result.schoolCount,
        lastRowsWritten: result.rowsWritten,
        lastError: result.error,
      });
    } catch (statusErr) {
      console.error("[safety-sync] failed to record status:", statusErr);
    }
  }

  return result;
}
