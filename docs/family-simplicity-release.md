# Family: simpler calendar and reliable reminders

## Parent experience

- Upcoming dates and two actions: **Add event** and **Ask Assistant**. No introductory feature wall or family-setup prerequisite.
- Mobile opens one agenda, not duplicate upcoming/month lists. Desktop keeps the month calendar; selecting a day reveals details.
- One composer creates/edits an event and its optional WhatsApp reminder. Timed and multi-day events are supported. The result explicitly distinguishes calendar-only saves from scheduled reminders.
- WhatsApp consent is required once. Connection status refreshes on return and polls briefly only while an active connection attempt is pending. Disconnection refreshes canceled-reminder states.
- Children, school-name search and reminder preferences are optional settings. Linking a school narrows applicable district-calendar reference dates; it does not claim an individual school's calendar is verified.
- Drafts are retrieved on page load and remain reviewable across refresh and website-chat handoff. Assistant history is account-scoped and shared with the existing SDK backend.
- Returning from WhatsApp refreshes private dates, drafts and connection state. Signed-webhook-backed checkout confirmation refreshes paid access even if payment completed after the page's first request; a success URL alone never grants access.
- Both the assistant and WhatsApp EVENTS command read the same merged calendar evidence. Edits preserve notes, time and existing reminders unless the parent asks to change them. Deletions need a later confirmation.

## Correctness and privacy

- Question allowances are atomic per user and local calendar day. No other parent's usage or yesterday's usage consumes today's allowance.
- Combined event/reminder writes use one D1 batch. Missing connection, invalid timing or a full queue cannot leave a partially saved event.
- Explicit rescheduling can re-arm a canceled, never-provider-accepted reminder. Delivered or uncertain attempts cannot be silently replayed.
- Official source IDs and complete date ranges prevent duplicate imports. Verified legacy IDs and relationships remain intact; legacy copies are merged for display, not deleted. Explicit source-reminder replacement cancels duplicate legacy pending sends.
- Following an official date again does not cancel its existing reminder.
- Paid access, retired Pass expiry, Stripe prices, subscriptions and account authentication are unchanged. No new opt-in activation switches were added.
- Reminder availability checks include sender configuration and approved template, not only a feature flag. No sends occur without a requested reminder, current entitlement and a connected/consented phone.
- Private APIs retain authentication, same-origin mutation checks, private/no-store and noindex headers. Public agent/plugin interfaces gain no private-calendar access.

## Measurement

`family_activity` stores controlled action names, opaque deduplication keys, account IDs, channel and timestamp. No titles, child details, phone numbers, emails, prompts or replies.

The existing private Parent Assistant operations page includes:

1. Recorded paid Family visitors and current WhatsApp connection count.
2. Reminder scheduling within seven days of a recorded paid visit, with only seven-day-mature cohorts in the denominator.
3. Meaningful event/reminder use in days 8–14, with only fourteen-day-mature cohorts eligible.
4. Actual reminder states. `accepted` is not `delivered`; delivered/read is not evidence the parent acted.

Definitions are returned with the metrics. Owner and obvious synthetic accounts are excluded. Instrumentation is prospective, not a historical backfill. These are adoption/reliability proxies, not proof of reduced stress or revenue lift. Review them alongside parent feedback before expanding features or changing pricing.

SDK request errors and tool errors are recorded as such; school-result counts count schools rather than source links. Telemetry failures do not block a successful answer.

## Local checks and preview

```sh
npm run test:family
npm run check
npm run build
npm run preview:family
```

The regression runner blocks external fetches and uses `wrangler.family-local.jsonc`: a fake local D1 binding, no remote services and no provider credentials. Billing and WhatsApp use simulated transports.

Preview: `http://127.0.0.1:8806/family`. Optional `?preview=empty`, `paid`, `grandfathered`, `free`, `disconnected`, or `guest`. It is loopback-only, with isolated synthetic households. Live AI, messaging, payments and email are disabled; the assistant preview exercises shared calendar/draft tools but does not evaluate a real model. Restarting resets sample data.

Fresh live model quality/latency and delivery to an actual handset still require an authorized canary after deployment. Local results must not be presented as proof of real provider delivery.

## Release sequence

1. Review pending migrations and database schema on the target environment. The only new migration in this change is `0013_family_simplicity.sql`; do not blindly apply other unrelated pending migrations.
2. Apply the additive migration on staging first, then deploy this code and test real account access and a consented reminder. Do not copy staging credentials to production.
3. After approval, apply the reviewed migration to production before deploying the Worker. It adds event range/time/timezone/source columns and a privacy-safe activity table. It does not update users, Stripe subscriptions, prices or existing event/reminder records.
4. Verify private endpoint headers, calendar/assistant access, an existing grandfathered account, fresh draft recovery and provider delivery status. Inspect error rates and queues before announcing the changes.
5. Rollback uses the previous Worker release, retaining additive schema and all data. New pending drafts contain fields older code may not understand; let their ten-minute review window expire or have parents recreate them after rollback. Do not drop columns or delete calendar data to roll back.

No production deploy, production migration, real message or payment is performed by these development/test commands.

## Staging review — November 8, 2026

- Deployed Worker version `59490a2c-b6c0-48eb-952f-b20cee26b0d0` to `https://nyc-schools-ratings-d1-staging.biser-d.workers.dev/family`.
- Reopened the existing isolated staging environment until November 15, 2026, 17:00 UTC (noon New York). Applied only the previously pending `0013_family_simplicity.sql`; migrations 0000–0012 were already present.
- No production database or accounts were copied. Local preview fixtures and the preview server are not in the deployed entrypoint. Existing staging accounts were preserved. Temporary verification accounts, sessions and their calendar records were removed; private events and children both returned to zero.
- Real staging authentication, event time/range editing, canonical school search, account isolation, mobile/desktop rendering, shared assistant history and a live model reading its owned calendar passed. The single live calendar-answer round trip was **27.7 seconds**: correctness passed, but this is not evidence of acceptable latency. Measure and improve latency before production approval.
- WhatsApp connection and reminder delivery are disabled on staging because its configured sender is also the production sender. No production Twilio webhook was repointed. Calendar saves and the live website assistant work; handset delivery cannot be validated here without a separately routed staging sender. Cron triggers remain empty.
- Staging-only assistant access is granted to signed-in staging users without payment. Production sessions do not sign into staging; create a separate staging account at `/register?redirect=/family`, using a different password. No owner account was silently created.
- Production remained on `f3ca9ad2-9771-43c9-893a-bc443a3cc59f`. No main-branch push or production deploy was performed.

### Assistant latency optimization — staging only

Deployed version `83e79db2-0305-4e6a-863c-84846c929935` supersedes the initial Family preview. No database migration was needed for this follow-up.

- The fresh four-request baseline showed calendar/school tool SQL taking 35–66 ms, versus model/SDK generation taking 8.7–11.6 seconds. The original 27.7-second calendar request was slower than these fresh baseline samples; do not treat it as a typical average.
- Staging explicitly sets `PARENT_AGENT_FAST_RESPONSES_ENABLED=true`. The same GLM-4.7-Flash model disables its separate reasoning mode using the documented `chat_template_kwargs.enable_thinking=false` and clears old hidden reasoning, not conversation text or tool results. See [Cloudflare's model input schema](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/sync-input.json). Actual installed-provider generation and streaming passthrough are regression-tested.
- The staging prompt asks for compact, actionable answers without removing profile links, rating caveats, source requirements, ownership checks or confirmation. Preference/pending-draft reads run concurrently. No private-response cache, canned intent parser, reduced history or smaller tool-step allowance was introduced. The 30-message history, six steps and 900-token answer allowance are unchanged.
- Timing logs now include model-step and token counts without prompt/reply contents. Production retains its previous profile until its deployment configuration explicitly opts in.

Final live staging sample: **18/18 checks passed**, two fresh-account conversations, median **2.583 s**, nearest-rank p90 **6.218 s**, maximum **6.922 s**. These are completed HTTP round trips, not typing-indicator or first-token timings.

| Request | Final observed range |
| --- | --- |
| Greeting / current day | 0.8–2.5 s |
| Upcoming private events and official closures | 3.4–3.9 s |
| UES school shortlist | 4.5–6.2 s |
| UWS follow-up retaining elementary-school context | 4.0–5.0 s |
| Natural-language calendar draft | 1.9–2.4 s |
| Confirm a save/edit | 2.1–2.7 s |
| Edit draft requiring a fresh calendar lookup | 4.2–6.9 s |

The live checks verify canonical school links, calendar facts, natural dates/times, no save before confirmation, successful later save, safe subsequent edits and owned conversation history. Seven offline regression suites and TypeScript passed. This small sample is not a production latency SLA or a comprehensive model-quality evaluation; provider load can still cause slower replies.

Benchmark: `node scripts/d1/benchmark-family-staging.mjs --full --rounds=2`. It is pinned to staging, creates unsubscribed temporary accounts with no email calls, clears their assistant history, then removes their sessions/accounts and cascading calendar data. Final verification returned to four pre-existing staging accounts, zero private events and zero children. No real messages, payments, production writes or production deployments were made.

## Production promotion — November 8, 2026

At the user's explicit request, applied only migration `0013_family_simplicity.sql` to production D1 `35237f81-df27-4908-be1a-1226faf501e0`, then deployed Worker version `b6ef0899-3056-497c-8792-eeed0efd1f7e`. Production explicitly enables the tested fast-response profile. Its only configuration change is `PARENT_AGENT_FAST_RESPONSES_ENABLED=true`; existing live WhatsApp/reminder flags, sender/template, $9.99 Stripe Price, email settings, bindings and schedules remain intact. No staging accounts or preview fixtures were imported.

Production canary passed 12 checks: current asset release, Family redirect/noindex, anonymous private API denial, price preservation, unsigned WhatsApp rejection, grandfathered/free entitlements, time/range writes and edits, cross-account isolation, canonical school search, live owned-calendar evidence, later-turn draft confirmation and protected history. The three completed assistant round trips were **5.026 s** (calendar), **2.471 s** (draft) and **2.114 s** (confirmation). This is a small diagnostic sample, not a performance guarantee or a real handset-delivery test.

All temporary unsubscribed canary accounts, sessions, assistant history and cascading calendar records were removed. No email, WhatsApp message or payment calls were made. Seven offline suites, TypeScript, fresh Vite build, pricing/SSR regression and the initial-client bundle budget passed. The deployment itself adds no seeded child/event data.

Rollback: previous Worker `f3ca9ad2-9771-43c9-893a-bc443a3cc59f`; retain additive schema and all new calendar records. A pre-migration D1 Time Travel bookmark was recorded locally for emergency recovery; do not restore the database or discard post-release user writes as a routine code rollback.
