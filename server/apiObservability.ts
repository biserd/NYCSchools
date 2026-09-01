import type { Request, Response, NextFunction, RequestHandler } from "express";
import { waitUntil } from "cloudflare:workers";
import { storage } from "./storage";
import { withDatabaseConnection } from "./db";
import type { InsertApiRequestLog } from "@shared/schema";

// Per-IP throttle for unauthenticated requests to /api/v1/* (i.e. invalid /
// missing API keys). Lives in memory: it's only a guard against brute-force
// scanning of the key namespace, not a billing primitive — losing state on
// restart is fine. Dropping IPs that haven't been seen in an hour keeps the
// map bounded.
const IP_LIMIT_PER_MINUTE = 30;
const IP_WINDOW_MS = 60_000;

interface IpBucket {
  windowStart: number;
  count: number;
}
const ipBuckets = new Map<string, IpBucket>();

// Returns the throttle decision for one request. The caller (auth middleware)
// is responsible for sending the 429 — this function only counts.
export function checkIpThrottle(ip: string | undefined): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  if (!ip) return { allowed: true, retryAfterSeconds: 0, remaining: IP_LIMIT_PER_MINUTE };
  const now = Date.now();
  if (ipBuckets.size > 10_000) {
    for (const [key, existing] of ipBuckets) {
      if (now - existing.windowStart >= IP_WINDOW_MS) ipBuckets.delete(key);
    }
  }
  let bucket = ipBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= IP_WINDOW_MS) {
    bucket = { windowStart: now, count: 0 };
    ipBuckets.set(ip, bucket);
  }
  if (bucket.count >= IP_LIMIT_PER_MINUTE) {
    const retryMs = bucket.windowStart + IP_WINDOW_MS - now;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)), remaining: 0 };
  }
  bucket.count++;
  return { allowed: true, retryAfterSeconds: 0, remaining: Math.max(0, IP_LIMIT_PER_MINUTE - bucket.count) };
}

// Best-effort client IP. Honors x-forwarded-for from Cloudflare's proxy and
// falls back to req.ip / socket address.
export function clientIp(req: Request): string | null {
  const xff = req.header("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || null;
}

export function enqueueApiLog(entry: InsertApiRequestLog): void {
  waitUntil(withDatabaseConnection(async () => {
    await storage.insertApiRequestLogs([entry]);
  }).catch((error) => {
    console.error("[API_LOG] Failed to persist request log", error);
  }));
}

// Express middleware. Mounted on the v1 router so every authenticated request
// (including the ones that early-return like 429) gets recorded after the
// response is sent. We hook res.on('finish') so we can capture the final
// status code and total response time.
export const apiRequestLoggerMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const ip = clientIp(req);
  res.on("finish", () => {
    enqueueApiLog({
      keyId: req.apiKey?.id ?? null,
      path: req.path,
      status: res.statusCode,
      ip: ip,
      responseTimeMs: Date.now() - start,
    });
  });
  next();
};

// Public helper for the cron / shutdown paths.
export function flushApiLogsNow(): Promise<void> {
  return Promise.resolve();
}
