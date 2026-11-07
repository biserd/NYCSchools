import type { School, HsRegents, DemographicsSnapshot, schoolDemographicsHistory } from './schema';

export type DemographicsHistoryRecord = typeof schoolDemographicsHistory.$inferSelect;
export const DEMOGRAPHICS_FIELDS = ['enrollment','elementary_enrollment','middle_enrollment','high_school_enrollment','ell_percent','iep_percent','asian_percent','black_percent','hispanic_percent','white_percent','multi_racial_percent','economic_need_index'] as const;
export const DEMOGRAPHICS_SOURCE = 'https://infohub.nyced.org/reports/students-and-schools/school-quality/information-and-data-overview';
export const REGENTS_SOURCE = 'https://infohub.nyced.org/reports/academics/test-results';
export type DatedDemographics = DemographicsSnapshot & { school_year: string; source_url: string };
export type RegentsResult = {
  reporting_year: number; exam_name: string; tested_count: number | null;
  pass_rate: number | null; scoring_80_plus_percent: number | null; mean_score: number | null;
};

// One public-data contract for the website, developer API and both MCP lanes.
export function buildSchoolResearch(school: School, snapshots: DemographicsHistoryRecord[] = [], exams: HsRegents[] = []) {
  const history: DatedDemographics[] = snapshots.filter(r => /^20\d{2}-\d{2}$/.test(r.schoolYear))
    .sort((a,b) => a.schoolYear.localeCompare(b.schoolYear))
    .map(r => ({ ...r.data, school_year:r.schoolYear, source_url:r.sourceUrl }));
  const currentSnapshot = history.find(r => r.school_year === school.demographics_year);
  const values:DemographicsSnapshot = {
    enrollment:school.enrollment ?? null,elementary_enrollment:school.elementary_enrollment ?? null,
    middle_enrollment:school.middle_enrollment ?? null,high_school_enrollment:school.high_school_enrollment ?? null,
    ell_percent:school.ell_percent ?? null,iep_percent:school.iep_percent ?? null,asian_percent:school.asian_percent ?? null,
    black_percent:school.black_percent ?? null,hispanic_percent:school.hispanic_percent ?? null,
    white_percent:school.white_percent ?? null,multi_racial_percent:school.multi_racial_percent ?? null,
    economic_need_index:school.economic_need_index ?? null,
  };
  const regentsHistory: RegentsResult[] = [...exams].sort((a,b) => a.year-b.year || a.exam_name.localeCompare(b.exam_name)).map(r => ({
    reporting_year:r.year, exam_name:r.exam_name, tested_count:r.total_tested,
    pass_rate:r.pass_rate, scoring_80_plus_percent:r.college_ready_rate, mean_score:r.mean_score,
  }));
  const years = [...new Set(regentsHistory.map(r => r.reporting_year))].sort((a,b)=>b-a);
  const latest = years[0] ?? null;
  return {
    demographics:{ ...values, school_year:school.demographics_year ?? null,
      source:school.demographics_source ?? null, source_url:currentSnapshot?.source_url ?? DEMOGRAPHICS_SOURCE,
      reported_bounds:currentSnapshot?.reported_bounds ?? {},
      note:'Enrollment includes early childhood grades where offered. ELL, disability and race/ethnicity values are percentages of enrollment. Economic Need Index is on a 0–100 scale. An unknown year is not the current year.',
    },
    demographics_history:history,
    enrollment_history:history.map(r => ({ school_year:r.school_year, enrollment:r.enrollment,
      elementary_enrollment:r.elementary_enrollment, middle_enrollment:r.middle_enrollment,
      high_school_enrollment:r.high_school_enrollment, source_url:r.source_url })),
    regents:{ latest_reporting_year:latest, available_reporting_years:years,
      results:regentsHistory.filter(r => r.reporting_year===latest), history:regentsHistory, source_url:REGENTS_SOURCE,
      note:'NYCPS reporting year, not an inferred school-year start. Pass rate is percent scoring 65+; 80+ is a score threshold, not exam-specific CUNY readiness. Compare the same exam and reporting year. Distinct curricula and new science exams remain separate. Missing or suppressed values are null, not zero. No overall pass rate is inferred from per-exam rows.',
    },
    history_note:'Only dated source snapshots enter trends. Undated legacy values are retained separately on the demographics-history endpoint. Different years, tests and student cohorts are not interchangeable.',
  };
}
export type SchoolResearchData = ReturnType<typeof buildSchoolResearch>;

export function regentsAtYear(data: SchoolResearchData | undefined, year: number) {
  return data?.regents.history.filter(r => r.reporting_year === year) ?? [];
}
