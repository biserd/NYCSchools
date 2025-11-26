import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { Calendar, Sparkles, Bug, Wrench, Star } from "lucide-react";

interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  highlights?: string[];
  features?: string[];
  improvements?: string[];
  fixes?: string[];
}

const releaseNotes: ReleaseNote[] = [
  {
    version: "1.4.0",
    date: "November 2025",
    title: "Filter Persistence & Enrollment Details",
    highlights: [
      "Filter settings now persist when navigating between pages",
      "Enrollment data now shows breakdown by grade level (K-5, 6-8, 9-12)",
    ],
    features: [
      "URL-based filter persistence - your search, district, and filter settings are saved in the URL",
      "Shareable filtered views - copy the URL to share your exact search with others",
      "Grade-level enrollment breakdown on school detail pages",
      "Features page showcasing all app capabilities",
      "Release Notes page (you're reading it!)",
    ],
    improvements: [
      "Filters restore automatically when using browser back button",
      "School cards show enrollment by grade level for multi-level schools",
    ],
  },
  {
    version: "1.3.0",
    date: "November 2025",
    title: "Historical Trends & High School Metrics",
    highlights: [
      "3-5 year historical performance trends for 1,125 schools",
      "Comprehensive high school metrics including graduation rates",
    ],
    features: [
      "Historical trend badges on school cards (Improving, Stable, Declining)",
      "Year-over-year ELA/Math performance charts on school detail pages",
      "Filter by improving, stable, or declining schools",
      "High school graduation rates and college readiness metrics",
      "Regents exam performance data",
    ],
    improvements: [
      "Enhanced school detail page with trend visualization",
      "COVID gap (2020-2021) noted in historical charts",
    ],
  },
  {
    version: "1.2.0",
    date: "October 2025",
    title: "Gifted & Talented Programs",
    highlights: [
      "130 schools with G&T programs now identified and filterable",
      "Citywide vs District G&T program distinction",
    ],
    features: [
      "G&T program badges on school cards",
      "Filter by 'Has G&T', 'Citywide G&T', or 'District G&T'",
      "Five citywide G&T schools highlighted: NEST+M, Anderson, TAG, Brooklyn School of Inquiry, 30th Avenue School",
    ],
    improvements: [
      "Improved search to handle school number formats (PS 234, P.S.234, etc.)",
    ],
  },
  {
    version: "1.1.0",
    date: "October 2025",
    title: "AI Assistant & Smart Recommendations",
    highlights: [
      "AI-powered chat assistant for personalized guidance",
      "Smart school recommendations based on your priorities",
    ],
    features: [
      "AI Chat Assistant powered by GPT-4",
      "Streaming responses for faster interaction",
      "Chat history saved for logged-in users",
      "Smart Recommendations questionnaire",
      "Personalized school suggestions based on your answers",
    ],
    improvements: [
      "Multiple entry points to AI assistant throughout the app",
      "Pulsing animation on chat button for visibility",
    ],
  },
  {
    version: "1.0.0",
    date: "September 2025",
    title: "Initial Launch",
    highlights: [
      "Comprehensive data for 1,533 NYC public and charter schools",
      "Search, filter, and compare schools easily",
    ],
    features: [
      "School search with district and grade band filtering",
      "Overall Score calculation (Academics 40%, Climate 30%, Progress 30%)",
      "Interactive map view with color-coded markers",
      "Side-by-side school comparison (up to 4 schools)",
      "Commute time calculator using Google Maps",
      "User accounts with favorites and reviews",
      "NYC School Survey data integration",
      "Early childhood program information (3-K, Pre-K)",
      "Student demographics and Economic Need Index",
      "SEO-optimized school pages",
    ],
    improvements: [
      "Responsive design for all devices",
      "Color-coded performance indicators",
      "District comparison metrics",
    ],
  },
];

function ReleaseCard({ release }: { release: ReleaseNote }) {
  return (
    <Card className="mb-6" data-testid={`release-${release.version}`}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Badge variant="default" className="text-sm px-3 py-1">
              v{release.version}
            </Badge>
            <CardTitle className="text-xl">{release.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="w-4 h-4" />
            {release.date}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {release.highlights && release.highlights.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 text-primary font-medium">
              <Star className="w-4 h-4" />
              Highlights
            </div>
            <ul className="space-y-1">
              {release.highlights.map((highlight, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {release.features && release.features.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 font-medium">
              <Sparkles className="w-4 h-4 text-green-600" />
              New Features
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {release.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">+</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {release.improvements && release.improvements.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 font-medium">
              <Wrench className="w-4 h-4 text-blue-600" />
              Improvements
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {release.improvements.map((improvement, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">↑</span>
                  {improvement}
                </li>
              ))}
            </ul>
          </div>
        )}

        {release.fixes && release.fixes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 font-medium">
              <Bug className="w-4 h-4 text-orange-600" />
              Bug Fixes
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {release.fixes.map((fix, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">✓</span>
                  {fix}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReleaseNotesPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Release Notes - NYC School Ratings"
        description="See what's new in NYC School Ratings. Track new features, improvements, and updates to help you find the perfect NYC school."
        canonicalPath="/release-notes"
      />

      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" data-testid="heading-release-notes">
            Release Notes
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track new features, improvements, and updates to NYC School Ratings
          </p>
        </div>

        <div>
          {releaseNotes.map((release) => (
            <ReleaseCard key={release.version} release={release} />
          ))}
        </div>

        <div className="text-center py-8 border-t mt-8">
          <p className="text-muted-foreground mb-4">
            Have a feature request or found a bug?
          </p>
          <Button variant="outline" asChild data-testid="button-view-faq">
            <Link href="/faq">View FAQ</Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
