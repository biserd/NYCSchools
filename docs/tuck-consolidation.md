# Tuck belongs to NYC School Ratings

Decision: 2026-09-18. Supersedes the earlier separate-repository / separate-D1 integration proposal. The owner confirmed Tuck is a shell to rebuild, not a second application to preserve feature-for-feature.

## Single application

- Repository: `biserd/NYCSchools`.
- Runtime: existing Ratings Worker; Tuck API is mounted after Ratings session authentication.
- UI: `/tuck`, linked from account settings; `/family` redirects there.
- Storage: existing Ratings D1 binding `DB`; additive migration `0004_tuck_unified_calendar`.
- Accounts, sessions and subscription state: existing Ratings tables and endpoints. No Tuck login, OAuth bridge, user mirror, Stripe customer copy or second subscription.
- School identity/ratings: canonical `schools` table. Child-school associations reference `schools.dbn`; profiles link using the existing slug helper. Existing school data is never copied or rewritten.

## Implemented foundation

Owner-scoped household, child nicknames, optional canonical school links, all-day calendar dates and notes, removal of events/children, existing account/subscription navigation. These are manual dates, not verified school announcements. GET does not implicitly create private records.

Each API derives ownership from the Ratings session, never a submitted user/household ID. Every query/mutation is scoped; a composite foreign key also prevents cross-household child-event associations. Origin checks apply even though older app routes use permissive CORS. Mutations require the exact configured origin. Responses are private/no-store; private calendar bodies are excluded from API logging. `/tuck` is noindex in both server and client metadata and excluded from public sitemaps. Only account owners have access; no sharing by email or allowlist.

The UI and API explicitly report WhatsApp and automatic reminders as unavailable. No phone numbers collected, no outgoing messages, no AI calls, no new cron, no new secrets or provider spend. Existing Season Pass and subscription behavior stays unchanged. The proposed $19/month Premium plan is not a live price or automatically granted messaging entitlement.

## Not copied from the old shell

Reviewed `biserd/sshs-family-calendar` at `3e78314`. Do not import its duplicate users, sessions, magic links, hardcoded shared children/calendar, allowlist access, or scheduled email jobs. Its calendar rows lack household ownership; they must not become visible to all Ratings users. No legacy rows have been read/exported or migrated by this change. If any are later needed, identify the owner and import only with explicit mapping and authorization.

The old repository, Worker, D1 and hostname are retained unchanged for rollback. Consolidation of the replacement code does NOT mean those cloud resources have been retired. After staging approval and production deployment: point the Tuck hostname to a redirect to Ratings `/tuck` (do not forward old authentication tokens/query strings), then explicitly approve disabling its old cron/Worker and archiving the repo. Export/confirm any retained data before deleting its D1. No delete is part of this patch.

## Rebuild WhatsApp here, not in another app

The reusable Twilio source is `biserd/AIRunningTracker`, branch `codex/cloudflare-coach`, commit `aa5052ebf95caf4ac350e99237a7b90c480aa5fa`, under `apps/coach-cloudflare/worker/whatsapp*.ts`. It is not on that repository's main branch and is not implemented in the old Tuck shell.

Port its verified webhook signature handling, inbound MessageSid deduplication, STOP/unlink handling and bounded delivery patterns into this repository after replacing running-specific prompts/tools and grant assumptions. Do not copy running credentials, phone associations, account data or resource IDs. Future delivery tables stay in Ratings D1; queue/scheduling resources may be bindings on the same Worker, not another independently maintained product.

Remaining work: verified phone opt-in/linking, Premium capability and usage enforcement, Twilio sender/templates, durable delivery/deduplication/retry tracking, source-backed school-calendar imports with applicability/year, local-time reminder scheduling, AI tools with explicit confirmations, verified adult membership, privacy/retention controls, and staged end-to-end delivery tests. No automatic school safety/data refresh is reintroduced.

## Release / verification

1. Run `npm run test:tuck`, `npm run check`, frontend build and Worker dry run.
2. Apply migration 0004 to Ratings staging D1, then deploy the Ratings staging Worker. Test two distinct synthetic accounts and confirm no cross-account access.
3. Review `/tuck` on staging. Production release requires migration 0004 before the updated Worker.
4. Roll back code if necessary; the migration only adds three tables and does not alter existing data. Preserve newly created family records rather than dropping tables during rollback.

Do not claim WhatsApp, reminders, family sharing, paid plan launch, legacy-resource retirement or production deployment merely from merging this foundation.

### Verified staging release — September 18, 2026

- Preview: https://nyc-schools-ratings-d1-staging.biser-d.workers.dev/tuck (staging expires September 22, 2026, 16:58 UTC).
- Worker version: `133ce0cf-091a-4132-89a1-d6c0dff62490`.
- Migration 0004 applied only to staging D1 `e48a9ae9-4948-4dae-863a-06f6b026b436`.
- Passed TypeScript check, Vite production build, Worker dry run, SEO linking regression, and local D1/API regression across the entire migration chain.
- `node scripts/d1/test-tuck-staging.mjs` passed against deployed staging: real Ratings registration/session cookies, child/event writes, school link, noindex, redirect, origin protection and two-account isolation. Its exact synthetic users/sessions/family records were removed afterward.
- Browser visual check: signed-out `/tuck` renders the new page and sign-in entry correctly. Signed-in flows were API-tested, not a full browser interaction test.
- Existing build warnings remain (large pre-existing chunks, stale Browserslist and PostCSS warning); build succeeded. Tuck is a lazy-loaded ~3.2 KB gzip chunk.
- Production and old Tuck resources have not been changed. No old Tuck data, sender or secrets imported. Staging accounts are separate from production; create/use a staging account with a password because email delivery remains disabled there.
