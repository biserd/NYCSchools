import { useQuery } from "@tanstack/react-query";
import { LandingDecisionContent } from '@shared/LandingDecisionContent';
import { KinderLearnerResourceLink } from '@shared/KinderLearnerResourceLink';
import { Link, useParams } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { SchoolCard } from "@/components/SchoolCard";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type School } from "@shared/schema";
import { calculateOverallScore } from "@shared/school-utils";
import { getRelatedSeoLandings, getSeoLanding, getSeoLandingPath, matchesSeoLanding, type SeoLandingKind } from "@shared/seo-landings";

export default function SeoLandingPage({ kind }: { kind: SeoLandingKind }) {
  const { slug = "" } = useParams<{ slug: string }>();
  const landing = getSeoLanding(kind, slug);
  const { data: schools = [], isLoading, isError } = useQuery<School[]>({ queryKey: ["/api/schools"] });
  const matches = landing
    ? schools.filter((school) => matchesSeoLanding(school, landing)).sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const related = landing ? getRelatedSeoLandings(landing, schools) : [];

  if (!landing) return <div className="p-10">Guide not found.</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title={landing.title} description={landing.description} canonicalPath={getSeoLandingPath(landing)} appendSiteName={false} />
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <nav className="text-sm text-muted-foreground mb-6"><Link href="/explore-schools">School guides</Link> / {landing.name}</nav>
        <header className="max-w-3xl mb-8">
          <p className="text-sm font-medium text-primary uppercase tracking-wide">NYC school guide</p>
          <h1 className="text-3xl md:text-5xl font-bold mt-2 mb-4">{landing.title}</h1>
          <p className="text-lg text-muted-foreground">{landing.intro}</p>
        </header>
        <section className="rounded-lg border bg-muted/30 p-4 mb-8 text-sm">
          <strong>How to use this guide:</strong> The complete directory below is alphabetical, not a cross-age ranking. Compare schools within the same stage and dated measures. Data comes from NYSED and NYC Public Schools; verify programs, admission rules and zones with official sources. <Link className="text-primary underline" href="/methodology">Read the methodology</Link>.
        </section>
        {kind === 'program' && (slug === 'prek' || slug === '3k') && <KinderLearnerResourceLink/>}
        <LandingDecisionContent landing={landing} schools={matches} ready={!isLoading && !isError} />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-2xl font-semibold">{isLoading ? "Loading schools…" : `${matches.length} matching schools`}</h2>
          <div className="flex gap-2"><Button asChild variant="outline"><Link href="/compare">Compare</Link></Button><Button asChild><Link href="/recommendations">Find my match</Link></Button></div>
        </div>
        {isLoading && <div className="grid md:grid-cols-2 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>}
        {isError && <p className="rounded-lg border border-destructive p-6">Schools could not be loaded. Please try again.</p>}
        {!isLoading && !isError && <div className="grid md:grid-cols-2 gap-4">{matches.map((school) => <SchoolCard key={school.dbn} school={school} />)}</div>}
        <section className="mt-12 border-t pt-8">
          <h2 className="text-xl font-semibold mb-2">Explore related NYC school guides</h2>
          <p className="text-sm text-muted-foreground mb-4">These guides share districts, neighborhoods, programs, or schools with this collection.</p>
          <div className="flex flex-wrap gap-2">{related.map((item) => <Button asChild key={`${item.kind}-${item.slug}`} variant="outline" size="sm"><Link href={getSeoLandingPath(item)}>{item.name}</Link></Button>)}</div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
