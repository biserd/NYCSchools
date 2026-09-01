# Cloudflare migration runbook

The application runtime is ready for Cloudflare Workers. This phase removes
the Replit runtime, Replit Stripe synchronization, and Resend. It preserves the
current PostgreSQL schema through Cloudflare Hyperdrive so the application can
move off Replit without a risky database rewrite in the same cutover.

## What is implemented

- Vite SPA build and Wrangler Worker entrypoint for Express
- Worker Assets for the React SPA and SEO-aware HTML responses
- Request-scoped `pg` connections through a Hyperdrive binding
- Cloudflare Email Service for every transactional and campaign email
- Cloudflare Workers AI with GLM-4.7-Flash for chat, recommendations, and
  early-childhood insights
- Workers Cron Triggers for API observability, drip email, and safety sync
- Direct Stripe API reads and signature-verified Stripe webhooks
- Cloudflare-generated TypeScript binding types
- No process-lifetime database pool, timer-based log buffer, or Replit URL logic

## 1. Move the PostgreSQL database

The Replit production PostgreSQL database is connected through Hyperdrive
configuration `def7c546eb804bbfb9e546d005c2266c`. Its connection string is
stored only by Cloudflare and is not present in Worker variables or source
control. The deployed Worker has successfully read all 2,382 production school
records through this binding.

For local development, `wrangler.jsonc` points the Hyperdrive emulator at the
same disposable local PostgreSQL URL shown in `.dev.vars.example`. Change that
non-production URL in both places if your local database uses other settings.

Hyperdrive is the quickest safe route off Replit, but the database is still
PostgreSQL. A fully Cloudflare-native database would require a separate D1
conversion: the current schema has 40 PostgreSQL tables plus PostgreSQL-specific
JSON, timestamp, sequence, and raw SQL behavior. Treat that as a tested second
phase rather than changing data semantics during the hosting cutover.

## 2. Enable Cloudflare Email Service

Email Service is the native transactional sender used by the `EMAIL` binding.

1. `nycschoolsratings.com` is active in Cloudflare DNS.
2. Email Service onboarding is enabled for the domain.
3. The Worker binding is restricted to `hello@nycschoolsratings.com`.
4. Leave `EMAIL_DELIVERY_ENABLED=false` in local `.dev.vars`; production uses
   the `true` Worker variable already declared in `wrangler.jsonc`.

No Resend API key is used after this migration.

## 3. Add Worker secrets

The deployed Worker already contains the production session, Stripe, webhook,
Google Maps, Socrata, and cron secrets migrated from Replit.

AI inference uses the native `AI` binding and the
`@cf/zai-org/glm-4.7-flash` model. It does not require an OpenAI account or API
key. Keep the model identifier in `server/aiService.ts` and the binding in
`wrangler.jsonc` in sync if the model changes later.

`CRON_SECRET` only protects the optional manual HTTP cron endpoints. Native
Workers Cron Triggers do not use it.

## 4. Validate and deploy

```bash
npm install
npm run cf-typegen
npm run check
npm run cf-dry-run
npm run deploy
```

The deployed preview is
`https://nyc-schools-ratings.biser-d.workers.dev`. Validation has confirmed the
SPA, production database, Stripe product/configuration reads, unsigned webhook
rejection, robots.txt, TypeScript, rating regressions, and the Wrangler bundle.
Before changing DNS, finish testing:

- public homepage, school detail page, and static asset caching
- registration, login, logout, password reset, and magic link
- Stripe test checkout and a signed webhook delivery
- Workers AI chat, recommendation, and early-childhood insight endpoints
- one manually triggered drip email with delivery enabled
- `/api/health` and representative database-backed endpoints

## 5. Domain cutover

Worker routes for `nycschoolsratings.com/*` and `www.nycschoolsratings.com/*`
place the Cloudflare Worker in front of the existing proxied DNS records. This
keeps the old origin available as a rollback target without sending it normal
production traffic. The new signature-verified Stripe production webhook is
active at:

```text
https://nyc-schools-ratings.biser-d.workers.dev/api/stripe/webhook
```

Monitor Worker logs and Hyperdrive errors, and keep the old deployment available
until checkout, authentication, email, and scheduled jobs have all completed
successfully in production. Remove the old origin and its unused Stripe webhook
only after that observation window.
