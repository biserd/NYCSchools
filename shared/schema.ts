import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, serial, timestamp, index, jsonb } from "drizzle-orm/pg-core";
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
  
  // NYC DOE Snapshot Data
  economic_need_index: integer("economic_need_index"),
  attendance_rate: integer("attendance_rate"),
  teacher_attendance_rate: integer("teacher_attendance_rate"),
  quality_rating_instruction: varchar("quality_rating_instruction"),
  quality_rating_safety: varchar("quality_rating_safety"),
  quality_rating_family: varchar("quality_rating_family"),
  ell_percent: integer("ell_percent"),
  iep_percent: integer("iep_percent"),
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
  
  // Metadata
  last_updated: timestamp("last_updated").defaultNow(),
});

export const insertSchoolSchema = createInsertSchema(schools);

export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;

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

export function calculateOverallScore(school: School): number {
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

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
