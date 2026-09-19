# Research Pass and Family Premium

This release is staging-first. The user confirmed the existing $29.00 Pass is working: preserve its pricing, Stripe IDs and checkout. Do not promote unfinished monthly features.

## Offers

| Plan | Price | Entitlement |
|---|---|---|
| School Research Pass | $29.00 once | Six calendar months of existing school-research tools, including on-site AI chat. No renewal. |
| Family Premium | $19.99/month at launch | Research while subscribed plus planned WhatsApp Parent Assistant, calendars, reminders and proactive updates. Not for sale yet. |

Public branding is My Family (`/family`) and Parent Assistant. `/tuck` redirects permanently to `/family`. Internal `tuck_*` tables and `/api/tuck` are retained to avoid breaking existing family records and relationships.

## Access preservation

Existing Pass purchases remain in their original user fields, with original expiry and benefits. The new `family_subscriptions` table stores monthly entitlements separately. Monthly lifecycle events must not update Pass fields. Cancellation at period end retains monthly access until that date. Cancellation of monthly-only access does not create a six-month Pass. An unexpired separately purchased Pass survives cancellation. Older Stripe events cannot restore a canceled subscription ID.

The manual family calendar remains a preview. `PARENT_ASSISTANT_AVAILABLE=false`, disabled monthly UI and server rejection of monthly checkout intentionally prevent selling unfinished features. Before launching: implement and test WhatsApp consent/unlink/STOP, delivery, reminders, time zones, calendar integrations, usage limits and support. Then configure the exact $19.99 USD monthly price and perform real test-mode checkout and lifecycle tests.

## Stripe rollout prerequisites

- Existing live catalog and customer billing are unchanged by this branch. Do not archive existing prices or change existing subscriptions.
- Leave the working $29.00 Pass price and checkout untouched. Do not provision a replacement Pass price or change `STRIPE_SEASON_PASS_PRICE_ID` as part of Parent Assistant work.
- Do not run the retired `server/scripts/setupStripeProducts*` or `setupSeasonPass` provisioning scripts. They contain obsolete pricing and now fail before provider writes.
- Staging has no Stripe test credentials and blocks checkout, webhooks and customer portal through its public endpoint. Signed synthetic webhook tests are not a real Stripe Checkout test.
- Confirm applicable Stripe Tax registrations and product tax treatment before enabling automatic tax. This release does not change tax collection.
- Apply migration `0005_independent_family_subscription.sql` before deploying application code. It only creates a separate subscription table and index; no existing purchase rows are rewritten.

## Validation

- `tsx scripts/d1/test-family-billing.ts`: isolated local D1 migration chain, free/Pass/monthly/combined access, expiry, cancellation, stale events and Pass preservation.
- `tsx scripts/d1/test-tuck.ts`: family calendar ownership, origin checks, school links and cascades.
- `scripts/d1/webhook-rehearsal.ts`: signed simulated Stripe events, invalid/expired signatures, duplicate purchase, legacy events and independent Family Premium lifecycle. Run only in private staging preview.
- `node scripts/d1/test-tuck-staging.mjs`: public staging HTML, alias redirect and real sessions with two isolated synthetic accounts; cleans up after itself.

Keep production unchanged until staging is accepted and billing prerequisites are complete.

### Staging verification, 2026-09-18

Migration 0005 applied only to staging D1 `e48a9ae9-4948-4dae-863a-06f6b026b436`. Worker version `43e1b4d6-7bc1-4aad-b21c-87916f9e83e9` deployed successfully. TypeScript, Vite build, Worker dry run, local family/calendar tests, SEO-linking regression and signed private-preview webhook rehearsal passed. Public staging tests verified the $29.00/$19.99 catalog, disabled checkout, free-account access, redirects, noindex and two-account isolation; synthetic accounts were removed. Pricing and signed-out My Family were visually checked. Existing build warnings (large bundle, Browserslist age and PostCSS source option) remain unrelated to this change. Real Stripe checkout is not tested because staging has no test credentials.
