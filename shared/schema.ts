import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, serial, timestamp, index, jsonb, boolean } from "drizzle-orm/pg-core";
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
  ela_proficiency: integer("ela_proficiency").notNull(),
  math_proficiency: integer("math_proficiency").notNull(),
  
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
  
  // Early Childhood Programs
  has_3k: boolean("has_3k").default(false),
  has_prek: boolean("has_prek").default(false),
  
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
});

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
  if (isHighSchool(school) && school.graduation_rate_4yr !== null && school.graduation_rate_4yr !== undefined) {
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
  
  // Elementary/Middle schools use test proficiency
  // Calculate test proficiency as average of ELA and Math
  const testProficiency = (school.ela_proficiency + school.math_proficiency) / 2;
  
  // Overall Score = Test Proficiency (40%) + Climate (30%) + Progress (30%)
  return Math.round(
    0.4 * testProficiency +
    0.3 * school.climate_score +
    0.3 * school.progress_score
  );
}

export function getScoreLabel(score: number): string {
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

export function getScoreColor(score: number): "green" | "yellow" | "amber" | "red" {
  if (score >= 90) return "green";
  if (score >= 80) return "yellow";
  if (score >= 70) return "amber";
  return "red";
}

// Get color for individual metrics (ELA, Math, Climate, Progress)
export function getMetricColor(score: number): "green" | "yellow" | "amber" | "red" {
  if (score >= 90) return "green";
  if (score >= 80) return "yellow";
  if (score >= 70) return "amber";
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  profileImageUrl: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolDbn: varchar("school_dbn").notNull().references(() => schools.dbn, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

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
  reviewText: z.string().optional(),
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
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  updatedAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

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
