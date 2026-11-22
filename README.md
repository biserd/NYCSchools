# NYC School Ratings

[NYC School Ratings](https://nycschoolsratings.com) is an independent guide for families choosing a school in New York City. Find district, charter, and private schools and early-childhood programs across all five boroughs. Compare what matters for your child's grade, save a shortlist, and keep track of school dates.

[Explore the school map](https://nycschoolsratings.com/map) · [Compare schools](https://nycschoolsratings.com/compare) · [Open My Family](https://nycschoolsratings.com/family) · [See how ratings work](https://nycschoolsratings.com/methodology)

## What can a parent learn?

| Question | Where to look |
| --- | --- |
| Which schools should we visit? | Use the map to search by location and see published school zones. Profiles distinguish district schools, charters, private schools, and early-childhood providers. A zone or program listing does not confirm an open seat or an offer. |
| How big are the classes my child might enter? | **Classrooms & enrollment** shows reported class sizes by grade or course and program, eligible classes meeting the cap, and enrollment by grade where verified. A schoolwide pupil–teacher ratio is not a classroom headcount. |
| How do academic results compare? | Profiles show dated ELA, math, and science results where reported. Grade 5 and 8 science can be compared with the same grade and test in the district where a valid benchmark exists. High school profiles also include graduation and Regents measures. |
| What else should we ask about on a tour? | Compare school climate and surveys, attendance, program offerings, historical admissions demand, and neighborhood safety. Coverage varies by school, year, and source. |

**Try it:** Open [P.S. 158 Bayard Taylor](https://nycschoolsratings.com/school/02m158-ps-158-bayard-taylor#enrollment-and-class-size). Its October 2026 enrollment register counted **96 kindergarteners**; its general education and integrated co-teaching class-size report counted **95 students in five classes**. The figures answer different questions. The profile keeps the dates, programs, and denominators visible.

## Data behind the profiles

| Release | What it adds |
| --- | --- |
| [NYSED spring 2025 and 2026 assessments](docs/nysed-profile-assessments.md) | Separate grade 5 and grade 8 science trends, plus grade-level ELA and math on **162 verified charter profiles** for spring 2026. Changes are percentage points, not individual student growth. Suppressed results are not treated as zero. |
| [NYCPS citywide class sizes](docs/citywide-class-sizes.md) and [enrollment registers](docs/classroom-data-pilot.md) | The October 31, 2026 class-size release matched **1,523 school profiles**. Class-size measures, cap counts, and audited versus preliminary enrollment have distinct sources and coverage. |
| [School data refresh](docs/2026-data-refresh.md) | Documents assessment, enrollment, attendance, and other releases. NYCPS, NYSED, NYC Open Data, and NCES publish different measures on different schedules; use the source and year shown on the profile. |

The site's ratings are its own, not official government ratings. Adding science, charter assessment, and classroom panels did **not** change the ranking formula. See the [methodology](https://nycschoolsratings.com/methodology) and [data stories](https://nycschoolsratings.com/blog).

## Accounts and Family Premium

Public school search and the map work without an account. [Family Premium](https://nycschoolsratings.com/pricing) is **$9.99/month** for new subscribers. It includes detailed school research, the family calendar, the Parent Assistant on the web and WhatsApp, and opt-in WhatsApp reminders. Guest checkout is supported. Existing paid members should sign in rather than buy again; grandfathered passes retain their original terms.

[KinderLearner Pro](https://kinderlearner.com/) is included with Family Premium. To unlock it on the web, iPhone, or iPad, sign in to KinderLearner and verify the same email used for NYC School Ratings. KinderLearner is a separate product. This repository contains the NYC School Ratings website and shared backend, not the native iPhone/iPad client.

## Developer and AI access

| Interface | Access |
| --- | --- |
| [Developer REST API](https://nycschoolsratings.com/developers/docs) (`/api/v1`) | Eligible paid accounts can generate a Bearer API key in Settings. Use the developer docs for endpoints, request examples, and limits. |
| [ChatGPT school research](https://nycschoolsratings.com/chatgpt) | The read-only MCP endpoints `/mcp/schools` and `/mcp/muse` let clients search schools, retrieve a profile, and compare schools without a parent account or subscriber API key. |
| [MCP server](MCP_PUBLICATION.md) (`/mcp`) | Public research is separate from account data: reading a user's saved favorites requires OAuth. See [discovery and access boundaries](docs/agent-readiness.md). |

## Working on the project

The frontend is React, TypeScript, and Vite. A Cloudflare Worker serves the built assets, server-rendered public pages, and Express API. **Cloudflare D1 (SQLite)** is the production database. PostgreSQL/Neon and Hyperdrive are not part of the production runtime.

| Path | Purpose |
| --- | --- |
| [client/src](client/src) | Search, map, school profiles, comparison, and Family screens |
| [server/index-worker.ts](server/index-worker.ts) and [server/parent](server/parent) | Worker entry point, scheduled work, Parent Assistant, and WhatsApp delivery |
| [shared](shared) | Shared types, school-data definitions, and presentation logic |
| [migrations-d1](migrations-d1) and [scripts](scripts) | Reviewed D1 migrations, data imports, verification, and tests |
| [plugins/nyc-school-ratings](plugins/nyc-school-ratings) | ChatGPT plugin package and submission notes |

### Local development

Use **Node.js 22 or later** and npm. From the repository root:

```sh
npm ci
npm run dev:client
```

This starts the Vite frontend only. For the API and frontend together, use Wrangler's local D1 database. Copy [`.dev.vars.example`](.dev.vars.example) to `.dev.vars`, set a local-only session secret, and keep email delivery disabled. Use only development credentials for external integrations.

```sh
npx wrangler d1 migrations apply DB --local --config wrangler.d1-staging.jsonc
npm run dev
```

The migration command creates the **local schema**, not a copy of the school dataset. An empty directory on a fresh database is expected. The staging configuration references Cloudflare bindings; features such as AI or email may require separate provider setup. Do not use `--remote` to populate a local database.

```sh
npm run check                         # TypeScript
npm run test:nysed-profile-assessments # Assessment matching and display
npm run test:family                   # Offline Family regression suite
npm run build                         # Vite production assets; no deploy
```

Production uses [wrangler.jsonc](wrangler.jsonc); staging uses [wrangler.d1-staging.jsonc](wrangler.d1-staging.jsonc) and a separate database. Schema changes go through reviewed D1 migrations, not `db:push`. See the [D1 cutover and recovery runbook](docs/d1-production-cutover.md) before making operational changes.

## Rights

All rights reserved. Third-party datasets are attributed to their respective publishers; see the [data sources and methodology](https://nycschoolsratings.com/methodology).
