import { Link, useRoute } from "wouter";
import { ArrowRight, CheckCircle2, Search } from "lucide-react";
import { SCHOOL_GUIDE_BY_SLUG } from "@shared/school-guides";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import NotFound from "@/pages/not-found";
import { getSeoLandingPath, getSeoLandingsForSchoolGuide } from "@shared/seo-landings";

export default function SchoolGuidePage() {
  const [, params] = useRoute("/nyc-schools/:slug");
  const guide = params?.slug ? SCHOOL_GUIDE_BY_SLUG.get(params.slug) : undefined;

  if (!guide) return <NotFound />;

  const canonicalPath = `/nyc-schools/${guide.slug}`;
  const relatedGuides = getSeoLandingsForSchoolGuide(guide.slug);
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: guide.heading,
    description: guide.description,
    url: `https://nycschoolsratings.com${canonicalPath}`,
    isPartOf: {
      "@type": "WebSite",
      name: "NYC School Ratings",
      url: "https://nycschoolsratings.com/",
    },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title={guide.title}
        description={guide.description}
        canonicalPath={canonicalPath}
        appendSiteName={false}
      />
      <StructuredData data={schema} />
      <AppHeader />
      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-primary/10 to-background">
          <div className="mx-auto max-w-5xl px-4 py-14 text-center md:py-20">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">{guide.eyebrow}</p>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{guide.heading}</h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg text-muted-foreground">{guide.intro}</p>
            <Button asChild size="lg" className="mt-8">
              <Link href={guide.searchHref} data-testid="button-browse-guide-schools">
                <Search className="mr-2 h-5 w-5" />
                {guide.searchLabel}
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="mb-6 text-2xl font-semibold">What you can compare</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {guide.highlights.map((highlight) => (
              <Card key={highlight}>
                <CardContent className="flex items-start gap-3 p-5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p className="font-medium">{highlight}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-10 rounded-xl border bg-muted/40 p-6">
            <h2 className="text-xl font-semibold">Use ratings as a starting point</h2>
            <p className="mt-2 text-muted-foreground">
              School data can narrow a search, but it cannot determine the right fit or predict admission. Visit schools, verify current programs and admissions rules, and use official NYC Public Schools and MySchools information before applying.
            </p>
            <Link href="/safety-methodology" className="mt-4 inline-flex min-h-11 items-center font-medium text-primary hover:underline">
              See how the data is evaluated <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          {relatedGuides.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-semibold">Explore related districts, neighborhoods, and programs</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {relatedGuides.map((related) => <Button key={`${related.kind}-${related.slug}`} variant="outline" asChild><Link href={getSeoLandingPath(related)}>{related.name}</Link></Button>)}
              </div>
            </section>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
