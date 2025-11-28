# NYC School Ratings

## Overview
NYC School Ratings is a parent-friendly web dashboard designed to help parents browse and compare NYC public and charter elementary schools. Built with React, TypeScript, and Shadcn UI, the application provides clear, scannable data to assist in school selection decisions. It features SEO-optimized school pages, an AI chat assistant, user authentication, a favorites system, smart recommendations, an interactive map view, and utilizes real NYC school data. The project aims to empower parents with comprehensive information to make informed choices for their children's education.

## User Preferences
I prefer detailed explanations. Ask before making major changes.

## System Architecture

### UI/UX Decisions
- **Design System**: Clean, modern design following `design_guidelines.md`, using Inter typeface, and a vibrant primary blue color scheme with specific success, warning, and metric indicator colors.
- **Responsiveness & Accessibility**: Optimized for all devices with proper ARIA labels and keyboard navigation.
- **Visual Cues**: Color-coded indicators (Emerald, Yellow, Amber, Red) for all scores and metrics. On-screen explanations for all metrics, rather than hidden tooltips.
- **AI Assistant Prominence**: Multiple entry points and a pulsing animation on the floating AI chat button.
- **Consistent Navigation**: Shared `AppHeader` and `Footer` components across all pages for consistent navigation and access to legal information.
- **Icons**: Home icon (🏠) for Economic Need Index and demographics.

### Technical Implementations
- **Frontend Stack**: React 18 with TypeScript, Vite, Tailwind CSS, Shadcn UI, and Wouter for routing.
- **Component Structure**: Organized into `components/` for reusable UI elements and `pages/` for main application views.
- **Data Flow & State Management**: Data loaded from a PostgreSQL database, with client-side score calculation, filtering, and sorting using React's `useState` and `useMemo`. `shared/schema.ts` defines data models.
- **SEO Optimization**: Comprehensive implementation with `SEOHead` component, dynamic meta tags, Structured Data (Schema.org JSON-LD), dynamically generated `Sitemap.xml`, `Robots.txt`, Open Graph, Twitter Cards, and canonical URLs.
- **Geocoding**: Schools are geocoded using NYC Open Data for map visualization.

### Feature Specifications
- **School Data**: Comprehensive data for 1,533 NYC schools, including academic, climate, and progress scores, NYC School Survey results, demographics (Economic Need Index, ELL, IEP, Race/Ethnicity Breakdown), and realistic student-teacher ratios. Includes 3-K/Pre-K program information and Gifted & Talented program data with badges and filtering.
- **Gifted & Talented Programs**: 130 schools with G&T programs (5 citywide, 125 district). Filter by "Has G&T", "Citywide G&T", or "District G&T". Citywide schools: NEST+M, Anderson School, TAG Young Scholars, Brooklyn School of Inquiry, The 30th Avenue School.
- **Filtering & Sorting**: Live search, district, grade band, early childhood, G&T, and historical trend filters, plus sorting by various metrics.
- **Historical Trends**: Shows 3-5 year score changes using real NYC DOE data (2018-2025). Trend badges on school cards indicate Improving (>5% gain, green), Declining (>5% loss, red), or Stable (within ±5%, yellow). Detail pages show year-over-year ELA/Math line charts. Filter by "Improving Schools" to find schools with upward trajectories. Data covers 1,125 schools with 6,623 historical records. COVID gap (2020-2021) is noted in charts.
- **School Display**: Responsive grid of school cards, commute times, and a detailed side panel (`SchoolDetailPanel`).
- **Authentication**: Email/password authentication with registration, login, bcrypt hashing, PostgreSQL-backed sessions, and protected routes.
- **Favorites**: Users can save/unsave schools, view them on a dedicated page, and compare them.
- **AI Chat Assistant**: OpenAI-powered assistant (`gpt-4o-mini`) with streaming responses, school context, conversation history, and smart suggestions. **Requires authentication** - unauthenticated users see a login CTA with Sign In/Create Account buttons. All chat sessions and messages are stored in the database for history and training purposes.
- **Smart Recommendations (Find My Match)**: Comprehensive AI-powered questionnaire for personalized school recommendations. Supports:
  - **Grade Level Selection**: Early Childhood (3-K/Pre-K), Elementary (K-5), Middle School (6-8), High School (9-12)
  - **Location Preferences**: Borough and district selection with smart district filtering based on borough
  - **Priority Selection**: Academics, Climate, Progress, or Balanced Excellence
  - **Special Programs**: G&T (District/Citywide), Dual Language (12+ language options), Early Childhood (3-K/Pre-K)
  - **Historical Trends**: Option to prioritize improving schools with positive score trajectories
  - **Class Size Preferences**: Small (<18:1), Medium (18-22:1), Large (>22:1)
  - Results display preference badges and matched school cards
- **Interactive Map View**: Leaflet-based map with color-coded school markers and district filtering.
- **Side-by-Side Comparison**: Compare up to 4 schools with detailed metrics and district comparison indicators.
- **District Comparison**: Shows how schools compare to district averages for key metrics with visual indicators.
- **Parent Reviews & Ratings**: Users can rate schools (1-5 stars) and write reviews.
- **Public Commute Time Calculator**: Calculates transit times and distances using Google Maps APIs, storing addresses in localStorage and database for authenticated users.
- **Legal Pages**: Dedicated Privacy Policy and Terms of Service pages.
- **Data-Driven Blog**: Blog section at `/blog` featuring analytical articles about NYC school data with interactive Recharts visualizations. First article analyzes 2023-24 DOE data with district performance charts, proficiency tier breakdowns, economic need correlation, and G&T program impact. SEO-optimized with structured data.
- **3-K/Pre-K Lottery Simulator**: Monte Carlo simulation tool at `/lottery-simulator` helping parents understand their odds in NYC's school lottery. Features:
  - Search and rank up to 12 elementary/early childhood schools in preference order
  - Set priority status per school (Sibling, Zoned, District, Borough, Citywide)
  - Realistic demand estimation based on school popularity, special programs, and estimated seat counts
  - Priority-tier processing matching NYC DOE's deferred-acceptance algorithm (siblings and zoned applicants processed first)
  - 1,000-iteration simulation with probability bars for each ranked school
  - Overall match rate, waitlist rate, and unmatched rate visualization
  - Educational explanations about how the lottery system works

### School Scoring Methodology
The **Overall Score** (transparent and data-driven) is calculated as:
```
Overall Score = Test Proficiency (40%) + Climate Score (30%) + Progress Score (30%)
```
- **Test Proficiency**: Average of ELA and Math proficiency from NYS grades 3-8 standardized tests.
- **Climate Score**: NYC DOE metric measuring school environment via NYC School Survey.
- **Progress Score**: NYC DOE metric tracking year-over-year student academic growth.
Scores are interpreted with color-coded indicators: 90+ (Green), 80-89 (Yellow), 70-79 (Amber), <70 (Red).

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM.
- **API Endpoints**: Dedicated API endpoints for data fetching and AI integration.
- **Error Handling**: Graceful degradation and user-friendly messages.
- **Performance Optimizations**: Load More pagination, search debounce, server-side caching, Gzip compression, code-splitting, stable query keys for commute times, and localStorage synchronization for authenticated users' addresses.

## External Dependencies
- **PostgreSQL**: Primary database.
- **OpenAI**: For the AI chat assistant and smart recommendations (`gpt-4o-mini`).
- **Replit Auth**: For user authentication and session management.
- **Leaflet**: JavaScript library for interactive maps.
- **NYC School Survey Data**: CSV data for school survey results.
- **NYC Open Data (School Point Locations)**: For geocoding.
- **Google Maps APIs**: Geocoding API and Distance Matrix API for commute time calculator.