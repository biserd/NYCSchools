import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import { storage } from "./storage";
import { insertFavoriteSchema, insertReviewSchema, insertUserProfileSchema, insertNyceecReviewSchema, insertTrackedSchoolSchema, insertContactSubmissionSchema, contactSubmissions, schoolZones, privateSchools } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { setupAuth, isAuthenticated } from "./auth";
import { setupOAuth, getUserFromAccessToken } from "./oauth";
import OpenAI from "openai";
import compression from "compression";
import cors from "cors";
import { updateUserZonedSchools, getUserZonedSchools } from "./services/zoning";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync, getUncachableStripeClient, getStripePublishableKey, getStripeMode } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import { stripeService } from "./stripeService";
import { getCached, setCache, invalidateUserCaches, CACHE_TTL_SHORT, CACHE_TTL_DEFAULT, CACHE_TTL_LONG } from "./cache";
import { neighborhoodComparisons, getComparisonSlugForNeighborhood } from "@shared/neighborhoodComparisons";
import { getSafetyIndex, runSafetySync, getSafetySyncStatus } from "./services/safetyIndex";
import { DEFAULT_SAFETY_RADIUS_METERS, SAFETY_RADIUS_OPTIONS } from "@shared/schema";

// Premium subscription limits
const FREE_TIER_LIMITS = {
  MAX_FAVORITES: 5,
  MAX_AI_QUESTIONS_PER_DAY: 5,
  MAX_COMPARISON_SCHOOLS: 2,
};

const PREMIUM_TIER_LIMITS = {
  MAX_FAVORITES: Infinity,
  MAX_AI_QUESTIONS_PER_DAY: Infinity,
  MAX_COMPARISON_SCHOOLS: 4,
};

// Helper to check if user has an active premium subscription (with 1-minute cache)
async function isPremiumUser(userId: string): Promise<boolean> {
  try {
    // Check cache first (1-minute TTL to reduce Stripe API calls)
    const cacheKey = `premium-user-${userId}`;
    const cachedResult = getCached<boolean>(cacheKey);
    if (cachedResult !== null) {
      return cachedResult;
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      setCache(cacheKey, false, CACHE_TTL_SHORT);
      return false;
    }
    
    // First check database fields for Season Pass (one-time purchase)
    if (user.subscriptionStatus === 'active' && 
        (user.subscriptionPlan === 'season_pass' || user.subscriptionPlan === 'premium')) {
      // Check if Season Pass has expired
      if (user.subscriptionExpiresAt) {
        const now = new Date();
        if (now > user.subscriptionExpiresAt) {
          // Season Pass expired - update database and return false
          await storage.updateUserStripeInfo(userId, {
            subscriptionStatus: 'expired',
            subscriptionPlan: 'free',
          });
          setCache(cacheKey, false, CACHE_TTL_SHORT);
          return false;
        }
      }
      setCache(cacheKey, true, CACHE_TTL_SHORT);
      return true;
    }
    
    // Fall back to checking Stripe subscription for recurring plans
    if (user.stripeSubscriptionId) {
      const subscription = await stripeService.getSubscriptionWithDetails(user.stripeSubscriptionId);
      if (subscription && ['active', 'trialing', 'past_due'].includes(subscription.status)) {
        setCache(cacheKey, true, CACHE_TTL_SHORT);
        return true;
      }
    }
    
    setCache(cacheKey, false, CACHE_TTL_SHORT);
    return false;
  } catch (error) {
    console.error("Error checking premium status:", error);
    return false;
  }
}

// Get user's tier limits
async function getUserLimits(userId: string | undefined): Promise<typeof FREE_TIER_LIMITS> {
  if (!userId) {
    return FREE_TIER_LIMITS;
  }
  const isPremium = await isPremiumUser(userId);
  return isPremium ? PREMIUM_TIER_LIMITS : FREE_TIER_LIMITS;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Add compression middleware
  app.use(compression());

  // CORS middleware for ChatGPT/OpenAI integration
  const allowedOrigins = [
    'https://chat.openai.com',
    'https://chatgpt.com',
    'https://platform.openai.com',
    'https://api.openai.com',
    // Allow local development
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/.*\.replit\.dev$/,
    /^https?:\/\/.*\.replit\.app$/,
  ];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      
      // Allow any Replit development domain
      if (origin.includes('.replit.dev') || origin.includes('.replit.app') || origin.includes('localhost')) {
        return callback(null, true);
      }
      
      // Check against allowed origins (strings and regexes)
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return origin === allowed;
        }
        return allowed.test(origin);
      });
      
      if (isAllowed) {
        return callback(null, true);
      }
      
      // Strict hostname check for our own domain
      try {
        const url = new URL(origin);
        if (url.hostname === 'nycschoolsratings.com' || url.hostname === 'www.nycschoolsratings.com') {
          return callback(null, true);
        }
      } catch {
        // Invalid URL
      }
      
      return callback(null, true); // Fallback to true in development to prevent blocking
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['WWW-Authenticate'],
  }));

  // Serve ChatGPT widget files
  app.use('/widget', express.static(path.join(process.cwd(), 'chatgpt-widget/dist'), {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }));

  // Auth middleware
  setupAuth(app);
  
  // OAuth 2.1 endpoints for ChatGPT
  setupOAuth(app);

  // Redirect /search to homepage (email campaign link fix)
  app.get("/search", (req: Request, res: Response) => {
    res.redirect(301, "/");
  });

  // Auth routes
  app.get("/api/auth/user", async (req: any, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.json(null);
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.json(null);
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Schools API (public) with caching
  app.get("/api/schools", async (req: Request, res: Response) => {
    try {
      const cacheKey = "all-schools";
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }

      const schools = await storage.getSchools();
      setCache(cacheKey, schools);
      res.json(schools);
    } catch (error) {
      console.error("Error fetching schools:", error);
      res.status(500).json({ error: "Failed to fetch schools" });
    }
  });

  // Fetch multiple schools by slugs (for shareable comparison URLs)
  // Supports both friendly slugs (PS006-M) and DBN format (01M006)
  // IMPORTANT: This must come BEFORE /api/schools/:dbn to avoid matching "by-slugs" as a DBN
  app.get("/api/schools/by-slugs", async (req: Request, res: Response) => {
    try {
      const slugsParam = req.query.slugs as string;
      if (!slugsParam) {
        return res.status(400).json({ error: "Missing slugs parameter" });
      }
      
      const slugs = slugsParam.split(",").map(s => s.trim()).filter(Boolean);
      if (slugs.length === 0) {
        return res.json([]);
      }
      
      // Limit to 4 schools max (same as comparison limit)
      const limitedSlugs = slugs.slice(0, 4);
      
      // Get all schools to search through
      const allSchools = await storage.getSchools();
      
      const foundSchools = limitedSlugs.map(slug => {
        // Check if it's a friendly slug like "PS006-M"
        const friendlyMatch = slug.match(/^([A-Z]+)(\d+)-([MXKQR])$/i);
        if (friendlyMatch) {
          const type = friendlyMatch[1].toUpperCase();
          const number = friendlyMatch[2].padStart(3, '0');
          const borough = friendlyMatch[3].toUpperCase();
          
          // Find school matching type, number, and borough
          return allSchools.find(school => {
            const dbn = school.dbn.toUpperCase();
            const schoolBorough = dbn.charAt(2);
            const schoolNumber = dbn.slice(3);
            
            // Check borough and number match
            if (schoolBorough !== borough || schoolNumber !== number) return false;
            
            // Check school type matches based on name
            const nameUpper = school.name.toUpperCase();
            if (type === 'PS' && nameUpper.startsWith('P.S.')) return true;
            if (type === 'IS' && nameUpper.startsWith('I.S.')) return true;
            if (type === 'MS' && nameUpper.startsWith('M.S.')) return true;
            if (type === 'HS' && nameUpper.startsWith('H.S.')) return true;
            if (type === 'JHS' && nameUpper.startsWith('J.H.S.')) return true;
            
            return false;
          });
        }
        
        // Fallback: treat as DBN (e.g., "01M006")
        const dbn = slug.toUpperCase();
        return allSchools.find(school => school.dbn.toUpperCase() === dbn);
      });
      
      // Filter out any null results (schools not found)
      const validSchools = foundSchools.filter(s => s !== null && s !== undefined);
      res.json(validSchools);
    } catch (error) {
      console.error("Error fetching schools by slugs:", error);
      res.status(500).json({ error: "Failed to fetch schools" });
    }
  });
  
  // Legacy endpoint for backwards compatibility
  app.get("/api/schools/by-dbns", async (req: Request, res: Response) => {
    try {
      const dbnsParam = req.query.dbns as string;
      if (!dbnsParam) {
        return res.status(400).json({ error: "Missing dbns parameter" });
      }
      
      const dbns = dbnsParam.split(",").map(dbn => dbn.trim().toUpperCase()).filter(Boolean);
      if (dbns.length === 0) {
        return res.json([]);
      }
      
      // Limit to 4 schools max (same as comparison limit)
      const limitedDbns = dbns.slice(0, 4);
      
      const schools = await Promise.all(
        limitedDbns.map(dbn => storage.getSchool(dbn))
      );
      
      // Filter out any null results (schools not found)
      const validSchools = schools.filter(s => s !== null);
      res.json(validSchools);
    } catch (error) {
      console.error("Error fetching schools by DBNs:", error);
      res.status(500).json({ error: "Failed to fetch schools" });
    }
  });

  // Individual school lookup with 10-minute cache (static data)
  app.get("/api/schools/:dbn", async (req: Request, res: Response) => {
    try {
      const dbn = req.params.dbn.toUpperCase();
      const cacheKey = `school-${dbn}`;
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const school = await storage.getSchool(dbn);
      if (!school) {
        return res.status(404).json({ error: "School not found" });
      }
      setCache(cacheKey, school, CACHE_TTL_LONG);
      res.json(school);
    } catch (error) {
      console.error("Error fetching school:", error);
      res.status(500).json({ error: "Failed to fetch school" });
    }
  });

  // Neighborhood Safety Index — works for public schools, private schools, and NYCEEC
  // centers. Free tier returns the score + label only at the default radius;
  // premium users can pick a radius and see the full breakdown.
  app.get("/api/safety/:type/:schoolKey", async (req: any, res: Response) => {
    try {
      const type = req.params.type as "public" | "private" | "nyceec";
      if (!["public", "private", "nyceec"].includes(type)) {
        return res.status(400).json({ error: "Invalid school type" });
      }
      const schoolKey = String(req.params.schoolKey).toUpperCase();

      const userId = req.user?.id;
      const isPremium = userId ? await isPremiumUser(userId) : false;

      const validRadii: number[] = SAFETY_RADIUS_OPTIONS.map((r) => r.meters);
      const requestedRadius = parseInt(String(req.query.radius ?? ""), 10);
      let radiusMeters: number = DEFAULT_SAFETY_RADIUS_METERS;
      if (
        Number.isFinite(requestedRadius) &&
        validRadii.includes(requestedRadius) &&
        isPremium
      ) {
        radiusMeters = requestedRadius;
      }

      const cacheKey = `safety-${type}-${schoolKey}-${radiusMeters}`;
      const cached = getCached<any>(cacheKey);
      let payload = cached;
      if (!payload) {
        const data = await getSafetyIndex(type, schoolKey, radiusMeters);
        if (!data) {
          return res
            .status(404)
            .json({ error: "Safety index not yet computed for this school" });
        }
        payload = data;
        setCache(cacheKey, payload, CACHE_TTL_LONG);
      }

      if (isPremium) {
        return res.json({ ...payload, isPremium: true });
      }

      // Free tier: return preview fields only
      return res.json({
        schoolType: payload.schoolType,
        schoolKey: payload.schoolKey,
        radiusMeters: payload.radiusMeters,
        radiusMiles: payload.radiusMiles,
        periodStart: payload.periodStart,
        periodEnd: payload.periodEnd,
        totalReports: payload.totalReports,
        safetyIndex: payload.safetyIndex,
        label: payload.label,
        tone: payload.tone,
        availableRadii: payload.availableRadii,
        lastCalculatedAt: payload.lastCalculatedAt,
        isPremium: false,
      });
    } catch (error) {
      console.error("Error fetching safety index:", error);
      res.status(500).json({ error: "Failed to fetch safety index" });
    }
  });

  // Historical scores API (public) - for individual school with 10-minute cache
  app.get("/api/schools/:dbn/history", async (req: Request, res: Response) => {
    try {
      const dbn = req.params.dbn.toUpperCase();
      const cacheKey = `school-history-${dbn}`;
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const trend = await storage.getSchoolTrend(dbn);
      setCache(cacheKey, trend, CACHE_TTL_LONG);
      res.json(trend);
    } catch (error) {
      console.error("Error fetching school history:", error);
      res.status(500).json({ error: "Failed to fetch school history" });
    }
  });

  // Admissions data API (public) - for K/3K/Pre-K admissions metrics with 10-minute cache
  app.get("/api/schools/:dbn/admissions", async (req: Request, res: Response) => {
    try {
      const dbn = req.params.dbn.toUpperCase();
      const cacheKey = `school-admissions-${dbn}`;
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const metrics = await storage.getSchoolAdmissionsMetrics(dbn);
      setCache(cacheKey, metrics, CACHE_TTL_LONG);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching admissions data:", error);
      res.status(500).json({ error: "Failed to fetch admissions data" });
    }
  });

  // Get high school graduation outcomes (multi-year cohort data)
  app.get("/api/schools/:dbn/graduation", async (req: Request, res: Response) => {
    try {
      const dbn = req.params.dbn.toUpperCase();
      const cacheKey = `hs-graduation-${dbn}`;
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const data = await storage.getHSGraduation(dbn);
      setCache(cacheKey, data, CACHE_TTL_LONG);
      res.json(data);
    } catch (error) {
      console.error("Error fetching graduation data:", error);
      res.status(500).json({ error: "Failed to fetch graduation data" });
    }
  });

  // Get high school Regents exam results (multi-year, per-exam)
  app.get("/api/schools/:dbn/regents", async (req: Request, res: Response) => {
    try {
      const dbn = req.params.dbn.toUpperCase();
      const cacheKey = `hs-regents-${dbn}`;
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const data = await storage.getHSRegents(dbn);
      setCache(cacheKey, data, CACHE_TTL_LONG);
      res.json(data);
    } catch (error) {
      console.error("Error fetching Regents data:", error);
      res.status(500).json({ error: "Failed to fetch Regents data" });
    }
  });

  // Get school attendance & chronic absenteeism data (multi-year)
  app.get("/api/schools/:dbn/attendance", async (req: Request, res: Response) => {
    try {
      const dbn = req.params.dbn.toUpperCase();
      const cacheKey = `school-attendance-${dbn}`;
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const data = await storage.getSchoolAttendance(dbn);
      setCache(cacheKey, data, CACHE_TTL_LONG);
      res.json(data);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      res.status(500).json({ error: "Failed to fetch attendance data" });
    }
  });

  // Get school discipline/suspension data (multi-year)
  app.get("/api/schools/:dbn/discipline", async (req: Request, res: Response) => {
    try {
      const dbn = req.params.dbn.toUpperCase();
      const cacheKey = `school-discipline-${dbn}`;
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const data = await storage.getSchoolDiscipline(dbn);
      setCache(cacheKey, data, CACHE_TTL_LONG);
      res.json(data);
    } catch (error) {
      console.error("Error fetching discipline data:", error);
      res.status(500).json({ error: "Failed to fetch discipline data" });
    }
  });

  // Get HS admissions programs data
  app.get("/api/schools/:dbn/admissions-programs", async (req: Request, res: Response) => {
    try {
      const dbn = req.params.dbn.toUpperCase();
      const cacheKey = `hs-admissions-${dbn}`;
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const data = await storage.getHsAdmissionsPrograms(dbn);
      setCache(cacheKey, data, CACHE_TTL_LONG);
      res.json(data);
    } catch (error) {
      console.error("Error fetching admissions programs:", error);
      res.status(500).json({ error: "Failed to fetch admissions programs" });
    }
  });

  // Get school zone boundary (GeoJSON geometry) for map overlay
  app.get("/api/schools/:dbn/zone", async (req: Request, res: Response) => {
    try {
      const dbn = req.params.dbn.toUpperCase();
      const cacheKey = `school-zone-${dbn}`;
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      // Look up zone boundary from school_zones table
      const [zone] = await db.select({
        dbn: schoolZones.dbn,
        schoolName: schoolZones.schoolName,
        gradeLevel: schoolZones.gradeLevel,
        geometry: schoolZones.geometry,
      })
        .from(schoolZones)
        .where(eq(schoolZones.dbn, dbn))
        .limit(1);
      
      if (!zone) {
        return res.json(null);
      }
      
      // Find other schools that fall within this zone's boundary
      // Get all schools and filter by district
      const allSchools = await storage.getSchools();
      const school = await storage.getSchool(dbn);
      const allSchoolsInDistrict = school ? allSchools.filter(s => s.district === school.district) : [];
      const otherSchoolsInZone: Array<{dbn: string; name: string; latitude: number; longitude: number; overall_score: number; grade_band: string}> = [];
      
      try {
        const { default: booleanPointInPolygon } = await import("@turf/boolean-point-in-polygon");
        const { point } = await import("@turf/helpers");
        
        const zoneGeometry = zone.geometry as any;
        
        for (const s of allSchoolsInDistrict) {
          if (s.dbn === dbn) continue; // Skip the current school
          if (s.latitude && s.longitude) {
            const p = point([s.longitude, s.latitude]);
            if (booleanPointInPolygon(p, zoneGeometry)) {
              otherSchoolsInZone.push({
                dbn: s.dbn,
                name: s.name,
                latitude: s.latitude,
                longitude: s.longitude,
                overall_score: s.academics_score + s.climate_score + s.progress_score, // Basic score calc if needed
                grade_band: s.grade_band
              });
            }
          }
        }
      } catch (err) {
        console.error("Error finding other schools in zone:", err);
      }
      
      const responseData = { ...zone, otherSchools: otherSchoolsInZone };
      setCache(cacheKey, responseData, CACHE_TTL_LONG);
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching school zone:", error);
      res.status(500).json({ error: "Failed to fetch school zone" });
    }
  });

  // NYCEEC Early Childhood Centers API (public) with caching
  app.get("/api/nyceec-centers", async (req: Request, res: Response) => {
    try {
      const { borough, district, centerType, zipCode, search } = req.query;
      
      const filters: {
        borough?: string;
        district?: number;
        centerType?: string;
        zipCode?: string;
        search?: string;
      } = {};
      
      if (borough && typeof borough === 'string') {
        filters.borough = borough;
      }
      if (district && typeof district === 'string') {
        const districtNum = parseInt(district, 10);
        if (!isNaN(districtNum)) {
          filters.district = districtNum;
        }
      }
      if (centerType && typeof centerType === 'string') {
        filters.centerType = centerType;
      }
      if (zipCode && typeof zipCode === 'string') {
        filters.zipCode = zipCode;
      }
      if (search && typeof search === 'string') {
        filters.search = search;
      }
      
      // Only cache if no filters (full list)
      const hasFilters = Object.keys(filters).length > 0;
      const cacheKey = "all-nyceec-centers";
      
      if (!hasFilters) {
        const cachedData = getCached(cacheKey);
        if (cachedData) {
          return res.json(cachedData);
        }
      }

      const centers = await storage.getNyceecCenters(hasFilters ? filters : undefined);
      
      if (!hasFilters) {
        setCache(cacheKey, centers);
      }
      
      res.json(centers);
    } catch (error) {
      console.error("Error fetching NYCEEC centers:", error);
      res.status(500).json({ error: "Failed to fetch early childhood centers" });
    }
  });

  // Individual NYCEEC center with 10-minute cache (normalize locCode to uppercase for consistent cache keys)
  app.get("/api/nyceec-centers/:locCode", async (req: Request, res: Response) => {
    try {
      const locCode = req.params.locCode.toUpperCase();
      const cacheKey = `nyceec-center-${locCode}`;
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const center = await storage.getNyceecCenter(locCode);
      if (!center) {
        return res.status(404).json({ error: "Early childhood center not found" });
      }
      setCache(cacheKey, center, CACHE_TTL_LONG);
      res.json(center);
    } catch (error) {
      console.error("Error fetching NYCEEC center:", error);
      res.status(500).json({ error: "Failed to fetch early childhood center" });
    }
  });

  // GET cached NYCEEC AI Insights (reading cached is free, generation is premium)
  app.get("/api/nyceec-centers/:locCode/ai-insights", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { locCode } = req.params;
      const cachedInsight = await storage.getNyceecAiInsight(locCode);
      
      if (cachedInsight) {
        // Cached insights are available to all authenticated users
        return res.json({
          overview: cachedInsight.overview,
          considerations: cachedInsight.considerations,
          tourQuestions: cachedInsight.tourQuestions,
          neighborhoodContext: cachedInsight.neighborhoodContext,
          cached: true,
        });
      }
      
      // No cached insights - return null (frontend will show generate button)
      return res.json(null);
    } catch (error) {
      console.error("Error fetching cached NYCEEC AI insights:", error);
      res.status(500).json({ error: "Failed to fetch AI insights" });
    }
  });

  // NYCEEC AI Insights endpoint (authenticated) - with caching - PREMIUM ONLY
  app.post("/api/nyceec-centers/ai-insights", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Check premium status
      const isPremium = await isPremiumUser(userId);
      if (!isPremium) {
        return res.status(403).json({
          error: "Premium feature",
          code: "PREMIUM_REQUIRED",
          message: "Early childhood AI insights are available for Premium subscribers. Upgrade to access personalized center analysis.",
        });
      }
      
      const { locCode, name, centerType, borough, district, address, seats, extendedDay, dayLength } = req.body;
      
      if (!locCode || !name) {
        return res.status(400).json({ error: "Missing required center information" });
      }

      // Check cache first for instant response
      const cachedInsight = await storage.getNyceecAiInsight(locCode);
      if (cachedInsight) {
        return res.json({
          overview: cachedInsight.overview,
          considerations: cachedInsight.considerations,
          tourQuestions: cachedInsight.tourQuestions,
          neighborhoodContext: cachedInsight.neighborhoodContext,
          cached: true,
        });
      }

      const boroughName = borough === "M" ? "Manhattan" : 
                          borough === "X" ? "Bronx" : 
                          borough === "K" ? "Brooklyn" : 
                          borough === "Q" ? "Queens" : 
                          borough === "R" ? "Staten Island" : borough;
      
      const centerTypeLabel = centerType === "NYCEEC" ? "Community-Based (NYCEEC)" :
                              centerType === "DOE" ? "DOE School" : "Charter";

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const systemPrompt = `You are an expert early childhood education advisor helping NYC parents evaluate preschool and Pre-K programs. You provide helpful, balanced information without making claims about quality ratings (since none exist for these programs).

Your role is to help parents know what questions to ask, what to observe, and how to evaluate if a center is right for their child. Be warm, supportive, and practical.

IMPORTANT: You should NOT make up specific details about the center that you don't know. Focus on general guidance relevant to the center type and location.`;

      const userPrompt = `Generate helpful insights for parents considering this NYC early childhood center:

Center Name: ${name}
Type: ${centerTypeLabel}
Location: ${boroughName}, District ${district || 'N/A'}
Address: ${address || 'N/A'}
Pre-K Seats: ${seats || 'Not specified'}
Extended Day: ${extendedDay ? 'Yes' : 'No'}
Day Length: ${dayLength || 'Not specified'}

Please provide a JSON response with the following structure:
{
  "overview": "A 2-3 sentence overview of what parents should know about this type of center in this area. Don't claim to know specifics you weren't given.",
  "considerations": ["5-7 practical considerations specific to this type of program (${centerTypeLabel}) that parents should think about"],
  "tourQuestions": ["5-7 specific questions parents should ask when visiting this center, tailored to the program type"],
  "neighborhoodContext": "1-2 sentences about what families should consider regarding the ${boroughName} District ${district || ''} area for early childhood education. Be general and helpful."
}

Focus on practical, actionable advice. Don't make claims about the center's quality since there are no official ratings.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 700,
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("No response from AI");
      }

      const insights = JSON.parse(responseText);
      
      // Validate AI response structure before caching
      const isValidInsights = 
        typeof insights.overview === 'string' && insights.overview.length > 0 &&
        Array.isArray(insights.considerations) && insights.considerations.length > 0 &&
        Array.isArray(insights.tourQuestions) && insights.tourQuestions.length > 0 &&
        typeof insights.neighborhoodContext === 'string' && insights.neighborhoodContext.length > 0;
      
      if (isValidInsights) {
        // Save to cache for future requests (gracefully handle DB errors)
        try {
          await storage.saveNyceecAiInsight({
            locCode,
            overview: insights.overview,
            considerations: insights.considerations,
            tourQuestions: insights.tourQuestions,
            neighborhoodContext: insights.neighborhoodContext,
          });
        } catch (cacheError) {
          console.error("Failed to cache AI insights (non-fatal):", cacheError);
          // Continue - still return the insights even if caching failed
        }
      } else {
        console.warn("AI response invalid, not caching:", insights);
      }

      res.json({ ...insights, cached: false });
    } catch (error) {
      console.error("Error generating NYCEEC AI insights:", error);
      res.status(500).json({ error: "Failed to generate AI insights" });
    }
  });

  // NYCEEC Reviews endpoints
  app.get("/api/nyceec-centers/:locCode/reviews", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getNyceecReviews(req.params.locCode);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching NYCEEC reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.get("/api/nyceec-centers/:locCode/reviews/stats", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getNyceecRatingStats(req.params.locCode);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching NYCEEC review stats:", error);
      res.status(500).json({ error: "Failed to fetch review stats" });
    }
  });

  app.get("/api/nyceec-centers/:locCode/reviews/user", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const review = await storage.getUserNyceecReview(userId, req.params.locCode);
      res.json(review || null);
    } catch (error) {
      console.error("Error fetching user NYCEEC review:", error);
      res.status(500).json({ error: "Failed to fetch user review" });
    }
  });

  app.post("/api/nyceec-centers/:locCode/reviews", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const parsed = insertNyceecReviewSchema.safeParse({
        ...req.body,
        userId: userId,
        locCode: req.params.locCode,
      });
      
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid review data", details: parsed.error.errors });
      }
      
      // Check if user already has a review for this center
      const existingReview = await storage.getUserNyceecReview(userId, req.params.locCode);
      if (existingReview) {
        return res.status(400).json({ error: "You have already reviewed this center" });
      }
      
      const review = await storage.createNyceecReview(parsed.data);
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating NYCEEC review:", error);
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  app.patch("/api/nyceec-reviews/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const { rating, reviewText } = req.body;
      if (typeof rating !== "number" || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }
      
      const review = await storage.updateNyceecReview(
        parseInt(req.params.id),
        userId,
        rating,
        reviewText
      );
      
      if (!review) {
        return res.status(404).json({ error: "Review not found or unauthorized" });
      }
      
      res.json(review);
    } catch (error) {
      console.error("Error updating NYCEEC review:", error);
      res.status(500).json({ error: "Failed to update review" });
    }
  });

  app.delete("/api/nyceec-reviews/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      await storage.deleteNyceecReview(parseInt(req.params.id), userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting NYCEEC review:", error);
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // ========================================
  // NYC Private Schools API (NCES PSS data)
  // ========================================
  
  // List all private schools with optional filters
  app.get("/api/private-schools", async (req: Request, res: Response) => {
    try {
      const { borough, zipCode, religiousAffiliation, coedStatus, hasFinancialAid, search, programEmphasis } = req.query;
      
      const filters: {
        borough?: string;
        zipCode?: string;
        religiousAffiliation?: string;
        coedStatus?: string;
        hasFinancialAid?: boolean;
        search?: string;
        programEmphasis?: string;
      } = {};
      
      if (borough && typeof borough === 'string') filters.borough = borough;
      if (zipCode && typeof zipCode === 'string') filters.zipCode = zipCode;
      if (religiousAffiliation && typeof religiousAffiliation === 'string') filters.religiousAffiliation = religiousAffiliation;
      if (coedStatus && typeof coedStatus === 'string') filters.coedStatus = coedStatus;
      if (hasFinancialAid === 'true') filters.hasFinancialAid = true;
      if (search && typeof search === 'string') filters.search = search;
      if (programEmphasis && typeof programEmphasis === 'string') filters.programEmphasis = programEmphasis;
      
      // Only cache if no filters
      const hasFilters = Object.keys(filters).length > 0;
      const cacheKey = "all-private-schools";
      
      if (!hasFilters) {
        const cachedData = getCached(cacheKey);
        if (cachedData) {
          return res.json(cachedData);
        }
      }
      
      const schools = await storage.getPrivateSchools(hasFilters ? filters : undefined);
      
      if (!hasFilters) {
        setCache(cacheKey, schools, CACHE_TTL_LONG);
      }
      
      res.json(schools);
    } catch (error) {
      console.error("Error fetching private schools:", error);
      res.status(500).json({ error: "Failed to fetch private schools" });
    }
  });
  
  // Get individual private school by NCES ID
  app.get("/api/private-schools/:ncesId", async (req: Request, res: Response) => {
    try {
      const ncesId = req.params.ncesId;
      const cacheKey = `private-school-${ncesId}`;
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const school = await storage.getPrivateSchool(ncesId);
      if (!school) {
        return res.status(404).json({ error: "Private school not found" });
      }
      
      setCache(cacheKey, school, CACHE_TTL_LONG);
      res.json(school);
    } catch (error) {
      console.error("Error fetching private school:", error);
      res.status(500).json({ error: "Failed to fetch private school" });
    }
  });
  
  // Get private school historical data
  app.get("/api/private-schools/:ncesId/history", async (req: Request, res: Response) => {
    try {
      const ncesId = req.params.ncesId;
      const cacheKey = `private-school-history-${ncesId}`;
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const history = await storage.getPrivateSchoolHistory(ncesId);
      setCache(cacheKey, history, CACHE_TTL_LONG);
      res.json(history);
    } catch (error) {
      console.error("Error fetching private school history:", error);
      res.status(500).json({ error: "Failed to fetch private school history" });
    }
  });
  
  // Get private school summary stats
  app.get("/api/private-schools-stats", async (req: Request, res: Response) => {
    try {
      const cacheKey = "private-schools-stats";
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const schools = await storage.getPrivateSchools();
      
      // Calculate aggregate stats
      const stats = {
        totalSchools: schools.length,
        byBorough: {} as Record<string, number>,
        byReligiousAffiliation: {} as Record<string, number>,
        byCoedStatus: {} as Record<string, number>,
        avgEnrollment: 0,
        avgStudentTeacherRatio: 0,
      };
      
      let totalEnrollment = 0;
      let enrollmentCount = 0;
      let totalRatio = 0;
      let ratioCount = 0;
      
      for (const school of schools) {
        // Borough counts
        if (school.borough) {
          stats.byBorough[school.borough] = (stats.byBorough[school.borough] || 0) + 1;
        }
        
        // Religious affiliation counts
        if (school.religiousAffiliation) {
          stats.byReligiousAffiliation[school.religiousAffiliation] = 
            (stats.byReligiousAffiliation[school.religiousAffiliation] || 0) + 1;
        }
        
        // Coed status counts
        if (school.coedStatus) {
          stats.byCoedStatus[school.coedStatus] = (stats.byCoedStatus[school.coedStatus] || 0) + 1;
        }
        
        // Enrollment averages
        if (school.enrollment) {
          totalEnrollment += school.enrollment;
          enrollmentCount++;
        }
        
        // Student-teacher ratio averages
        if (school.studentTeacherRatio) {
          totalRatio += school.studentTeacherRatio;
          ratioCount++;
        }
      }
      
      stats.avgEnrollment = enrollmentCount > 0 ? Math.round(totalEnrollment / enrollmentCount) : 0;
      stats.avgStudentTeacherRatio = ratioCount > 0 ? Math.round((totalRatio / ratioCount) * 10) / 10 : 0;
      
      setCache(cacheKey, stats, CACHE_TTL_LONG);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching private school stats:", error);
      res.status(500).json({ error: "Failed to fetch private school stats" });
    }
  });

  // All school trends API (public) with caching
  app.get("/api/schools-trends", async (req: Request, res: Response) => {
    try {
      const cacheKey = "all-school-trends";
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }

      const trendsMap = await storage.getAllSchoolTrends();
      const trendsObject = Object.fromEntries(trendsMap);
      setCache(cacheKey, trendsObject);
      res.json(trendsObject);
    } catch (error) {
      console.error("Error fetching school trends:", error);
      res.status(500).json({ error: "Failed to fetch school trends" });
    }
  });

  // District Averages API (public) with caching
  app.get("/api/districts/averages", async (req: Request, res: Response) => {
    try {
      const cacheKey = "all-district-averages";
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }

      const averagesMap = await storage.getAllDistrictAverages();
      const averagesObject = Object.fromEntries(averagesMap);
      setCache(cacheKey, averagesObject);
      res.json(averagesObject);
    } catch (error) {
      console.error("Error fetching district averages:", error);
      res.status(500).json({ error: "Failed to fetch district averages" });
    }
  });

  app.get("/api/districts/citywide", async (req: Request, res: Response) => {
    try {
      const cacheKey = "citywide-averages";
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }

      const citywide = await storage.getCitywideAverages();
      setCache(cacheKey, citywide);
      res.json(citywide);
    } catch (error) {
      console.error("Error fetching citywide averages:", error);
      res.status(500).json({ error: "Failed to fetch citywide averages" });
    }
  });

  app.get("/api/districts/:district/averages", async (req: Request, res: Response) => {
    try {
      const district = parseInt(req.params.district, 10);
      if (isNaN(district)) {
        return res.status(400).json({ error: "Invalid district number" });
      }

      const cacheKey = `district-${district}-averages`;
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }

      const averages = await storage.getDistrictAverages(district);
      setCache(cacheKey, averages);
      res.json(averages);
    } catch (error) {
      console.error("Error fetching district averages:", error);
      res.status(500).json({ error: "Failed to fetch district averages" });
    }
  });

  // Blog data API - citywide historical trends for 2025 COVID recovery article
  app.get("/api/blog/covid-recovery-data", async (req: Request, res: Response) => {
    try {
      const cacheKey = "blog-covid-recovery-data";
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }

      const data = await storage.getCovidRecoveryBlogData();
      setCache(cacheKey, data);
      res.json(data);
    } catch (error) {
      console.error("Error fetching COVID recovery blog data:", error);
      res.status(500).json({ error: "Failed to fetch blog data" });
    }
  });

  // Favorites API (require authentication)
  app.get("/api/favorites", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  app.post("/api/favorites", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;

      const parsed = insertFavoriteSchema.safeParse({
        userId,
        schoolDbn: req.body.schoolDbn,
      });

      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error });
      }

      // Check if already favorited
      const isFav = await storage.isFavorite(userId, parsed.data.schoolDbn);
      if (isFav) {
        return res.status(409).json({ error: "School already favorited" });
      }

      // Check favorites limit for free users
      const limits = await getUserLimits(userId);
      const currentFavorites = await storage.getUserFavorites(userId);
      if (currentFavorites.length >= limits.MAX_FAVORITES) {
        return res.status(403).json({ 
          error: "Favorite limit reached",
          code: "FAVORITE_LIMIT_REACHED",
          message: `Free accounts can save up to ${FREE_TIER_LIMITS.MAX_FAVORITES} schools. Upgrade to Premium for unlimited favorites.`,
          limit: limits.MAX_FAVORITES,
          current: currentFavorites.length
        });
      }

      const favorite = await storage.addFavorite(parsed.data);
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ error: "Failed to add favorite" });
    }
  });

  app.delete("/api/favorites/:schoolDbn", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      await storage.removeFavorite(userId, req.params.schoolDbn);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  app.get("/api/favorites/check/:schoolDbn", async (req: any, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.json({ isFavorite: false });
      }

      const userId = req.session.userId;
      const isFav = await storage.isFavorite(userId, req.params.schoolDbn);
      res.json({ isFavorite: isFav });
    } catch (error) {
      console.error("Error checking favorite:", error);
      res.status(500).json({ error: "Failed to check favorite" });
    }
  });

  app.get("/api/favorites/batch", async (req: any, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.json({ favorites: {} });
      }

      const rawDbns = req.query.dbns as string;
      if (!rawDbns || typeof rawDbns !== 'string') {
        return res.json({ favorites: {} });
      }

      // Parse, trim, dedupe, and validate DBNs
      const dbnRegex = /^[0-9]{2}[A-Z]{1}[0-9]{3,4}$/i; // NYC school DBN format
      const parsedDbns = rawDbns.split(",")
        .map(d => d.trim().toUpperCase())
        .filter(d => d && dbnRegex.test(d));
      const dbns = Array.from(new Set(parsedDbns));
      
      if (dbns.length === 0) {
        return res.json({ favorites: {} });
      }

      // Limit batch size to prevent abuse
      const limitedDbns = dbns.slice(0, 100);

      const userId = req.session.userId;
      const favoriteStatus = await storage.getFavoriteStatusBatch(userId, limitedDbns);
      res.json({ favorites: favoriteStatus });
    } catch (error) {
      console.error("Error checking batch favorites:", error);
      res.status(500).json({ error: "Failed to check favorites" });
    }
  });

  // Application Tracker API (Premium feature - tracked schools)
  app.get("/api/tracked-schools", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Check premium status
      const isPremium = await isPremiumUser(userId);
      if (!isPremium) {
        return res.status(403).json({ 
          error: "Premium required",
          code: "PREMIUM_REQUIRED",
          message: "Application Tracker is a Premium feature. Upgrade to track schools."
        });
      }
      
      const trackedSchools = await storage.getUserTrackedSchools(userId);
      res.json(trackedSchools);
    } catch (error) {
      console.error("Error fetching tracked schools:", error);
      res.status(500).json({ error: "Failed to fetch tracked schools" });
    }
  });

  app.get("/api/tracked-schools/:schoolDbn", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const { schoolDbn } = req.params;
      
      // Check premium status
      const isPremium = await isPremiumUser(userId);
      if (!isPremium) {
        return res.json({ isTracked: false, data: null });
      }
      
      const tracked = await storage.getTrackedSchool(userId, schoolDbn);
      res.json({ isTracked: !!tracked, data: tracked || null });
    } catch (error) {
      console.error("Error checking tracked school:", error);
      res.status(500).json({ error: "Failed to check tracked school" });
    }
  });

  app.post("/api/tracked-schools", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Check premium status
      const isPremium = await isPremiumUser(userId);
      if (!isPremium) {
        return res.status(403).json({ 
          error: "Premium required",
          code: "PREMIUM_REQUIRED",
          message: "Application Tracker is a Premium feature. Upgrade to track schools."
        });
      }
      
      const parsed = insertTrackedSchoolSchema.safeParse({
        userId,
        schoolDbn: req.body.schoolDbn,
        status: req.body.status || 'researching',
        notes: req.body.notes,
        openHouseDate: req.body.openHouseDate ? new Date(req.body.openHouseDate) : undefined,
        tourDate: req.body.tourDate ? new Date(req.body.tourDate) : undefined,
        applicationDeadline: req.body.applicationDeadline ? new Date(req.body.applicationDeadline) : undefined,
        notifyOpenHouse: req.body.notifyOpenHouse ?? true,
        notifyTour: req.body.notifyTour ?? true,
        notifyDeadline: req.body.notifyDeadline ?? true,
      });
      
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error });
      }
      
      // Check if already tracked
      const existing = await storage.getTrackedSchool(userId, parsed.data.schoolDbn);
      if (existing) {
        return res.status(409).json({ error: "School already tracked" });
      }
      
      const tracked = await storage.addTrackedSchool(parsed.data);
      res.status(201).json(tracked);
    } catch (error) {
      console.error("Error adding tracked school:", error);
      res.status(500).json({ error: "Failed to add tracked school" });
    }
  });

  app.patch("/api/tracked-schools/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      
      const updates: any = {};
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.notes !== undefined) updates.notes = req.body.notes;
      if (req.body.openHouseDate !== undefined) updates.openHouseDate = req.body.openHouseDate ? new Date(req.body.openHouseDate) : null;
      if (req.body.tourDate !== undefined) updates.tourDate = req.body.tourDate ? new Date(req.body.tourDate) : null;
      if (req.body.applicationDeadline !== undefined) updates.applicationDeadline = req.body.applicationDeadline ? new Date(req.body.applicationDeadline) : null;
      if (req.body.notifyOpenHouse !== undefined) updates.notifyOpenHouse = req.body.notifyOpenHouse;
      if (req.body.notifyTour !== undefined) updates.notifyTour = req.body.notifyTour;
      if (req.body.notifyDeadline !== undefined) updates.notifyDeadline = req.body.notifyDeadline;
      
      const updated = await storage.updateTrackedSchool(id, userId, updates);
      if (!updated) {
        return res.status(404).json({ error: "Tracked school not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating tracked school:", error);
      res.status(500).json({ error: "Failed to update tracked school" });
    }
  });

  app.delete("/api/tracked-schools/:schoolDbn", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      await storage.removeTrackedSchool(userId, req.params.schoolDbn);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing tracked school:", error);
      res.status(500).json({ error: "Failed to remove tracked school" });
    }
  });

  // Geocoding API
  app.get("/api/geocode", async (req: Request, res: Response) => {
    try {
      const address = req.query.address as string;
      if (!address) {
        return res.status(400).json({ error: "Address parameter required" });
      }

      const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!googleMapsApiKey) {
        console.error("Google Maps API key not configured");
        return res.status(500).json({ error: "Google Maps API not configured" });
      }

      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`;
      console.log("Geocoding address:", address);
      const response = await fetch(url);
      const data = await response.json();
      console.log("Google Maps geocoding response:", JSON.stringify(data, null, 2));

      if (data.status === "REQUEST_DENIED") {
        console.error("Google Maps API key not authorized for Geocoding API");
        return res.status(500).json({ 
          error: "Google Maps Geocoding API not enabled. Please enable it in Google Cloud Console.",
          status: data.status 
        });
      }

      if (data.status !== "OK" || !data.results[0]) {
        console.error("Geocoding failed:", data.status, data.error_message);
        return res.json({ 
          error: data.error_message || "Address not found. Please check and try again.",
          status: data.status 
        });
      }

      const location = data.results[0].geometry.location;
      console.log("Geocoded location:", location);
      res.json({
        latitude: location.lat,
        longitude: location.lng,
      });
    } catch (error) {
      console.error("Error geocoding address:", error);
      res.status(500).json({ error: "Failed to geocode address" });
    }
  });

  // User Profile API
  app.get("/api/profile", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const profile = await storage.getUserProfile(userId);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/profile", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      
      const parsed = insertUserProfileSchema.safeParse({
        userId,
        homeAddress: req.body.homeAddress,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      });

      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error });
      }

      const profile = await storage.upsertUserProfile(parsed.data);
      
      if (parsed.data.latitude && parsed.data.longitude) {
        try {
          const zonedSchools = await updateUserZonedSchools(
            userId, 
            parsed.data.latitude, 
            parsed.data.longitude
          );
          console.log(`Updated zoned schools for user ${userId}:`, zonedSchools);
        } catch (zoneError) {
          console.error("Error calculating zoned schools:", zoneError);
        }
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error saving profile:", error);
      res.status(500).json({ error: "Failed to save profile" });
    }
  });
  
  app.get("/api/user-zones", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const zones = await getUserZonedSchools(userId);
      res.json(zones || { elementary: null, middle: null, high: null });
    } catch (error) {
      console.error("Error fetching user zones:", error);
      res.status(500).json({ error: "Failed to fetch zoned schools" });
    }
  });

  // In-memory cache for commute times (origin+dbn -> result)
  const commuteCache = new Map<string, { data: any; timestamp: number }>();
  const COMMUTE_CACHE_TTL = 1000 * 60 * 60; // 1 hour

  // Batch Commute Time API - fetch multiple commutes in parallel
  // NOTE: This route MUST be registered before /api/commute/:schoolDbn to avoid route matching issues
  app.get("/api/commute/batch", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      
      const isPremium = await isPremiumUser(userId);
      if (!isPremium) {
        return res.status(403).json({
          error: "Premium feature",
          code: "PREMIUM_REQUIRED", 
          message: "Commute time calculator is available for Premium subscribers.",
        });
      }
      
      const dbns = (req.query.dbns as string)?.split(",").filter(Boolean) || [];
      const originLat = req.query.lat ? parseFloat(req.query.lat as string) : null;
      const originLng = req.query.lng ? parseFloat(req.query.lng as string) : null;

      if (!originLat || !originLng) {
        return res.json({ commutes: {} });
      }

      if (dbns.length === 0) {
        return res.json({ commutes: {} });
      }

      const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!googleMapsApiKey) {
        return res.json({ commutes: {} });
      }

      const origin = `${originLat},${originLng}`;
      const now = Date.now();
      const results: Record<string, any> = {};
      const uncachedDbns: string[] = [];

      // Check cache first
      for (const dbn of dbns) {
        const cacheKey = `${origin}-${dbn}`;
        const cached = commuteCache.get(cacheKey);
        if (cached && now - cached.timestamp < COMMUTE_CACHE_TTL) {
          results[dbn] = cached.data;
        } else {
          uncachedDbns.push(dbn);
        }
      }

      // Fetch schools for uncached DBNs
      if (uncachedDbns.length > 0) {
        const schoolsToFetch = await Promise.all(
          uncachedDbns.map(dbn => storage.getSchool(dbn))
        );
        
        // Filter valid schools with locations
        const validSchools = uncachedDbns
          .map((dbn, i) => ({ dbn, school: schoolsToFetch[i] }))
          .filter(({ school }) => school?.latitude && school?.longitude);

        if (validSchools.length > 0) {
          // Build destinations string (max 25 per request)
          const destinations = validSchools
            .map(({ school }) => `${school!.latitude},${school!.longitude}`)
            .join("|");
          
          const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${encodeURIComponent(destinations)}&mode=transit&key=${googleMapsApiKey}`;

          const response = await fetch(url);
          const data = await response.json();

          if (data.status === "OK" && data.rows?.[0]?.elements) {
            validSchools.forEach(({ dbn }, index) => {
              const element = data.rows[0].elements[index];
              if (element?.status === "OK") {
                // Convert meters to miles (1 mile = 1609.34 meters)
                const distanceMiles = (element.distance.value / 1609.34).toFixed(1);
                const result = {
                  commuteTime: element.duration.text,
                  commuteMinutes: Math.round(element.duration.value / 60),
                  distance: `${distanceMiles} mi`,
                  distanceMeters: element.distance.value,
                };
                results[dbn] = result;
                commuteCache.set(`${origin}-${dbn}`, { data: result, timestamp: now });
              } else {
                results[dbn] = { error: "Route not available" };
              }
            });
          }
        }

        // Mark missing schools
        for (const dbn of uncachedDbns) {
          if (!results[dbn]) {
            results[dbn] = { error: "School location not available" };
          }
        }
      }

      res.json({ commutes: results });
    } catch (error) {
      console.error("Error calculating batch commute:", error);
      res.status(500).json({ error: "Failed to calculate commute times" });
    }
  });

  // Coordinate-based Commute API - for private schools and NYCEEC centers
  // Uses destination coordinates directly instead of school DBN
  // NOTE: This route MUST be registered before /api/commute/:schoolDbn to avoid route matching issues
  app.get("/api/commute/calculate", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Check premium status
      const isPremium = await isPremiumUser(userId);
      if (!isPremium) {
        return res.status(403).json({
          error: "Premium feature",
          code: "PREMIUM_REQUIRED", 
          message: "Commute time calculator is available for Premium subscribers.",
        });
      }
      
      const destLat = req.query.destLat ? parseFloat(req.query.destLat as string) : null;
      const destLng = req.query.destLng ? parseFloat(req.query.destLng as string) : null;
      const originLat = req.query.originLat ? parseFloat(req.query.originLat as string) : null;
      const originLng = req.query.originLng ? parseFloat(req.query.originLng as string) : null;

      if (!destLat || !destLng || !originLat || !originLng) {
        return res.json({ duration: null, distance: null, error: "Missing coordinates" });
      }

      const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!googleMapsApiKey) {
        return res.json({ duration: null, distance: null, error: "Google Maps API not configured" });
      }

      const origin = `${originLat},${originLng}`;
      const destination = `${destLat},${destLng}`;
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=transit&key=${googleMapsApiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" || !data.rows[0]?.elements[0]) {
        return res.json({ duration: null, distance: null, error: "Unable to calculate route" });
      }

      const element = data.rows[0].elements[0];
      if (element.status !== "OK") {
        return res.json({ duration: null, distance: null, error: "Route not available" });
      }

      // Convert meters to miles (1 mile = 1609.34 meters)
      const distanceMiles = (element.distance.value / 1609.34).toFixed(1);
      
      res.json({
        duration: element.duration.text,
        durationMinutes: Math.round(element.duration.value / 60),
        distance: `${distanceMiles} mi`,
        distanceMeters: element.distance.value,
      });
    } catch (error) {
      console.error("Error calculating commute by coordinates:", error);
      res.status(500).json({ error: "Failed to calculate commute time" });
    }
  });

  // Commute Time API - PREMIUM ONLY (requires authentication)
  // Single school commute lookup (must come AFTER /api/commute/batch and /api/commute/calculate)
  app.get("/api/commute/:schoolDbn", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Check premium status
      const isPremium = await isPremiumUser(userId);
      if (!isPremium) {
        return res.status(403).json({
          error: "Premium feature",
          code: "PREMIUM_REQUIRED", 
          message: "Commute time calculator is available for Premium subscribers. Upgrade to see travel times to schools.",
        });
      }
      
      const schoolDbn = req.params.schoolDbn;
      const originLat = req.query.lat ? parseFloat(req.query.lat as string) : null;
      const originLng = req.query.lng ? parseFloat(req.query.lng as string) : null;

      if (!originLat || !originLng) {
        return res.json({ commuteTime: null, distance: null, error: "No home address set" });
      }

      const school = await storage.getSchool(schoolDbn);
      if (!school || !school.latitude || !school.longitude) {
        return res.json({ commuteTime: null, distance: null, error: "School location not available" });
      }

      const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!googleMapsApiKey) {
        return res.json({ commuteTime: null, distance: null, error: "Google Maps API not configured" });
      }

      const origin = `${originLat},${originLng}`;
      const destination = `${school.latitude},${school.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=transit&key=${googleMapsApiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" || !data.rows[0]?.elements[0]) {
        return res.json({ commuteTime: null, distance: null, error: "Unable to calculate route" });
      }

      const element = data.rows[0].elements[0];
      if (element.status !== "OK") {
        return res.json({ commuteTime: null, distance: null, error: "Route not available" });
      }

      // Convert meters to miles (1 mile = 1609.34 meters)
      const distanceMiles = (element.distance.value / 1609.34).toFixed(1);
      
      res.json({
        commuteTime: element.duration.text,
        commuteMinutes: Math.round(element.duration.value / 60),
        distance: `${distanceMiles} mi`,
        distanceMeters: element.distance.value,
      });
    } catch (error) {
      console.error("Error calculating commute:", error);
      res.status(500).json({ error: "Failed to calculate commute time" });
    }
  });

  // Reviews API
  app.get("/api/schools/:dbn/reviews", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getReviews(req.params.dbn);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.get("/api/schools/:dbn/reviews/stats", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getSchoolRatingStats(req.params.dbn);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching review stats:", error);
      res.status(500).json({ error: "Failed to fetch review stats" });
    }
  });

  app.get("/api/schools/:dbn/reviews/user", async (req: any, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.json(null);
      }

      const userId = req.session.userId;
      const schoolDbn = req.params.dbn;
      const review = await storage.getUserReview(userId, schoolDbn);
      res.json(review || null);
    } catch (error) {
      console.error("Error fetching user review:", error);
      res.status(500).json({ error: "Failed to fetch user review" });
    }
  });

  app.post("/api/schools/:dbn/reviews", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const schoolDbn = req.params.dbn;

      const parsed = insertReviewSchema.safeParse({
        userId,
        schoolDbn,
        rating: req.body.rating,
        reviewText: req.body.reviewText || null,
      });

      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error });
      }

      // Check if user already reviewed this school
      const existingReview = await storage.getUserReview(userId, schoolDbn);
      if (existingReview) {
        // Update existing review
        const updated = await storage.updateReview(
          existingReview.id,
          userId,
          parsed.data.rating,
          parsed.data.reviewText || undefined
        );
        return res.json(updated);
      }

      // Create new review
      const review = await storage.createReview(parsed.data);
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  app.delete("/api/reviews/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const reviewId = parseInt(req.params.id);

      if (isNaN(reviewId)) {
        return res.status(400).json({ error: "Invalid review ID" });
      }

      await storage.deleteReview(reviewId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // AI Recommendations API - PREMIUM ONLY (Find My Match feature)
  let cachedRecommendationSummary: string | null = null;
  
  app.post("/api/recommendations", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Check premium status
      const isPremium = await isPremiumUser(userId);
      if (!isPremium) {
        return res.status(403).json({
          error: "Premium feature",
          code: "PREMIUM_REQUIRED",
          message: "Smart school recommendations (Find My Match) is available for Premium subscribers. Upgrade to get personalized school suggestions.",
        });
      }
      
      const { message } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      // Initialize OpenAI with Replit AI Integrations
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      // Create or use cached school summary for recommendations
      if (!cachedRecommendationSummary) {
        const schools = await storage.getSchools();
        // Get a comprehensive sample with special program info
        const schoolSample = schools.slice(0, 200).map(s => ({
          dbn: s.dbn,
          name: s.name,
          district: s.district,
          grade_band: s.grade_band,
          overall: Math.round(0.4 * s.academics_score + 0.3 * s.climate_score + 0.3 * s.progress_score),
          academics: s.academics_score,
          climate: s.climate_score,
          progress: s.progress_score,
          ela: s.ela_proficiency,
          math: s.math_proficiency,
          has_gt: s.has_gifted_talented,
          gt_type: s.gt_program_type,
          has_dual_language: s.has_dual_language,
          dl_languages: s.dual_language_languages,
          has_3k: s.has_3k,
          has_prek: s.has_prek,
          student_teacher_ratio: s.student_teacher_ratio,
          enrollment: s.enrollment,
        }));
        cachedRecommendationSummary = JSON.stringify(schoolSample, null, 2);
      }

      const systemMessage = `You are a helpful school recommendation assistant for NYC parents. Your job is to recommend the best schools based on parent preferences.

School Data Available (sample of 200 schools):
${cachedRecommendationSummary}

Key Fields:
- dbn: Unique school identifier (format: 01M015)
- grade_band: ES (Elementary K-5), MS (Middle 6-8), HS (High 9-12)
- has_gt/gt_type: Gifted & Talented programs ('district' or 'citywide')
- has_dual_language/dl_languages: Dual Language programs with languages offered
- has_3k/has_prek: Early childhood programs
- student_teacher_ratio: Class size indicator

Districts by Borough:
- Manhattan: 1-6
- Bronx: 7-12
- Brooklyn: 13-23, 32
- Queens: 24-30
- Staten Island: 31

Score Calculation: 40% academics + 30% climate + 30% progress

IMPORTANT: When recommending schools, you MUST:
1. Start with a 2-3 sentence explanation of your approach
2. Then list 5-8 school DBN codes, one per line
3. Format: DBN - Brief reason (10 words max)

Only recommend schools from the provided data. Use exact DBN codes.`;

      // Set up streaming response
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const messages: any[] = [
        { role: "system", content: systemMessage },
        { role: "user", content: message },
      ];

      // Stream response from OpenAI - low temperature to prevent hallucination
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        stream: true,
        temperature: 0.3,
        max_tokens: 1000,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // AI Chat API (authenticated)
  // Cache school summary and lookup maps to avoid fetching on every request
  let cachedSchoolSummary: string | null = null;
  let cachedSchoolByDbn: Map<string, any> | null = null;
  let cachedSchoolByNumber: Map<string, any[]> | null = null;
  
  async function getSchoolLookupMaps() {
    if (cachedSchoolByDbn && cachedSchoolByNumber) {
      return { byDbn: cachedSchoolByDbn, byNumber: cachedSchoolByNumber };
    }
    const allSchools = await storage.getSchools();
    cachedSchoolByDbn = new Map();
    cachedSchoolByNumber = new Map();
    for (const s of allSchools) {
      cachedSchoolByDbn.set(s.dbn, s);
      const numMatch = s.name.match(/\b(\d{1,4})\b/);
      if (numMatch) {
        const borough = s.dbn.slice(2, 3);
        const key = `${numMatch[1]}-${borough}`;
        if (!cachedSchoolByNumber.has(key)) cachedSchoolByNumber.set(key, []);
        cachedSchoolByNumber.get(key)!.push(s);
        const genericKey = numMatch[1];
        if (!cachedSchoolByNumber.has(genericKey)) cachedSchoolByNumber.set(genericKey, []);
        cachedSchoolByNumber.get(genericKey)!.push(s);
      }
    }
    return { byDbn: cachedSchoolByDbn, byNumber: cachedSchoolByNumber };
  }
  
  app.post("/api/chat", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const { message, conversationHistory, sessionId, currentSchoolDbn } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      // Check daily question limit for free users
      const limits = await getUserLimits(userId);
      const todayQuestionCount = await storage.getUserDailyQuestionCount(userId);
      if (todayQuestionCount >= limits.MAX_AI_QUESTIONS_PER_DAY) {
        return res.status(403).json({
          error: "Daily question limit reached",
          code: "AI_QUESTION_LIMIT_REACHED",
          message: `Free accounts are limited to ${FREE_TIER_LIMITS.MAX_AI_QUESTIONS_PER_DAY} AI questions per day. Upgrade to Premium for unlimited questions.`,
          limit: limits.MAX_AI_QUESTIONS_PER_DAY,
          used: todayQuestionCount
        });
      }

      // Fetch current school details if a DBN is provided
      let currentSchoolContext = "";
      if (currentSchoolDbn && typeof currentSchoolDbn === "string") {
        const currentSchool = await storage.getSchool(currentSchoolDbn);
        if (currentSchool) {
          const academics = typeof currentSchool.academics_score === 'number' ? currentSchool.academics_score : 0;
          const climate = typeof currentSchool.climate_score === 'number' ? currentSchool.climate_score : 0;
          const progress = typeof currentSchool.progress_score === 'number' ? currentSchool.progress_score : 0;
          const overallScore = Math.round(0.4 * academics + 0.3 * climate + 0.3 * progress);
          const dualLangInfo = currentSchool.has_dual_language && currentSchool.dual_language_languages?.length 
            ? 'Yes - ' + currentSchool.dual_language_languages.join(', ')
            : currentSchool.has_dual_language ? 'Yes' : 'No';
          
          // Fetch historical trend data for this school
          const schoolTrend = await storage.getSchoolTrend(currentSchoolDbn);
          let historicalTrendContext = "";
          
          // Only include historical data if we have actual scores (not just null values)
          const scoresWithData = schoolTrend.historicalData.filter(
            h => h.ela_proficiency != null || h.math_proficiency != null
          );
          
          if (scoresWithData.length > 0) {
            const trendDescription = schoolTrend.direction === 'improving' 
              ? `IMPROVING (up ${schoolTrend.changePercent.toFixed(1)}% overall)`
              : schoolTrend.direction === 'declining'
              ? `DECLINING (down ${Math.abs(schoolTrend.changePercent).toFixed(1)}% overall)`
              : schoolTrend.direction === 'stable'
              ? 'STABLE (minimal change)'
              : 'Insufficient data for trend analysis';
            
            // Clone and sort to avoid mutating the original array
            const sortedScores = [...scoresWithData].sort((a, b) => a.year - b.year);
            const yearlyData = sortedScores
              .map(h => `  ${h.year}: ELA ${h.ela_proficiency != null ? h.ela_proficiency + '%' : 'N/A'}, Math ${h.math_proficiency != null ? h.math_proficiency + '%' : 'N/A'}`)
              .join('\n');
            
            historicalTrendContext = `
Historical Test Score Trends (${scoresWithData.length} years of data):
Trend Direction: ${trendDescription}
Year-by-Year Data:
${yearlyData}
`;
          }
          
          currentSchoolContext = `
IMPORTANT: The user is currently viewing this school's page:
School: ${currentSchool.name} (DBN: ${currentSchool.dbn})
District: ${currentSchool.district}
Grade Band: ${currentSchool.grade_band}
Address: ${currentSchool.address || 'Not available'}

Current Scores (Most Recent Year):
- Overall Score: ${overallScore}
- Academics Score: ${academics}
- Climate Score: ${climate}
- Progress Score: ${progress}
- ELA Proficiency: ${currentSchool.ela_proficiency ?? 'N/A'}${currentSchool.ela_proficiency != null ? '%' : ''}
- Math Proficiency: ${currentSchool.math_proficiency ?? 'N/A'}${currentSchool.math_proficiency != null ? '%' : ''}
${historicalTrendContext}
Demographics:
- Enrollment: ${currentSchool.enrollment ?? 'N/A'} students
- Student-Teacher Ratio: ${currentSchool.student_teacher_ratio ?? 'N/A'}
- Economic Need Index: ${currentSchool.economic_need_index ?? 'N/A'}
- ELL Students: ${currentSchool.ell_percent != null ? currentSchool.ell_percent + '%' : 'N/A'}
- IEP Students: ${currentSchool.iep_percent != null ? currentSchool.iep_percent + '%' : 'N/A'}

Programs:
- Gifted & Talented: ${currentSchool.has_gifted_talented ? 'Yes' + (currentSchool.gt_program_type ? ' (' + currentSchool.gt_program_type + ')' : '') : 'No'}
- Dual Language: ${dualLangInfo}
- Has 3K/Pre-K: ${currentSchool.has_prek ? 'Yes' : 'No'}
- PTA Fundraising: ${currentSchool.pta_fundraising_total != null ? '$' + currentSchool.pta_fundraising_total.toLocaleString() : 'N/A'}

NYC School Survey Results:
- Student Safety: ${currentSchool.student_safety ?? 'N/A'}
- Student-Teacher Trust: ${currentSchool.student_teacher_trust ?? 'N/A'}
- Teacher Leadership: ${currentSchool.teacher_leadership ?? 'N/A'}
- Guardian Satisfaction: ${currentSchool.guardian_satisfaction ?? 'N/A'}
- Guardian Communication: ${currentSchool.guardian_communication ?? 'N/A'}

When the user asks about "this school", "the school", or uses phrases like "here" or "it", they are referring to ${currentSchool.name}.
Prioritize answering questions about this specific school. If they ask comparison questions, compare this school against others.
When asked about score trends or how scores have changed over time, USE THE HISTORICAL DATA PROVIDED ABOVE - do not say you don't have access to historical data.
`;
        }
      }

      // Dynamic school lookup: detect DBNs or school names in user message and fetch full details
      let mentionedSchoolsContext = "";
      const dbnPattern = /\b(\d{2}[MXKQR]\d{3})\b/gi;
      const dbnMatches = message.match(dbnPattern);
      const mentionedDbns = new Set<string>();
      
      if (dbnMatches) {
        dbnMatches.forEach((d: string) => mentionedDbns.add(d.toUpperCase()));
      }
      
      // Check for "PS 123" / "P.S. 123" / "IS 123" / "MS 123" style references, optionally with borough suffix
      const psPattern = /\b(?:P\.?S\.?|I\.?S\.?|M\.?S\.?|J\.?H\.?S\.?|H\.?S\.?)\s*(\d{1,4})\s*([MXKQR])?\b/gi;
      const boroughNameMap: Record<string, string> = {
        'manhattan': 'M', 'bronx': 'X', 'brooklyn': 'K', 'queens': 'Q', 'staten island': 'R',
      };
      const messageLower = message.toLowerCase();
      const detectedBorough = Object.keys(boroughNameMap).find(b => messageLower.includes(b));
      const boroughHint = detectedBorough ? boroughNameMap[detectedBorough] : null;
      
      const psMatches: { num: string; borough: string | null }[] = [];
      let psMatch: RegExpExecArray | null;
      while ((psMatch = psPattern.exec(message)) !== null) {
        const boroughSuffix = psMatch[2] ? psMatch[2].toUpperCase() : null;
        psMatches.push({ num: psMatch[1], borough: boroughSuffix || boroughHint });
      }
      
      const formatSchoolContext = (school: any): string => {
        const academics = typeof school.academics_score === 'number' ? school.academics_score : 0;
        const climate = typeof school.climate_score === 'number' ? school.climate_score : 0;
        const progress = typeof school.progress_score === 'number' ? school.progress_score : 0;
        const overallScore = Math.round(0.4 * academics + 0.3 * climate + 0.3 * progress);
        return `\nMentioned School: ${school.name} (DBN: ${school.dbn})
District: ${school.district} | Grade Band: ${school.grade_band} | Address: ${school.address || 'N/A'}
Overall Score: ${overallScore} | Academics: ${academics} | Climate: ${climate} | Progress: ${progress}
ELA: ${school.ela_proficiency ?? 'N/A'}% | Math: ${school.math_proficiency ?? 'N/A'}%
Enrollment: ${school.enrollment ?? 'N/A'} | Student-Teacher Ratio: ${school.student_teacher_ratio ?? 'N/A'}
`;
      };
      
      if (mentionedDbns.size > 0 || psMatches.length > 0) {
        const { byDbn, byNumber } = await getSchoolLookupMaps();
        
        for (const dbn of Array.from(mentionedDbns)) {
          if (dbn !== currentSchoolDbn && byDbn.has(dbn)) {
            mentionedSchoolsContext += formatSchoolContext(byDbn.get(dbn));
          }
        }
        
        for (const pm of psMatches) {
          const lookupKey = pm.borough ? `${pm.num}-${pm.borough}` : pm.num;
          const candidates = byNumber.get(lookupKey) || [];
          const filtered = candidates
            .filter((s: any) => !mentionedDbns.has(s.dbn) && s.dbn !== currentSchoolDbn)
            .slice(0, 3);
          
          for (const school of filtered) {
            mentionedDbns.add(school.dbn);
            mentionedSchoolsContext += formatSchoolContext(school);
          }
        }
      }
      
      if (mentionedSchoolsContext) {
        currentSchoolContext += `\nADDITIONAL SCHOOLS MENTIONED BY USER (use this data for accurate responses):${mentionedSchoolsContext}`;
      }

      // Initialize OpenAI with Replit AI Integrations
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      // Create or validate chat session ownership
      let currentSessionId = sessionId;
      if (currentSessionId) {
        // Verify the session belongs to the current user
        const existingSession = await storage.getChatSession(currentSessionId);
        if (!existingSession || existingSession.userId !== userId) {
          return res.status(403).json({ error: "Access denied to this chat session" });
        }
      } else {
        // Create a new session for the authenticated user
        const session = await storage.createChatSession({
          userId,
          title: message.substring(0, 100), // Use first part of message as title
        });
        currentSessionId = session.id;
      }

      // Store user message in database
      await storage.addChatMessage({
        sessionId: currentSessionId,
        role: "user",
        content: message,
      });

      // Create or use cached school summary - compact format for efficiency
      // Uses a condensed format to fit within context limits while maintaining filtering capability
      if (!cachedSchoolSummary) {
        const schools = await storage.getSchools();
        // Group schools by borough for efficient lookup
        const byBorough: Record<string, any[]> = { M: [], X: [], K: [], Q: [], R: [] };
        
        schools.forEach(s => {
          const borough = s.dbn.slice(2, 3) as keyof typeof byBorough;
          if (byBorough[borough]) {
            const overall = Math.round(0.4 * (s.academics_score || 0) + 0.3 * (s.climate_score || 0) + 0.3 * (s.progress_score || 0));
            const flags = [
              s.has_gifted_talented ? 'GT' + (s.gt_program_type === 'citywide' ? '+' : '') : '',
              s.has_dual_language ? 'DL' : '',
              s.has_3k ? '3K' : '',
              s.has_prek ? 'PK' : '',
            ].filter(Boolean).join(',');
            const entry: any = {
              d: s.dbn,
              n: s.name,
              g: s.grade_band,
              o: overall,
              f: flags || null,
            };
            if (s.enrollment != null) entry.e = s.enrollment;
            if (s.ela_proficiency != null) entry.el = s.ela_proficiency;
            if (s.math_proficiency != null) entry.ma = s.math_proficiency;
            if (s.district != null) entry.di = s.district;
            byBorough[borough].push(entry);
          }
        });
        
        // Sort each borough by overall score descending
        Object.keys(byBorough).forEach(b => {
          byBorough[b as keyof typeof byBorough].sort((a, c) => c.o - a.o);
        });
        
        cachedSchoolSummary = JSON.stringify(byBorough);
      }

      const systemMessage = `You are a focused, helpful assistant for parents looking for schools in NYC. You have access to COMPLETE data for ALL 1,500+ NYC public and charter schools.

ABSOLUTE RULE — NEVER FABRICATE DATA:
- You MUST ONLY cite school names, DBNs, enrollment numbers, scores, and statistics that appear EXACTLY in the data provided below.
- COPY school names CHARACTER-FOR-CHARACTER from the data. NEVER paraphrase, shorten, or alter a school name.
- If a piece of information (enrollment, ELA score, math score, address, etc.) is NOT in the data below, say "I don't have that specific data available" — NEVER guess or make up a number.
- NEVER invent or fabricate a DBN code. Every DBN you mention MUST appear in the school database below.
- If you are unsure about any fact, say so. Accuracy is more important than sounding helpful.
- Before citing ANY school, look it up in the database below and verify the name, DBN, enrollment, and scores match EXACTLY.

CRITICAL RULES - FOLLOW STRICTLY:

1. **ALWAYS ASK CLARIFYING QUESTIONS** before recommending schools if the user hasn't specified:
   - Grade level (elementary, middle, high school, early childhood/3K/Pre-K)
   - Borough or neighborhood preference
   - Any special programs they're looking for (G&T, Dual Language, etc.)
   
   Example: "I'd be happy to help! To give you the best recommendations, could you tell me:
   - What grade level are you looking for?
   - Which borough(s) are you considering?"

2. **STRICT FILTERING** — This is CRITICAL. When a user specifies criteria, ONLY recommend schools that match ALL their criteria. Check EVERY criterion before including a school:
   - If they say "elementary schools" → ONLY schools with grade_band containing K-5, PK-5, K-2, 3-5
   - If they say "high school" → ONLY schools with grade_band containing 9-12
   - If they say "Brooklyn" → ONLY schools from the "K" borough section
   - If they say "Bronx" → ONLY schools from the "X" borough section
   - If they say "Manhattan" → ONLY schools from the "M" borough section
   - If they say "upper Manhattan" → ONLY Manhattan (M) schools in districts 6, 10, 11, 12 (Washington Heights, Inwood, Harlem)
   - If they specify enrollment size (e.g., "large" or "1200+") → ONLY schools where the "e" field meets that threshold
   - If they say "G&T" → ONLY show schools with GT in their flags
   - NEVER include schools that fail ANY of the user's criteria. If you cannot find schools matching all criteria, say so honestly.
   
3. **CONCISE RESPONSES**: Limit recommendations to 3-5 schools maximum. Quality over quantity.

4. **ACKNOWLEDGE FILTERS**: Start your recommendation by confirming what criteria you're filtering by:
   "Based on your criteria (elementary schools in Brooklyn with Dual Language), here are my top 3 recommendations..."

5. **DATA ACCURACY**: When citing a school's enrollment, ELA, or math proficiency:
   - Use the EXACT numbers from the data fields: e=enrollment, el=ELA proficiency %, ma=Math proficiency %
   - If a field is missing for a school, say "data not available" — do NOT estimate

Borough codes in the data (the database is organized by these borough keys):
- M = Manhattan (DBN middle letter M)
- X = Bronx (DBN middle letter X)
- K = Brooklyn (DBN middle letter K)
- Q = Queens (DBN middle letter Q)
- R = Staten Island (DBN middle letter R)

District-to-area mapping (use di= field):
- Upper Manhattan: Districts 5, 6 (Harlem, Washington Heights, Inwood)
- Lower Manhattan: Districts 1, 2 (Lower East Side, Greenwich Village, Chelsea)
- Midtown Manhattan: Districts 2, 3, 4 (Upper West Side, East Harlem, Midtown)
- South Bronx: Districts 7, 8, 9
- North/East Bronx: Districts 10, 11, 12

Grade band patterns:
- Elementary: K-5, PK-5, K-2, 3-5, K-8 (elementary portion)
- Middle: 6-8, 5-8
- High: 9-12
- Early Childhood: 3K, PK, Pre-K

${currentSchoolContext}
School Data Overview:
- Districts: 1-32 (community school districts)
- Metrics: Overall Score (40% academics + 30% climate + 30% progress), ELA/Math Proficiency, Enrollment, Student-Teacher Ratio
- Programs: G&T (has_gt), Dual Language (has_dual_lang), 3K/Pre-K (has_3k, has_prek)
- HISTORICAL DATA: You have access to year-by-year test scores when provided above.

Score Ranges:
- 90+: Outstanding | 80-89: Strong | 70-79: Average | Below 70: Needs Improvement

SCHOOL DATABASE (grouped by borough, sorted by overall score):
Data format: d=DBN, n=Name, g=GradeBand, o=OverallScore, f=Flags (GT=Gifted&Talented, GT+=Citywide G&T, DL=DualLanguage, 3K=Has3K, PK=HasPreK), e=Enrollment, el=ELA%, ma=Math%, di=District
${cachedSchoolSummary}

When answering:
1. ONLY USE DATA FROM THE DATABASE ABOVE — never rely on your own training knowledge for school-specific facts
2. Reference actual school names, DBNs, and scores FROM THE DATA
3. Explain metrics in parent-friendly language
4. Keep responses focused and actionable
5. If asked about trends, use historical data when provided
6. If data isn't available for a specific question, say "I don't have that data" honestly — do NOT make up an answer`;

      // Set up streaming response
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Send session ID first if it's a new session
      if (!sessionId) {
        res.write(`data: ${JSON.stringify({ sessionId: currentSessionId })}\n\n`);
      }

      // Build conversation messages
      const messages: any[] = [
        { role: "system", content: systemMessage },
        ...(conversationHistory || []),
        { role: "user", content: message },
      ];

      // Stream response from OpenAI - low temperature to prevent hallucination of school data
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        stream: true,
        temperature: 0.3,
        max_tokens: 800,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Store assistant response in database
      await storage.addChatMessage({
        sessionId: currentSessionId,
        role: "assistant",
        content: fullResponse,
      });

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process chat message" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
        res.end();
      }
    }
  });

  // Get user's chat sessions
  app.get("/api/chat/sessions", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const sessions = await storage.getUserChatSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });

  // Get messages for a specific session
  app.get("/api/chat/sessions/:sessionId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const sessionId = parseInt(req.params.sessionId);

      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const session = await storage.getChatSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      const sessionWithMessages = await storage.getChatSessionWithMessages(sessionId);
      res.json(sessionWithMessages);
    } catch (error) {
      console.error("Error fetching chat session:", error);
      res.status(500).json({ error: "Failed to fetch chat session" });
    }
  });

  // Delete a chat session
  app.delete("/api/chat/sessions/:sessionId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const sessionId = parseInt(req.params.sessionId);

      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const session = await storage.getChatSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      await storage.deleteChatSession(sessionId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting chat session:", error);
      res.status(500).json({ error: "Failed to delete chat session" });
    }
  });

  // ============ STRIPE INTEGRATION ============
  
  // Initialize Stripe schema and sync (runs once on startup)
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      console.log('Initializing Stripe schema...');
      await runMigrations({ databaseUrl });
      console.log('Stripe schema ready');

      const stripeSync = await getStripeSync();
      
      // Set up managed webhook
      const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      if (webhookBaseUrl && webhookBaseUrl !== 'https://undefined') {
        const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`,
          { enabled_events: ['*'], description: 'NYC School Ratings webhook' }
        );
        console.log(`Stripe webhook configured: ${webhook.url}`);
        
        // Store UUID for webhook validation
        (app as any).stripeWebhookUuid = uuid;
      }

      // Sync existing Stripe data in background
      stripeSync.syncBackfill()
        .then(() => console.log('Stripe data synced'))
        .catch((err: any) => console.error('Error syncing Stripe data:', err));
    }
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }

  // Stripe webhook endpoint (uses rawBody from express.json verify)
  app.post("/api/stripe/webhook/:uuid?", async (req: any, res: Response) => {
    try {
      const signature = req.headers['stripe-signature'];
      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature' });
      }

      const sig = Array.isArray(signature) ? signature[0] : signature;
      const uuid = req.params.uuid || (app as any).stripeWebhookUuid;
      
      // Use rawBody captured by express.json verify callback
      const payload = req.rawBody as Buffer;
      if (!payload || !Buffer.isBuffer(payload)) {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      await WebhookHandlers.processWebhook(payload, sig, uuid);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Stripe webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  });

  // Get Stripe publishable key and mode (public)
  app.get("/api/stripe/config", async (req: Request, res: Response) => {
    try {
      const publishableKey = await getStripePublishableKey();
      const mode = await getStripeMode();
      res.json({ publishableKey, mode });
    } catch (error) {
      console.error("Error getting Stripe config:", error);
      res.status(500).json({ error: "Failed to get Stripe config" });
    }
  });

  // Contact form submission (public - no auth required)
  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      const parsed = insertContactSubmissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid submission data", details: parsed.error.flatten() });
      }

      const [submission] = await db.insert(contactSubmissions).values(parsed.data).returning();
      
      // Log for monitoring (emails sent to hello@nycschoolsratings.com can be configured via email service)
      console.log(`Contact form submission received from ${parsed.data.email} - Subject: ${parsed.data.subject}`);
      
      res.status(201).json({ success: true, id: submission.id });
    } catch (error) {
      console.error("Error saving contact submission:", error);
      res.status(500).json({ error: "Failed to save message" });
    }
  });

  // Get subscription status for current user
  app.get("/api/subscription", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if Season Pass has expired
      let status = user.subscriptionStatus || 'free';
      let plan = user.subscriptionPlan || 'free';
      
      if (user.subscriptionExpiresAt) {
        const now = new Date();
        if (now > user.subscriptionExpiresAt) {
          // Season Pass has expired - revert to free
          status = 'expired';
          plan = 'free';
          // Update the database to reflect expired status
          await storage.updateUserStripeInfo(userId, {
            subscriptionStatus: 'expired',
            subscriptionPlan: 'free',
          });
        }
      }

      // Return subscription info from user record
      res.json({
        status,
        plan,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
        expiresAt: user.subscriptionExpiresAt?.toISOString() || null,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });
  
  // Get user's free view school (the one school they can view fully unlocked)
  app.get("/api/user/free-view", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const freeViewSchoolDbn = await storage.getUserFreeViewSchool(userId);
      res.json({ freeViewSchoolDbn });
    } catch (error) {
      console.error("Error fetching free view school:", error);
      res.status(500).json({ error: "Failed to fetch free view school" });
    }
  });
  
  // Set user's free view school (only if not already set)
  app.post("/api/user/free-view", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const { dbn } = req.body;
      
      if (!dbn || typeof dbn !== 'string') {
        return res.status(400).json({ error: "Valid DBN is required" });
      }
      
      // Check if user already has a free view school set
      const existing = await storage.getUserFreeViewSchool(userId);
      if (existing) {
        return res.json({ freeViewSchoolDbn: existing, message: "Free view already claimed" });
      }
      
      // Set the free view school
      await storage.setUserFreeViewSchool(userId, dbn);
      res.json({ freeViewSchoolDbn: dbn.toUpperCase(), message: "Free view claimed successfully" });
    } catch (error) {
      console.error("Error setting free view school:", error);
      res.status(500).json({ error: "Failed to set free view school" });
    }
  });

  // Create checkout session for subscription
  app.post("/api/checkout", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const { priceId, mode = 'subscription' } = req.body;
      
      console.log("Checkout request:", { userId, priceId, mode });

      if (!priceId) {
        console.error("Checkout failed: Missing priceId");
        return res.status(400).json({ error: "Price ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        console.error("Checkout failed: User not found", userId);
        return res.status(404).json({ error: "User not found" });
      }
      
      console.log("User found:", { userId, email: user.email, hasStripeCustomer: !!user.stripeCustomerId });

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        console.log("Creating new Stripe customer for user:", userId);
        const customer = await stripeService.createCustomer(
          user.email,
          userId,
          user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined
        );
        customerId = customer.id;
        console.log("Created Stripe customer:", customerId);
        await storage.updateUserStripeInfo(userId, { stripeCustomerId: customerId });
      }

      // Create checkout session
      // In production, use custom domain; in development, use Replit domains
      const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
      const baseUrl = isProduction 
        ? 'https://nycschoolsratings.com'
        : `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || '').split(',')[0]}`;
      console.log("Creating checkout session with baseUrl:", baseUrl);
      
      // Support both subscription and one-time payment (Season Pass) modes
      const checkoutMode = mode === 'payment' ? 'payment' : 'subscription';
      
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/pricing?success=true`,
        `${baseUrl}/pricing?canceled=true`,
        userId,
        checkoutMode
      );

      console.log("Checkout session created:", session.id, "mode:", checkoutMode);
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error?.message || error);
      console.error("Full error:", JSON.stringify(error, null, 2));
      res.status(500).json({ error: "Failed to create checkout session", details: error?.message });
    }
  });

  // Guest checkout - no login required, creates account after payment
  app.post("/api/checkout/guest", async (req: Request, res: Response) => {
    try {
      const { priceId, mode = 'payment' } = req.body;
      
      console.log("Guest checkout request:", { priceId, mode });

      if (!priceId) {
        console.error("Guest checkout failed: Missing priceId");
        return res.status(400).json({ error: "Price ID is required" });
      }

      const stripe = await getUncachableStripeClient();
      
      // Create checkout session without a customer (Stripe will create one)
      // Email collection is required so we can create/link the user account after payment
      const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
      const baseUrl = isProduction 
        ? 'https://nycschoolsratings.com'
        : `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || '').split(',')[0]}`;
      
      const checkoutMode = mode === 'payment' ? 'payment' : 'subscription';
      
      const sessionParams: any = {
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: checkoutMode,
        success_url: `${baseUrl}/thanks?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        customer_creation: 'always', // Always create a Stripe customer
        metadata: {
          plan: 'season_pass',
          duration_months: '6',
          source: 'guest_checkout',
        },
      };

      const session = await stripe.checkout.sessions.create(sessionParams);

      console.log("Guest checkout session created:", session.id, "mode:", checkoutMode);
      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error("Error creating guest checkout session:", error?.message || error);
      res.status(500).json({ error: "Failed to create checkout session", details: error?.message });
    }
  });

  // Verify checkout session and auto-login (for /thanks page)
  app.get("/api/checkout/verify-session", async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.session_id as string;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }
      
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer'],
      });
      
      if (session.payment_status !== 'paid') {
        return res.status(400).json({ error: "Payment not completed", status: session.payment_status });
      }
      
      // Get customer email from session
      const customerEmail = session.customer_details?.email || 
        (typeof session.customer === 'object' ? session.customer?.email : null);
      
      if (!customerEmail) {
        return res.status(400).json({ error: "Customer email not found" });
      }
      
      const customerId = typeof session.customer === 'string' 
        ? session.customer 
        : session.customer?.id;
      
      if (!customerId) {
        return res.status(400).json({ error: "Customer ID not found" });
      }
      
      // Find or wait for user (webhook should have created them)
      let user = await storage.getUserByEmail(customerEmail.toLowerCase());
      
      // If user doesn't exist yet, webhook might not have processed
      // Try by Stripe customer ID as fallback
      if (!user) {
        user = await storage.getUserByStripeCustomerId(customerId);
      }
      
      if (!user) {
        // User should exist by now (created by webhook), but if not, inform client to retry
        return res.status(202).json({ 
          status: 'processing', 
          message: 'Your account is being set up. Please wait a moment.',
          email: customerEmail,
        });
      }
      
      // Auto-login the user by creating session
      (req as any).session.userId = user.id;
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionPlan: user.subscriptionPlan,
        }
      });
    } catch (error: any) {
      console.error("Error verifying checkout session:", error?.message || error);
      res.status(500).json({ error: "Failed to verify session", details: error?.message });
    }
  });

  // Magic link authentication endpoint - allows passwordless login
  app.get("/api/auth/magic-link/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token || token.length !== 64) {
        return res.status(400).json({ error: "Invalid magic link token" });
      }
      
      // Hash the token to compare with stored hash
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Find and validate the magic link token
      const magicLink = await storage.findMagicLinkToken(tokenHash);
      
      if (!magicLink) {
        return res.status(400).json({ error: "Invalid or expired magic link" });
      }
      
      // Check if token is expired
      if (new Date() > magicLink.expiresAt) {
        return res.status(400).json({ error: "Magic link has expired" });
      }
      
      // Check if token was already used
      if (magicLink.usedAt) {
        return res.status(400).json({ error: "Magic link has already been used" });
      }
      
      // Get the user
      const user = await storage.getUser(magicLink.userId);
      
      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }
      
      // Mark token as used
      await storage.markMagicLinkTokenUsed(magicLink.id);
      
      // Create session for the user (auto-login)
      (req as any).session.userId = user.id;
      
      // Return success with redirect URL
      res.json({ 
        success: true, 
        redirectUrl: '/schools',
        user: {
          id: user.id,
          email: user.email,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionPlan: user.subscriptionPlan,
        }
      });
    } catch (error: any) {
      console.error("Error processing magic link:", error?.message || error);
      res.status(500).json({ error: "Failed to process magic link" });
    }
  });

  // Get user's subscription status (with 1-minute cache to reduce Stripe API calls)
  app.get("/api/subscription-status", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Check cache first (1-minute TTL to reduce Stripe API overhead)
      const cacheKey = `subscription-status-${userId}`;
      const cachedResult = getCached(cacheKey);
      if (cachedResult) {
        return res.json(cachedResult);
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        const result = { isSubscribed: false, subscription: null };
        setCache(cacheKey, result, CACHE_TTL_SHORT);
        return res.json(result);
      }

      // First check for Season Pass (one-time purchase) in database
      if (user.subscriptionStatus === 'active' && 
          (user.subscriptionPlan === 'season_pass' || user.subscriptionPlan === 'premium')) {
        // Check if Season Pass has expired
        if (user.subscriptionExpiresAt) {
          const now = new Date();
          if (now > user.subscriptionExpiresAt) {
            // Season Pass expired
            await storage.updateUserStripeInfo(userId, {
              subscriptionStatus: 'expired',
              subscriptionPlan: 'free',
            });
            const result = { isSubscribed: false, subscription: null };
            setCache(cacheKey, result, CACHE_TTL_SHORT);
            invalidateUserCaches(userId);
            return res.json(result);
          }
        }
        
        // Active Season Pass
        const result = {
          isSubscribed: true,
          subscription: {
            id: 'season_pass',
            status: 'active',
            current_period_end: user.subscriptionExpiresAt ? Math.floor(user.subscriptionExpiresAt.getTime() / 1000) : null,
            cancel_at_period_end: false,
            plan: {
              nickname: 'Season Pass',
              amount: 2900,
              currency: 'usd',
              interval: '6 months',
            },
          }
        };
        setCache(cacheKey, result, CACHE_TTL_SHORT);
        return res.json(result);
      }

      // Fall back to checking Stripe subscription for recurring plans
      const subscriptionId = user.stripeSubscriptionId;
      if (!subscriptionId || typeof subscriptionId !== 'string') {
        const result = { isSubscribed: false, subscription: null };
        setCache(cacheKey, result, CACHE_TTL_SHORT);
        return res.json(result);
      }

      // Get subscription details from Stripe
      const subscription = await stripeService.getSubscriptionWithDetails(subscriptionId);
      
      if (!subscription || !['active', 'trialing', 'past_due'].includes(subscription.status)) {
        const result = { isSubscribed: false, subscription: null };
        setCache(cacheKey, result, CACHE_TTL_SHORT);
        return res.json(result);
      }

      // Get plan/price details from the subscription
      let planDetails = null;
      const priceItem = subscription.items?.data?.[0]?.price;
      if (priceItem && typeof priceItem !== 'string') {
        planDetails = {
          nickname: priceItem.nickname || 'Premium',
          amount: priceItem.unit_amount || 999,
          currency: priceItem.currency || 'usd',
          interval: priceItem.recurring?.interval || 'month',
        };
      }

      const result = {
        isSubscribed: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          current_period_end: (subscription as any).current_period_end,
          cancel_at_period_end: (subscription as any).cancel_at_period_end,
          plan: planDetails,
        }
      };
      setCache(cacheKey, result, CACHE_TTL_SHORT);
      res.json(result);
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  // Create customer portal session for managing subscription
  app.post("/api/customer-portal", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      // In production, use custom domain; in development, use Replit domains
      const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
      const baseUrl = isProduction 
        ? 'https://nycschoolsratings.com'
        : `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/settings`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // Get available products and prices (public)
  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
      
      // In production, return hardcoded Live product data since Stripe sync only has Sandbox data
      if (isProduction) {
        const liveProducts = [
          {
            id: 'prod_Tc0wGwu3FOifBE',
            name: 'Season Pass',
            description: 'Full access for 6 months. Unlimited comparisons, detailed score breakdowns, commute calculator, AI assistant, and smart recommendations. Built by a NYC Parent for NYC Parents.',
            active: true,
            metadata: { plan: 'season_pass', duration_months: '6' },
            prices: [{
              id: 'price_1SemubRwvWaTf8xfAYvh2qJl',
              unit_amount: 2900,
              currency: 'usd',
              recurring: null,
              active: true,
              metadata: { plan: 'season_pass', duration_months: '6' },
            }]
          },
          {
            id: 'prod_TYaCOkKkQ3j6Ah',
            name: 'Premium',
            description: 'Premium subscription with unlimited AI questions, commute calculator, and all features',
            active: true,
            metadata: { plan: 'premium' },
            prices: [{
              id: 'price_1SbT2LRwvWaTf8xf5VAvCHPq',
              unit_amount: 499,
              currency: 'usd',
              recurring: { interval: 'month' },
              active: true,
              metadata: {},
            }]
          }
        ];
        return res.json({ data: liveProducts });
      }
      
      // In development, use Stripe sync database (Sandbox products)
      const products = await stripeService.listProductsWithPrices();
      
      // Group prices by product
      const productsMap = new Map();
      for (const row of products) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
            metadata: row.price_metadata,
          });
        }
      }

      res.json({ data: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // ============ END STRIPE INTEGRATION ============

  // SEO: Sitemap.xml endpoint
  app.get("/sitemap.xml", async (req: Request, res: Response) => {
    try {
      const schools = await storage.getSchools();
      const today = new Date().toISOString().split('T')[0];
      
      // Static pages
      const staticPages = [
        { url: '/', changefreq: 'daily', priority: '1.0' },
        { url: '/map', changefreq: 'weekly', priority: '0.8' },
        { url: '/favorites', changefreq: 'weekly', priority: '0.7' },
        { url: '/compare', changefreq: 'weekly', priority: '0.7' },
        { url: '/recommendations', changefreq: 'weekly', priority: '0.8' },
        { url: '/early-childhood', changefreq: 'weekly', priority: '0.8' },
        { url: '/lottery-simulator', changefreq: 'monthly', priority: '0.7' },
        { url: '/blog', changefreq: 'weekly', priority: '0.7' },
        { url: '/pricing', changefreq: 'monthly', priority: '0.7' },
        { url: '/features', changefreq: 'monthly', priority: '0.6' },
        { url: '/release-notes', changefreq: 'weekly', priority: '0.5' },
        { url: '/faq', changefreq: 'monthly', priority: '0.6' },
        { url: '/developers', changefreq: 'monthly', priority: '0.7' },
        { url: '/developers/docs', changefreq: 'monthly', priority: '0.6' },
        { url: '/privacy', changefreq: 'monthly', priority: '0.3' },
        { url: '/terms', changefreq: 'monthly', priority: '0.3' },
      ];
      
      // Blog posts
      const blogPosts = [
        { slug: 'best-nyc-kindergartens-2026', lastmod: '2026-01-07' },
        { slug: 'best-nyc-elementary-schools-2026', lastmod: '2026-01-06' },
        { slug: 'best-nyc-middle-schools-2026', lastmod: '2026-01-05' },
        { slug: 'best-nyc-charter-schools-2026', lastmod: '2026-01-04' },
        { slug: 'nyc-prek-3k-kindergarten-admissions-demand-2025', lastmod: '2024-12-29' },
        { slug: 'nyc-schools-2025-covid-recovery', lastmod: '2024-12-09' },
        { slug: '2023-24-doe-data-analysis', lastmod: '2024-11-26' },
      ];
      
      // Generate XML
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      // Add static pages
      staticPages.forEach(page => {
        xml += '  <url>\n';
        xml += `    <loc>https://nycschoolsratings.com${page.url}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += '  </url>\n';
      });
      
      // Add blog post pages
      blogPosts.forEach(post => {
        xml += '  <url>\n';
        xml += `    <loc>https://nycschoolsratings.com/blog/${post.slug}</loc>\n`;
        xml += `    <lastmod>${post.lastmod}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += '  </url>\n';
      });
      
      // Add school pages
      schools.forEach(school => {
        const slug = `${school.dbn.toLowerCase()}-${school.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`;
        xml += '  <url>\n';
        xml += `    <loc>https://nycschoolsratings.com/school/${slug}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        xml += '  </url>\n';
      });
      
      // Add NYCEEC early childhood center pages
      try {
        const nyceecResponse = await fetch('https://data.cityofnewyork.us/resource/kiyv-ks3f.json?$limit=2000');
        if (nyceecResponse.ok) {
          const nyceecCenters = await nyceecResponse.json();
          nyceecCenters.forEach((center: any) => {
            if (center.loccode && center.locname) {
              const slug = `${center.loccode.toLowerCase()}-${center.locname.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`;
              xml += '  <url>\n';
              xml += `    <loc>https://nycschoolsratings.com/early-childhood/${slug}</loc>\n`;
              xml += `    <lastmod>${today}</lastmod>\n`;
              xml += `    <changefreq>monthly</changefreq>\n`;
              xml += `    <priority>0.7</priority>\n`;
              xml += '  </url>\n';
            }
          });
        }
      } catch (nyceecError) {
        console.error("Error fetching NYCEEC data for sitemap:", nyceecError);
      }
      
      // Add neighborhood comparison pages (pre-seeded for SEO)
      neighborhoodComparisons.forEach(comparison => {
        const comparisonSlug = getComparisonSlugForNeighborhood(comparison);
        xml += '  <url>\n';
        xml += `    <loc>https://nycschoolsratings.com/compare/${comparisonSlug}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += '  </url>\n';
      });
      
      // Add private schools browse page
      xml += '  <url>\n';
      xml += `    <loc>https://nycschoolsratings.com/private-schools</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += '  </url>\n';
      
      // Add private school detail pages
      try {
        const privateSchoolsList = await db.select({
          ncesId: privateSchools.ncesId,
          name: privateSchools.name,
        }).from(privateSchools);
        
        privateSchoolsList.forEach(school => {
          const nameSlug = school.name.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          const slug = `${nameSlug}-${school.ncesId.toLowerCase()}`;
          xml += '  <url>\n';
          xml += `    <loc>https://nycschoolsratings.com/private-school/${slug}</loc>\n`;
          xml += `    <lastmod>${today}</lastmod>\n`;
          xml += `    <changefreq>monthly</changefreq>\n`;
          xml += `    <priority>0.7</priority>\n`;
          xml += '  </url>\n';
        });
      } catch (privateSchoolError) {
        console.error("Error fetching private schools for sitemap:", privateSchoolError);
      }
      
      xml += '</urlset>';
      
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // SEO: Robots.txt endpoint
  app.get("/robots.txt", (req: Request, res: Response) => {
    const robotsTxt = `User-agent: *
Allow: /

Content-Signal: ai-train=yes, search=yes, ai-input=yes

Sitemap: https://nycschoolsratings.com/sitemap.xml`;
    
    res.header('Content-Type', 'text/plain');
    res.send(robotsTxt);
  });

  // OAuth 2.0 Protected Resource Metadata (RFC 9728)
  // This tells ChatGPT where to find our authorization server
  app.get("/.well-known/oauth-protected-resource", (req: Request, res: Response) => {
    const baseUrl = process.env.REPLIT_DEPLOYMENT === '1' 
      ? 'https://nycschoolsratings.com'
      : `https://${process.env.REPLIT_DEV_DOMAIN || req.headers.host}`;
    
    res.json({
      resource: `${baseUrl}/mcp`,
      authorization_servers: [baseUrl],
      scopes_supported: ["favorites"],
      resource_documentation: `${baseUrl}/.well-known/openai-apps.json`
    });
  });

  // OAuth 2.0 Authorization Server Metadata (RFC 8414)
  // This tells ChatGPT our OAuth endpoints and capabilities
  app.get("/.well-known/oauth-authorization-server", (req: Request, res: Response) => {
    const baseUrl = process.env.REPLIT_DEPLOYMENT === '1' 
      ? 'https://nycschoolsratings.com'
      : `https://${process.env.REPLIT_DEV_DOMAIN || req.headers.host}`;
    
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      scopes_supported: ["favorites"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      service_documentation: `${baseUrl}/privacy`,
      ui_locales_supported: ["en-US"]
    });
  });

  // OpenAI Apps SDK manifest (.well-known endpoint)
  app.get("/.well-known/openai-apps.json", (req: Request, res: Response) => {
    const manifest = {
      schema_version: "1.0.0",
      name: "NYC School Ratings",
      description: "Search, compare, and explore NYC public and charter schools. Get detailed information on academic scores, climate ratings, special programs, demographics, and historical trends for 1,500+ schools across all five boroughs.",
      logo_url: "https://nycschoolsratings.com/logo.png",
      contact_email: "hello@nycschoolsratings.com",
      privacy_policy_url: "https://nycschoolsratings.com/privacy",
      terms_of_service_url: "https://nycschoolsratings.com/terms",
      mcp_server: {
        url: "https://nycschoolsratings.com/mcp",
        protocol_version: "2024-11-05"
      },
      oauth: {
        client_id: "chatgpt-nycschoolratings",
        authorization_url: "https://nycschoolsratings.com/oauth/authorize",
        token_url: "https://nycschoolsratings.com/oauth/token",
        scope: "favorites",
        pkce_required: true
      },
      capabilities: {
        tools: true
      },
      categories: ["education", "local", "research"],
      keywords: [
        "NYC schools",
        "school ratings", 
        "New York City education",
        "public schools",
        "charter schools",
        "school comparison",
        "elementary schools",
        "middle schools",
        "high schools",
        "gifted and talented",
        "dual language programs"
      ]
    };
    res.json(manifest);
  });

  // MCP (Model Context Protocol) endpoint for OpenAI ChatGPT Apps SDK
  const { handleMCPRequest } = await import("./mcp");
  
  // GET handler for /mcp - returns usage info for browser visitors
  app.get("/mcp", (req: Request, res: Response) => {
    res.json({
      name: "NYC School Ratings MCP Server",
      description: "Model Context Protocol server for ChatGPT integration. This endpoint accepts JSON-RPC 2.0 POST requests only.",
      documentation: "https://nycschoolsratings.com/.well-known/openai-apps.json",
      tools: [
        "search_schools - Search NYC schools by criteria",
        "get_school_details - Get full details for a school",
        "compare_schools - Compare up to 4 schools",
        "get_school_history - Get historical test score trends",
        "get_top_schools - Get top-rated schools",
        "get_favorites - Get user's saved schools (requires auth)"
      ],
      usage: "Send POST requests with JSON-RPC 2.0 format. For authenticated requests, include Bearer token in Authorization header."
    });
  });
  
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const request = req.body;
      
      // Validate JSON-RPC format
      if (!request.jsonrpc || request.jsonrpc !== "2.0" || !request.method) {
        return res.status(400).json({
          jsonrpc: "2.0",
          id: request.id || null,
          error: {
            code: -32600,
            message: "Invalid Request"
          }
        });
      }

      // Check for Bearer token for authenticated requests
      let context: { userId?: string } = {};
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const user = await getUserFromAccessToken(token);
        if (user) {
          context.userId = user.id;
        }
      }

      const response = await handleMCPRequest(request, context);
      res.json(response);
    } catch (error: any) {
      console.error("MCP request error:", error);
      res.status(500).json({
        jsonrpc: "2.0",
        id: req.body?.id || null,
        error: {
          code: -32603,
          message: "Internal error"
        }
      });
    }
  });

  // MCP Server-Sent Events endpoint for streaming (optional, for future use)
  app.get("/mcp/sse", (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial connection event
    res.write('event: open\ndata: {}\n\n');

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(':keepalive\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
    });
  });

  // ==========================================
  // EMAIL / DRIP CAMPAIGN ENDPOINTS
  // ==========================================
  
  const { unsubscribeUser, processDripCampaign, isDripCampaignEnabled, setDripCampaignEnabled, sendTestDripEmail } = await import("./dripCampaign");
  
  // Unsubscribe from marketing emails
  app.get("/api/email/unsubscribe", async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        return res.status(400).send(`
          <html>
            <head><title>Invalid Request</title></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
              <h1 style="color: #dc2626;">Invalid Request</h1>
              <p>Missing or invalid user ID.</p>
            </body>
          </html>
        `);
      }
      
      const success = await unsubscribeUser(userId);
      
      if (success) {
        res.send(`
          <html>
            <head><title>Unsubscribed - NYC School Ratings</title></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
              <h1 style="color: #2563eb;">Successfully Unsubscribed</h1>
              <p>You've been unsubscribed from marketing emails.</p>
              <p style="color: #6b7280; margin-top: 20px;">
                You'll still receive important account-related emails (like password resets).
              </p>
              <p style="margin-top: 30px;">
                <a href="https://nycschoolsratings.com" style="color: #2563eb;">Return to NYC School Ratings</a>
              </p>
            </body>
          </html>
        `);
      } else {
        res.status(500).send(`
          <html>
            <head><title>Error - NYC School Ratings</title></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
              <h1 style="color: #dc2626;">Something went wrong</h1>
              <p>We couldn't process your unsubscribe request. Please try again or contact support.</p>
            </body>
          </html>
        `);
      }
    } catch (error: any) {
      console.error("Unsubscribe error:", error);
      res.status(500).send("An error occurred");
    }
  });
  
  // Cron job endpoint to refresh the Neighborhood Safety Index.
  // Pulls the last 24 months of NYPD complaints (5uac-w243 + qgea-i56i) and
  // recomputes per-school scores. Designed for monthly invocation via a
  // Replit Scheduled Deployment (`curl -X POST $URL/api/cron/safety-sync \
  // -H "x-cron-secret: $CRON_SECRET"`) or any external scheduler.
  // The job is fire-and-forget: returns 202 immediately so HTTP clients
  // don't time out, and writes the final result to `app_settings`.
  app.post("/api/cron/safety-sync", async (req: Request, res: Response) => {
    try {
      const expectedSecret = process.env.CRON_SECRET;
      if (!expectedSecret) {
        console.error('[SAFETY_CRON] CRON_SECRET environment variable is not configured');
        return res.status(503).json({ error: 'Cron endpoint not configured' });
      }
      const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
      if (cronSecret !== expectedSecret) {
        console.warn('[SAFETY_CRON] Unauthorized attempt to trigger safety sync', { ip: req.ip });
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const monthsParam = parseInt(String(req.query.months ?? ""), 10);
      const maxRowsParam = parseInt(String(req.query.maxRows ?? ""), 10);
      const skipPull = String(req.query.skipPull ?? "").toLowerCase() === "true";

      const opts = {
        months: Number.isFinite(monthsParam) && monthsParam > 0 ? monthsParam : 24,
        maxRows: Number.isFinite(maxRowsParam) && maxRowsParam > 0 ? maxRowsParam : undefined,
        skipPull,
      };

      console.log('[SAFETY_CRON] starting background safety sync', opts);
      // Fire-and-forget — full sync can run for several minutes
      void runSafetySync(opts)
        .then((result) => {
          console.log('[SAFETY_CRON] sync finished', {
            success: result.success,
            durationMs: result.durationMs,
            inserted: result.inserted,
            schoolCount: result.schoolCount,
            rowsWritten: result.rowsWritten,
            error: result.error,
          });
        })
        .catch((err) => {
          console.error('[SAFETY_CRON] sync threw uncaught error:', err);
        });

      res.status(202).json({
        accepted: true,
        message: 'Safety sync started in the background. Poll /api/admin/safety-sync/status for results.',
        opts,
        startedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[SAFETY_CRON] Error:', error);
      res.status(500).json({ error: 'Failed to start safety sync', message: error.message });
    }
  });

  // Admin endpoint to inspect the last safety-sync run (and current data freshness).
  app.get("/api/admin/safety-sync/status", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userEmail = req.user?.email;
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) ||
        ['hello@bigappledigital.nyc', 'biserd@gmail.com'];
      if (!userEmail || !adminEmails.includes(userEmail)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const status = await getSafetySyncStatus();
      res.json(status);
    } catch (error: any) {
      console.error('[SAFETY_CRON] status error:', error);
      res.status(500).json({ error: 'Failed to read safety-sync status', message: error.message });
    }
  });

  // Cron job endpoint to trigger drip campaign processing
  // This can be called by an external cron service (e.g., Uptime Robot, cron-job.org)
  // Requires CRON_SECRET environment variable to be set
  app.post("/api/cron/drip-campaign", async (req: Request, res: Response) => {
    try {
      const expectedSecret = process.env.CRON_SECRET;
      
      // Require CRON_SECRET to be configured
      if (!expectedSecret) {
        console.error('[DRIP_CRON] CRON_SECRET environment variable is not configured');
        return res.status(503).json({ error: 'Cron endpoint not configured' });
      }
      
      const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
      
      if (cronSecret !== expectedSecret) {
        console.warn('[DRIP_CRON] Unauthorized attempt to trigger drip campaign', { ip: req.ip });
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Check for test mode parameters
      const testEmail = req.query.testEmail as string | undefined;
      const dripNumber = req.query.dripNumber ? parseInt(req.query.dripNumber as string) : undefined;
      
      // Test mode: send specific email to specific user
      if (testEmail && dripNumber) {
        if (![1, 2, 3, 4].includes(dripNumber)) {
          return res.status(400).json({ error: 'dripNumber must be 1, 2, 3, or 4' });
        }
        
        console.log(`[DRIP_CRON] TEST MODE: Sending drip ${dripNumber} to ${testEmail}`);
        const result = await sendTestDripEmail(testEmail, dripNumber as 1 | 2 | 3 | 4);
        
        return res.json({
          testMode: true,
          ...result,
          timestamp: new Date().toISOString(),
        });
      }
      
      // Normal mode: process all eligible users
      console.log('[DRIP_CRON] Processing drip campaign...');
      const stats = await processDripCampaign();
      
      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[DRIP_CRON] Error:', error);
      res.status(500).json({ error: 'Failed to process drip campaign', message: error.message });
    }
  });
  
  // Admin endpoint to check drip campaign status
  app.get("/api/admin/drip-campaign/status", isAuthenticated, async (req: any, res: Response) => {
    try {
      // Check if user is admin (you might want to add a proper admin check)
      const userEmail = req.user?.email;
      const adminEmails = ['hello@bigappledigital.nyc'];
      
      if (!adminEmails.includes(userEmail)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const isEnabled = await isDripCampaignEnabled();
      res.json({ enabled: isEnabled });
    } catch (error: any) {
      console.error('Error checking drip campaign status:', error);
      res.status(500).json({ error: 'Failed to check status' });
    }
  });
  
  // Admin endpoint to enable/disable drip campaign
  app.post("/api/admin/drip-campaign/toggle", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userEmail = req.user?.email;
      const adminEmails = ['hello@bigappledigital.nyc'];
      
      if (!adminEmails.includes(userEmail)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled must be a boolean' });
      }
      
      const success = await setDripCampaignEnabled(enabled);
      res.json({ success, enabled });
    } catch (error: any) {
      console.error('Error toggling drip campaign:', error);
      res.status(500).json({ error: 'Failed to toggle campaign' });
    }
  });

  // Admin endpoint to send test newsletter email
  // Rate limiting: track last send time per admin to prevent abuse
  const newsletterRateLimits = new Map<string, number>();
  const NEWSLETTER_RATE_LIMIT_MS = 10000; // 10 seconds between sends
  
  app.post("/api/admin/send-newsletter-test", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userEmail = req.user?.email;
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['hello@bigappledigital.nyc', 'biserd@gmail.com'];
      
      if (!userEmail || !adminEmails.includes(userEmail)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      // Rate limiting check
      const lastSendTime = newsletterRateLimits.get(userEmail) || 0;
      const timeSinceLastSend = Date.now() - lastSendTime;
      if (timeSinceLastSend < NEWSLETTER_RATE_LIMIT_MS) {
        const waitTime = Math.ceil((NEWSLETTER_RATE_LIMIT_MS - timeSinceLastSend) / 1000);
        return res.status(429).json({ 
          error: `Rate limited. Please wait ${waitTime} seconds before sending another email.` 
        });
      }
      
      const { email, firstName } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email address is required' });
      }
      
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      
      const { sendNewsletterJanuary2025 } = await import('./emailService');
      const success = await sendNewsletterJanuary2025(email, firstName);
      
      // Update rate limit tracker on success
      if (success) {
        newsletterRateLimits.set(userEmail, Date.now());
      }
      
      res.json({ success, message: success ? 'Newsletter sent successfully' : 'Failed to send newsletter' });
    } catch (error: any) {
      // Handle Resend rate limit errors (429)
      if (error.statusCode === 429 || error.message?.includes('rate limit')) {
        console.error('Resend rate limit hit:', error);
        return res.status(429).json({ 
          error: 'Email provider rate limit reached. Please try again in a few minutes.' 
        });
      }
      console.error('Error sending newsletter:', error);
      res.status(500).json({ error: 'Failed to send newsletter' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
