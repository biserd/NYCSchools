import { storage } from "./storage";
import { blogPosts } from "@shared/blog-data";
import { SCHOOL_GUIDES } from "@shared/school-guides";
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
    "/", "/map", "/compare", "/recommendations", "/early-childhood", "/private-schools", "/lottery-simulator", "/chances-calculator", "/safe-and-strong", "/blog", "/pricing", "/features", "/benefits", "/faq", "/contact", "/methodology", "/about", "/explore-schools", "/safety-methodology", "/developers", "/developers/docs", "/privacy", "/terms",
  ].map((path) => ({ path, changefreq: path === "/" ? "daily" : "monthly", priority: path === "/" ? "1.0" : "0.7" })));
  if (name === "guides") return urlset([
    ...SCHOOL_GUIDES.map((guide) => ({ path: `/nyc-schools/${guide.slug}`, changefreq: "monthly", priority: "0.8" })),
    ...SEO_LANDINGS.map((landing) => ({ path: getSeoLandingPath(landing), changefreq: "monthly", priority: "0.8" })),
  ]);
  if (name === "blog") return urlset(blogPosts.map((post) => ({ path: `/blog/${post.slug}`, lastmod: post.publishedAt, changefreq: "monthly", priority: "0.8" })));
  if (name === "public-schools") return urlset((await storage.getSchools()).map((school) => ({ path: `/school/${getSchoolSlug(school)}`, lastmod: school.last_updated, changefreq: "monthly", priority: "0.9" })));
  if (name === "private-schools") return urlset((await storage.getPrivateSchools()).map((school) => ({ path: `/private-school/${getPrivateSchoolSlug(school)}`, lastmod: school.updatedAt, changefreq: "monthly", priority: "0.7" })));
  if (name === "early-childhood") return urlset((await storage.getNyceecCenters()).map((center) => ({ path: `/early-childhood/${getNyceecSlug(center)}`, lastmod: center.lastUpdated, changefreq: "monthly", priority: "0.7" })));
  return null;
}

export function llmsText(full = false): string {
  const summary = `# NYC School Ratings\n\n> Independent NYC school comparison service using public NYSED and NYC Public Schools data.\n\n- Website: ${ORIGIN}/\n- School guide index: ${ORIGIN}/explore-schools\n- Methodology and sources: ${ORIGIN}/methodology\n- REST API documentation: ${ORIGIN}/developers/docs\n- MCP endpoint: ${ORIGIN}/mcp\n- Sitemap: ${ORIGIN}/sitemap.xml\n\n## Citation guidance\n\nCite the canonical school or guide URL. State the metric's reporting year when available. Treat ratings as comparison aids, not official NYC Public Schools ratings. Verify current zones, programs, and admissions rules with NYC Public Schools.\n`;
  if (!full) return summary;
  return `${summary}\n## Rating methodology\n\nFor schools with sufficient data, the overall score combines academics (40%), school climate (30%), and student progress (30%). High-school pages use age-appropriate outcomes. Ratings are withheld when required inputs are missing or state-test participation is too limited.\n\n## Primary sources\n\n- NYSED open data: https://data.ny.gov/browse?Dataset-Information_Agency=Education+Department%2C+State\n- NYC Public Schools test results: https://infohub.nyced.org/reports/academics/test-results\n- NYC School Quality Reports and Surveys: https://infohub.nyced.org/reports/school-quality\n- Official NYC School Search: https://schoolsearch.schools.nyc/\n\n## Key collections\n\n- District guides: ${ORIGIN}/district/1 through ${ORIGIN}/district/32\n- Neighborhood guides: ${ORIGIN}/neighborhood/astoria\n- Program guides: ${ORIGIN}/program/dual-language\n- Public-school records: ${ORIGIN}/school/{dbn}-{slug}\n\n## Usage notes\n\nDifferent fields may come from different release cycles. Prefer the year and last-updated fields attached to the record. Do not infer school-zone eligibility from a ZIP-code neighborhood guide.\n`;
}

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
