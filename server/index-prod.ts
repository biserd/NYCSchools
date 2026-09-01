import fs from "node:fs";
import path from "node:path";
import { type Server } from "node:http";

import express, { type Express } from "express";
import runApp from "./app";
import { getCanonicalRedirectPath, renderSeoHtml } from "./seoRenderer";


const KNOWN_STATIC_ROUTES = new Set([
  "/", "/login", "/register", "/forgot-password", "/reset-password",
  "/favorites", "/application-tracker", "/recommendations", "/compare",
  "/map", "/lottery-simulator", "/chances-calculator", "/early-childhood",
  "/private-schools", "/settings", "/privacy", "/terms", "/faq",
  "/features", "/benefits", "/release-notes", "/blog", "/pricing",
  "/developers", "/developers/docs", "/contact", "/safety-methodology",
  "/safe-and-strong", "/admin/api-usage", "/thanks",
  "/auth/magic-link/callback",
]);

const ENTITY_ROUTE = /^\/(?:school|private-school|early-childhood|blog|compare|nyc-schools)\/[^/]+$/;
const MAGIC_LINK_ROUTE = /^\/auth\/magic-link\/[^/]+$/;

function normalizePath(rawUrl: string): string {
  const pathname = new URL(rawUrl, "https://nycschoolsratings.com").pathname;
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

  if (/<meta\s+name="robots"[^>]*>/i.test(html)) {
    html = html.replace(
      /<meta\s+name="robots"[^>]*>/i,
      '<meta name="robots" content="noindex, nofollow" />',
    );
  } else {
    html = html.replace(
      /<\/head>/i,
      '    <meta name="robots" content="noindex, nofollow" />\n  </head>',
    );
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

export async function serveStatic(app: Express, _server: Server) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static assets with long cache TTL for hashed files (JS, CSS)
  // and shorter cache for non-hashed files
  app.use(express.static(distPath, {
    maxAge: '1y', // 1 year for hashed assets
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // HTML files should not be cached long-term
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }
      // Hashed assets (Vite generates these with content hash) can be cached forever
      else if (filePath.match(/\.[a-f0-9]{8}\.(js|css)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Images, fonts can be cached for a long time
      else if (filePath.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
      }
    }
  }));

  // fall through to index.html if the file doesn't exist. We read the
  // template once at startup (it's only re-deployed when the build runs)
  // and run the SEO enricher per-request so social/Bing/AI crawlers see
  // page-specific titles, meta, JSON-LD, and noscript content.
  const indexHtmlPath = path.resolve(distPath, "index.html");
  const indexHtmlTemplate = fs.readFileSync(indexHtmlPath, "utf-8");
  app.use("/{*splat}", async (req, res) => {
    const pathname = normalizePath(req.originalUrl);

    try {
      if (!isKnownAppRoute(pathname)) {
        return res
          .status(404)
          .set({
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=0, must-revalidate",
          })
          .end(renderNotFoundHtml(indexHtmlTemplate));
      }

      const canonicalRedirect = await getCanonicalRedirectPath(pathname);
      if (canonicalRedirect) {
        return res.redirect(301, canonicalRedirect);
      }

      const enriched = await renderSeoHtml(pathname, indexHtmlTemplate);
      if (ENTITY_ROUTE.test(pathname) && !enriched) {
        return res
          .status(404)
          .set({
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=0, must-revalidate",
          })
          .end(renderNotFoundHtml(indexHtmlTemplate));
      }

      const responseHtml = enriched ?? (MAGIC_LINK_ROUTE.test(pathname)
        ? renderPrivateRouteHtml(indexHtmlTemplate)
        : indexHtmlTemplate);

      return res
        .status(200)
        .set({
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=0, must-revalidate",
        })
        .end(responseHtml);
    } catch (err) {
      console.error("[INDEX_HTML]", err);
      return res
        .status(500)
        .set({
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        })
        .end(indexHtmlTemplate);
    }
  });
}

(async () => {
  await runApp(serveStatic);
})();
