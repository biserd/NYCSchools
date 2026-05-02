import fs from "node:fs";
import path from "node:path";
import { type Server } from "node:http";

import express, { type Express } from "express";
import runApp from "./app";
import { renderSeoHtml } from "./seoRenderer";

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
  app.use("*", async (req, res) => {
    try {
      const enriched = await renderSeoHtml(req.originalUrl, indexHtmlTemplate);
      res
        .status(200)
        .set({
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=0, must-revalidate",
        })
        .end(enriched ?? indexHtmlTemplate);
    } catch (err) {
      console.error("[INDEX_HTML]", err);
      res.sendFile(indexHtmlPath);
    }
  });
}

(async () => {
  await runApp(serveStatic);
})();
