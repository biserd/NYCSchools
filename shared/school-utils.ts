// Browser-safe school calculations and display helpers. No database or validation runtime.
// Keep schema imports type-only so these helpers remain safe to ship to browsers.
import type { School, HistoricalScore, SchoolTrend, TrendDirection, PrivateSchool, NyceecCenter } from "./schema";

export function calculateTrend(scores: HistoricalScore[]): SchoolTrend {
  if (scores.length < 2) {
    return {
      direction: 'insufficient_data',
      changePercent: 0,
      yearsAnalyzed: scores.length,
      historicalData: scores,
    };
  }

  // Sort by year ascending
  const sorted = [...scores].sort((a, b) => a.year - b.year);

  // Calculate average proficiency for first and last available years
  const getAvgProficiency = (score: HistoricalScore) => {
    const ela = score.ela_proficiency ?? 0;
    const math = score.math_proficiency ?? 0;
    const count = (score.ela_proficiency ? 1 : 0) + (score.math_proficiency ? 1 : 0);
    return count > 0 ? (ela + math) / count : 0;
  };

  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];

  const oldestAvg = getAvgProficiency(oldest);
  const newestAvg = getAvgProficiency(newest);

  if (oldestAvg === 0) {
    return {
      direction: 'insufficient_data',
      changePercent: 0,
      yearsAnalyzed: scores.length,
      historicalData: sorted,
    };
  }

  const changePercent = ((newestAvg - oldestAvg) / oldestAvg) * 100;

  // Threshold: 5% change is considered significant
  let direction: TrendDirection;
  if (changePercent >= 5) {
    direction = 'improving';
  } else if (changePercent <= -5) {
    direction = 'declining';
  } else {
    direction = 'stable';
  }

  return {
    direction,
    changePercent: Math.round(changePercent * 10) / 10,
    yearsAnalyzed: scores.length,
    historicalData: sorted,
  };
}

export const REGENTS_EXAMS = [
  'English',
  'Algebra I',
  'Geometry',
  'Algebra II / Trigonometry',
  'Living Environment',
  'Earth Science',
  'Chemistry',
  'Physics',
  'Global History',
  'US History',
] as const;

export function getQualityRatingLabel(rating: string | null): string {
  if (!rating) return "Not Available";
  switch (rating.toLowerCase()) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "fair":
      return "Fair";
    case "needs improvement":
      return "Needs Improvement";
    default:
      return rating;
  }
}

export function getQualityRatingColor(rating: string | null): "green" | "yellow" | "amber" | "red" | "gray" {
  if (!rating) return "gray";
  switch (rating.toLowerCase()) {
    case "excellent":
      return "green";
    case "good":
      return "yellow";
    case "fair":
      return "amber";
    case "needs improvement":
      return "red";
    default:
      return "gray";
  }
}

export function getQualityRatingBadgeClasses(rating: string | null): string {
  if (!rating) return "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700";

  switch (rating.toLowerCase()) {
    case "excellent":
      return "bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800";
    case "good":
      return "bg-yellow-100 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100 border-yellow-200 dark:border-yellow-800";
    case "fair":
      return "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-800";
    case "needs improvement":
      return "bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-100 border-red-200 dark:border-red-800";
    default:
      return "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700";
  }
}

export function getQualityRatingBarColor(rating: string | null): string {
  if (!rating) return "bg-gray-500";

  switch (rating.toLowerCase()) {
    case "excellent":
      return "bg-emerald-500";
    case "good":
      return "bg-yellow-500";
    case "fair":
      return "bg-amber-500";
    case "needs improvement":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

export function getQualityRatingBars(rating: string | null): number {
  if (!rating) return 0;
  switch (rating.toLowerCase()) {
    case "excellent":
      return 4;
    case "good":
      return 3;
    case "fair":
      return 2;
    case "needs improvement":
      return 1;
    default:
      return 0;
  }
}

export function isHighSchool(school: Pick<School, 'grade_band' | 'name'>): boolean {
  const gradeBand = school.grade_band?.toLowerCase() || '';
  const name = school.name?.toLowerCase() || '';

  return gradeBand.includes('12') ||
         gradeBand.includes('9-') ||
         gradeBand === '9 to 12' ||
         name.includes('high school');
}

export function isPureHighSchool(school: Pick<School, 'grade_band' | 'name'>): boolean {
  const gradeBand = school.grade_band?.toLowerCase() || '';

  // Pure high school patterns: exactly "9-12", "9 to 12"
  const isPure9to12 = gradeBand === '9-12' || gradeBand === '9 to 12';

  // Has lower grades if it contains K, PK, or starts with a number less than 9
  const hasLowerGrades = gradeBand.includes('k') ||
                         gradeBand.includes('pk') ||
                         gradeBand.startsWith('6-') ||
                         gradeBand.startsWith('5-') ||
                         gradeBand.startsWith('3-') ||
                         gradeBand.includes('k-12') ||
                         gradeBand.includes('6-12') ||
                         gradeBand.includes('5-12');

  return isPure9to12 && !hasLowerGrades;
}

export function isCombinedSchool(school: Pick<School, 'grade_band' | 'name'>): boolean {
  const gradeBand = school.grade_band?.toLowerCase() || '';

  // Combined school patterns: K-12, 6-12, PK-12, etc.
  return (gradeBand.includes('12') &&
         (gradeBand.includes('k') ||
          gradeBand.startsWith('6-') ||
          gradeBand.startsWith('5-') ||
          gradeBand.startsWith('pk') ||
          gradeBand.startsWith('3-')));
}

export function hasGrades3to8(school: Pick<School, 'grade_band'>): boolean {
  const gradeBand = school.grade_band?.toLowerCase() || '';

  // Schools with K-5, K-8, 6-8, K-12, 6-12, etc. have students taking state tests
  return gradeBand.includes('k-') ||
         gradeBand.includes('pk-') ||
         gradeBand.includes('3-') ||
         gradeBand.includes('5-') ||
         gradeBand.includes('6-8') ||
         gradeBand.includes('6-12') ||
         gradeBand.includes('-8');
}

export function calculateOverallScore(school: School): number {
  if (isEarlyChildhoodOnly(school)) return -1;
  if (!validScore(school.progress_score)) return -1;
  // High schools use different metrics
  if (isHighSchool(school)) {
    // High schools need graduation rate data for proper scoring
    if (school.graduation_rate_4yr !== null && school.graduation_rate_4yr !== undefined) {
      // High School Score = Graduation Rate (40%) + College Readiness (30%) + Progress (30%)
      const gradRate = school.graduation_rate_4yr;
      const collegeReadiness = school.college_readiness_rate ?? school.progress_score!;
      const progressScore = school.progress_score!;

      return Math.round(
        0.4 * gradRate +
        0.3 * collegeReadiness +
        0.3 * progressScore
      );
    }
    // High school without graduation data - return -1 to indicate insufficient data
    // This prevents using default 50% proficiency which creates misleading scores
    return -1;
  }

  // Elementary/Middle Academics is the mean of ELA and Math proficiency.
  // Overall = Academics (40%) + Climate (30%) + Progress (30%).
  // NYSED's 95% participation expectation is our minimum for a rated result.
  // Check if proficiency data is missing (NULL means no data available)
  if (!validScore(school.ela_proficiency) || !validScore(school.math_proficiency) || !validScore(school.climate_score)) {
    return -1; // Insufficient data
  }

  if (getAssessmentConfidence(school) === "low") {
    return -1;
  }

  // Use the same rounded Academics value shown to users so the visible
  // component scores always reproduce Overall exactly.
  const academicScore = calculateAcademicScore(school)!;

  // Overall Score = Test Proficiency (40%) + Climate (30%) + Progress (30%)
  return Math.round(
    0.4 * academicScore +
    0.3 * school.climate_score! +
    0.3 * school.progress_score!
  );
}

export const ASSESSMENT_PARTICIPATION_THRESHOLD = 95;

export const ASSESSMENT_MINIMUM_TESTED_COUNT = 50;

export function calculateAcademicScore(
  school: Pick<School, "ela_proficiency" | "math_proficiency"> & Partial<Pick<School, "grade_band">>,
): number | null {
  if (isEarlyChildhoodOnly(school) || !validScore(school.ela_proficiency) || !validScore(school.math_proficiency)) return null;
  return Math.round((school.ela_proficiency! + school.math_proficiency!) / 2);
}

export function isEarlyChildhoodOnly(school: { grade_band?: string | null }): boolean {
  return /^(2K|3K|PK|PREK|PRE-K|2-K|3-K|EARLY CHILDHOOD)$/i.test(school.grade_band?.trim() ?? "");
}

function validScore(value: number | null | undefined): boolean {
  return value != null && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function getAssessmentConfidence(
  school: Pick<School, "ela_participation_rate" | "math_participation_rate" | "ela_tested_count" | "math_tested_count" | "ela_eligible_count" | "math_eligible_count">,
): "sufficient" | "low" | "unknown" {
  const subjects = [
    {
      rate: school.ela_participation_rate,
      tested: school.ela_tested_count,
      eligible: school.ela_eligible_count,
    },
    {
      rate: school.math_participation_rate,
      tested: school.math_tested_count,
      eligible: school.math_eligible_count,
    },
  ];
  if (subjects.some(subject =>
    subject.tested != null &&
    subject.eligible != null &&
    subject.tested * 100 < subject.eligible * ASSESSMENT_PARTICIPATION_THRESHOLD
  )) return "low";
  const rates = subjects.map(subject => subject.rate);
  if (subjects.some(subject =>
    (subject.tested == null || subject.eligible == null) &&
    subject.rate != null &&
    subject.rate < ASSESSMENT_PARTICIPATION_THRESHOLD
  )) return "low";
  const testedCounts = [school.ela_tested_count, school.math_tested_count];
  if (rates.some(rate => rate == null) && testedCounts.some(count => count != null && count < ASSESSMENT_MINIMUM_TESTED_COUNT)) return "low";
  if (rates.some(rate => rate == null)) return "unknown";
  return "sufficient";
}

export function hasInsufficientData(school: School): boolean {
  if (isHighSchool(school)) {
    return school.graduation_rate_4yr === null || school.graduation_rate_4yr === undefined;
  }
  // Elementary/Middle with missing proficiency data
  return school.ela_proficiency === null || school.math_proficiency === null;
}

export function getScoreLabel(score: number): string {
  if (score < 0) return "Insufficient Data";
  if (score >= 90) return "Outstanding";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Average";
  return "Needs Improvement";
}

export function getSchoolSlug(school: Pick<School, 'name' | 'dbn'>): string {
  // Remove special characters, convert to lowercase, replace spaces with hyphens
  const nameSlug = school.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  return `${school.dbn.toLowerCase()}-${nameSlug}`;
}

export function getSchoolUrl(school: Pick<School, 'name' | 'dbn'>): string {
  return `/school/${getSchoolSlug(school)}`;
}

export function getPrivateSchoolSlug(school: Pick<PrivateSchool, 'name' | 'ncesId'>): string {
  const nameSlug = school.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${nameSlug}-${school.ncesId.toLowerCase()}`;
}

export function getPrivateSchoolUrl(school: Pick<PrivateSchool, 'name' | 'ncesId'>): string {
  return `/private-school/${getPrivateSchoolSlug(school)}`;
}

export function extractNcesIdFromSlug(slug: string): string {
  // Format: "school-name-ncesid" - extract ncesId from end
  const match = slug.match(/-([a-z0-9]+)$/i);
  if (match) {
    return match[1].toUpperCase();
  }
  return slug.toUpperCase();
}

export function extractSchoolType(name: string): string {
  const typeMatch = name.match(/^(P\.?S\.?|I\.?S\.?|M\.?S\.?|H\.?S\.?|J\.?H\.?S\.?)/i);
  if (typeMatch) {
    return typeMatch[1].replace(/\./g, '').toUpperCase();
  }
  return '';
}

export function schoolToCompareSlug(school: Pick<School, 'dbn' | 'name'>): string {
  const dbn = school.dbn.toUpperCase();
  const borough = dbn.charAt(2); // M, X, K, Q, R
  const schoolNumber = dbn.slice(3); // Last 3 digits
  const schoolType = extractSchoolType(school.name);

  if (schoolType) {
    return `${schoolType}${schoolNumber}-${borough}`;
  }
  // Fallback: use DBN directly for schools without standard type
  return dbn;
}

export function parseCompareSlug(slug: string): { type?: string; number?: string; borough?: string; dbn?: string } {
  // Check if it's a friendly slug like "PS006-M"
  const friendlyMatch = slug.match(/^([A-Z]+)(\d+)-([MXKQR])$/i);
  if (friendlyMatch) {
    return {
      type: friendlyMatch[1].toUpperCase(),
      number: friendlyMatch[2].padStart(3, '0'),
      borough: friendlyMatch[3].toUpperCase()
    };
  }
  // Fallback: treat as DBN (e.g., "01M006" or "01m006")
  return { dbn: slug.toUpperCase() };
}

export function getComparisonUrl(schools: Pick<School, 'dbn' | 'name'>[]): string {
  if (schools.length === 0) return '/compare';
  const slug = schools.map(s => schoolToCompareSlug(s)).join('-vs-');
  return `/compare/${slug}`;
}

export function parseComparisonSlug(slug: string): Array<{ type?: string; number?: string; borough?: string; dbn?: string }> {
  if (!slug) return [];
  return slug.split('-vs-').map(part => parseCompareSlug(part));
}

export function getScoreColor(score: number): "green" | "yellow" | "purple" | "red" | "gray" {
  if (score < 0) return "gray"; // Insufficient data
  if (score >= 90) return "green";
  if (score >= 80) return "yellow";
  if (score >= 70) return "purple"; // Changed from amber for better visual distinction
  return "red";
}

export function getMetricColor(score: number): "green" | "yellow" | "purple" | "red" {
  if (score >= 90) return "green";
  if (score >= 80) return "yellow";
  if (score >= 70) return "purple"; // Changed from amber for better visual distinction
  return "red";
}

export function getBoroughName(code: string | null): string {
  if (!code) return "Unknown";
  switch (code.toUpperCase()) {
    case "M": return "Manhattan";
    case "X": return "Bronx";
    case "K": return "Brooklyn";
    case "Q": return "Queens";
    case "R": return "Staten Island";
    default: return code;
  }
}

export function getNyceecSlug(center: Pick<NyceecCenter, 'name' | 'locCode'>): string {
  const nameSlug = center.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${center.locCode.toLowerCase()}-${nameSlug}`;
}

export function getNyceecUrl(center: Pick<NyceecCenter, 'name' | 'locCode'>): string {
  return `/early-childhood/${getNyceecSlug(center)}`;
}

export function getCompetitivenessLevel(appsPerSeat: number | null, trueAppsPerSeat?: number | null): 'very_competitive' | 'competitive' | 'moderate' | 'accessible' | 'unknown' {
  // Use true applicants per seat if available (more accurate), otherwise fall back to raw apps per seat
  const metric = trueAppsPerSeat ?? appsPerSeat;
  if (metric === null || metric === undefined) return 'unknown';
  if (metric >= 3) return 'very_competitive';
  if (metric >= 2) return 'competitive';
  if (metric >= 1.2) return 'moderate';
  return 'accessible';
}

export function getCompetitivenessDisplay(level: string): { label: string; color: string; description: string } {
  switch (level) {
    case 'very_competitive':
      return { label: 'Very Competitive', color: 'red', description: '3+ applicants per seat' };
    case 'competitive':
      return { label: 'Competitive', color: 'amber', description: '2-3 applicants per seat' };
    case 'moderate':
      return { label: 'Moderate', color: 'yellow', description: '1.2-2 applicants per seat' };
    case 'accessible':
      return { label: 'Accessible', color: 'green', description: 'Less than 1.2 applicants per seat' };
    default:
      return { label: 'Data Unavailable', color: 'gray', description: 'Insufficient data' };
  }
}

export function formatTuition(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "Not Available";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getTuitionRange(school: PrivateSchool): string {
  const tuitions = [school.tuitionElementary, school.tuitionMiddle, school.tuitionHigh]
    .filter((t): t is number => t !== null && t !== undefined);

  if (tuitions.length === 0) return "Contact School";

  const min = Math.min(...tuitions);
  const max = Math.max(...tuitions);

  if (min === max) return formatTuition(min);
  return `${formatTuition(min)} - ${formatTuition(max)}`;
}

export function getSelectivityDisplay(level: string | null): { label: string; color: string; description: string } {
  switch (level) {
    case 'highly_selective':
      return { label: 'Highly Selective', color: 'red', description: 'Very competitive admissions' };
    case 'selective':
      return { label: 'Selective', color: 'amber', description: 'Competitive admissions' };
    case 'moderate':
      return { label: 'Moderate', color: 'yellow', description: 'Moderately selective' };
    case 'open':
      return { label: 'Open Enrollment', color: 'green', description: 'Accepts most applicants' };
    default:
      return { label: 'Contact School', color: 'gray', description: 'Contact school for details' };
  }
}

export function getGradeRangeDisplay(school: PrivateSchool): string {
  if (school.gradesOffered) return school.gradesOffered;
  if (school.lowestGrade && school.highestGrade) {
    return `${school.lowestGrade} - ${school.highestGrade}`;
  }
  return "Contact School";
}

export const RELIGIOUS_AFFILIATIONS = [
  'Catholic',
  'Jewish',
  'Episcopal',
  'Quaker',
  'Lutheran',
  'Baptist',
  'Methodist',
  'Presbyterian',
  'Islamic',
  'Greek Orthodox',
  'Other Christian',
  'Other Religious',
  'Non-Religious',
] as const;

export const PROGRAM_EMPHASIS_OPTIONS = [
  'college_prep',
  'montessori',
  'waldorf',
  'stem',
  'arts',
  'classical',
  'special_education',
  'gifted',
  'international_baccalaureate',
  'military',
  'vocational',
] as const;

export function getProgramEmphasisLabel(emphasis: string): string {
  const labels: Record<string, string> = {
    'college_prep': 'College Preparatory',
    'montessori': 'Montessori',
    'waldorf': 'Waldorf',
    'stem': 'STEM Focus',
    'arts': 'Arts Focus',
    'classical': 'Classical Education',
    'special_education': 'Special Education',
    'gifted': 'Gifted & Talented',
    'international_baccalaureate': 'International Baccalaureate',
    'military': 'Military Academy',
    'vocational': 'Vocational/Technical',
  };
  return labels[emphasis] || emphasis;
}

export const SAFETY_RADIUS_METERS = {
  '0.25mi': 402,
  '0.5mi': 805,
  '1mi': 1609,
  '5mi': 8047,
} as const;

export const SAFETY_RADIUS_OPTIONS = [
  { miles: 0.25, meters: 402, label: '¼ mile' },
  { miles: 0.5, meters: 805, label: '½ mile' },
  { miles: 1, meters: 1609, label: '1 mile' },
  { miles: 5, meters: 8047, label: '5 miles' },
] as const;

export const DEFAULT_SAFETY_RADIUS_METERS = 805; // 0.5 mile

export const SAFETY_OFFENSE_WEIGHTS = {
  violentFelony: 8,
  felony: 4,
  misdemeanor: 2,
  violation: 1,
} as const;

export const VIOLENT_FELONY_OFFENSES = new Set<string>([
  'MURDER & NON-NEGL. MANSLAUGHTER',
  'MURDER & NON-NEGL. MANSLAUGHTE',
  'HOMICIDE-NEGLIGENT,UNCLASSIFIED',
  'HOMICIDE-NEGLIGENT,UNCLASSIFIE',
  'RAPE',
  'SEX CRIMES',
  'FELONY ASSAULT',
  'ROBBERY',
  'KIDNAPPING & RELATED OFFENSES',
  'KIDNAPPING',
  'KIDNAPPING AND RELATED OFFENSES',
  'ARSON',
]);

export function getSafetyLabel(index: number): {
  label: string;
  tone: 'excellent' | 'above_average' | 'average' | 'below_average' | 'elevated';
} {
  if (index >= 80) return { label: 'Excellent', tone: 'excellent' };
  if (index >= 60) return { label: 'Above Average', tone: 'above_average' };
  if (index >= 40) return { label: 'Average', tone: 'average' };
  if (index >= 20) return { label: 'Below Average', tone: 'below_average' };
  return { label: 'Elevated Activity', tone: 'elevated' };
}
