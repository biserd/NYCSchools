import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, serial, timestamp, index, uniqueIndex, jsonb, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const schools = pgTable("schools", {
  dbn: varchar("dbn").primaryKey(),
  name: text("name").notNull(),
  district: integer("district").notNull(),
  address: text("address").notNull(),
  grade_band: varchar("grade_band").notNull(),
  
  // Academic Performance
  academics_score: integer("academics_score").notNull(),
  climate_score: integer("climate_score").notNull(),
  progress_score: integer("progress_score").notNull(),
  ela_proficiency: integer("ela_proficiency"), // Nullable - NULL means no data available
  math_proficiency: integer("math_proficiency"), // Nullable - NULL means no data available
  science_proficiency: integer("science_proficiency"), // Science % Level 3+4 (Grades 5 & 8)
  
  // Grade-Level Assessment Breakdowns (NYSED Grades 3-8)
  ela_grade3: integer("ela_grade3"), // ELA % proficient Grade 3
  ela_grade4: integer("ela_grade4"), // ELA % proficient Grade 4
  ela_grade5: integer("ela_grade5"), // ELA % proficient Grade 5
  ela_grade6: integer("ela_grade6"), // ELA % proficient Grade 6
  ela_grade7: integer("ela_grade7"), // ELA % proficient Grade 7
  ela_grade8: integer("ela_grade8"), // ELA % proficient Grade 8
  math_grade3: integer("math_grade3"), // Math % proficient Grade 3
  math_grade4: integer("math_grade4"), // Math % proficient Grade 4
  math_grade5: integer("math_grade5"), // Math % proficient Grade 5
  math_grade6: integer("math_grade6"), // Math % proficient Grade 6
  math_grade7: integer("math_grade7"), // Math % proficient Grade 7
  math_grade8: integer("math_grade8"), // Math % proficient Grade 8
  science_grade5: integer("science_grade5"), // Science % proficient Grade 5
  science_grade8: integer("science_grade8"), // Science % proficient Grade 8
  
  // Assessment Data Source Metadata
  assessment_year: varchar("assessment_year"), // School year (e.g., "2024-25")
  assessment_source: varchar("assessment_source"), // Data source (e.g., "NYSED")
  
  // School Info
  enrollment: integer("enrollment").notNull(),
  student_teacher_ratio: real("student_teacher_ratio").notNull(),
  
  // Enrollment by Grade Level
  elementary_enrollment: integer("elementary_enrollment"), // K-5 students
  middle_enrollment: integer("middle_enrollment"), // 6-8 students
  high_school_enrollment: integer("high_school_enrollment"), // 9-12 students
  
  // NYC DOE Snapshot Data
  economic_need_index: integer("economic_need_index"),
  attendance_rate: integer("attendance_rate"),
  teacher_attendance_rate: integer("teacher_attendance_rate"),
  quality_rating_instruction: varchar("quality_rating_instruction"),
  quality_rating_safety: varchar("quality_rating_safety"),
  quality_rating_family: varchar("quality_rating_family"),
  ell_percent: integer("ell_percent"),
  iep_percent: integer("iep_percent"),
  asian_percent: integer("asian_percent"),
  black_percent: integer("black_percent"),
  hispanic_percent: integer("hispanic_percent"),
  white_percent: integer("white_percent"),
  multi_racial_percent: integer("multi_racial_percent"),
  next_level_readiness: integer("next_level_readiness"),
  admission_method: varchar("admission_method"),
  accountability_status: varchar("accountability_status"),
  principal_name: varchar("principal_name"),
  principal_experience_years: real("principal_experience_years"),
  teacher_experience_percent: integer("teacher_experience_percent"),
  middle_schools_pipeline: jsonb("middle_schools_pipeline"),
  website: varchar("website"),
  phone: varchar("phone"),
  
  // NYC School Survey Data - Student
  student_safety: integer("student_safety"),
  student_teacher_trust: integer("student_teacher_trust"),
  student_engagement: integer("student_engagement"),
  
  // NYC School Survey Data - Teacher
  teacher_quality: integer("teacher_quality"),
  teacher_collaboration: integer("teacher_collaboration"),
  teacher_leadership: integer("teacher_leadership"),
  
  // NYC School Survey Data - Guardian  
  guardian_satisfaction: integer("guardian_satisfaction"),
  guardian_communication: integer("guardian_communication"),
  guardian_school_trust: integer("guardian_school_trust"),
  
  // Geographic Coordinates
  latitude: real("latitude"),
  longitude: real("longitude"),
  zip_code: varchar("zip_code"), // NYC zip code derived from lat/lng
  
  // Early Childhood Programs
  has_3k: boolean("has_3k").default(false),
  has_prek: boolean("has_prek").default(false),
  has_2k: boolean("has_2k").default(false),
  
  // Gifted & Talented Programs
  has_gifted_talented: boolean("has_gifted_talented").default(false),
  gt_program_type: varchar("gt_program_type"), // 'district', 'citywide', or null
  
  // Dual Language & Bilingual Programs
  has_dual_language: boolean("has_dual_language").default(false),
  dual_language_languages: text("dual_language_languages").array(), // Languages offered in dual language program
  has_transitional_bilingual: boolean("has_transitional_bilingual").default(false),
  
  // PTA Fundraising Data (from NYC DOE Local Law 171 reports)
  pta_fundraising_total: integer("pta_fundraising_total"), // Total income reported by PTA
  pta_fundraising_year: varchar("pta_fundraising_year"), // School year (e.g., "2023-24")
  pta_per_student: integer("pta_per_student"), // Calculated: total / enrollment
  
  // High School Metrics
  graduation_rate_4yr: integer("graduation_rate_4yr"), // 4-year graduation rate percentage
  graduation_rate_6yr: integer("graduation_rate_6yr"), // 6-year graduation rate percentage
  college_readiness_rate: integer("college_readiness_rate"), // College & career readiness percentage
  college_enrollment_rate: integer("college_enrollment_rate"), // College enrollment rate percentage
  sat_avg_reading: integer("sat_avg_reading"), // SAT average reading/writing score
  sat_avg_math: integer("sat_avg_math"), // SAT average math score
  sat_avg_total: integer("sat_avg_total"), // SAT total average score
  regents_pass_rate: integer("regents_pass_rate"), // Overall Regents exam pass rate
  ap_course_count: integer("ap_course_count"), // Number of AP courses offered
  ap_pass_rate: integer("ap_pass_rate"), // AP exam pass rate (3+ score)
  is_specialized_hs: boolean("is_specialized_hs").default(false), // Is specialized high school
  hs_admission_method: varchar("hs_admission_method"), // screened, unscreened, limited unscreened, audition, test
  
  // Metadata
  last_updated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("schools_district_idx").on(table.district),
]);

export const insertSchoolSchema = createInsertSchema(schools);

export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;

// Historical Scores Table - stores year-over-year data for trend analysis
export const schoolHistoricalScores = pgTable("school_historical_scores", {
  id: serial("id").primaryKey(),
  dbn: varchar("dbn").notNull(),
  year: integer("year").notNull(),
  ela_proficiency: integer("ela_proficiency"), // ELA % Level 3+4
  math_proficiency: integer("math_proficiency"), // Math % Level 3+4
  science_proficiency: integer("science_proficiency"), // Science % Level 3+4 (Grades 5 & 8)
  data_source: varchar("data_source"), // Data source (e.g., "NYSED")
  data_source_release: varchar("data_source_release"), // NYSED release date, e.g., "2025-12-03"
}, (table) => ({
  dbnYearIdx: index("historical_dbn_year_idx").on(table.dbn, table.year),
}));

export const insertHistoricalScoreSchema = createInsertSchema(schoolHistoricalScores).omit({ id: true });
export type InsertHistoricalScore = z.infer<typeof insertHistoricalScoreSchema>;
export type HistoricalScore = typeof schoolHistoricalScores.$inferSelect;

// Trend types for historical analysis
export type TrendDirection = 'improving' | 'declining' | 'stable' | 'insufficient_data';

export interface SchoolTrend {
  direction: TrendDirection;
  changePercent: number; // Percentage change from oldest to newest year
  yearsAnalyzed: number;
  historicalData: HistoricalScore[];
}

// Calculate trend from historical scores
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

// High School Graduation Outcomes - multi-year cohort data from NYC DOE InfoHub
export const hsGraduation = pgTable("hs_graduation", {
  id: serial("id").primaryKey(),
  dbn: varchar("dbn").notNull(),
  cohort_year: integer("cohort_year").notNull(), // Cohort start year (e.g., 2020 for Class of 2024)
  cohort_label: varchar("cohort_label"), // e.g., "Class of 2024"
  total_cohort: integer("total_cohort"), // Total students in cohort
  grad_rate_4yr: real("grad_rate_4yr"), // 4-year graduation rate %
  grad_rate_5yr: real("grad_rate_5yr"), // 5-year graduation rate %
  grad_rate_6yr: real("grad_rate_6yr"), // 6-year graduation rate %
  dropout_rate: real("dropout_rate"), // Dropout rate %
  still_enrolled_rate: real("still_enrolled_rate"), // Still enrolled rate %
  diploma_regents_pct: real("diploma_regents_pct"), // Regents diploma %
  diploma_advanced_regents_pct: real("diploma_advanced_regents_pct"), // Advanced Regents diploma %
  diploma_local_pct: real("diploma_local_pct"), // Local diploma %
  ged_rate: real("ged_rate"), // GED/TASC rate %
  // Subgroup breakdowns (4-year grad rate for each)
  grad_rate_male: real("grad_rate_male"),
  grad_rate_female: real("grad_rate_female"),
  grad_rate_asian: real("grad_rate_asian"),
  grad_rate_black: real("grad_rate_black"),
  grad_rate_hispanic: real("grad_rate_hispanic"),
  grad_rate_white: real("grad_rate_white"),
  grad_rate_ell: real("grad_rate_ell"), // English Language Learners
  grad_rate_swd: real("grad_rate_swd"), // Students with Disabilities
  grad_rate_econ_disadv: real("grad_rate_econ_disadv"), // Economically Disadvantaged
  data_source: varchar("data_source").default("NYC DOE InfoHub"),
}, (table) => ({
  dbnCohortIdx: index("hs_grad_dbn_cohort_idx").on(table.dbn, table.cohort_year),
}));

export const insertHsGraduationSchema = createInsertSchema(hsGraduation).omit({ id: true });
export type InsertHsGraduation = z.infer<typeof insertHsGraduationSchema>;
export type HsGraduation = typeof hsGraduation.$inferSelect;

// High School Regents Exam Results - per-exam, per-year from NYC DOE InfoHub
export const hsRegents = pgTable("hs_regents", {
  id: serial("id").primaryKey(),
  dbn: varchar("dbn").notNull(),
  year: integer("year").notNull(), // School year start (e.g., 2024 for 2024-25)
  exam_name: varchar("exam_name").notNull(), // e.g., "English", "Algebra I", "Living Environment"
  total_tested: integer("total_tested"), // Number of students tested
  pass_rate: real("pass_rate"), // % scoring 65+ (passing)
  college_ready_rate: real("college_ready_rate"), // % scoring 80+ (college-ready threshold)
  mastery_rate: real("mastery_rate"), // % scoring 90+ (mastery level)
  mean_score: real("mean_score"), // Average score
  // Subgroup pass rates
  pass_rate_male: real("pass_rate_male"),
  pass_rate_female: real("pass_rate_female"),
  pass_rate_asian: real("pass_rate_asian"),
  pass_rate_black: real("pass_rate_black"),
  pass_rate_hispanic: real("pass_rate_hispanic"),
  pass_rate_white: real("pass_rate_white"),
  pass_rate_ell: real("pass_rate_ell"),
  pass_rate_swd: real("pass_rate_swd"),
  pass_rate_econ_disadv: real("pass_rate_econ_disadv"),
  data_source: varchar("data_source").default("NYC DOE InfoHub"),
}, (table) => ({
  dbnYearIdx: index("hs_regents_dbn_year_idx").on(table.dbn, table.year),
  dbnYearExamIdx: index("hs_regents_dbn_year_exam_idx").on(table.dbn, table.year, table.exam_name),
}));

export const insertHsRegentsSchema = createInsertSchema(hsRegents).omit({ id: true });
export type InsertHsRegents = z.infer<typeof insertHsRegentsSchema>;
export type HsRegents = typeof hsRegents.$inferSelect;

// Standard Regents exam names for consistent display
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

export type RegentsExam = typeof REGENTS_EXAMS[number];

export const schoolAttendance = pgTable("school_attendance", {
  id: serial("id").primaryKey(),
  dbn: varchar("dbn").notNull(),
  year: varchar("year").notNull(), // e.g., "2018-19", "2024-25"
  grade: varchar("grade").notNull().default("All Grades"),
  total_days: integer("total_days"),
  days_absent: integer("days_absent"),
  days_present: integer("days_present"),
  attendance_rate: real("attendance_rate"),
  students_contributing: integer("students_contributing"),
  chronically_absent_count: integer("chronically_absent_count"),
  chronic_absenteeism_rate: real("chronic_absenteeism_rate"),
  ca_rate_swd: real("ca_rate_swd"),
  ca_rate_not_swd: real("ca_rate_not_swd"),
  ca_rate_asian: real("ca_rate_asian"),
  ca_rate_black: real("ca_rate_black"),
  ca_rate_hispanic: real("ca_rate_hispanic"),
  ca_rate_white: real("ca_rate_white"),
  ca_rate_other: real("ca_rate_other"),
  ca_rate_male: real("ca_rate_male"),
  ca_rate_female: real("ca_rate_female"),
  ca_rate_poverty: real("ca_rate_poverty"),
  ca_rate_not_poverty: real("ca_rate_not_poverty"),
  ca_rate_ell: real("ca_rate_ell"),
  ca_rate_not_ell: real("ca_rate_not_ell"),
  ca_rate_sth: real("ca_rate_sth"),
  ca_rate_not_sth: real("ca_rate_not_sth"),
  data_source: varchar("data_source").default("NYC DOE InfoHub"),
}, (table) => ({
  dbnYearIdx: index("school_attendance_dbn_year_idx").on(table.dbn, table.year),
}));

export const insertSchoolAttendanceSchema = createInsertSchema(schoolAttendance).omit({ id: true });
export type InsertSchoolAttendance = z.infer<typeof insertSchoolAttendanceSchema>;
export type SchoolAttendance = typeof schoolAttendance.$inferSelect;

// School Discipline / Suspension Data - from NYC DOE InfoHub LL93 Reports
export const schoolDiscipline = pgTable("school_discipline", {
  id: serial("id").primaryKey(),
  dbn: varchar("dbn").notNull(),
  year: varchar("year").notNull(), // e.g., "2024-25", "2023-24"
  school_name: text("school_name"),
  category: varchar("category"), // "Elementary", "K-8", "Middle", "High School", "Transfer", etc.
  total_suspensions: integer("total_suspensions"), // Total removals + suspensions
  teacher_removals: integer("teacher_removals"), // Teacher/classroom removals
  principal_suspensions: integer("principal_suspensions"), // Principal suspensions (1-5 days)
  superintendent_suspensions: integer("superintendent_suspensions"), // Superintendent suspensions (6-180 days)
  // Race/ethnicity breakdowns (total suspensions)
  susp_black: integer("susp_black"),
  susp_hispanic: integer("susp_hispanic"),
  susp_white: integer("susp_white"),
  susp_asian: integer("susp_asian"),
  susp_multi_racial: integer("susp_multi_racial"),
  susp_native_american: integer("susp_native_american"),
  // Gender breakdowns (total suspensions)
  susp_male: integer("susp_male"),
  susp_female: integer("susp_female"),
  // Special population breakdowns (total suspensions)
  susp_swd: integer("susp_swd"), // Students with Disabilities
  susp_gen_ed: integer("susp_gen_ed"), // General Education
  susp_ell: integer("susp_ell"), // English Language Learners
  susp_non_ell: integer("susp_non_ell"),
  susp_sth: integer("susp_sth"), // Students in Temporary Housing
  susp_non_sth: integer("susp_non_sth"),
  data_source: varchar("data_source").default("NYC DOE InfoHub LL93"),
}, (table) => ({
  dbnYearIdx: index("school_discipline_dbn_year_idx").on(table.dbn, table.year),
}));

export const insertSchoolDisciplineSchema = createInsertSchema(schoolDiscipline).omit({ id: true });
export type InsertSchoolDiscipline = z.infer<typeof insertSchoolDisciplineSchema>;
export type SchoolDiscipline = typeof schoolDiscipline.$inferSelect;

export const hsAdmissionsProgram = pgTable("hs_admissions_program", {
  id: serial("id").primaryKey(),
  dbn: varchar("dbn", { length: 10 }).notNull(),
  program_number: integer("program_number").notNull(),
  program_name: text("program_name"),
  interest_area: text("interest_area"),
  program_description: text("program_description"),
  eligibility: text("eligibility"),
  admission_method: varchar("admission_method", { length: 100 }),
  grade9_ge_applicants: integer("grade9_ge_applicants"),
  grade9_swd_applicants: integer("grade9_swd_applicants"),
  seats_ge: integer("seats_ge"),
  seats_swd: integer("seats_swd"),
  applicants_per_seat_ge: real("applicants_per_seat_ge"),
  applicants_per_seat_swd: real("applicants_per_seat_swd"),
  filled_flag_ge: boolean("filled_flag_ge"),
  filled_flag_swd: boolean("filled_flag_swd"),
  seats_10plus: integer("seats_10plus"),
  requirement_1: text("requirement_1"),
  requirement_2: text("requirement_2"),
  requirement_3: text("requirement_3"),
  requirement_4: text("requirement_4"),
  audition_info: text("audition_info"),
  priority_1: text("priority_1"),
  priority_2: text("priority_2"),
  priority_3: text("priority_3"),
  offer_rate_1: text("offer_rate_1"),
  offer_rate_2: text("offer_rate_2"),
  offer_rate_3: text("offer_rate_3"),
  specialized_code: varchar("specialized_code", { length: 20 }),
  specialized_applicants: integer("specialized_applicants"),
  specialized_seats: integer("specialized_seats"),
  specialized_apps_per_seat: real("specialized_apps_per_seat"),
  is_specialized: boolean("is_specialized").default(false),
  school_name: text("school_name"),
  overview_paragraph: text("overview_paragraph"),
  academic_opportunities: text("academic_opportunities"),
  data_year: varchar("data_year", { length: 10 }).default("2025-26"),
  data_source: varchar("data_source", { length: 100 }).default("NYC DOE HS Directory"),
}, (table) => ({
  dbnIdx: index("hs_admissions_dbn_idx").on(table.dbn),
}));

export const insertHsAdmissionsProgramSchema = createInsertSchema(hsAdmissionsProgram).omit({ id: true });
export type InsertHsAdmissionsProgram = z.infer<typeof insertHsAdmissionsProgramSchema>;
export type HsAdmissionsProgram = typeof hsAdmissionsProgram.$inferSelect;

export interface SchoolWithOverallScore extends School {
  overall_score: number;
}

export interface MiddleSchoolDestination {
  dbn: string;
  name: string;
  percent: number;
}

// Helper function to get quality rating display
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

// Helper function to get quality rating color
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

// Helper function to get quality rating badge classes with proper Tailwind styling
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

// Helper function to get quality rating bar color for 4-bar visual
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

// Helper function to get quality rating bars (1-4)
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

// Check if school is a pure high school (9-12 only, no lower grades)
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

// Check if school serves multiple grade levels including both elementary/middle AND high school
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

// Check if school has grades 3-8 students (who take state tests)
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
  // High schools use different metrics
  if (isHighSchool(school)) {
    // High schools need graduation rate data for proper scoring
    if (school.graduation_rate_4yr !== null && school.graduation_rate_4yr !== undefined) {
      // High School Score = Graduation Rate (40%) + College Readiness (30%) + Progress (30%)
      const gradRate = school.graduation_rate_4yr;
      const collegeReadiness = school.college_readiness_rate ?? school.progress_score;
      const progressScore = school.progress_score;
      
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
  
  // Elementary/Middle schools use test proficiency
  // Check if proficiency data is missing (NULL means no data available)
  if (school.ela_proficiency === null || school.math_proficiency === null) {
    return -1; // Insufficient data
  }
  
  // Calculate test proficiency as average of ELA and Math
  const testProficiency = (school.ela_proficiency + school.math_proficiency) / 2;
  
  // Overall Score = Test Proficiency (40%) + Climate (30%) + Progress (30%)
  return Math.round(
    0.4 * testProficiency +
    0.3 * school.climate_score +
    0.3 * school.progress_score
  );
}

// Check if a school has insufficient data for proper scoring
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

// Helper function to generate URL-friendly slug from school name and DBN
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

// Helper function to get school URL path
export function getSchoolUrl(school: Pick<School, 'name' | 'dbn'>): string {
  return `/school/${getSchoolSlug(school)}`;
}

// Helper function to generate URL-friendly slug from private school name and ncesId
export function getPrivateSchoolSlug(school: Pick<PrivateSchool, 'name' | 'ncesId'>): string {
  const nameSlug = school.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `${nameSlug}-${school.ncesId.toLowerCase()}`;
}

// Helper function to get private school URL path
export function getPrivateSchoolUrl(school: Pick<PrivateSchool, 'name' | 'ncesId'>): string {
  return `/private-school/${getPrivateSchoolSlug(school)}`;
}

// Extract ncesId from private school slug (e.g., "academy-of-st-joseph-00921917" -> "00921917")
export function extractNcesIdFromSlug(slug: string): string {
  // Format: "school-name-ncesid" - extract ncesId from end
  const match = slug.match(/-([a-z0-9]+)$/i);
  if (match) {
    return match[1].toUpperCase();
  }
  return slug.toUpperCase();
}

// Extract school type abbreviation from school name (e.g., "P.S. 006" -> "PS", "I.S. 075" -> "IS")
export function extractSchoolType(name: string): string {
  const typeMatch = name.match(/^(P\.?S\.?|I\.?S\.?|M\.?S\.?|H\.?S\.?|J\.?H\.?S\.?)/i);
  if (typeMatch) {
    return typeMatch[1].replace(/\./g, '').toUpperCase();
  }
  return '';
}

// Convert a school to a URL-friendly comparison slug (e.g., "PS006-M" from DBN "01M006")
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

// Convert comparison slug back to DBN format (e.g., "PS006-M" -> needs district lookup)
// Returns the slug parts for API lookup: { type, number, borough } or { dbn } for direct DBN format
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

// Helper function to generate a shareable comparison URL from schools
export function getComparisonUrl(schools: Pick<School, 'dbn' | 'name'>[]): string {
  if (schools.length === 0) return '/compare';
  const slug = schools.map(s => schoolToCompareSlug(s)).join('-vs-');
  return `/compare/${slug}`;
}

// Helper function to parse school identifiers from a comparison URL slug
// Returns an array of parsed slug parts
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

// Get color for individual metrics (ELA, Math, Climate, Progress)
export function getMetricColor(score: number): "green" | "yellow" | "purple" | "red" {
  if (score >= 90) return "green";
  if (score >= 80) return "yellow";
  if (score >= 70) return "purple"; // Changed from amber for better visual distinction
  return "red";
}

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for standalone authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  homeAddress: varchar("home_address"),
  homeLat: real("home_lat"),
  homeLng: real("home_lng"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("free"),
  subscriptionPlan: varchar("subscription_plan").default("free"), // 'free', 'season_pass', 'premium'
  subscriptionExpiresAt: timestamp("subscription_expires_at"), // For Season Pass expiration
  freeViewSchoolDbn: varchar("free_view_school_dbn"), // DBN of the one school they can view for free
  // Drip campaign tracking
  dripEmailsSent: text("drip_emails_sent").array().default([]), // Array of sent drip email types
  emailUnsubscribed: boolean("email_unsubscribed").default(false), // User opted out of marketing emails
  lastDripEmailAt: timestamp("last_drip_email_at"), // When the last drip email was sent
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  profileImageUrl: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  subscriptionStatus: true,
  subscriptionPlan: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Password Reset Tokens for forgot password flow
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenHashIdx: index("password_reset_tokens_hash_idx").on(table.tokenHash),
  userIdx: index("password_reset_tokens_user_idx").on(table.userId),
}));

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// API Keys for the Developer API (Premium feature)
// We store only a SHA-256 hash of the full key; the plaintext is shown to the
// user exactly once at creation time. `keyPrefix` is the first 12 chars of the
// plaintext key (e.g., "nycr_live_aB") and is safe to display in the UI so the
// user can identify which key is which.
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  keyPrefix: varchar("key_prefix").notNull(),
  keyHash: varchar("key_hash").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
  revokedAt: timestamp("revoked_at"),
}, (table) => ({
  userIdx: index("api_keys_user_idx").on(table.userId),
  hashIdx: index("api_keys_hash_idx").on(table.keyHash),
}));

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// Persistent rate-limit state per API key. One row per key, holding the
// current minute and day window counters. The previous in-memory implementation
// reset on every server restart; this table makes the daily 10K cap resilient
// to deploys/crashes/HMR. Updated atomically via a single UPSERT in the auth
// middleware (see server/apiKeyAuth.ts).
export const apiKeyRateState = pgTable("api_key_rate_state", {
  keyId: integer("key_id").primaryKey().references(() => apiKeys.id, { onDelete: "cascade" }),
  minuteWindowStart: timestamp("minute_window_start").notNull(),
  minuteCount: integer("minute_count").notNull().default(0),
  dayWindowStart: timestamp("day_window_start").notNull(),
  dayCount: integer("day_count").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ApiKeyRateState = typeof apiKeyRateState.$inferSelect;
export type InsertApiKeyRateState = typeof apiKeyRateState.$inferInsert;

// Audit log: one row per /api/v1/* request. Powers the admin dashboard and
// abuse-detection job. Pruned after 30 days by a scheduled job. `keyId` is
// nullable so we can also record unauthenticated 401s (used by the per-IP
// throttle and useful for spotting brute-force scans).
export const apiRequestLog = pgTable("api_request_log", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").references(() => apiKeys.id, { onDelete: "set null" }),
  path: varchar("path").notNull(),
  status: integer("status").notNull(),
  ip: varchar("ip"),
  responseTimeMs: integer("response_time_ms"),
  ts: timestamp("ts").notNull().defaultNow(),
}, (table) => ({
  keyTsIdx: index("api_request_log_key_ts_idx").on(table.keyId, table.ts),
  tsIdx: index("api_request_log_ts_idx").on(table.ts),
  statusTsIdx: index("api_request_log_status_ts_idx").on(table.status, table.ts),
}));

export type ApiRequestLog = typeof apiRequestLog.$inferSelect;
export type InsertApiRequestLog = typeof apiRequestLog.$inferInsert;

// De-duplication for the abuse-detection job. One row per (key, alert type,
// day) means the admin gets at most one email per condition per key per day,
// no matter how often the cron runs.
export const apiAbuseAlerts = pgTable("api_abuse_alerts", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
  alertType: varchar("alert_type").notNull(), // 'rate_limit_storm' | 'distinct_ip_spike'
  alertDay: date("alert_day").notNull(),
  detail: jsonb("detail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniq: uniqueIndex("api_abuse_alerts_unique_per_day").on(table.keyId, table.alertType, table.alertDay),
}));

export type ApiAbuseAlert = typeof apiAbuseAlerts.$inferSelect;
export type InsertApiAbuseAlert = typeof apiAbuseAlerts.$inferInsert;

// Magic Link Tokens for passwordless authentication
export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenHashIdx: index("magic_link_tokens_hash_idx").on(table.tokenHash),
  userIdx: index("magic_link_tokens_user_idx").on(table.userId),
}));

export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;

// Processed Webhook Events for idempotency (prevent duplicate processing)
export const processedWebhookEvents = pgTable("processed_webhook_events", {
  eventId: varchar("event_id").primaryKey(), // Stripe event ID
  eventType: varchar("event_type").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
}, (table) => ({
  eventTypeIdx: index("processed_webhook_events_type_idx").on(table.eventType),
}));

export type ProcessedWebhookEvent = typeof processedWebhookEvents.$inferSelect;

// OAuth 2.1 Authorization Codes for ChatGPT integration
export const oauthAuthorizationCodes = pgTable("oauth_authorization_codes", {
  code: varchar("code").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull(),
  redirectUri: varchar("redirect_uri").notNull(),
  codeChallenge: varchar("code_challenge").notNull(), // PKCE S256 challenge
  codeChallengeMethod: varchar("code_challenge_method").notNull().default("S256"),
  scope: varchar("scope"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("oauth_auth_codes_user_idx").on(table.userId),
}));

export type OAuthAuthorizationCode = typeof oauthAuthorizationCodes.$inferSelect;

// OAuth 2.1 Access Tokens
export const oauthAccessTokens = pgTable("oauth_access_tokens", {
  token: varchar("token").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull(),
  scope: varchar("scope"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("oauth_access_tokens_user_idx").on(table.userId),
}));

export type OAuthAccessToken = typeof oauthAccessTokens.$inferSelect;

// OAuth 2.1 Refresh Tokens
export const oauthRefreshTokens = pgTable("oauth_refresh_tokens", {
  token: varchar("token").primaryKey(),
  accessToken: varchar("access_token").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull(),
  scope: varchar("scope"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("oauth_refresh_tokens_user_idx").on(table.userId),
}));

export type OAuthRefreshToken = typeof oauthRefreshTokens.$inferSelect;

// OAuth 2.0 Dynamic Client Registration (RFC 7591)
export const oauthClients = pgTable("oauth_clients", {
  clientId: varchar("client_id").primaryKey(),
  clientSecret: varchar("client_secret"),
  clientName: varchar("client_name").notNull(),
  redirectUris: text("redirect_uris").array().notNull(),
  grantTypes: text("grant_types").array().default(["authorization_code"]),
  responseTypes: text("response_types").array().default(["code"]),
  tokenEndpointAuthMethod: varchar("token_endpoint_auth_method").default("none"),
  scope: varchar("scope"),
  clientUri: varchar("client_uri"),
  logoUri: varchar("logo_uri"),
  tosUri: varchar("tos_uri"),
  policyUri: varchar("policy_uri"),
  contacts: text("contacts").array(),
  clientIdIssuedAt: timestamp("client_id_issued_at").defaultNow().notNull(),
  clientSecretExpiresAt: timestamp("client_secret_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OAuthClient = typeof oauthClients.$inferSelect;
export type InsertOAuthClient = typeof oauthClients.$inferInsert;

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolDbn: varchar("school_dbn").notNull().references(() => schools.dbn, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("favorites_user_id_idx").on(table.userId),
  index("favorites_user_school_idx").on(table.userId, table.schoolDbn),
]);

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

// Application Tracker - Tracked Schools for premium users
export const trackedSchools = pgTable("tracked_schools", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolDbn: varchar("school_dbn").notNull().references(() => schools.dbn, { onDelete: "cascade" }),
  // Tracking status
  status: varchar("status").default("researching"), // 'researching', 'applied', 'waitlisted', 'accepted', 'enrolled', 'rejected'
  notes: text("notes"), // User's personal notes about this school
  // Important dates
  openHouseDate: timestamp("open_house_date"),
  tourDate: timestamp("tour_date"),
  applicationDeadline: timestamp("application_deadline"),
  // Notification preferences
  notifyOpenHouse: boolean("notify_open_house").default(true),
  notifyTour: boolean("notify_tour").default(true),
  notifyDeadline: boolean("notify_deadline").default(true),
  // Email notification tracking
  openHouseNotifiedAt: timestamp("open_house_notified_at"),
  tourNotifiedAt: timestamp("tour_notified_at"),
  deadlineNotifiedAt: timestamp("deadline_notified_at"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userSchoolIdx: index("tracked_user_school_idx").on(table.userId, table.schoolDbn),
}));

export const insertTrackedSchoolSchema = createInsertSchema(trackedSchools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  openHouseNotifiedAt: true,
  tourNotifiedAt: true,
  deadlineNotifiedAt: true,
});

export type InsertTrackedSchool = z.infer<typeof insertTrackedSchoolSchema>;
export type TrackedSchool = typeof trackedSchools.$inferSelect;

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolDbn: varchar("school_dbn").notNull().references(() => schools.dbn, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  helpfulCount: integer("helpful_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_reviews_school").on(table.schoolDbn),
  index("idx_reviews_user").on(table.userId),
]);

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  helpfulCount: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  rating: z.number().min(1).max(5),
  reviewText: z.string().nullish(),
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export interface ReviewWithUser extends Review {
  user: {
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  } | null;
}

export const userProfiles = pgTable("user_profiles", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  homeAddress: text("home_address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  // Cached zoned schools from NYC DOE official zone boundaries
  zonedElementaryDbn: varchar("zoned_elementary_dbn"), // User's zoned elementary school DBN
  zonedMiddleDbn: varchar("zoned_middle_dbn"), // User's zoned middle school DBN
  zonedHighDbn: varchar("zoned_high_dbn"), // User's zoned high school DBN (if applicable)
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// NYC DOE School Zone Boundaries - stores official zone polygons from NYC Open Data
export const schoolZones = pgTable("school_zones", {
  id: serial("id").primaryKey(),
  dbn: varchar("dbn").notNull(), // School DBN
  schoolName: text("school_name"),
  district: integer("district"),
  gradeLevel: varchar("grade_level").notNull(), // 'elementary', 'middle', 'high'
  geometry: jsonb("geometry").notNull(), // GeoJSON geometry (Polygon or MultiPolygon)
  remarks: text("remarks"), // Any special notes from DOE
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("idx_school_zones_dbn").on(table.dbn),
  index("idx_school_zones_grade").on(table.gradeLevel),
  index("idx_school_zones_district").on(table.district),
]);

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  updatedAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export const insertSchoolZoneSchema = createInsertSchema(schoolZones).omit({
  id: true,
  lastUpdated: true,
});

export type InsertSchoolZone = z.infer<typeof insertSchoolZoneSchema>;
export type SchoolZone = typeof schoolZones.$inferSelect;

// AI Chat Sessions - stores conversation sessions for training and history
export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title"), // Auto-generated from first message or user-specified
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_chat_sessions_user").on(table.userId),
  index("idx_chat_sessions_created").on(table.createdAt),
]);

export const insertAiChatSessionSchema = createInsertSchema(aiChatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAiChatSession = z.infer<typeof insertAiChatSessionSchema>;
export type AiChatSession = typeof aiChatSessions.$inferSelect;

// AI Chat Messages - stores individual messages for training purposes
export const aiChatMessages = pgTable("ai_chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => aiChatSessions.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_chat_messages_session").on(table.sessionId),
  index("idx_chat_messages_created").on(table.createdAt),
]);

export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertAiChatMessage = z.infer<typeof insertAiChatMessageSchema>;
export type AiChatMessage = typeof aiChatMessages.$inferSelect;

export interface AiChatSessionWithMessages extends AiChatSession {
  messages: AiChatMessage[];
}

// NYCEEC Centers - NYC Early Education Centers (community-based Pre-K/3-K providers)
// ─── 2-K Early Childhood Centers ────────────────────────────────────────────
export const twokCenters = pgTable("twok_centers", {
  id: serial("id").primaryKey(),
  dbn: varchar("dbn").unique().notNull(),       // NYC school DBN code

  // Basic info
  name: text("name").notNull(),
  borough: varchar("borough").notNull(),         // Bronx, Brooklyn, Manhattan, Queens, Staten Island
  district: integer("district"),

  // Location
  address: text("address").notNull(),
  zipCode: varchar("zip_code"),
  latitude: real("latitude"),
  longitude: real("longitude"),

  // Contact
  phone: varchar("phone"),
  email: varchar("email"),
  website: varchar("website"),

  // Program details
  programName: varchar("program_name"),          // '2-K - Expanded Day and Full Year' | '2-K - School Day'
  programType: varchar("program_type"),          // 'EDFY' | 'SDY'
  schoolType: varchar("school_type"),            // 'PUBLIC' | 'PRIVATE'

  // Metadata
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("idx_twok_borough").on(table.borough),
  index("idx_twok_district").on(table.district),
  index("idx_twok_zip").on(table.zipCode),
]);

export const insertTwokCenterSchema = createInsertSchema(twokCenters).omit({
  id: true,
  lastUpdated: true,
});

export type InsertTwokCenter = z.infer<typeof insertTwokCenterSchema>;
export type TwokCenter = typeof twokCenters.$inferSelect;

// ─── NYCEEC Early Childhood Centers ─────────────────────────────────────────
export const nyceecCenters = pgTable("nyceec_centers", {
  id: serial("id").primaryKey(),
  locCode: varchar("loc_code").unique().notNull(), // Location code (e.g., "KCPY")
  
  // Basic Info
  name: text("name").notNull(), // Center name
  centerType: varchar("center_type").notNull(), // 'NYCEEC', 'DOE', 'Charter'
  borough: varchar("borough").notNull(), // K=Brooklyn, M=Manhattan, X=Bronx, Q=Queens, R=Staten Island
  district: integer("district"), // Extracted from sems_code
  
  // Location
  address: text("address").notNull(),
  zipCode: varchar("zip_code"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  nta: varchar("nta"), // Neighborhood Tabulation Area
  
  // Contact
  phone: varchar("phone"),
  email: varchar("email"),
  website: varchar("website"),
  
  // Program Details
  seats: integer("seats"), // Number of Pre-K seats
  dayLength: varchar("day_length"), // Full day, half day
  extendedDay: boolean("extended_day").default(false), // Offers extended hours
  mealsProvided: boolean("meals_provided").default(false), // Offers meals
  indoorOutdoor: varchar("indoor_outdoor"), // Play space type
  
  // Additional fields
  semsCode: varchar("sems_code"), // DOE organizational code
  communityBoard: varchar("community_board"),
  councilDistrict: varchar("council_district"),
  
  // Metadata
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("idx_nyceec_borough").on(table.borough),
  index("idx_nyceec_district").on(table.district),
  index("idx_nyceec_type").on(table.centerType),
  index("idx_nyceec_zip").on(table.zipCode),
]);

export const insertNyceecCenterSchema = createInsertSchema(nyceecCenters).omit({
  id: true,
  lastUpdated: true,
});

export type InsertNyceecCenter = z.infer<typeof insertNyceecCenterSchema>;
export type NyceecCenter = typeof nyceecCenters.$inferSelect;

// NYCEEC Reviews - Parent reviews for early childhood centers
export const nyceecReviews = pgTable("nyceec_reviews", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  locCode: varchar("loc_code").notNull().references(() => nyceecCenters.locCode, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  helpfulCount: integer("helpful_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_nyceec_reviews_center").on(table.locCode),
  index("idx_nyceec_reviews_user").on(table.userId),
]);

export const insertNyceecReviewSchema = createInsertSchema(nyceecReviews).omit({
  id: true,
  helpfulCount: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  rating: z.number().min(1).max(5),
  reviewText: z.string().nullish(),
});

export type InsertNyceecReview = z.infer<typeof insertNyceecReviewSchema>;
export type NyceecReview = typeof nyceecReviews.$inferSelect;

export interface NyceecReviewWithUser extends NyceecReview {
  user: {
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  } | null;
}

// NYCEEC AI Insights Cache - Store generated AI insights per center
export const nyceecAiInsights = pgTable("nyceec_ai_insights", {
  id: serial("id").primaryKey(),
  locCode: varchar("loc_code").unique().notNull().references(() => nyceecCenters.locCode, { onDelete: "cascade" }),
  overview: text("overview").notNull(),
  considerations: text("considerations").array().notNull(),
  tourQuestions: text("tour_questions").array().notNull(),
  neighborhoodContext: text("neighborhood_context").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_nyceec_insights_loccode").on(table.locCode),
]);

export type NyceecAiInsight = typeof nyceecAiInsights.$inferSelect;
export type InsertNyceecAiInsight = typeof nyceecAiInsights.$inferInsert;

// Contact form submissions
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  read: boolean("read").default(false),
}, (table) => [
  index("idx_contact_created").on(table.createdAt),
]);

export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
  id: true,
  createdAt: true,
  read: true,
});

export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;

// Helper function to get borough full name
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

// Helper function to generate URL-friendly slug from NYCEEC center
export function getNyceecSlug(center: Pick<NyceecCenter, 'name' | 'locCode'>): string {
  const nameSlug = center.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `${center.locCode.toLowerCase()}-${nameSlug}`;
}

// Helper function to get NYCEEC center URL path
export function getNyceecUrl(center: Pick<NyceecCenter, 'name' | 'locCode'>): string {
  return `/early-childhood/${getNyceecSlug(center)}`;
}

// ========================================
// KINDERGARTEN / 3-K / PRE-K ADMISSIONS DATA
// ========================================

// Admissions Offers Table - LL72 Applications & Offers data
export const admissionsOffers = pgTable("admissions_offers", {
  id: serial("id").primaryKey(),
  dbn: varchar("dbn").notNull(),
  schoolYear: varchar("school_year").notNull(), // e.g., "2025-2026"
  gradeBand: varchar("grade_band").notNull(), // "K", "3K", "PK"
  category: varchar("category").notNull(), // "All Students" or breakdown category
  
  // Core metrics from LL72
  seatsAvailable: integer("seats_available"),
  totalApplicants: integer("total_applicants"),
  trueApplicants: integer("true_applicants"), // Applicants who ranked this as a choice
  offers: integer("offers"),
  
  // Suppression flags
  isSuppressed: boolean("is_suppressed").default(false),
  
  // Source tracking
  sourceFile: varchar("source_file"),
  ingestedAt: timestamp("ingested_at").defaultNow(),
}, (table) => [
  index("idx_admissions_dbn").on(table.dbn),
  index("idx_admissions_year_grade").on(table.schoolYear, table.gradeBand),
]);

export const insertAdmissionsOffersSchema = createInsertSchema(admissionsOffers).omit({ id: true, ingestedAt: true });
export type InsertAdmissionsOffers = z.infer<typeof insertAdmissionsOffersSchema>;
export type AdmissionsOffers = typeof admissionsOffers.$inferSelect;

// Enrollment Data Table - LL72 Enrollment data (actual registered students)
export const enrollmentData = pgTable("enrollment_data", {
  id: serial("id").primaryKey(),
  dbn: varchar("dbn").notNull(),
  schoolYear: varchar("school_year").notNull(), // e.g., "2024-2025"
  grade: varchar("grade").notNull(), // "K", "3K", "PK", "1", "2", etc.
  
  enrolled: integer("enrolled"),
  isSuppressed: boolean("is_suppressed").default(false),
  
  sourceFile: varchar("source_file"),
  ingestedAt: timestamp("ingested_at").defaultNow(),
}, (table) => [
  index("idx_enrollment_dbn").on(table.dbn),
  index("idx_enrollment_year_grade").on(table.schoolYear, table.grade),
]);

export const insertEnrollmentDataSchema = createInsertSchema(enrollmentData).omit({ id: true, ingestedAt: true });
export type InsertEnrollmentData = z.infer<typeof insertEnrollmentDataSchema>;
export type EnrollmentData = typeof enrollmentData.$inferSelect;

// Computed Admissions Metrics - stored for fast retrieval
export const admissionsMetrics = pgTable("admissions_metrics", {
  id: serial("id").primaryKey(),
  dbn: varchar("dbn").notNull(),
  schoolYear: varchar("school_year").notNull(),
  gradeBand: varchar("grade_band").notNull(), // "K", "3K", "PK"
  
  // Demand metrics
  appsPerSeat: real("apps_per_seat"), // Total applicants / seats
  trueAppsPerSeat: real("true_apps_per_seat"), // True applicants / seats
  offerRate: real("offer_rate"), // Offers / total applicants
  trueOfferRate: real("true_offer_rate"), // Offers / true applicants
  
  // Fill metrics (requires enrollment data)
  yield: real("yield"), // Enrolled / offers
  fillRate: real("fill_rate"), // Enrolled / seats
  
  // Estimated metrics (for current year without enrollment data)
  estimatedYield: real("estimated_yield"), // Bayesian-smoothed yield estimate
  estimatedFillRate: real("estimated_fill_rate"),
  estimationMethod: varchar("estimation_method"), // "historical_yield", "district_average"
  
  // Raw values for reference
  seatsAvailable: integer("seats_available"),
  totalApplicants: integer("total_applicants"),
  trueApplicants: integer("true_applicants"),
  offers: integer("offers"),
  enrolled: integer("enrolled"),
  
  // District-level averages used for smoothing
  districtAvgYield: real("district_avg_yield"),
  
  computedAt: timestamp("computed_at").defaultNow(),
}, (table) => [
  index("idx_metrics_dbn").on(table.dbn),
  index("idx_metrics_year_grade").on(table.schoolYear, table.gradeBand),
]);

export const insertAdmissionsMetricsSchema = createInsertSchema(admissionsMetrics).omit({ id: true, computedAt: true });
export type InsertAdmissionsMetrics = z.infer<typeof insertAdmissionsMetricsSchema>;
export type AdmissionsMetrics = typeof admissionsMetrics.$inferSelect;

// Type for API response with all metrics for a school
export interface SchoolAdmissionsData {
  dbn: string;
  schoolName: string;
  metrics: {
    gradeBand: string;
    schoolYear: string;
    seatsAvailable: number | null;
    totalApplicants: number | null;
    trueApplicants: number | null;
    offers: number | null;
    enrolled: number | null;
    appsPerSeat: number | null;
    offerRate: number | null;
    trueOfferRate: number | null;
    yield: number | null;
    fillRate: number | null;
    estimatedFillRate: number | null;
    competitivenessLevel: 'very_competitive' | 'competitive' | 'moderate' | 'accessible' | 'unknown';
  }[];
}

// App Settings table for global configuration
export const appSettings = pgTable("app_settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AppSetting = typeof appSettings.$inferSelect;

// Drip email types for the re-engagement campaign
export const DRIP_EMAIL_TYPES = [
  'welcome_tip',      // Day 1: Quick tip on using filters and favorites
  'ai_spotlight',     // Day 3: AI Chat Assistant feature spotlight  
  'data_insight',     // Day 7: Data insight about top schools
  'upgrade_nudge',    // Day 14: Soft upgrade nudge with Season Pass benefits
] as const;

export type DripEmailType = typeof DRIP_EMAIL_TYPES[number];

// Helper to determine competitiveness level based on apps per seat
// Prefers trueAppsPerSeat (actual unique applicants) over appsPerSeat (raw applications) for more accurate odds
export function getCompetitivenessLevel(appsPerSeat: number | null, trueAppsPerSeat?: number | null): 'very_competitive' | 'competitive' | 'moderate' | 'accessible' | 'unknown' {
  // Use true applicants per seat if available (more accurate), otherwise fall back to raw apps per seat
  const metric = trueAppsPerSeat ?? appsPerSeat;
  if (metric === null || metric === undefined) return 'unknown';
  if (metric >= 3) return 'very_competitive';
  if (metric >= 2) return 'competitive';
  if (metric >= 1.2) return 'moderate';
  return 'accessible';
}

// Helper to get competitiveness display info
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

// ===============================
// NYC Private Schools (NCES PSS)
// ===============================

// Private Schools Table - data from NCES Private School Universe Survey (PSS)
export const privateSchools = pgTable("private_schools", {
  // Primary identifier from NCES
  ncesId: varchar("nces_id").primaryKey(), // NCES School ID (PPIN)
  
  // Basic Information
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: varchar("state", { length: 2 }).notNull().default('NY'),
  zipCode: varchar("zip_code", { length: 10 }),
  phone: varchar("phone"),
  website: varchar("website"),
  
  // Location (from NYC Geoclient enrichment)
  borough: varchar("borough"), // Manhattan, Bronx, Brooklyn, Queens, Staten Island
  neighborhood: varchar("neighborhood"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  bbl: varchar("bbl"), // Borough-Block-Lot (NYC property identifier)
  bin: varchar("bin"), // Building Identification Number
  
  // Grade Configuration
  gradesOffered: text("grades_offered"), // e.g., "PK-12", "K-8", "9-12"
  lowestGrade: varchar("lowest_grade"), // PK, K, 1, 2, etc.
  highestGrade: varchar("highest_grade"), // 12, 8, etc.
  
  // Enrollment & Staff
  enrollment: integer("enrollment"), // Total enrollment
  enrollmentByGrade: jsonb("enrollment_by_grade"), // { "PK": 20, "K": 30, ... }
  teachersFte: real("teachers_fte"), // Full-time equivalent teachers
  studentTeacherRatio: real("student_teacher_ratio"),
  
  // School Characteristics
  coedStatus: varchar("coed_status"), // 'coed', 'male', 'female'
  religiousAffiliation: varchar("religious_affiliation"), // Catholic, Jewish, Episcopal, None, etc.
  religiousOrientation: varchar("religious_orientation"), // Specific denomination
  isReligious: boolean("is_religious").default(false),
  
  // Program & Focus
  programEmphasis: text("program_emphasis").array(), // ['college_prep', 'montessori', 'stem', 'arts', etc.]
  schoolType: varchar("school_type"), // 'day', 'boarding', 'day_boarding'
  hasExtendedDay: boolean("has_extended_day").default(false),
  schoolDayMinutes: integer("school_day_minutes"), // Length of school day
  schoolYearDays: integer("school_year_days"), // Days per school year
  
  // Tuition & Financial Aid
  tuitionElementary: integer("tuition_elementary"), // Annual tuition for elementary grades
  tuitionMiddle: integer("tuition_middle"), // Annual tuition for middle grades  
  tuitionHigh: integer("tuition_high"), // Annual tuition for high school
  hasFinancialAid: boolean("has_financial_aid").default(false),
  financialAidPercent: integer("financial_aid_percent"), // % of students receiving aid
  
  // Demographics (from PSS survey)
  asianPercent: real("asian_percent"),
  blackPercent: real("black_percent"),
  hispanicPercent: real("hispanic_percent"),
  whitePercent: real("white_percent"),
  pacificIslanderPercent: real("pacific_islander_percent"),
  americanIndianPercent: real("american_indian_percent"),
  multiRacialPercent: real("multi_racial_percent"),
  
  // Facilities
  hasLibrary: boolean("has_library"),
  
  // School Associations (from PSS)
  associations: text("associations").array(), // ['NAIS', 'NYSAIS', etc.]
  
  // Accreditation & Affiliations
  accreditation: text("accreditation").array(), // ['NYSAIS', 'Middle States', etc.]
  networkAffiliation: varchar("network_affiliation"), // Archdiocese of NY, etc.
  
  // Admissions Info
  applicationDeadline: varchar("application_deadline"),
  hasRollingAdmissions: boolean("has_rolling_admissions").default(false),
  admissionsSelectivity: varchar("admissions_selectivity"), // 'highly_selective', 'selective', 'moderate', 'open'
  requiresInterview: boolean("requires_interview").default(false),
  requiresTesting: boolean("requires_testing").default(false),
  testingTypes: text("testing_types").array(), // ['ISEE', 'SSAT', 'ERB', etc.]
  
  // Data Source Info
  dataSourceYear: integer("data_source_year"), // Year of PSS survey
  dataSourceVersion: varchar("data_source_version"), // PSS release version
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("private_schools_borough_idx").on(table.borough),
  index("private_schools_zip_idx").on(table.zipCode),
  index("private_schools_religious_idx").on(table.religiousAffiliation),
]);

export const insertPrivateSchoolSchema = createInsertSchema(privateSchools);
export type InsertPrivateSchool = z.infer<typeof insertPrivateSchoolSchema>;
export type PrivateSchool = typeof privateSchools.$inferSelect;

// Private School History Table - for tracking year-over-year changes
export const privateSchoolHistory = pgTable("private_school_history", {
  id: serial("id").primaryKey(),
  ncesId: varchar("nces_id").notNull(),
  schoolYear: integer("school_year").notNull(), // e.g., 2023 for 2023-24
  
  // Metrics that change over time
  enrollment: integer("enrollment"),
  teachersFte: real("teachers_fte"),
  studentTeacherRatio: real("student_teacher_ratio"),
  tuitionElementary: integer("tuition_elementary"),
  tuitionMiddle: integer("tuition_middle"),
  tuitionHigh: integer("tuition_high"),
  schoolDayMinutes: integer("school_day_minutes"),
  schoolYearDays: integer("school_year_days"),
  
  // Data source tracking
  dataSourceVersion: varchar("data_source_version"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("private_school_history_nces_year_idx").on(table.ncesId, table.schoolYear),
]);

export const insertPrivateSchoolHistorySchema = createInsertSchema(privateSchoolHistory).omit({ id: true, createdAt: true });
export type InsertPrivateSchoolHistory = z.infer<typeof insertPrivateSchoolHistorySchema>;
export type PrivateSchoolHistory = typeof privateSchoolHistory.$inferSelect;

// Extended type with computed fields for API responses
export interface PrivateSchoolWithDetails extends PrivateSchool {
  tuitionRange?: string; // e.g., "$25,000 - $45,000"
  gradeRange?: string; // e.g., "Pre-K through 12th Grade"
}

// Helper to format tuition as currency
export function formatTuition(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "Not Available";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper to get tuition range display
export function getTuitionRange(school: PrivateSchool): string {
  const tuitions = [school.tuitionElementary, school.tuitionMiddle, school.tuitionHigh]
    .filter((t): t is number => t !== null && t !== undefined);
  
  if (tuitions.length === 0) return "Contact School";
  
  const min = Math.min(...tuitions);
  const max = Math.max(...tuitions);
  
  if (min === max) return formatTuition(min);
  return `${formatTuition(min)} - ${formatTuition(max)}`;
}

// Helper to get admissions selectivity display
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

// Helper to format grade range
export function getGradeRangeDisplay(school: PrivateSchool): string {
  if (school.gradesOffered) return school.gradesOffered;
  if (school.lowestGrade && school.highestGrade) {
    return `${school.lowestGrade} - ${school.highestGrade}`;
  }
  return "Contact School";
}

// Religious affiliation categories for filtering
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

export type ReligiousAffiliation = typeof RELIGIOUS_AFFILIATIONS[number];

// Program emphasis options
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

export type ProgramEmphasis = typeof PROGRAM_EMPHASIS_OPTIONS[number];

// Helper to get program emphasis display label
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

// ============================================================================
// Neighborhood Safety Index (NYPD complaint data)
// ============================================================================

// Cached NYPD complaint records used to compute the Safety Index for every
// school. We pull the last ~24 months from Socrata (datasets 5uac-w243 + qgea-i56i)
// and compute distances to schools locally instead of issuing 16k+ within_circle
// queries per sync run.
export const nypdComplaints = pgTable("nypd_complaints", {
  cmplntNum: varchar("cmplnt_num").primaryKey(),
  complaintDate: timestamp("complaint_date").notNull(),
  lawCatCd: varchar("law_cat_cd", { length: 20 }), // FELONY | MISDEMEANOR | VIOLATION
  ofnsDesc: varchar("ofns_desc"),                  // e.g. "GRAND LARCENY"
  pdDesc: varchar("pd_desc"),                      // narrower NYPD code
  borough: varchar("borough", { length: 30 }),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
}, (t) => [
  index("nypd_lat_idx").on(t.latitude),
  index("nypd_lng_idx").on(t.longitude),
  index("nypd_date_idx").on(t.complaintDate),
]);

export type NypdComplaint = typeof nypdComplaints.$inferSelect;
export type InsertNypdComplaint = typeof nypdComplaints.$inferInsert;

// Per-school, per-radius safety snapshot. School identity is encoded as
// (school_type, school_key) so the same table covers public, private, and
// NYCEEC sources. One row per (school, radius); upserted on each sync.
export const schoolSafetyIndex = pgTable("school_safety_index", {
  id: serial("id").primaryKey(),
  schoolType: varchar("school_type", { length: 20 }).notNull(), // 'public' | 'private' | 'nyceec'
  schoolKey: varchar("school_key").notNull(),                   // dbn | nces_id | loc_code
  radiusMeters: integer("radius_meters").notNull(),

  // Reporting window
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  // Raw counts
  totalReports: integer("total_reports").notNull().default(0),
  felonyReports: integer("felony_reports").notNull().default(0),
  violentFelonyReports: integer("violent_felony_reports").notNull().default(0),
  misdemeanorReports: integer("misdemeanor_reports").notNull().default(0),
  violationReports: integer("violation_reports").notNull().default(0),

  // Top reported offense categories within the radius
  topCategories: jsonb("top_categories").$type<Array<{ category: string; count: number }>>().notNull().default([]),

  // Severity-weighted incident rate, per square kilometer
  weightedRiskScore: real("weighted_risk_score").notNull().default(0),

  // Parent-facing 0-100 score (higher = safer); derived from citywide percentile
  safetyIndex: integer("safety_index").notNull().default(50),
  percentileCitywide: integer("percentile_citywide"),

  // Comparison to the prior 12 months
  trend: varchar("trend", { length: 20 }), // 'improving' | 'stable' | 'worsening' | 'insufficient_data'
  trendDelta: real("trend_delta"),         // signed % change vs prior period
  priorPeriodTotal: integer("prior_period_total"),

  lastCalculatedAt: timestamp("last_calculated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("safety_school_radius_unique").on(t.schoolType, t.schoolKey, t.radiusMeters),
  index("safety_radius_idx").on(t.radiusMeters),
]);

export type SchoolSafetyIndex = typeof schoolSafetyIndex.$inferSelect;
export type InsertSchoolSafetyIndex = typeof schoolSafetyIndex.$inferInsert;

// Discrete radius buckets in METERS. Keep this list in sync with the
// frontend selector and the sync job.
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

// Severity weights used to compute the weighted_risk_score. Tuned to reflect
// parent perception of incident severity (felony >> misdemeanor >> violation).
export const SAFETY_OFFENSE_WEIGHTS = {
  violentFelony: 8,
  felony: 4,
  misdemeanor: 2,
  violation: 1,
} as const;

// Offense descriptions classified as "violent" felonies (used to flag the
// violent_felony_reports subset). Keys are uppercase NYPD ofns_desc values.
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

// Maps a 0-100 safety index to a parent-friendly label.
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

// API response shape served by GET /api/schools/:schoolKey/safety
export interface SafetyIndexResponse {
  schoolType: 'public' | 'private' | 'nyceec';
  schoolKey: string;
  radiusMeters: number;
  radiusMiles: number;
  periodStart: string;
  periodEnd: string;
  totalReports: number;
  felonyReports: number;
  violentFelonyReports: number;
  misdemeanorReports: number;
  violationReports: number;
  topCategories: Array<{ category: string; count: number }>;
  weightedRiskScore: number;
  safetyIndex: number;
  label: string;
  tone: 'excellent' | 'above_average' | 'average' | 'below_average' | 'elevated';
  percentileCitywide: number | null;
  trend: 'improving' | 'stable' | 'worsening' | 'insufficient_data' | null;
  trendDelta: number | null;
  priorPeriodTotal: number | null;
  lastCalculatedAt: string;
  availableRadii: number[];
}
