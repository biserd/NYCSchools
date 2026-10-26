# Coordinated content release — 25 October 2026

## Scope and release boundary

Implements the six content workstreams on the existing URLs, plus the five parent decision guides. No production database writes, identity merges, billing/account changes or production deployment are part of this review batch. New schools are not created. Staging review precedes a separately approved production release.

## Implemented

1. Admissions correctness: removed the shared missing-method → Zoned fallback, the unscreened/screened substring bug, blanket zoned-seat guarantees and unsupported borough/school claims. Mark Twain has dated official talent-test evidence. Other school-level stored methods are explicitly not current program verification. Middle-school rules distinguish method, eligibility, priorities and conditional continuation.
2. Existing traffic: elementary and middle articles use shared SSR/client report components and a compact, cached API. Same-year selection, exclusions, borough denominators, tested counts, school links, source names, survey context and admissions evidence use one report model. Borough bars are equal-school averages, not claimed official student-weighted rates. Map starts citywide, preserves seat-type filters, has one canonical URL and crawlable links to all 32 districts below the map.
3. Private elementary: all matching canonical NCES records are filterable/paginated; grade spans, source years, enrollment, affiliation/type, student/FTE ratios and evidence links are visible. Two official 2026–27 tuition examples explain grade differences, inclusions and aid. Unknown religious affiliation no longer passes the non-religious filter.
4. Local pilot: District 2, UES, UWS and Park Slope have distinct decision guidance, explicit district/ZIP scope, stage counts, stage-specific tables, dated academic coverage and relevant actions. General results are alphabetical, not a mixed elementary/high-school ranking.
5. Continuity: all canonical overlaps are available with program-combination, district and name/ID filters and pagination. Three official-source spot checks cover triple-program, double-program and single-program records. K is derived from explicit grades, never a 2K substring. No automatic continuation or seats are inferred.
6. Language/comparisons: source-checked Spanish and Mandarin examples are separated from unverified stored flags. Program models, entry-grade uncertainty and operating-year limitations are visible. Curated pairs retain stable DBNs, matched assessment years or graduation entry cohorts, matched survey instruments, participation context and official admissions sources.

New guides: /guides/nyc-school-district-map-and-zones, /guides/private-elementary-schools-nyc, /guides/2k-3k-prek-kindergarten-same-school, /guides/ps6-vs-ps290, /guides/townsend-harris-vs-stuyvesant.

## Evidence and remaining data limitations

- NYCPS middle-school source: https://www.schools.nyc.gov/enrollment/enroll-grade-by-grade/middle-school (checked 2026-10-25; fall 2027 timeline and rules). Do not reuse old blanket school-method claims. Unverified per-program methods remain unknown.
- Bilingual source: https://infohub.nyced.org/in-our-schools/programs/english-language-learners-programs-and-services (checked 2026-10-25). Verified Spanish DBNs: 01M020, 01M332, 02M001. This is a verification sample, not a full audit of 579 program entries.
- Mandarin: https://www.ps184m.org/ explicitly describes English/Mandarin dual-language teaching. Official DBN 01M184; generic Chinese labels at other schools remain insufficient. Operating cycle and exact entry-grade sequences still require confirmation.
- MySchools 2-K public directory (checked 2026-10-25): 10XAPN2KEF lists 3-K and pre-K; 06G2622KEF lists 3-K; 06H5302KEF does not list additional age programs in the checked features. Existing imported cycle stays 2025–26; a new editorial check is not a new source release.
- Bank Street official 2026–27 tuition page: https://school.bankstreet.edu/admissions-2/tuition-financial-aid/. K–4 $68,885, grades 5–8 $71,545. Stored PK–10 range conflicts with official grade evidence.
- Dalton official 2026–27 tuition page: https://www.dalton.org/admissions/tuition-and-financial-aid. $70,800 K–12; inclusion/fee caveats visible. NCES IDs 00941729 and A2102584 have different addresses but matching reported enrollment. Do not add them as separate institution enrollments or merge their identities without reconciliation.
- Historical private import script scripts/import-pss-2023-24.ts has a suspect grade-code map. The source CSV shows Bank Street LoGrade 2 / HiGrade 13 with enrollment through eighth grade, while the script maps 13 to grade 10. **A source-codebook-validated migration is still required to repair canonical private-grade values. This content release does not silently rewrite them.** Directory counts are explicitly counts of stored records, not an independently verified institution census.
- Full language-entry-grade verification and private identity/grade reconciliation are data-maintenance follow-ups, not claims of completion.

## Measurement contract

New guide_next_step event records only guide_path, destination_path and action (profile, compare, saved_schools). No child data, search text or personal addresses are sent. It is a click, not proof a school was saved or a comparison completed. Retain existing comparison_school_added, save, checkout and confirmed-paid events; do not create parallel purchase counts.

GSC baseline is the supplied export ending 2026-10-23, not a newly queried report: latest 28-day clicks 2,678 vs 2,881; impressions 222,559 vs 212,489; CTR 1.20% vs 1.36%; average position 9.45 vs 10.05. Query exports have no dated query-history split, so “lost keywords” cannot be established. No authenticated GA/GSC reporting tool was available in this turn. Capture the release date at production approval and compare page/query trends after four weeks, then 8–12 weeks with seasonality considered. No automatic monitoring is enabled.

## Verification

- TypeScript and production client build.
- Parent-guide data, canonical IDs, missing-data safety, SSR/sitemap and outage-recovery regression suite.
- Content-plan admissions, same-year denominators, SSR ranking articles, continuity, official-language matching and map tests.
- Existing rating and internal-link suites.
- Browser checks at 390px and 1440px: all five new guides, both ranking articles, map, four local pilot pages, Spanish and Mandarin. Includes zero-match state, pagination, canonical URLs, no horizontal page overflow and no JS exceptions.
- Initial bundle guard: 157,347 gzip bytes vs prior 156,855 (+492 bytes); zero database modules in initial client.
- Cloudflare staging Worker bundle dry-run passes. Production release remains gated on user approval.

Staging URL: https://nyc-schools-ratings-d1-staging.biser-d.workers.dev/explore-schools. Full browser checks passed against deployed staging at both widths. Both ranking APIs and pair-comparison survey queries returned 200; middle report matched survey data for 25 displayed schools, and the P.S. 6/P.S. 290 comparison matched both schools. /sitemaps/guides.xml contains all five new guides; /sitemaps/blog.xml reflects the updated review date. Staging responses retain X-Robots-Tag noindex/nofollow/noarchive. The existing preview expiry is 2026-10-26 22:00 UTC (6 p.m. New York time); no expiry extension was made.

Final staging Worker version: bd4facdb-8818-4861-a166-7e42cdb99ec2. Final smoke check confirmed matching raw/client article titles and 50 visible private-directory source-year labels. Ranking-report outage recovery is tested and incomplete report HTML is not retained in the HTML cache. Source changes remain uncommitted for review; no main-branch push was made.
