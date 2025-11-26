import { useParams, Link } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getBlogPost } from "@/lib/blog-data";
import { Calendar, Clock, ArrowLeft, Share2, TrendingUp, AlertTriangle, CheckCircle, Home } from "lucide-react";
import {
  DistrictPerformanceChart,
  ProficiencyTierChart,
  EconomicImpactChart,
  GTComparisonChart,
  KeyStatsCards,
} from "@/components/blog/DataCharts";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function DOEDataAnalysisPost() {
  return (
    <article className="prose prose-lg dark:prose-invert max-w-none">
      <p className="lead text-xl text-muted-foreground">
        We analyzed data from <strong>1,533 NYC public and charter schools</strong> to understand the current state of education quality. 
        Our findings reveal significant disparities across districts, a clear correlation between economic factors and academic performance, 
        and some surprising insights that every parent should know.
      </p>

      <KeyStatsCards />

      <h2 id="overview">The Big Picture: Academic Performance Across NYC</h2>
      
      <p>
        Looking at the 2023-24 school year data, the average NYC school has an <strong>ELA (English Language Arts) proficiency rate of 53.2%</strong> and 
        a <strong>Math proficiency rate of 52.7%</strong>. This means that roughly half of students are meeting or exceeding grade-level standards.
      </p>

      <p>
        However, these citywide averages mask enormous variation between schools. When we break down schools by proficiency level, the distribution is concerning:
      </p>

      <ProficiencyTierChart />

      <Card className="my-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Key Finding</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-0">
                Only <strong>8.5% of NYC schools</strong> (130 out of 1,533) have high ELA proficiency rates above 80%. 
                Meanwhile, <strong>52% of schools</strong> fall in the "low" category with proficiency between 40-59%.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="district-disparities">The District Divide: 30+ Point Gaps</h2>

      <p>
        One of the most striking findings is the vast performance gap between districts. The top-performing district, 
        <strong>District 26 in Queens (Bayside/Little Neck)</strong>, has an average ELA proficiency of 70.4%. 
        Meanwhile, <strong>District 9 in the Bronx</strong> averages just 41.8% — a gap of nearly 30 percentage points.
      </p>

      <DistrictPerformanceChart />

      <h3>Top Performing Districts</h3>
      <ul>
        <li><strong>District 26 (Queens):</strong> 70.4% ELA, 73.1% Math — Bayside, Douglaston, Little Neck</li>
        <li><strong>District 20 (Brooklyn):</strong> 64.6% ELA, 68.0% Math — Bay Ridge, Bensonhurst, Bath Beach</li>
        <li><strong>District 25 (Queens):</strong> 62.4% ELA, 64.6% Math — Flushing, College Point, Whitestone</li>
        <li><strong>District 2 (Manhattan):</strong> 60.9% ELA, 60.1% Math — Tribeca, Chelsea, Upper East Side</li>
      </ul>

      <h3>Lowest Performing Districts</h3>
      <ul>
        <li><strong>District 9 (Bronx):</strong> 41.8% ELA, 39.5% Math — Highbridge, Morrisania, Melrose</li>
        <li><strong>District 12 (Bronx):</strong> 43.0% ELA, 41.2% Math — Williamsbridge, Wakefield, Baychester</li>
        <li><strong>District 7 (Bronx):</strong> 46.7% ELA, 44.3% Math — South Bronx, Mott Haven, Hunts Point</li>
      </ul>

      <h2 id="economic-factors">The Economic Factor: Poverty and Performance</h2>

      <p>
        The correlation between economic need and academic performance is stark. NYC uses an <strong>Economic Need Index (ENI)</strong> 
        that measures the poverty level of each school's student population. Our analysis shows a clear inverse relationship: 
        as economic need increases, academic performance decreases.
      </p>

      <EconomicImpactChart />

      <p>
        The Bronx districts (9, 12, and 7) consistently show both the highest economic need indices (92%+) 
        and the lowest academic performance. This isn't coincidental — research consistently shows that 
        poverty affects educational outcomes through multiple pathways including:
      </p>

      <ul>
        <li>Limited access to educational resources at home</li>
        <li>Higher rates of housing and food insecurity</li>
        <li>Less access to early childhood education</li>
        <li>Higher teacher turnover in high-need schools</li>
      </ul>

      <Card className="my-6 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Home className="w-6 h-6 text-primary shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1">What This Means for Parents</h4>
              <p className="text-sm text-muted-foreground mb-0">
                When comparing schools, consider the Economic Need Index as context. A school with 50% proficiency 
                and 90% ENI may actually be outperforming expectations, while a school with 60% proficiency 
                and 40% ENI might be underperforming given its resources.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="gifted-talented">The G&T Advantage</h2>

      <p>
        Schools with Gifted & Talented programs show significantly higher proficiency rates across the board. 
        Our data shows a <strong>13 percentage point difference in ELA</strong> and a <strong>15 percentage point difference in Math</strong>.
      </p>

      <GTComparisonChart />

      <p>
        However, it's important to understand that this difference isn't necessarily because G&T programs 
        make schools better. Rather, G&T programs attract and select students who are already high-performing, 
        which naturally raises the school's average scores. This is a classic example of selection bias.
      </p>

      <h2 id="climate-scores">The Good News: School Climate</h2>

      <p>
        Despite the academic challenges, there's encouraging news about school climate. The average 
        <strong>climate score across NYC schools is 91%</strong>, indicating that most schools provide 
        a safe, supportive environment for learning.
      </p>

      <Card className="my-6 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-1">Climate Score Components</h4>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-0">
                The climate score is based on the NYC School Survey, which measures student safety, 
                teacher-student relationships, academic expectations, and parent engagement. 
                High scores here indicate that schools are doing well at creating positive learning environments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="takeaways">Key Takeaways for Parents</h2>

      <div className="not-prose my-8">
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Look Beyond Averages</h4>
                  <p className="text-sm text-muted-foreground">
                    Citywide averages hide enormous variation. Individual school performance matters more than district-level statistics.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Context Matters</h4>
                  <p className="text-sm text-muted-foreground">
                    Consider the Economic Need Index when evaluating schools. High-poverty schools face different challenges.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Climate Is Strong</h4>
                  <p className="text-sm text-muted-foreground">
                    Most NYC schools provide safe, supportive environments. Don't let academic scores alone guide your decision.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">G&T Isn't Magic</h4>
                  <p className="text-sm text-muted-foreground">
                    Higher scores in G&T schools largely reflect student selection, not necessarily better teaching.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <h2 id="methodology">About This Analysis</h2>

      <p>
        This analysis uses official NYC Department of Education data from the 2023-24 school year, including:
      </p>

      <ul>
        <li>NYS grades 3-8 ELA and Math test results</li>
        <li>NYC School Survey results for climate scores</li>
        <li>Economic Need Index from DOE student demographic data</li>
        <li>School program information including Gifted & Talented designations</li>
      </ul>

      <p>
        All data is publicly available and has been processed to calculate meaningful metrics for parent decision-making. 
        Our <strong>Overall Score</strong> formula weighs test proficiency (40%), climate score (30%), and progress score (30%) 
        to provide a balanced view of school quality.
      </p>

      <div className="mt-8 p-6 bg-muted rounded-lg not-prose">
        <h3 className="text-lg font-semibold mb-2">Explore the Data Yourself</h3>
        <p className="text-muted-foreground mb-4">
          Use our interactive tools to find and compare schools based on your priorities.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Browse All Schools</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/recommendations">Get Personalized Recommendations</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/map">View Map</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = getBlogPost(slug || "");

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEOHead title="Post Not Found - NYC School Ratings Blog" />
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Blog Post Not Found</h1>
          <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
          <Button asChild>
            <Link href="/blog">Back to Blog</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description,
    "datePublished": post.publishedAt,
    "author": {
      "@type": "Organization",
      "name": post.author
    },
    "publisher": {
      "@type": "Organization",
      "name": "NYC School Ratings",
      "url": "https://nyc-school-ratings.replit.app"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://nyc-school-ratings.replit.app/blog/${post.slug}`
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title={`${post.title} - NYC School Ratings Blog`}
        description={post.description}
        canonicalPath={`/blog/${post.slug}`}
      />
      <StructuredData data={articleSchema} />

      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/blog" data-testid="link-back-to-blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="secondary">{post.category}</Badge>
            <div className="flex items-center text-sm text-muted-foreground gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(post.publishedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </span>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="heading-blog-post">
            {post.title}
          </h1>

          <p className="text-sm text-muted-foreground">
            By {post.author}
          </p>
        </div>

        {post.slug === "2023-24-doe-data-analysis" && <DOEDataAnalysisPost />}

        <div className="border-t mt-12 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: post.title,
                  text: post.description,
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }} data-testid="button-share">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
