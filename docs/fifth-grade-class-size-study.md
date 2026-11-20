# Fifth-grade class size and test results: reproducibility notes

Article: `/blog/nyc-fifth-grade-class-size-test-scores`. This is an observational study of schools, not student-level assignment or a causal estimate. The study snapshot is independent of the site’s ratings inputs.

## Inputs

- [NYCPS October 31, 2025 school-level class counts, revised February 2026](https://infohub.nyced.org/docs/default-source/default-document-library/february-2025-26-class-size---school.xlsx), SHA-256 `5dd906c727cfa940fb1c4538469bf570c02b7e580d9caedd00a2039e985dbd4a`. Reuse the versioned import and roster in [citywide class sizes](citywide-class-sizes.md). The sensitivity check uses the original November version of the same observation.
- [NYSED final School Report Card archive, November 19, 2026](https://data.nysed.gov/files/essa/25-26/SRC2026.zip), SHA-256 `39223a547a04d83851300dc3c4b55773093783b1fff55306e61d696454c24252`. Extract `SRC2026_Group1.accdb`; run the following three queries in read-only mode, substituting `ELA`/`ELA5`, `Math`/`MATH5`, and `Science`/`Science5`. Place `ELA.csv`, `Math.csv`, and `Science.csv` in `dist/class-size-citywide/outcome-analysis/` as UTF-8 CSV with the original headers.

```sql
SELECT INSTITUTION_ID, ENTITY_CD, ENTITY_NAME, [YEAR], ASSESSMENT_NAME,
       SUBGROUP_NAME, TOTAL_COUNT, NUM_TESTED, NUM_PROF, PER_PROF, ESTIMATE_FLAG
FROM [Annual EM ELA]
WHERE [YEAR] IN (2025,2026) AND SUBGROUP_NAME = 'All Students'
  AND ASSESSMENT_NAME = 'ELA5' AND LEFT(ENTITY_CD,1) = '3'
ORDER BY [YEAR], ENTITY_CD;
```

Use the original NYCPS LCGMS directory and exact canonical roster from the [assessment import](nysed-profile-assessments.md). The previously verified production science export independently checks the new science counts. Final NYSED exact grade records, not rounded numbers from the school profile, feed this analysis. No student records are used.

## Checks and estimands

Run `python scripts/data/analyze_fifth_grade_class_sizes.py` from the repository root with NumPy in the workbook-analysis environment. It reads the archived inputs, rehearses in local SQLite and emits an aggregate report to stdout. It does not write to production. `npm run test:fifth-grade-study` checks the article, sources, links, metadata and sitemap. `npm run test:fifth-grade-study -- --audit` also compares the rendered article snapshot to a fresh Python run when the original extracts are available (`PYTHON` can specify the interpreter).

The cohort progresses from 773 verified eligible district schools with a grade 5 Gen Ed or ICT class to 767 schools with exact spring 2026 counts, 762 with exact counts in both springs, and 680 with at least 20 tested in each subject in each spring. The modeled class measure is the combined Gen Ed plus ICT roster divided by the number of those official classes. Testing populations can include other program types. The unadjusted class-size chart weights schools equally in each subject, with bins `<20`, `[20,24)`, and `>=24` students per class.

Unadjusted and adjusted coefficients are percentage points of proficiency per five additional students in the school’s average classroom. The adjusted model includes geographic district indicators, the school's prior spring grade 5 proficiency in the same subject and the student share in ICT among the sampled classes. Intervals use district-clustered, finite-sample-corrected standard errors and a t critical value with 31 degrees of freedom. Sensitivity checks use test-count weights, lower and higher tested-count floors, Gen Ed only, all official grade 5 programs, the first October revision, and exclusion of each borough separately. Covariate adjustment asks whether this snapshot adds information beyond prior scores, not whether smaller classes have an effect over multiple years.
