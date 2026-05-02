import type { Request, Response, NextFunction, RequestHandler } from "express";
import crypto from "crypto";
import { storage } from "./storage";
import type { ApiKey } from "@shared/schema";

export const API_KEY_PREFIX = "nycr_live_";
const API_KEY_RANDOM_BYTES = 24;
const KEY_PREFIX_DISPLAY_LEN = 12;

export interface IssuedApiKey {
  plaintext: string;
  prefix: string;
  hash: string;
}

export function generateApiKey(): IssuedApiKey {
  const random = crypto.randomBytes(API_KEY_RANDOM_BYTES).toString("base64url");
  const plaintext = `${API_KEY_PREFIX}${random}`;
  const prefix = plaintext.slice(0, KEY_PREFIX_DISPLAY_LEN);
  const hash = hashApiKey(plaintext);
  return { plaintext, prefix, hash };
}

export function hashApiKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
    }
  }
}

// Per-process token-bucket rate limiter. Limits reset on server restart, which
// is acceptable for a small/free Developer API tier — see replit.md for the
// caveat. We track per-key (not per-IP) so legitimate consumers are isolated
// from each other.
const PER_MINUTE_LIMIT = 60;
const PER_DAY_LIMIT = 10_000;

interface RateLimitState {
  minuteWindowStart: number;
  minuteCount: number;
  dayWindowStart: number;
  dayCount: number;
}

const rateLimitMap = new Map<number, RateLimitState>();

// Periodic cleanup so revoked/idle keys don't leak memory forever.
setInterval(() => {
  const now = Date.now();
  for (const [id, state] of Array.from(rateLimitMap.entries())) {
    // Drop entries that haven't been touched in over a day.
    if (now - state.dayWindowStart > 24 * 60 * 60 * 1000) {
      rateLimitMap.delete(id);
    }
  }
}, 60 * 60 * 1000); // hourly

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetEpochSeconds: number;
  retryAfterSeconds: number;
}

function checkRateLimit(keyId: number): RateLimitResult {
  const now = Date.now();
  let state = rateLimitMap.get(keyId);
  if (!state) {
    state = {
      minuteWindowStart: now,
      minuteCount: 0,
      dayWindowStart: now,
      dayCount: 0,
    };
    rateLimitMap.set(keyId, state);
  }

  // Roll the per-minute window.
  if (now - state.minuteWindowStart >= 60_000) {
    state.minuteWindowStart = now;
    state.minuteCount = 0;
  }
  // Roll the per-day window.
  if (now - state.dayWindowStart >= 24 * 60 * 60 * 1000) {
    state.dayWindowStart = now;
    state.dayCount = 0;
  }

  // Decide based on the tighter of the two windows.
  const minuteRemaining = Math.max(0, PER_MINUTE_LIMIT - state.minuteCount);
  const dayRemaining = Math.max(0, PER_DAY_LIMIT - state.dayCount);

  if (state.minuteCount >= PER_MINUTE_LIMIT) {
    const resetMs = state.minuteWindowStart + 60_000;
    return {
      allowed: false,
      remaining: 0,
      limit: PER_MINUTE_LIMIT,
      resetEpochSeconds: Math.ceil(resetMs / 1000),
      retryAfterSeconds: Math.max(1, Math.ceil((resetMs - now) / 1000)),
    };
  }
  if (state.dayCount >= PER_DAY_LIMIT) {
    const resetMs = state.dayWindowStart + 24 * 60 * 60 * 1000;
    return {
      allowed: false,
      remaining: 0,
      limit: PER_DAY_LIMIT,
      resetEpochSeconds: Math.ceil(resetMs / 1000),
      retryAfterSeconds: Math.max(1, Math.ceil((resetMs - now) / 1000)),
    };
  }

  state.minuteCount++;
  state.dayCount++;

  // Surface the per-minute window since that's the binding constraint for
  // burst behavior; we still count daily usage for the hard cap.
  return {
    allowed: true,
    remaining: Math.min(minuteRemaining - 1, dayRemaining - 1),
    limit: PER_MINUTE_LIMIT,
    resetEpochSeconds: Math.ceil((state.minuteWindowStart + 60_000) / 1000),
    retryAfterSeconds: 0,
  };
}

// Debounce DB writes for `last_used_at` so a busy key doesn't generate one
// UPDATE per request.
const lastUsedTouchedAt = new Map<number, number>();
const TOUCH_INTERVAL_MS = 60_000;

function maybeTouchLastUsed(keyId: number): void {
  const now = Date.now();
  const last = lastUsedTouchedAt.get(keyId) ?? 0;
  if (now - last < TOUCH_INTERVAL_MS) return;
  lastUsedTouchedAt.set(keyId, now);
  // Fire and forget; failures here don't affect the request.
  storage.touchApiKeyLastUsed(keyId).catch((err) => {
    console.error("Failed to update api_keys.last_used_at:", err);
  });
}

function sendApiError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): Response {
  return res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}

// Pluggable premium check so we don't have to import from routes.ts (which
// would create a circular dependency). Wired up in routes.ts via setIsPremium.
type IsPremiumFn = (userId: string) => Promise<boolean>;
let isPremiumImpl: IsPremiumFn = async () => false;

export function setIsPremiumChecker(fn: IsPremiumFn): void {
  isPremiumImpl = fn;
}

export const requireApiKey: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const auth = req.header("authorization") || req.header("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return sendApiError(
      res,
      401,
      "MISSING_API_KEY",
      "Missing Authorization header. Send 'Authorization: Bearer YOUR_API_KEY'.",
    );
  }

  const plaintext = auth.slice("Bearer ".length).trim();
  if (!plaintext.startsWith(API_KEY_PREFIX)) {
    return sendApiError(res, 401, "INVALID_API_KEY", "Invalid API key format.");
  }

  let key: ApiKey | undefined;
  try {
    key = await storage.findApiKeyByHash(hashApiKey(plaintext));
  } catch (err) {
    console.error("API key lookup failed:", err);
    return sendApiError(res, 500, "INTERNAL_ERROR", "Failed to validate API key.");
  }

  if (!key) {
    return sendApiError(res, 401, "INVALID_API_KEY", "Invalid API key.");
  }
  if (key.revokedAt) {
    return sendApiError(res, 401, "REVOKED_API_KEY", "This API key has been revoked.");
  }

  const isPremium = await isPremiumImpl(key.userId);
  if (!isPremium) {
    return sendApiError(
      res,
      403,
      "PREMIUM_REQUIRED",
      "API access requires an active Premium subscription.",
    );
  }

  const limit = checkRateLimit(key.id);
  res.setHeader("X-RateLimit-Limit", String(limit.limit));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit.remaining)));
  res.setHeader("X-RateLimit-Reset", String(limit.resetEpochSeconds));
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return sendApiError(
      res,
      429,
      "RATE_LIMIT_EXCEEDED",
      "Rate limit exceeded. See X-RateLimit-Reset and Retry-After headers.",
      { retryAfterSeconds: limit.retryAfterSeconds },
    );
  }

  req.apiKey = key;
  maybeTouchLastUsed(key.id);
  next();
};

export function apiError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): Response {
  return sendApiError(res, status, code, message, details);
}
