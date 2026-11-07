# NYC school discovery improvements — November 7, 2026

Authorized scope: N1–N5, N7 and N8. N6 (purchase and activation funnel audit) is excluded.

## Search intent and content

| Task | Canonical page | Result |
| --- | --- | --- |
| N1 | `/map` | Shared title/description, stable district-map H1, district versus attendance-zone explanation, official address lookup and comparison next step. |
| N2 | `/guides/nyc-school-district-map-and-zones` | Explanatory guide title and reciprocal tool links. Tool and guide retain distinct self-canonicals; filtered map views consolidate to `/map`. |
| N3 | `/guides/private-elementary-schools-nyc` | Fit/cost search presentation, entry-year checklist, visible directory next step, dated profile evidence and a Brooklyn related guide. Existing October 25 tuition checks remain labeled with that date. |
| N4 | `/private-schools` | Borough/grade links populate working filters, preserve the other selected dimension and update shareable URLs. Shared SSR copy explains source years, tuition and ranking limits. Structured data describes the displayed records. Filter URLs retain the directory canonical. |
| N5 | `/blog/best-nyc-middle-schools-2026` | Contextual shortlist, compare and family/reminder links near the introduction and conclusion, with guide-action click reporting. |
| N7 | `/guides/private-schools-brooklyn` | New self-canonical guide in the guide hub and sitemap; Brooklyn-only canonical NCES records, stage filters, dated profile links and three attributed official-source examples. |
| N8 | Private working scorecard | Five observed queries, six target pages, exact-query URL mappings, click metric definitions and a repeatable 28-day comparison procedure. Business analytics are kept outside the public site/repository. |

The Brooklyn guide uses recorded grade ranges, not independently reverified current provision. Unknown grades remain unclassified; NCES IDs are deduplicated, while similarly named schools/campuses are not silently merged. Stage counts overlap. Official school examples illustrate fit questions rather than a ranked top three.

## Guide-action measurement

Event: `guide_next_step`.

| Event-scoped dimension | Parameter | Meaning |
| --- | --- | --- |
| Guide path | `guide_path` | Source pathname, without query or fragment. |
| Guide action | `action` | `profile`, `shortlist`, `compare`, `reminders`, `saved_schools`. |
| Guide placement | `placement` | `intro`, `shortlist`, or `content`. |
| Guide destination | `destination_path` | Internal destination pathname. |

These four custom definitions were registered in the NYC School Ratings GA4 property on November 7, 2026. Counts describe link clicks. They do not establish completed shortlist creation, saved-school success, reminder opt-in, activation or purchase. No billing or purchase event changes are part of the marketing commit.

Baseline observations cover October 8–November 4, 2026, Search Console Web (text). Use the first complete day after production release to begin a 28-day follow-up, then allow processing lag. Export matching exact queries and pages with unchanged country/device filters. Calculate CTR from total clicks divided by total impressions; do not average daily CTR or positions. Before/after differences can reflect admissions seasonality and are not causal proof. The private scorecard leaves unobserved values empty.

## Production baseline preservation

GitHub main was behind live Worker `12c6c9d1-8c03-404d-8835-62502a287fd1`. The preceding preservation commit retains its private KinderLearner RPC export, active-status evaluation, App Store aside and existing welcome banner. The unrelated local checkout remains untouched. Later unpublished membership copy was excluded. Eight compiled entitlement, pricing and email functions were compared with the active Worker before release.

## Validation

Run `npm run check`, `npm run build`, `npm run test:parent-guides`, `npm run test:content-plan`, `npm run test:seo-linking`, `npm run test:marketing-discovery`, and `npm run test:pricing-value`. The marketing suite checks borough scoping, canonical ID handling, unknown grades, deep links, event payloads, CTA markup, SSR titles/canonicals and sitemap discovery. Local UI checks use public read-only school APIs with no authenticated customer actions.
