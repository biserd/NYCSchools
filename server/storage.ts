import { db } from "./db";
import { users, favorites, schools, type User, type UpsertUser, type Favorite, type InsertFavorite, type School } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  getUserFavorites(userId: string): Promise<Favorite[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, schoolDbn: string): Promise<void>;
  isFavorite(userId: string, schoolDbn: string): Promise<boolean>;
  
  getSchools(): Promise<School[]>;
  getSchool(dbn: string): Promise<School | undefined>;
  upsertSchool(school: School): Promise<School>;
  upsertSchools(schoolList: School[]): Promise<void>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return db.select().from(favorites).where(eq(favorites.userId, userId));
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const [fav] = await db.insert(favorites).values(favorite).returning();
    return fav;
  }

  async removeFavorite(userId: string, schoolDbn: string): Promise<void> {
    await db.delete(favorites).where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.schoolDbn, schoolDbn)
      )
    );
  }

  async isFavorite(userId: string, schoolDbn: string): Promise<boolean> {
    const [fav] = await db.select().from(favorites).where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.schoolDbn, schoolDbn)
      )
    ).limit(1);
    return !!fav;
  }

  async getSchools(): Promise<School[]> {
    return db.select().from(schools);
  }

  async getSchool(dbn: string): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.dbn, dbn)).limit(1);
    return school;
  }

  async upsertSchool(school: School): Promise<School> {
    const [upserted] = await db.insert(schools)
      .values(school)
      .onConflictDoUpdate({
        target: schools.dbn,
        set: {
          name: school.name,
          district: school.district,
          address: school.address,
          grade_band: school.grade_band,
          academics_score: school.academics_score,
          climate_score: school.climate_score,
          progress_score: school.progress_score,
          ela_proficiency: school.ela_proficiency,
          math_proficiency: school.math_proficiency,
          enrollment: school.enrollment,
          student_teacher_ratio: school.student_teacher_ratio,
        }
      })
      .returning();
    return upserted;
  }

  async upsertSchools(schoolList: School[]): Promise<void> {
    if (schoolList.length === 0) return;
    
    await db.insert(schools)
      .values(schoolList)
      .onConflictDoUpdate({
        target: schools.dbn,
        set: {
          name: sql`excluded.name`,
          district: sql`excluded.district`,
          address: sql`excluded.address`,
          grade_band: sql`excluded.grade_band`,
          academics_score: sql`excluded.academics_score`,
          climate_score: sql`excluded.climate_score`,
          progress_score: sql`excluded.progress_score`,
          ela_proficiency: sql`excluded.ela_proficiency`,
          math_proficiency: sql`excluded.math_proficiency`,
          enrollment: sql`excluded.enrollment`,
          student_teacher_ratio: sql`excluded.student_teacher_ratio`,
        }
      });
  }
}

export const storage = new DbStorage();
