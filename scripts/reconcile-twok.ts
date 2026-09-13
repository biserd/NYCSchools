import { mkdir, writeFile } from "node:fs/promises";
import { fetchTwok, planTwok, normalizeId, centerId, repairEncoding } from "../server/twokImport";

// Read-only: generated SQL defaults to ROLLBACK, never applied by this script.
const snapshot = await fetchTwok();
async function get(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows.length) throw new Error(`Incomplete baseline: ${url}`);
  return rows;
}
const [schools, centers] = await Promise.all([
  get("https://nycschoolsratings.com/api/schools"), get("https://nycschoolsratings.com/api/nyceec-centers"),
]);
const changes = planTwok(snapshot, schools, centers);
const ids = new Set(snapshot.records.map(r => normalizeId(r.school.dbn)));
const exactOverlaps = centers.filter(c => ids.has(centerId(c)));
const norm = (s: string) => (s || "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const candidates = snapshot.records.flatMap(r => centers.filter(c => !ids.has(centerId(c)) &&
  (norm(c.name) === norm(r.school.name.replace(/\s*\([^)]*\)$/, "")) ||
   (norm(c.address) && norm(c.address) === norm(r.school.address.address_1))))
  .map(c => ({ dbn: r.school.dbn, locCode: c.locCode, reason: "Name/address candidate only; do not merge" })));
const grouped = new Map<string, string[]>();
for (const r of snapshot.records) {
  const key = norm(r.school.address.address_1) + "|" + r.school.address.zip_code;
  grouped.set(key, [...(grouped.get(key) ?? []), r.school.dbn]);
}
const report = {
  verifiedAt: snapshot.verifiedAt, sourceUrl: "https://www.myschools.nyc/en/schools/2-k/",
  processId: snapshot.processId, sourceCycle: snapshot.cycle,
  cycleCaveat: "MySchools currently returns this year; confirm with NYCPS before applying. Do not relabel as 2026-27.",
  sourceCount: snapshot.count, canonicalBaselineCount: schools.length,
  officialProgramCount: snapshot.records.reduce((sum, r) => sum + r.programs.length, 0),
  current2kCount: schools.filter(s => s.has_2k).length,
  proposed2kCount: new Set([...schools.filter(s => s.has_2k).map(s => normalizeId(s.dbn)), ...ids]).size,
  inserts: changes.filter(c => c.action === "insert").length,
  updates: changes.filter(c => c.action === "update").length,
  needsVerification: changes.filter(c => c.action === "needs_verification").map(c => c.dbn),
  offers3k: snapshot.records.filter(r => r.other_features.some((f: any) => f.name === "Offers 3-K")).length,
  offersPrek: snapshot.records.filter(r => r.other_features.some((f: any) => f.name === "Offers pre-K")).length,
  exactOverlaps: exactOverlaps.map(c => ({ dbn: centerId(c), locCode: c.locCode, name: c.name })), candidates,
  sharedAddresses: [...grouped.values()].filter(g => g.length > 1),
  encodingReview: snapshot.records.filter(r => repairEncoding(r.school.name) !== r.school.name).map(r => ({ dbn: r.school.dbn, original: r.school.name, repaired: repairEncoding(r.school.name) })), changes,
};
const quote = (s: string) => "'" + s.replace(/'/g, "''") + "'";
const literal = (v: any) => v == null ? "NULL" : typeof v === "object" ? quote(JSON.stringify(v)) + "::jsonb" : typeof v === "string" ? quote(v) : String(v);
const col = (s: string) => '"' + s + '"';
const sql = changes.map(c => c.action === "insert"
  ? `INSERT INTO schools (${Object.keys(c.after).map(col).join(",")}) VALUES (${Object.values(c.after).map(literal).join(",")}) ON CONFLICT (dbn) DO NOTHING;`
  : `UPDATE schools SET ${Object.entries(c.after).map(([k,v]) => `${col(k)}=${literal(v)}`).join(",")} WHERE dbn=${quote(c.dbn)} AND (${Object.entries(c.before).map(([k,v]) => `${col(k)} IS NOT DISTINCT FROM ${literal(v)}`).join(" AND ")});`).join("\n");
const rollback = changes.filter(c => c.before).map(c => `UPDATE schools SET ${Object.entries(c.before).map(([k,v]) => `${col(k)}=${literal(v)}`).join(",")} WHERE dbn=${quote(c.dbn)} AND (${Object.entries(c.after).map(([k,v]) => `${col(k)} IS NOT DISTINCT FROM ${literal(v)}`).join(" AND ")});`).join("\n");
const out = "reports/twok";
await mkdir(out, { recursive: true });
await writeFile(`${out}/reconciliation.json`, JSON.stringify(report, null, 2));
await writeFile(`${out}/proposed.sql`, `-- REVIEW ONLY. Source cycle: ${snapshot.cycle}\n-- Run schema migration first. Inspect changed-row counts.\n-- Explicitly acknowledge this source cycle via SET app.twok_expected_cycle before running.\nBEGIN;\nDO $$ BEGIN IF current_setting('app.twok_expected_cycle', true) IS DISTINCT FROM ${quote(snapshot.cycle)} THEN RAISE EXCEPTION 'Confirm the MySchools cycle before applying'; END IF; END $$;\n${sql}\nROLLBACK;\n`);
await writeFile(`${out}/rollback.sql`, `-- Restores updates only if this import still owns provenance.\n-- Retain new providers to preserve relationships.\nBEGIN;\n${rollback}\nROLLBACK;\n`);
console.log(JSON.stringify({ ...report, changes: changes.length, candidates: candidates.length, sharedAddresses: report.sharedAddresses.length, exactOverlaps: exactOverlaps.length }, null, 2));
