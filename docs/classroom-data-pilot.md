# School enrollment and class-size pilot

Scope: the [P.S. 158 profile](/school/02m158-ps-158-bayard-taylor#enrollment-and-class-size), [District 2 kindergarten comparison](/district/2#kindergarten-class-size), and [public data analysis](/blog/does-falling-enrollment-mean-smaller-classes). The panels cover this pilot, not every school profile. The free article is in the blog and sitemap. The pilot does not alter directories, demographics totals, admissions, the pupil–teacher ratio field, or ratings.

## Data and verification

| Input | Selected records and grain | Interpretation |
| --- | --- | --- |
| [NYCPS Table B](https://infohub.nyced.org/docs/default-source/default-document-library/fy27---table-b---enrollment-projections.xlsx) | Release and DBN and grade or explicit subtotal. 2025–26 audited, 2026‑10‑31 preliminary, 2027–28 forecast. Validate year from the actual row-year column and sheet name; the audited tab's first title cell is inconsistent. | Keep forecasts off the actuals timeline. K–12 excludes 3-K and pre-K; district/grade totals do not imply seats. Charter schools, NYCEECs and adult education are excluded. D75 inclusion students are attributed to their D75 school. |
| [NYCPS class-size workbooks](https://infohub.nyced.org/reports/government-reports/class-size-reports) | Release and DBN and grade and program. District 2, kindergarten, Gen Ed and ICT, official classes. Older releases had no subject column. Newer releases include cluster classes; exclude them. | November 2025 and February 2026 describe one October 2025 observation. Store both; use February to display October. A June observation is a distinct point, not a revision. |
| [NYCPS Table C](https://infohub.nyced.org/docs/default-source/default-document-library/fy27---table-c---2026-27-class-size-compliance-by-school.xlsx) | Release and DBN and grade, 2026–27 official kindergarten classes. | This independent eligible-class count is not the percentage implied by an average. No class-level exemption or policy inference. |

The import records source URLs, exact sheet where applicable, and SHA-256 of each workbook. It checks source grain before combining data, verifies district workbook student and class totals independently for each of three class-size releases, and keeps missing, suppressed and reported zero distinct. The P.S. 158 and District 2 counts are acceptance checks, not fallback data. The reader matches profile links by exact DBN only; an unmatched profile does not remove an official school from the district denominator.

- Audited K–12 total: 789,918. Preliminary K–12 total: 766,872. Both cover 1,627 DBNs, with no duplicates in either register. The 1,622 school IDs in both tabs fell by 22,634.
- P.S. 158: 92 → 96 kindergarten enrollment; 550 → 528 K–12; 599 → 587 all reported grades. Compare 95 students in five classes, independent of the 96-student register. Gen Ed: 74 students / 4 classes; ICT: 21 / 1. Table C: 4 of 5 eligible classes at or below the cap.
- District 2: 2,052 students / 102 classes across 35 schools in October 2026, matching the district workbook. The updated October 2025 release has 2,042 / 107 across 35 schools. The descriptive matched set is 31 schools with the same included program types and both reported register counts. Of the 13 with falling K enrollment, 10 had lower average class size and three had higher average class size. This is not a causal estimate.
- Expanded preview: P.S. 158's official class-size bins are 18, 18, 19, 19 and 21. The importer checks these `K-5 Counts` bins against the school `K-5 Average` rows, then verifies the district rollup against its independent workbook. Cap compliance still comes from Table C, not the average or a hard-coded cap. The draft shows the full 31-school cross-tab and two reproducibly selected examples (largest positive and negative unrounded average changes among schools with declining kindergarten enrollment).
- The interactive draft chart uses one unique matched DBN per point. Horizontal position shows the difference in the kindergarten register count; vertical position shows the unrounded difference in students per official class. Tests reconcile every point back to both register and class totals and check that all quadrants aggregate to the published cross-tab. Overlapping points remain individually accessible from the school selector.
- The production legacy enrollment table was read-only checked and ends in 2025–26. Separate new snapshot tables prevent treating older admissions and demographics counts as identical to Table B. The official 12.15:1 pupil–teacher ratio is outside the display; the legacy value of 16:1 was not changed.

## Reproduce locally

From the repository root with Node 22+ and an analysis Python environment with `openpyxl`:

```sh
python scripts/data/import_classroom_pilot.py --out-dir dist/classroom-pilot --workbook-cache dist/classroom-pilot/workbooks
npm run test:classroom-pilot
npm run build
npm run preview:classroom-pilot
```

The import emits a seed SQL file and an audit JSON in the ignored build directory. It does not connect to a database. The preview uses an in-memory SQLite copy and the existing site's public school and statistics GET endpoints with no cookies or credentials. It listens only on 127.0.0.1:8799, rejects writes, and returns noindex headers. No remote staging expiry or production setting is changed.

## Release verification and rollback

Apply only `migrations-d1/0016_classroom_data_pilot.sql` and the generated `dist/classroom-pilot/classroom-pilot.sql` to the explicitly verified D1 binding. The inserts are repeatable for the same source files. Run `node scripts/d1/audit-classroom-pilot.mjs --staging` first; the corresponding production check uses `--production`. Deploy only after the audit matches the workbook totals and verifies the plot cohort. The Worker reads this data only if `CLASSROOM_PILOT_ENABLED=true` and the environment is staging or production. The old `/preview` URL is staging-only; the production article is served with its own canonical and full server-rendered content. For rollback, restore the previous Worker version or disable the feature and keep the additive data intact. Do not restore the whole database.
