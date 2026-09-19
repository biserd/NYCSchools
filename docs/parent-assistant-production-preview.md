# Production connection preview — September 19, 2026

User approved merging the family/pricing work and promoting the dedicated WhatsApp preview. Preserve the existing Stripe Pass price `price_1SemubRwvWaTf8xfAYvh2qJl`: live Stripe retrieval confirmed USD 2900 cents, one-time, six months. No new Stripe price or subscription is created. Family Premium remains USD 1999/month, not for sale; no trial.

Preflight found production version `447512e7-dc54-4f91-b751-f03f838427a1` already enforcing $29.99, causing `/api/products` to return 500. Align shared price, checkout validation, CTA copy, metadata and emails to $29.00. Apply additive migrations 0004–0006 before deploying the family routes. Existing school and purchase records are not rewritten.

Production Worker: `nyc-schools-ratings`; production D1: `35237f81-df27-4908-be1a-1226faf501e0`. User supplied `TWILIO_AUTH_TOKEN` as a Worker secret. Non-secret account/sender configuration remains in Wrangler. Only the dedicated school sender +1 917-473-0386 should use HTTP POST `https://nycschoolsratings.com/api/parent/whatsapp/inbound`. Leave RunAnalytics untouched.

This is a limited connection preview, not the paid Parent Assistant: authenticated, consented account linking; HELP/STATUS/EVENTS/STOP; manually entered calendar dates only. No proactive sends, AI, school-calendar imports or monthly billing. The shared 50-request rolling-day cap remains. STOP bypasses it. No phone allowlist. Delivery is at-most-once; a lost reply may require a new user message. Real phone delivery must be verified separately.

Staging retains its existing expiry and separate DB. Never copy staging account links into production. The one sender can route to only one environment: after cutover, use production My Family to create new links.

Verification: TypeScript, frontend build, Worker dry run, local family billing, local calendar/security tests, production-mode signed WhatsApp lifecycle with synthetic local data, followed by public production catalog/private-route/unsigned-webhook smoke checks. No paid purchase is made by these checks.

Rollback: retain additive tables. Disable `PARENT_WHATSAPP_ENABLED` if the preview needs to stop. Do not roll back to the known $29.99-mismatch deployment; preserve the price correction. Do not restore D1 or erase customer data.
