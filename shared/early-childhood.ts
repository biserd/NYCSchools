import { isEarlyChildhoodOnly, type School } from "./schema";
import { getBoroughFromDBN } from "./boroughMapping";

export function schoolBorough(school: { dbn: string; borough?: string | null }): string | null {
  return school.borough || getBoroughFromDBN(school.dbn);
}

export function programLabels(school: Partial<School>): string[] {
  return [school.has_2k && "2-K", school.has_3k && "3-K", school.has_prek && "pre-K"].filter(Boolean) as string[];
}

export function schoolDisplayName(school: Partial<School>): string {
  return school.early_childhood_source?.providerName || school.name || "";
}

// Compatibility for legacy seed values, until the reviewed backfill is applied.
// Only the exact seed signature identifies unsupported zero measurements.
export function normalizeSchool<T extends Partial<School>>(school: T): T {
  const legacySeed = school.grade_band === "2K" && school.academics_score === -1 &&
    school.climate_score === -1 && school.progress_score === -1 &&
    school.enrollment === 0 && school.student_teacher_ratio === 0 && !school.early_childhood_source;
  const result = { ...school };
  if (isEarlyChildhoodOnly(school)) {
    result.ela_proficiency = null; result.math_proficiency = null; result.science_proficiency = null;
  }
  for (const key of ["academics_score", "climate_score", "progress_score"] as const) {
    if (isEarlyChildhoodOnly(school) || (school[key] != null && school[key]! < 0)) result[key] = null;
  }
  if (legacySeed) { result.enrollment = null; result.student_teacher_ratio = null; }
  return result;
}

export function filterPrograms<T extends Partial<School>>(rows: T[], query: Record<string, unknown>): T[] {
  return rows.filter(s => (["has_2k", "has_3k", "has_prek"] as const).every(key =>
    query[key] === "true" ? s[key] === true : query[key] === "false" ? s[key] === false : true));
}
