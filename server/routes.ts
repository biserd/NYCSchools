import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFavoriteSchema, insertReviewSchema, insertUserProfileSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./auth";
import OpenAI from "openai";
import compression from "compression";

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Add compression middleware
  app.use(compression());

  // Auth middleware
  setupAuth(app);

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

  app.get("/api/schools/:dbn", async (req: Request, res: Response) => {
    try {
      const school = await storage.getSchool(req.params.dbn);
      if (!school) {
        return res.status(404).json({ error: "School not found" });
      }
      res.json(school);
    } catch (error) {
      console.error("Error fetching school:", error);
      res.status(500).json({ error: "Failed to fetch school" });
    }
  });

  // Historical scores API (public) - for individual school
  app.get("/api/schools/:dbn/history", async (req: Request, res: Response) => {
    try {
      const trend = await storage.getSchoolTrend(req.params.dbn);
      res.json(trend);
    } catch (error) {
      console.error("Error fetching school history:", error);
      res.status(500).json({ error: "Failed to fetch school history" });
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
      res.json(profile);
    } catch (error) {
      console.error("Error saving profile:", error);
      res.status(500).json({ error: "Failed to save profile" });
    }
  });

  // Commute Time API (public - accepts lat/lng as query params)
  app.get("/api/commute/:schoolDbn", async (req: Request, res: Response) => {
    try {
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

      res.json({
        commuteTime: element.duration.text,
        commuteMinutes: Math.round(element.duration.value / 60),
        distance: element.distance.text,
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

  // AI Chat API (authenticated)
  // Cache school summary to avoid fetching on every request
  let cachedSchoolSummary: string | null = null;
  
  app.post("/api/chat", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.session.userId;
      const { message, conversationHistory, sessionId } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
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

      // Create or use cached school summary
      if (!cachedSchoolSummary) {
        const schools = await storage.getSchools();
        const schoolSample = schools.slice(0, 50).map(s => ({
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
          enrollment: s.enrollment,
        }));
        cachedSchoolSummary = JSON.stringify(schoolSample, null, 2);
      }

      const systemMessage = `You are a helpful assistant for parents looking for schools in NYC. You have access to data from NYC public and charter schools across all 5 boroughs (Manhattan, Bronx, Brooklyn, Queens, Staten Island).

School Data Overview:
- Districts: 1-32 (community school districts)
- Metrics available: Overall Score, Academics Score, Climate Score, Progress Score, ELA Proficiency, Math Proficiency, Enrollment, Student-Teacher Ratio, NYC School Survey scores
- For high schools: Graduation rates, SAT scores, College readiness, AP courses

Overall Score calculation: 40% academics + 30% climate + 30% progress

Score Ranges:
- 90+: Outstanding (Green)
- 80-89: Strong (Yellow)
- 70-79: Average (Amber)
- Below 70: Needs Improvement (Red)

Here's a sample of schools to help you answer questions:
${cachedSchoolSummary}

When answering questions:
1. Be specific and helpful
2. Reference actual school names, districts, and scores when possible
3. Explain what metrics mean in parent-friendly language
4. Suggest viewing individual school pages for detailed information at /school/{DBN}
5. If asked to compare schools, focus on key differences
6. If you don't have exact data for a specific question, acknowledge the limitation

Remember: Schools are in the database, but you're seeing a sample. For comprehensive searches across all schools, suggest using the search and filter tools on the website.`;

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

      // Stream response from OpenAI
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
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
        { url: '/faq', changefreq: 'monthly', priority: '0.6' },
        { url: '/privacy', changefreq: 'monthly', priority: '0.3' },
        { url: '/terms', changefreq: 'monthly', priority: '0.3' },
      ];
      
      // Generate XML
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      // Add static pages
      staticPages.forEach(page => {
        xml += '  <url>\n';
        xml += `    <loc>https://nyc-kindergarten-school-finder.replit.app${page.url}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += '  </url>\n';
      });
      
      // Add school pages
      schools.forEach(school => {
        const slug = `${school.dbn.toLowerCase()}-${school.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`;
        xml += '  <url>\n';
        xml += `    <loc>https://nyc-kindergarten-school-finder.replit.app/school/${slug}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        xml += '  </url>\n';
      });
      
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

Sitemap: https://nyc-kindergarten-school-finder.replit.app/sitemap.xml`;
    
    res.header('Content-Type', 'text/plain');
    res.send(robotsTxt);
  });

  const httpServer = createServer(app);

  return httpServer;
}
