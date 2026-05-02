import type { Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "./storage";
import type { InsertApiRequestLog } from "@shared/schema";

// Per-IP throttle for unauthenticated requests to /api/v1/* (i.e. invalid /
// missing API keys). Lives in memory: it's only a guard against brute-force
// scanning of the key namespace, not a billing primitive — losing state on
// restart is fine. Dropping IPs that haven't been seen in an hour keeps the
// map bounded.
const IP_LIMIT_PER_MINUTE = 30;
const IP_WINDOW_MS = 60_000;
const IP_CLEANUP_INTERVAL_MS = 60 * 60_000;

interface IpBucket {
  windowStart: number;
  count: number;
}
const ipBuckets = new Map<string, IpBucket>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of Array.from(ipBuckets.entries())) {
    if (now - bucket.windowStart > IP_CLEANUP_INTERVAL_MS) {
      ipBuckets.delete(ip);
    }
  }
}, IP_CLEANUP_INTERVAL_MS).unref?.();

// Returns the throttle decision for one request. The caller (auth middleware)
// is responsible for sending the 429 — this function only counts.
export function checkIpThrottle(ip: string | undefined): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  if (!ip) return { allowed: true, retryAfterSeconds: 0, remaining: IP_LIMIT_PER_MINUTE };
  const now = Date.now();
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

// Best-effort client IP. Honors x-forwarded-for since we sit behind Replit's
// proxy. Falls back to req.ip / socket address.
export function clientIp(req: Request): string | null {
  const xff = req.header("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || null;
}

// In-memory queue + periodic flush. Each /api/v1/* response enqueues one row;
// the flusher writes them to api_request_log in batches so we never make the
// hot request path wait on a DB insert. Flush interval is short enough that
// the admin dashboard sees near-real-time data.
const FLUSH_INTERVAL_MS = 2_000;
const MAX_QUEUE_SIZE = 1_000;
const buffer: InsertApiRequestLog[] = [];

async function flush(): Promise<void> {
  if (buffer.length === 0) return;
  // Snapshot + clear so new requests can keep enqueueing while we write.
  const batch = buffer.splice(0, buffer.length);
  try {
    await storage.insertApiRequestLogs(batch);
  } catch (err) {
    // Logger failure is not fatal to the API. Log and drop the batch — better
    // than blocking memory growth or recursing forever.
    console.error("[API_LOG] Failed to flush request log batch:", err, { dropped: batch.length });
  }
}

setInterval(() => {
  void flush();
}, FLUSH_INTERVAL_MS).unref?.();

// Make sure pending logs land before the process exits during a deploy.
process.on("beforeExit", () => {
  void flush();
});

export function enqueueApiLog(entry: InsertApiRequestLog): void {
  if (buffer.length >= MAX_QUEUE_SIZE) {
    // Backpressure: drop the oldest rather than the newest so a sudden burst
    // is still partially observable. This should never happen in practice
    // unless the DB is down for many seconds.
    buffer.shift();
  }
  buffer.push(entry);
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
  return flush();
}
