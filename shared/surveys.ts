export const SURVEY_SOURCE = 'https://infohub.nyced.org/reports/students-and-schools/school-quality/nyc-school-survey';
export const SURVEY_GUIDE = 'https://infohub.nyced.org/docs/default-source/default-document-library/2026-framework-and-school-survey-scoring-technical-guide.pdf';
export const SURVEY_CITYWIDE = 'https://infohub.nyced.org/docs/default-source/default-document-library/2026-nyc-school-survey-public-deck.pdf';
export const SURVEY_INSTRUMENTS = ['k12-family', 'k12-teacher', 'k12-student', 'b5-family', 'b5-teacher'] as const;
export type SurveyInstrument = typeof SURVEY_INSTRUMENTS[number];
export const surveyLabels: Record<SurveyInstrument, string> = {
  'k12-family': 'Family experience', 'k12-teacher': 'Teaching & leadership',
  'k12-student': 'Student experience', 'b5-family': 'Early-childhood family experience',
  'b5-teacher': 'Early-childhood teaching & leadership',
};
export type SurveyMetric = { key: string; label: string; value: number | null; status: 'reported' | 'not_reported' };
export type SurveyResult = {
  year: number; instrument: SurveyInstrument; sourceId: string; sourceName: string;
  sourceUrl: string; sourceHash: string; importedAt: string; responseCount: number | null;
  responseRate: number | null; metrics: SurveyMetric[];
};
export function surveyCaution(instrument: SurveyInstrument): string {
  if (instrument === 'k12-student') return 'New 2026 baseline: the student questionnaire changed substantially. Do not compare these scores with previous years.';
  if (instrument.startsWith('b5-')) return 'Center-wide feedback across early-childhood programs, not results for a specific 2-K, 3-K or pre-K cohort.';
  return 'Feedback reflects respondents, not necessarily all families or staff. Consider participation alongside results.';
}
export function metricLabel(header: string): string {
  return header.replace(/\s*Score\s*$/i, '').trim();
}
export function parseSurveyNumber(value: unknown, max: number): number | null {
  if (value == null || value === '' || value === 'N/A') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) throw new Error(`Invalid survey numeric value: ${String(value)}`);
  return value;
}
