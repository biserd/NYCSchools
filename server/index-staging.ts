// Staging-only entrypoint. Never used by the production configuration.
import application from "./index-worker";
import { timingSafeEqual } from "node:crypto";

async function matchesSecret(actual: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([actual, expected].map(s => crypto.subtle.digest("SHA-256", encoder.encode(s))));
  return timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
}

export default {
  async fetch(request: Parameters<typeof application.fetch>[0], env: Env, ctx: ExecutionContext): Promise<Response> {
    const settings = env as unknown as Record<string, string | undefined>;
    const expiry = Date.parse(settings.STAGING_EXPIRES_AT || "");
    const headers = { "X-Robots-Tag": "noindex, nofollow, noarchive", "Cache-Control": "no-store" };
    if (settings.ENVIRONMENT !== "staging" || !settings.STAGING_PASSWORD ||
        !Number.isFinite(expiry) || Date.now() >= expiry) {
      return new Response("Staging unavailable or expired.", { status: 503, headers });
    }
    let supplied = "";
    try {
      const auth = request.headers.get("Authorization") || "";
      if (auth.startsWith("Basic ")) supplied = atob(auth.slice(6));
    } catch { /* Reject malformed credentials. */ }
    if (!await matchesSecret(supplied, "preview:" + settings.STAGING_PASSWORD)) {
      return new Response("Staging authentication required.", { status: 401,
        headers: { ...headers, "WWW-Authenticate": 'Basic realm="NYC Schools staging", charset="UTF-8"' } });
    }
    // Preview is intentionally read-only. Block payments, webhooks, account
    // actions and manually invoked cron/admin mutations even for reviewers.
    const path = new URL(request.url).pathname;
    if (!["GET", "HEAD"].includes(request.method) || /^\/api\/(?:cron|stripe|auth|admin)(?:\/|$)/.test(path)) {
      return new Response("This action is disabled in staging.", { status: 403, headers });
    }
    if (path === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n", { headers });
    const result = await application.fetch(request, env, ctx);
    const response = new Response(result.body, result);
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    // Keep preview analytics and external browser-side integrations isolated.
    response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src 'none'; form-action 'self'");
    return response;
  },
};
