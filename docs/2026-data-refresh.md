# NYCPS school data refresh — November 7, 2026

Current profile ELA/math uses spring 2026 (school year 2025–26), Regents appends reporting years 2024–2026, and demographics/enrollment uses 2025–26. Sources are public NYCPS InfoHub XLSX files linked from [Test Results](https://infohub.nyced.org/reports/academics/test-results) and [Information and Data Overview](https://infohub.nyced.org/reports/students-and-schools/school-quality/information-and-data-overview).

## Coverage and limitations

- ELA/math: 1,126 existing profiles each; 3 unmatched source DBNs each.
- Regents: 20,004 appended exam records (6,482 for 2024; 7,328 for 2025; 6,194 for 2026); 39 unmatched source DBNs across those years.
- Demographics: 1,774 current profiles, 8,826 dated snapshots across five years, and 26,610 new grade enrollment rows. Another 1,774 undated legacy profile snapshots are preserved separately. The 131 unmatched demographics DBNs span all five source years, including historical/closed providers.
- All 6,628 old assessment, 36,361 old Regents, and 2,413 old enrollment rows remain unchanged. Schools absent from the current release keep their prior data and reporting years. Matching is by exact DBN.
- NYCPS ELA/math is the August 3, 2026 snapshot, excludes charter schools/District 75, and is not represented as finalized NYSED data. Participation denominators are not inferred from enrollment. Science is not refreshed; its prior year is preserved separately.
- Suppression stays null; genuine zero stays zero. Bounded demographic values such as “Above 95%” remain bounds in history. Demographic source fractions are multiplied by 100; the Economic Need Index uses a 0–100 display scale.
- ELA/math trend badges compare complete subject pairs within the latest standards era (2023 onward for modern results). Older results remain accessible through the archive selector and historical table. Science is retained in the table at its original year, separately from ELA/math chart lines.
- Regents source years are displayed directly, not expanded into invented school-year ranges. Common Core/predecessor and new science exams remain distinct. The legacy `college_ready_rate` column contains the 80+ score threshold, labeled “Scoring 80+,” not official exam-specific CUNY readiness.

## Preparation and validation

Use Node 22+ and Python 3. The source workbooks are intentionally not committed. The local download directory used here is `../marketing-audit-nov7/education-releases` and holds the four named source XLSX files. Source hashes are retained in the import report and `school_data_releases`.

1. `node scripts/d1/refresh-backup.mjs` reads only the four public-data tables from production into `.wrangler/2026-refresh/prod-before`. Preserve this initial backup; do not overwrite it after importing.
2. `python scripts/data/test_import_values.py` checks suppression, genuine zero, units and distinct exam identities.
3. `python scripts/data/refresh_2026.py` streams the source workbooks, rejects duplicate source grains, prepares SQL and rollback, and rehearses twice on an exact public-data backup. It checks old rows, foreign keys, idempotence and grade totals. All generated data/SQL stays under ignored `.wrangler/2026-refresh`.
4. `python scripts/data/validate_2026.py` independently reconciles all matched source proficiency, tested counts, grade percentages, demographic snapshots and Regents values against the rehearsed SQLite result.
5. Apply additive D1 migration 0012 and prepared `import.sql` to staging first. `node scripts/d1/verify-2026-refresh.mjs` compares every source value across six public tables with the rehearsal and checks every original historical row, including original IDs/timestamps. New ingestion times are validated against the actual import window.
6. Apply the same migration/import to production; use `node scripts/d1/verify-2026-refresh.mjs --production`. Check `school_data_releases` and API year labels after deployment.

No account, billing, payment, email, or safety data is changed. Reporting metadata lives in a companion table because adding three fields to the 98-column school table would exceed D1's 100-column limit. The expired staging Worker is not republished; D1 staging validation and a local public-data UI fixture are sufficient.

Production rollback is a targeted reviewed operation, not a full database restore. The generated rollback restores the prior profile values, removes only the appended source grains, and clears the new demographic metadata/release records. Keep the additive tables and science-year backfill; do not drop historical tables or touch account tables.
