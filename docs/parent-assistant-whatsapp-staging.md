# Dedicated WhatsApp sender: staging connection test

The user registered +1 917-473-0386 as NYC Schools Ratings in the existing WABA. AIRunningTracker's separate +1 862-343-9152 sender must remain unchanged. Shared-number dispatch is superseded and is not wired into either application.

## Scope

This release is a signed staging connection test, NOT a paid agent launch. On September 19 the user explicitly requested no test-phone restriction. Any number may request onboarding, but private data requires authenticated single-use account linking. It supports account linking, HELP, STATUS, EVENTS (up to five upcoming manually entered family dates), and STOP. No AI, proactive reminders, imports, subscriptions, campaigns or arbitrary outbound API sends. The existing $29.99 Pass and monthly coming-soon gate stay unchanged.

## Configuration

Worker: `nyc-schools-ratings-d1-staging` only. D1: `e48a9ae9-4948-4dae-863a-06f6b026b436`. Apply `0006_parent_whatsapp_connection.sql` before deployment. It creates two new tables; no existing records are rewritten.

Non-secret configuration is in `wrangler.d1-staging.jsonc`. Supply through Cloudflare **Secrets**, not source or chat:

- `TWILIO_AUTH_TOKEN`: the primary Auth Token of the Twilio account owning the new sender. Although the number is dedicated, this token is account-scoped; treat it as sensitive and keep staging access restricted.

The webhook fails closed with 503 if the Auth Token is missing, the environment is not staging, the enable flag is off, or the preview expired. The authenticated My Family UI reports not configured. Do not repoint the sender until the secret is installed and the endpoint passes smoke tests.

Incoming webhook (HTTP POST):
`https://nyc-schools-ratings-d1-staging.biser-d.workers.dev/api/parent/whatsapp/inbound`

Configure **only the new school sender**. Do not attach it to AIRunningTracker's Messaging Service. A dedicated Messaging Service can be added later; direct sender webhook configuration suffices for this inbound test. No fallback or status callback endpoint is implemented in this phase: leave them blank. Replies use TwiML in the inbound webhook response, not asynchronous REST sends.

## Security and test procedure

- Full-form Twilio HMAC-SHA1 verification against the exact canonical HTTPS URL; reject duplicate parameters, incorrect AccountSid/To, malformed MessageSid, wrong content type, queries and bodies larger than 16 KiB. All new Twilio fields are included in signature verification.
- Unlinked numbers receive onboarding instructions only. No inbound media fetching. No raw message bodies, tokens or phone numbers in logs. Account-link API responses are excluded from the existing Express response logger.
- Sign in to a staging account, open `/family`, explicitly consent, generate an expiring link, and send the prefilled LINK command from the test phone. Tokens are 192-bit random, SHA-256 hashed, single-use and expire in 10 minutes. Per-account token issuance is throttled; phone binding is unique.
- Add a synthetic family date. Send EVENTS and verify the response. Check a second account's dates never appear. No sensitive real child details are needed.
- Send STOP and check My Family is disconnected. Advanced Opt-Out confirmations are not duplicated. START does not silently restore application consent. Linking requires a new website flow; if Twilio has blocked messages, START may additionally be needed at provider level.
- Opaque inbound SIDs are retained for replay suppression; no conversation bodies are saved. Normal replies are capped at 50 inbound requests per rolling day across all staging testers. STOP bypasses the cap. There is no phone-number allowlist.
- Replies favor at-most-once dispatch: after a claimed request fails or its response is lost, the tester may need to send a new message. This is not a production durable-outbox implementation. Validate Twilio delivery logs during the real test.
- The preview expires on September 22, 2026 at 16:58 UTC. Disconnect its webhook before expiry or renew staging only with user approval. Do not point the new sender at production until a separate production rollout is approved.

## Tests

`tsx scripts/d1/test-parent-whatsapp.ts`: fresh local D1 migrations, official signature example and independent HMAC signing, authentication envelope, bounds, token lifecycle, unique phone ownership, duplicate SID handling, escaped XML, isolated calendar reads, STOP and deletion cascade.

`tsx scripts/d1/test-tuck.ts`: real local HTTP routes with synthetic session identity, origin protection, consent and account-scoped linking/disconnect alongside the existing calendar regression.

Real WhatsApp delivery remains unverified until the user sends a message from their phone. Simulated signatures do not prove provider delivery.

## Deployment checkpoint — 2026-09-19

- Migration 0006 applied to staging only. Latest staging Worker version: `9dc69168-83de-4533-bcd0-81998416c9c5`.
- User supplied `TWILIO_AUTH_TOKEN` through Cloudflare Secrets; only its name was inspected, not its value.
- New sender +1 917-473-0386 incoming webhook saved as the staging URL above, HTTP POST, and verified after a fresh Twilio page reload. Twilio required About text to save: “NYC School Ratings: school research and family calendar support.” No other sender was modified; fallback and status callback remain blank.
- TypeScript, Vite build, Worker dry run, local WhatsApp security/account isolation, local family HTTP tests and independent Pass/monthly billing tests passed. Existing unrelated Vite/PostCSS/Browserslist warnings remain.
- Public staging smoke test passed real synthetic login sessions, configured status, unsigned webhook rejection (403), link generation/consent/origin checks, private response caching, account isolation and disabled checkout. Synthetic users/sessions/family records were cleaned up.
- User asked to send HELP from their actual WhatsApp phone. Real delivery and a real account LINK/STOP round trip are still pending that test; do not label this an end-to-end provider pass yet.
