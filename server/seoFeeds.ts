import { storage } from "./storage";
import { PARENT_GUIDES, parentGuidePath, GUIDE_REVIEWED } from '../shared/parent-guides';
import { KINDERLEARNER_PAGES } from '../shared/kinderlearner';
import { KINDERLEARNER_INFO_PAGES } from '../shared/kinderlearner-info';
import { blogPosts } from "@shared/blog-data";
import { CANONICAL_SCHOOL_GUIDES } from "@shared/school-guides";
import { SEO_LANDINGS, getSeoLandingPath } from "@shared/seo-landings";
import { getNyceecSlug, getPrivateSchoolSlug, getSchoolSlug } from "@shared/schema";

const ORIGIN = "https://nycschoolsratings.com";

const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const isoDate = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString().slice(0, 10);
};

type SitemapEntry = { path: string; lastmod?: unknown; changefreq?: string; priority?: string };

function urlset(entries: SitemapEntry[]): string {
  const urls = entries.map((entry) => `  <url>\n    <loc>${escapeXml(`${ORIGIN}${entry.path}`)}</loc>${entry.lastmod ? `\n    <lastmod>${isoDate(entry.lastmod)}</lastmod>` : ""}${entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : ""}${entry.priority ? `\n    <priority>${entry.priority}</priority>` : ""}\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export function sitemapIndex(): string {
  const names = ["static", "guides", "blog", "public-schools", "private-schools", "early-childhood"];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${names.map((name) => `  <sitemap><loc>${ORIGIN}/sitemaps/${name}.xml</loc></sitemap>`).join("\n")}\n</sitemapindex>`;
}

export async function sitemapByName(name: string): Promise<string | null> {
  if (name === "static") return urlset([
    ...Object.values(KINDERLEARNER_INFO_PAGES).map(page => page.path),
    ...Object.entries(KINDERLEARNER_PAGES).filter(([key]) => key !== 'home').map(([, page]) => page.path),
    "/", "/map", "/compare", "/recommendations", "/early-childhood", "/private-schools", "/lottery-simulator", "/chances-calculator", "/safe-and-strong", "/blog", "/pricing", "/features", "/benefits", "/faq", "/contact", "/methodology", "/about", "/explore-schools", "/safety-methodology", "/developers", "/developers/docs", "/privacy", "/terms",
  ].map((path) => ({ path, changefreq: path === "/" ? "daily" : "monthly", priority: path === "/" ? "1.0" : "0.7" })));
  if (name === "guides") return urlset([
    ...PARENT_GUIDES.map(guide => ({ path: parentGuidePath(guide), lastmod: GUIDE_REVIEWED, changefreq: 'monthly', priority: '0.8' })),
    ...CANONICAL_SCHOOL_GUIDES.map((guide) => ({ path: `/nyc-schools/${guide.slug}`, changefreq: "monthly", priority: "0.8" })),
    ...SEO_LANDINGS.map((landing) => ({ path: getSeoLandingPath(landing), changefreq: "monthly", priority: "0.8" })),
  ]);
  if (name === "blog") return urlset(blogPosts.map((post) => ({ path: `/blog/${post.slug}`, lastmod: post.updatedAt || post.publishedAt, changefreq: "monthly", priority: "0.8" })));
  if (name === "public-schools") return urlset((await storage.getSchools()).map((school) => ({ path: `/school/${getSchoolSlug(school)}`, lastmod: school.last_updated, changefreq: "monthly", priority: "0.9" })));
  if (name === "private-schools") return urlset((await storage.getPrivateSchools()).map((school) => ({ path: `/private-school/${getPrivateSchoolSlug(school)}`, lastmod: school.updatedAt, changefreq: "monthly", priority: "0.7" })));
  if (name === "early-childhood") return urlset((await storage.getNyceecCenters()).map((center) => ({ path: `/early-childhood/${getNyceecSlug(center)}`, lastmod: center.lastUpdated, changefreq: "monthly", priority: "0.7" })));
  return null;
}

export { llmsText } from "./llmsContent";

export async function submitIndexNow(urls: string[], key: string): Promise<{ status: number; body: string }> {
  const uniqueUrls = [...new Set(urls)].filter((url) => {
    try { return new URL(url, ORIGIN).origin === ORIGIN; } catch { return false; }
  }).slice(0, 10_000).map((url) => new URL(url, ORIGIN).toString());
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: "nycschoolsratings.com", key, keyLocation: `${ORIGIN}/${key}.txt`, urlList: uniqueUrls }),
  });
  return { status: response.status, body: await response.text() };
}
