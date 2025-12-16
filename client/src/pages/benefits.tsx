import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import {
  Home,
  Heart,
  MessageCircle,
  Clock,
  Map,
  Sparkles,
  GitCompare,
  Star,
  CheckCircle2,
  ArrowRight,
  Lock,
  Users,
  Bell,
  Shuffle,
  ClipboardList,
  Target,
  Crown,
  Zap,
} from "lucide-react";

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  highlight?: boolean;
}

function BenefitCard({ icon, title, description, features, highlight }: BenefitCardProps) {
  return (
    <Card className={`h-full ${highlight ? "border-primary/50 shadow-lg" : ""}`} data-testid={`benefit-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${highlight ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
            {icon}
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function BenefitsPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Why Create an Account - NYC School Ratings"
        description="Discover the benefits of creating a free account on NYC School Ratings. Get personalized school zoning, commute times, favorites, AI recommendations, and more."
        canonicalPath="/benefits"
      />

      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            Free Forever
          </Badge>
          <h1 className="text-4xl font-bold mb-4" data-testid="heading-benefits">
            Why Create an Account?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock powerful features to make finding your perfect NYC school easier and more personalized
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <BenefitCard
            icon={<Home className="h-6 w-6" />}
            title="School Zone Detection"
            description="Know your designated schools instantly"
            highlight={true}
            features={[
              "See your official NYC DOE zoned elementary, middle, and high schools",
              "Filter the entire school database to show only your zoned schools",
              "Zoned school badges appear automatically on your school cards",
              "Based on official 2024-2025 NYC DOE zone boundaries",
            ]}
          />

          <BenefitCard
            icon={<Clock className="h-6 w-6" />}
            title="Commute Time Calculator"
            description="Plan your daily school run"
            features={[
              "See transit and walking times from your address to any school",
              "Compare commute times across multiple schools",
              "Consider real NYC transit options (subway, bus, walking)",
              "Save time in your school research process",
            ]}
          />

          <BenefitCard
            icon={<Heart className="h-6 w-6" />}
            title="Save Favorites"
            description="Build your personal shortlist"
            features={[
              "Save schools you're interested in for quick access",
              "View all your favorites on a dedicated page",
              "Compare your favorite schools side-by-side",
              "Never lose track of a great school you discovered",
            ]}
          />

          <BenefitCard
            icon={<GitCompare className="h-6 w-6" />}
            title="School Comparison"
            description="Make informed decisions"
            features={[
              "Compare up to 4 schools side-by-side",
              "See detailed metrics across academics, climate, and progress",
              "District comparison indicators show how schools stack up",
              "Export or share your comparison results",
            ]}
          />

          <BenefitCard
            icon={<MessageCircle className="h-6 w-6" />}
            title="AI Chat Assistant"
            description="Get personalized guidance"
            features={[
              "Ask questions about NYC schools and get instant answers",
              "Get tailored school recommendations based on your preferences",
              "Conversation history saved for future reference",
              "Powered by advanced AI for helpful, accurate responses",
            ]}
          />

          <BenefitCard
            icon={<Sparkles className="h-6 w-6" />}
            title="Find My Match"
            description="AI-powered recommendations"
            features={[
              "Answer a quick questionnaire about your needs",
              "Get personalized school recommendations from our AI",
              "Your zoned schools are automatically prioritized",
              "Find schools matching specific programs (G&T, Dual Language, etc.)",
            ]}
          />

          <BenefitCard
            icon={<Shuffle className="h-6 w-6" />}
            title="Lottery Simulator"
            description="Understand your odds"
            features={[
              "Simulate 3-K/Pre-K lottery outcomes",
              "Your zoned schools are auto-detected with higher priority",
              "Rank up to 12 schools to see acceptance probabilities",
              "Make smarter application decisions",
            ]}
          />

          <BenefitCard
            icon={<ClipboardList className="h-6 w-6" />}
            title="Application Tracker"
            description="Stay organized during enrollment"
            highlight={true}
            features={[
              "Track application status for each school (researching, applied, waitlisted, accepted)",
              "Set dates for open houses, tours, and deadlines",
              "Add personal notes about each school",
              "View all tracked schools in one organized dashboard",
            ]}
          />

          <BenefitCard
            icon={<Star className="h-6 w-6" />}
            title="Reviews & Ratings"
            description="Share your experience"
            features={[
              "Write reviews for schools you know",
              "Rate schools on a 5-star scale",
              "Help other parents make informed decisions",
              "Build community knowledge together",
            ]}
          />

          <BenefitCard
            icon={<Map className="h-6 w-6" />}
            title="Advanced Filtering"
            description="Find exactly what you need"
            features={[
              "Filter by your zoned schools across all views",
              "Combine multiple filters (G&T, Dual Language, IEP, etc.)",
              "Search by zip code, district, or borough",
              "Save time with powerful search capabilities",
            ]}
          />
        </div>

        {/* Premium Tools CTA Section */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Go Premium for More Power</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Unlock advanced tools to stay ahead of deadlines and secure your child's spot at the right school.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Link href="/chances-calculator" className="block" data-testid="link-premium-chances">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background hover-elevate cursor-pointer">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="font-medium text-sm">Chances Calculator</span>
                </div>
              </Link>
              <Link href="/application-tracker" className="block" data-testid="link-premium-tracker">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background hover-elevate cursor-pointer">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <span className="font-medium text-sm">Application Tracker</span>
                </div>
              </Link>
              <Link href="/compare" className="block" data-testid="link-premium-compare">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background hover-elevate cursor-pointer">
                  <GitCompare className="h-5 w-5 text-primary" />
                  <span className="font-medium text-sm">Side-by-Side Comparison</span>
                </div>
              </Link>
              <Link href="/lottery-simulator" className="block" data-testid="link-premium-lottery">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background hover-elevate cursor-pointer">
                  <Shuffle className="h-5 w-5 text-primary" />
                  <span className="font-medium text-sm">Lottery Simulator</span>
                </div>
              </Link>
            </div>
            <div className="text-center">
              <Link href="/pricing">
                <Button size="lg" data-testid="button-get-premium">
                  <Zap className="h-4 w-4 mr-2" />
                  Get Season Pass - $29
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-2">One-time payment. 6 months of full access.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold mb-2">All Features Are Free</h2>
                <p className="text-muted-foreground">
                  Create an account in seconds. No credit card required, no hidden fees.
                  Just more personalized tools to help you secure your child's spot.
                </p>
              </div>
              {isAuthenticated ? (
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">You're already signed in!</span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/register">
                    <Button size="lg" data-testid="button-create-account">
                      Create Free Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg" data-testid="button-sign-in">
                      Sign In
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-4">How We Protect Your Data</h2>
          <div className="flex flex-wrap justify-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span>Encrypted storage</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>No data sold to third parties</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span>No spam emails</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Read our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and{" "}
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> for more details.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
