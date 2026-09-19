# Parent Assistant: shared WhatsApp sender

**Superseded on 2026-09-19:** the user registered a dedicated NYC Schools Ratings sender, +1 917-473-0386. Do not implement or deploy the shared-number dispatcher. See `parent-assistant-whatsapp-staging.md` for the active implementation.

Historical decision, 2026-09-18: reuse AIRunningTracker's existing Twilio sender.
Keep the working $29.99 Research Pass pricing, Stripe IDs and checkout unchanged.

## Routing contract (implemented and locally testable, NOT wired live)

`server/parent/shared-sender.ts` defines dispatch after Twilio verification:

- `SCHOOL LINK <token>` links the NYC School Ratings account; plain `LINK` stays with AIRunningTracker.
- `SCHOOL <message>` reaches only Parent Assistant. Other normal messages reach only the running coach.
- Provider `OptOutType=STOP` or a whole-message stop keyword stops BOTH services. Both must persist the opt-out before successful acknowledgement. Receivers must deduplicate MessageSid, so partial failures can safely retry.
- START never restores an application's consent, canceled subscription or disconnected account. A new explicit account-linking flow is required.
- HELP should return short shared-number instructions, without invoking either AI. Keep this separate from Twilio's configured Advanced Opt-Out response to avoid duplicate replies.
- Media on school-prefixed messages needs a clear unsupported response until secure bounded ingestion exists. Never silently forward it to the running coach.

`scripts/d1/test-shared-sender.ts` tests routing only. This does NOT prove live ingress authentication, durable deduplication, STOP persistence or delivery.

## Required wiring before live use

1. Preserve AIRunningTracker's current `/api/whatsapp/inbound` URL. Verify Twilio signature using its original public URL and every form parameter, plus account and recipient. Invoke dispatch only after verification.
2. Forward school messages through a private Cloudflare service binding to a named ingress entrypoint in Ratings; do not expose a public unauthenticated forwarding API. Keep databases separate between running and schools. Do not share the running account identifier as proof of a school account.
3. Ratings must implement its own expiring, single-use hashed link tokens, phone uniqueness, explicit consent, entitlement checks, durable receipt/inbox and cancellation. A linked running account is NOT a linked school account.
4. Persist STOP independently in both apps and cancel pending sends. Retry partial failures durably. Re-check consent and paid access immediately before every outbound message.
5. Delivery status must route by stored provider MessageSid ownership, not by the phone number (a parent can use both services). Staging callbacks must stay staging-only.
6. Use a separate school-reminder template approved for the shared sender. The running-coach template is not appropriate. Outside WhatsApp's customer-service window, do not send arbitrary free-form reminder text.
7. Gate staging on an explicit test-phone allowlist. No customer traffic, unprefixed routing changes or running production deployment until shared-number tests pass. No automatic enrollment of existing running contacts.

## Current blockers and unchanged systems

At inspection, Ratings staging has only SESSION_SECRET. No Twilio or Stripe test credentials are configured. Existing live webhook, sender, production applications and Stripe pricing have not been changed. Provider integration must use Cloudflare secrets or a tightly scoped private service bridge; do not paste credentials in chat or commit them.

Remaining: actual private ingress/outbound bridge, verified linking, durable reminders/quiet hours/usage limits, assistant actions with confirmation, calendar integrations, approved template, real provider tests and monthly checkout activation. The monthly offer must remain unavailable until its promised features work. No free trial.
