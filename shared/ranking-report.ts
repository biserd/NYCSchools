import type { School } from './schema';
import { calculateOverallScore, getAssessmentConfidence, getSchoolSlug } from './school-utils';
import { admissionEvidence } from './admissions-evidence';
export type SchoolStage = 'elementary' | 'middle';
export function gradeRange(value: string | null | undefined): [number, number] | null {
  const v = (value || '').toUpperCase().replace(/[–—]/g, '-').replace(/\s+TO\s+/g, '-').replace(/\s/g, '');
  const m = v.match(/^(PK|PRE-K|3K|2K|K|\d{1,2})(?:-(K|\d{1,2}))?$/);
  if (!m) return null;
  const n = (s: string) => s === 'K' ? 0 : ['PK', 'PRE-K', '3K', '2K'].includes(s) ? -1 : Number(s);
  const low = n(m[1]), high = n(m[2] || m[1]);
  return low <= high && high <= 12 ? [low, high] : null;
}
export const borough = (dbn: string) => ({ M: 'Manhattan', K: 'Brooklyn', Q: 'Queens', X: 'Bronx', R: 'Staten Island' }[dbn[2]] || 'Other');
export function servesStage(s: Pick<School, 'grade_band'>, stage: SchoolStage) {
  const range = gradeRange(s.grade_band);
  return !!range && (stage === 'elementary' ? range[0] <= 5 && range[1] >= 0 : range[0] <= 8 && range[1] >= 6);
}
export type RankingRow = { dbn: string; name: string; href: string; district: number; grades: string; score: number; ela: number; math: number; source: string; elaTested: number | null; mathTested: number | null; admission: ReturnType<typeof admissionEvidence> };
export type RankingReport = { stage: SchoolStage; population: number; eligible: number; year: string | null; excluded: number; groups: { borough: string; n: number; ela: number | null; math: number | null; rows: RankingRow[] }[] };
const valid = (n: unknown): n is number => typeof n === 'number' && n >= 0 && n <= 100;
export function buildRankingReport(input: School[], stage: SchoolStage): RankingReport {
  const schools = [...new Map(input.map(s => [s.dbn, s])).values()].filter(s => servesStage(s, stage));
  // Exclude upper-school combinations: existing scores use high-school measures there.
  const candidates = schools.filter(s => { const range = gradeRange(s.grade_band)!; return range[1] <= 8 && valid(s.ela_proficiency) && valid(s.math_proficiency) && getAssessmentConfidence(s) !== 'low' && calculateOverallScore(s) >= 0 && /^20\d{2}-\d{2}$/.test(s.assessment_year || ''); });
  const year = candidates.map(s => s.assessment_year!).sort().at(-1) || null;
  const comparable = candidates.filter(s => s.assessment_year === year);
  return { stage, population: schools.length, eligible: comparable.length, year, excluded: schools.length - comparable.length,
    groups: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'].map(b => {
      const rows = comparable.filter(s => borough(s.dbn) === b).sort((a,b) => calculateOverallScore(b) - calculateOverallScore(a) || a.dbn.localeCompare(b.dbn));
      const mean = (key: 'ela_proficiency' | 'math_proficiency') => rows.length ? Math.round(rows.reduce((n,s) => n+s[key]!,0)/rows.length*10)/10 : null;
      return { borough: b, n: rows.length, ela: mean('ela_proficiency'), math: mean('math_proficiency'), rows: rows.slice(0,5).map(s => ({ dbn:s.dbn,name:s.name,href:`/school/${getSchoolSlug(s)}`,district:s.district,grades:s.grade_band,score:calculateOverallScore(s),ela:s.ela_proficiency!,math:s.math_proficiency!,source:s.assessment_source || 'Source not recorded',elaTested:s.ela_tested_count,mathTested:s.math_tested_count,admission:admissionEvidence(s) })) };
    }) };
}
