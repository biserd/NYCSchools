import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import { sendAdminNewUserRegistrationNotification, sendNewUserWelcomeEmail, sendPasswordResetEmail, sendMagicLinkLoginEmail } from "./emailService";

// Rate limiting for magic link requests (in-memory, keyed by email)
const magicLinkRateLimit = new Map<string, number>();
const MAGIC_LINK_COOLDOWN_MS = 60 * 1000; // 60 seconds

function canRequestMagicLink(email: string): boolean {
  const key = email.toLowerCase();
  const lastRequest = magicLinkRateLimit.get(key);
  if (!lastRequest) return true;
  return Date.now() - lastRequest > MAGIC_LINK_COOLDOWN_MS;
}

function recordMagicLinkRequest(email: string): void {
  magicLinkRateLimit.set(email.toLowerCase(), Date.now());
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of magicLinkRateLimit.entries()) {
    if (now - timestamp > MAGIC_LINK_COOLDOWN_MS * 2) {
      magicLinkRateLimit.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const SALT_ROUNDS = 10;

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "Email already in use" });
      }

      const hashedPassword = await hashPassword(password);
      
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
      });

      req.session.userId = user.id;
      
      // Send emails (don't await to avoid slowing down registration)
      Promise.all([
        sendAdminNewUserRegistrationNotification(email, firstName, lastName),
        sendNewUserWelcomeEmail(email, firstName)
      ]).catch((err) => {
        console.error("Failed to send registration emails:", err);
      });
      
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  // Password Reset - Request reset email
  app.post("/api/auth/password-reset/request", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Always return success to prevent email enumeration
      const user = await storage.getUserByEmail(email);
      
      if (user) {
        // Generate secure random token
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        
        // Token expires in 30 minutes
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        
        await storage.createPasswordResetToken(user.id, tokenHash, expiresAt);
        
        // Build reset URL - use production domain or Replit dev domain
        let baseUrl: string;
        if (process.env.NODE_ENV === "production") {
          baseUrl = "https://nycschoolsratings.com";
        } else if (process.env.REPLIT_DEV_DOMAIN) {
          baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
        } else {
          baseUrl = "http://localhost:5000";
        }
        const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
        
        // Send email (don't await to avoid timing attacks)
        sendPasswordResetEmail(user.email, resetUrl, user.firstName).catch((err) => {
          console.error("Failed to send password reset email:", err);
        });
      }

      // Always return success
      res.json({ message: "If an account exists with that email, you will receive a password reset link." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Password Reset - Validate token
  app.get("/api/auth/password-reset/validate", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ valid: false, message: "Token is required" });
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const resetToken = await storage.findPasswordResetToken(tokenHash);

      if (!resetToken) {
        return res.json({ valid: false, message: "Invalid or expired reset link" });
      }

      if (resetToken.usedAt) {
        return res.json({ valid: false, message: "This reset link has already been used" });
      }

      if (new Date() > resetToken.expiresAt) {
        return res.json({ valid: false, message: "This reset link has expired" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("Password reset validate error:", error);
      res.status(500).json({ valid: false, message: "Failed to validate token" });
    }
  });

  // Password Reset - Complete reset with new password
  app.post("/api/auth/password-reset/complete", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const resetToken = await storage.findPasswordResetToken(tokenHash);

      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }

      if (resetToken.usedAt) {
        return res.status(400).json({ message: "This reset link has already been used" });
      }

      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "This reset link has expired" });
      }

      // Hash the new password and update user
      const hashedPassword = await hashPassword(password);
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      
      // Mark token as used
      await storage.markPasswordResetTokenUsed(resetToken.id);

      // Clean up expired tokens periodically
      storage.deleteExpiredPasswordResetTokens().catch((err) => {
        console.error("Failed to clean up expired tokens:", err);
      });

      res.json({ message: "Password reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error("Password reset complete error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Magic Link Login - Request a sign-in link via email
  app.post("/api/auth/magic-link/request", async (req, res) => {
    try {
      const { email, returnTo } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Always return success to prevent email enumeration
      // Check rate limit first
      if (!canRequestMagicLink(email)) {
        // Still return 200 to prevent enumeration, but don't send another email
        return res.json({ message: "If an account exists, we sent a link." });
      }

      const user = await storage.getUserByEmail(email);
      
      if (user) {
        // Record the request for rate limiting
        recordMagicLinkRequest(email);
        
        // Generate secure random token
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        
        // Token expires in 15 minutes
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        
        await storage.createMagicLinkToken(user.id, tokenHash, expiresAt);
        
        // Build magic link URL
        let baseUrl: string;
        if (process.env.REPLIT_DEPLOYMENT === "1") {
          baseUrl = "https://nycschoolsratings.com";
        } else if (process.env.REPLIT_DEV_DOMAIN) {
          baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
        } else {
          baseUrl = "http://localhost:5000";
        }
        
        // Include returnTo in the callback URL if provided
        const sanitizedReturnTo = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") 
          ? returnTo 
          : "/account";
        const magicLinkUrl = `${baseUrl}/auth/magic-link/callback?token=${rawToken}&returnTo=${encodeURIComponent(sanitizedReturnTo)}`;
        
        // Send email (don't await to avoid timing attacks)
        sendMagicLinkLoginEmail(user.email, magicLinkUrl, user.firstName || undefined).catch((err) => {
          console.error("Failed to send magic link login email:", err);
        });
      }

      // Always return success
      res.json({ message: "If an account exists, we sent a link." });
    } catch (error) {
      console.error("Magic link request error:", error);
      res.status(500).json({ message: "Failed to process magic link request" });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};
