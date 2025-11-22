import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFavoriteSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", async (req: any, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.json(null);
      }
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Schools API (public)
  app.get("/api/schools", async (req: Request, res: Response) => {
    try {
      const schools = await storage.getSchools();
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

  // Favorites API (require authentication)
  app.get("/api/favorites", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  app.post("/api/favorites", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;

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
      const userId = req.user.claims.sub;
      await storage.removeFavorite(userId, req.params.schoolDbn);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  app.get("/api/favorites/check/:schoolDbn", async (req: any, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.json({ isFavorite: false });
      }

      const userId = req.user.claims.sub;
      const isFav = await storage.isFavorite(userId, req.params.schoolDbn);
      res.json({ isFavorite: isFav });
    } catch (error) {
      console.error("Error checking favorite:", error);
      res.status(500).json({ error: "Failed to check favorite" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
