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
  quality_rating_instruction: varchar("quality_rating_instruction"),
  quality_rating_safety: varchar("quality_rating_safety"),
  quality_rating_family: varchar("quality_rating_family"),
  principal_name: varchar("principal_name"),
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

export function calculateOverallScore(school: School): number {
  return Math.round(
    0.4 * school.academics_score +
    0.3 * school.climate_score +
    0.3 * school.progress_score
  );
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return "Outstanding";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Average";
  return "Below Average";
}

export function getScoreColor(score: number): "green" | "yellow" | "red" {
  if (score >= 80) return "green";
  if (score >= 60) return "yellow";
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
