# One-day 2-K staging validation

Created September 13, 2026 with explicit approval to copy the production database into the existing Neon account. **No production schema, data, routes, secrets or deployments were changed.**

## Access and lifetime

- Preview: https://nyc-schools-ratings-staging.biser-d.workers.dev
- HTTP Basic username: preview. Random password is local only in the gitignored `.wrangler/staging-access.json`; never put it in a PR.
- Neon project: little-hill-53993129; branch: br-rough-mud-aykmkgu5 (nycschools-2k-staging).
- Neon auto-delete: September 14, 2026, 5:59 p.m. EDT. Worker access also expires at that time.
- Staging Hyperdrive: be7e2a5021cc4e5f9873f2194f509062. It points only to ep-lingering-sound-ay0yfu7q.c-5.us-east-2.aws.neon.tech and has caching disabled.
- Worker configuration is deliberately separate: wrangler.staging.jsonc. Deploy only with `wrangler deploy --config wrangler.staging.jsonc`.

The staging Worker and Hyperdrive configuration do not automatically delete when the Neon branch expires. They remain unusable for this preview after expiry; remove them separately after review. Never extend the Worker expiry without reviewing/replacing the expiring database.

## Isolation

All routes, including assets, require the staging password. The gate fails closed without secrets or a valid expiry. Responses are noindex/noarchive and no-store. There are no production custom-domain routes, no cron triggers, no Email/AI binding and no Stripe/API secrets. Email delivery is explicitly false. All non-GET/HEAD requests and cron, Stripe, auth and admin API routes are denied. Account/admin login, payments and external integrations are intentionally outside this read-only preview's acceptance scope. Browser-side external connections and frames are restricted by a staging CSP.

## Actual database tests

See reports/twok/staging-test.json. The history includes the first failed precision check and subsequent successful tests; final result is authoritative.

- Additive migration applies and reruns successfully.
- Unacknowledged raw source cycle rejected.
- Dry-run ROLLBACK restores the full schools fingerprint.
- Committed staging backfill: 26 inserts and 589 updates (588 verified updates plus one needs-verification update).
- 2,408 total schools; 615 distinct has_2k providers.
- All pre-existing names, IDs and grades preserved; every pre-existing non-2K row unchanged.
- Multi-program example 10XAPN retains one row with all three flags.
- Replaying the backfill modifies zero rows.
- Conservative rollback restores every original school row, retaining the 26 added IDs as documented.
- Reapplication restores the identical applied fingerprint. This applied state is left in staging for review.

The database test implementation is scripts/staging-db-test.mjs. It is intentionally hard-guarded to this staging hostname and expects a pristine clone; do not rerun it on the already-applied copy or point it at production. The credentials were held only in a temporary local test process, not saved to the repository.

## Live checks

scripts/staging-http-test.mjs reads the local staging access file. It verifies anonymous denial, mutation denial, homepage, canonical school counts/filters, legacy 2-K APIs and four server-rendered profiles including new and unconfirmed providers. Results: reports/twok/staging-http-test.json.

Browser verification confirmed the hydrated homepage shows 2,408 schools and 615 2-K providers, and searching 10XAPN yields one canonical record with 2-K, 3-K and pre-K badges. Staging-only disabled auth and product endpoints are expected, not production failures.

## Fixes discovered by staging

1. PostgreSQL real coordinates needed real-typed comparison literals; otherwise all 588 verified updates were safely skipped. Corrected proposed and rollback SQL generation.
2. The needs-verification record has no official program array; made the legacy API projection null-safe.
3. Recording verification status must not turn old seed enrollment zeros into actual measurements.
4. Early-childhood cards still rendered empty ELA/math percent symbols through a fallback branch; replaced those with an explicit not-applicable message.

## Admission-cycle evidence

NYCPS's official 2-K enrollment page explicitly confirms fall 2026 admissions for children born in 2024: https://www.schools.nyc.gov/enrollment/enroll-grade-by-grade/2-k

The active MySchools directory maps to process 48, but its school_year field still says 2025-26 School Year. The raw API label is retained; it is not represented as the verified admissions year. The exact reason for the source inconsistency is not confirmed.
