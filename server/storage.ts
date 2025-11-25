import { db } from "./db";
import { users, favorites, schools, reviews, userProfiles, type User, type UpsertUser, type InsertUser, type Favorite, type InsertFavorite, type School, type Review, type InsertReview, type ReviewWithUser, type UserProfile, type InsertUserProfile } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export interface IStorage {
  // User operations for standalone auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  getUserFavorites(userId: string): Promise<Favorite[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, schoolDbn: string): Promise<void>;
  isFavorite(userId: string, schoolDbn: string): Promise<boolean>;
  
  getSchools(): Promise<School[]>;
  getSchool(dbn: string): Promise<School | undefined>;
  upsertSchool(school: School): Promise<School>;
  upsertSchools(schoolList: School[]): Promise<void>;
  
  getReviews(schoolDbn: string): Promise<ReviewWithUser[]>;
  getUserReview(userId: string, schoolDbn: string): Promise<Review | undefined>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, userId: string, rating: number, reviewText?: string): Promise<Review>;
  deleteReview(id: number, userId: string): Promise<void>;
  getSchoolRatingStats(schoolDbn: string): Promise<{ averageRating: number; totalReviews: number }>;
  
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  
  getDistrictAverages(district: number): Promise<DistrictAverages>;
  getAllDistrictAverages(): Promise<Map<number, DistrictAverages>>;
  getCitywideAverages(): Promise<DistrictAverages>;
}

export interface DistrictAverages {
  district: number;
  schoolCount: number;
  overallScore: number;
  academicsScore: number;
  elaProficiency: number;
  mathProficiency: number;
  climateScore: number;
  progressScore: number;
  studentTeacherRatio: number;
  economicNeedIndex: number | null;
  enrollment: number;
  // Demographics
  ellPercent: number | null;
  iepPercent: number | null;
  asianPercent: number | null;
  blackPercent: number | null;
  hispanicPercent: number | null;
  whitePercent: number | null;
  multiRacialPercent: number | null;
  // Survey - Student
  studentSafety: number | null;
  studentTeacherTrust: number | null;
  studentEngagement: number | null;
  // Survey - Teacher
  teacherQuality: number | null;
  teacherCollaboration: number | null;
  teacherLeadership: number | null;
  // Survey - Guardian
  guardianSatisfaction: number | null;
  guardianCommunication: number | null;
  guardianSchoolTrust: number | null;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
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
          economic_need_index: school.economic_need_index,
          attendance_rate: school.attendance_rate,
          teacher_attendance_rate: school.teacher_attendance_rate,
          quality_rating_instruction: school.quality_rating_instruction,
          quality_rating_safety: school.quality_rating_safety,
          quality_rating_family: school.quality_rating_family,
          ell_percent: school.ell_percent,
          iep_percent: school.iep_percent,
          next_level_readiness: school.next_level_readiness,
          admission_method: school.admission_method,
          accountability_status: school.accountability_status,
          principal_name: school.principal_name,
          principal_experience_years: school.principal_experience_years,
          teacher_experience_percent: school.teacher_experience_percent,
          middle_schools_pipeline: school.middle_schools_pipeline,
          website: school.website,
          phone: school.phone,
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
          economic_need_index: sql`excluded.economic_need_index`,
          attendance_rate: sql`excluded.attendance_rate`,
          teacher_attendance_rate: sql`excluded.teacher_attendance_rate`,
          quality_rating_instruction: sql`excluded.quality_rating_instruction`,
          quality_rating_safety: sql`excluded.quality_rating_safety`,
          quality_rating_family: sql`excluded.quality_rating_family`,
          ell_percent: sql`excluded.ell_percent`,
          iep_percent: sql`excluded.iep_percent`,
          asian_percent: sql`excluded.asian_percent`,
          black_percent: sql`excluded.black_percent`,
          hispanic_percent: sql`excluded.hispanic_percent`,
          white_percent: sql`excluded.white_percent`,
          multi_racial_percent: sql`excluded.multi_racial_percent`,
          next_level_readiness: sql`excluded.next_level_readiness`,
          admission_method: sql`excluded.admission_method`,
          accountability_status: sql`excluded.accountability_status`,
          principal_name: sql`excluded.principal_name`,
          principal_experience_years: sql`excluded.principal_experience_years`,
          teacher_experience_percent: sql`excluded.teacher_experience_percent`,
          middle_schools_pipeline: sql`excluded.middle_schools_pipeline`,
          website: sql`excluded.website`,
          phone: sql`excluded.phone`,
        }
      });
  }

  async getReviews(schoolDbn: string): Promise<ReviewWithUser[]> {
    const reviewsWithUsers = await db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        schoolDbn: reviews.schoolDbn,
        rating: reviews.rating,
        reviewText: reviews.reviewText,
        helpfulCount: reviews.helpfulCount,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        }
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.schoolDbn, schoolDbn))
      .orderBy(desc(reviews.createdAt));
    
    return reviewsWithUsers;
  }

  async getUserReview(userId: string, schoolDbn: string): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.schoolDbn, schoolDbn)))
      .limit(1);
    return review;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async updateReview(id: number, userId: string, rating: number, reviewText?: string): Promise<Review> {
    const [updated] = await db
      .update(reviews)
      .set({ 
        rating, 
        reviewText,
        updatedAt: new Date(),
      })
      .where(and(eq(reviews.id, id), eq(reviews.userId, userId)))
      .returning();
    
    if (!updated) {
      throw new Error("Review not found or unauthorized");
    }
    
    return updated;
  }

  async deleteReview(id: number, userId: string): Promise<void> {
    await db
      .delete(reviews)
      .where(and(eq(reviews.id, id), eq(reviews.userId, userId)));
  }

  async getSchoolRatingStats(schoolDbn: string): Promise<{ averageRating: number; totalReviews: number }> {
    const [stats] = await db
      .select({
        averageRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        totalReviews: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(eq(reviews.schoolDbn, schoolDbn));
    
    return {
      averageRating: Math.round((stats?.averageRating || 0) * 10) / 10,
      totalReviews: Number(stats?.totalReviews || 0),
    };
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);
    return profile;
  }

  async upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [userProfile] = await db
      .insert(userProfiles)
      .values(profile)
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          ...profile,
          updatedAt: new Date(),
        },
      })
      .returning();
    return userProfile;
  }

  async getDistrictAverages(district: number): Promise<DistrictAverages> {
    const [stats] = await db
      .select({
        schoolCount: sql<number>`COUNT(*)`,
        elaProficiency: sql<number>`ROUND(AVG(${schools.ela_proficiency}), 1)`,
        mathProficiency: sql<number>`ROUND(AVG(${schools.math_proficiency}), 1)`,
        climateScore: sql<number>`ROUND(AVG(${schools.climate_score}), 1)`,
        progressScore: sql<number>`ROUND(AVG(${schools.progress_score}), 1)`,
        studentTeacherRatio: sql<number>`ROUND(AVG(${schools.student_teacher_ratio}::numeric), 1)`,
        economicNeedIndex: sql<number>`ROUND(AVG(${schools.economic_need_index}), 1)`,
        enrollment: sql<number>`ROUND(AVG(${schools.enrollment}), 0)`,
        // Demographics
        ellPercent: sql<number>`ROUND(AVG(${schools.ell_percent}), 1)`,
        iepPercent: sql<number>`ROUND(AVG(${schools.iep_percent}), 1)`,
        asianPercent: sql<number>`ROUND(AVG(${schools.asian_percent}), 1)`,
        blackPercent: sql<number>`ROUND(AVG(${schools.black_percent}), 1)`,
        hispanicPercent: sql<number>`ROUND(AVG(${schools.hispanic_percent}), 1)`,
        whitePercent: sql<number>`ROUND(AVG(${schools.white_percent}), 1)`,
        multiRacialPercent: sql<number>`ROUND(AVG(${schools.multi_racial_percent}), 1)`,
        // Survey - Student
        studentSafety: sql<number>`ROUND(AVG(${schools.student_safety}), 1)`,
        studentTeacherTrust: sql<number>`ROUND(AVG(${schools.student_teacher_trust}), 1)`,
        studentEngagement: sql<number>`ROUND(AVG(${schools.student_engagement}), 1)`,
        // Survey - Teacher
        teacherQuality: sql<number>`ROUND(AVG(${schools.teacher_quality}), 1)`,
        teacherCollaboration: sql<number>`ROUND(AVG(${schools.teacher_collaboration}), 1)`,
        teacherLeadership: sql<number>`ROUND(AVG(${schools.teacher_leadership}), 1)`,
        // Survey - Guardian
        guardianSatisfaction: sql<number>`ROUND(AVG(${schools.guardian_satisfaction}), 1)`,
        guardianCommunication: sql<number>`ROUND(AVG(${schools.guardian_communication}), 1)`,
        guardianSchoolTrust: sql<number>`ROUND(AVG(${schools.guardian_school_trust}), 1)`,
      })
      .from(schools)
      .where(eq(schools.district, district));
    
    const avgEla = Number(stats?.elaProficiency || 50);
    const avgMath = Number(stats?.mathProficiency || 50);
    const avgClimate = Number(stats?.climateScore || 50);
    const avgProgress = Number(stats?.progressScore || 50);
    
    const testProficiency = (avgEla + avgMath) / 2;
    const academicsScore = Math.round(testProficiency);
    const overallScore = Math.round(testProficiency * 0.4 + avgClimate * 0.3 + avgProgress * 0.3);
    
    return {
      district,
      schoolCount: Number(stats?.schoolCount || 0),
      overallScore,
      academicsScore,
      elaProficiency: avgEla,
      mathProficiency: avgMath,
      climateScore: avgClimate,
      progressScore: avgProgress,
      studentTeacherRatio: Number(stats?.studentTeacherRatio || 15),
      economicNeedIndex: stats?.economicNeedIndex ? Number(stats.economicNeedIndex) : null,
      enrollment: Number(stats?.enrollment || 0),
      // Demographics
      ellPercent: stats?.ellPercent ? Number(stats.ellPercent) : null,
      iepPercent: stats?.iepPercent ? Number(stats.iepPercent) : null,
      asianPercent: stats?.asianPercent ? Number(stats.asianPercent) : null,
      blackPercent: stats?.blackPercent ? Number(stats.blackPercent) : null,
      hispanicPercent: stats?.hispanicPercent ? Number(stats.hispanicPercent) : null,
      whitePercent: stats?.whitePercent ? Number(stats.whitePercent) : null,
      multiRacialPercent: stats?.multiRacialPercent ? Number(stats.multiRacialPercent) : null,
      // Survey - Student
      studentSafety: stats?.studentSafety ? Number(stats.studentSafety) : null,
      studentTeacherTrust: stats?.studentTeacherTrust ? Number(stats.studentTeacherTrust) : null,
      studentEngagement: stats?.studentEngagement ? Number(stats.studentEngagement) : null,
      // Survey - Teacher
      teacherQuality: stats?.teacherQuality ? Number(stats.teacherQuality) : null,
      teacherCollaboration: stats?.teacherCollaboration ? Number(stats.teacherCollaboration) : null,
      teacherLeadership: stats?.teacherLeadership ? Number(stats.teacherLeadership) : null,
      // Survey - Guardian
      guardianSatisfaction: stats?.guardianSatisfaction ? Number(stats.guardianSatisfaction) : null,
      guardianCommunication: stats?.guardianCommunication ? Number(stats.guardianCommunication) : null,
      guardianSchoolTrust: stats?.guardianSchoolTrust ? Number(stats.guardianSchoolTrust) : null,
    };
  }

  async getAllDistrictAverages(): Promise<Map<number, DistrictAverages>> {
    const results = await db
      .select({
        district: schools.district,
        schoolCount: sql<number>`COUNT(*)`,
        elaProficiency: sql<number>`ROUND(AVG(${schools.ela_proficiency}), 1)`,
        mathProficiency: sql<number>`ROUND(AVG(${schools.math_proficiency}), 1)`,
        climateScore: sql<number>`ROUND(AVG(${schools.climate_score}), 1)`,
        progressScore: sql<number>`ROUND(AVG(${schools.progress_score}), 1)`,
        studentTeacherRatio: sql<number>`ROUND(AVG(${schools.student_teacher_ratio}::numeric), 1)`,
        economicNeedIndex: sql<number>`ROUND(AVG(${schools.economic_need_index}), 1)`,
        enrollment: sql<number>`ROUND(AVG(${schools.enrollment}), 0)`,
        // Demographics
        ellPercent: sql<number>`ROUND(AVG(${schools.ell_percent}), 1)`,
        iepPercent: sql<number>`ROUND(AVG(${schools.iep_percent}), 1)`,
        asianPercent: sql<number>`ROUND(AVG(${schools.asian_percent}), 1)`,
        blackPercent: sql<number>`ROUND(AVG(${schools.black_percent}), 1)`,
        hispanicPercent: sql<number>`ROUND(AVG(${schools.hispanic_percent}), 1)`,
        whitePercent: sql<number>`ROUND(AVG(${schools.white_percent}), 1)`,
        multiRacialPercent: sql<number>`ROUND(AVG(${schools.multi_racial_percent}), 1)`,
        // Survey - Student
        studentSafety: sql<number>`ROUND(AVG(${schools.student_safety}), 1)`,
        studentTeacherTrust: sql<number>`ROUND(AVG(${schools.student_teacher_trust}), 1)`,
        studentEngagement: sql<number>`ROUND(AVG(${schools.student_engagement}), 1)`,
        // Survey - Teacher
        teacherQuality: sql<number>`ROUND(AVG(${schools.teacher_quality}), 1)`,
        teacherCollaboration: sql<number>`ROUND(AVG(${schools.teacher_collaboration}), 1)`,
        teacherLeadership: sql<number>`ROUND(AVG(${schools.teacher_leadership}), 1)`,
        // Survey - Guardian
        guardianSatisfaction: sql<number>`ROUND(AVG(${schools.guardian_satisfaction}), 1)`,
        guardianCommunication: sql<number>`ROUND(AVG(${schools.guardian_communication}), 1)`,
        guardianSchoolTrust: sql<number>`ROUND(AVG(${schools.guardian_school_trust}), 1)`,
      })
      .from(schools)
      .groupBy(schools.district);
    
    const averagesMap = new Map<number, DistrictAverages>();
    
    for (const row of results) {
      const avgEla = Number(row.elaProficiency || 50);
      const avgMath = Number(row.mathProficiency || 50);
      const avgClimate = Number(row.climateScore || 50);
      const avgProgress = Number(row.progressScore || 50);
      
      const testProficiency = (avgEla + avgMath) / 2;
      const academicsScore = Math.round(testProficiency);
      const overallScore = Math.round(testProficiency * 0.4 + avgClimate * 0.3 + avgProgress * 0.3);
      
      averagesMap.set(row.district, {
        district: row.district,
        schoolCount: Number(row.schoolCount || 0),
        overallScore,
        academicsScore,
        elaProficiency: avgEla,
        mathProficiency: avgMath,
        climateScore: avgClimate,
        progressScore: avgProgress,
        studentTeacherRatio: Number(row.studentTeacherRatio || 15),
        economicNeedIndex: row.economicNeedIndex ? Number(row.economicNeedIndex) : null,
        enrollment: Number(row.enrollment || 0),
        // Demographics
        ellPercent: row.ellPercent ? Number(row.ellPercent) : null,
        iepPercent: row.iepPercent ? Number(row.iepPercent) : null,
        asianPercent: row.asianPercent ? Number(row.asianPercent) : null,
        blackPercent: row.blackPercent ? Number(row.blackPercent) : null,
        hispanicPercent: row.hispanicPercent ? Number(row.hispanicPercent) : null,
        whitePercent: row.whitePercent ? Number(row.whitePercent) : null,
        multiRacialPercent: row.multiRacialPercent ? Number(row.multiRacialPercent) : null,
        // Survey - Student
        studentSafety: row.studentSafety ? Number(row.studentSafety) : null,
        studentTeacherTrust: row.studentTeacherTrust ? Number(row.studentTeacherTrust) : null,
        studentEngagement: row.studentEngagement ? Number(row.studentEngagement) : null,
        // Survey - Teacher
        teacherQuality: row.teacherQuality ? Number(row.teacherQuality) : null,
        teacherCollaboration: row.teacherCollaboration ? Number(row.teacherCollaboration) : null,
        teacherLeadership: row.teacherLeadership ? Number(row.teacherLeadership) : null,
        // Survey - Guardian
        guardianSatisfaction: row.guardianSatisfaction ? Number(row.guardianSatisfaction) : null,
        guardianCommunication: row.guardianCommunication ? Number(row.guardianCommunication) : null,
        guardianSchoolTrust: row.guardianSchoolTrust ? Number(row.guardianSchoolTrust) : null,
      });
    }
    
    return averagesMap;
  }

  async getCitywideAverages(): Promise<DistrictAverages> {
    const [stats] = await db
      .select({
        schoolCount: sql<number>`COUNT(*)`,
        elaProficiency: sql<number>`ROUND(AVG(${schools.ela_proficiency}), 1)`,
        mathProficiency: sql<number>`ROUND(AVG(${schools.math_proficiency}), 1)`,
        climateScore: sql<number>`ROUND(AVG(${schools.climate_score}), 1)`,
        progressScore: sql<number>`ROUND(AVG(${schools.progress_score}), 1)`,
        studentTeacherRatio: sql<number>`ROUND(AVG(${schools.student_teacher_ratio}::numeric), 1)`,
        economicNeedIndex: sql<number>`ROUND(AVG(${schools.economic_need_index}), 1)`,
        enrollment: sql<number>`ROUND(AVG(${schools.enrollment}), 0)`,
        // Demographics
        ellPercent: sql<number>`ROUND(AVG(${schools.ell_percent}), 1)`,
        iepPercent: sql<number>`ROUND(AVG(${schools.iep_percent}), 1)`,
        asianPercent: sql<number>`ROUND(AVG(${schools.asian_percent}), 1)`,
        blackPercent: sql<number>`ROUND(AVG(${schools.black_percent}), 1)`,
        hispanicPercent: sql<number>`ROUND(AVG(${schools.hispanic_percent}), 1)`,
        whitePercent: sql<number>`ROUND(AVG(${schools.white_percent}), 1)`,
        multiRacialPercent: sql<number>`ROUND(AVG(${schools.multi_racial_percent}), 1)`,
        // Survey - Student
        studentSafety: sql<number>`ROUND(AVG(${schools.student_safety}), 1)`,
        studentTeacherTrust: sql<number>`ROUND(AVG(${schools.student_teacher_trust}), 1)`,
        studentEngagement: sql<number>`ROUND(AVG(${schools.student_engagement}), 1)`,
        // Survey - Teacher
        teacherQuality: sql<number>`ROUND(AVG(${schools.teacher_quality}), 1)`,
        teacherCollaboration: sql<number>`ROUND(AVG(${schools.teacher_collaboration}), 1)`,
        teacherLeadership: sql<number>`ROUND(AVG(${schools.teacher_leadership}), 1)`,
        // Survey - Guardian
        guardianSatisfaction: sql<number>`ROUND(AVG(${schools.guardian_satisfaction}), 1)`,
        guardianCommunication: sql<number>`ROUND(AVG(${schools.guardian_communication}), 1)`,
        guardianSchoolTrust: sql<number>`ROUND(AVG(${schools.guardian_school_trust}), 1)`,
      })
      .from(schools);
    
    const avgEla = Number(stats?.elaProficiency || 50);
    const avgMath = Number(stats?.mathProficiency || 50);
    const avgClimate = Number(stats?.climateScore || 50);
    const avgProgress = Number(stats?.progressScore || 50);
    
    const testProficiency = (avgEla + avgMath) / 2;
    const academicsScore = Math.round(testProficiency);
    const overallScore = Math.round(testProficiency * 0.4 + avgClimate * 0.3 + avgProgress * 0.3);
    
    return {
      district: 0,
      schoolCount: Number(stats?.schoolCount || 0),
      overallScore,
      academicsScore,
      elaProficiency: avgEla,
      mathProficiency: avgMath,
      climateScore: avgClimate,
      progressScore: avgProgress,
      studentTeacherRatio: Number(stats?.studentTeacherRatio || 15),
      economicNeedIndex: stats?.economicNeedIndex ? Number(stats.economicNeedIndex) : null,
      enrollment: Number(stats?.enrollment || 0),
      // Demographics
      ellPercent: stats?.ellPercent ? Number(stats.ellPercent) : null,
      iepPercent: stats?.iepPercent ? Number(stats.iepPercent) : null,
      asianPercent: stats?.asianPercent ? Number(stats.asianPercent) : null,
      blackPercent: stats?.blackPercent ? Number(stats.blackPercent) : null,
      hispanicPercent: stats?.hispanicPercent ? Number(stats.hispanicPercent) : null,
      whitePercent: stats?.whitePercent ? Number(stats.whitePercent) : null,
      multiRacialPercent: stats?.multiRacialPercent ? Number(stats.multiRacialPercent) : null,
      // Survey - Student
      studentSafety: stats?.studentSafety ? Number(stats.studentSafety) : null,
      studentTeacherTrust: stats?.studentTeacherTrust ? Number(stats.studentTeacherTrust) : null,
      studentEngagement: stats?.studentEngagement ? Number(stats.studentEngagement) : null,
      // Survey - Teacher
      teacherQuality: stats?.teacherQuality ? Number(stats.teacherQuality) : null,
      teacherCollaboration: stats?.teacherCollaboration ? Number(stats.teacherCollaboration) : null,
      teacherLeadership: stats?.teacherLeadership ? Number(stats.teacherLeadership) : null,
      // Survey - Guardian
      guardianSatisfaction: stats?.guardianSatisfaction ? Number(stats.guardianSatisfaction) : null,
      guardianCommunication: stats?.guardianCommunication ? Number(stats.guardianCommunication) : null,
      guardianSchoolTrust: stats?.guardianSchoolTrust ? Number(stats.guardianSchoolTrust) : null,
    };
  }
}

export const storage = new DbStorage();
