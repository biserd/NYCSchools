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
import { trackEvent } from "@/lib/analytics";
import {
  Check,
  X,
  Sparkles,
  Zap,
  Shield,
  MessageCircle,
  Clock,
  Star,
  Heart,
  Loader2,
  TrendingUp,
  Users,
  ChevronRight,
  Quote,
  School,
  Target,
  ClipboardList,
} from "lucide-react";

interface PricingFeature {
  name: string;
  free: boolean | string;
  premium: boolean | string;
}

const features: PricingFeature[] = [
  { name: "Browse 2,100+ NYC Schools", free: true, premium: true },
  { name: "Public, Charter & Private Schools", free: true, premium: true },
  { name: "Interactive Map View", free: true, premium: true },
  { name: "Basic School Details", free: true, premium: true },
  { name: "District & Grade Filtering", free: true, premium: true },
  { name: "Save Favorite Schools", free: "Up to 5", premium: "Unlimited" },
  { name: "Detailed Score Breakdown", free: false, premium: true },
  { name: "Compare Schools Side-by-Side", free: false, premium: "Up to 4" },
  { name: "AI Chat Assistant", free: false, premium: "Unlimited" },
  { name: "Application Tracker", free: false, premium: true },
  { name: "Smart School Recommendations", free: false, premium: true },
  { name: "Commute Time Calculator", free: false, premium: true },
  { name: "Historical Trend Analysis", free: false, premium: true },
  { name: "Priority Support", free: false, premium: true },
];

const stats = [
  { value: "2,100+", label: "School Profiles", icon: School },
  { value: "3", label: "School Types", icon: Check },
  { value: "5", label: "NYC Boroughs", icon: Target },
  { value: "6 months", label: "One-Time Access", icon: Clock },
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
        title: "Season Pass Active",
        description: "Your six months of full access are ready.",
      });
      window.history.replaceState({}, "", "/pricing");
    } else if (params.get("canceled") === "true") {
      toast({
        title: "Checkout Canceled",
        description: "No payment was made and your access did not change.",
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

  // Fetch Stripe config to check if in test mode
  const { data: stripeConfig } = useQuery<{
    publishableKey: string;
    mode: 'test' | 'live';
  }>({
    queryKey: ["/api/stripe/config"],
  });
  const isTestMode = stripeConfig?.mode === 'test';

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
    mutationFn: async ({ priceId, mode }: { priceId: string; mode: 'subscription' | 'payment' }) => {
      const res = await apiRequest("POST", "/api/checkout", { priceId, mode });
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

  // Guest checkout mutation (no account required - email collected by Stripe)
  const guestCheckoutMutation = useMutation({
    mutationFn: async ({ priceId }: { priceId: string }) => {
      const res = await fetch("/api/checkout/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Checkout failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGuestCheckout = () => {
    if (!currentPriceId) {
      toast({
        title: "Loading...",
        description: "Please wait while we load pricing information.",
        variant: "destructive",
      });
      return;
    }
    trackEvent("begin_checkout", { currency: "USD", value: 29, price_id: currentPriceId, checkout_type: "guest" });
    guestCheckoutMutation.mutate({ priceId: currentPriceId });
  };

  // Check for premium access - includes recurring subscriptions and Season Pass
  const isPremium = subscription?.status === "active" && 
    (subscription?.plan === "premium" || subscription?.plan === "season_pass");
  const isLoadingData = authLoading || subLoading || productsLoading;
  
  // Find the Season Pass product/price - use the LAST match to prefer test mode products
  const allSeasonPassProducts = products?.data?.filter(p => 
    p.name?.toLowerCase().includes("season") || 
    p.metadata?.plan === "season_pass"
  ) || [];
  const seasonPassProduct = allSeasonPassProducts[allSeasonPassProducts.length - 1];
  const seasonPassPrice = seasonPassProduct?.prices?.find(p => !p.recurring && p.active);
  
  // The public offer is intentionally one product: a non-renewing Season Pass.
  // Legacy monthly subscribers retain access, but new checkout never falls
  // back to a recurring price when the Season Pass is unavailable.
  const currentPriceId = seasonPassPrice?.id;
  
  const handleCheckout = () => {
    if (currentPriceId) {
      trackEvent("begin_checkout", { currency: "USD", value: 29, price_id: currentPriceId, checkout_type: "authenticated" });
      checkoutMutation.mutate({ priceId: currentPriceId, mode: 'payment' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Enrollment Season Pass Pricing"
        description="Get six months of NYC school comparison, personalized recommendations, commute planning, and application tracking with one payment and no renewal."
        canonicalPath="/pricing"
      />

      <AppHeader />

      <main className="flex-1">
        {/* Stripe Test Mode Banner */}
        {isTestMode && (
          <div className="bg-amber-500 text-black py-2 px-4 text-center text-sm font-medium" data-testid="banner-stripe-test-mode">
            <Zap className="w-4 h-4 inline-block mr-2" />
            STRIPE TEST MODE - Use card 4242 4242 4242 4242 (any expiry, any CVC) to test payments
          </div>
        )}

        {/* User subscription status banner */}
        {user && !subLoading && subscription && (
          <div className="bg-muted/50 border-b">
            <div className="container mx-auto px-4 py-3 text-center" data-testid="banner-subscription-status">
              {isPremium ? (
                <div className="flex items-center justify-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium">Your full access is active</span>
                  <Badge variant="default" className="ml-2">Active</Badge>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  <span className="font-medium">You're on the Free plan</span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-primary font-medium">Upgrade below to unlock all features</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 to-background py-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="w-3 h-3 mr-1" />
              Season Pass Available
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="heading-pricing">
              Build a Confident NYC School Plan <span className="text-primary">This Enrollment Season</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Turn school data into an explainable shortlist, side-by-side comparison, commute plan, and application checklist.
            </p>
            
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {stats.map((stat, i) => (
                <div key={i} className="flex flex-col items-center p-4 rounded-lg bg-background border">
                  <stat.icon className="w-5 h-5 text-primary mb-2" />
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            {/* Season Pass Value Proposition */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">
                  Season Pass: Full access during peak enrollment season
                </span>
              </div>
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
                    Great for exploring your options
                  </CardDescription>
                  <div className="pt-4">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500" />
                    Browse all 2,100+ NYC schools
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
                    Basic school details
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <X className="w-4 h-4" />
                    AI Chat Assistant
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <X className="w-4 h-4" />
                    Side-by-Side Comparison
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <X className="w-4 h-4" />
                    Application Tracker
                  </div>
                </CardContent>
                <CardFooter>
                  {authLoading || subLoading ? (
                    <Button variant="outline" className="w-full" disabled>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </Button>
                  ) : user ? (
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
                        Manage Access
                      </Button>
                    )
                  ) : (
                    <Link href="/login?redirect=/pricing" className="w-full">
                      <Button variant="outline" className="w-full" data-testid="button-get-started-free">
                        Get Started Free
                      </Button>
                    </Link>
                  )}
                </CardFooter>
              </Card>

              {/* Premium Plan - Season Pass */}
              <Card className="relative border-primary shadow-lg" data-testid="card-premium-plan">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Zap className="w-3 h-3 mr-1" />
                    Best Value
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Season Pass
                  </CardTitle>
                  <CardDescription>
                    Full access during peak enrollment season
                  </CardDescription>
                  <div className="pt-4">
                    <span className="text-4xl font-bold">$29</span>
                    <span className="text-muted-foreground"> one-time</span>
                    <div className="text-sm text-muted-foreground mt-1">
                      6 months of full access
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Check className="w-4 h-4 text-emerald-500" />
                    Everything in Free, plus:
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MessageCircle className="w-4 h-4 text-primary" />
                    <strong>Unlimited</strong> AI Chat Assistant
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Side-by-Side Comparison (up to 4)
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Detailed Score Breakdown
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    Commute time calculator
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-primary" />
                    Smart school recommendations
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    Application Tracker
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-primary" />
                    Priority support
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-3">
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
                        Manage Access
                      </Button>
                    ) : (
                      <Button 
                        className="w-full"
                        onClick={handleCheckout}
                        disabled={checkoutMutation.isPending || !currentPriceId}
                        data-testid="button-upgrade-premium"
                      >
                        {checkoutMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4 mr-2" />
                        )}
                        Get Season Pass - $29
                      </Button>
                    )
                  ) : (
                    <div className="w-full space-y-2">
                      <Button 
                        className="w-full" 
                        onClick={handleGuestCheckout}
                        disabled={guestCheckoutMutation.isPending || !currentPriceId}
                        data-testid="button-guest-checkout"
                      >
                        {guestCheckoutMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4 mr-2" />
                        )}
                        Get Season Pass - $29
                      </Button>
                      <Link href="/login?redirect=/pricing" className="block">
                        <Button variant="ghost" className="w-full text-sm" data-testid="button-login-existing">
                          Already have an account? Log in
                        </Button>
                      </Link>
                    </div>
                  )}
                  <p className="text-xs text-center text-muted-foreground">
                    One-time payment. No recurring charges.
                  </p>
                </CardFooter>
              </Card>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-6 mb-16 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                Built by a NYC Parent
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                Official DOE Data
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                Secure Payment via Stripe
              </div>
            </div>
          </div>
        </section>

        {/* Concrete deliverable preview */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-10">
              <Badge variant="secondary" className="mb-4">
                <Sparkles className="w-3 h-3 mr-1" />
                What You Get
              </Badge>
              <h2 className="text-3xl font-bold mb-3">A decision plan, not another list of ratings</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Preview the workflow before checkout. Every recommendation includes the reason it fits and what your family should verify.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <Target className="w-6 h-6 text-primary mb-2" />
                  <CardTitle className="text-lg">Explainable shortlist</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Match grade, location, programs, priorities, and school data with clear fit explanations.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <TrendingUp className="w-6 h-6 text-primary mb-2" />
                  <CardTitle className="text-lg">Side-by-side decision view</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Compare outcomes, climate, programs, admissions context, and commute tradeoffs in one place.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <ClipboardList className="w-6 h-6 text-primary mb-2" />
                  <CardTitle className="text-lg">Application checklist</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Track schools, deadlines, open houses, documents, offers, and waitlist follow-ups.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Premium Features Preview */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">
                <Sparkles className="w-3 h-3 mr-1" />
                Premium Features
              </Badge>
              <h2 className="text-3xl font-bold mb-4">
                What You'll Unlock
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Smart Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Tell us your priorities - commute, academics, special programs - and our AI finds schools that match your family's unique needs.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Commute Calculator</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    See exact travel times from your home to any school. Factor in subway, bus, and walking routes before you decide.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Unlimited AI Chat</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Ask our AI assistant anything about NYC schools. Get personalized insights and answers 24/7, with no daily limits.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
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
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-semibold text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What's included in the Season Pass?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Get 6 months of full Premium access for a one-time payment of $29. Includes unlimited AI chat, side-by-side comparison, application tracker, and all premium features to help you secure your child's spot.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Does the Season Pass renew?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    No. The Enrollment Season Pass is a one-time payment for six months of access. It does not automatically renew, so there is nothing to cancel.
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
                  <CardTitle className="text-lg">Is there a money-back guarantee?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    If the product is not a fit, contact us within seven days of purchase to request a refund. There is no trial or automatic renewal.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 px-4 bg-primary/5">
          <div className="container mx-auto max-w-2xl text-center">
            <h3 className="text-2xl font-bold mb-4">
              Ready to Secure Your Child's Spot?
            </h3>
            <p className="text-muted-foreground mb-6">
              Build your shortlist, compare tradeoffs, and keep the application process organized in one place.
            </p>
            {user && !isPremium ? (
              <Button 
                size="lg"
                onClick={handleCheckout}
                disabled={checkoutMutation.isPending || !currentPriceId}
                data-testid="button-cta-upgrade"
              >
                {checkoutMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Get Season Pass - $29
              </Button>
            ) : !user ? (
              <Button 
                size="lg" 
                onClick={handleGuestCheckout}
                disabled={guestCheckoutMutation.isPending || !currentPriceId}
                data-testid="button-cta-start"
              >
                {guestCheckoutMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Get Started Now
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground mt-4">
              One-time payment. 6 months of full access. No recurring charges.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
