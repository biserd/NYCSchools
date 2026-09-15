# 2026 survey release implementation

Status: staging approved for production on 2026-09-15. Production survey import completed; application promotion and smoke tests recorded below.

Preview: https://nyc-schools-ratings-staging.biser-d.workers.dev/blog/nyc-school-survey-2026

Worker version: `779f8d1c-1040-4731-b3b6-9f7fbed5f8ff`. New Neon branch `staging-survey-2026-09-15` (`br-wispy-scene-ayxpjlvf`) cloned current production data/schema. Staging expires 2026-09-22 at 16:58 UTC; branch auto-deletion follows at 16:58:17 UTC. Only staging Hyperdrive was redirected; production connection unchanged.

## Data

Five summary-sheet sources passed parser validation on 2026-09-15: K12 family 1,846; K12 teacher 1,770; student 1,123; Birth-to-5 family 1,243; Birth-to-5 teacher 1,057. Total 7,039 records. Original workbooks are in the workspace outputs/2026-school-data-assessment directory.

`scripts/import-surveys.ts SOURCE_DIRECTORY` validates without database writes. `--apply --expected-host HOST` requires a DATABASE_URL whose host matches HOST, applies the additive SQL migration in a transaction, matches official identifiers and inserts release observations. Same-hash replays skip existing releases; changed files require review. Never use db:push for this rollout.

New tables reference existing canonical schools and centers. No school/program/rating fields are changed. Unmatched observations are retained without attaching to a profile. Do not imply every center matches or every source row has usable scores.

## Product surfaces

- Canonical school and early-childhood profiles: source-specific feedback, response count/rate, published scores, missing-value warnings and provenance. SSR and client use the same result presentation.
- Compare: same-year/same-instrument results only. Multiple center records are not averaged.
- Seven /insights pages: survey hub, family, teacher, student, early childhood, survey methodology and preliminary assessment release status. Full shared article content is server rendered; matching client metadata, canonical URLs, Article/Breadcrumb structured data and sitemap entries are implemented.
- Footer link to the survey hub. No whole survey dataset is added to the homepage response.
- Existing rating formulas and prior score fields remain unchanged.

## Verification performed

- All five actual workbook summary sheets validated; unique source IDs and 0–100 scores.
- TypeScript, Vite build, Cloudflare staging dry-run bundle.
- Survey regression tests: missing/zero/range checks, exact ID matching and ambiguity rejection, escaping, SSR article content, metadata, sitemap and unknown slugs.
- Existing ratings, 2-K and SEO linking regressions.
- Family insights page checked in browser on desktop and mobile. Mobile header overflow observed and a new-pages-only responsive header option added.

## Required before production

1. Completed: recreated isolated staging branch from production with seven-day expiry.
2. Completed: imported 7,039 observations and replayed all five releases idempotently. All 2,408 canonical schools remained unchanged; complete-row fingerprint `a8d726f3ce17e6793a04e2083a6befd8` matched before/after each transaction. Canonical school matches by instrument: 1,754 family, 1,686 teacher, 1,054 student, 42 B5 family, 38 B5 teacher. Center matches: 689 B5 family and 595 B5 teacher (overlap with school matches; do not sum).
3. Completed: all seven insight pages returned 200; school and center survey APIs returned imported data; two school profiles included survey results in raw SSR. Unknown article returned 404. Browser confirmed hub and 18KAVQ profile, scores, missing values, small-count caution and expandable source details. Private auth/subscription APIs and POST requests returned 403. Responses carried noindex/no-store and no Set-Cookie; robots.txt disallows all crawling. Existing neighborhood-safety API is blocked by the staging allowlist and shows 403; this is a staging limitation, not a production regression.
4. Finish review of source-center aliases and any multiple matches. No name-only inference.
5. User review and explicit production approval, then production backup, import, deploy and smoke tests.

Staging import succeeded through an authenticated, temporary Wrangler remote-preview session after branch recreation. The temporary session was stopped after successful import and replay. No public import endpoint was deployed.

## September 15 editorial and visual revision

Staging-only version `d4619b8f-4c71-4ca7-9118-f95578a52890`. No database writes or production deployment in this revision.

- Rebuilt five survey analysis articles with evidence-led narrative, accessible SSR bar/distribution charts, exact-value tables, school-visit questions, FAQs and source-file audit details. Chart counts: hub 2, family 3, teacher 2, student 3, Birth-to-5 4. Methodology adds one coverage chart/table. Assessment status has a comparison table but no unsupported school-level assessment chart.
- Reproducible evidence generator: `tsx scripts/build-survey-analysis.ts .wrangler/survey-releases.json SOURCE_DIRECTORY`. It checks workbook SHA-256 values, duplicate IDs, score bounds and histogram reconciliation before generating the checked-in aggregate JSON. Medians use one vote per reporting source record, not respondent weighting. Quartiles use R-7; missing values are excluded separately by topic. These are not official citywide respondent percentages or grade-adjusted benchmarks.
- Profile cards now separate score position from evidence availability: teal/blue/amber labeled descriptive bands, response counts/rates, published-topic count, narrative, same-topic/instrument reporting-record median, and clear all-null teacher panels. Academic formulas remain unchanged. Comparison cells use the same labeled bands.
- All external HTTP(S) navigation anchors receive nofollow/noopener/noreferrer and target=_blank through a streaming Worker HTMLRewriter and a bounded client MutationObserver (including Leaflet links). Internal, mailto, tel, forms and fetches are unaffected.
- Browser-verified Birth-to-5 article and profile at desktop and 390px requested viewport (375px content width); final profile and article document widths equal scroll widths. Fixed existing profile header/action-row overflow encountered during QA. Expanded FAQ and source-detail interactions checked. Live source/Leaflet links had the required attributes.
- All seven routes returned HTTP 200 with staging noindex; SSR charts and tables were present. Sample K12 and 2-K profile SSR showed imported results, source links and missing-score narrative. Private auth API remained 403. TypeScript, build, dry run, survey, rating, 2-K and SEO-linking regressions passed. The local 2-K test exercises the graceful missing-database fallback; actual data was checked on staging.

Birth-to-5 files are both included: family 1,243 source records / 1,040 with any published score; teacher 1,057 / 151. Missing scores do not imply poor quality, and records across instruments must not be summed as unique schools.

## Deferred scope

Directory-card survey highlights are not implemented. Prior-year school-level trends and grade-adjusted district/city benchmarks remain deferred until methodology/comparability checks. Current public articles distinguish official citywide findings from our reporting-record medians; they never label an average of school scores as a citywide respondent percentage. Preliminary school-level assessment data is not available for import; the status page explains this.

Rollback: revert application changes to hide the survey surfaces. Leave additive survey tables intact for audit; do not drop data or modify schools as a rollback shortcut.
# Blog integration — September 15, 2026

- Staging version: `677e9732-c21e-4282-aada-56a8efd4f4e9`. Production unchanged.
- All seven new data articles are registered in the existing Blog, with `/blog/` canonical URLs, Blog breadcrumbs, shared article schema and server-rendered Blog listing links.
- Known `/insights/:slug` URLs permanently redirect to their Blog equivalents. Unknown slugs remain 404s.
- Added reciprocal contextual links between survey articles and existing rankings, admissions, safety and academic-recovery posts. Profile links point to verified canonical school URLs; profile survey source links now use Blog URLs.
- `/sitemap.xml` retains its sitemap index; `/sitemaps/blog.xml` includes all seven new articles once, and `/sitemaps/guides.xml` excludes the old Insights URLs.
- Regression tests cover redirects, canonical metadata, charts/tables, sitemap membership, unique slugs and reciprocal links. TypeScript and Vite passed. Live HTTP checks passed for all seven articles/redirects and the Blog/sitemap endpoints. Browser confirmed Blog cards and Birth-to-5 charts, tables and contextual links.
- Fixed date-only Blog timestamps rendering a day early in US time zones by formatting in UTC.

## Production promotion — September 15, 2026

- Explicit user approval received after staging Blog review.
- Previous production Worker version (rollback target): `8d75ebf5-05bf-4a01-aae9-4f7a46b612cb`.
- Saved a pre-import snapshot of canonical schools, early-childhood centers and existing survey tables under ignored `.wrangler/survey-production-before-20260915.json`. This is a scoped data snapshot, not a full database backup.
- Applied only the additive survey migration and five approved releases through a temporary authenticated remote-preview session using production Hyperdrive. No public import endpoint was deployed; the session was stopped after successful import and replay.
- Imported 7,039 observations. Per-instrument counts and exact matches equal staging. Replaying all five releases produced no duplicates.
- Complete-row fingerprints stayed unchanged before/after every transaction: schools 2,408 / `a8d726f3ce17e6793a04e2083a6befd8`; centers 1,885 / `1f51f8ba0c3747d5649662dfda9e4399`. Existing academic inputs, programs, IDs and relationships were not modified.
- Source-workbook validation, survey, rating and SEO-linking regressions and TypeScript checks passed before promotion.
