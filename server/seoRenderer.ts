/**
 * Server-side SEO HTML enrichment for the SPA.
 *
 * The app is a pure client-rendered SPA — `client/index.html` is served raw
 * for every URL and React hydrates the route in the browser. That's fine for
 * Googlebot (which executes JS), but social crawlers (Facebook, Twitter/X,
 * LinkedIn, iMessage, Slack), most secondary search engines (Bing, DDG,
 * Yandex), and AI crawlers (GPTBot, ClaudeBot, PerplexityBot) do NOT execute
 * JavaScript. They see an empty <div id="root"> and the homepage's hardcoded
 * meta tags — so every school page looks identical to them.
 *
 * This module intercepts the HTML response for known detail-page URLs,
 * fetches the entity from storage, and rewrites:
 *   - <title>
 *   - <meta name="description">
 *   - All Open Graph + Twitter Card tags
 *   - <link rel="canonical">
 *   - Inserts JSON-LD structured data (schema.org)
 *   - Inserts a <noscript> content stub so crawlers see real text
 *
 * React still hydrates over the result normally — the noscript block is
 * removed by browsers that run JS, and the meta tags get re-set by the
 * existing client-side SEOHead component (idempotent, no conflict).
 *
 * In-memory LRU-ish cache keyed by URL avoids re-fetching the same entity
 * on every request (1h TTL, 5000 entry cap).
 */

import { storage } from "./storage";
import { extractNcesIdFromSlug } from "@shared/schema";
import { getBlogPost } from "@shared/blog-data";
import type { School, PrivateSchool, NyceecCenter } from "@shared/schema";

const SITE_ORIGIN = "https://nycschoolsratings.com";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.jpg`;

// ---------------------------------------------------------------------------
// LRU-ish cache
// ---------------------------------------------------------------------------
interface CacheEntry {
  html: string;
  expiresAt: number;
}
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_MAX_ENTRIES = 5000;
const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  // Re-insert to make it most-recently-used
  cache.delete(key);
  cache.set(key, entry);
  return entry.html;
}

function cacheSet(key: string, html: string): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // Evict oldest (first key in insertion order).
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { html, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearSeoCache(): void {
  cache.clear();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function boroughName(code: string | null | undefined): string {
  if (!code) return "New York";
  switch (code.toUpperCase()) {
    case "M": return "Manhattan";
    case "X": return "Bronx";
    case "K": return "Brooklyn";
    case "Q": return "Queens";
    case "R": return "Staten Island";
    default: return "New York";
  }
}

interface Meta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  jsonLd?: object | object[];
  noscriptHtml?: string;
}

/**
 * Apply per-URL meta + JSON-LD + noscript content to the base HTML.
 * Targeted regex replacements — leaves everything else untouched so React
 * hydration is unaffected.
 */
function applyMeta(baseHtml: string, meta: Meta): string {
  const t = escapeHtml(meta.title);
  const d = escapeAttr(meta.description);
  const url = meta.canonical;
  const img = meta.ogImage ?? DEFAULT_OG_IMAGE;

  let html = baseHtml;

  // <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`);

  // <meta name="description">
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${d}" />`,
  );

  // Open Graph
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeAttr(url)}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${t}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${d}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${escapeAttr(img)}" />`,
  );

  // Twitter
  html = html.replace(
    /<meta\s+property="twitter:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="twitter:url" content="${escapeAttr(url)}" />`,
  );
  html = html.replace(
    /<meta\s+property="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="twitter:title" content="${t}" />`,
  );
  html = html.replace(
    /<meta\s+property="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="twitter:description" content="${d}" />`,
  );
  html = html.replace(
    /<meta\s+property="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="twitter:image" content="${escapeAttr(img)}" />`,
  );

  // Canonical link — insert if missing, otherwise replace.
  const canonicalTag = `<link rel="canonical" href="${escapeAttr(url)}" />`;
  if (/<link\s+rel="canonical"[^>]*>/i.test(html)) {
    html = html.replace(/<link\s+rel="canonical"[^>]*>/i, canonicalTag);
  } else {
    html = html.replace(/<\/head>/i, `    ${canonicalTag}\n  </head>`);
  }

  // JSON-LD blocks
  if (meta.jsonLd) {
    const blocks = Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd];
    const jsonLdHtml = blocks
      .map(
        (b) =>
          `    <script type="application/ld+json">${JSON.stringify(b).replace(
            /</g,
            "\\u003c",
          )}</script>`,
      )
      .join("\n");
    html = html.replace(/<\/head>/i, `${jsonLdHtml}\n  </head>`);
  }

  // <noscript> content stub — placed at the top of <body> so crawlers find
  // it immediately; browsers that run JS will simply ignore the tag.
  if (meta.noscriptHtml) {
    html = html.replace(
      /<div id="root"><\/div>/i,
      `<div id="root"></div>\n    <noscript>${meta.noscriptHtml}</noscript>`,
    );
  }

  return html;
}

// ---------------------------------------------------------------------------
// Per-route renderers
// ---------------------------------------------------------------------------

// Mirrors shared/schema.ts isHighSchool — kept here to avoid importing client code server-side.
function schoolIsHS(school: { grade_band?: string | null; name?: string | null }): boolean {
  const gb = school.grade_band?.toLowerCase() ?? "";
  const n = school.name?.toLowerCase() ?? "";
  return gb.includes("12") || gb.includes("9-") || gb === "9 to 12" || n.includes("high school");
}

async function renderSchool(slug: string, baseHtml: string): Promise<string | null> {
  const dbn = slug.split("-")[0]?.toUpperCase();
  if (!dbn) return null;
  const school = await storage.getSchool(dbn);
  if (!school) return null;

  const borough = boroughName(school.dbn?.charAt(2));
  const overall = (school as any).overall_score ?? Math.round(
    ((school.academics_score || 0) * 0.4 +
     (school.climate_score || 0) * 0.3 +
     (school.progress_score || 0) * 0.3),
  );

  const isHS = schoolIsHS(school);
  const gradRate = school.graduation_rate_4yr;
  const crRate = school.college_readiness_rate;
  const apCount = school.ap_course_count;
  const isSpecialized = school.is_specialized_hs;

  // --- Title ---
  let title: string;
  if (isHS) {
    const parts: string[] = [`Rating ${overall}/100`];
    if (isSpecialized) parts.push("Specialized HS");
    if (gradRate != null) parts.push(`${gradRate}% Graduation`);
    title = `${school.name} — ${parts.join(" | ")} | NYC School Ratings`;
  } else {
    const parts: string[] = [`Rating ${overall}/100`];
    if (school.ela_proficiency != null) parts.push(`ELA ${school.ela_proficiency}%`);
    if (school.math_proficiency != null) parts.push(`Math ${school.math_proficiency}%`);
    title = `${school.name} — ${parts.join(" | ")} | NYC School Ratings`;
  }

  // --- Description ---
  let description: string;
  if (isHS) {
    const bits: string[] = [`${school.name} rated ${overall}/100 in ${borough}, District ${school.district}.`];
    if (gradRate != null) bits.push(`${gradRate}% 4-year graduation rate.`);
    if (crRate != null) bits.push(`${crRate}% college-ready.`);
    if (apCount != null && apCount > 0) bits.push(`${apCount} AP courses.`);
    if (school.enrollment != null) bits.push(`${school.enrollment.toLocaleString()} students enrolled in grades ${school.grade_band ?? "9-12"}.`);
    description = bits.join(" ");
  } else {
    description =
      `${school.name} rated ${overall}/100 in ${borough}, District ${school.district}.` +
      (school.ela_proficiency != null ? ` ELA proficiency: ${school.ela_proficiency}%.` : "") +
      (school.math_proficiency != null ? ` Math proficiency: ${school.math_proficiency}%.` : "") +
      (school.enrollment != null ? ` ${school.enrollment.toLocaleString()} students in grades ${school.grade_band ?? "K-5"}.` : "") +
      " View ratings, test scores, parent reviews, and commute times.";
  }
  const canonical = `${SITE_ORIGIN}/school/${slug}`;

  // Fetch related schools in the same district for internal linking. The
  // storage layer doesn't expose a district filter, so we pull all schools
  // (cheap — already cached server-side) and filter in JS. Sort by overall
  // score descending to give crawlers links to the highest-quality
  // alternatives in the district.
  let related: School[] = [];
  try {
    const all = (await storage.getSchools()) as School[];
    related = all
      .filter((s) => s.district === school.district && s.dbn !== school.dbn)
      .map((s) => ({
        s,
        score: Math.round(
          ((s.academics_score || 0) * 0.4 +
            (s.climate_score || 0) * 0.3 +
            (s.progress_score || 0) * 0.3),
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.s);
  } catch {
    related = [];
  }

  // Rich JSON-LD description for EducationalOrganization
  const ldDescription =
    `${school.name} in ${borough}, District ${school.district}. Overall Score ${overall}/100.` +
    (school.enrollment != null ? ` ${school.enrollment.toLocaleString()} students enrolled in grades ${school.grade_band ?? "K-5"}.` : "") +
    (isHS && gradRate != null ? ` ${gradRate}% 4-year graduation rate.` : "") +
    (isHS && crRate != null ? ` ${crRate}% college-ready.` : "");

  const educationalOrg = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: school.name,
    url: canonical,
    address: {
      "@type": "PostalAddress",
      streetAddress: school.address ?? undefined,
      addressLocality: borough,
      addressRegion: "NY",
      addressCountry: "US",
    },
    description: ldDescription,
    educationalLevel: school.grade_band,
    numberOfStudents: school.enrollment,
    telephone: school.phone || undefined,
    ...(school.latitude && school.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: school.latitude,
            longitude: school.longitude,
          },
        }
      : {}),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN + "/" },
      { "@type": "ListItem", position: 2, name: borough, item: `${SITE_ORIGIN}/?borough=${encodeURIComponent(borough)}` },
      { "@type": "ListItem", position: 3, name: `District ${school.district}`, item: `${SITE_ORIGIN}/?district=${school.district}` },
      { "@type": "ListItem", position: 4, name: school.name, item: canonical },
    ],
  };

  // Build FAQ — data-rich questions that match real parent searches
  const faqItems: object[] = [];

  if (isHS) {
    // "Is it a good school?" — lead with graduation + college readiness
    const goodAnswer =
      `${school.name} is rated ${overall}/100 by NYC School Ratings` +
      (gradRate != null ? `, with a ${gradRate}% 4-year graduation rate` : "") +
      (crRate != null ? ` and ${crRate}% of graduates meeting college-readiness benchmarks` : "") +
      "." +
      (apCount != null && apCount > 0 ? ` The school offers ${apCount} AP courses.` : "");
    faqItems.push({
      "@type": "Question",
      name: `Is ${school.name} a good school?`,
      acceptedAnswer: { "@type": "Answer", text: goodAnswer },
    });

    // Graduation rate question
    if (gradRate != null) {
      faqItems.push({
        "@type": "Question",
        name: `What is the graduation rate at ${school.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${school.name} has a ${gradRate}% 4-year graduation rate` +
            (school.graduation_rate_6yr != null ? ` and a ${school.graduation_rate_6yr}% 6-year graduation rate` : "") +
            ".",
        },
      });
    }

    // Specialized HS admission question
    if (isSpecialized) {
      faqItems.push({
        "@type": "Question",
        name: `How do you get into ${school.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${school.name} is one of NYC's specialized high schools. Admission is based solely on the Specialized High Schools Admissions Test (SHSAT). Students must list the school as a choice during the high school application process. Cutoff scores vary each year based on test difficulty and applicant pool.`,
        },
      });
    } else if (school.hs_admission_method) {
      faqItems.push({
        "@type": "Question",
        name: `How do you get into ${school.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${school.name} uses a ${school.hs_admission_method} admissions process. Students apply through the NYC high school application system each fall.`,
        },
      });
    }

    // AP / college readiness
    if (crRate != null || (apCount != null && apCount > 0)) {
      const crText =
        (crRate != null ? `${crRate}% of students meet NYC's college and career readiness benchmarks` : "") +
        (apCount != null && apCount > 0
          ? (crRate != null ? `, and the school offers ${apCount} AP courses` : `The school offers ${apCount} AP courses`)
          : "") +
        ".";
      faqItems.push({
        "@type": "Question",
        name: `How college-ready are graduates of ${school.name}?`,
        acceptedAnswer: { "@type": "Answer", text: crText },
      });
    }
  } else {
    // Elementary / middle school questions
    faqItems.push({
      "@type": "Question",
      name: `Is ${school.name} a good school?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${school.name} has an overall score of ${overall}/100 based on academic performance (40%), school climate (30%), and student progress (30%).` +
          (school.ela_proficiency != null || school.math_proficiency != null
            ? ` Students achieve` +
              (school.ela_proficiency != null ? ` ${school.ela_proficiency}% proficiency in ELA` : "") +
              (school.ela_proficiency != null && school.math_proficiency != null ? " and" : "") +
              (school.math_proficiency != null ? ` ${school.math_proficiency}% in Math` : "") +
              " on NYC state assessments."
            : ""),
      },
    });

    faqItems.push({
      "@type": "Question",
      name: `What grades does ${school.name} serve?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${school.name} serves students in grades ${school.grade_band ?? "K-5"}` +
          (school.enrollment != null ? ` with approximately ${school.enrollment.toLocaleString()} students enrolled` : "") +
          ".",
      },
    });

    // Admissions question — uses admission_method when present, otherwise generic NYC zoned guidance
    const admissionMethod = (school as any).admission_method as string | null | undefined;
    let admissionText: string;
    if (admissionMethod) {
      const m = admissionMethod.toLowerCase();
      if (m.includes("zoned")) {
        admissionText = `${school.name} is a zoned school. Families living within the school's attendance zone are guaranteed a seat. Apply through MySchools.nyc during the NYC enrollment window.`;
      } else if (m.includes("lottery") || m.includes("unscreened")) {
        admissionText = `${school.name} admits students through a ${admissionMethod.toLowerCase()} process. All families apply through MySchools.nyc, and seats are assigned by the NYC enrollment lottery.`;
      } else if (m.includes("screen")) {
        admissionText = `${school.name} uses a ${admissionMethod.toLowerCase()} admissions process. Applicants are evaluated using academic records, attendance, and other criteria.`;
      } else {
        admissionText = `${school.name} uses a ${admissionMethod} admissions process. Apply through MySchools.nyc.`;
      }
    } else {
      admissionText = `${school.name} accepts applications through MySchools.nyc during the NYC enrollment window. Most NYC elementary schools are zoned, meaning families in the attendance zone are guaranteed a seat.`;
    }
    faqItems.push({
      "@type": "Question",
      name: `How do you apply to ${school.name}?`,
      acceptedAnswer: { "@type": "Answer", text: admissionText },
    });

    // Programs question — only when at least one program flag is set
    if (school.has_gifted_talented || school.has_dual_language || school.has_3k || school.has_prek) {
      const progs: string[] = [];
      if (school.has_gifted_talented) {
        const gtType = school.gt_program_type === "citywide" ? "Citywide" : "District";
        progs.push(`a ${gtType} Gifted & Talented program`);
      }
      if (school.has_dual_language) progs.push("a Dual Language program");
      if (school.has_3k && school.has_prek) progs.push("3-K and Pre-K seats");
      else if (school.has_3k) progs.push("3-K seats");
      else if (school.has_prek) progs.push("Pre-K seats");
      faqItems.push({
        "@type": "Question",
        name: `What special programs does ${school.name} offer?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${school.name} offers ${progs.join(", ")}.`,
        },
      });
    }

    faqItems.push({
      "@type": "Question",
      name: `Where is ${school.name} located?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${school.name} is located at ${school.address ?? `${borough}, NY`} in District ${school.district}.`,
      },
    });
  }

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems,
  };

  // Build a noscript content stub: heading, key stats, related links.
  const relatedLinks = related
    .map((s) => {
      const sBorough = boroughName(s.dbn?.charAt(2));
      const sSlug = `${s.dbn.toLowerCase()}-${(s.name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`;
      return `<li><a href="${SITE_ORIGIN}/school/${sSlug}">${escapeHtml(s.name)} (${escapeHtml(s.dbn)}) — ${escapeHtml(sBorough)}</a></li>`;
    })
    .join("");

  const noscriptHtml = `
      <article>
        <h1>${escapeHtml(school.name)}</h1>
        <p>${escapeHtml(description)}</p>
        <h2>Key statistics</h2>
        <ul>
          <li>DBN: ${escapeHtml(school.dbn)}</li>
          <li>District: ${school.district}</li>
          <li>Borough: ${escapeHtml(borough)}</li>
          <li>Grade band: ${escapeHtml(school.grade_band ?? "K-5")}</li>
          <li>Enrollment: ${school.enrollment ?? "n/a"}</li>
          <li>Overall score: ${overall}/100</li>
          ${school.ela_proficiency != null ? `<li>ELA proficiency: ${school.ela_proficiency}%</li>` : ""}
          ${school.math_proficiency != null ? `<li>Math proficiency: ${school.math_proficiency}%</li>` : ""}
          ${school.address ? `<li>Address: ${escapeHtml(school.address)}</li>` : ""}
        </ul>
        ${relatedLinks ? `<h2>Other schools in District ${school.district}</h2><ul>${relatedLinks}</ul>` : ""}
        <p><a href="${SITE_ORIGIN}/">Browse all NYC schools</a> · <a href="${SITE_ORIGIN}/compare">Compare schools</a> · <a href="${SITE_ORIGIN}/map">Map view</a></p>
      </article>`;

  return applyMeta(baseHtml, {
    title,
    description,
    canonical,
    jsonLd: [educationalOrg, breadcrumb, faq],
    noscriptHtml,
  });
}

async function renderPrivateSchool(slug: string, baseHtml: string): Promise<string | null> {
  let ncesId: string;
  try {
    ncesId = extractNcesIdFromSlug(slug);
  } catch {
    return null;
  }
  if (!ncesId) return null;
  const school = await storage.getPrivateSchool(ncesId);
  if (!school) return null;

  const borough = (school as any).borough ?? "New York";
  const title = `${school.name} — ${borough} Private School | NYC School Ratings`;
  const description =
    `${school.name} is a private school in ${borough}, NY` +
    ((school as any).gradeRange ? ` serving grades ${(school as any).gradeRange}` : "") +
    ((school as any).enrollment != null ? ` with ${(school as any).enrollment} students` : "") +
    `. View tuition, religious affiliation, programs, and admissions information.`;
  const canonical = `${SITE_ORIGIN}/private-school/${slug}`;

  const schoolSchema = {
    "@context": "https://schema.org",
    "@type": "School",
    name: school.name,
    url: canonical,
    address: {
      "@type": "PostalAddress",
      streetAddress: (school as any).address ?? undefined,
      addressLocality: borough,
      addressRegion: "NY",
      addressCountry: "US",
    },
    description,
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN + "/" },
      { "@type": "ListItem", position: 2, name: "Private Schools", item: `${SITE_ORIGIN}/private-schools` },
      { "@type": "ListItem", position: 3, name: school.name, item: canonical },
    ],
  };

  const noscriptHtml = `
      <article>
        <h1>${escapeHtml(school.name)}</h1>
        <p>${escapeHtml(description)}</p>
        <p><a href="${SITE_ORIGIN}/private-schools">Browse all NYC private schools</a></p>
      </article>`;

  return applyMeta(baseHtml, {
    title,
    description,
    canonical,
    jsonLd: [schoolSchema, breadcrumb],
    noscriptHtml,
  });
}

async function renderNyceec(slug: string, baseHtml: string): Promise<string | null> {
  const locCode = slug.split("-")[0]?.toUpperCase();
  if (!locCode) return null;
  const center = await storage.getNyceecCenter(locCode);
  if (!center) return null;

  const borough = boroughName((center as any).borough);
  const title = `${center.name} — ${borough} Early Childhood Center | NYC School Ratings`;
  const description =
    `${center.name} is a NYC Early Childhood Center (NYCEEC) in ${borough}. ` +
    `View 3-K and Pre-K programs, neighborhood safety, and parent reviews.`;
  const canonical = `${SITE_ORIGIN}/early-childhood/${slug}`;

  const childcareSchema = {
    "@context": "https://schema.org",
    "@type": "ChildCare",
    name: center.name,
    url: canonical,
    address: {
      "@type": "PostalAddress",
      streetAddress: (center as any).address ?? undefined,
      addressLocality: borough,
      addressRegion: "NY",
      addressCountry: "US",
    },
    description,
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN + "/" },
      { "@type": "ListItem", position: 2, name: "Early Childhood", item: `${SITE_ORIGIN}/early-childhood` },
      { "@type": "ListItem", position: 3, name: center.name, item: canonical },
    ],
  };

  const noscriptHtml = `
      <article>
        <h1>${escapeHtml(center.name)}</h1>
        <p>${escapeHtml(description)}</p>
        <p><a href="${SITE_ORIGIN}/early-childhood">Browse all NYC Early Childhood Centers</a></p>
      </article>`;

  return applyMeta(baseHtml, {
    title,
    description,
    canonical,
    jsonLd: [childcareSchema, breadcrumb],
    noscriptHtml,
  });
}

async function renderBlogPost(slug: string, baseHtml: string): Promise<string | null> {
  const post = getBlogPost(slug);
  if (!post) return null;

  const title = `${post.title} | NYC School Ratings`;
  const description = post.description;
  const canonical = `${SITE_ORIGIN}/blog/${slug}`;
  const ogImage = post.featuredImage
    ? (post.featuredImage.startsWith("http") ? post.featuredImage : `${SITE_ORIGIN}${post.featuredImage}`)
    : undefined;

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    url: canonical,
    datePublished: post.publishedAt,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "NYC School Ratings",
      logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/favicon.png` },
    },
    image: ogImage ?? DEFAULT_OG_IMAGE,
    keywords: post.tags.join(", "),
    articleSection: post.category,
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN + "/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_ORIGIN}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };

  const noscriptHtml = `
      <article>
        <h1>${escapeHtml(post.title)}</h1>
        <p><em>${escapeHtml(post.author)} · ${escapeHtml(post.publishedAt)} · ${escapeHtml(post.readTime)}</em></p>
        <p>${escapeHtml(post.description)}</p>
        <p><a href="${SITE_ORIGIN}/blog">Read more articles on NYC School Ratings</a></p>
      </article>`;

  return applyMeta(baseHtml, {
    title,
    description,
    canonical,
    ogImage,
    jsonLd: [article, breadcrumb],
    noscriptHtml,
  });
}

async function renderCompare(slug: string, baseHtml: string): Promise<string | null> {
  // Slug format: "01M015-vs-02M255" or with longer slugs containing names.
  // Extract DBN-looking tokens (2 digits + letter + 3 digits).
  const dbnRe = /\b(\d{2}[a-zA-Z]\d{3})\b/g;
  const matches = Array.from(slug.matchAll(dbnRe)).map((m) => m[1].toUpperCase());
  if (matches.length < 2) return null;

  const schools = (await Promise.all(matches.slice(0, 4).map((d) => storage.getSchool(d))))
    .filter((s): s is School => !!s);
  if (schools.length < 2) return null;

  const names = schools.map((s) => s.name).join(" vs ");
  const title = `${names} — Side-by-Side Comparison | NYC School Ratings`;
  const description =
    `Compare ${schools.map((s) => `${s.name} (${s.dbn})`).join(" and ")} ` +
    `side-by-side: test scores, climate ratings, demographics, programs, and more.`;
  const canonical = `${SITE_ORIGIN}/compare/${slug}`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN + "/" },
      { "@type": "ListItem", position: 2, name: "Compare", item: `${SITE_ORIGIN}/compare` },
      { "@type": "ListItem", position: 3, name: names, item: canonical },
    ],
  };

  const noscriptHtml = `
      <article>
        <h1>${escapeHtml(names)}</h1>
        <p>${escapeHtml(description)}</p>
        <ul>
          ${schools
            .map((s) => {
              const sSlug = `${s.dbn.toLowerCase()}-${(s.name || "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")}`;
              return `<li><a href="${SITE_ORIGIN}/school/${sSlug}">${escapeHtml(s.name)} (${escapeHtml(s.dbn)})</a> — District ${s.district}</li>`;
            })
            .join("")}
        </ul>
      </article>`;

  return applyMeta(baseHtml, {
    title,
    description,
    canonical,
    jsonLd: breadcrumb,
    noscriptHtml,
  });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Returns the SEO-enriched HTML for the given URL, or `null` if the URL
 * doesn't match any known detail-page pattern (caller should serve baseHtml
 * unchanged in that case).
 *
 * Errors are swallowed and logged — we never want SEO enrichment to break
 * the page response. On error, callers receive `null` and serve the base
 * HTML untouched.
 */
export async function renderSeoHtml(
  rawUrl: string,
  baseHtml: string,
): Promise<string | null> {
  // Strip query string + hash for matching/cache key.
  const path = rawUrl.split("?")[0].split("#")[0];

  // Cache lookup uses (path + a short hash of the base HTML's first 100
  // chars) so dev-mode template changes (vite hot updates) bust the cache.
  const cacheKey = `${path}::${baseHtml.length}::${baseHtml.slice(0, 64)}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    let result: string | null = null;
    let m: RegExpMatchArray | null;
    if ((m = path.match(/^\/school\/([^/]+)$/))) {
      result = await renderSchool(m[1], baseHtml);
    } else if ((m = path.match(/^\/private-school\/([^/]+)$/))) {
      result = await renderPrivateSchool(m[1], baseHtml);
    } else if ((m = path.match(/^\/early-childhood\/([^/]+)$/))) {
      result = await renderNyceec(m[1], baseHtml);
    } else if ((m = path.match(/^\/blog\/([^/]+)$/))) {
      result = await renderBlogPost(m[1], baseHtml);
    } else if ((m = path.match(/^\/compare\/([^/]+)$/))) {
      result = await renderCompare(m[1], baseHtml);
    }
    if (result) cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    console.error("[SEO_RENDERER] error for", path, err);
    return null;
  }
}
