# NYC School Ratings

A parent-friendly web dashboard for browsing, comparing, and researching NYC's
public, charter, and private schools — backed by real data from the NYC DOE,
NYC Open Data, NYSED, and the NCES.

Live at [**nycschoolsratings.com**](https://nycschoolsratings.com).

## What's inside

- **1,500+ public elementary schools** with academic, climate, progress, and
  survey scores. Overall score is a weighted blend:
  `Test Proficiency × 40% + Climate × 30% + Progress × 30%`.
- **600+ private schools** (NCES PSS data) with filtering by borough,
  religious affiliation, and coed status.
- **All NYC public high schools** with graduation rates, Regents results,
  multi-year trends, and subgroup analysis (NYC DOE InfoHub).
- **HS admissions & programs** — Fall 2025 directory data for 452 high
  schools and 943 programs (admission methods, demand, eligibility, offer
  rates, SHSAT stats).
- **NYCEEC Early Childhood Centers** for 3-K and Pre-K.
- **K / 3-K / Pre-K admissions & demand** metrics from NYC DOE LL72 reports.
- **Attendance & chronic absenteeism** (2018-19 → 2024-25) with subgroup
  breakdowns.
- **Discipline & suspensions** (2018-19 → 2024-25, LL93) by type, race,
  gender, SWD, ELL, and STH.
- **Neighborhood Safety Index** — a 0-100 score on every public, private, and
  NYCEEC school detail page, computed from NYPD complaint data within a
  configurable radius (0.25 / 0.5 / 1 / 5 miles), severity-weighted, and
  ranked as a citywide percentile. Free tier shows the score; Premium
  unlocks radius selector, top categories, trend, and percentile.
- **Interactive map** with school zone detection (turf.js + NYC DOE
  boundary polygons).
- **Side-by-side comparison** with shareable, SEO-friendly URLs
  (e.g. `/compare/PS006-M-vs-PS290-M`).
- **District comparison** dashboard.
- **AI chat assistant** powered by OpenAI's `gpt-5-mini` (Premium).
- **Smart Recommendations ("Find My Match")** — a short questionnaire that
  produces personalized school suggestions.
- **Application Tracker** to manage applications across schools (Premium).
- **3-K / Pre-K Lottery Simulator**.
- **Special Education (IEP) support** information.
- **Commute Time Calculator** (auth-gated; uses Google Distance Matrix).
- **Parent reviews & ratings** on every school.
- **Data-driven blog** with analytical articles and Recharts visualizations.
- **Favorites** that sync across devices for logged-in users.
- **Developer API (Premium)** — public REST API at `/api/v1` (see below).

## Stack

- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS, Shadcn UI,
  Wouter, TanStack Query, Recharts, Leaflet, turf.js
- **Backend:** Node.js + Express + TypeScript, Drizzle ORM, PostgreSQL,
  in-memory caching layer with webhook-based invalidation, Gzip compression
- **Auth:** Email + password with secure session cookies; password reset
  via signed email tokens; magic-link sign-in
- **Payments:** Stripe (Checkout + Customer Portal + webhooks) for the
  Freemium / Premium subscription model
- **AI:** OpenAI `gpt-5-mini` for chat assistant and recommendations
- **Email:** Resend (welcome emails, password reset, drip campaign)
- **Maps & geo:** Google Maps Geocoding API, Google Distance Matrix API,
  Leaflet for rendering, NYC Open Data point locations and zone polygons
- **Data:** NYC DOE InfoHub, NYC Open Data, NYSED State Report Card,
  NCES Private School Universe Survey, NYC School Survey CSVs

## Running locally

```bash
npm install
npm run dev          # Express + Vite, served on a single port
npm run db:push      # Push Drizzle schema changes to the configured Postgres
```

The dev server URL is shown in your Replit webview. Both the API and the
SPA are served from the same origin — no proxy configuration needed.

### Environment variables

The app reads the following from environment / Replit Secrets. The ones
marked **required** are needed for the app to boot; the rest enable
specific features.

| Variable                              | Purpose                                       |
|---------------------------------------|-----------------------------------------------|
| `DATABASE_URL` *(required)*           | PostgreSQL connection string                  |
| `SESSION_SECRET` *(required)*         | Express session signing secret                |
| `STRIPE_LIVE_SECRET_KEY` / `STRIPE_TEST_SECRET_KEY`           | Stripe server keys (Premium subscriptions)    |
| `STRIPE_LIVE_PUBLISHABLE_KEY` / `STRIPE_TEST_PUBLISHABLE_KEY` | Stripe publishable keys (frontend Checkout)   |
| `OPENAI_API_KEY`                      | AI chat assistant + Smart Recommendations     |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL`| Transactional email (auth + drip campaign)    |
| `GOOGLE_MAPS_API_KEY`                 | Geocoding + Distance Matrix (commute calc)    |
| `SOCRATA_APP_TOKEN`                   | NYC Open Data / NYPD complaint dataset access |
| `CRON_SECRET`                         | Protects `POST /api/cron/*` endpoints         |

## Project layout

```
client/src/
├── components/        # Shared UI (AppHeader, FilterBar, ApiAccessCard, …)
│   └── ui/            # Shadcn primitives
├── pages/             # One file per route — registered in App.tsx
├── hooks/             # useAuth, useCheckout, useToast, …
└── lib/               # queryClient, helpers

server/
├── index-dev.ts       # Dev entrypoint (Vite middleware)
├── index-prod.ts      # Production entrypoint (static SPA)
├── routes.ts          # Main API routes + auth, Stripe webhooks, etc.
├── routesV1.ts        # Public Developer API (/api/v1)
├── apiKeyAuth.ts      # API key generation, hashing, Bearer middleware,
│                      # rate limiter, Premium recheck
├── auth.ts            # Sessions, password hashing, magic links
├── storage.ts         # Drizzle queries (the only place SQL lives)
├── cache.ts           # In-memory cache with TTLs + invalidation
├── services/          # safetyIndex, geocoding, schoolZones, …
└── scripts/           # One-off data import / sync scripts

shared/
└── schema.ts          # Drizzle tables, Zod insert schemas, shared types

scripts/               # CLI data importers (NYSED, HS data, NYCEEC, …)
public/                # Static assets, sitemap.xml, robots.txt
```

Key conventions:

- **Schema first.** All data models live in `shared/schema.ts` (Drizzle +
  `drizzle-zod` insert schemas). Frontend and backend both import from
  there for type safety.
- **No raw SQL migrations.** Schema changes are applied with
  `npm run db:push`. If a push warns about data loss, use
  `npm run db:push --force`.
- **No SQL outside `server/storage.ts`.** Routes are thin and call into
  the storage layer.
- **Caching by default.** Hot endpoints go through `server/cache.ts`
  (centralized TTLs, mutation protection via `structuredClone`,
  webhook-based invalidation).

## Subscription tiers

The app uses a Freemium model powered by Stripe.

- **Free:** browse all schools, see overall scores, save favorites, use the
  smart recommendations questionnaire, see the Neighborhood Safety score at
  the default radius, view one premium school detail page in full
  ("One Free School View").
- **Premium ($4.99/month):** AI chat assistant, side-by-side & district
  comparison, application tracker, full safety drill-down (radius selector,
  trend, percentile, top categories), commute time calculator, and the
  **Developer API** (see below).

Stripe state is kept in sync with the local DB via webhooks, so there is no
"stale subscription" drift between Stripe and the app.

## SEO

Every page sets a unique title, meta description, canonical URL, Open
Graph + Twitter Card tags, and JSON-LD Structured Data where applicable.
A static `sitemap.xml` plus pre-generated comparison and school pages keep
the site fully indexable. Performance is optimized with code-splitting,
lazy loading for heavy pages, an eager-imported home page so the LCP text
is in the initial chunk, deferred analytics, a trimmed Inter webfont, and
aggressive static asset caching.

## Developer API

A public REST API is available to Premium subscribers at `/api/v1`. Full
documentation and live curl examples live at
[`/developers/docs`](https://nycschoolsratings.com/developers/docs).

### Authentication

All requests require a Bearer token issued from your account:

1. Subscribe to Premium ($4.99/month).
2. Go to **Settings → API Access** (`/settings#api-access`).
3. Click **Generate API Key**. The plaintext key is shown exactly once —
   copy it immediately. Only a SHA-256 hash is stored server-side.
4. Pass the key in the `Authorization` header on every request:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://nycschoolsratings.com/api/v1/schools?limit=5"
```

You can have up to 5 active keys at a time, and any key can be revoked
instantly from the same settings page.

### Endpoints

| Method | Path                      | Description                                                |
|--------|---------------------------|------------------------------------------------------------|
| GET    | `/api/v1/schools`         | List NYC schools with filters + pagination (`district`, `grade_band`, `has_3k`, `has_prek`, `has_gifted`, `limit`, `offset`) |
| GET    | `/api/v1/schools/:dbn`    | Get a single school by DBN (e.g. `02M545`) — flat object   |
| GET    | `/api/v1/districts`       | Aggregate stats for all 32 NYC school districts            |
| GET    | `/api/v1/early-childhood` | NYC Early Education Centers (3-K / Pre-K) with `borough`, `program_type`, `center_type` filters |
| GET    | `/api/v1/trends/:dbn`     | Multi-year ELA / Math / Science score history for a school |

All field names use `snake_case` (e.g. `overall_score`, `ela_proficiency`,
`grade_band`). List endpoints return `{ data: [...], pagination: {...} }`;
detail endpoints (`/schools/:dbn`, `/trends/:dbn`) return a flat object.

### Rate limits

Each API key is rate-limited globally (the counters are persisted in
Postgres so they survive deploys and span multiple server instances):

- **60 requests / minute**
- **10,000 requests / day**

Every authenticated response includes the standard headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699574400
```

Exceeding either bucket returns `429 Too Many Requests` with a
`Retry-After` header.

Unauthenticated requests (missing or invalid Bearer token) are also
throttled per IP at 30 / minute to discourage key-guessing.

### Abuse monitoring

Every Developer API request is logged for security review. We email the
account owner and revoke the key when we detect signals like a sudden
spike in 429s or use from many distinct IPs at once (which usually means
the key has been pasted into client-side code and leaked). If you think
your key was leaked, revoke it from Settings → API Access and issue a
new one — there's no penalty.

### Error format

All errors use a stable JSON envelope:

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "district must be between 1 and 32.",
    "details": { "parameter": "district", "provided": "99" }
  }
}
```

Common status codes: `400` (validation), `401` (missing/invalid key),
`403` (Premium subscription required or revoked), `404` (not found),
`429` (rate limited), `500` (internal).

## Data sources & methodology

- **Academic / climate / progress scores:** NYC DOE School Quality Reports
- **Test proficiency (ELA / Math / Science):** NYSED State Report Card
- **3-K / Pre-K / K admissions & demand:** NYC DOE InfoHub LL72 reports
- **Private schools:** NCES Private School Universe Survey (PSS), 2023-24
- **High school graduation & Regents:** NYC DOE InfoHub
- **Attendance & absenteeism:** NYC DOE InfoHub (2018-19 → 2024-25)
- **Discipline & suspensions:** NYC DOE InfoHub LL93 reports
- **HS admissions & programs:** NYC DOE Fall 2025 HS Directory
- **NYCEEC early childhood centers:** NYC Open Data
- **School zones & locations:** NYC Open Data + turf.js point-in-polygon
- **Neighborhood Safety Index:** NYPD complaint datasets `5uac-w243` (YTD)
  and `qgea-i56i` (historic) on Socrata, severity-weighted over a rolling
  12-month window. Methodology is published at
  [`/safety-methodology`](https://nycschoolsratings.com/safety-methodology).

## Deployment

The app is deployed on Replit. Production uses `server/index-prod.ts`
which serves the built SPA from `dist/` and the Express API from the same
origin. Stripe webhooks, the safety-index monthly cron, and the drip
email scheduler all run on the same instance.

## License

All rights reserved. Data is sourced from the publicly available datasets
linked above.
