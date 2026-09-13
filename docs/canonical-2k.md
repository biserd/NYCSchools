# Canonical 2-K directory

All live 2-K reads use `schools WHERE has_2k = true`. DBN is the canonical identifier. A provider offering 2-K, 3-K and pre-K occupies one school row, with three independent flags. The old `twok_centers` table is retained only as a rollback archive, not read or written by application code. Do not use `db:push` to drop that archive.

The September 6 audit is a baseline only. The September 13 public-source reconciliation is in `reports/twok/reconciliation.json`; every proposed insert, update and verification change includes its before/after fields. `proposed.sql` and `rollback.sql` default to ROLLBACK. These reports are review artifacts, not a second live provider dataset.

Official directory: https://www.myschools.nyc/en/schools/2-k/

Official enrollment guidance: https://www.schools.nyc.gov/enrollment/enroll-grade-by-grade/2-k

The directory currently maps 2-K to process 48 and its complete paginated API returns 614 providers. Source records say **2025-26 School Year**. On September 13 we independently checked the NYCPS enrollment guidance linked above: it explicitly confirms a **fall 2026 launch for children born in 2024**, with August 4, 2026 offer release. The API label conflicts with that authoritative guidance. Preserve it as raw provenance, not the verified admissions year; do not silently relabel source records. The raw-cycle SQL acknowledgement remains intentional.

The dry run proposes 26 additions, 588 updates and retaining 06G009 (Mercedes A Batista Daycare) as needs verification. Consequently 615 canonical rows would have has_2k=true, of which 614 are verified in the fetched inventory. Never describe the unconfirmed record as closed. Official features confirm 543 3-K offerings and 62 pre-K offerings; omission means unknown, not false.

44 early-childhood records match by full `semsCode`/official DBN. They retain their existing locCode URLs, reviews and relationships and link to canonical school pages. Program flags are projected from schools, rather than copied into an independent directory. Shared-address and name-only candidates remain separate. The report includes the exact matching rules and candidates; it cannot reconstruct the baseline audit's unnamed 11 candidate pairs.

Provider names are decoded only when a byte sequence is valid misdecoded UTF-8. Legitimate accents survive. Original official strings, childcare location and registration instructions are retained in source metadata. Existing canonical names are preserved for stable URLs; cards and profiles use the corrected display name. Review all encoding repairs and address changes in the report before approval.

## Import and administration

Run `npm run import:twok:dry-run` with Node 22+. This fetches the active directory mapping, follows all pagination, validates required identifiers, unique IDs, counts and cycle consistency, reads the public canonical baseline, and produces local artifacts. HTTP failures or >20% inventory shrink abort planning. No credentials or database writes are used.

The existing authenticated `/api/cron/seed-twok-centers` job now returns a validated dry-run plan. It does not write the retired CSV or either production table. No new scheduler or service is provisioned. Apply is deliberately a reviewed SQL operation. `/admin/early-childhood` presents canonical flags and source verification status behind the existing admin API guard; both server/client metadata mark it noindex.

General school listings/counts include 2-K providers. K–12 district **rating averages** exclude early-childhood-only grade bands and negative score placeholders. The district-average schoolCount describes that K–12 comparison population, not the directory total. A K–12 school with has_2k=true remains academically rated when sufficient data exists. Internal scoring retains -1 as a compatibility return value; public rating APIs return null plus not_applicable and displayed component measurements are null.

## Reviewed deployment sequence

1. Back up the target database and confirm the source cycle. Test against an isolated staging copy first.
2. Run `migrations/20260913_canonical_2k.sql` explicitly. It only adds source/borough fields, a partial index, and permits null measurements; it reuses existing has_2k.
3. Deploy the application only after the schema migration. Existing legacy seed placeholders are normalized on read during the transition.
4. Regenerate the report against the intended baseline. Set `app.twok_expected_cycle` to the reviewed exact source cycle in the SQL session. Run proposed.sql unchanged first (ROLLBACK) and inspect affected-row counts. Change the final ROLLBACK to COMMIT only after approval. Conditional updates skip rows edited since the baseline; regenerate/review skipped rows. Repeated imports cannot duplicate DBNs.
5. Clear school/directory/API/SEO caches or restart the Worker after applying. Verify a 2-K-only profile, a multi-program provider, and a normal K–12 profile. Confirm missing enrollment does not become zero and program filters include the same canonical DBN.

## Rollback

`reports/twok/rollback.sql` restores before-images only when all imported fields still equal this run's after-image, preserving later edits. Run with ROLLBACK and review before committing. Newly inserted canonical providers are intentionally retained to protect URLs and any subsequent favorites/reviews; inspect them individually if a full reversal is required. This is a conservative data rollback, not deletion of all imported records.

Keep the additive schema and nullable-compatible application during rollback. Do not reinstate NOT NULL constraints while nulls exist or deploy an older renderer that assumes enrollment is always numeric. No automatic table drop or provider deletion is included. The legacy archive and original canonical names remain available for historical comparison.

## Validation

`npm run test:twok`, `npm run test:ratings`, `npm run test:seo-linking`, `npm run check`, and `npm run build`. The 2-K suite tests real server HTML with isolated storage fixtures; it never connects to production. On September 13, the SQL was tested on an explicitly authorized one-day Neon staging branch copied from production. See `reports/twok/staging-test.json` and the staging documentation.

## Production promotion — September 13, 2026

User approved promotion after reviewing staging. A fresh production transaction tested the migration and backfill, verified exact counts and preservation, and rolled back cleanly. The subsequent apply saved a local gitignored before-image of the schools table and column schema, then committed the migration and backfill atomically at 22:37:56 UTC. See `reports/twok/production-preflight.json` and `production-apply.json`.

Result: 26 inserts, 589 updates, 2,408 schools and 615 canonical 2-K records (614 official plus one needs verification). Existing IDs, names and grades and every non-2K row were preserved. Only the schools table was changed; staging was not substituted for the production database.

Production Worker version: `af0c3bbd-6210-496a-b3e8-3a9ce010d3bc`. Previous version: `a8f84552-11d3-4c66-9b7e-5dac778b45bb` (do not blindly restore an older renderer against nullable data; follow rollback guidance above). Production bindings, variables, secrets, authentication and cron schedules were retained. Staging-only access settings are not part of the production entrypoint.

Live smoke checks passed for canonical counts, all three program filters, legacy 2-K APIs, four early-childhood profiles, a K–12 profile, private endpoint authentication, public Stripe configuration and robots indexing. See `scripts/production-2k-smoke.mjs` and `reports/twok/production-http-test.json`. No payment, email or authenticated user-account mutation was performed as a smoke test.
