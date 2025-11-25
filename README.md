# NYC School Ratings

A parent-friendly web dashboard for browsing and comparing NYC public and charter elementary schools with comprehensive ratings and detailed metrics.

## Features

- **Smart Filtering**: Search by school name, filter by district (1-32), and select grade bands (K-5, K-8)
- **Dynamic Sorting**: Sort schools by overall score, academics, climate, progress, or name
- **Overall Score Calculation**: Weighted scoring system (40% academics + 30% climate + 30% progress)
- **Detailed School View**: Click any school to see comprehensive metrics including:
  - Overall score with rating label (Outstanding/Strong/Average/Below Average)
  - Visual bar charts for academics, climate, and progress scores
  - ELA and Math proficiency percentages
  - Climate score and school environment details
  - Enrollment, grade span, and student-teacher ratio
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile devices

## Running the App

```bash
npm install
npm run dev
```

The app will be available at the URL shown in your Replit webview.

## Data Structure

### Sample Data Location

The school data is stored in `public/schools.json`. Each school entry contains:

```json
{
  "dbn": "02M123",
  "name": "PS 123 Example Elementary",
  "district": 2,
  "address": "123 Example St, New York, NY 10028",
  "grade_band": "K-5",
  "academics_score": 78,
  "climate_score": 85,
  "progress_score": 72,
  "ela_proficiency": 65,
  "math_proficiency": 70,
  "enrollment": 550,
  "student_teacher_ratio": 15.2
}
```

### Editing School Data

To modify the sample data:
1. Open `public/schools.json`
2. Add, edit, or remove school entries following the structure above
3. All scores should be between 0-100
4. The overall score is automatically calculated on the frontend

## Future: Real NYC Data Integration

To connect to real NYC DOE and NYSED data APIs:

### Option 1: NYC Open Data Portal
- **API**: [NYC Open Data - School Quality Reports](https://data.cityofnewyork.us/Education/2018-2019-School-Quality-Reports-Elementary-School/4wbp-irbx)
- **Integration Point**: `client/src/pages/home.tsx` - Replace the `useEffect` that loads `/schools.json` with an API call to NYC Open Data
- **Authentication**: Most NYC Open Data endpoints are public, but you may need an API key for higher rate limits

### Option 2: NYSED Data
- **API**: [NYSED Data Site](https://data.nysed.gov/)
- **Integration Point**: Same as above, modify the data loading logic
- **Data Mapping**: Map NYSED fields to the schema in `shared/schema.ts`

### Integration Steps

1. **Update the data loading logic** in `client/src/pages/home.tsx`:
```typescript
useEffect(() => {
  async function loadSchools() {
    try {
      // Replace this with your API endpoint
      const response = await fetch('https://data.cityofnewyork.us/resource/xxxx-xxxx.json');
      const data = await response.json();
      
      // Map API response to our schema
      const mappedSchools = data.map(apiSchool => ({
        dbn: apiSchool.dbn,
        name: apiSchool.school_name,
        district: parseInt(apiSchool.district),
        // ... map other fields
      }));
      
      setSchools(mappedSchools);
    } catch (error) {
      console.error("Failed to load schools:", error);
    }
  }
  loadSchools();
}, []);
```

2. **Add environment variables** for API keys if needed:
- Create `.env` file with `VITE_NYC_OPEN_DATA_API_KEY=your_key_here`
- Access in code: `import.meta.env.VITE_NYC_OPEN_DATA_API_KEY`

3. **Update the schema** in `shared/schema.ts` if the API provides additional fields you want to display

## Architecture

- **Frontend**: React + TypeScript with Vite
- **UI Components**: Shadcn UI + Tailwind CSS
- **State Management**: React useState and useMemo for filtering/sorting
- **Data**: Static JSON (ready for API integration)
- **Routing**: Wouter for lightweight client-side routing

## Component Structure

```
client/src/
├── components/
│   ├── FilterBar.tsx          # Search, district, grade, and sort controls
│   ├── SchoolCard.tsx         # Individual school card display
│   ├── SchoolList.tsx         # Grid of school cards with empty state
│   └── SchoolDetailPanel.tsx  # Side drawer with detailed metrics
├── pages/
│   └── home.tsx               # Main dashboard page
└── App.tsx                    # App root with routing
```

## Design System

The app follows a clean, parent-friendly design with:
- Large, readable fonts (Inter typeface)
- Color-coded score indicators (green ≥80, yellow ≥60, red <60)
- Ample white space and clear visual hierarchy
- Consistent spacing and border radius
- Subtle hover effects and transitions
- Responsive grid layouts

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Shadcn UI** - High-quality component library
- **Wouter** - Lightweight routing
- **Zod** - Runtime type validation

## Data Source Notes

The sample data in `public/schools.json` contains 25 realistic NYC school entries with:
- Varied performance scores across all metrics
- Real NYC districts (1-32)
- Authentic school names and addresses (sample data, not real addresses)
- Typical grade bands (K-5, K-8)
- Realistic enrollment numbers and student-teacher ratios

For production use, replace with live data from NYC DOE or NYSED APIs as described above.
