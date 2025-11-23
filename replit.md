# NYC Kindergarten School Finder

## Project Overview
A parent-friendly web dashboard for browsing and comparing NYC public and charter elementary schools. Built with React, TypeScript, and Shadcn UI, this application helps parents make informed decisions about kindergarten enrollment by providing clear, scannable data about schools across all NYC districts.

## Current State (November 23, 2025)
**Status**: Database-backed application with authentication, favorites, and real NYC school data integration

### Completed Features
1. **Data Model & Sample Data**
   - Defined school schema in `shared/schema.ts` with TypeScript types
   - Created 25 realistic NYC school entries in `public/schools.json`
   - Overall score calculation: 40% academics + 30% climate + 30% progress
   - Score color indicators (green ≥80, yellow ≥60, red <60)

2. **Filter System**
   - Live search by school name or DBN code
   - District filter (All Districts or specific district 1-32)
   - Grade band filter (All, K-5, K-8)
   - Sort options: Overall Score, Academics, Climate, Progress, Name A-Z
   - All filters work together with client-side performance

3. **School List Display**
   - Responsive grid layout (1 column mobile, 2 columns desktop)
   - School cards showing: name, DBN, overall score with color dot, ELA/Math proficiency, district, student-teacher ratio
   - Hover effects and click interactions
   - Empty state with helpful message when no results

4. **School Detail Panel**
   - Side drawer (Sheet component) with comprehensive school information
   - Overall snapshot with score label (Outstanding/Strong/Average/Below Average)
   - Bar charts for academics, climate, and progress scores
   - Academics section with ELA and Math proficiency percentages
   - Climate score with description
   - School details: enrollment, grade span, student-teacher ratio
   - Smooth open/close animations

5. **Design & UX**
   - Clean, modern design following design_guidelines.md
   - Inter typeface for excellent readability
   - Consistent spacing using Tailwind utilities
   - Responsive breakpoints for mobile, tablet, desktop
   - Accessible with proper ARIA labels and keyboard navigation
   - Loading skeletons for initial data fetch

## Architecture

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for utility-first styling
- **Shadcn UI** for high-quality components
- **Wouter** for lightweight routing

### Component Structure
```
client/src/
├── components/
│   ├── FilterBar.tsx          # Search, filters, and sort controls
│   ├── SchoolCard.tsx         # Individual school card
│   ├── SchoolList.tsx         # Grid of schools with empty state
│   └── SchoolDetailPanel.tsx  # Detailed school view (Sheet)
├── pages/
│   ├── home.tsx               # Main dashboard with state management
│   └── not-found.tsx          # 404 page
└── App.tsx                    # Root with routing setup
```

### Data Flow
1. Home page loads `public/schools.json` on mount
2. Calculates overall score for each school (client-side)
3. Filters applied via React state (searchQuery, selectedDistrict, selectedGradeBand)
4. Sorting applied via useMemo for performance
5. Clicking a school opens detail panel with full metrics

### State Management
- All state managed with React useState
- useMemo for efficient filtering and sorting
- No external state library needed (client-side only, no API)

## Key Files

### Data & Types
- `shared/schema.ts` - School type definition, validation, score calculation utilities
- `public/schools.json` - 25 sample NYC schools with realistic data

### Components
- `FilterBar.tsx` - Filter and sort controls with full interactivity
- `SchoolCard.tsx` - Card display with score visualization
- `SchoolList.tsx` - Grid layout with responsive design
- `SchoolDetailPanel.tsx` - Comprehensive school detail view
- `home.tsx` - Main page with data loading and state management

### Configuration
- `client/index.html` - Updated with SEO meta tags and Inter font
- `client/src/index.css` - Design tokens (updated to use Inter font)
- `tailwind.config.ts` - Tailwind configuration with Shadcn colors
- `design_guidelines.md` - Complete design system documentation

## Design System

### Typography
- Font: Inter (modern, highly readable sans-serif)
- Headers: text-3xl/4xl for page titles, text-xl/2xl for sections
- Body: text-base for primary content, text-sm for secondary info
- Tabular numbers for all scores and metrics

### Colors
- Primary blue: hsl(210 85% 42%) - trust and authority
- Score indicators: Emerald (≥80), Amber (≥60), Red (<60)
- Muted backgrounds for card sections
- Consistent use of foreground/muted-foreground for text hierarchy

### Spacing
- Container: max-w-7xl with responsive padding
- Card padding: p-6 for comfortable whitespace
- Grid gap: gap-4 for visual separation
- Section spacing: space-y-6 for clear hierarchy

### Interactions
- Hover effects: hover-elevate for subtle elevation
- Active states: active-elevate-2 for press feedback
- Smooth transitions on all interactive elements
- Cursor pointer for clickable cards

## Running the Application

```bash
npm install
npm run dev
```

The workflow "Start application" runs `npm run dev` which starts both the Express backend (minimal, just serving static files) and Vite frontend on the same port.

## Completed Features (Latest Sprint)

### Database & Persistence ✅
- PostgreSQL database integration with Drizzle ORM
- Database tables: users, sessions, schools, favorites
- Extended schema with 18 new fields: survey scores, economic need index, attendance rates, quality ratings
- Database contains 26 NYC schools (original 25 from schools.json + PS 158 Bayard Taylor added on request)
- User data and favorites persisted in database

### User Authentication ✅
- Replit Auth integration (OpenID Connect)
- Login/logout functionality
- Session management with PostgreSQL session store (auto-creates sessions table)
- Session cookies: secure flag only in production (allows development testing)
- User profile display with avatar and name
- Protected API endpoints requiring authentication

### Favorites & Comparison ✅
- Save/unsave favorite schools (persisted to database)
- Favorite button on each school card
- Dedicated /favorites page for viewing saved schools
- Side-by-side comparison of favorite schools
- Visual indicator (filled heart) for favorited schools

### Real Data Integration ✅
- **CSV Survey Parser**: Parses NYC School Survey data (1,816 schools) with student, teacher, and parent feedback scores
- **NYC DOE Snapshot Scraper**: Fetches additional school metrics from tools.nycenet.edu/snapshot (test scores, demographics, attendance, quality ratings)
- **Data Sync Service**: Combines both sources to enrich school records
  - Successfully synced 26 schools in database
  - 12 schools with survey + snapshot data (including PS 158 Bayard Taylor)
  - 14 schools with snapshot data only
- **On-Demand School Addition**: Can add individual schools from the 1,816-school CSV dataset on request
- **Enhanced UI**: SchoolDetailPanel displays NYC School Survey Results with three sections:
  - Student Voice (safety, teacher trust, engagement)
  - Teacher Perspective (instruction quality, collaboration, leadership)
  - Parent Feedback (satisfaction, communication, school trust)
- **Robust Data Handling**: 
  - Gracefully handles missing data (null-safe conditionals)
  - Supports legitimate zero values
  - Conditionally renders survey sections based on data availability

## In Progress / Next Features

### Real Data Integration (Planned)
- Connect to NYC Open Data API for live school data
- Integrate NYSED data for additional metrics
- Add data refresh mechanism

### Map View (Planned)
- Add map component showing school locations
- Geocode school addresses
- Calculate commute times from home address

### PDF Export (Planned)
- Export filtered school lists to PDF
- Export comparison reports

### Enhanced Features (Future)
- Historical trend data for scores
- Parent reviews and ratings
- Application deadline tracking

## Notes
- No backend persistence needed (static JSON data)
- All filtering/sorting happens client-side for instant performance
- Ready for API integration - just replace data loading in home.tsx
- Sample data mimics real NYC DOE structure for easy migration
