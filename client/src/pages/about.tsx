import { Link } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";

export default function AboutPage() {
  return <div className="min-h-screen bg-background flex flex-col"><SEOHead title="About NYC School Ratings" description="Why NYC School Ratings exists, how it helps families compare schools, and our commitment to transparent public data." canonicalPath="/about" appendSiteName={false} /><AppHeader /><main className="flex-1 container mx-auto px-4 py-10 max-w-3xl prose dark:prose-invert">
    <h1>About NYC School Ratings</h1>
    <p>NYC school information is spread across many reports, tools, and admissions pages. NYC School Ratings brings that public information together so families can build a shortlist, compare tradeoffs, and know what to verify next.</p>
    <h2>What we believe</h2>
    <p>No single score can define a school. Academic results, progress, climate, programs, commute, admissions fit, and a child’s individual needs all matter. Our job is to make the evidence easier to understand without hiding the methodology or its limitations.</p>
    <h2>Independence and transparency</h2>
    <p>NYC School Ratings is an independent product and is not affiliated with NYC Public Schools or NYSED. We identify the official sources used, publish our rating formula, distinguish reported facts from guidance, and provide a correction channel.</p>
    <p>Learn <Link href="/methodology">how ratings are calculated</Link>, browse <Link href="/explore-schools">school guides</Link>, or <Link href="/contact">contact us</Link>.</p>
  </main><Footer /></div>;
}
