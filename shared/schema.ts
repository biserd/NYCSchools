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
  zip_code: varchar("zip_code"), // NYC zip code derived from lat/lng
  
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
  // Check if using placeholder values (50/50 with no real test data)
  const isPlaceholderData = school.ela_proficiency === 50 && school.math_proficiency === 50;
  
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
  // Elementary/Middle with placeholder proficiency data
  return school.ela_proficiency === 50 && school.math_proficiency === 50;
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
  subscriptionPlan: varchar("subscription_plan").default("free"), // 'free', 'season_pass', 'developer'
  subscriptionExpiresAt: timestamp("subscription_expires_at"), // For Season Pass expiration
  freeViewSchoolDbn: varchar("free_view_school_dbn"), // DBN of the one school they can view for free
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
});

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

// Helper to determine competitiveness level based on apps per seat
export function getCompetitivenessLevel(appsPerSeat: number | null): 'very_competitive' | 'competitive' | 'moderate' | 'accessible' | 'unknown' {
  if (appsPerSeat === null) return 'unknown';
  if (appsPerSeat >= 3) return 'very_competitive';
  if (appsPerSeat >= 2) return 'competitive';
  if (appsPerSeat >= 1.2) return 'moderate';
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
