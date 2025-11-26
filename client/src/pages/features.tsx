import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import {
  Search,
  Map,
  MessageCircle,
  Heart,
  BarChart3,
  Users,
  Clock,
  Filter,
  TrendingUp,
  GraduationCap,
  Star,
  Sparkles,
  GitCompare,
  Bell,
  Download,
} from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
}

function FeatureCard({ icon, title, description, badge, badgeVariant = "secondary" }: FeatureCardProps) {
  return (
    <Card className="h-full" data-testid={`feature-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              {icon}
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {badge && (
            <Badge variant={badgeVariant} className="shrink-0">
              {badge}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Features - NYC School Ratings"
        description="Explore all the features of NYC School Ratings - AI assistant, interactive maps, school comparison, filtering, and more to help you find the perfect school."
        canonicalPath="/features"
      />

      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" data-testid="heading-features">
            Features
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to find the perfect NYC school for your child
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            AI-Powered Tools
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard
              icon={<MessageCircle className="w-5 h-5" />}
              title="AI Chat Assistant"
              description="Get instant answers about schools, understand metrics, and receive personalized guidance. Ask anything about NYC schools and get detailed, helpful responses."
              badge="GPT-4"
            />
            <FeatureCard
              icon={<Sparkles className="w-5 h-5" />}
              title="Smart Recommendations"
              description="Answer a few questions about your priorities and preferences, and our AI will suggest schools that match your family's unique needs."
            />
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Search className="w-6 h-6 text-primary" />
            Search & Discovery
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Filter className="w-5 h-5" />}
              title="Advanced Filtering"
              description="Filter by district, grade level, early childhood programs (3-K, Pre-K), Gifted & Talented programs, and historical performance trends."
            />
            <FeatureCard
              icon={<Map className="w-5 h-5" />}
              title="Interactive Map View"
              description="Explore schools on an interactive map with color-coded markers showing performance. Click any marker to see details and navigate to full school information."
            />
            <FeatureCard
              icon={<Clock className="w-5 h-5" />}
              title="Commute Calculator"
              description="Enter your home address to see transit times to each school. Helps you find conveniently located options that fit your daily routine."
            />
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            School Data & Analytics
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={<BarChart3 className="w-5 h-5" />}
              title="Comprehensive Scores"
              description="View Overall Score, Academics, Climate, and Progress metrics with color-coded indicators. Understand exactly how each school performs."
            />
            <FeatureCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Historical Trends"
              description="See 3-5 years of performance data with trend indicators. Identify improving schools or those maintaining consistent excellence."
            />
            <FeatureCard
              icon={<Users className="w-5 h-5" />}
              title="Demographics & Diversity"
              description="Explore student population details including Economic Need Index, ELL students, IEP students, and racial/ethnic composition."
            />
            <FeatureCard
              icon={<GraduationCap className="w-5 h-5" />}
              title="Program Information"
              description="Find schools with 3-K, Pre-K, Gifted & Talented (citywide and district), and special programs. Enrollment data by grade level."
            />
            <FeatureCard
              icon={<Star className="w-5 h-5" />}
              title="NYC School Survey"
              description="See how teachers, students, and parents rate the school on safety, academics, leadership, and family engagement."
            />
            <FeatureCard
              icon={<BarChart3 className="w-5 h-5" />}
              title="District Comparison"
              description="See how each school compares to district averages across all metrics. Visual indicators show above or below average performance."
            />
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary" />
            Personalization
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Heart className="w-5 h-5" />}
              title="Save Favorites"
              description="Create an account to save your favorite schools. Build a shortlist as you research and easily return to schools you're considering."
            />
            <FeatureCard
              icon={<GitCompare className="w-5 h-5" />}
              title="Side-by-Side Comparison"
              description="Compare up to 4 schools at once with detailed metrics displayed side-by-side. Perfect for narrowing down your final choices."
            />
            <FeatureCard
              icon={<Star className="w-5 h-5" />}
              title="Parent Reviews"
              description="Read reviews from other parents and share your own experiences. Star ratings and written feedback help others in their search."
            />
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Coming Soon
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Bell className="w-5 h-5" />}
              title="School Alerts"
              description="Get notified when data updates for schools you're following. Stay informed about changes that matter to you."
              badge="Coming Soon"
              badgeVariant="outline"
            />
            <FeatureCard
              icon={<Download className="w-5 h-5" />}
              title="Export Reports"
              description="Download detailed school reports as PDF. Share with family members or save for your records."
              badge="Coming Soon"
              badgeVariant="outline"
            />
            <FeatureCard
              icon={<Sparkles className="w-5 h-5" />}
              title="Premium Features"
              description="Advanced AI analysis, unlimited favorites, detailed admission insights, and priority support for subscribers."
              badge="Coming Soon"
              badgeVariant="outline"
            />
          </div>
        </div>

        <div className="text-center py-8 border-t">
          <h2 className="text-2xl font-semibold mb-4">Ready to find the perfect school?</h2>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button size="lg" asChild data-testid="button-browse-schools">
              <Link href="/">Browse Schools</Link>
            </Button>
            <Button size="lg" variant="outline" asChild data-testid="button-get-recommendations">
              <Link href="/recommendations">Get Recommendations</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
