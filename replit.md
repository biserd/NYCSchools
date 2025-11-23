# NYC Kindergarten School Finder

## Overview
The NYC Kindergarten School Finder is a parent-friendly web dashboard designed to help parents browse and compare NYC public and charter elementary schools. Built with React, TypeScript, and Shadcn UI, the application provides clear, scannable data to assist in kindergarten enrollment decisions. It features SEO-optimized school pages, an AI chat assistant, user authentication, a favorites system, smart recommendations, an interactive map view, and utilizes real NYC school data. The project aims to empower parents with comprehensive information to make informed choices for their children's education.

## User Preferences
I prefer detailed explanations. Ask before making major changes.

## System Architecture

### UI/UX Decisions
- **Design System**: Clean, modern design following `design_guidelines.md`.
- **Typography**: Inter typeface for excellent readability, with a clear hierarchy for headers and body text.
- **Colors**: Primary blue for trust, with Emerald (≥80), Amber (≥60), and Red (<60) for score indicators. Consistent foreground/muted-foreground for text.
- **Spacing**: Responsive padding, comfortable card padding, and clear grid/section spacing.
- **Interactions**: Hover and active states with smooth transitions, `hover-elevate` and `active-elevate-2` for feedback, and accessible `IconButtons` for tooltips.
- **Responsiveness**: Optimized for mobile, tablet, and desktop breakpoints.
- **Accessibility**: Proper ARIA labels and keyboard navigation.
- **Visual Cues**: Comprehensive tooltips for all metrics on school cards and detail panels.

### Technical Implementations
- **Frontend Stack**: React 18 with TypeScript, Vite, Tailwind CSS, Shadcn UI, and Wouter for routing.
- **Component Structure**: Organized into `components/` for reusable UI elements (e.g., `FilterBar`, `SchoolCard`, `SchoolDetailPanel`, `ChatBot`) and `pages/` for main application views (e.g., `home`, `school-detail`, `favorites`, `map`, `recommendations`).
- **Data Flow**: Initial data loaded from `public/schools.json` (now primarily database-driven), with client-side score calculation, filtering, and sorting using React state and `useMemo`.
- **State Management**: Primarily uses React's `useState` and `useMemo` for efficient client-side state handling.
- **Data Model**: `shared/schema.ts` defines school types and score calculation utilities.
- **SEO**: Individual school pages (`/school/:dbn`) with dynamic meta tags for improved search engine indexing and shareability.
- **Geocoding**: Schools are geocoded using NYC Open Data for map visualization.

### Feature Specifications
- **School Data**: Comprehensive data for 1,533 NYC 5-borough schools, including academic, climate, and progress scores, and NYC School Survey results.
- **Filtering & Sorting**: Live search, district, grade band filters, and sorting by various metrics (Overall Score, Academics, Climate, Progress, Name).
- **School Display**: Responsive grid of school cards and a detailed side panel (`SchoolDetailPanel`) with charts and full metrics.
- **Authentication**: Replit Auth integration for secure login/logout and session management.
- **Favorites**: Users can save/unsave schools, view them on a dedicated `/favorites` page, and compare them.
- **AI Chat Assistant**: OpenAI-powered assistant (`gpt-4o-mini`) with streaming responses, school context, conversation history, and smart suggestions.
- **Smart Recommendations**: AI-powered questionnaire (priority, district, class size) for personalized school recommendations.
- **Interactive Map View**: Leaflet-based map with color-coded school markers, popups, and district filtering.
- **Side-by-Side Comparison**: Compare up to 4 schools with detailed metrics, stored in localStorage with persistent state.
- **Parent Reviews & Ratings**: Users can rate schools (1-5 stars) and write reviews, with one review per user per school.
- **Public Commute Time Calculator**: All users (no authentication required) can set home address and see transit times and distances to schools using Google Maps APIs. Address stored in localStorage for non-authenticated users, database for authenticated users.

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM for persistence of user data, sessions, schools, and favorites.
- **Data Source**: Initial data from `public/schools.json` has been replaced by a PostgreSQL database populated from NYC School Survey CSV and NYC Open Data.
- **API Endpoints**: Dedicated API endpoints (e.g., `/api/schools/:dbn`, `/api/chat`) for data fetching and AI integration.
- **Error Handling**: Graceful degradation and user-friendly error messages for AI responses and missing data.

## External Dependencies
- **PostgreSQL**: Primary database for application data.
- **OpenAI**: Integrated via Replit AI Integrations for the chat assistant and smart recommendations (uses `gpt-4o-mini`).
- **Replit Auth**: For user authentication and session management.
- **Leaflet**: JavaScript library for interactive maps.
- **NYC School Survey Data**: CSV data used for populating school survey results.
- **NYC Open Data (School Point Locations)**: Used for geocoding school locations for the map view.
- **Google Maps APIs**: Requires Geocoding API and Distance Matrix API to be enabled in Google Cloud Console for commute time calculator.