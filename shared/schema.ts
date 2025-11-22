import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const schools = pgTable("schools", {
  dbn: varchar("dbn").primaryKey(),
  name: text("name").notNull(),
  district: integer("district").notNull(),
  address: text("address").notNull(),
  grade_band: varchar("grade_band").notNull(),
  academics_score: integer("academics_score").notNull(),
  climate_score: integer("climate_score").notNull(),
  progress_score: integer("progress_score").notNull(),
  ela_proficiency: integer("ela_proficiency").notNull(),
  math_proficiency: integer("math_proficiency").notNull(),
  enrollment: integer("enrollment").notNull(),
  student_teacher_ratio: real("student_teacher_ratio").notNull(),
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
