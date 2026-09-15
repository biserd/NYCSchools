# D1 staging migration — 15 September 2026

## Review environment

- URL: https://nyc-schools-ratings-d1-staging.biser-d.workers.dev
- Worker: `nyc-schools-ratings-d1-staging`
- Deployed version: `e9932e00-97d1-45fc-9a12-ff7bd0a5cf63`
- D1: `e48a9ae9-4948-4dae-863a-06f6b026b436`, ENAM, approximately 257 MB.
- Branch: `migration/d1-staging`, based on `c8b224a`.
- Preview expires September 22, 2026 at 16:58 UTC. It returns 410 after expiry; resources are not automatically deleted.
- Production and the original Neon staging environment were not changed by this migration. No production cutover is authorized.

This is a D1-only application runtime: no Hyperdrive binding, PostgreSQL connection, fallback reads or dual writes. The Cloudflare skill informed request-scoped database access, bounded D1 statements, atomic batches, and queued refresh work.

## Migrated data and privacy

All 41 application tables have SQLite schemas, indexes and foreign keys. Both migrations in `migrations-d1` were applied. D1's own migration table is additional.

The public dataset came from the existing production-derived Neon staging branch, using an authenticated, read-only export helper. All rows in all 19 public tables were compared by SHA-256 after explicit boolean, timestamp and JSON conversion. Foreign-key checks passed. This includes:

| Dataset | Rows |
|---|---:|
| Canonical schools | 2,408 |
| Early-childhood centers | 1,885 |
| Private schools | 623 |
| Survey releases / results | 5 / 7,039 |
| Historical scores | 6,628 |
| Regents records | 36,361 |
| Attendance / discipline | 10,787 / 9,049 |
| Safety indices | 19,424 |
| NYPD complaints | 1,137,835 |

The 615 2-K providers remain canonical school records, not a separate dataset. IDs, URLs, programs and relationships are preserved.

Real users, sessions, password hashes/reset tokens, API/OAuth credentials, private favorites/chats, payment identifiers and operational settings were deliberately not copied into this public preview. Their tables are implemented and tested with disposable synthetic records. Those records were cleaned up; all 22 non-public application tables were empty at final verification. Do not use production login credentials on staging; create a separate test account.

## Verified

- TypeScript check and production asset build passed.
- Rating, survey, 2-K and SEO internal-link regression suites passed. The isolated 2-K unit test logs its expected missing-database SSR fallback; deployed survey rendering is separately verified.
- 24 public API checks passed: 23 exact content matches against production; survey content/source hashes match with only the expected original staging `importedAt` timestamps different. Array order is ignored by this comparison, not field values.
- Real deployed HTTP registration, login/logout, secure session persistence, favorites, duplicate protection and free-tier authorization passed (10 test groups).
- Remote D1 storage tests passed (15 groups): JSON/date conversion, synthetic subscription state, reviews, reminders, chat, reset/magic tokens, API keys/logs, concurrent counters, webhook deduplication, OAuth relations and atomic rollback/FKs.
- Node maintenance bridge round-tripped a synthetic record and dates, then cleaned it up.
- Survey import dry run recognized all five unchanged releases, including Birth-to-5 family and teacher, and performed no writes.
- Safety SQL aggregation matched an independent implementation of the original bounding-box/haversine algorithm for 06G262, 02M475 and 31R005 across all four radii, current/prior periods, categories and weights.
- Queue lifecycle/retry/finalization tests passed against local D1 with synthetic Socrata responses, including a failed source request and retry after finalization.
- Browser review verified the homepage counts/cards, Stuyvesant profile with survey/safety content, and survey Blog article.

Detailed machine-readable reports are local in `.wrangler/d1-*-verification.json` and `.wrangler/d1-public-parity.json`. Raw exports are intentionally ignored by Git.

## Runtime and operations

- PostgreSQL schema/types and SQL were ported to SQLite/D1; milliseconds are used for timestamps and JSON text for arrays/objects.
- Query batching respects D1's 100-bound-parameter limit. The schools table has 98 columns: future schema additions need particular care around D1's 100-column limit.
- Monthly safety refresh uses `nyc-schools-d1-stage-safety` and its failure queue, with one consumer, resumable source pagination and 20-school recomputation steps. It no longer loads the million-row complaint dataset into Worker memory.
- The queue consumer is deployed, but no real bulk refresh was started and staging has no cron triggers. A complete million-row remote refresh/load test remains a production-cutover gate; the existing dataset was retained for visual/data parity review.
- Email, checkout, webhooks and administrative HTTP jobs are blocked/disabled on this public preview. Live Stripe/Google Maps secrets were not copied. There are no real charges or outgoing emails.
- Staging is noindex/nofollow/noarchive, no-store, with analytics scripts blocked by CSP. A distinct session secret is configured.

## Repeat checks / imports

Use Node 22+ and the installed dependencies. Commands below target staging only.

```sh
npm run check
npm run test:ratings
npm run test:surveys
npm run test:twok
npm run test:seo-linking
npm run test:d1:safety
npm run test:d1:parity
npm run deploy:d1:staging
```

For authenticated maintenance/test access, run this locally and stop it when done. **Never deploy either helper publicly.**

```sh
npx wrangler dev --config wrangler.d1-test.jsonc --remote --port 8793 --inspector-port 9243
npm run test:d1:auth
npx tsx scripts/d1/run.ts scripts/d1/test-bridge.ts --d1-staging
# POST http://127.0.0.1:8793/writes performs and cleans up synthetic storage tests.
# GET http://127.0.0.1:8793/inventory checks counts and foreign keys.
```

Survey imports: validate the XLSX source with `scripts/import-surveys.ts SOURCE_DIRECTORY --export OUTPUT.json`; then use `npm run import:surveys:d1 -- OUTPUT.json --expected-database e48a9ae9-4948-4dae-863a-06f6b026b436`. Review the dry run before adding `--apply`. Source-hash changes require separate review. Existing canonical school/center rows are not overwritten.

The 2-K reconciliation script now reads D1 staging and generates SQLite SQL. SQL is inactive/commented unless `--expected-cycle` matches the source cycle. It never applies changes itself. Review provenance and matching before running any generated import.

ORM maintenance scripts can use `scripts/d1/run.ts TARGET_SCRIPT --d1-staging` through the localhost helper. Assessment-count import is wired to this bridge. Historical PostgreSQL-only scripts and `migrations/` remain archived source material, **not certified D1 import commands**. Use the new `migrations-d1/` path. `npm run deploy` and `db:push` fail closed on this staging branch.

For an initial copy into a NEW/EMPTY D1 staging database only: start `wrangler.d1-source.jsonc` with `wrangler dev --remote --port 8792`; run `export-staging.mjs`, `prepare-import.mjs`, then review and run `import-staging.mjs`, and `verify-copy.mjs` with the D1 helper running. The exporter is pinned to the old Neon staging Hyperdrive. Do not repoint it to production without reviewing private-data handling. Exports/checkpoints are snapshot-specific: never mix or reuse partial exports from different snapshots. Do not blindly retry an ambiguous remote SQL import; inspect row counts before advancing its checkpoint.

## Before any production cutover

1. Obtain user approval after staging review; do not merge/deploy this branch to production automatically.
2. Complete Stripe test-mode checkout/webhook and provider integration tests with staging-only credentials; email delivery and Google transit calls have not been tested on this preview.
3. Run a controlled full remote safety refresh/load test, inspect queue retries/dead letters and resource usage. Automatic jobs are currently intentionally off.
4. Review remaining legacy one-off import scripts. Source private-school history already contains 600 duplicate school/year pairs; preserved without deduplication. Its pre-existing `upsertPrivateSchoolHistory` conflict target lacks a unique constraint and needs a separate identity/deduplication decision before that maintenance path is used.
5. Take a fresh consistent production snapshot; migrate all private/account tables under restricted access, preserving identifiers, hashes, subscriptions and relationships. The synthetic preview is not a replacement for that final account-data rehearsal.
6. Freeze writes briefly or implement/test a change-capture strategy; copy the final delta, validate every table and rehearse rollback. Repointing to Neon alone after new D1 writes would lose those writes unless reconciled.
7. Create/configure a separate production D1 database and queues, production bindings/secrets and cron schedule. Keep Neon intact through the rollback window.

No production database, DNS, custom-domain route, credential or main-branch deployment was changed for this task.
