# Rankings and district averages: 2026 assessment audit

The refreshed 2026 ELA/math results are stored as school year `2025-26`. Elementary/middle ranking reports already read the canonical records and calculate school scores from those values. This audit closes remaining gaps in district statistics and current-year ranking eligibility.

## District and citywide statistics

All three storage methods now use `shared/district-averages.ts`, with identical definitions for single-district, all-district and citywide responses:

- ELA/math use the latest citywide assessment year, complete reported subject pairs, and the existing confidence rules. Pure high schools and early-childhood-only providers do not enter grades 3–8 assessment means. A district without current-year data returns null, not an older year's average or a default 50.
- Values are unweighted means across schools, not official student-weighted district proficiency rates. `assessmentSchoolCount`, `ratedSchoolCount`, `demographicsSchoolCount` and `metricCounts` identify denominators.
- Assessment-based overall averages are means of actual eligible school ratings. They do not recombine component averages with different populations. High-school ratings are averaged separately in `highSchoolOverallScore` and retain their graduation/readiness/progress formula; 2026 Regents results do not redefine that formula.
- Demographic/enrollment means use the latest demographic school year, separately from the assessment cohort. Suppressed values stay null, genuine zero is preserved, and missing ratios no longer become 15:1. Legacy survey/ratio components carry explicit vintage notes rather than being called 2026 results.
- The developer districts endpoint exposes years, counts, separate high-school averages and methodology. Profile/side-by-side comparison differences require matching assessment or demographic years; high-school overall comparisons use the high-school cohort.

## Current-year rankings

- Directory Overall and Academics sort, both school search tools, legacy `get_top_schools`, current Safe & Strong ranking rows and related-school links use the latest citywide assessment cycle for assessment-based ranking eligibility. Historical profiles remain discoverable with their original years but do not outrank current assessment records as if equally current.
- Elementary/middle ranking reports select the latest source year before eligibility filtering. If the latest release has no eligible results, they no longer silently fall back to an older year.
- Canonical reads recalculate elementary/middle Academics from ELA/math, preventing a stale cached component from diverging from the source values or displayed overall formula. Stored history and raw imported data are not rewritten.
- The directory and profile comparison note show the school year and spring test year. High-school indicators remain distinct from a 2026 ELA/math or Regents ranking.

## Validation

`npm run test:district-rankings` uses fixtures plus the real migrated SQLite/storage/MCP paths. It covers mixed years and school types, low tested counts, missing components, an empty district, genuine zero, reported-value denominators, canonical deduplication, no older-year fallback, stale cached Academics, separate high-school cohorts and parity across all three aggregation methods.

An independent SQL reconciliation against the prepared public-data SQLite snapshot verifies assessment/demographic means, denominators and actual rating means for all 32 districts plus the citywide response. The live check also compares single/all/citywide endpoints and current ranking report years. SQLite expressions use real division for the per-school ELA/math mean. Existing ratings, school-data integration, content, Muse, pricing, ChatGPT landing, marketing and guide checks remain applicable.

No migration, reimport, historical-data deletion, billing or account change is required. Deployment uses the production guard and existing canonical D1 binding.
