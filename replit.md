# NYC School Ratings

## Overview
NYC School Ratings is a web dashboard designed to help parents browse and compare NYC public and charter elementary schools. It offers clear data, SEO-optimized school pages, an AI chat assistant, user authentication, a favorites system, smart recommendations, and an interactive map view, all powered by real NYC school data. The project aims to simplify school selection for urban families and has significant market potential.

## User Preferences
I prefer detailed explanations. Ask before making major changes.

## System Architecture

### UI/UX Decisions
The design emphasizes a clean, modern aesthetic with the Inter typeface and a primary blue color scheme, adhering to `design_guidelines.md`. It is responsive and accessible, featuring ARIA labels and keyboard navigation. Visual cues include color-coded indicators for scores and metrics with on-screen explanations. The AI assistant is prominent, with multiple entry points and a pulsing animation.

**Header Architecture:**
- `AppHeader`: Main navigation header used on most pages. Shows different navigation for logged-in/logged-out users.
- `AuthPageHeader`: Minimal header with logo, page title breadcrumb, and theme toggle for auth pages (login, register, forgot-password, reset-password).
- Home page has a custom header integrated with its hero section layout, but maintains consistent navigation buttons (Pricing, Log In, Sign Up for logged-out; Favorites, Settings, Logout for logged-in).

### Technical Implementations
The frontend utilizes React 18 with TypeScript, Vite, Tailwind CSS, Shadcn UI, and Wouter for routing. Components are organized into `components/` and `pages/`. Data is sourced from PostgreSQL, with client-side calculations and state managed via React's `useState` and `useMemo`. `shared/schema.ts` defines data models. SEO is comprehensive, including dynamic meta tags, Structured Data, `Sitemap.xml`, `Robots.txt`, Open Graph, Twitter Cards, and canonical URLs. Geocoding uses NYC Open Data for map visualization and school zone detection.

### Feature Specifications
The platform provides comprehensive data for 1,533 NYC schools, including academic, climate, and progress scores, NYC School Survey results, demographics, and program information (3-K/Pre-K, G&T). Key features include filtering and sorting options (district, grade band, programs, zip code), historical trend visualization (3-5 years of ELA/Math scores), **K/3K/Pre-K Admissions & Demand metrics** (seats, applicants, apps per seat, offer rate, competitiveness levels), and user authentication with email/password and PostgreSQL-backed sessions. **One Free School View**: Every visitor gets full premium access to the FIRST school they view, tracked via localStorage (anonymous) or database `freeViewSchoolDbn` field (logged-in). The `useFreeSchoolView` hook manages this with optimistic rendering and multiple guards against re-claiming. Password reset functionality is available via email with secure token-based verification (SHA-256 hashed, 30-minute expiration, single-use). Users can save favorite schools, access an OpenAI-powered AI Chat Assistant (`gpt-4o-mini`) with context and history (Premium feature), and utilize an Application Tracker (Premium) for managing school applications. Smart Recommendations (Find My Match) offer personalized school suggestions via an AI questionnaire. An Interactive Map View, Side-by-Side Comparison (Premium-gated), and District Comparison (Premium-gated) are available. Additional features include Parent Reviews & Ratings, a Commute Time Calculator (Auth-Gated), and a Subscription & Pricing system via Stripe (Freemium model with Premium and Season Pass tiers). Conversion optimization includes a redesigned pricing page and `UpgradeModal` components. Legal pages (Privacy Policy, Terms of Service) are present. A Data-Driven Blog features analytical articles with Recharts visualizations, including COVID Recovery analysis. A 3-K/Pre-K Lottery Simulator and Special Education (IEP) support are included. Official School Zone Detection uses NYC DOE boundaries and `turf.js`. NYCEEC Early Childhood Centers are browsable with filtering, map integration, and AI-generated insights. The **Overall Score** is calculated as: `Test Proficiency (40%) + Climate Score (30%) + Progress Score (30%)`.

### System Design Choices
The system uses PostgreSQL with Drizzle ORM. Dedicated API endpoints handle data fetching and AI integration. Error handling is graceful, and performance is optimized through pagination, search debounce, server-side caching, Gzip compression, code-splitting, and localStorage synchronization. Cost optimizations include auth-gated features.

### Drip Email Campaign (`server/dripCampaign.ts`)
Automated re-engagement email sequence for free users over 14 days:
- **Global Control**: `app_settings` table with `drip_campaign_enabled` key (default: 'false' for safety)
- **User Tracking**: Users table has `dripEmailsSent` (array), `emailUnsubscribed` (boolean), `lastDripEmailAt` (timestamp)
- **Email Sequence**: 
  1. Day 1: `welcome_tip` - Quick tip on using filters and favorites
  2. Day 3: `ai_spotlight` - AI Chat Assistant feature spotlight
  3. Day 7: `data_insight` - Data insight about NYC schools
  4. Day 14: `upgrade_nudge` - Soft Season Pass upgrade nudge
- **Targeting Rules**: Only sends to FREE users (skips anyone with paid subscription), respects `emailUnsubscribed` flag
- **Rate Limiting**: Minimum 24 hours between drip emails per user
- **Endpoints**:
  - `GET /api/email/unsubscribe?userId=...` - User unsubscribe page
  - `POST /api/cron/drip-campaign` - Cron trigger (requires `x-cron-secret` header)
  - `GET /api/admin/drip-campaign/status` - Check if enabled (admin only)
  - `POST /api/admin/drip-campaign/toggle` - Enable/disable campaign (admin only)
- **To Enable**: 
  1. Set `CRON_SECRET` environment variable to a strong random secret
  2. Set `drip_campaign_enabled` to 'true' in `app_settings` table
  3. Configure external cron service (e.g., cron-job.org) to call `POST /api/cron/drip-campaign` hourly with `x-cron-secret: YOUR_SECRET` header

### Server-Side Caching (`server/cache.ts`)
Centralized in-memory caching with configurable TTLs and mutation protection:
- **TTL Tiers**: SHORT (1 min) for premium/subscription status, DEFAULT (5 min) for dynamic data, LONG (10 min) for static school/center data
- **Mutation Protection**: Uses `structuredClone` on both read and write to prevent cached objects from being modified
- **Automatic Cleanup**: Expired entries are cleaned every 5 minutes
- **Webhook Invalidation**: `invalidateUserCaches(userId)` is called from webhookHandlers.ts after subscription changes to ensure immediate premium status updates
- **Cached Endpoints**: Individual schools, school history, admissions data, NYCEEC centers, subscription status, premium user checks, school trends, district/citywide averages

### Shareable Comparison URLs
SEO-optimized comparison page with friendly slugs and dynamic meta tags:
- **URL Format**: `/compare/PS006-M-vs-PS290-M` - School type + 3-digit number + borough letter
- **Borough Codes**: M=Manhattan, X=Bronx, K=Brooklyn, Q=Queens, R=Staten Island  
- **API Endpoint**: `GET /api/schools/by-slugs?slugs=PS006-M,PS290-M` - Supports both friendly slugs and legacy DBN format
- **Dynamic SEO**: Title, description, keywords, and Open Graph meta tags update based on compared schools
- **URL Updates**: Uses `window.history.replaceState()` for instant URL updates when schools change
- **Free Preview**: Basic comparison (names, scores, grades) visible to all; detailed metrics premium-gated
- **Neighborhood Seeding**: 25 pre-generated comparison URLs in `shared/neighborhoodComparisons.ts` for sitemap indexing
- **Comparison Summary**: Single-sentence summary analyzing all 2-4 selected schools. Counts category wins per school (Overall Score, ELA, Math, Climate, Progress) and generates natural language like "PS 321 leads in 3 of 5 categories, including Overall Score and Math." Handles ties and close matches gracefully.

### Core Web Vitals Optimizations
Performance optimizations for better LCP, INP, and FCP scores:
- **Lazy Loading**: Heavy pages (Home, SchoolDetail, ComparePage, BlogPage, BlogPostPage, PricingPage, etc.) are lazy-loaded with React.lazy() and Suspense
- **React.memo**: SchoolCard component is wrapped in memo() to reduce unnecessary re-renders during filtering
- **Deferred Analytics**: Google Analytics script is deferred and moved to end of body to not block rendering
- **Font Optimization**: Google Fonts loaded with media="print" onload trick and font-display: swap
- **Static Asset Caching**: Production server configured with aggressive cache headers (1 year for hashed JS/CSS with immutable, 30 days for images/fonts, no-cache for HTML)

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
- **Resend**: Email service for password reset and welcome emails (via RESEND_API_KEY and RESEND_FROM_EMAIL environment variables).
- **NYSED State Report Card Database**: Official ELA/Math test score data.
- **NYC DOE InfoHub LL72 Reports**: K/3K/Pre-K admissions data (applications, offers, seats) via Local Law 72 reports.