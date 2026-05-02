import type { Request, Response, NextFunction, RequestHandler } from "express";
import crypto from "crypto";
import { storage } from "./storage";
import type { ApiKey } from "@shared/schema";
import { checkIpThrottle, clientIp, enqueueApiLog } from "./apiObservability";

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

// Quotas. Per-key counters now live in PostgreSQL (api_key_rate_state) so the
// daily cap survives server restarts. The auth middleware below performs an
// atomic UPSERT-INCREMENT per request and decides allow/deny from the returned
// counts.
const PER_MINUTE_LIMIT = 60;
const PER_DAY_LIMIT = 10_000;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetEpochSeconds: number;
  retryAfterSeconds: number;
}

async function checkAndIncrementRateLimit(keyId: number): Promise<RateLimitResult> {
  const now = new Date();
  const state = await storage.incrementApiRateState(keyId, now);

  // The increment already happened atomically. If we went over the cap, we
  // count this request as the trigger and report blocked. (We could `--`
  // back the counter, but allowing the slight over-count keeps the SQL one
  // round-trip; it's at most ~1 per concurrent request and practically zero
  // for the single-instance deployment we're on.)
  const minuteOver = state.minuteCount > PER_MINUTE_LIMIT;
  const dayOver = state.dayCount > PER_DAY_LIMIT;

  if (minuteOver) {
    const resetMs = state.minuteWindowStart.getTime() + 60_000;
    return {
      allowed: false,
      remaining: 0,
      limit: PER_MINUTE_LIMIT,
      resetEpochSeconds: Math.ceil(resetMs / 1000),
      retryAfterSeconds: Math.max(1, Math.ceil((resetMs - Date.now()) / 1000)),
    };
  }
  if (dayOver) {
    const resetMs = state.dayWindowStart.getTime() + 24 * 60 * 60 * 1000;
    return {
      allowed: false,
      remaining: 0,
      limit: PER_DAY_LIMIT,
      resetEpochSeconds: Math.ceil(resetMs / 1000),
      retryAfterSeconds: Math.max(1, Math.ceil((resetMs - Date.now()) / 1000)),
    };
  }

  // Surface the per-minute window as the binding constraint for headers.
  return {
    allowed: true,
    remaining: Math.max(0, PER_MINUTE_LIMIT - state.minuteCount),
    limit: PER_MINUTE_LIMIT,
    resetEpochSeconds: Math.ceil((state.minuteWindowStart.getTime() + 60_000) / 1000),
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

// Helper: log an unauthenticated rejection (no apiKey on req yet, so the
// regular request-logger middleware would record keyId=null with the
// outgoing status. We also enqueue manually here when the request is rejected
// before it reaches the v1 router, so brute-force scans always show up in
// the audit log even though they don't pass the auth middleware downstream.)
function logUnauthenticated(req: Request, status: number): void {
  enqueueApiLog({
    keyId: null,
    path: req.path,
    status,
    ip: clientIp(req),
    responseTimeMs: 0,
  });
}

export const requireApiKey: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const auth = req.header("authorization") || req.header("Authorization");

  if (!auth || !auth.startsWith("Bearer ")) {
    // Per-IP throttle on the unauthenticated path so brute-force scans can't
    // pound us indefinitely. Real consumers always have an Authorization
    // header so this never affects them.
    const ipLimit = checkIpThrottle(clientIp(req) || undefined);
    if (!ipLimit.allowed) {
      res.setHeader("Retry-After", String(ipLimit.retryAfterSeconds));
      logUnauthenticated(req, 429);
      return sendApiError(
        res,
        429,
        "IP_RATE_LIMITED",
        "Too many unauthenticated requests from this IP. Slow down or include a valid API key.",
        { retryAfterSeconds: ipLimit.retryAfterSeconds },
      );
    }
    return sendApiError(
      res,
      401,
      "MISSING_API_KEY",
      "Missing Authorization header. Send 'Authorization: Bearer YOUR_API_KEY'.",
    );
  }

  const plaintext = auth.slice("Bearer ".length).trim();
  if (!plaintext.startsWith(API_KEY_PREFIX)) {
    const ipLimit = checkIpThrottle(clientIp(req) || undefined);
    if (!ipLimit.allowed) {
      res.setHeader("Retry-After", String(ipLimit.retryAfterSeconds));
      logUnauthenticated(req, 429);
      return sendApiError(res, 429, "IP_RATE_LIMITED", "Too many invalid-key requests from this IP.", {
        retryAfterSeconds: ipLimit.retryAfterSeconds,
      });
    }
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
    const ipLimit = checkIpThrottle(clientIp(req) || undefined);
    if (!ipLimit.allowed) {
      res.setHeader("Retry-After", String(ipLimit.retryAfterSeconds));
      logUnauthenticated(req, 429);
      return sendApiError(res, 429, "IP_RATE_LIMITED", "Too many invalid-key requests from this IP.", {
        retryAfterSeconds: ipLimit.retryAfterSeconds,
      });
    }
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

  let limit: RateLimitResult;
  try {
    limit = await checkAndIncrementRateLimit(key.id);
  } catch (err) {
    // If the rate-limit DB write fails, prefer to let the request through
    // (fail open) rather than 500 every API call during a transient outage.
    // The per-IP throttle and the audit log still catch sustained abuse.
    console.error("Rate-limit increment failed; failing open:", err);
    req.apiKey = key;
    maybeTouchLastUsed(key.id);
    return next();
  }
  res.setHeader("X-RateLimit-Limit", String(limit.limit));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit.remaining)));
  res.setHeader("X-RateLimit-Reset", String(limit.resetEpochSeconds));
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    // Attach the apiKey so the request logger records who tripped the limit.
    req.apiKey = key;
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
