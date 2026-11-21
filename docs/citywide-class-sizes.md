# Citywide NYCPS class sizes

This extends the separate [P.S. 158 and District 2 pilot](classroom-data-pilot.md). Class sizes do not affect ratings, admission estimates, or the existing pupil–teacher ratios. The public article retains its original District 2 scope.

## Sources, grain, and coverage

- [NYCPS class-size reports](https://infohub.nyced.org/reports/government-reports/class-size-reports): import the school and district `K-5 Average` and `MS HS Average` tabs. The [November 2026 methodology](https://infohub.nyced.org/docs/default-source/default-document-library/2026-27-class-size-reporting-methodology---web.pdf) defines official elementary classes separately from rotating subject classes. The grade-level selector includes official multi-grade group labels where reported and excludes cluster classes. Middle/high school data are section sizes by exact band, department, course and program, never a count of unique students or an average by grade. Reported range markers such as `<15` are preserved rather than inferred.
- The [2026–27 compliance workbook](https://infohub.nyced.org/docs/default-source/default-document-library/fy27---table-c---2026-27-class-size-compliance-by-school.xlsx) supplies cap numerators and denominators independently at grade/group or exact course grain. Forecast tabs and pupil–teacher ratios are outside scope. No cap figure is derived from an average. If a secondary course maps to multiple band/department combinations, omit the cap label on that course.
- Match school profiles only by canonical DBN. October 31, 2026 has 1,531 source school IDs, 1,523 exact existing profiles and eight unmatched IDs, retained in the release audit but not given new profiles. The five borough counts are Bronx 347, Brooklyn 469, Manhattan 286, Queens 347 and Staten Island 74. Across matched profiles, 1,069 have official grade-level rows, 474 middle-school course rows, and 478 high-school course rows. These groups overlap.
- District pages show grade/group and program for Districts 1–32. Individual profiles compare an exact same-snapshot, same-grade or same-course, same-program official district average when identity and the independent totals agree. The latest workbook has 8,009 such district rows. An unreconciled district number is kept in the import but not used for comparisons.
- The November 2025 and February 2026 files describe the same October 31, 2025 observation. Keep both revisions; use the February workbook in the visible prior-October comparison. June 15, 2026 is a distinct archived observation, not a replacement for October. Do not show secondary year-over-year changes: the November 2026 methodology added new course coverage, including exam preparation.

## School profile access

Classrooms &amp; enrollment on a school profile uses the same paid research entitlement as the account API, including active monthly memberships and grandfathered passes. A locked profile sends dataset availability and one sourced takeaway. Charts, district benchmarks within the panel, and school-level breakdowns are not sent to the browser before entitlement is verified. The blurred panel is decorative. Public district comparisons, the blog, and official sources stay public.

## Rehearse and release

```powershell
python scripts/data/import_class_size_citywide.py --out-dir dist/class-size-citywide --workbook-cache dist/class-size-citywide/workbooks --roster .wrangler/nysed-assessments/source/staging-schools.json
npm run test:city-class-sizes
npm run test:classroom-pilot
npm run test:ratings
npm run check
npm run build
```

The importer keeps URLs and SHA-256 checksums, rejects duplicate or invalid observations, tests each district rollup, and replays imports twice in SQLite before generating SQL in the ignored `dist` tree. Apply only `0017_citywide_class_sizes.sql`, then `releases.sql`, `sections.sql`, and `caps.sql` to the explicitly verified D1 target in that order. Audit with `node scripts/d1/audit-city-class-sizes.mjs --staging` (or `--production` for the approved live rollout), then deploy. The reconciled fingerprints/fixtures include 95 students in five P.S. 158 kindergarten Gen Ed/ICT classes, 4 of 5 reported classes at or below the cap, and 2,052 students in 102 District 2 kindergarten Gen Ed/ICT classes.

Rollback by removing `CITY_CLASS_SIZES_ENABLED=true` or restoring the previous Worker. All new tables are additive; the original pilot and blog remain visible. Do not reset the database or drop the original pilot tables.
