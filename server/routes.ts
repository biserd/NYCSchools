import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import { storage } from "./storage";
import { insertFavoriteSchema, insertReviewSchema, insertUserProfileSchema, insertNyceecReviewSchema, insertTrackedSchoolSchema, insertContactSubmissionSchema, contactSubmissions, schoolZones, privateSchools, schoolSafetyIndex, getNyceecSlug, getPrivateSchoolSlug, getSchoolSlug } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { setupAuth, isAuthenticated } from "./auth";
import { generateApiKey, setIsPremiumChecker } from "./apiKeyAuth";
import apiV1Router from "./routesV1";
import { sameOriginGuard } from "./sameOriginGuard";
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
import { getSafetyIndex, runSafetySync, getSafetySyncStatus } from "./services/safetyIndex";
import { runAbuseDetection, pruneApiObservabilityData } from "./services/apiAbuseDetector";
import { flushApiLogsNow } from "./apiObservability";
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
  // Wire the apiKey middleware's premium check (avoids circular import).
  // The Developer API at /api/v1 doesn't use Express sessions â€” it
  // authenticates per-request via Bearer token â€” so it's safe to mount here,
  // before setupAuth installs session middleware.
  setIsPremiumChecker(isPremiumUser);
  app.use("/api/v1", apiV1Router);

  // Same-origin guard for the rest of `/api/*`. Blocks external scrapers
  // from hitting the internal endpoints (`/api/schools`, `/api/private-schools`,
  // `/api/nyceec-centers`, `/api/schools-trends`, etc.) that the website
  // itself uses to render its UI. The Developer API at `/api/v1/*` (above)
  // is the only sanctioned programmatic entry point. See sameOriginGuard.ts
  // for the full exclusion list and rationale.
  app.use(sameOriginGuard);

  // Shared admin guard. The custom auth middleware (server/auth.ts) only
  // populates req.session.userId â€” it does NOT set req.user â€” so we must
  // look the user up by their session id and then check the email against
  // ADMIN_EMAILS (with a sane fallback for the two known admin accounts).
  async function isRequestFromAdmin(req: any): Promise<boolean> {
    const userId = req.session?.userId as string | undefined;
    if (!userId) return false;
    const user = await storage.getUser(userId);
    const email = user?.email;
    if (!email) return false;
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) ||
      ['hello@bigappledigital.nyc', 'biserd@gmail.com'];
    return adminEmails.includes(email);
  }

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

  // ===== API Key Management (session-authenticated; for the Settings UI) =====
  // Must be registered AFTER setupAuth so req.session is populated.

  // List the current user's API keys (no plaintext is ever returned).
  app.get("/api/api-keys", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId as string;
      const keys = await storage.listApiKeysForUser(userId);
      res.json(
        keys.map((k) => ({
          id: k.id,
          name: k.name,
          keyPrefix: k.keyPrefix,
          createdAt: k.createdAt,
          lastUsedAt: k.lastUsedAt,
          revokedAt: k.revokedAt,
        })),
      );
    } catch (err) {
      console.error("Error listing API keys:", err);
      res.status(500).json({ message: "Failed to list API keys" });
    }
  });

  // Issue a new API key. Premium-gated. Returns the plaintext exactly once.
  // The `name` label is optional â€” if omitted/blank we assign a sensible default
  // so users can quickly mint a key with one click.
  app.post("/api/api-keys", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId as string;
      const isPremium = await isPremiumUser(userId);
      if (!isPremium) {
        return res.status(403).json({ message: "API access requires a Premium subscription." });
      }

      const rawName = String((req.body?.name ?? "")).trim();
      if (rawName.length > 80) {
        return res.status(400).json({ message: "Key name must be 80 characters or fewer." });
      }

      // Cap the number of active keys per user to keep things sane.
      const existing = await storage.listApiKeysForUser(userId);
      const activeCount = existing.filter((k) => !k.revokedAt).length;
      if (activeCount >= 5) {
        return res.status(400).json({
          message: "You can have at most 5 active API keys. Please revoke an unused key first.",
        });
      }

      // Default label when the user doesn't bother naming the key.
      const name = rawName || `API key ${activeCount + 1}`;

      const issued = generateApiKey();
      const created = await storage.createApiKey({
        userId,
        name,
        keyPrefix: issued.prefix,
        keyHash: issued.hash,
      });

      res.status(201).json({
        id: created.id,
        name: created.name,
        keyPrefix: created.keyPrefix,
        createdAt: created.createdAt,
        plaintextKey: issued.plaintext, // shown to the user exactly once
      });
    } catch (err) {
      console.error("Error creating API key:", err);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  // Revoke an API key.
  app.delete("/api/api-keys/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId as string;
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid key id" });
      }
      const revoked = await storage.revokeApiKey(id, userId);
      if (!revoked) {
        return res.status(404).json({ message: "API key not found" });
      }
      res.json({ id: revoked.id, revokedAt: revoked.revokedAt });
    } catch (err) {
      console.error("Error revoking API key:", err);
      res.status(500).json({ message: "Failed to revoke API key" });
    }
  });

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


  // Safe & Strong dashboard data: every public/charter school that has BOTH
  // an overall rating and a 0.5-mile safety index, with the 50/50 combined
  // score precomputed. Cached for 30 minutes.
  app.get("/api/safe-and-strong", async (_req: Request, res: Response) => {
    try {
      const cacheKey = "safe-and-strong:v1";
      const cached = getCached(cacheKey);
      if (cached) return res.json(cached);

      const SAFETY_RADIUS_DEFAULT = 805; // 0.5 miles
      const safetyRows = await db
        .select({
          schoolKey: schoolSafetyIndex.schoolKey,
          safetyIndex: schoolSafetyIndex.safetyIndex,
        })
        .from(schoolSafetyIndex)
        .where(
          and(
            eq(schoolSafetyIndex.schoolType, "public"),
            eq(schoolSafetyIndex.radiusMeters, SAFETY_RADIUS_DEFAULT),
          ),
        );
      const safetyByDbn = new Map<string, number>();
      for (const r of safetyRows) safetyByDbn.set(r.schoolKey, r.safetyIndex);

      const allSchools = await storage.getSchools();
      const slugify = (n: string) =>
        n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

      const rows = allSchools
        .map((s) => {
          const safety = safetyByDbn.get(s.dbn);
          if (safety === undefined) return null;
          const overall = Math.round(
            (s.academics_score || 0) * 0.4 +
              (s.climate_score || 0) * 0.3 +
              (s.progress_score || 0) * 0.3,
          );
          if (!overall) return null;
          const combined = Math.round((overall + safety) / 2);
          return {
            dbn: s.dbn,
            name: s.name,
            slug: `${s.dbn.toLowerCase()}-${slugify(s.name)}`,
            borough: s.dbn.charAt(2),
            district: s.district,
            gradeBand: s.grade_band,
            enrollment: s.enrollment || 0,
            overallScore: overall,
            safetyIndex: safety,
            combinedScore: combined,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      setCache(cacheKey, rows);
      res.json(rows);
    } catch (error) {
      console.error("Error building safe-and-strong dataset:", error);
      res.status(500).json({ error: "Failed to build dashboard data" });
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
ã~{öÚ$z{-®éÜj×åõ4T5$UBVçf—&öæÖVçBf&–&ÆR—2æ÷B6öæf–wW&VBr“°Ğ¢&WGW&â&W2ç7FGW2ƒS2’æ§6öâ‡²W'&÷#¢t7&öâVæGö–çBæ÷B6öæf–wW&VBrÒ“°Ğ¢ĞĞ¢6öç7B7&öå6V7&WBÒ&Wæ†VFW'5²w‚Ö7&öâ×6V7&WBuÒÇÂ&WçVW'’ç6V7&WC°Ğ¢–b†7&öå6V7&WBÓÒW‡V7FVE6V7&WB’°Ğ¢6öç6öÆRçv&â‚uµ4dUE•ô5$ôåÒVæWF†÷&—¦VBGFV×BFòG&–vvW"6fWG’7–æ2rÂ²—¢&Wæ—Ò“°Ğ¢&WGW&â&W2ç7FGW2ƒC’æ§6öâ‡²W'&÷#¢uVæWF†÷&—¦VBrÒ“°Ğ¢ĞĞ Ğ¢6öç7BÖöçF‡5&ÒÒ'6T–çB…7G&–ær‡&WçVW'’æÖöçF‡2óò""’Â“°Ğ¢6öç7BÖ…&÷w5&ÒÒ'6T–çB…7G&–ær‡&WçVW'’æÖ…&÷w2óò""’Â“°Ğ¢6öç7B6¶—VÆÂÒ7G&–ær‡&WçVW'’ç6¶—VÆÂóò""’çFôÆ÷vW$66R‚’ÓÓÒ'G'VR#°Ğ Ğ¢6öç7B÷G2Ò°Ğ¢ÖöçF‡3¢çVÖ&W"æ—4f–æ—FR†ÖöçF‡5&Ò’bbÖöçF‡5&ÒâòÖöçF‡5&Ò¢#BÀĞ¢Ö…&÷w3¢çVÖ&W"æ—4f–æ—FR†Ö…&÷w5&Ò’bbÖ…&÷w5&ÒâòÖ…&÷w5&Ò¢VæFVf–æVBÀĞ¢6¶—VÆÂÀĞ¢Ó°Ğ Ğ¢6öç6öÆRæÆör‚uµ4dUE•ô5$ôåÒ7F'F–ær&6¶w&÷VæB6fWG’7–æ2rÂ÷G2“°Ğ¢òòf—&RÖæBÖf÷&vWB(	BgVÆÂ7–æ26â'Vâf÷"6WfW&ÂÖ–çWFW0Ğ¢fö–B'Vå6fWG•7–æ2†÷G2Ğ¢çF†Vâ‚‡&W7VÇB’Óâ°Ğ¢6öç6öÆRæÆör‚uµ4dUE•ô5$ôåÒ7–æ2f–æ—6†VBrÂ°Ğ¢7V66W73¢&W7VÇBç7V66W72ÀĞ¢GW&F–öä×3¢&W7VÇBæGW&F–öä×2ÀĞ¢–ç6W'FVC¢&W7VÇBæ–ç6W'FVBÀĞ¢66†ööÄ6÷VçC¢&W7VÇBç66†ööÄ6÷VçBÀĞ¢&÷w5w&—GFVã¢&W7VÇBç&÷w5w&—GFVâÀĞ¢W'&÷#¢&W7VÇBæW'&÷"ÀĞ¢Ò“°Ğ¢ÒĞ¢æ6F6‚‚†W'"’Óâ°Ğ¢6öç6öÆRæW'&÷"‚uµ4dUE•ô5$ôåÒ7–æ2F‡&WrVæ6Vv‡BW'&÷#¢rÂW'"“°Ğ¢Ò“°Ğ Ğ¢&W2ç7FGW2ƒ#"’æ§6öâ‡°Ğ¢66WFVC¢G'VRÀĞ¢ÖW76vS¢u6fWG’7–æ27F'FVB–âF†R&6¶w&÷VæBâöÆÂö’öFÖ–â÷6fWG’×7–æ2÷7FGW2f÷"&W7VÇG2ârÀĞ¢÷G2ÀĞ¢7F'FVDC¢æWrFFR‚’çFô•4õ7G&–ær‚’ÀĞ¢Ò“°Ğ¢Ò6F6‚†W'&÷#¢ç’’°Ğ¢6öç6öÆRæW'&÷"‚uµ4dUE•ô5$ôåÒW'&÷#¢rÂW'&÷"“°Ğ¢&W2ç7FGW2ƒS’æ§6öâ‡²W'&÷#¢tf–ÆVBFò7F'B6fWG’7–æ2rÂÖW76vS¢W'&÷"æÖW76vRÒ“°Ğ¢ĞĞ¢Ò“°Ğ Ğ¢òòFÖ–âVæGö–çBFò–ç7V7BF†RÆ7B6fWG’×7–æ2'Vâ†æB7W'&VçBFFg&W6†æW72’àĞ¢ævWB‚"ö’öFÖ–â÷6fWG’×7–æ2÷7FGW2"Â—4WF†VçF–6FVBÂ7–æ2‡&W¢ç’Â&W3¢&W7öç6R’Óâ°Ğ¢G'’°Ğ¢–b‚†v—B—5&WVW7Dg&öÔFÖ–â‡&W’’’°Ğ¢&WGW&â&W2ç7FGW2ƒC2’æ§6öâ‡²W'&÷#¢tf÷&&–FFVârÒ“°Ğ¢ĞĞ¢6öç7B7FGW2Òv—BvWE6fWG•7–æ57FGW2‚“°Ğ¢&W2æ§6öâ‡7FGW2“°Ğ¢Ò6F6‚†W'&÷#¢ç’’°Ğ¢6öç6öÆRæW'&÷"‚uµ4dUE•ô5$ôåÒ7FGW2W'&÷#¢rÂW'&÷"“°Ğ¢&W2ç7FGW2ƒS’æ§6öâ‡²W'&÷#¢tf–ÆVBFò&VB6fWG’×7–æ27FGW2rÂÖW76vS¢W'&÷"æÖW76vRÒ“°Ğ¢ĞĞ¢Ò“°Ğ Ğ¢òò7&öâ¦ö"VæGö–çBFòG&–vvW"G&—6×–vâ&ö6W76–æpĞ¢òòF†—26â&R6ÆÆVB'’âW‡FW&æÂ7&öâ6W'f–6R†RærâÂWF–ÖR&ö&÷BÂ7&öâÖ¦ö"æ÷&rĞ¢òò&WV—&W25$ôåõ4T5$UBVçf—&öæÖVçBf&–&ÆRFò&R6W@Ğ¢ç÷7B‚"ö’ö7&öâöG&—Ö6×–vâ"Â7–æ2‡&W¢&WVW7BÂ&W3¢&W7öç6R’Óâ°Ğ¢G'’°Ğ¢6öç7BW‡V7FVE6V7&WBÒ&ö6W72æVçbä5$ôåõ4T5$UC°Ğ¢ Ğ¢òò&WV—&R5$ôåõ4T5$UBFò&R6öæf–wW&V@Ğ¢–b‚W‡V7FVE6V7&WB’°Ğ¢6öç6öÆRæW'&÷"‚u´E$•ô5$ôåÒ5$ôåõ4T5$UBVçf—&öæÖVçBf&–&ÆR—2æ÷B6öæf–wW&VBr“°Ğ¢&WGW&â&W2ç7FGW2ƒS2’æ§6öâ‡²W'&÷#¢t7&öâVæGö–çBæ÷B6öæf–wW&VBrÒ“°Ğ¢ĞĞ¢ Ğ¢6öç7B7&öå6V7&WBÒ&Wæ†VFW'5²w‚Ö7&öâ×6V7&WBuÒÇÂ&WçVW'’ç6V7&WC°Ğ¢ Ğ¢–b†7&öå6V7&WBÓÒW‡V7FVE6V7&WB’°Ğ¢6öç6öÆRçv&â‚u´E$•ô5$ôåÒVæWF†÷&—¦VBGFV×BFòG&–vvW"G&—6×–vârÂ²—¢&Wæ—Ò“°Ğ¢&WGW&â&W2ç7FGW2ƒC’æ§6öâ‡²W'&÷#¢uVæWF†÷&—¦VBrÒ“°Ğ¢ĞĞ¢ Ğ¢òò6†V6²f÷"FW7BÖöFR&ÖWFW'0Ğ¢6öç7BFW7DVÖ–ÂÒ&WçVW'’çFW7DVÖ–Â27G&–ærÂVæFVf–æVC°Ğ¢6öç7BG&—çVÖ&W"Ò&WçVW'’æG&—çVÖ&W"ò'6T–çB‡&WçVW'’æG&—çVÖ&W"27G&–ær’¢VæFVf–æVC°Ğ¢ Ğ¢òòFW7BÖöFS¢6VæB7V6–f–2VÖ–ÂFò7V6–f–2W6W Ğ¢–b‡FW7DVÖ–ÂbbG&—çVÖ&W"’°Ğ¢–b‚³Â"Â2ÂEÒæ–æ6ÇVFW2†G&—çVÖ&W"’’°Ğ¢&WGW&â&W2ç7FGW2ƒC’æ§6öâ‡²W'&÷#¢vG&—çVÖ&W"×W7B&RÂ"Â2Â÷"BrÒ“°Ğ¢ĞĞ¢ Ğ¢6öç6öÆRæÆör†´E$•ô5$ôåÒDU5BÔôDS¢6VæF–ærG&—G¶G&—çVÖ&W'ÒFòG·FW7DVÖ–ÇÖ“°Ğ¢6öç7B&W7VÇBÒv—B6VæEFW7DG&—VÖ–Â‡FW7DVÖ–ÂÂG&—çVÖ&W"2Â"Â2ÂB“°Ğ¢ Ğ¢&WGW&â&W2æ§6öâ‡°Ğ¢FW7DÖöFS¢G'VRÀĞ¢ââç&W7VÇBÀĞ¢F–ÖW7F×¢æWrFFR‚’çFô•4õ7G&–ær‚’ÀĞ¢Ò“°Ğ¢ĞĞ¢ Ğ¢òòæ÷&ÖÂÖöFS¢&ö6W72ÆÂVÆ–v–&ÆRW6W'0Ğ¢6öç6öÆRæÆör‚u´E$•ô5$ôåÒ&ö6W76–ærG&—6×–vââââr“°Ğ¢6öç7B7FG2Òv—B&ö6W74G&—6×–vâ‚“°Ğ¢ Ğ¢&W2æ§6öâ‡°Ğ¢7V66W73¢G'VRÀĞ¢7FG2ÀĞ¢F–ÖW7F×¢æWrFFR‚’çFô•4õ7G&–ær‚’ÀĞ¢Ò“°Ğ¢Ò6F6‚†W'&÷#¢ç’’°Ğ¢6öç6öÆRæW'&÷"‚u´E$•ô5$ôåÒW'&÷#¢rÂW'&÷"“°Ğ¢&W2ç7FGW2ƒS’æ§6öâ‡²W'&÷#¢tf–ÆVBFò&ö6W72G&—6×–vârÂÖW76vS¢W'&÷"æÖW76vRÒ“°Ğ¢ĞĞ¢Ò“°Ğ¢ Ğ¢òòFÖ–âVæGö–çBFò6†V6²G&—6×–vâ7FGW0Ğ¢ævWB‚"ö’öFÖ–âöG&—Ö6×–vâ÷7FGW2"Â—4WF†VçF–6FVBÂ7–æ2‡&W¢ç’Â&W3¢&W7öç6R’Óâ°Ğ¢G'’°Ğ¢–b‚†v—B—5&WVW7Dg&öÔFÖ–â‡&W’’’°Ğ¢&WGW&â&W2ç7FGW2ƒC2’æ§6öâ‡²W'&÷#¢tFÖ–â66W72&WV—&VBrÒ“°Ğ¢ĞĞ Ğ¢6öç7B—4Væ&ÆVBÒv—B—4G&—6×–väVæ&ÆVB‚“°Ğ¢&W2æ§6öâ‡²Væ&ÆVC¢—4Væ&ÆVBÒ“°Ğ¢Ò6F6‚†W'&÷#¢ç’’°Ğ¢6öç6öÆRæW'&÷"‚tW'&÷"6†V6¶–ærG&—6×–vâ7FGW3¢rÂW'&÷"“°Ğ¢&W2ç7FGW2ƒS’æ§6öâ‡²W'&÷#¢tf–ÆVBFò6†V6²7FGW2rÒ“°Ğ¢ĞĞ¢Ò“°Ğ¢ Ğ¢òòFÖ–âVæGö–çBFòVæ&ÆRöF—6&ÆRG&—6×–vàĞ¢ç÷7B‚"ö’öFÖ–âöG&—Ö6×–vâ÷FövvÆR"Â—4WF†VçF–6FVBÂ7–æ2‡&W¢ç’Â&W3¢&W7öç6R’Óâ°Ğ¢G'’°Ğ¢–b‚†v—B—5&WVW7Dg&öÔFÖ–â‡&W’’’°Ğ¢&WGW&â&W2ç7FGW2ƒC2’æ§6öâ‡²W'&÷#¢tFÖ–â66W72&WV—&VBrÒ“°Ğ¢ĞĞ Ğ¢6öç7B²Væ&ÆVBÒÒ&Wæ&öG“°Ğ¢–b‡G—VöbVæ&ÆVBÓÒv&ööÆVâr’°Ğ¢&WGW&â&W2ç7FGW2ƒC’æ§6öâ‡²W'&÷#¢vVæ&ÆVB×W7B&R&ööÆVârÒ“°Ğ¢ĞĞ¢ Ğ¢6öç7B7V66W72Òv—B6WDG&—6×–väVæ&ÆVB†Væ&ÆVB“°Ğ¢&W2æ§6öâ‡²7V66W72ÂVæ&ÆVBÒ“°Ğ¢Ò6F6‚†W'&÷#¢ç’’°Ğ¢6öç6öÆRæW'&÷"‚tW'&÷"FövvÆ–ærG&—6×–vã¢rÂW'&÷"“°Ğ¢&W2ç7FGW2ƒS’æ§6öâ‡²W'&÷#¢tf–ÆVBFòFövvÆR6×–vârÒ“°Ğ¢ĞĞ¢Ò“°Ğ Ğ¢òòFÖ–âVæGö–çBFò6VæBFW7BæWw6ÆWGFW"VÖ–ÀĞ¢òò&FRÆ–Ö—F–æs¢G&6²Æ7B6VæBF–ÖRW"FÖ–âFò&WfVçB'W6PĞ¢6öç7BæWw6ÆWGFW%&FTÆ–Ö—G2ÒæWrÖÇ7G&–ærÂçVÖ&W#â‚“°Ğ¢6öç7BäUu4ÄUEDU%õ$DUôÄ”Ô•EôÕ2Ò²òò6V6öæG2&WGvVVâ6VæG0Ğ¢ Ğ¢ç÷7B‚"ö’öFÖ–â÷6VæBÖæWw6ÆWGFW"×FW7B"Â—4WF†VçF–6FVBÂ7–æ2‡&W¢ç’Â&W3¢&W7öç6R’Óâ°Ğ¢G'’°Ğ¢–b‚†v—B—5&WVW7Dg&öÔFÖ–â‡&W’’’°Ğ¢&WGW&â&W2ç7FGW2ƒC2’æ§6öâ‡²W'&÷#¢tFÖ–â66W72&WV—&VBrÒ“°Ğ¢ĞĞ¢6öç7BFÖ–åW6W"Òv—B7F÷&vRævWEW6W"‡&Wç6W76–öâçW6W$–B27G&–ær“°Ğ¢6öç7BW6W$VÖ–ÂÒFÖ–åW6W"æVÖ–Â°Ğ Ğ¢òò&FRÆ–Ö—F–ær6†V6°Ğ¢6öç7BÆ7E6VæEF–ÖRÒæWw6ÆWGFW%&FTÆ–Ö—G2ævWB‡W6W$VÖ–Â’ÇÂ°Ğ¢6öç7BF–ÖU6–æ6TÆ7E6VæBÒFFRææ÷r‚’ÒÆ7E6VæEF–ÖS°Ğ¢–b‡F–ÖU6–æ6TÆ7E6VæBÂäUu4ÄUEDU%õ$DUôÄ”Ô•EôÕ2’°Ğ¢6öç7Bv—EF–ÖRÒÖF‚æ6V–Â‚„äUu4ÄUEDU%õ$DUôÄ”Ô•EôÕ2ÒF–ÖU6–æ6TÆ7E6VæB’ò“°Ğ¢&WGW&â&W2ç7FGW2ƒC#’’æ§6öâ‡² Ğ¢W'&÷#¢&FRÆ–Ö—FVBâÆV6Rv—BG·v—EF–ÖWÒ6V6öæG2&Vf÷&R6VæF–æræ÷F†W"VÖ–Âæ Ğ¢Ò“°Ğ¢ĞĞ¢ Ğ¢6öç7B²VÖ–ÂÂf—'7DæÖRÒÒ&Wæ&öG“°Ğ¢–b‚VÖ–Â’°Ğ¢&WGW&â&W2ç7FGW2ƒC’æ§6öâ‡²W'&÷#¢tVÖ–ÂFG&W72—2&WV—&VBrÒ“°Ğ¢ĞĞ¢ Ğ¢òò&6–2VÖ–Âf÷&ÖBfÆ–FF–öàĞ¢6öç7BVÖ–Å&VvW‚ÒõåµåÇ4Ò´µåÇ4ÒµÂåµåÇ4Ò²Bó°Ğ¢–b‚VÖ–Å&VvW‚çFW7B†VÖ–Â’’°Ğ¢&WGW&â&W2ç7FGW2ƒC’æ§6öâ‡²W'&÷#¢t–çfÆ–BVÖ–Âf÷&ÖBrÒ“°Ğ¢ĞĞ¢ Ğ¢6öç7B²6VæDæWw6ÆWGFW$¦çV'“##RÒÒv—B–×÷'B‚râöVÖ–Å6W'f–6Rr“°Ğ¢6öç7B7V66W72Òv—B6VæDæWw6ÆWGFW$¦çV'“##R†VÖ–ÂÂf—'7DæÖR“°Ğ¢ Ğ¢òòWFFR&FRÆ–Ö—BG&6¶W"öâ7V66W70Ğ¢–b‡7V66W72’°Ğ¢æWw6ÆWGFW%&FTÆ–Ö—G2ç6WB‡W6W$VÖ–ÂÂFFRææ÷r‚’“°Ğ¢ĞĞ¢ Ğ¢&W2æ§6öâ‡²7V66W72ÂÖW76vS¢7V66W72òtæWw6ÆWGFW"6VçB7V66W76gVÆÇ’r¢tf–ÆVBFò6VæBæWw6ÆWGFW"rÒ“°Ğ¢Ò6F6‚†W'&÷#¢ç’’°Ğ¢òò†æFÆR&W6VæB&FRÆ–Ö—BW'&÷'2ƒC#’Ğ¢–b†W'&÷"ç7FGW46öFRÓÓÒC#’ÇÂW'&÷"æÖW76vSòæ–æ6ÇVFW2‚w&FRÆ–Ö—Br’’°Ğ¢6öç6öÆRæW'&÷"‚u&W6VæB&FRÆ–Ö—B†—C¢rÂW'&÷"“°Ğ¢&WGW&â&W2ç7FGW2ƒC#’’æ§6öâ‡² Ğ¢W'&÷#¢tVÖ–Â&÷f–FW"&FRÆ–Ö—B&V6†VBâÆV6RG'’v–â–âfWrÖ–çWFW2âr Ğ¢Ò“°Ğ¢ĞĞ¢6öç6öÆRæW'&÷"‚tW'&÷"6VæF–æræWw6ÆWGFW#¢rÂW'&÷"“°Ğ¢&W2ç7FGW2ƒS’æ§6öâ‡²W'&÷#¢tf–ÆVBFò6VæBæWw6ÆWGFW"rÒ“°Ğ¢ĞĞ¢Ò“°Ğ Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ¢òòFWfVÆ÷W"’ö'6W'f&–Æ—G“¢FÖ–âF6†&ö&B²7&öâ¦ö'0Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ¢òòF†RFWfVÆ÷W"’„&V&W"Ö¶W’vFVBö’÷cò¢’w&—FW2öæR&÷rW"&WVW7@Ğ¢òòFò•÷&WVW7EöÆörf–”ö'6W'f&–Æ—G’çG2âF†W6RVæGö–çG2W‡÷6RF†@Ğ¢òòFFFòF†RFÖ–âT’BöFÖ–âö’×W6vRæB'VâF†R'W6RÖFWFV7F–öâ¦ö"àĞ Ğ¢òò7&öâVæGö–çBF†BW&f÷&×2F†RF–Ç’'VæRäBF†R'W6RÖFWFV7F–öâ7vVWàĞ¢òòG&–vvW"WfW'’RÖ–çWFW2g&öÒ&WÆ—B66†VGVÆVBFWÆ÷–ÖVçBv—Fƒ Ğ¢òò7W&ÂÕ‚õ5BEU$Âö’ö7&öâö’Öö'6W'f&–Æ—G’ÀĞ¢òòÔ‚'‚Ö7&öâ×6V7&WC¢D5$ôåõ4T5$UB Ğ¢òò&÷F‚¦ö'2&R–FV×÷FVçC¢'VæRFVÆWFW2öæÇ’öÆB&÷w2Â'W6RFWFV7F–öàĞ¢òòFRÖGWW2f–•ö'W6UöÆW'G26ò&R×'Vææ–ærv—F†–âF†RF’vöâwB&RÖVÖ–ÂàĞ¢ç÷7B‚"ö’ö7&öâö’Öö'6W'f&–Æ—G’"Â7–æ2‡&W¢&WVW7BÂ&W3¢&W7öç6R’Óâ°Ğ¢G'’°Ğ¢6öç7BW‡V7FVE6V7&WBÒ&ö6W72æVçbä5$ôåõ4T5$UC°Ğ¢–b‚W‡V7FVE6V7&WB’°Ğ¢6öç6öÆRæW'&÷"‚u´•ô5$ôåÒ5$ôåõ4T5$UBæ÷B6öæf–wW&VBr“°Ğ¢&WGW&â&W2ç7FGW2ƒS2’æ§6öâ‡²W'&÷#¢t7&öâVæGö–çBæ÷B6öæf–wW&VBrÒ“°Ğ¢ĞĞ¢6öç7B7&öå6V7&WBÒ&Wæ†VFW'5²w‚Ö7&öâ×6V7&WBuÒÇÂ&WçVW'’ç6V7&WC°Ğ¢–b†7&öå6V7&WBÓÒW‡V7FVE6V7&WB’°Ğ¢6öç6öÆRçv&â‚u´•ô5$ôåÒVæWF†÷&—¦VB7&öâGFV×BrÂ²—¢&Wæ—Ò“°Ğ¢&WGW&â&W2ç7FGW2ƒC’æ§6öâ‡²W'&÷#¢uVæWF†÷&—¦VBrÒ“°Ğ¢ĞĞ Ğ¢òòfÇW6‚ç’VæF–ærÆör&÷w2&Vf÷&R'Væ–ær6ò&÷rw&—GFVâ3F—0Ğ¢òòæB6V6öæBvòFöW6âwBW66RàĞ¢v—BfÇW6„”Æöw4æ÷r‚“°Ğ¢6öç7B'VæU&W7VÇBÒv—B'VæT”ö'6W'f&–Æ—G”FF‚“°Ğ¢6öç7BFWFV7E&W7VÇBÒv—B'Vä'W6TFWFV7F–öâ‚“°Ğ Ğ¢&W2æ§6öâ‡°Ğ¢7V66W73¢G'VRÀĞ¢'VæS¢'VæU&W7VÇBÀĞ¢FWFV7C¢FWFV7E&W7VÇBÀĞ¢F–ÖW7F×¢æWrFFR‚’çFô•4õ7G&–ær‚’ÀĞ¢Ò“°Ğ¢Ò6F6‚†W'&÷#¢ç’’°Ğ¢6öç6öÆRæW'&÷"‚u´•ô5$ôåÒW'&÷#¢rÂW'&÷"“°Ğ¢&W2ç7FGW2ƒS’æ§6öâ‡²W'&÷#¢t’ö'6W'f&–Æ—G’7&öâf–ÆVBrÂÖW76vS¢W'&÷"æÖW76vRÒ“°Ğ¢ĞĞ¢Ò“°Ğ Ğ¢òòtUBö’öFÖ–âö’×W6vRö÷fW'f–Wr(	BF÷ÖÆWfVÂF6†&ö&BFFàĞ¢òò&WGW&ç2WfW'’7F—fR¶W’v—F‚#F‚²vBF÷FÇ2ÂF÷×föÇVÖR¶W—2Âæ@Ğ¢òò&V6VçBC#’†—G2âF†RFÖ–âT’fWF6†W2F†—2öæ6RæB&VæFW'2F†RF&ÆRàĞ¢ævWB‚"ö’öFÖ–âö’×W6vRö÷fW'f–Wr"Â—4WF†VçF–6FVBÂ7–æ2‡&W¢ç’Â&W3¢&W7öç6R’Óâ°Ğ¢G'’°Ğ¢–b‚†v—B—5&WVW7Dg&öÔFÖ–â‡&W’’’°Ğ¢&WGW&â&W2ç7FGW2ƒC2’æ§6öâ‡²W'&÷#¢tFÖ–â66W72&WV—&VBrÒ“°Ğ¢ĞĞ¢òòfÇW6‚6òF†RF6†&ö&B&VfÆV7G2F†RfW'’ÆFW7B&WVW7G2Âæ÷B§W7@Ğ¢òòv†Bw2Ç&VG’&VVâW'6—7FVB'’F†RW&–öF–2fÇW6†W"àĞ¢v—BfÇW6„”Æöw4æ÷r‚“°Ğ Ğ¢6öç7Bæ÷rÒFFRææ÷r‚“°Ğ¢6öç7BÆ7C#F‚ÒæWrFFR†æ÷rÒ#B¢c¢có“°Ğ¢6öç7BÆ7CvBÒæWrFFR†æ÷rÒr¢#B¢c¢có“°Ğ Ğ¢6öç7BÆÄ¶W—2Òv—B7F÷&vRæÆ—7DÆÄ”¶W—5v—F…W6W'2‚“°Ğ¢6öç7B7VÖÖ&–W2Òv—B&öÖ—6RæÆÂ€Ğ¢ÆÄ¶W—2æÖ†7–æ2†²’Óâ°Ğ¢6öç7B·S#BÂSvEÒÒv—B&öÖ—6RæÆÂ…°Ğ¢7F÷&vRævWD”¶W•W6vU7VÖÖ'’†²æ–BÂÆ7C#F‚’ÀĞ¢7F÷&vRævWD”¶W•W6vU7VÖÖ'’†²æ–BÂÆ7CvB’ÀĞ¢Ò“°Ğ¢&WGW&â°Ğ¢–C¢²æ–BÀĞ¢W6W$–C¢²çW6W$–BÀĞ¢÷væW$VÖ–Ã¢²æ÷væW$VÖ–ÂÀĞ¢æÖS¢²ææÖRÀĞ¢¶W•&Vf—ƒ¢²æ¶W•&Vf—‚ÀĞ¢7&VFVDC¢²æ7&VFVDBÀĞ¢Æ7EW6VDC¢²æÆ7EW6VDBÀĞ¢&Wfö¶VDC¢²ç&Wfö¶VDBÀĞ¢W6vS#Fƒ¢S#BÀĞ¢W6vSvC¢SvBÀĞ¢Ó°Ğ¢Ò’ÀĞ¢“°Ğ Ğ¢6öç7BF÷#F‚Òv—B7F÷&vRæÆ—7EF÷”¶W—4'•föÇVÖR†Æ7C#F‚Â“°Ğ¢6öç7B&V6VçCC#—2Òv—B7F÷&vRæÆ—7E&V6VçE&FTÆ–Ö—D†—G2ƒ#“°Ğ Ğ¢&W2æ§6öâ‡°Ğ¢æ÷s¢æWrFFR‚’çFô•4õ7G&–ær‚’ÀĞ¢¶W—3¢7VÖÖ&–W2ÀĞ¢F÷#F‚ÀĞ¢&V6VçCC#—2ÀĞ¢Ò“°Ğ¢Ò6F6‚†W'&÷#¢ç’’°Ğ¢6öç6öÆRæW'&÷"‚u´DÔ”åô•õU4tUÒ÷fW'f–WrW'&÷#¢rÂW'&÷"“°Ğ¢&W2ç7FGW2ƒS’æ§6öâ‡²W'&÷#¢tf–ÆVBFòÆöB’W6vR÷fW'f–WrrÂÖW76vS¢W'&÷"æÖW76vRÒ“°Ğ¢ĞĞ¢Ò“°Ğ Ğ¢òòtUBö’öFÖ–âö’×W6vRö¶W’ó¦–B(	BG&–ÆÂÖF÷vâf÷"öæR¶W’àĞ¢ævWB‚"ö’öFÖ–âö’×W6vRö¶W’ó¦–B"Â—4WF†VçF–6FVBÂ7–æ2‡&W¢ç’Â&W3¢&W7öç6R’Óâ°Ğ¢G'’°Ğ¢–b‚†v—B—5&WVW7Dg&öÔFÖ–â‡&W’’’°Ğ¢&WGW&â&W2ç7FGW2ƒC2’æ§6öâ‡²W'&÷#¢tFÖ–â66W72&WV—&VBrÒ“°Ğ¢ĞĞ¢6öç7B–BÒ'6T–çB‡&Wç&×2æ–BÂ“°Ğ¢–b‚çVÖ&W"æ—4f–æ—FR†–B’’°Ğ¢&WGW&â&W2ç7FGW2ƒC’æ§6öâ‡²W'&÷#¢t–çfÆ–B¶W’–BrÒ“°Ğ¢ĞĞ¢v—BfÇW6„”Æöw4æ÷r‚“°Ğ Ğ¢6öç7BÆ7C#F‚ÒæWrFFR„FFRææ÷r‚’Ò#B¢c¢có“°Ğ¢6öç7B·&V6VçE&WVW7G2Â—2Â'•F…ÒÒv—B&öÖ—6RæÆÂ…°Ğ¢7F÷&vRæÆ—7E&V6VçE&WVW7G4f÷$¶W’†–BÂ’ÀĞ¢7F÷&vRæÆ—7E&V6VçD—4f÷$¶W’†–BÂÆ7C#F‚’ÀĞ¢7F÷&vRæ6÷VçE&WVW7G4'•F„f÷$¶W’†–BÂÆ7C#F‚’ÀĞ¢Ò“°Ğ¢&W2æ§6öâ‡²¶W”–C¢–BÂ&V6VçE&WVW7G2Â—2Â'•F‚Ò“°Ğ¢Ò6F6‚†W'&÷#¢ç’’°Ğ¢6öç6öÆRæW'&÷"‚u´DÔ”åô•õU4tUÒ¶W’FWF–ÂW'&÷#¢rÂW'&÷"“°Ğ¢&W2ç7FGW2ƒS’æ§6öâ‡²W'&÷#¢tf–ÆVBFòÆöB¶W’FWF–ÂrÂÖW76vS¢W'&÷"æÖW76vRÒ“°Ğ¢ĞĞ¢Ò“°Ğ Ğ¢òòõ5Bö’öFÖ–âö’×W6vRö¶W’ó¦–B÷&Wfö¶R(	BFÖ–â÷fW'&–FRàĞ¢òòF—7F–æ7Bg&öÒF†RW6W"Öf6–ærDTÄUDRö’ö’Ö¶W—2ó¦–Bv†–6‚&WV—&W0Ğ¢òò÷væW'6†—²FÖ–ç26â&Wfö¶Rç’¶W’'’–BàĞ¢ç÷7B‚"ö’öFÖ–âö’×W6vRö¶W’ó¦–B÷&Wfö¶R"Â—4WF†VçF–6FVBÂ7–æ2‡&W¢ç’Â&W3¢&W7öç6R’Óâ°Ğ¢G'’°Ğ¢–b‚†v—B—5&WVW7Dg&öÔFÖ–â‡&W’’’°Ğ¢&WGW&â&W2ç7FGW2ƒC2’æ§6öâ‡²W'&÷#¢tFÖ–â66W72&WV—&VBrÒ“°Ğ¢ĞĞ¢6öç7B–BÒ'6T–çB‡&Wç&×2æ–BÂ“°Ğ¢–b‚çVÖ&W"æ—4f–æ—FR†–B’’°Ğ¢&WGW&â&W2ç7FGW2ƒC’æ§6öâ‡²W'&÷#¢t–çfÆ–B¶W’–BrÒ“°Ğ¢ĞĞ¢6öç7B&Wfö¶VBÒv—B7F÷&vRæFÖ–å&Wfö¶T”¶W’†–B“°Ğ¢–b‚&Wfö¶VB’°Ğ¢&WGW&â&W2ç7FGW2ƒCB’æ§6öâ‡²W'&÷#¢t’¶W’æ÷Bf÷VæBrÒ“°Ğ¢ĞĞ¢6öç7BFÖ–åW6W"Òv—B7F÷&vRævWEW6W"‡&Wç6W76–öâçW6W$–B27G&–ær“°Ğ¢6öç6öÆRæÆör†´DÔ”åô•õU4tUÒFÖ–âG¶FÖ–åW6W#òæVÖ–Âóò&Wç6W76–öâçW6W$–GÒ&Wfö¶VB¶W’G¶–GÖ“°Ğ¢&W2æ§6öâ‡²7V66W73¢G'VRÂ¶W“¢²–C¢&Wfö¶VBæ–BÂ&Wfö¶VDC¢&Wfö¶VBç&Wfö¶VDBÒÒ“°Ğ¢Ò6F6‚†W'&÷#¢ç’’°Ğ¢6öç6öÆRæW'&÷"‚u´DÔ”åô•õU4tUÒ&Wfö¶RW'&÷#¢rÂW'&÷"“°Ğ¢&W2ç7FGW2ƒS’æ§6öâ‡²W'&÷#¢tf–ÆVBFò&Wfö¶R¶W’rÂÖW76vS¢W'&÷"æÖW76vRÒ“°Ğ¢ĞĞ¢Ò“°Ğ Ğ¢6öç7B‡GG6W'fW"Ò7&VFU6W'fW"†“°Ğ Ğ¢&WGW&â‡GG6W'fW#°Ğ§ĞĞ