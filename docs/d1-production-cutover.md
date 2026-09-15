# D1 production rollout

User authorized continuing the production rollout after reviewing D1 staging. This authorizes preparing and executing a verified cutover, not silently accepting incomplete tests or promoting the synthetic staging database.

## Current checkpoint

- Production remains Worker `nyc-schools-ratings`, deployed version `01ec403d-16a6-41d5-9ad6-17160cdf50e9` (verified September 15, 2026).
- Source remains Neon via Hyperdrive `def7c546eb804bbfb9e546d005c2266c`.
- Public D1 staging and private account rehearsal databases are not production migration targets.
- Production secret names were verified present without reading their values: CRON_SECRET, GOOGLE_MAPS_API_KEY, SESSION_SECRET, SOCRATA_APP_TOKEN, STRIPE_LIVE_PUBLISHABLE_KEY, STRIPE_LIVE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
- Existing production configuration enables email via the EMAIL binding. Do not copy staging's email-disable, expiry, noindex or payment-disable controls into production.
- No production resources or traffic changed during this preflight.

## Decision before traffic switch

User explicitly chose manual-only safety refresh: remove the monthly production safety cron and retain published scores and the authenticated manual refresh path. Automatic refresh is no longer a production requirement. The full-size manual recomputation performance limitation remains documented; run it deliberately during an appropriate maintenance window, not as an unattended recurring job.

## Execution order

1. Resolve the safety-refresh decision above. Record the chosen behavior and test it on staging.
2. Finish outstanding integration checks. Signed simulated Stripe events passed, but actual test-mode checkout/webhook delivery has not. Staging has no test Stripe keys. Never substitute live charges for a test without explicit authorization. Test email/transit with appropriately scoped integration access.
3. Provision a separate production D1 target with no public application attached. Apply all reviewed migrations and verify indexes/FKs. Keep live Neon and its current deployment intact.
4. Obtain a consistent production snapshot for the initial copy. Preserve all public and private data, IDs, password hashes, subscriptions, sessions, tokens and relationships. Stream private values through restricted authenticated tooling; do not print or write plaintext account exports locally. Verify every converted row and table count, not just samples. Preserve current safety scores and import metadata; do not import staging job checkpoints.
5. Rehearse final synchronization and rollback under restricted access. Inventory every write path: public POSTs, GET-based token consumption, session updates, API logs/counters, Stripe webhooks, scheduled jobs and administrative imports. A method-only POST block is not a complete write freeze.
6. For the actual cutover, place all mutating paths under a short maintenance gate, stop scheduled writers, drain in-flight writes and apply/verify the final data delta. Do not acknowledge unprocessed Stripe webhooks as successful; allow retry while writes are unavailable. If final verification fails, restore the existing Neon deployment without changing the authoritative database.
7. Deploy the D1 runtime to the existing production Worker with the correct D1/queue bindings. Preserve production secrets, email binding, canonical URL, live pricing IDs and intended cron behavior. Do not split traffic between independent Neon and D1 writers.
8. While writes remain gated, verify production reads, profiles, SEO, school/survey counts and private record integrity. Roll back before reopening writes if any check fails.
9. Reopen writes only after verification; validate login/session, favorites and webhook handling, and inspect errors. Record the first D1 write time. After this point a Worker rollback alone is unsafe: reconcile new D1 writes back to Neon before any database reversal.
10. Keep Neon through the agreed rollback window. Retire migration helpers promptly. Do not delete Neon or the private rehearsal database as an incidental cleanup step.

## Current blockers

- Automatic safety refresh decision resolved: manual-only, as requested by the user.
- Actual Stripe test-mode integration and email/transit checks.
- Fresh consistent production copy and tested final synchronization/rollback procedure.

The existing production deployment guard remains enabled until the target, verification evidence and cutover controls are ready.
