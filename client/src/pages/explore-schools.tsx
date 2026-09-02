import { Link } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DISTRICT_LANDINGS, NEIGHBORHOOD_LANDINGS, PROGRAM_LANDINGS, getSeoLandingPath } from "@shared/seo-landings";

const groups = [
  ["By district", DISTRICT_LANDINGS],
  ["By neighborhood", NEIGHBORHOOD_LANDINGS],
  ["By program", PROGRAM_LANDINGS],
] as const;

export default function ExploreSchoolsPage() {
  return <div className="min-h-screen bg-background flex flex-col">
    <SEOHead title="Explore NYC Schools by District, Neighborhood and Program" description="Browse focused NYC school guides for all 32 districts, popular neighborhoods, and programs including dual language, Gifted & Talented, 3-K and Pre-K." canonicalPath="/explore-schools" appendSiteName={false} />
    <AppHeader />
    <main className="flex-1 container mx-auto px-4 py-10 max-w-6xl">
      <h1 className="text-4xl font-bold mb-3">Explore NYC school guides</h1>
      <p className="text-lg text-muted-foreground max-w-3xl mb-10">Start with the location or program your family cares about, then compare school ratings and details using consistent public data.</p>
      <div className="grid lg:grid-cols-3 gap-6">{groups.map(([title, items]) => <Card key={title}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><ul className="columns-2 lg:columns-1 space-y-2">{items.map((item) => <li key={item.slug}><Link className="text-primary hover:underline" href={getSeoLandingPath(item)}>{item.name}</Link></li>)}</ul></CardContent></Card>)}</div>
    </main><Footer />
  </div>;
}
