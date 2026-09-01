/**
 * Same-origin guard for the internal `/api/*` endpoints.
 *
 * The application's own frontend uses dozens of internal endpoints
 * (`/api/schools`, `/api/private-schools`, `/api/nyceec-centers`,
 * `/api/schools-trends`, `/api/schools/:dbn/*`, etc.) to render its UI.
 * These endpoints were never intended to be a public, unauthenticated API
 * — that's what the Premium-gated `/api/v1/*` (Bearer-token, rate-limited,
 * documented at `/developers`) is for.
 *
 * Without this guard, an external scraper can hit `https://nycschoolsratings.com/api/schools`
 * with a single curl call and walk away with the entire dataset for free,
 * undermining the Developer API as a paid product.
 *
 * This middleware enforces a same-origin check using the `Origin` and
 * `Referer` headers. Browsers automatically attach these on cross-origin
 * fetches and on most same-origin fetches; standard scraper tools
 * (`curl`, `requests`, `httpx`, headless `wget`) do not unless the author
 * explicitly sets them — which raises the bar enough to stop casual
 * scraping, while not breaking anonymous public browsing of the site.
 *
 * Excluded paths (allowed through unconditionally):
 *   - `/api/v1/*`              — Developer API; has its own Bearer auth
 *   - `/api/auth/*`            — auth flows (callback URLs, OAuth)
 *   - `/api/stripe/webhook*`   — Stripe → us; Stripe doesn't send Origin
 *   - `/api/cron/*`            — optional manual cron hooks; CRON_SECRET-protected
 *   - `/api/health`            — uptime monitors
 */

import type { Request, Response, NextFunction } from "express";

const STATIC_ALLOWED_HOSTS = new Set<string>([
  "nycschoolsratings.com",
  "www.nycschoolsratings.com",
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
]);

function envAllowedHosts(): string[] {
  if (!process.env.APP_URL) return [];
  try {
    return [new URL(process.env.APP_URL).hostname];
  } catch {
    console.warn("Ignoring invalid APP_URL in same-origin guard");
    return [];
  }
}

const ENV_ALLOWED_HOSTS = new Set<string>(envAllowedHosts());

function isAllowedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (STATIC_ALLOWED_HOSTS.has(h)) return true;
  if (ENV_ALLOWED_HOSTS.has(h)) return true;
  return h.endsWith(".workers.dev");
}

function hostnameOf(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  try {
    const u = new URL(headerValue);
    return u.hostname || null;
  } catch {
    return null;
  }
}

// Paths under `/api/` that should NOT be subjected to the same-origin
// guard. Match against `req.path`.
function isExcluded(path: string): boolean {
  return (
    path.startsWith("/api/v1/") ||
    path === "/api/v1" ||
    path.startsWith("/api/auth/") ||
    path === "/api/auth" ||
    path.startsWith("/api/stripe/webhook") ||
    path.startsWith("/api/cron/") ||
    path === "/api/health"
  );
}

export function sameOriginGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Only police `/api/*` requests. Everything else (HTML, static assets,
  // /sitemap.xml, /robots.txt, etc.) flows through untouched.
  if (!req.path.startsWith("/api/")) return next();
  if (isExcluded(req.path)) return next();

  // CORS preflight — no Origin restriction at this layer; the browser
  // never sends a preflight without an Origin anyway.
  if (req.method === "OPTIONS") return next();

  const originHost = hostnameOf(req.get("origin") || undefined);
  const refererHost = hostnameOf(req.get("referer") || undefined);
  const fetchSite = req.get("sec-fetch-site")?.toLowerCase();

  // Modern browsers provide Fetch Metadata even when privacy settings strip
  // Origin and Referer. Accept requests the browser identifies as same-origin
  // or same-site so legitimate navigation from an email sign-in link does not
  // blank the application. Basic curl/requests scrapers do not send this by
  // default, preserving the guard's intended friction.
  if (fetchSite === "same-origin" || fetchSite === "same-site") return next();

  // Older browsers can still prove same-origin through Origin or Referer.
  if (originHost && isAllowedHost(originHost)) return next();
  if (refererHost && isAllowedHost(refererHost)) return next();

  // No allowed Origin/Referer — this is almost certainly a direct
  // scrape. Point them at the public Developer API so the rejection is
  // actionable rather than mysterious.
  res.status(403).json({
    error: {
      code: "forbidden",
      message:
        "This endpoint is for use by the nycschoolsratings.com website only. " +
        "For programmatic access to NYC school data, please use the Developer " +
        "API at https://nycschoolsratings.com/api/v1/ — see " +
        "https://nycschoolsratings.com/developers/docs to get started.",
    },
  });
}
