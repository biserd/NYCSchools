import type { Express } from "express";
import { env } from "cloudflare:workers";
import { getCanonicalRedirectPath, renderSeoHtml } from "./seoRenderer";

const KNOWN_STATIC_ROUTES = new Set([
  "/", "/login", "/register", "/forgot-password", "/reset-password",
  "/favorites", "/application-tracker", "/recommendations", "/compare",
  "/map", "/lottery-simulator", "/chances-calculator", "/early-childhood",
  "/private-schools", "/settings", "/privacy", "/terms", "/faq",
  "/features", "/benefits", "/release-notes", "/blog", "/pricing",
  "/developers", "/developers/docs", "/contact", "/safety-methodology",
  "/safe-and-strong", "/admin/api-usage", "/thanks",
  "/explore-schools", "/methodology", "/about",
  "/auth/magic-link/callback",
]);

const ENTITY_ROUTE = /^\/(?:school|private-school|early-childhood|blog|compare|nyc-schools|district|neighborhood|program)\/[^/]+$/;
const MAGIC_LINK_ROUTE = /^\/auth\/magic-link\/[^/]+$/;

function normalizePath(rawUrl: string): string {
  const pathname = new URL(rawUrl, env.APP_URL).pathname;
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

function isKnownAppRoute(pathname: string): boolean {
  return KNOWN_STATIC_ROUTES.has(pathname) ||
    ENTITY_ROUTE.test(pathname) ||
    MAGIC_LINK_ROUTE.test(pathname);
}

function renderNotFoundHtml(template: string): string {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/i, "<title>Page Not Found | NYC School Ratings</title>")
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      '<meta name="description" content="The requested NYC School Ratings page could not be found." />',
    );

  const robotsTag = '<meta name="robots" content="noindex, nofollow" />';
  if (/<meta\s+name="robots"[^>]*>/i.test(html)) {
    html = html.replace(/<meta\s+name="robots"[^>]*>/i, robotsTag);
  } else {
    html = html.replace(/<\/head>/i, `    ${robotsTag}\n  </head>`);
  }
  return html;
}

function renderPrivateRouteHtml(template: string): string {
  const robotsTag = '<meta name="robots" content="noindex, nofollow" />';
  if (/<meta\s+name="robots"[^>]*>/i.test(template)) {
    return template.replace(/<meta\s+name="robots"[^>]*>/i, robotsTag);
  }
  return template.replace(/<\/head>/i, `    ${robotsTag}\n  </head>`);
}

async function loadIndexTemplate(requestUrl: string): Promise<string> {
  const indexUrl = new URL("/index.html", requestUrl);
  const response = await env.ASSETS.fetch(indexUrl);
  if (!response.ok) {
    throw new Error(`Unable to load the Worker asset template (${response.status})`);
  }
  return response.text();
}

export function registerWorkerStaticRoutes(app: Express): void {
  app.use("/{*splat}", async (req, res) => {
    const pathname = normalizePath(req.originalUrl);
    const requestUrl = new URL(req.originalUrl, env.APP_URL).toString();

    try {
      const template = await loadIndexTemplate(requestUrl);
      if (!isKnownAppRoute(pathname)) {
        return res.status(404).set({
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=0, must-revalidate",
        }).end(renderNotFoundHtml(template));
      }

      const canonicalRedirect = await getCanonicalRedirectPath(pathname);
      if (canonicalRedirect) return res.redirect(301, canonicalRedirect);

      const enriched = await renderSeoHtml(pathname, template);
      if (ENTITY_ROUTE.test(pathname) && !enriched) {
        return res.status(404).set({
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=0, must-revalidate",
        }).end(renderNotFoundHtml(template));
      }

      const html = enriched ?? (MAGIC_LINK_ROUTE.test(pathname)
        ? renderPrivateRouteHtml(template)
        : template);

      return res.status(200).set({
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      }).end(html);
    } catch (error) {
      console.error(JSON.stringify({
        message: "Failed to render Worker HTML",
        path: pathname,
        error: error instanceof Error ? error.message : String(error),
      }));
      return res.status(500).send("Internal Server Error");
    }
  });
}
