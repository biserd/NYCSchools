// Pure planning and public-source fetching. No database writes in this module.
import { normalizeSchool } from "../shared/early-childhood";
import type { School } from "../shared/schema";

export const DIRECTORY = "https://www.myschools.nyc/en/schools/2-k/";
export const normalizeId = (value: string) => value.trim().toUpperCase();
export const centerId = (center: any) => normalizeId(center.semsCode || center.sems_code || "");

// Decode only valid UTF-8 sequences that were misread as Latin-1. Multiple
// passes handle double encoding; accents already encoded correctly survive.
export function repairEncoding(value: string): string {
  let result = value;
  for (let pass = 0; pass < 4; pass++) {
    const next = result.replace(/[\u00c2-\u00f4][\u0080-\u00bf]+/g, part => {
      try { return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(part, c => c.charCodeAt(0))); }
      catch { return part; }
    });
    if (next === result) break;
    result = next;
  }
  return result.normalize("NFC");
}
export type Snapshot = { processId: number; cycle: string; verifiedAt: string; count: number; records: any[] };
export type Change = { dbn: string; action: "insert" | "update" | "needs_verification"; before: any; after: any };

export function measurement(value: unknown): number | null {
  if (value == null || value === "" || (typeof value === "string" && !value.trim())) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function validateSnapshot(snapshot: Snapshot): void {
  if (!snapshot.count || snapshot.records.length !== snapshot.count) throw new Error("Incomplete source inventory");
  const ids = new Set<string>();
  for (const record of snapshot.records) {
    const id = normalizeId(record.school?.dbn ?? "");
    if (!/^\d{2}[A-Z0-9]{4}$/.test(id) || ids.has(id)) throw new Error(`Missing/duplicate source identifier: ${id}`);
    ids.add(id);
    if (record.admission_process !== "2K" || record.school.school_year !== snapshot.cycle) throw new Error(`Admission cycle/process mismatch: ${id}`);
    if (!record.programs?.length || record.programs.some((p: any) => p.program?.admission_process !== "2-K")) throw new Error(`Unexpected programs: ${id}`);
    if (!record.school.name || !record.school.district?.borough || !record.school.address?.address_1) throw new Error(`Missing required provider fields: ${id}`);
  }
}

export async function fetchTwok(fetcher: typeof fetch = fetch): Promise<Snapshot> {
  const htmlResponse = await fetcher(DIRECTORY, { signal: AbortSignal.timeout(30000) });
  if (!htmlResponse.ok) throw new Error(`Directory HTTP ${htmlResponse.status}`);
  const html = await htmlResponse.text();
  const processId = Number(html.match(/"admissionInstances"\s*:\s*\{[^}]*"2-k"\s*:\s*(\d+)/)?.[1]);
  if (!processId) throw new Error("Cannot verify active 2-K directory process");
  const base = `https://www.myschools.nyc/en/api/v2/schools/process/${processId}/`;
  let next: string | null = `${base}?page=1`;
  let count: number | undefined;
  const visited = new Set<string>();
  const records: any[] = [];
  while (next) {
    const url = new URL(next); url.protocol = "https:";
    if (url.origin !== "https://www.myschools.nyc" || url.pathname !== new URL(base).pathname || visited.has(url.href) || visited.size >= 200) throw new Error("Invalid pagination link");
    visited.add(url.href);
    const response = await fetcher(url.href, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
    const page = await response.json() as any;
    if (!Array.isArray(page.results) || !Number.isInteger(page.count) || (count != null && count !== page.count)) throw new Error("Source changed during pagination");
    count = page.count;
    records.push(...page.results); next = page.next;
  }
  const snapshot = { processId, count: count!, records, cycle: records[0]?.school.school_year, verifiedAt: new Date().toISOString() };
  validateSnapshot(snapshot);
  return snapshot;
}

export function planTwok(snapshot: Snapshot, schools: any[], centers: any[] = []): Change[] {
  validateSnapshot(snapshot);
  if (snapshot.count < schools.filter(s => s.has_2k).length * 0.8) throw new Error("Source inventory dropped more than 20%; human review required");
  const existing = new Map<string, any>();
  for (const row of schools) {
    const id = normalizeId(row.dbn);
    if (existing.has(id)) throw new Error(`Ambiguous canonical identifier: ${id}`);
    existing.set(id, row);
  }
  const changes: Change[] = [];
  const seen = new Set<string>();
  for (const r of snapshot.records) {
    const dbn = normalizeId(r.school.dbn); seen.add(dbn);
    const before = existing.get(dbn);
    const features = r.other_features.map((f: any) => f.name.toLowerCase());
    // Feature omission is UNKNOWN, never evidence that a program is absent.
    const has3k = features.includes("offers 3-k") ? true : null;
    const hasPrek = features.includes("offers pre-k") ? true : null;
    const fullName = repairEncoding(r.school.name.replace(/\s*\([A-Z0-9]{6}\)\s*$/, ""));
    const split = fullName.search(/\s*\(?\s*(?:registration|register at|enroll at)\b/i);
    const directoryName = repairEncoding(r.name || "");
    const registration = directoryName.match(/\b(?:register at|registration|enroll at)\b[\s\S]*$/i)?.[0];
    const providerName = (split >= 0 ? fullName.slice(0, split).trim() : fullName).replace(/\s+AT\s+\d[\s\S]*$/i, "").trim();
    const early = centers.find(c => centerId(c) === dbn);
    const source: NonNullable<School["early_childhood_source"]> = {
      sourceUrl: DIRECTORY, processId: snapshot.processId, cycle: snapshot.cycle,
      verifiedAt: snapshot.verifiedAt, status: "verified", providerName,
      registrationInstructions: registration || (split >= 0 ? fullName.slice(split).trim() : null),
      rawProviderName: r.school.name,
      childcareLocation: [r.school.address.address_1, r.school.address.address_2].filter(Boolean).join(", "),
      programs: r.programs.map((p: any) => p.name), has3k, hasPrek,
      email: r.email || null, schoolType: r.school.school_type?.name ?? null,
      legacyCenterCode: early?.locCode ?? null,
    };
    const patch: any = {
      has_2k: true, has_3k: before?.has_3k === true || has3k === true ? true : before?.has_3k ?? null,
      has_prek: before?.has_prek === true || hasPrek === true ? true : before?.has_prek ?? null,
      borough: r.school.district.borough, early_childhood_source: source,
    };
    if (!before) Object.assign(patch, {
      dbn, name: providerName, district: Number(r.school.district.code),
      address: [r.school.address.address_1, r.school.address.address_2].filter(Boolean).join(", "),
      grade_band: "2K", academics_score: null, climate_score: null, progress_score: null,
      enrollment: measurement(r.total_enrollment), student_teacher_ratio: null,
      latitude: Number(r.school.address.latitude) || null, longitude: Number(r.school.address.longitude) || null,
      zip_code: r.school.address.zip_code || null, phone: r.telephone || null, website: r.independent_website || null,
    });
    if (before?.grade_band === "2K") {
      const normalized = normalizeSchool(before);
      for (const key of ["academics_score", "climate_score", "progress_score", "enrollment", "student_teacher_ratio"]) patch[key] = normalized[key];
      Object.assign(patch, { address: source.childcareLocation, phone: r.telephone || before.phone,
        zip_code: r.school.address.zip_code || before.zip_code,
        latitude: measurement(r.school.address.latitude) ?? before.latitude,
        longitude: Number(r.school.address.longitude) || before.longitude });
      if (measurement(r.total_enrollment) != null) patch.enrollment = measurement(r.total_enrollment);
      if (!before.early_childhood_source) {
        patch.has_3k = before.has_3k === true || has3k === true ? true : null;
        patch.has_prek = before.has_prek === true || hasPrek === true ? true : null;
      }
      // Preserve the canonical name/URL; publish the verified source name separately.
    }
    // Preserve the original school ID even if its stored casing differs.
    changes.push({ dbn: before?.dbn ?? dbn, action: before ? "update" : "insert", before: before ? Object.fromEntries(Object.keys(patch).map(k => [k, before[k] ?? null])) : null, after: patch });
  }
  for (const [id, row] of existing) if (row.has_2k && !seen.has(id)) {
    // Never remove the flag or infer closure. Retain prior verification evidence.
    const source = row.early_childhood_source ?? { sourceUrl: DIRECTORY, processId: snapshot.processId, cycle: snapshot.cycle, verifiedAt: null };
    changes.push({ dbn: row.dbn, action: "needs_verification", before: { early_childhood_source: row.early_childhood_source ?? null }, after: { early_childhood_source: { ...source, status: "needs_verification" } } });
  }
  return changes.filter(c => JSON.stringify(c.before) !== JSON.stringify(c.after));
}
