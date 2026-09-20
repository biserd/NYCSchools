# Parent Assistant launch handoff — 2026-09-19

## Grandfathering update — 2026-09-20

Parent Assistant is now included for every active paid customer. Active,
unexpired `season_pass` customers and active legacy `premium` customers receive
assistant and reminder eligibility through their existing paid-access period at
no extra charge. This does not create a Family Premium subscription, change a
Stripe customer, renew a Pass or extend its original expiry. Free, inactive and
expired accounts remain ineligible.

## Scope and status

### Pricing decision update — 2026-09-19

The owner has retired the $29 Research Pass from new sales. Family Premium at
$19.99/month, with no free trial, is now the sole new paid offer. Existing
prepaid customers retain their original benefits and expiry; existing recurring
customers retain their existing price and terms. No customer data migration,
Stripe subscription update, forced enrollment or cancellation is performed.

The old authenticated and guest purchase endpoints return 410, not a redirect
to recurring payment. Historical checkout verification, receipts, delayed
webhooks, price identifiers and entitlement evaluation remain intact. Existing
recurring customers are blocked from accidentally buying a second subscription.
The public catalog no longer exposes the legacy price; pricing, paywalls,
marketing emails and server/client metadata use the monthly offer.

The code is staged only. Do not retire the live Stripe price/payment links while
production still runs the old sales code. At the coordinated production cutover,
audit and deactivate any separate legacy Payment Links, and expire open legacy
Checkout Sessions if the owner requires a hard cutoff; continue honoring already
paid purchases. Preserve subscription records and historical product/price IDs.
Keep the new offer closed until the real billing and WhatsApp rehearsals pass.
The historical implementation notes below describe the earlier two-offer phase;
this pricing decision supersedes references to continuing new Pass sales.

Pricing revision checks passed: TypeScript, frontend build, Worker dry-run,
local legacy/prepaid/monthly entitlement tests, duplicate legacy-subscription
guard, and the real staging API/AI suite. Both retired purchase endpoints
returned 410 on staging; the public product catalog exposed no legacy offer.
The deployed pricing page was visually checked in the browser and shows one
$19.99/month card plus the grandfathering notice. Synthetic staging test
accounts were removed. Twilio approval remains Pending and staging Stripe
test credentials are still absent; checkout and reminder delivery remain off.

Implemented on `feature/parent-assistant-launch`, deployed to the D1 staging Worker only. Production and the existing $29 one-time, six-month Research Pass are unchanged. No free trial is configured. This is not yet a completed paid launch.

1. Reminders: explicit consent, linked WhatsApp account, timezone/DST validation, quiet hours, cancellation, atomic claims, signed status callbacks, bounded retries and uncertain-send quarantine.
2. Assistant: Workers AI structured intent parsing, calendar drafts and explicit confirmation, calendar listing, clarification, canonical school answers. No arbitrary model tools, generated SQL, automatic event edits, or invented admissions percentages.
3. Calendar: 15 reviewed common NYCPS 2026–27 dates with source attribution and scope confirmation. Not a live announcement feed or a comprehensive school-specific calendar; NYCPS district 3-K–12 scope does not automatically cover 2-K/community providers, charter or private schools.
4. Personalization: saved/child-linked canonical schools and explicit school queries, linked profile sources. Early-childhood-only providers do not receive K–12 academic scores.
5. Billing implementation: separate $19.99/month hosted Checkout, exact price validation, duplicate-subscription protection, idempotent checkout creation, no trial, period-end cancellation portal guard. Actual Stripe checkout and live WhatsApp end-to-end delivery remain untested.

## Operational limits

- 30 assistant requests per user per day; 100 reminder attempts per calendar month, 100 pending reminders.
- Global AI and inbound-message budget guards; STOP remains available.
- Consent revocation and disconnect cancel pending reminders. STOP is not subscription cancellation.
- Draft retention: expiry plus one day; deduplication receipts seven days; usage 35 days; terminal reminder records 90 days. No full conversation transcript is retained by this feature in D1.
- Five-minute production reminder cron is implemented but feature flags fail closed. Staging has no scheduled triggers.

## Verified

- Full local D1 migration chain; TypeScript; frontend build; Worker bundling.
- Assistant tests: ownership, consent, DST/quiet hours, entitlement, atomic confirmation, duplicate/expired drafts, canonical early-childhood answers, concurrent delivery claims, signed callbacks, retries/quarantine, cancellation and mocked no-trial/idempotent checkout.
- Existing Tuck, WhatsApp-security and family-billing regression suites.
- Signed simulated Stripe webhook rehearsal against the private staging test Worker, including replay, invalid signatures, Pass preservation and monthly lifecycle. These are simulations, not a Stripe-hosted checkout.
- Real staging Cloudflare AI and API tests: school answers, draft-before-confirm, New York timezone conversion, cross-user isolation, official calendar scope and disconnect cancellation. No real WhatsApp messages or payments sent.
- Synthetic test accounts cleaned up. Authenticated browser visual rehearsal was blocked by the browser and remains outstanding.

## External prerequisites and launch sequence

1. Twilio utility template `nyc_schools_calendar_reminder`, Content SID `HXcb3d96c071bada2d611b06b8498796e8`, was submitted with owner approval. Last observed approval status: Pending. Wait for approval and verify the sender remains Online.
2. Add `STRIPE_TEST_SECRET_KEY` and `STRIPE_TEST_PUBLISHABLE_KEY` as staging secrets, plus the test webhook signing secret. Create/identify the test $19.99 USD monthly price and configure the family price binding. Never put credentials in source control or chat.
3. Ensure the Stripe customer portal allows cancellation at period end. Run actual test-mode checkout, payment/webhook, access grant, cancellation and failed-payment rehearsals. Verify a Research Pass remains intact. Tax registration and product-tax treatment need owner review before deciding whether to enable automatic tax; it is not enabled by this change.
4. Arrange a consented WhatsApp recipient and a staging routing rehearsal. The school sender currently routes inbound messages to production; a staging LINK token does not work through that production callback. Do not silently reroute the production sender. Test opt-in, one scheduled template delivery, callback, STOP and duplicate handling, then restore/verify routing. Do not change the Running Tracker sender.
5. Review the authenticated staging UI. Staging email is intentionally disabled and expires at `2026-09-22T16:58:00Z`; do not promise an emailed staging login or extend that authorization silently.
6. After the above pass, apply additive migrations `0007_freezing_inertia.sql` and `0008_crazy_the_call.sql` to production before deploying code. They have already been applied to staging. Confirm backup/Time Travel recovery availability first.
7. Configure approved template, monthly price, secrets and feature flags; deploy production only after review. Set `PARENT_LAUNCH_VERIFIED=true` only after the real rehearsals. Smoke-test existing Pass checkout, public pages, auth, account access, manual family calendar and webhook handling. Observe first opted-in reminders.

## Current gates

Staging has `PARENT_ASSISTANT_ENABLED=true`, `PARENT_REMINDERS_ENABLED=false`, `FAMILY_CHECKOUT_ENABLED=false`, `PARENT_LAUNCH_VERIFIED=false`. Preview access is authenticated and expires with staging. Monthly billing and outbound reminders are not activated by this deployment.

Production checkout additionally requires launch verification, enabled reminders, an approved template configuration and Twilio readiness. Staging checkout requires test-mode key prefixes; the staging webhook/portal exception additionally requires a signing secret. Pass checkout remains blocked in staging. Webhook events with the wrong Stripe mode are rejected.

## Rollback

Disable `FAMILY_CHECKOUT_ENABLED` to stop new sales and `PARENT_REMINDERS_ENABLED` to stop new reminder dispatches. Disable `PARENT_ASSISTANT_ENABLED` if needed, without disabling existing manual family tools. Do not delete paid entitlements or additive tables during rollback. Preserve existing subscriptions/Passes and use the previous Worker version if code rollback is required. Uncertain sends require operator investigation, not blind retries.
