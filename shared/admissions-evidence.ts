/** Editorial evidence, not a replacement admissions/program database. */
export const ADMISSIONS_REVIEWED = '2026-10-25';
export const MIDDLE_ADMISSIONS_SOURCE = 'https://www.schools.nyc.gov/enrollment/enroll-grade-by-grade/middle-school';
export function admissionEvidence(s: { dbn: string; admission_method?: string | null; hs_admission_method?: string | null }) {
  if (s.dbn === '21K239') return { label: 'Talent test — verify chosen program', tone: 'screened' as const, source: MIDDLE_ADMISSIONS_SOURCE + '/MSAuditions', verified: true };
  const raw = s.admission_method?.trim();
  if (!raw) return { label: 'Not verified — check program', tone: 'default' as const, source: 'https://www.myschools.nyc/', verified: false };
  // Never classify “unscreened” as screened, or equate zone/priority with method.
  const tone = /\bunscreened\b|\blottery\b|\bopen\b/i.test(raw) ? 'lottery' as const : /\bscreened\b|audition|talent/i.test(raw) ? 'screened' as const : 'default' as const;
  return { label: `Recorded: ${raw}; verify each program`, tone, source: 'https://www.myschools.nyc/', verified: false };
}
