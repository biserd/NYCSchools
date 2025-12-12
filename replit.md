# NYC School Ratings

## Overview
NYC School Ratings is a parent-friendly web dashboard designed to help parents browse and compare NYC public and charter elementary schools. It provides clear, scannable data, SEO-optimized school pages, an AI chat assistant, user authentication, a favorites system, smart recommendations, and an interactive map view, all utilizing real NYC school data. The project's purpose is to empower parents with comprehensive information for informed school selection decisions. It aims to offer significant market potential by simplifying a complex decision-making process for urban families.

## User Preferences
I prefer detailed explanations. Ask before making major changes.

## System Architecture

### UI/UX Decisions
- **Design System**: Clean, modern design following `design_guidelines.md`, using Inter typeface, and a vibrant primary blue color scheme with specific success, warning, and metric indicator colors.
- **Responsiveness & Accessibility**: Optimized for all devices with ARIA labels and keyboard navigation.
- **Visual Cues**: Color-coded indicators (Emerald, Yellow, Purple/Violet, Red) for all scores and metrics, with on-screen explanations.
- **AI Assistant Prominence**: Multiple entry points and a pulsing animation on the floating AI chat button.
- **Consistent Navigation**: Shared `AppHeader` and `Footer` components.

### Technical Implementations
- **Frontend Stack**: React 18 with TypeScript, Vite, Tailwind CSS, Shadcn UI, and Wouter for routing.
- **Component Structure**: Organized into `components/` and `pages/`.
- **Data Flow & State Management**: Data from PostgreSQL, client-side score calculation, filtering, and sorting using React's `useState` and `useMemo`. `shared/schema.ts` defines data models.
- **SEO Optimization**: Comprehensive implementation with `SEOHead`, dynamic meta tags, Structured Data (Schema.org JSON-LD), dynamically generated `Sitemap.xml`, `Robots.txt`, Open Graph, Twitter Cards, and canonical URLs.
- **Geocoding**: Schools are geocoded using NYC Open Data for map visualization and school zone detection.

### Feature Specifications
- **School Data**: Comprehensive data for 1,533 NYC schools, including academic, climate, progress scores, NYC School Survey results, demographics, 3-K/Pre-K program information, and Gifted & Talented program data.
- **Filtering & Sorting**: Live search, district, grade band, early childhood, G&T, historical trend, dual language, PTA, IEP, and zip code filters, plus sorting.
- **Historical Trends**: Shows 3-5 year score changes (2018-2025) with trend badges and detailed year-over-year ELA/Math line charts.
- **Authentication**: Email/password authentication with registration, login, bcrypt hashing, PostgreSQL-backed sessions, and protected routes.
- **Favorites**: Users can save/unsave schools, view them on a dedicated page, and compare them.
- **AI Chat Assistant**: OpenAI-powered assistant (`gpt-4o-mini`) with streaming responses, school context, and conversation history. Requires authentication; all sessions stored for history and training.
- **Smart Recommendations (Find My Match)**: AI-powered questionnaire for personalized school recommendations based on grade level, location, priorities, special programs, historical trends, and class size preferences.
- **Interactive Map View**: Leaflet-based map with color-coded school markers and comprehensive filtering. Features SEO-friendly URL parameters and dynamic SEO.
- **Side-by-Side Comparison**: Compare up to 4 schools with detailed metrics.
- **District Comparison**: Compares schools to district averages.
- **Parent Reviews & Ratings**: Users can rate schools (1-5 stars) and write reviews.
- **Commute Time Calculator (Auth-Gated)**: Calculates transit times and distances using Google Maps APIs for authenticated users only, minimizing API costs.
- **Subscription & Pricing (Stripe)**: Freemium model with Free and Premium tiers ($4.99/month or $47.88/year with 20% discount). `stripe-replit-sync` manages Stripe schema, webhook handling, and a customer portal.
- **Conversion Optimization**: 
  - Redesigned pricing page with outcome-focused messaging ("Find your child's perfect school 10x faster"), testimonials, and 7-day money-back guarantee
  - Reusable `UpgradeModal` component triggered at feature limits (favorites, comparisons, AI chat)
  - Premium feature teasers with locked badges for historical trends and commute calculator
  - All upgrade prompts gated behind `subscriptionFetched` check to prevent premium users seeing upsell during loading
- **Legal Pages**: Dedicated Privacy Policy and Terms of Service pages.
- **Data-Driven Blog**: Blog section featuring analytical articles about NYC school data with interactive Recharts visualizations. Includes COVID Recovery analysis (2025) showing citywide trends, district recovery rankings, and top improved schools.
- **3-K/Pre-K Lottery Simulator**: Monte Carlo simulation tool for understanding NYC's school lottery odds.
- **Special Education (IEP) Support**: Features IEP filtering, badges on school cards, and dedicated informational sections on school detail pages.
- **Official School Zone Detection**: Identifies a user's zoned school using NYC DOE official zone boundaries and `turf.js` for point-in-polygon matching.
- **NYCEEC Early Childhood Centers**: Comprehensive browsing for NYC Early Education Centers with filtering, statistics dashboard, map integration, and detail pages. AI-generated insights are available for centers.

### School Scoring Methodology
The **Overall Score** is calculated as: `Test Proficiency (40%) + Climate Score (30%) + Progress Score (30%)`. Scores are color-coded for quick interpretation.

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM.
- **API Endpoints**: Dedicated API for data fetching and AI integration.
- **Error Handling**: Graceful degradation and user-friendly messages.
- **Performance Optimizations**: Load More pagination, search debounce, server-side caching, Gzip compression, code-splitting, stable query keys, and localStorage synchronization.
- **Cost Optimizations**: Auth-gated commute feature and `authLoading` guard.

## External Dependencies
- **PostgreSQL**: Primary database.
- **OpenAI**: AI chat assistant and smart recommendations (`gpt-4o-mini`).
- **Replit Auth**: User authentication and session management.
- **Leaflet**: Interactive maps.
- **NYC School Survey Data**: CSV data for school survey results.
- **NYC Open Data (School Point Locations)**: Geocoding.
- **NYC Open Data (School Zone Boundaries)**: Official DOE zone polygons.
- **turf.js**: Geographic point-in-polygon matching.
- **Google Maps APIs**: Geocoding API and Distance Matrix API.
- **NYC Open Data (NYCEEC)**: Early childhood center data.
- **Stripe**: Payment processing and subscription management via `stripe-replit-sync`.
- **NYSED State Report Card Database**: Official ELA/Math test score data (see Data Update section).

## Data Update Process

### NYSED Test Score Updates
ELA and Math proficiency scores come from the NYS Education Department's State Report Card (SRC) database.

**Data Source**: https://data.nysed.gov/files/essa/24-25/SRC2025.zip
**Current Release**: SRC2025 (December 3, 2024)
**Years Available**: 2018, 2019, 2022, 2023, 2024, 2025 (2020-2021 missing due to COVID test cancellations)

**Update Script**: `server/scripts/updateNYSEDScores.ts`
```bash
# Download and extract NYSED data
curl -o /tmp/SRC2025.zip https://data.nysed.gov/files/essa/24-25/SRC2025.zip
unzip /tmp/SRC2025.zip -d /tmp/nysed

# Export CSV from Access database (requires mdbtools)
mdb-export /tmp/nysed/SRC2025.accdb ASSESSMENT_ELA > /tmp/nysed/ela_all.csv
mdb-export /tmp/nysed/SRC2025.accdb ASSESSMENT_MATH > /tmp/nysed/math_all.csv

# Run update script
npx tsx server/scripts/updateNYSEDScores.ts
```

**BEDS to DBN Conversion**: NYC schools use BEDS codes (e.g., 310100010015) converted to DBN format (e.g., 01M015) using borough mapping: 01=M, 02=X, 03=K, 04=Q, 05=R.

**Data Traceability**: The `data_source_release` column tracks which NYSED release each record came from (e.g., "2025-12-03").

## Stripe Configuration

### Environment Setup
- **Development (Sandbox)**: Uses Replit Stripe connector for test mode credentials
- **Production (Live)**: Uses manual secrets `STRIPE_LIVE_PUBLISHABLE_KEY` and `STRIPE_LIVE_SECRET_KEY`
- Environment detection: `REPLIT_DEPLOYMENT === '1'` determines production mode

### Products & Pricing
- **Premium Plan**: $4.99/month subscription
  - Live Product ID: `prod_TYaCOkKkQ3j6Ah`
  - Live Price ID: `price_1SbT2LRwvWaTf8xf5VAvCHPq`
  - Test Product/Price: Managed via Replit Stripe connector (Sandbox)

### Key Files
- `server/stripeClient.ts`: Credential loading with production fallback to manual keys
- `server/scripts/setupStripeProducts.ts`: Development/Sandbox product setup
- `server/scripts/setupStripeProductsLive.ts`: Production/Live product setup
- `server/stripeService.ts`: Stripe API operations (checkout, portal, customers)
- `server/webhookHandlers.ts`: Webhook processing via stripe-replit-sync