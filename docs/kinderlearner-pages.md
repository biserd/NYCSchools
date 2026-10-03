# KinderLearner product pages

## Blue-theme and App Store preparation update

The product now uses the school site's blue/white visual language, with restrained domain accent colors inside activity illustrations. The CSS remains entirely scoped to KinderLearner. The banner, primary CTAs and availability section clearly say the iPhone/iPad apps are coming soon. Current versus planned features are distinguished after reviewing the native app repository.

Four fully server-rendered information routes were added: `/kinderlearner/privacy`, `/kinderlearner/terms`, `/kinderlearner/support`, `/kinderlearner/delete-data`. See [App Store handoff](kinderlearner-app-store.md) for source evidence, final URLs and remaining owner/release checks. The app's existing support mailbox is retained. Website accounts, prices and billing were not changed.

Follow-up QA: all seven routes passed browser checks at 375, 768 and 1440 pixels (21 checks): no horizontal overflow, one H1 and coming-soon messaging. Mobile deletion-page readability and desktop landing/privacy layouts were visually reviewed. TypeScript, production build, KinderLearner tests, SEO-linking regressions and the local Worker bundle dry-run passed again. No deployment was performed.

## Routes and ownership

- `/kinderlearner`: parent insight, five learning powers, adaptation, evidence, missions, teaching philosophy, short sessions and privacy.
- `/kinderlearner/pre-k-learning-app`: ages 3–5, foundational skills, play and parent-guided practice.
- `/kinderlearner/kindergarten-learning-app`: ages 4–6, reading/math progressions, memory, support and practice that lasts.

These are marketing pages, not an implementation of the learning app. Preview cards are explicitly illustrative. No store listing, purchase price, testimonials or aggregate ratings were fabricated.

## Launch destination

Set `KINDERLEARNER.launchUrl` in `shared/kinderlearner.ts` to the verified HTTPS app/onboarding destination, then rebuild. All primary CTAs use that setting. Until then, they scroll to an honest availability notice and contact link; there is no fake signup or purchase flow. Invalid or non-HTTPS values also retain the availability fallback.

The same file owns route metadata, FAQs and JSON-LD. `shared/KinderLearnerContent.tsx` contains reusable visual components and the three distinct page narratives. Styling is scoped in `client/public/kinderlearner.css`; bump the stylesheet query version when publishing later CSS updates.

## Rendering and discovery

- Full React HTML is rendered on the server using `renderToString`, preserving the text boundaries needed for hydration. Direct loads retain the rendered content instead of replacing it with the main app's lazy-route loader.
- SPA navigation has the same metadata and content. Ordinary school routes keep their existing bootstrap behavior.
- Metadata, canonical URLs and SoftwareApplication/FAQPage/BreadcrumbList JSON-LD share one source of truth.
- All seven marketing and information pages are included in `/sitemaps/static.xml`, referenced by the existing `/sitemap.xml` index.
- Incoming links: existing footer Resources, the elementary-school guide, Pre-K program guide, kindergarten blog guide and early-years admissions blog.
- Outgoing links: age paths, school search, relevant guides, family calendar, privacy, terms and contact.

## Verification (local, 2026-09-26)

- TypeScript check and production Vite build passed.
- `npm run test:kinderlearner`: full server HTML, exact metadata, canonical URLs, unique H1, schema parity, link targets, anchors, sitemap inclusion, safe launch URLs, focus styles, reduced motion and zoom allowance.
- `npm run test:seo-linking` passed.
- Cloudflare staging Worker bundle dry-run passed; no upload/deployment was performed.
- Browser tested all three pages at 375, 430, 768, 1024 and 1440 pixel viewport widths: no horizontal overflow; one H1 and correct canonical on every page. The Windows scrollbar consumes 15px of the viewport's content width.
- Fresh browser session had no console warnings/errors. CTA anchor, keyboard-operated native FAQ disclosure and age-path navigation passed.
- Normal body text contrast was checked against the off-white, sage and white surfaces; the muted color was darkened to keep it above 4.5:1. Focus indicators, semantic landmarks, reduced motion, pinch zoom and accessible control labels are present. This is a targeted accessibility review, not a comprehensive certification.
- Server smoke tests: all three landing routes return HTTP 200; an unknown KinderLearner route returns 404. Existing pricing route still returns HTTP 200.
- Existing elementary-school guide and kindergarten blog return HTTP 200 with the new contextual links; `/sitemaps/static.xml` returns HTTP 200 with the new routes.

### Performance scope

The preview uses HTML/CSS and SVG icons, not raster images, web fonts, video or animation libraries. Landing content does not fetch school data, and the dedicated stylesheet is available in the initial response. Server markup remains visible during hydration.

The existing application entry bundle is still loaded (approximately 285KB gzip in this build); the KinderLearner chunk including the four information pages is approximately 17.05KB gzip, plus shared chunks and CSS. This is a bundle-impact review, not a measured Core Web Vitals pass. Chrome performance-tracing tools were unavailable; measure LCP/CLS/INP on the deployed staging build before claiming field performance improvements.

For the installed local workerd runtime, preview required a command-line compatibility-date override to `2026-09-04` and a local-only `SESSION_SECRET`. No deployed compatibility date or environment setting was changed.

## Release boundary

No production or remote staging deployment, database migration, account change, billing change or product launch occurred in this task. The existing unrelated `artifacts/` directory was left untouched.
