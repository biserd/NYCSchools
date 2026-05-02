# NYC School Ratings

## Overview
NYC School Ratings is a web dashboard designed to help parents browse and compare NYC public and charter elementary schools. It offers clear data, SEO-optimized school pages, an AI chat assistant, user authentication, a favorites system, smart recommendations, and an interactive map view, all powered by real NYC school data. The project aims to simplify school selection for urban families and has significant market potential.

## User Preferences
I prefer detailed explanations. Ask before making major changes.

## System Architecture

### UI/UX Decisions
The design emphasizes a clean, modern aesthetic with the Inter typeface and a primary blue color scheme, adhering to `design_guidelines.md`. It is responsive and accessible, featuring ARIA labels and keyboard navigation. Visual cues include color-coded indicators for scores and metrics. The AI assistant is prominent, with multiple entry points and a pulsing animation. Headers are designed for specific contexts: `AppHeader` for general navigation, `AuthPageHeader` for authentication flows, and a custom header for the home page.

### Technical Implementations
The frontend uses React 18 with TypeScript, Vite, Tailwind CSS, Shadcn UI, and Wouter for routing. Components are organized logically, and state is managed via React's `useState` and `useMemo`. Data models are defined in `shared/schema.ts`. Comprehensive SEO includes dynamic meta tags, Structured Data, `Sitemap.xml`, `Robots.txt`, Open Graph, Twitter Cards, and canonical URLs. Geocoding uses NYC Open Data for map visualization and school zone detection.

### Feature Specifications
The platform provides comprehensive data for 1,533 NYC schools, including academic, climate, progress scores, NYC School Survey results, demographics, and program information. Key features include filtering and sorting, historical trend visualization of ELA/Math/Science scores, K/3K/Pre-K Admissions & Demand metrics, and user authentication with email/password. A "One Free School View" mechanism allows access to premium data for the first school viewed. Password reset functionality is available via email with secure token-based verification. Users can save favorite schools, access an OpenAI-powered AI Chat Assistant (Premium feature), and utilize an Application Tracker (Premium). Smart Recommendations (Find My Match) offer personalized school suggestions via an AI questionnaire. An Interactive Map View, Side-by-Side Comparison (Premium-gated), and District Comparison (Premium-gated) are available. Additional features include Parent Reviews & Ratings, a Commute Time Calculator (Auth-Gated), and a Stripe-powered Subscription & Pricing system (Freemium model). Legal pages (Privacy Policy, Terms of Service) are present. A Data-Driven Blog features analytical articles with Recharts visualizations. A 3-K/Pre-K Lottery Simulator and Special Education (IEP) support are included. Official School Zone Detection uses NYC DOE boundaries and `turf.js`. NYCEEC Early Childhood Centers are browsable. The **Overall Score** is calculated as: `Test Proficiency (40%) + Climate Score (30%) + Progress Score (30%)`.
Specific additions include:
- **NYC Private Schools**: Browse and detail pages for 600+ NYC private schools with filtering by borough, religious affiliation, and coed status, using NCES PSS data.
- **High School Performance Dashboard**: Comprehensive performance data for NYC public high schools, including graduation and Regents exam results from NYC DOE InfoHub, with multi-year trends and subgroup analysis.
- **School Attendance & Chronic Absenteeism**: Attendance and chronic absenteeism data for all NYC public schools (2018-19 through 2024-25) from NYC DOE InfoHub, with year-over-year changes and subgroup breakdowns.
- **School Discipline & Suspensions**: Discipline/suspension data for all NYC public schools (2018-19 through 2024-25) from NYC DOE InfoHub LL93 Reports, with breakdowns by type (removals, principal suspensions, superintendent suspensions), race/ethnicity, gender, SWD, ELL, and STH.
- **HS Admissions & Programs**: Fall 2025 NYC DOE HS Directory data for 452 high schools with 943 programs, including admission methods (Ed. Opt., Screened, Audition, Test, Open, etc.), demand metrics (applicants, seats, apps/seat), eligibility, requirements, priorities, offer rates, and SHSAT/specialized HS stats.
- **Neighborhood Safety Index**: 0-100 parent-friendly safety score on every public, private, and NYCEEC school detail page, calculated from NYPD complaint data (Socrata datasets `5uac-w243` YTD + `qgea-i56i` historic) within four radius options (0.25/0.5/1/5 miles, default 0.5mi). Severity-weighted (violent felony 8 / felony 4 / misdemeanor 2 / violation 1) over a rolling 12-month window, ranked as a citywide percentile so 50 = average. Free tier shows score + label at the default radius; Premium unlocks radius selector, top categories, trend (improving / stable / worsening vs prior 12 months), and percentile vs other NYC schools. Tables: `nypd_complaints`, `school_safety_index`. Sync script: `npx tsx scripts/sync-safety-index.ts [--recompute] [--months=N] [--max-rows=N]` (CLI). Public methodology page at `/safety-methodology`. Monthly refresh: `POST /api/cron/safety-sync` (CRON_SECRET-protected, fire-and-forget — invoke from a Replit Scheduled Deployment or external cron once per month). Last-run state is stored in `app_settings` under key `safety_sync_status` and is readable by admins via `GET /api/admin/safety-sync/status`.

### System Design Choices
The system uses PostgreSQL with Drizzle ORM. Dedicated API endpoints handle data fetching and AI integration. Error handling is graceful, and performance is optimized through pagination, search debounce, server-side caching, Gzip compression, code-splitting, and localStorage synchronization. Cost optimizations include auth-gated features.
**Drip Email Campaign**: An automated, re-engagement email sequence for free users over 14 days, controlled by `app_settings` and user flags.
**Server-Side Caching**: Centralized in-memory caching with configurable TTLs, mutation protection via `structuredClone`, automatic cleanup, and webhook-based invalidation.
**Shareable Comparison URLs**: SEO-optimized comparison pages with friendly slugs (e.g., `/compare/PS006-M-vs-PS290-M`), dynamic SEO, and instant URL updates. Includes pre-generated URLs for sitemap indexing and a natural language comparison summary.
**Core Web Vitals Optimizations**: Includes lazy loading for heavy pages (Home is intentionally eager-imported so its LCP element paints in the initial JS chunk), `React.memo` for component optimization, fully deferred analytics scripts (both loader and inline init), Inter font trimmed to weights 400/500/600/700 with `display=swap`, and aggressive static asset caching. The Home page renders its header, FilterBar, AI banner, and School Guides immediately and only skeletonizes the school list area while `/api/schools` is fetching, so the LCP text candidate is in the DOM on first paint.

## External Dependencies
- **PostgreSQL**: Primary database.
- **OpenAI**: AI chat assistant and smart recommendations (`gpt-4o-mini`).
- **Replit Auth**: User authentication and session management.
- **Leaflet**: Interactive maps.
- **NYC School Survey Data**: CSV data for school survey results.
- **NYC Open Data**: School point locations (geocoding), school zone boundaries, and NYCEEC early childhood center data.
- **turf.js**: Geographic point-in-polygon matching.
- **Google Maps APIs**: Geocoding API and Distance Matrix API.
- **Stripe**: Payment processing and subscription management via `stripe-replit-sync`.
- **Resend**: Email service for password reset and welcome emails.
- **NYSED State Report Card Database**: Official ELA/Math test score data.
- **NYC DOE InfoHub LL72 Reports**: K/3K/Pre-K admissions data.
- **NCES Private School Universe Survey (PSS)**: Private school data.