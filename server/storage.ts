import { db } from "./db";
import { users, favorites, schools, reviews, userProfiles, aiChatSessions, aiChatMessages, schoolHistoricalScores, hsGraduation, hsRegents, nyceecCenters, nyceecReviews, nyceecAiInsights, trackedSchools, passwordResetTokens, admissionsMetrics, magicLinkTokens, processedWebhookEvents, privateSchools, privateSchoolHistory, apiKeys, apiKeyRateState, apiRequestLog, apiAbuseAlerts, type User, type UpsertUser, type InsertUser, type Favorite, type InsertFavorite, type School, type Review, type InsertReview, type ReviewWithUser, type UserProfile, type InsertUserProfile, type AiChatSession, type InsertAiChatSession, type AiChatMessage, type InsertAiChatMessage, type AiChatSessionWithMessages, type HistoricalScore, type SchoolTrend, calculateTrend, type NyceecCenter, type InsertNyceecCenter, type NyceecReview, type InsertNyceecReview, type NyceecReviewWithUser, type NyceecAiInsight, type InsertNyceecAiInsight, type TrackedSchool, type InsertTrackedSchool, type AdmissionsMetrics, type MagicLinkToken, type ProcessedWebhookEvent, type PrivateSchool, type InsertPrivateSchool, type PrivateSchoolHistory, type InsertPrivateSchoolHistory, type HsGraduation, type InsertHsGraduation, type HsRegents, type InsertHsRegents, schoolAttendance, type SchoolAttendance, schoolDiscipline, type SchoolDiscipline, hsAdmissionsProgram, type HsAdmissionsProgram, type ApiKey, type InsertApiKey, type ApiKeyRateState, type InsertApiRequestLog, type InsertApiAbuseAlert } from "@shared/schema";
import { eq, and, sql, desc, asc, like, or, ilike, gte, isNotNull, inArray, lt } from "drizzle-orm";

export interface IStorage {
  // User operations for standalone auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string | null;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
    subscriptionExpiresAt?: Date | null;
  }): Promise<User | undefined>;
  
  getUserFavorites(userId: string): Promise<Favorite[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, schoolDbn: string): Promise<void>;
  isFavorite(userId: string, schoolDbn: string): Promise<boolean>;
  getFavoriteStatusBatch(userId: string, schoolDbns: string[]): Promise<Record<string, boolean>>;
  
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
  
  // AI Chat operations
  createChatSession(session: InsertAiChatSession): Promise<AiChatSession>;
  getChatSession(sessionId: number): Promise<AiChatSession | undefined>;
  getUserChatSessions(userId: string): Promise<AiChatSession[]>;
  updateChatSessionTitle(sessionId: number, title: string): Promise<void>;
  deleteChatSession(sessionId: number): Promise<void>;
  
  addChatMessage(message: InsertAiChatMessage): Promise<AiChatMessage>;
  getChatMessages(sessionId: number): Promise<AiChatMessage[]>;
  getChatSessionWithMessages(sessionId: number): Promise<AiChatSessionWithMessages | undefined>;
  getUserDailyQuestionCount(userId: string): Promise<number>;
  
  // Historical scores operations
  getSchoolHistoricalScores(dbn: string): Promise<HistoricalScore[]>;
  getSchoolTrend(dbn: string): Promise<SchoolTrend>;
  getAllSchoolTrends(): Promise<Map<string, SchoolTrend>>;
  
  // NYCEEC Center operations
  getNyceecCenters(filters?: NyceecFilters): Promise<NyceecCenter[]>;
  getNyceecCenter(locCode: string): Promise<NyceecCenter | undefined>;
  upsertNyceecCenter(center: InsertNyceecCenter): Promise<NyceecCenter>;
  upsertNyceecCenters(centers: InsertNyceecCenter[]): Promise<void>;
  
  // NYCEEC Reviews
  getNyceecReviews(locCode: string): Promise<NyceecReviewWithUser[]>;
  getUserNyceecReview(userId: string, locCode: string): Promise<NyceecReview | undefined>;
  createNyceecReview(review: InsertNyceecReview): Promise<NyceecReview>;
  updateNyceecReview(id: number, userId: string, rating: number, reviewText?: string): Promise<NyceecReview>;
  deleteNyceecReview(id: number, userId: string): Promise<void>;
  getNyceecRatingStats(locCode: string): Promise<{ averageRating: number; totalReviews: number }>;
  
  // NYCEEC AI Insights Cache
  getNyceecAiInsight(locCode: string): Promise<NyceecAiInsight | undefined>;
  saveNyceecAiInsight(insight: InsertNyceecAiInsight): Promise<NyceecAiInsight>;
  
  // Application Tracker (Tracked Schools) operations
  getUserTrackedSchools(userId: string): Promise<TrackedSchool[]>;
  getTrackedSchool(userId: string, schoolDbn: string): Promise<TrackedSchool | undefined>;
  addTrackedSchool(trackedSchool: InsertTrackedSchool): Promise<TrackedSchool>;
  updateTrackedSchool(id: number, userId: string, updates: Partial<InsertTrackedSchool>): Promise<TrackedSchool | undefined>;
  removeTrackedSchool(userId: string, schoolDbn: string): Promise<void>;
  getTrackedSchoolsNeedingNotification(reminderHours: number): Promise<TrackedSchool[]>;
  
  // Blog data
  getCovidRecoveryBlogData(): Promise<CovidRecoveryBlogData>;
  
  // Password Reset Token operations
  createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findPasswordResetToken(tokenHash: string): Promise<{ id: number; userId: string; expiresAt: Date; usedAt: Date | null } | undefined>;
  markPasswordResetTokenUsed(id: number): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  
  // Free School View operations
  getUserFreeViewSchool(userId: string): Promise<string | null>;
  setUserFreeViewSchool(userId: string, schoolDbn: string): Promise<void>;
  
  // Admissions Data operations
  getSchoolAdmissionsMetrics(dbn: string): Promise<AdmissionsMetrics[]>;
  
  // Magic Link Token operations (passwordless auth)
  createMagicLinkToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findMagicLinkToken(tokenHash: string): Promise<{ id: number; userId: string; expiresAt: Date; usedAt: Date | null } | undefined>;
  markMagicLinkTokenUsed(id: number): Promise<void>;
  deleteExpiredMagicLinkTokens(): Promise<void>;
  
  // Webhook idempotency operations
  isWebhookEventProcessed(eventId: string): Promise<boolean>;
  markWebhookEventProcessed(eventId: string, eventType: string): Promise<void>;
  
  // Guest user creation (for checkout without registration)
  createGuestUser(email: string, stripeCustomerId: string, firstName?: string, lastName?: string): Promise<User>;
  
  // Private School operations
  getPrivateSchools(filters?: PrivateSchoolFilters): Promise<PrivateSchool[]>;
  getPrivateSchool(ncesId: string): Promise<PrivateSchool | undefined>;
  upsertPrivateSchool(school: InsertPrivateSchool): Promise<PrivateSchool>;
  upsertPrivateSchools(schools: InsertPrivateSchool[]): Promise<void>;
  getPrivateSchoolHistory(ncesId: string): Promise<PrivateSchoolHistory[]>;
  upsertPrivateSchoolHistory(history: InsertPrivateSchoolHistory): Promise<PrivateSchoolHistory>;

  // High School Performance operations
  getHSGraduation(dbn: string): Promise<HsGraduation[]>;
  getHSRegents(dbn: string): Promise<HsRegents[]>;
  
  // Attendance operations
  getSchoolAttendance(dbn: string): Promise<SchoolAttendance[]>;
  
  // Discipline operations
  getSchoolDiscipline(dbn: string): Promise<SchoolDiscipline[]>;
  
  // HS Admissions operations
  getHsAdmissionsPrograms(dbn: string): Promise<HsAdmissionsProgram[]>;

  // API Keys (Developer API - Premium feature)
  createApiKey(data: InsertApiKey): Promise<ApiKey>;
  listApiKeysForUser(userId: string): Promise<ApiKey[]>;
  findApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  touchApiKeyLastUsed(id: number): Promise<void>;
  revokeApiKey(id: number, userId: string): Promise<ApiKey | undefined>;

  // API observability (rate limit + audit log + abuse alerts)
  incrementApiRateState(keyId: number, now: Date): Promise<ApiKeyRateState>;
  insertApiRequestLogs(rows: InsertApiRequestLog[]): Promise<void>;
  pruneApiRequestLogs(olderThan: Date): Promise<number>;
  countRecentRateLimitHits(keyId: number, sinceTs: Date): Promise<number>;
  countDistinctIpsForKey(keyId: number, sinceTs: Date): Promise<number>;
  recordAbuseAlert(data: InsertApiAbuseAlert): Promise<boolean>;
  pruneAbuseAlerts(olderThan: Date): Promise<number>;
  // Admin observability queries
  listAllApiKeysWithUsers(): Promise<Array<ApiKey & { ownerEmail: string | null }>>;
  getApiKeyUsageSummary(keyId: number, sinceTs: Date): Promise<{ total: number; errors429: number; distinctIps: number }>;
  listTopApiKeysByVolume(sinceTs: Date, limit: number): Promise<Array<{ keyId: number; total: number }>>;
  listRecentRateLimitHits(limit: number): Promise<Array<{ keyId: number | null; path: string; ts: Date; ip: string | null }>>;
  listRecentRequestsForKey(keyId: number, limit: number): Promise<Array<{ path: string; status: number; ts: Date; ip: string | null; responseTimeMs: number | null }>>;
  listRecentIpsForKey(keyId: number, sinceTs: Date): Promise<Array<{ ip: string; count: number; lastSeen: Date }>>;
  countRequestsByPathForKey(keyId: number, sinceTs: Date): Promise<Array<{ path: string; count: number }>>;
  adminRevokeApiKey(id: number): Promise<ApiKey | undefined>;
}

export interface NyceecFilters {
  borough?: string;
  district?: number;
  centerType?: string;
  zipCode?: string;
  search?: string;
}

export interface PrivateSchoolFilters {
  borough?: string;
  zipCode?: string;
  religiousAffiliation?: string;
  gradesOffered?: string;
  coedStatus?: string;
  hasFinancialAid?: boolean;
  search?: string;
  programEmphasis?: string;
  minTuition?: number;
  maxTuition?: number;
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

export interface CovidRecoveryBlogData {
  citywideYearlyTrends: Array<{
    year: number;
    schoolCount: number;
    avgEla: number;
    avgMath: number;
  }>;
  districtRecovery: Array<{
    district: number;
    ela2022: number;
    ela2025: number;
    elaChange: number;
    math2022: number;
    math2025: number;
    mathChange: number;
    avgChange: number;
  }>;
  topImprovedSchools: Array<{
    name: string;
    dbn: string;
    borough: string;
    ela2022: number;
    ela2025: number;
    elaChange: number;
    math2022: number;
    math2025: number;
    mathChange: number;
    totalChange: number;
  }>;
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

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId)).limit(1);
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

  async updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string | null;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
    subscriptionExpiresAt?: Date | null;
  }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...stripeInfo, updatedAt: new Date() })
      .where(eq(users.id, userId))
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

  async getFavoriteStatusBatch(userId: string, schoolDbns: string[]): Promise<Record<string, boolean>> {
    if (!schoolDbns.length) return {};
    
    const userFavorites = await db.select({ schoolDbn: favorites.schoolDbn })
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          inArray(favorites.schoolDbn, schoolDbns)
        )
      );
    
    const favoriteSet = new Set(userFavorites.map(f => f.schoolDbn));
    const result: Record<string, boolean> = {};
    for (const dbn of schoolDbns) {
      result[dbn] = favoriteSet.has(dbn);
    }
    return result;
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

  // AI Chat Session operations
  async createChatSession(session: InsertAiChatSession): Promise<AiChatSession> {
    const [created] = await db.insert(aiChatSessions).values(session).returning();
    return created;
  }

  async getChatSession(sessionId: number): Promise<AiChatSession | undefined> {
    const [session] = await db
      .select()
      .from(aiChatSessions)
      .where(eq(aiChatSessions.id, sessionId))
      .limit(1);
    return session;
  }

  async getUserChatSessions(userId: string): Promise<AiChatSession[]> {
    return db
      .select()
      .from(aiChatSessions)
      .where(eq(aiChatSessions.userId, userId))
      .orderBy(desc(aiChatSessions.updatedAt));
  }

  async updateChatSessionTitle(sessionId: number, title: string): Promise<void> {
    await db
      .update(aiChatSessions)
      .set({ title, updatedAt: new Date() })
      .where(eq(aiChatSessions.id, sessionId));
  }

  async deleteChatSession(sessionId: number): Promise<void> {
    await db.delete(aiChatSessions).where(eq(aiChatSessions.id, sessionId));
  }

  // AI Chat Message operations
  async addChatMessage(message: InsertAiChatMessage): Promise<AiChatMessage> {
    const [created] = await db.insert(aiChatMessages).values(message).returning();
    // Also update the session's updatedAt timestamp
    await db
      .update(aiChatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(aiChatSessions.id, message.sessionId));
    return created;
  }

  async getChatMessages(sessionId: number): Promise<AiChatMessage[]> {
    return db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId))
      .orderBy(aiChatMessages.createdAt);
  }

  async getChatSessionWithMessages(sessionId: number): Promise<AiChatSessionWithMessages | undefined> {
    const session = await this.getChatSession(sessionId);
    if (!session) return undefined;
    
    const messages = await this.getChatMessages(sessionId);
    return { ...session, messages };
  }

  async getUserDailyQuestionCount(userId: string): Promise<number> {
    // Count user messages from today (only 'user' role messages are questions)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiChatMessages)
      .innerJoin(aiChatSessions, eq(aiChatMessages.sessionId, aiChatSessions.id))
      .where(
        and(
          eq(aiChatSessions.userId, userId),
          eq(aiChatMessages.role, 'user'),
          gte(aiChatMessages.createdAt, today)
        )
      );
    
    return Number(result[0]?.count ?? 0);
  }

  // Historical Scores operations
  async getSchoolHistoricalScores(dbn: string): Promise<HistoricalScore[]> {
    return db
      .select()
      .from(schoolHistoricalScores)
      .where(eq(schoolHistoricalScores.dbn, dbn.toUpperCase()))
      .orderBy(asc(schoolHistoricalScores.year));
  }

  async getSchoolTrend(dbn: string): Promise<SchoolTrend> {
    const scores = await this.getSchoolHistoricalScores(dbn);
    return calculateTrend(scores);
  }

  async getAllSchoolTrends(): Promise<Map<string, SchoolTrend>> {
    const allScores = await db.select().from(schoolHistoricalScores);
    
    // Group scores by DBN
    const scoresByDbn = new Map<string, HistoricalScore[]>();
    for (const score of allScores) {
      const existing = scoresByDbn.get(score.dbn) || [];
      existing.push(score);
      scoresByDbn.set(score.dbn, existing);
    }

    // Calculate trends for each school
    const trends = new Map<string, SchoolTrend>();
    for (const [dbn, scores] of scoresByDbn) {
      trends.set(dbn, calculateTrend(scores));
    }
    
    return trends;
  }

  // NYCEEC Center operations
  async getNyceecCenters(filters?: NyceecFilters): Promise<NyceecCenter[]> {
    let query = db.select().from(nyceecCenters);
    
    const conditions = [];
    
    if (filters?.borough) {
      conditions.push(eq(nyceecCenters.borough, filters.borough.toUpperCase()));
    }
    
    if (filters?.district) {
      conditions.push(eq(nyceecCenters.district, filters.district));
    }
    
    if (filters?.centerType) {
      conditions.push(eq(nyceecCenters.centerType, filters.centerType));
    }
    
    if (filters?.zipCode) {
      conditions.push(eq(nyceecCenters.zipCode, filters.zipCode));
    }
    
    if (filters?.search) {
      conditions.push(
        or(
          ilike(nyceecCenters.name, `%${filters.search}%`),
          ilike(nyceecCenters.address, `%${filters.search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      return db.select().from(nyceecCenters).where(and(...conditions)).orderBy(nyceecCenters.name);
    }
    
    return db.select().from(nyceecCenters).orderBy(nyceecCenters.name);
  }

  async getNyceecCenter(locCode: string): Promise<NyceecCenter | undefined> {
    const [center] = await db
      .select()
      .from(nyceecCenters)
      .where(eq(nyceecCenters.locCode, locCode.toUpperCase()))
      .limit(1);
    return center;
  }

  async upsertNyceecCenter(center: InsertNyceecCenter): Promise<NyceecCenter> {
    const [upserted] = await db
      .insert(nyceecCenters)
      .values(center)
      .onConflictDoUpdate({
        target: nyceecCenters.locCode,
        set: {
          ...center,
          lastUpdated: new Date(),
        },
      })
      .returning();
    return upserted;
  }

  async upsertNyceecCenters(centers: InsertNyceecCenter[]): Promise<void> {
    if (centers.length === 0) return;
    
    // Batch upsert in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < centers.length; i += chunkSize) {
      const chunk = centers.slice(i, i + chunkSize);
      await db
        .insert(nyceecCenters)
        .values(chunk)
        .onConflictDoUpdate({
          target: nyceecCenters.locCode,
          set: {
            name: sql`EXCLUDED.name`,
            centerType: sql`EXCLUDED.center_type`,
            borough: sql`EXCLUDED.borough`,
            district: sql`EXCLUDED.district`,
            address: sql`EXCLUDED.address`,
            zipCode: sql`EXCLUDED.zip_code`,
            latitude: sql`EXCLUDED.latitude`,
            longitude: sql`EXCLUDED.longitude`,
            nta: sql`EXCLUDED.nta`,
            phone: sql`EXCLUDED.phone`,
            email: sql`EXCLUDED.email`,
            website: sql`EXCLUDED.website`,
            seats: sql`EXCLUDED.seats`,
            dayLength: sql`EXCLUDED.day_length`,
            extendedDay: sql`EXCLUDED.extended_day`,
            mealsProvided: sql`EXCLUDED.meals_provided`,
            indoorOutdoor: sql`EXCLUDED.indoor_outdoor`,
            semsCode: sql`EXCLUDED.sems_code`,
            communityBoard: sql`EXCLUDED.community_board`,
            councilDistrict: sql`EXCLUDED.council_district`,
            lastUpdated: new Date(),
          },
        });
    }
  }
  
  // NYCEEC Reviews implementation
  async getNyceecReviews(locCode: string): Promise<NyceecReviewWithUser[]> {
    const reviewsData = await db
      .select({
        id: nyceecReviews.id,
        userId: nyceecReviews.userId,
        locCode: nyceecReviews.locCode,
        rating: nyceecReviews.rating,
        reviewText: nyceecReviews.reviewText,
        helpfulCount: nyceecReviews.helpfulCount,
        createdAt: nyceecReviews.createdAt,
        updatedAt: nyceecReviews.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userProfileImage: users.profileImageUrl,
      })
      .from(nyceecReviews)
      .leftJoin(users, eq(nyceecReviews.userId, users.id))
      .where(eq(nyceecReviews.locCode, locCode))
      .orderBy(desc(nyceecReviews.createdAt));
    
    return reviewsData.map(r => ({
      id: r.id,
      userId: r.userId,
      locCode: r.locCode,
      rating: r.rating,
      reviewText: r.reviewText,
      helpfulCount: r.helpfulCount,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: {
        firstName: r.userFirstName,
        lastName: r.userLastName,
        profileImageUrl: r.userProfileImage,
      },
    }));
  }
  
  async getUserNyceecReview(userId: string, locCode: string): Promise<NyceecReview | undefined> {
    const [review] = await db
      .select()
      .from(nyceecReviews)
      .where(and(eq(nyceecReviews.userId, userId), eq(nyceecReviews.locCode, locCode)));
    return review;
  }
  
  async createNyceecReview(review: InsertNyceecReview): Promise<NyceecReview> {
    const [created] = await db.insert(nyceecReviews).values(review).returning();
    return created;
  }
  
  async updateNyceecReview(id: number, userId: string, rating: number, reviewText?: string): Promise<NyceecReview> {
    const [updated] = await db
      .update(nyceecReviews)
      .set({
        rating,
        reviewText,
        updatedAt: new Date(),
      })
      .where(and(eq(nyceecReviews.id, id), eq(nyceecReviews.userId, userId)))
      .returning();
    return updated;
  }
  
  async deleteNyceecReview(id: number, userId: string): Promise<void> {
    await db
      .delete(nyceecReviews)
      .where(and(eq(nyceecReviews.id, id), eq(nyceecReviews.userId, userId)));
  }
  
  async getNyceecRatingStats(locCode: string): Promise<{ averageRating: number; totalReviews: number }> {
    const result = await db
      .select({
        avgRating: sql<number>`COALESCE(AVG(${nyceecReviews.rating}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(nyceecReviews)
      .where(eq(nyceecReviews.locCode, locCode));
    
    return {
      averageRating: Number(result[0]?.avgRating) || 0,
      totalReviews: Number(result[0]?.count) || 0,
    };
  }
  
  async getNyceecAiInsight(locCode: string): Promise<NyceecAiInsight | undefined> {
    const [insight] = await db
      .select()
      .from(nyceecAiInsights)
      .where(eq(nyceecAiInsights.locCode, locCode))
      .limit(1);
    return insight;
  }
  
  async saveNyceecAiInsight(insight: InsertNyceecAiInsight): Promise<NyceecAiInsight> {
    const [saved] = await db
      .insert(nyceecAiInsights)
      .values(insight)
      .onConflictDoUpdate({
        target: nyceecAiInsights.locCode,
        set: {
          overview: insight.overview,
          considerations: insight.considerations,
          tourQuestions: insight.tourQuestions,
          neighborhoodContext: insight.neighborhoodContext,
          createdAt: sql`now()`,
        },
      })
      .returning();
    return saved;
  }

  async getCovidRecoveryBlogData(): Promise<CovidRecoveryBlogData> {
    // Get citywide yearly trends using raw SQL
    const citywideResult = await db.execute(sql`
      SELECT 
        year,
        COUNT(*) as school_count,
        ROUND(AVG(ela_proficiency)::numeric, 1) as avg_ela,
        ROUND(AVG(math_proficiency)::numeric, 1) as avg_math
      FROM school_historical_scores
      WHERE ela_proficiency IS NOT NULL AND math_proficiency IS NOT NULL
      GROUP BY year
      ORDER BY year
    `);

    // Get district recovery data (2022 vs 2025)
    const districtRecoveryResult = await db.execute(sql`
      WITH district_2022 AS (
        SELECT 
          CAST(SUBSTRING(dbn, 1, 2) AS integer) as district,
          AVG(ela_proficiency) as ela_2022,
          AVG(math_proficiency) as math_2022
        FROM school_historical_scores
        WHERE year = 2022 AND ela_proficiency IS NOT NULL AND math_proficiency IS NOT NULL
        GROUP BY SUBSTRING(dbn, 1, 2)
      ),
      district_2025 AS (
        SELECT 
          CAST(SUBSTRING(dbn, 1, 2) AS integer) as district,
          AVG(ela_proficiency) as ela_2025,
          AVG(math_proficiency) as math_2025
        FROM school_historical_scores
        WHERE year = 2025 AND ela_proficiency IS NOT NULL AND math_proficiency IS NOT NULL
        GROUP BY SUBSTRING(dbn, 1, 2)
      )
      SELECT 
        d22.district,
        ROUND(d22.ela_2022::numeric, 1) as ela_2022,
        ROUND(d25.ela_2025::numeric, 1) as ela_2025,
        ROUND((d25.ela_2025 - d22.ela_2022)::numeric, 1) as ela_change,
        ROUND(d22.math_2022::numeric, 1) as math_2022,
        ROUND(d25.math_2025::numeric, 1) as math_2025,
        ROUND((d25.math_2025 - d22.math_2022)::numeric, 1) as math_change,
        ROUND(((d25.ela_2025 - d22.ela_2022 + d25.math_2025 - d22.math_2022) / 2)::numeric, 1) as avg_change
      FROM district_2022 d22
      JOIN district_2025 d25 ON d22.district = d25.district
      ORDER BY (d25.ela_2025 - d22.ela_2022 + d25.math_2025 - d22.math_2022) DESC
    `);

    // Get top 10 most improved schools
    const topSchoolsResult = await db.execute(sql`
      WITH school_2022 AS (
        SELECT dbn, ela_proficiency as ela_2022, math_proficiency as math_2022
        FROM school_historical_scores
        WHERE year = 2022 AND ela_proficiency IS NOT NULL AND math_proficiency IS NOT NULL
      ),
      school_2025 AS (
        SELECT dbn, ela_proficiency as ela_2025, math_proficiency as math_2025
        FROM school_historical_scores
        WHERE year = 2025 AND ela_proficiency IS NOT NULL AND math_proficiency IS NOT NULL
      )
      SELECT 
        s.name,
        s.dbn,
        SUBSTRING(s.dbn, 3, 1) as borough,
        s22.ela_2022,
        s25.ela_2025,
        (s25.ela_2025 - s22.ela_2022) as ela_change,
        s22.math_2022,
        s25.math_2025,
        (s25.math_2025 - s22.math_2022) as math_change,
        (s25.ela_2025 - s22.ela_2022 + s25.math_2025 - s22.math_2022) as total_change
      FROM schools s
      JOIN school_2022 s22 ON s.dbn = s22.dbn
      JOIN school_2025 s25 ON s.dbn = s25.dbn
      WHERE s22.ela_2022 >= 20 AND s22.math_2022 >= 20
      ORDER BY (s25.ela_2025 - s22.ela_2022 + s25.math_2025 - s22.math_2022) DESC
      LIMIT 10
    `);

    return {
      citywideYearlyTrends: (citywideResult.rows as any[]).map(r => ({
        year: Number(r.year),
        schoolCount: Number(r.school_count),
        avgEla: Number(r.avg_ela),
        avgMath: Number(r.avg_math),
      })),
      districtRecovery: (districtRecoveryResult.rows as any[]).map(r => ({
        district: Number(r.district),
        ela2022: Number(r.ela_2022),
        ela2025: Number(r.ela_2025),
        elaChange: Number(r.ela_change),
        math2022: Number(r.math_2022),
        math2025: Number(r.math_2025),
        mathChange: Number(r.math_change),
        avgChange: Number(r.avg_change),
      })),
      topImprovedSchools: (topSchoolsResult.rows as any[]).map(r => ({
        name: String(r.name),
        dbn: String(r.dbn),
        borough: String(r.borough),
        ela2022: Number(r.ela_2022),
        ela2025: Number(r.ela_2025),
        elaChange: Number(r.ela_change),
        math2022: Number(r.math_2022),
        math2025: Number(r.math_2025),
        mathChange: Number(r.math_change),
        totalChange: Number(r.total_change),
      })),
    };
  }

  // Application Tracker (Tracked Schools) operations
  async getUserTrackedSchools(userId: string): Promise<TrackedSchool[]> {
    return await db
      .select()
      .from(trackedSchools)
      .where(eq(trackedSchools.userId, userId))
      .orderBy(desc(trackedSchools.createdAt));
  }

  async getTrackedSchool(userId: string, schoolDbn: string): Promise<TrackedSchool | undefined> {
    const [tracked] = await db
      .select()
      .from(trackedSchools)
      .where(and(
        eq(trackedSchools.userId, userId),
        eq(trackedSchools.schoolDbn, schoolDbn)
      ));
    return tracked;
  }

  async addTrackedSchool(trackedSchool: InsertTrackedSchool): Promise<TrackedSchool> {
    const [inserted] = await db
      .insert(trackedSchools)
      .values(trackedSchool)
      .returning();
    return inserted;
  }

  async updateTrackedSchool(id: number, userId: string, updates: Partial<InsertTrackedSchool>): Promise<TrackedSchool | undefined> {
    const [updated] = await db
      .update(trackedSchools)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(trackedSchools.id, id),
        eq(trackedSchools.userId, userId)
      ))
      .returning();
    return updated;
  }

  async removeTrackedSchool(userId: string, schoolDbn: string): Promise<void> {
    await db
      .delete(trackedSchools)
      .where(and(
        eq(trackedSchools.userId, userId),
        eq(trackedSchools.schoolDbn, schoolDbn)
      ));
  }

  async getTrackedSchoolsNeedingNotification(reminderHours: number): Promise<TrackedSchool[]> {
    const reminderTime = new Date();
    reminderTime.setHours(reminderTime.getHours() + reminderHours);
    
    // Get tracked schools where dates are within the reminder window and haven't been notified yet
    const results = await db
      .select()
      .from(trackedSchools)
      .where(
        or(
          // Open house coming up
          and(
            eq(trackedSchools.notifyOpenHouse, true),
            isNotNull(trackedSchools.openHouseDate),
            sql`${trackedSchools.openHouseDate} <= ${reminderTime}`,
            sql`${trackedSchools.openHouseDate} > NOW()`,
            sql`${trackedSchools.openHouseNotifiedAt} IS NULL`
          ),
          // Tour coming up
          and(
            eq(trackedSchools.notifyTour, true),
            isNotNull(trackedSchools.tourDate),
            sql`${trackedSchools.tourDate} <= ${reminderTime}`,
            sql`${trackedSchools.tourDate} > NOW()`,
            sql`${trackedSchools.tourNotifiedAt} IS NULL`
          ),
          // Deadline coming up
          and(
            eq(trackedSchools.notifyDeadline, true),
            isNotNull(trackedSchools.applicationDeadline),
            sql`${trackedSchools.applicationDeadline} <= ${reminderTime}`,
            sql`${trackedSchools.applicationDeadline} > NOW()`,
            sql`${trackedSchools.deadlineNotifiedAt} IS NULL`
          )
        )
      );
    return results;
  }

  // Password Reset Token operations
  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });
  }

  async findPasswordResetToken(tokenHash: string): Promise<{ id: number; userId: string; expiresAt: Date; usedAt: Date | null } | undefined> {
    const [token] = await db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash));
    return token;
  }

  async markPasswordResetTokenUsed(id: number): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < NOW()`);
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
  
  // Free School View operations
  async getUserFreeViewSchool(userId: string): Promise<string | null> {
    const [user] = await db
      .select({ freeViewSchoolDbn: users.freeViewSchoolDbn })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user?.freeViewSchoolDbn || null;
  }
  
  async setUserFreeViewSchool(userId: string, schoolDbn: string): Promise<void> {
    await db
      .update(users)
      .set({ freeViewSchoolDbn: schoolDbn.toUpperCase(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Admissions Data operations
  async getSchoolAdmissionsMetrics(dbn: string): Promise<AdmissionsMetrics[]> {
    return await db
      .select()
      .from(admissionsMetrics)
      .where(eq(admissionsMetrics.dbn, dbn))
      .orderBy(desc(admissionsMetrics.schoolYear), asc(admissionsMetrics.gradeBand));
  }
  
  // Magic Link Token operations (passwordless auth)
  async createMagicLinkToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await db.insert(magicLinkTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });
  }

  async findMagicLinkToken(tokenHash: string): Promise<{ id: number; userId: string; expiresAt: Date; usedAt: Date | null } | undefined> {
    const [token] = await db
      .select({
        id: magicLinkTokens.id,
        userId: magicLinkTokens.userId,
        expiresAt: magicLinkTokens.expiresAt,
        usedAt: magicLinkTokens.usedAt,
      })
      .from(magicLinkTokens)
      .where(eq(magicLinkTokens.tokenHash, tokenHash));
    return token;
  }

  async markMagicLinkTokenUsed(id: number): Promise<void> {
    await db
      .update(magicLinkTokens)
      .set({ usedAt: new Date() })
      .where(eq(magicLinkTokens.id, id));
  }

  async deleteExpiredMagicLinkTokens(): Promise<void> {
    await db
      .delete(magicLinkTokens)
      .where(sql`${magicLinkTokens.expiresAt} < NOW()`);
  }
  
  // Webhook idempotency operations
  async isWebhookEventProcessed(eventId: string): Promise<boolean> {
    const [existing] = await db
      .select({ eventId: processedWebhookEvents.eventId })
      .from(processedWebhookEvents)
      .where(eq(processedWebhookEvents.eventId, eventId))
      .limit(1);
    return !!existing;
  }

  async markWebhookEventProcessed(eventId: string, eventType: string): Promise<void> {
    await db.insert(processedWebhookEvents).values({
      eventId,
      eventType,
    }).onConflictDoNothing();
  }
  
  // Guest user creation (for checkout without registration)
  async createGuestUser(email: string, stripeCustomerId: string, firstName?: string, lastName?: string): Promise<User> {
    const crypto = await import('crypto');
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    
    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        password: hashedPassword,
        stripeCustomerId,
        subscriptionStatus: 'free',
        subscriptionPlan: 'free',
        firstName: firstName || null,
        lastName: lastName || null,
      })
      .returning();
    return user;
  }
  
  // Private School operations
  async getPrivateSchools(filters?: PrivateSchoolFilters): Promise<PrivateSchool[]> {
    let query = db.select().from(privateSchools);
    
    if (filters) {
      const conditions = [];
      
      if (filters.borough) {
        conditions.push(eq(privateSchools.borough, filters.borough));
      }
      if (filters.zipCode) {
        conditions.push(eq(privateSchools.zipCode, filters.zipCode));
      }
      if (filters.religiousAffiliation) {
        if (filters.religiousAffiliation === 'Non-Religious') {
          conditions.push(eq(privateSchools.isReligious, false));
        } else {
          conditions.push(eq(privateSchools.religiousAffiliation, filters.religiousAffiliation));
        }
      }
      if (filters.coedStatus) {
        conditions.push(eq(privateSchools.coedStatus, filters.coedStatus));
      }
      if (filters.hasFinancialAid) {
        conditions.push(eq(privateSchools.hasFinancialAid, true));
      }
      if (filters.search) {
        conditions.push(
          or(
            ilike(privateSchools.name, `%${filters.search}%`),
            ilike(privateSchools.address, `%${filters.search}%`)
          )
        );
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
    }
    
    return query.orderBy(asc(privateSchools.name));
  }
  
  async getPrivateSchool(ncesId: string): Promise<PrivateSchool | undefined> {
    const [school] = await db
      .select()
      .from(privateSchools)
      .where(eq(privateSchools.ncesId, ncesId))
      .limit(1);
    return school;
  }
  
  async upsertPrivateSchool(school: InsertPrivateSchool): Promise<PrivateSchool> {
    const [result] = await db
      .insert(privateSchools)
      .values(school)
      .onConflictDoUpdate({
        target: privateSchools.ncesId,
        set: {
          ...school,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }
  
  async upsertPrivateSchools(schoolList: InsertPrivateSchool[]): Promise<void> {
    if (schoolList.length === 0) return;
    
    // Batch upsert in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < schoolList.length; i += chunkSize) {
      const chunk = schoolList.slice(i, i + chunkSize);
      await db
        .insert(privateSchools)
        .values(chunk)
        .onConflictDoUpdate({
          target: privateSchools.ncesId,
          set: {
            name: sql`excluded.name`,
            address: sql`excluded.address`,
            city: sql`excluded.city`,
            state: sql`excluded.state`,
            zipCode: sql`excluded.zip_code`,
            phone: sql`excluded.phone`,
            website: sql`excluded.website`,
            borough: sql`excluded.borough`,
            neighborhood: sql`excluded.neighborhood`,
            latitude: sql`excluded.latitude`,
            longitude: sql`excluded.longitude`,
            bbl: sql`excluded.bbl`,
            bin: sql`excluded.bin`,
            gradesOffered: sql`excluded.grades_offered`,
            lowestGrade: sql`excluded.lowest_grade`,
            highestGrade: sql`excluded.highest_grade`,
            enrollment: sql`excluded.enrollment`,
            enrollmentByGrade: sql`excluded.enrollment_by_grade`,
            teachersFte: sql`excluded.teachers_fte`,
            studentTeacherRatio: sql`excluded.student_teacher_ratio`,
            coedStatus: sql`excluded.coed_status`,
            religiousAffiliation: sql`excluded.religious_affiliation`,
            religiousOrientation: sql`excluded.religious_orientation`,
            isReligious: sql`excluded.is_religious`,
            programEmphasis: sql`excluded.program_emphasis`,
            schoolType: sql`excluded.school_type`,
            hasExtendedDay: sql`excluded.has_extended_day`,
            schoolDayMinutes: sql`excluded.school_day_minutes`,
            schoolYearDays: sql`excluded.school_year_days`,
            tuitionElementary: sql`excluded.tuition_elementary`,
            tuitionMiddle: sql`excluded.tuition_middle`,
            tuitionHigh: sql`excluded.tuition_high`,
            hasFinancialAid: sql`excluded.has_financial_aid`,
            financialAidPercent: sql`excluded.financial_aid_percent`,
            accreditation: sql`excluded.accreditation`,
            networkAffiliation: sql`excluded.network_affiliation`,
            applicationDeadline: sql`excluded.application_deadline`,
            hasRollingAdmissions: sql`excluded.has_rolling_admissions`,
            admissionsSelectivity: sql`excluded.admissions_selectivity`,
            requiresInterview: sql`excluded.requires_interview`,
            requiresTesting: sql`excluded.requires_testing`,
            testingTypes: sql`excluded.testing_types`,
            dataSourceYear: sql`excluded.data_source_year`,
            dataSourceVersion: sql`excluded.data_source_version`,
            updatedAt: new Date(),
          },
        });
    }
  }
  
  async getPrivateSchoolHistory(ncesId: string): Promise<PrivateSchoolHistory[]> {
    return db
      .select()
      .from(privateSchoolHistory)
      .where(eq(privateSchoolHistory.ncesId, ncesId))
      .orderBy(desc(privateSchoolHistory.schoolYear));
  }
  
  async upsertPrivateSchoolHistory(history: InsertPrivateSchoolHistory): Promise<PrivateSchoolHistory> {
    const [result] = await db
      .insert(privateSchoolHistory)
      .values(history)
      .onConflictDoUpdate({
        target: [privateSchoolHistory.ncesId, privateSchoolHistory.schoolYear],
        set: {
          enrollment: history.enrollment,
          teachersFte: history.teachersFte,
          studentTeacherRatio: history.studentTeacherRatio,
          tuitionElementary: history.tuitionElementary,
          tuitionMiddle: history.tuitionMiddle,
          tuitionHigh: history.tuitionHigh,
          schoolDayMinutes: history.schoolDayMinutes,
          schoolYearDays: history.schoolYearDays,
          dataSourceVersion: history.dataSourceVersion,
        },
      })
      .returning();
    return result;
  }

  async getHSGraduation(dbn: string): Promise<HsGraduation[]> {
    return db
      .select()
      .from(hsGraduation)
      .where(eq(hsGraduation.dbn, dbn))
      .orderBy(desc(hsGraduation.cohort_year));
  }

  async getHSRegents(dbn: string): Promise<HsRegents[]> {
    return db
      .select()
      .from(hsRegents)
      .where(eq(hsRegents.dbn, dbn))
      .orderBy(desc(hsRegents.year), asc(hsRegents.exam_name));
  }

  async getSchoolAttendance(dbn: string): Promise<SchoolAttendance[]> {
    return db
      .select()
      .from(schoolAttendance)
      .where(eq(schoolAttendance.dbn, dbn))
      .orderBy(desc(schoolAttendance.year));
  }

  async getSchoolDiscipline(dbn: string): Promise<SchoolDiscipline[]> {
    return db
      .select()
      .from(schoolDiscipline)
      .where(eq(schoolDiscipline.dbn, dbn))
      .orderBy(desc(schoolDiscipline.year));
  }

  async getHsAdmissionsPrograms(dbn: string): Promise<HsAdmissionsProgram[]> {
    return db
      .select()
      .from(hsAdmissionsProgram)
      .where(eq(hsAdmissionsProgram.dbn, dbn))
      .orderBy(hsAdmissionsProgram.program_number);
  }

  // API Keys (Developer API - Premium feature)
  async createApiKey(data: InsertApiKey): Promise<ApiKey> {
    const [key] = await db.insert(apiKeys).values(data).returning();
    return key;
  }

  async listApiKeysForUser(userId: string): Promise<ApiKey[]> {
    return db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async findApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1);
    return key;
  }

  async touchApiKeyLastUsed(id: number): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  }

  async revokeApiKey(id: number, userId: string): Promise<ApiKey | undefined> {
    const [key] = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
      .returning();
    return key;
  }

  // ===== API observability =====

  // Atomically increment per-key rate counters. The single SQL statement rolls
  // the minute / day windows when they expire and increments otherwise. The
  // returned row reflects the post-update state used by the auth middleware
  // to decide whether to allow the request.
  async incrementApiRateState(keyId: number, now: Date): Promise<ApiKeyRateState> {
    const minuteAgo = new Date(now.getTime() - 60_000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    // Use INSERT .. ON CONFLICT DO UPDATE so first-touch and subsequent-touch
    // both go through one round-trip. The window-roll logic lives in the SQL
    // CASE expressions to avoid read-then-write races between concurrent
    // requests for the same key.
    const result = await db.execute(sql`
      INSERT INTO api_key_rate_state (key_id, minute_window_start, minute_count, day_window_start, day_count, updated_at)
      VALUES (${keyId}, ${now.toISOString()}, 1, ${now.toISOString()}, 1, ${now.toISOString()})
      ON CONFLICT (key_id) DO UPDATE SET
        minute_window_start = CASE
          WHEN api_key_rate_state.minute_window_start < ${minuteAgo.toISOString()}
          THEN ${now.toISOString()}::timestamp
          ELSE api_key_rate_state.minute_window_start
        END,
        minute_count = CASE
          WHEN api_key_rate_state.minute_window_start < ${minuteAgo.toISOString()}
          THEN 1
          ELSE api_key_rate_state.minute_count + 1
        END,
        day_window_start = CASE
          WHEN api_key_rate_state.day_window_start < ${dayAgo.toISOString()}
          THEN ${now.toISOString()}::timestamp
          ELSE api_key_rate_state.day_window_start
        END,
        day_count = CASE
          WHEN api_key_rate_state.day_window_start < ${dayAgo.toISOString()}
          THEN 1
          ELSE api_key_rate_state.day_count + 1
        END,
        updated_at = ${now.toISOString()}
      RETURNING key_id, minute_window_start, minute_count, day_window_start, day_count, updated_at
    `);
    const row: any = (result as any).rows?.[0] ?? (result as any)[0];
    return {
      keyId: row.key_id,
      minuteWindowStart: new Date(row.minute_window_start),
      minuteCount: Number(row.minute_count),
      dayWindowStart: new Date(row.day_window_start),
      dayCount: Number(row.day_count),
      updatedAt: new Date(row.updated_at),
    };
  }

  async insertApiRequestLogs(rows: InsertApiRequestLog[]): Promise<void> {
    if (!rows.length) return;
    await db.insert(apiRequestLog).values(rows);
  }

  async pruneApiRequestLogs(olderThan: Date): Promise<number> {
    const result = await db
      .delete(apiRequestLog)
      .where(lt(apiRequestLog.ts, olderThan))
      .returning({ id: apiRequestLog.id });
    return result.length;
  }

  async countRecentRateLimitHits(keyId: number, sinceTs: Date): Promise<number> {
    const [row] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(apiRequestLog)
      .where(and(
        eq(apiRequestLog.keyId, keyId),
        eq(apiRequestLog.status, 429),
        gte(apiRequestLog.ts, sinceTs),
      ));
    return Number(row?.c ?? 0);
  }

  async countDistinctIpsForKey(keyId: number, sinceTs: Date): Promise<number> {
    const [row] = await db
      .select({ c: sql<number>`count(distinct ${apiRequestLog.ip})::int` })
      .from(apiRequestLog)
      .where(and(
        eq(apiRequestLog.keyId, keyId),
        gte(apiRequestLog.ts, sinceTs),
        isNotNull(apiRequestLog.ip),
      ));
    return Number(row?.c ?? 0);
  }

  // Returns true when a new alert was inserted, false if one already existed
  // for that (key, alertType, day) — i.e. the email has already been sent today.
  async recordAbuseAlert(data: InsertApiAbuseAlert): Promise<boolean> {
    const inserted = await db
      .insert(apiAbuseAlerts)
      .values(data)
      .onConflictDoNothing({ target: [apiAbuseAlerts.keyId, apiAbuseAlerts.alertType, apiAbuseAlerts.alertDay] })
      .returning({ id: apiAbuseAlerts.id });
    return inserted.length > 0;
  }

  async pruneAbuseAlerts(olderThan: Date): Promise<number> {
    const result = await db
      .delete(apiAbuseAlerts)
      .where(lt(apiAbuseAlerts.createdAt, olderThan))
      .returning({ id: apiAbuseAlerts.id });
    return result.length;
  }

  async listAllApiKeysWithUsers(): Promise<Array<ApiKey & { ownerEmail: string | null }>> {
    const rows = await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        keyHash: apiKeys.keyHash,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        ownerEmail: users.email,
      })
      .from(apiKeys)
      .leftJoin(users, eq(apiKeys.userId, users.id))
      .orderBy(desc(apiKeys.createdAt));
    return rows as any;
  }

  async getApiKeyUsageSummary(keyId: number, sinceTs: Date): Promise<{ total: number; errors429: number; distinctIps: number }> {
    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        errors429: sql<number>`sum(case when ${apiRequestLog.status} = 429 then 1 else 0 end)::int`,
        distinctIps: sql<number>`count(distinct ${apiRequestLog.ip})::int`,
      })
      .from(apiRequestLog)
      .where(and(
        eq(apiRequestLog.keyId, keyId),
        gte(apiRequestLog.ts, sinceTs),
      ));
    return {
      total: Number(row?.total ?? 0),
      errors429: Number(row?.errors429 ?? 0),
      distinctIps: Number(row?.distinctIps ?? 0),
    };
  }

  async listTopApiKeysByVolume(sinceTs: Date, limit: number): Promise<Array<{ keyId: number; total: number }>> {
    const rows = await db
      .select({
        keyId: apiRequestLog.keyId,
        total: sql<number>`count(*)::int`,
      })
      .from(apiRequestLog)
      .where(and(
        gte(apiRequestLog.ts, sinceTs),
        isNotNull(apiRequestLog.keyId),
      ))
      .groupBy(apiRequestLog.keyId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);
    return rows
      .filter((r) => r.keyId !== null)
      .map((r) => ({ keyId: r.keyId as number, total: Number(r.total) }));
  }

  async listRecentRateLimitHits(limit: number): Promise<Array<{ keyId: number | null; path: string; ts: Date; ip: string | null }>> {
    const rows = await db
      .select({
        keyId: apiRequestLog.keyId,
        path: apiRequestLog.path,
        ts: apiRequestLog.ts,
        ip: apiRequestLog.ip,
      })
      .from(apiRequestLog)
      .where(eq(apiRequestLog.status, 429))
      .orderBy(desc(apiRequestLog.ts))
      .limit(limit);
    return rows;
  }

  async listRecentRequestsForKey(keyId: number, limit: number): Promise<Array<{ path: string; status: number; ts: Date; ip: string | null; responseTimeMs: number | null }>> {
    const rows = await db
      .select({
        path: apiRequestLog.path,
        status: apiRequestLog.status,
        ts: apiRequestLog.ts,
        ip: apiRequestLog.ip,
        responseTimeMs: apiRequestLog.responseTimeMs,
      })
      .from(apiRequestLog)
      .where(eq(apiRequestLog.keyId, keyId))
      .orderBy(desc(apiRequestLog.ts))
      .limit(limit);
    return rows;
  }

  async listRecentIpsForKey(keyId: number, sinceTs: Date): Promise<Array<{ ip: string; count: number; lastSeen: Date }>> {
    const rows = await db
      .select({
        ip: apiRequestLog.ip,
        count: sql<number>`count(*)::int`,
        lastSeen: sql<Date>`max(${apiRequestLog.ts})`,
      })
      .from(apiRequestLog)
      .where(and(
        eq(apiRequestLog.keyId, keyId),
        gte(apiRequestLog.ts, sinceTs),
        isNotNull(apiRequestLog.ip),
      ))
      .groupBy(apiRequestLog.ip)
      .orderBy(desc(sql`count(*)`))
      .limit(50);
    return rows
      .filter((r) => r.ip !== null)
      .map((r) => ({ ip: r.ip as string, count: Number(r.count), lastSeen: r.lastSeen as Date }));
  }

  async countRequestsByPathForKey(keyId: number, sinceTs: Date): Promise<Array<{ path: string; count: number }>> {
    const rows = await db
      .select({
        path: apiRequestLog.path,
        count: sql<number>`count(*)::int`,
      })
      .from(apiRequestLog)
      .where(and(
        eq(apiRequestLog.keyId, keyId),
        gte(apiRequestLog.ts, sinceTs),
      ))
      .groupBy(apiRequestLog.path)
      .orderBy(desc(sql`count(*)`));
    return rows.map((r) => ({ path: r.path, count: Number(r.count) }));
  }

  async adminRevokeApiKey(id: number): Promise<ApiKey | undefined> {
    const [key] = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return key;
  }
}

export const storage = new DbStorage();
