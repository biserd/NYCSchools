# NYC Kindergarten School Finder

## Overview
The NYC Kindergarten School Finder is a parent-friendly web dashboard designed to help parents browse and compare NYC public and charter elementary schools. Built with React, TypeScript, and Shadcn UI, the application provides clear, scannable data to assist in kindergarten enrollment decisions. It features SEO-optimized school pages, an AI chat assistant, user authentication, a favorites system, smart recommendations, an interactive map view, and utilizes real NYC school data. The project aims to empower parents with comprehensive information to make informed choices for their children's education.

## User Preferences
I prefer detailed explanations. Ask before making major changes.

## System Architecture

### UI/UX Decisions
- **Design System**: Clean, modern design following `design_guidelines.md`.
- **Typography**: Inter typeface for excellent readability, with a clear hierarchy for headers and body text.
- **Colors**: Enhanced vibrant primary blue (214 95% 50%) for better visual appeal, with success (142 76% 36%) and warning (38 92% 50%) colors. Color-coded metric indicators: Emerald (≥90), Yellow (80-89), Amber (70-79), and Red (<70) for all scores.
- **Spacing**: Responsive padding, comfortable card padding, and clear grid/section spacing.
- **Interactions**: Hover and active states with smooth transitions, `hover-elevate` and `active-elevate-2` for feedback, and accessible `IconButtons` for tooltips. Pulsing animation on floating AI chat button to draw attention.
- **Responsiveness**: Optimized for mobile, tablet, and desktop breakpoints.
- **Accessibility**: Proper ARIA labels and keyboard navigation.
- **Visual Cues**: Color-coded indicators on all individual metrics (ELA, Math, Climate, Progress) and overall score. Score legend displayed directly on school detail pages.
- **On-Screen Explanations**: All metric explanations are displayed directly on screen rather than hidden in tooltips, improving accessibility and transparency. This includes academic metrics, survey results, demographics, and district comparisons.
- **AI Assistant Prominence**: Multiple entry points including header button, homepage banner, school detail page banner, and pulsing floating button for maximum visibility.
- **Footer**: Consistent footer component across all pages (home, favorites, map, compare, settings, recommendations, school-detail, privacy, terms, faq) with links to FAQ, Privacy Policy, and Terms of Service.
- **Icons**: Home icon (🏠) used to represent Economic Need Index and demographics, replacing previous dollar sign icon for better semantic meaning.

### Technical Implementations
- **Frontend Stack**: React 18 with TypeScript, Vite, Tailwind CSS, Shadcn UI, and Wouter for routing.
- **Component Structure**: Organized into `components/` for reusable UI elements (e.g., `FilterBar`, `SchoolCard`, `SchoolDetailPanel`, `ChatBot`, `SEOHead`, `StructuredData`) and `pages/` for main application views (e.g., `home`, `school-detail`, `favorites`, `map`, `recommendations`).
- **Data Flow**: Initial data loaded from `public/schools.json` (now primarily database-driven), with client-side score calculation, filtering, and sorting using React state and `useMemo`.
- **State Management**: Primarily uses React's `useState` and `useMemo` for efficient client-side state handling.
- **Data Model**: `shared/schema.ts` defines school types and score calculation utilities.
- **SEO Optimization**: Comprehensive SEO implementation for maximum search visibility:
  - **SEOHead Component**: Reusable component managing meta tags, Open Graph, Twitter Cards, and canonical URLs across all pages
  - **Dynamic Meta Tags**: Page-specific titles, descriptions, and keywords for all routes (home, map, favorites, compare, recommendations, FAQ, privacy, terms, school-detail)
  - **Structured Data (Schema.org JSON-LD)**:
    - **Homepage**: Organization and WebSite schemas with site search markup
    - **School Pages**: EducationalOrganization schema with school details, address, coordinates, grade ranges, and enrollment data
    - **FAQ Page**: FAQPage schema marking up all questions and answers for rich search results
  - **Sitemap.xml**: Dynamically generated from database with all 1,509 school pages plus static pages, with proper priority and changefreq values
  - **Robots.txt**: Search engine directives with sitemap reference
  - **Social Sharing**: Open Graph and Twitter Card tags for rich link previews on social media
  - **Canonical URLs**: Prevent duplicate content issues across all pages
- **Geocoding**: Schools are geocoded using NYC Open Data for map visualization.

### Feature Specifications
- **School Data**: Comprehensive data for 1,509 NYC 5-borough schools, including academic, climate, and progress scores, NYC School Survey results, comprehensive demographics, and realistic student-teacher ratios.
  - **Data Years**: Test scores and demographics from 2021-22 to 2022-23 academic years; Climate/Progress scores from 2023-2024
  - **Student-Teacher Ratios**: Deterministically generated based on school DBN (ID) for stability, ranging from 10:1 to 20:1 with an average of 14:1. Ratios are displayed as whole numbers and vary by grade band, with elementary schools averaging lower ratios than high schools, reflecting realistic NYC school characteristics.
  - **Demographics Data**: Complete student demographics from NYC Open Data Portal (dataset c7ru-d68s) including:
    - **Economic Need Index (ENI)**: Percentage of students facing economic hardship, with comprehensive tooltip explaining temporary housing, poverty metrics, SNAP/TANF eligibility, and funding implications. Displayed in comparison table and school detail views.
    - **English Language Learners (ELL)**: Percentage of students receiving English language instruction
    - **Students with IEPs**: Percentage of students with Individualized Education Programs
    - **Race/Ethnicity Breakdown**: Complete diversity metrics showing percentage of Asian, Black, Hispanic/Latino, White, and Multi-Racial students
    - All demographic metrics include detailed, parent-friendly tooltips and are displayed in dedicated "Student Demographics" cards on both SchoolDetailPanel (homepage sidebar) and school-detail pages
- **Filtering & Sorting**: Live search, district, grade band filters, and sorting by various metrics (Overall Score, Academics, Climate, Progress, Name).
- **School Display**: Responsive grid of school cards with commute times, and a detailed side panel (`SchoolDetailPanel`) with charts and full metrics.
- **Authentication**: Replit Auth integration for secure login/logout and session management.
- **Favorites**: Users can save/unsave schools, view them on a dedicated `/favorites` page, and compare them.
- **AI Chat Assistant**: Prominently featured OpenAI-powered assistant (`gpt-4o-mini`) with streaming responses, school context, conversation history, and smart suggestions. Accessible via:
  - Prominent "Ask AI Assistant" button in homepage header
  - Featured banner on homepage with AI assistant promotion
  - Banner on individual school detail pages
  - Pulsing floating chat button (bottom-right) on all pages
- **Smart Recommendations**: AI-powered questionnaire (priority, district, class size) for personalized school recommendations.
- **Interactive Map View**: Leaflet-based map with color-coded school markers, popups, and district filtering.
- **Side-by-Side Comparison**: Compare up to 4 schools with detailed metrics, stored in localStorage with persistent state. Includes district comparison indicators showing how each school compares to its district average for ELA, Math, Climate, and Progress scores.
- **District Comparison**: Shows how schools compare to their district averages across key metrics:
  - School detail pages display district comparison badges and a dedicated comparison stats grid
  - Compare page shows inline comparison indicators with arrows (↑ above, ↓ below) and difference values
  - Color-coded: green for above average, yellow for at average (within 2 points), red for below average
  - Tooltips show exact school value and district average
  - API endpoints: `/api/districts/averages` (all districts), `/api/districts/citywide` (citywide averages), `/api/districts/:district/averages` (specific district)
  - 5-minute server-side cache for optimal performance
- **Parent Reviews & Ratings**: Users can rate schools (1-5 stars) and write reviews, with one review per user per school.
- **Public Commute Time Calculator**: All users (no authentication required) can set home address and see transit times and distances to schools using Google Maps APIs. Address stored in localStorage for all users (synced for authenticated users to ensure consistency), with coordinates cached for optimal performance. Graceful error handling with fallback displays.
- **Legal Pages**: Privacy Policy (`/privacy`) and Terms of Service (`/terms`) pages with comprehensive legal content.

### School Scoring Methodology
The Overall Score provides a transparent, data-driven metric combining test proficiency with NYC DOE quality indicators:

**Overall Score Formula:**
```
Overall Score = Test Proficiency (40%) + Climate Score (30%) + Progress Score (30%)
```

**Components Explained:**
- **Test Proficiency (40% weight)**: Average of ELA and Math proficiency percentages from NYS grades 3-8 standardized tests. Represents the percentage of students meeting or exceeding state standards.
  - Real data for 745+ elementary/middle schools (48.6% coverage)
  - High schools and schools without grades 3-8 show 50% (placeholder) as they don't administer these tests
- **Climate Score (30% weight)**: NYC DOE metric measuring school environment via NYC School Survey (students, teachers, parents). Includes rigorous instruction, collaborative teachers, supportive environment, family-community ties, and trust.
- **Progress Score (30% weight)**: NYC DOE metric tracking year-over-year student academic growth and improvement. Measures how effectively schools help students advance, regardless of starting point.

**Score Interpretation:**
- **90+ (Green)**: Outstanding - Exceeds expectations
- **80-89 (Yellow)**: Strong - Strong performance
- **70-79 (Amber)**: Average - Meets expectations
- **Below 70 (Red)**: Needs improvement

**Visual Indicators:**
All scores (Overall, ELA, Math, Climate, Progress) display color-coded indicators to help parents quickly identify school strengths and areas of concern:
- Green dots indicate outstanding performance (90+)
- Yellow dots indicate strong performance (80-89)
- Amber dots indicate average performance (70-79)
- Red dots indicate areas needing improvement (<70)

**Data Sources:**
- ELA/Math proficiency: NYC Open Data (grades 3-8 state test results)
- Climate/Progress scores: NYC Department of Education School Survey and Quality Reports
- Survey data: Annual feedback from students, teachers, and parents

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM for persistence of user data, sessions, schools, and favorites.
- **Data Source**: Initial data from `public/schools.json` has been replaced by a PostgreSQL database populated from NYC School Survey CSV and NYC Open Data.
- **API Endpoints**: Dedicated API endpoints (e.g., `/api/schools/:dbn`, `/api/chat`) for data fetching and AI integration.
- **Error Handling**: Graceful degradation and user-friendly error messages for AI responses and missing data.
- **Performance Optimizations**: 
  - Load More pagination (20 schools initially) to reduce initial render time
  - 300ms search debounce for efficient filtering
  - Server-side caching with 5-minute TTL for school data
  - Gzip compression for API responses
  - Code-split Map and Recommendations pages with React.lazy/Suspense
  - CommuteTime components use stable query keys (individual lat/lng values) to prevent render storms
  - 30-minute staleTime for commute queries to reduce API calls
  - Graceful error handling that returns error objects instead of throwing exceptions
  - Event-driven architecture with `addressChanged` custom events for reactive coordinate updates
- **LocalStorage Synchronization**: Authenticated users have their address synced to both database and localStorage to ensure CommuteTime components can access coordinates immediately without additional API calls.

## External Dependencies
- **PostgreSQL**: Primary database for application data.
- **OpenAI**: Integrated via Replit AI Integrations for the chat assistant and smart recommendations (uses `gpt-4o-mini`).
- **Replit Auth**: For user authentication and session management.
- **Leaflet**: JavaScript library for interactive maps.
- **NYC School Survey Data**: CSV data used for populating school survey results.
- **NYC Open Data (School Point Locations)**: Used for geocoding school locations for the map view.
- **Google Maps APIs**: Requires Geocoding API and Distance Matrix API to be enabled in Google Cloud Console for commute time calculator.