import type { School } from './schema';
import { calculateAcademicScore,calculateOverallScore,isHighSchool,isEarlyChildhoodOnly } from './school-utils';
export function latestAssessmentYear(schools:School[]):string|null {
  return schools.filter(s=>!isEarlyChildhoodOnly(s)).map(s=>s.assessment_year).filter((v):v is string=>!!v&&/^20\d{2}-\d{2}$/.test(v)).sort().at(-1) ?? null;
}
export function currentRankingScore(school:School,year:string|null):number {
  // High-school ratings use graduation/readiness/progress, not ELA/math or Regents.
  return isHighSchool(school) || (year!=null&&school.assessment_year===year) ? calculateOverallScore(school) : -1;
}
export function currentAcademicRankingScore(school:School,year:string|null):number {
  return !isHighSchool(school)&&year!=null&&school.assessment_year===year ? calculateAcademicScore(school) ?? -1 : -1;
}
