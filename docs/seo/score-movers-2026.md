# 2026 school-results content release

Implements the approved P1–P7 keyword plan. The existing `/blog/nys-test-results-2026` becomes the assessment hub, removing its obsolete “not imported” table and survey-specific methodology. Five subject/results posts are added, with reciprocal links, canonical server-rendered content, Article/Breadcrumb metadata and sitemap dates. Elementary/middle ranking articles have tested-grade-based mover examples; the high-school guide links to the Regents articles. Existing guide click and purchase-attribution measurement continues to apply to the blog paths.

Keyword evidence: `../marketing-audit-nov7/education-releases/score-movers-keyword-evidence.json` (relative to repository parent). Search Console observations cover October 8–November 4, 2026. Proposed Regents phrases are editorial experiments, not measured market-volume claims. Semrush volume/difficulty was unavailable.

## Source and eligibility contract

`scripts/data/score_movers.py` reads the existing, hash-verified NYCPS workbooks. It never writes D1 or changes historical records. Both years use the same source release and All Students rows. Canonical DBNs are checked against the independently validated local public-data snapshot. Downloaded raw/source-cache files stay ignored under `.wrangler/score-movers`. The generated editorial subset is `shared/generated/score-movers-2026.ts`; all eligible pairs, current snapshots, hashes and original source notes are public at `/data/score-movers-2026.json`.

ELA/math compares spring 2025 (2024–25 school year) with spring 2026 (2025–26). Both tested counts must be at least 50, with a 2026/2025 ratio between 0.75 and 1.25 inclusive. Tested grade sets must match and each grade’s tested share must move by no more than 10 percentage points. When all grade proficiency cells are public, fixed 2025 grade weights provide a direction check; direction reversals are excluded. The displayed change is the published all-grade rate difference. Unknown grade-adjusted values stay unknown. Grades in new article tables and stage examples derive from actual tested-grade records, not inconsistent legacy directory grade bands. The Children’s School is excluded because the source documents changed DBN attribution. Charter and District 75 records are outside scope.

2025 profile-history percentages were rounded to whole numbers; 2026 import values were rounded to one decimal. Article deltas use workbook precision and are rounded once to one decimal. Profile reconciliation uses the corresponding rounding tolerance. No old rows are replaced. Endpoints are rounded separately for display. Rankings sort by displayed change then DBN; ties do not imply a meaningful difference. A 100-tested sensitivity ranking and sequential exclusions are exposed beside the tables.

## Regents publication adjustment discovered during validation

Regents reports retain the source Year as a reporting year. They include the highest score per student/exam across January, June and August administrations. Schools can have different tested students and retakers in each year. Same-label Global History and Geography and US History and Government comparisons pass the stated checks; they remain separate. There is no combined all-exam school rank.

NYSED’s implementation schedule, still linked from its current Regents page when checked November 7, 2026, schedules new English Language Arts and Algebra II exams in June 2026, Geometry and new science exams in 2025, and Algebra I in June 2024. NYCPS retains `Common Core English` and `Integrated Algebra` source labels without an administration/version crosswalk. An exact text join cannot resolve that conflict. Accordingly, P6/P7 are useful dated source-category snapshots and explainers with charts, not unvalidated 2026 growth leaderboards. Source labels and limits are visible directly beside their charts. Scoring 80+ is never called a universal college-readiness threshold. New science exams are not merged with predecessor exams.

Sources:

- https://infohub.nyced.org/reports/academics/test-results
- https://www.nysed.gov/state-assessment/high-school-regents-examinations
- https://www.nysed.gov/sites/default/files/programs/state-assessment/memo-implementation-schedule-new-regents-exams.pdf

## Validation and delivery

- Build script validates source key uniqueness, published numerator/denominator agreement and historical rounding reconciliation.
- `scripts/data/validate_score_movers.py` independently reads original XLSX with openpyxl, checks source hashes and recalculates every eligible endpoint from published counts. It validates 1,604 assessment pairs, 605 Regents pairs, 1,594 snapshots and 6,012 endpoint rates. It never reconstructs suppressed counts.
- `npm run test:score-movers` checks full-cohort ranking order, actual-tested-grade stage selection, threshold invariants, exam-version withholding, profile slugs, metadata, canonical SSR and redirects. Existing data/ranking/survey/content regression suites cover integration preservation.
- Charts use the pinned Data renderer, with a fixed 0–100 percentage scale, both years in paired charts, current-year-only snapshots and exact server-rendered tables. Standard legend controls permit series inspection. Source/exclusion/sensitivity inspectors and a public evidence download remain usable separately from chart loading.
- Local preview is public-content-only, noindex, rejects writes and never forwards cookies. Production deployment uses the existing guarded D1 Worker configuration. No source import, database migration, billing change or real email is part of this release.
