# D1 production rollout — completed

Production reopened on Cloudflare D1 **September 15, 2026 at 8:00:15 PM EDT**
(September 16, 00:00:15 UTC). The user approved maintenance and explicitly
deferred a real Stripe test-mode checkout.

## Authoritative production state

- Worker: `nyc-schools-ratings`; domain: https://nycschoolsratings.com.
- Live version: `732eb65f-0c02-473b-be32-c9cbbfe716f6`, 100% traffic.
- D1: `nyc-schools-ratings-production`, ID `35237f81-df27-4908-be1a-1226faf501e0`, ENAM.
- Canonical config: `wrangler.jsonc`; `npm run deploy` verifies the target,
  builds the frontend, and deploys. No Hyperdrive binding remains.
- Existing session, Google Maps, Socrata and live Stripe secrets were preserved.
  All seven expected secret names were verified without reading values.
- Email remains enabled through the existing EMAIL binding and sender.
- Safety refresh is **manual-only**. Queues:
  `nyc-schools-production-safety` and `nyc-schools-production-safety-failed`.
  No refresh job was started during cutover.
- Remaining crons: `*/15 * * * *` (API maintenance), `0 14 * * *` (drip email).
  Monthly safety refresh was removed from configuration and code.
- Public D1 staging and private rehearsal databases were NOT promoted.

## Cutover evidence

1. Initial copy: all 41 application tables copied from live Neon; every converted
   column checked and foreign keys valid. This initial copy was not a frozen snapshot.
2. Maintenance began at 23:50:34 UTC. The maintenance-only Worker imported no
   application code and returned retryable 503 for all paths/methods on all three
   production hostnames. Scheduled work was disabled. No other active source
   transactions were observed before final sync.
3. All 41 final table comparisons matched, with zero changed or removed rows
   since the initial copy. The sequence step exposed a retired `twok_centers`
   counter. Its exclusion was inspected explicitly; no application rows or
   current program flags were removed.
4. `complete-final-sync.mjs` resumed only that inspected counter step, checked
   source activity and all table counts again, and verified foreign keys. Final
   report passed at **23:59:22 UTC**: 26 applicable source counters preserved;
   retired standalone 2-K counter excluded. Canonical `schools.has_2k` remains
   the 2-K source. This was an application write-freeze, not one PostgreSQL
   transaction spanning all tables.
5. D1 deployed with maintenance on: version
   `5e5de657-3fa8-41e7-98d6-b850ef4b5f34`. Private candidate checks passed.
6. Production reopened at 00:00:15 UTC. Live HTTP and synthetic account tests
   passed by 00:00:31 UTC. Temporary accounts, favorites and sessions were
   removed; tests created no real email or payment.
7. Restricted copy and candidate preview processes were stopped. They were
   never public endpoints. The copy helper configuration is expired to prevent reuse.

Preserved records include 159 users, 29 pre-cutover sessions, 229 favorites,
2,024 processed webhook events, 2,408 canonical schools, 1,885 NYCEEC records,
623 private schools, 7,039 survey results and 1,137,835 complaint records.
Row verification included password hashes, subscription fields, tokens, IDs
and relationships. Private values stayed in memory, never in reports.

Checks performed:

- 24/24 exact public API comparisons before maintenance.
- Live homepage, K–12 and 2-K profiles, canonical URLs, robots and sitemap.
- Login noindex and anonymous private-route protection.
- Password login, invalid-password rejection, Secure/HttpOnly live cookie,
  session persistence, favorite create/read/delete, duplicate rejection,
  free-tier authorization and logout.
- Live Stripe configuration preserved; invalid webhook rejected with 400.
- Earlier signed simulated webhook tests passed, not a real checkout test.
- Main/helper TypeScript checks, maintenance/final-sync tests, build and dry runs.
- Post-cutover bounded live observation: 12 events, zero exceptions or 5xx;
  ten public endpoints returned 200. This is a smoke check, not a long-term SLA.

Aggregate-only local evidence, ignored by Git:
`.wrangler/d1-production-initial-copy.json`, `d1-production-final-sync.json`,
`d1-production-candidate-parity.json`, `d1-production-live-http.json`,
`d1-production-live-auth.json`, `d1-production-observation.json`.

## Recovery and future operations

**D1 is authoritative. Do not simply roll the Worker back to Neon.**
New production writes have been accepted since reopening (live synthetic
login/session/favorite writes verified by 00:00:31 UTC). Freeze writes and
reconcile D1 changes back to Neon before any database reversal. No reverse-sync
automation has been certified.

Neon and Hyperdrive remain intact for recovery; nothing was deleted.
Pre-cutover Neon version: `01ec403d-16a6-41d5-9ad6-17160cdf50e9`.
Maintenance-only version: `ec4fd403-1fdd-4f70-9f7a-64214036e41e`.

For a future approved maintenance window, deploy `wrangler.d1-production.jsonc`
(defaults to `MAINTENANCE_MODE=true`). It preserves D1/integrations but gates
HTTP, scheduled and queue writes. Normal deployment is `npm run deploy` using
`wrangler.jsonc` (maintenance off). Never rerun copy/sync tools against active
production. Initial copy requires an empty target; final writes require maintenance.

Use reviewed `migrations-d1/` migrations, tested on staging first.
`db:push` stays blocked. Legacy PostgreSQL one-off scripts are not automatically
approved for D1 production; review/port their SQL and target selection first.

## Explicitly outstanding checks and limitations

- Real Stripe test-mode checkout: **deferred by user**; no live charge attempted.
- Actual email inbox delivery and full transit itinerary: not end-to-end verified.
  Email binding is enabled; Google geocoding passed before cutover.
- Full-size manual safety recomputation has a documented staging performance
  limitation. Published scores remain intact. Run deliberately, not as an
  unattended job; see `d1-staging-migration.md`.
- Retain Neon until the owner approves retirement after observing D1 production.
  No retention period was agreed and no deletion is scheduled.
