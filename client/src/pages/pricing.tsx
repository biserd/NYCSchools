import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import {
  Check,
  X,
  Sparkles,
  Zap,
  Shield,
  MessageCircle,
  Map,
  Clock,
  Star,
  Heart,
  Loader2,
} from "lucide-react";

interface PricingFeature {
  name: string;
  free: boolean | string;
  premium: boolean | string;
}

const features: PricingFeature[] = [
  { name: "Browse 1,500+ NYC Schools", free: true, premium: true },
  { name: "Interactive Map View", free: true, premium: true },
  { name: "School Details & Metrics", free: true, premium: true },
  { name: "District & Grade Filtering", free: true, premium: true },
  { name: "Save Favorite Schools", free: "Up to 5", premium: "Unlimited" },
  { name: "Compare Schools Side-by-Side", free: "2 schools", premium: "Up to 4" },
  { name: "AI Chat Assistant", free: "5 questions/day", premium: "Unlimited" },
  { name: "Smart School Recommendations", free: false, premium: true },
  { name: "Commute Time Calculator", free: false, premium: true },
  { name: "Early Childhood AI Insights", free: false, premium: true },
  { name: "Historical Trend Analysis", free: false, premium: true },
  { name: "Priority Support", free: false, premium: true },
];

function FeatureRow({ feature }: { feature: PricingFeature }) {
  const renderValue = (value: boolean | string) => {
    if (typeof value === "string") {
      return <span className="text-sm text-muted-foreground">{value}</span>;
    }
    return value ? (
      <Check className="w-5 h-5 text-emerald-500" />
    ) : (
      <X className="w-5 h-5 text-muted-foreground/40" />
    );
  };

  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b last:border-b-0">
      <div className="text-sm font-medium">{feature.name}</div>
      <div className="flex justify-center">{renderValue(feature.free)}</div>
      <div className="flex justify-center">{renderValue(feature.premium)}</div>
    </div>
  );
}

export default function PricingPage() {
  const [location] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Check for success/canceled URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({
        title: "Subscription Active",
        description: "Welcome to Premium! You now have access to all features.",
      });
      // Clean URL
      window.history.replaceState({}, "", "/pricing");
    } else if (params.get("canceled") === "true") {
      toast({
        title: "Checkout Canceled",
        description: "No changes were made to your subscription.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/pricing");
    }
  }, [toast]);

  // Fetch subscription status
  const { data: subscription, isLoading: subLoading } = useQuery<{
    status: string;
    plan: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  // Fetch products/prices from Stripe
  const { data: products, isLoading: productsLoading } = useQuery<{
    data: Array<{
      id: string;
      name: string;
      description: string;
      active: boolean;
      metadata: Record<string, string>;
      prices: Array<{
        id: string;
        unit_amount: number;
        currency: string;
        recurring: { interval: string } | null;
        active: boolean;
      }>;
    }>;
  }>({
    queryKey: ["/api/products"],
  });

  // Create checkout session
  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/checkout", { priceId });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Customer portal mutation
  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/customer-portal", {});
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to open subscription management.",
        variant: "destructive",
      });
    },
  });

  const isPremium = subscription?.status === "active" && subscription?.plan === "premium";
  
  // Find the premium monthly price
  const premiumProduct = products?.data?.find(p => p.name?.toLowerCase().includes("premium") || p.metadata?.plan === "premium");
  const monthlyPrice = premiumProduct?.prices?.find(p => p.recurring?.interval === "month" && p.active);
  const priceAmount = monthlyPrice?.unit_amount ? (monthlyPrice.unit_amount / 100).toFixed(2) : "9.99";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Pricing - NYC School Ratings"
        description="Choose the right plan for your family. Free basic access or Premium with unlimited AI assistance, commute calculator, and advanced features."
        canonicalPath="/pricing"
      />

      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            Simple Pricing
          </Badge>
          <h1 className="text-4xl font-bold mb-4" data-testid="heading-pricing">
            Find the Perfect Plan for Your Family
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade when you need more powerful tools to find the best school
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-3xl mx-auto">
          {/* Free Plan */}
          <Card className="relative" data-testid="card-free-plan">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Free
              </CardTitle>
              <CardDescription>
                Perfect for exploring NYC school options
              </CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-emerald-500" />
                Browse all NYC schools
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-emerald-500" />
                Interactive map view
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-emerald-500" />
                Save up to 5 favorites
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-emerald-500" />
                5 AI questions per day
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <X className="w-4 h-4" />
                Commute calculator
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <X className="w-4 h-4" />
                Smart recommendations
              </div>
            </CardContent>
            <CardFooter>
              {user ? (
                !isPremium ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                  >
                    {portalMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Manage Subscription
                  </Button>
                )
              ) : (
                <Link href="/auth" className="w-full">
                  <Button variant="outline" className="w-full" data-testid="button-get-started-free">
                    Get Started Free
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-primary" data-testid="card-premium-plan">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                <Zap className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Premium
              </CardTitle>
              <CardDescription>
                All the tools to make the best decision
              </CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold">${priceAmount}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-emerald-500" />
                Everything in Free, plus:
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="w-4 h-4 text-primary" />
                <strong>Unlimited</strong> AI questions
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-primary" />
                Commute time calculator
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                Smart school recommendations
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Map className="w-4 h-4 text-primary" />
                Early childhood AI insights
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-primary" />
                Priority support
              </div>
            </CardContent>
            <CardFooter>
              {authLoading || subLoading ? (
                <Button className="w-full" disabled>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </Button>
              ) : user ? (
                isPremium ? (
                  <Button 
                    className="w-full"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                  >
                    {portalMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Manage Subscription
                  </Button>
                ) : (
                  <Button 
                    className="w-full"
                    onClick={() => monthlyPrice && checkoutMutation.mutate(monthlyPrice.id)}
                    disabled={checkoutMutation.isPending || !monthlyPrice}
                    data-testid="button-upgrade-premium"
                  >
                    {checkoutMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    Upgrade to Premium
                  </Button>
                )
              ) : (
                <Link href="/auth" className="w-full">
                  <Button className="w-full" data-testid="button-start-premium">
                    <Zap className="w-4 h-4 mr-2" />
                    Start Premium
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-center mb-8">
            Compare Plans
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 pb-4 border-b font-semibold">
                <div>Feature</div>
                <div className="text-center">Free</div>
                <div className="text-center">Premium</div>
              </div>
              {features.map((feature, index) => (
                <FeatureRow key={index} feature={feature} />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Yes! You can cancel your Premium subscription at any time. You'll continue to have access until the end of your billing period.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment partner, Stripe.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is my data secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Absolutely. We use industry-standard encryption and never share your personal information. See our <Link href="/privacy" className="text-primary underline">Privacy Policy</Link> for details.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do you offer refunds?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  We offer a 7-day money-back guarantee for first-time Premium subscribers. Contact us at hello@nycschoolsratings.com for assistance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-8 px-6 bg-muted/50 rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
          <p className="text-muted-foreground mb-4">
            We're here to help! Reach out to our team anytime.
          </p>
          <a href="mailto:hello@nycschoolsratings.com">
            <Button variant="outline" data-testid="button-contact-us">
              Contact Us
            </Button>
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
