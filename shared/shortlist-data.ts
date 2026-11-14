import type { SurveyResult } from './surveys';

export type ShortlistRecord = {
  family?: { count: number | null; outreach: number | null };
  teacher?: { count: number | null; hasTopics: boolean };
  assessment?: { ela: number | null; math: number | null };
};

export type DistrictPick = {
  id: string; district: number; name: string; href?: string; grades?: string;
  enrolled: number | null; detail?: string; visit?: string; evidence?: ShortlistRecord;
};

export type DistrictCandidate = {
  dbn: string; district: number; name: string; grades: string; enrolled: number;
  assessment_year: string | null; assessment_source: string | null; ela_grade3: number | null; math_grade3: number | null;
};

const percentage = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
const count = (value: number | null | undefined) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;

export function centerShortlistRecord(key: string, rows: SurveyResult[]): ShortlistRecord {
  const exact = rows.filter(row => row.year === 2026 && row.sourceId === key);
  const family = exact.find(row => row.instrument === 'b5-family');
  const teacher = exact.find(row => row.instrument === 'b5-teacher');
  return {
    ...(family && { family: { count: count(family.responseCount), outreach: percentage(family.metrics.find(metric => metric.label === 'Outreach to Parents' && metric.status === 'reported')?.value) } }),
    ...(teacher && { teacher: { count: count(teacher.responseCount), hasTopics: teacher.metrics.some(metric => metric.status === 'reported' && percentage(metric.value) !== null) } }),
  };
}

export function schoolShortlistRecord(row: Pick<DistrictCandidate, 'assessment_year' | 'assessment_source' | 'ela_grade3' | 'math_grade3'> | undefined): ShortlistRecord {
  if (row?.assessment_year !== '2025-26' || !/^NYCPS InfoHub · spring 2026 ELA\/math\b/i.test(row.assessment_source ?? '')) return {};
  // A single grade is comparable across different grade spans; never substitute all-grades results.
  return { assessment: { ela: percentage(row.ela_grade3), math: percentage(row.math_grade3) } };
}

export function buildDistrictPicks(candidates: DistrictCandidate[], featured: DistrictPick[], mode: 'pre-k' | 'kindergarten', schoolPath: (row: DistrictCandidate) => string): DistrictPick[] {
  const picks: DistrictPick[] = [];
  for (let district = 1; district <= 32; district++) {
    const local = new Map(candidates.filter(row => row.district === district && count(row.enrolled) && row.enrolled > 0).map(row => [row.dbn, row]));
    const examples = featured.filter(row => row.district === district).flatMap(row => {
      const match = local.get(row.id);
      if (!match && mode === 'kindergarten') return [];
      local.delete(row.id);
      return [{ ...row, enrolled: match?.enrolled ?? null, grades: match?.grades, evidence: mode === 'kindergarten' ? schoolShortlistRecord(match) : row.evidence }];
    }).slice(0, 2);
    const ordered = [...local.values()].sort((a, b) => a.enrolled - b.enrolled || a.dbn.localeCompare(b.dbn));
    const slots = 2 - examples.length;
    const indexes = slots === 2 ? [Math.floor((ordered.length - 1) / 4), Math.ceil((ordered.length - 1) * 3 / 4)] : slots === 1 ? [Math.floor(ordered.length / 2)] : [];
    picks.push(...examples, ...[...new Set(indexes)].flatMap(index => {
      const row = ordered[index];
      return row ? [{ id: row.dbn, district, name: row.name, href: schoolPath(row), grades: row.grades, enrolled: row.enrolled,
        ...(mode === 'kindergarten' && { evidence: schoolShortlistRecord(row) }) }] : [];
    }));
  }
  return picks;
}
