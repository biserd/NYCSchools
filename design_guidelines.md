# NYC Kindergarten School Finder - Design Guidelines

## Design Approach
**System-Based Approach** using principles from Material Design and modern data dashboard patterns. This is a utility-focused application where clarity, scannability, and trust are paramount for parents making important educational decisions.

## Typography System

**Font Family**: Inter or similar sans-serif via Google Fonts
- **Headers**: 
  - H1 (School Detail Panel Title): text-3xl font-bold
  - H2 (Section Headers): text-xl font-semibold
  - H3 (Metric Labels): text-base font-medium
- **Body Text**: 
  - Primary data (scores, percentages): text-base font-medium
  - Secondary info (labels): text-sm text-gray-600
  - Small metadata: text-xs text-gray-500
- **Numbers/Scores**: Use tabular-nums class for aligned numerical data

## Layout System

**Spacing Units**: Tailwind units of 2, 4, 6, and 8 for consistency
- Component padding: p-4 to p-6
- Section spacing: space-y-6
- Card gaps: gap-4
- Page margins: px-4 md:px-8

**Grid Structure**:
- Container: max-w-7xl mx-auto
- Filter bar: Full-width sticky top bar with px-6 py-4
- School list: Grid layout - grid-cols-1 lg:grid-cols-2 gap-4
- Detail panel: Slide-in drawer, w-full md:w-2/5 lg:w-1/3 max-w-2xl

## Component Library

### Filter Bar
- Sticky positioned at top with subtle shadow
- Horizontal layout on desktop, stacked on mobile
- Search input: Large (h-12), rounded-lg, with search icon
- Dropdowns: Same height as search, clear selected states
- Sort buttons: Pill-style with active state indication
- Background: white with border-b for separation

### School Cards
- Card design: Rounded-lg border with hover:shadow-md transition
- Layout: Flexible with clear visual hierarchy
- Top section: School name (font-semibold text-lg) + DBN badge (small, muted)
- Score display: Large overall score (text-4xl font-bold) with colored indicator dot (green ≥80, yellow ≥60, red <60)
- Metrics grid: 2-column grid showing ELA/Math percentages with icons
- Footer: District and student-teacher ratio in muted text
- Clickable indication: Subtle arrow icon, cursor-pointer, transform hover:scale-[1.01]

### School Detail Panel
- **Header Section**:
  - Close button (top-right, visible icon)
  - School name (text-2xl font-bold)
  - Address and district (text-sm muted)
  
- **Snapshot Card**:
  - Overall score prominent (text-5xl font-bold) with rating label
  - Simple horizontal bar chart for 3 scores (Academics, Climate, Progress)
  - Bars: h-3 rounded-full with colored fills, labels above
  
- **Metrics Sections** (use card-style dividers):
  - Section headers with icons
  - Data presented in 2-column grids
  - Percentage values large and bold
  - Labels clear and descriptive

### Visual Elements
- **Color Indicators**: 
  - Green (#10B981): Scores 80-100
  - Yellow (#F59E0B): Scores 60-79
  - Red (#EF4444): Scores <60
- **Icons**: Use Heroicons (outline style) via CDN
  - Search, filter, chart, building, users icons
  - Keep icon size consistent at w-5 h-5
- **Badges**: Small rounded-full px-3 py-1 for DBN codes and grade bands

### Empty States
- Centered message when no results
- Icon illustration (search with X)
- Helpful text: "Try adjusting your filters"
- Clear background with border

## Interactions & Behavior

- **Filter updates**: Instant, no loading states needed (client-side)
- **Card selection**: Highlight selected card with border-primary
- **Panel transitions**: Slide-in from right with backdrop overlay
- **Hover states**: Subtle shadow elevations, no dramatic transforms
- **Loading**: Skeleton cards if data takes time (future API integration)

## Responsive Breakpoints

- **Mobile** (< 768px): 
  - Single column school list
  - Stacked filter inputs
  - Full-width detail panel
- **Tablet** (768px - 1024px):
  - 2-column school list possible
  - Side panel at 50% width
- **Desktop** (> 1024px):
  - 2-column school list
  - Side panel at 33% width
  - All filters in single row

## Trust & Clarity Principles

- Always show data sources context (placeholder for "Data from NYC DOE 2024")
- Use clear, non-technical language ("Academics" not "ELA Proficiency Score")
- Show empty/missing data gracefully with "Not available" instead of errors
- Consistent metric formats (percentages with %, ratios with : notation)

This design prioritizes parent trust through clarity, consistent data presentation, and straightforward navigation—enabling confident school selection decisions.