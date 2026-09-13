// Staging-only entrypoint. Never used by the production configuration.
import application from "./index-worker";

export default {
  async fetch(request: Parameters<typeof application.fetch>[0], env: Env, ctx: ExecutionContext): Promise<Response> {
    const settings = env as unknown as Record<string, string | undefined>;
    const expiry = Date.parse(settings.STAGING_EXPIRES_AT || "");
    const headers = { "X-Robots-Tag": "noindex, nofollow, noarchive", "Cache-Control": "no-store" };
    if (settings.ENVIRONMENT !== "staging" ||
        !Number.isFinite(expiry) || Date.now() >= expiry) {
      return new Response("Staging unavailable or expired.", { status: 503, headers });
    }
    // Public preview: allow only audited directory APIs. The cloned database
    // includes private records, so unknown/new APIs must fail closed.
    let path: string;
    try { path = decodeURIComponent(new URL(request.url).pathname).toLowerCase(); }
    catch { return new Response("Invalid path.", { status: 400, headers }); }
    const publicApi = /^\/api\/(?:schools|schools\/by-slugs|schools\/by-dbns|schools\/[a-z0-9-]+(?:\/(?:history|admissions|graduation|regents|attendance|discipline|admissions-programs|zone))?|twok-centers|twok-centers-stats|nyceec-centers|nyceec-centers-stats|nyceec-centers\/[a-z0-9-]+|private-schools|private-schools-stats|private-schools\/[a-z0-9-]+(?:\/history)?|districts\/(?:averages|citywide|[0-9]+\/averages)|schools-trends|schools-trends-summary|safe-and-strong)\/?$/;
    if (!["GET", "HEAD"].includes(request.method) ||
        (path.startsWith("/api") && !publicApi.test(path)) ||
        /^\/(?:admin|account|profile|login|signup|auth|oauth|mcp|\.well-known)(?:\/|$)/.test(path)) {
      return new Response("This action is disabled in staging.", { status: 403, headers });
    }
    if (path === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n", { headers });
    // Never carry a reviewer session into the public preview.
    const anonymousHeaders = new Headers(request.headers);
    anonymousHeaders.delete("Cookie");
    anonymousHeaders.delete("Authorization");
    // Cloning the incoming request preserves its Cloudflare request properties.
    const anonymousRequest = new Request(request, { headers: anonymousHeaders }) as typeof request;
    const result = await application.fetch(anonymousRequest, env, ctx);
    const response = new Response(result.body, result);
    response.headers.delete("Set-Cookie");
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    // Keep preview analytics and external browser-side integrations isolated.
    response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src 'none'; form-action 'self'");
    return response;
  },
};
