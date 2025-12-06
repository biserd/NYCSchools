import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useCheckout } from "@/hooks/useCheckout";
import {
  Code,
  Database,
  Zap,
  Shield,
  BookOpen,
  ArrowRight,
  Check,
  Star,
  Lock,
  Loader2,
} from "lucide-react";

export default function DevelopersPage() {
  const { user, isAuthenticated } = useAuth();
  const { startCheckout, isLoading: checkoutLoading, isPremium } = useCheckout();

  const { data: subscription } = useQuery<{
    status: string;
    plan: string;
  }>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  const hasApiAccess = isPremium || subscription?.plan === "premium";

  const apiFeatures = [
    {
      icon: Database,
      title: "Comprehensive School Data",
      description: "Access data for 1,500+ NYC public and charter schools including academic scores, demographics, and program information.",
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "Our API is updated regularly with the latest NYC DOE data releases, ensuring your applications have current information.",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Industry-standard authentication with API keys, rate limiting, and 99.9% uptime SLA for Premium users.",
    },
    {
      icon: Code,
      title: "Developer-Friendly",
      description: "RESTful JSON endpoints with comprehensive documentation, code examples, and SDKs for popular languages.",
    },
  ];

  const endpoints = [
    { method: "GET", path: "/api/v1/schools", description: "List all schools with filtering" },
    { method: "GET", path: "/api/v1/schools/:dbn", description: "Get detailed school info" },
    { method: "GET", path: "/api/v1/districts", description: "List all NYC school districts" },
    { method: "GET", path: "/api/v1/early-childhood", description: "NYCEEC center data" },
    { method: "GET", path: "/api/v1/trends/:dbn", description: "Historical performance data" },
  ];

  const useCases = [
    "Build school comparison tools and dashboards",
    "Power real estate applications with school data",
    "Create educational research platforms",
    "Develop parent-focused mobile apps",
    "Integrate school info into neighborhood guides",
    "Build data visualization projects",
  ];

  return (
    <>
      <SEOHead
        title="Developer API | NYC School Ratings"
        description="Access NYC school data through our RESTful API. Build applications with comprehensive school information including academics, demographics, and program data."
        canonicalPath="/developers"
      />
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader showAIButton={false} />

        <main className="flex-1">
          <div className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-24">
            <div className="container mx-auto px-4 max-w-6xl">
              <div className="text-center max-w-3xl mx-auto">
                <Badge variant="secondary" className="mb-4">
                  <Code className="w-3 h-3 mr-1" />
                  Developer API
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="text-developers-title">
                  Build with NYC School Data
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Access comprehensive data for 1,500+ NYC public and charter schools through our RESTful API.
                  Power your applications with academic metrics, demographics, program information, and more.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {hasApiAccess ? (
                    <Link href="/developers/docs">
                      <Button size="lg" data-testid="button-view-docs">
                        <BookOpen className="w-5 h-5 mr-2" />
                        View API Documentation
                      </Button>
                    </Link>
                  ) : (
                    <Button 
                      size="lg" 
                      onClick={startCheckout}
                      disabled={checkoutLoading}
                      data-testid="button-get-api-access"
                    >
                      {checkoutLoading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Star className="w-5 h-5 mr-2" />
                      )}
                      Get API Access - $4.99/mo
                    </Button>
                  )}
                  <Link href="/developers/docs">
                    <Button variant="outline" size="lg" data-testid="button-explore-docs">
                      Explore Documentation
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <section className="py-16 md:py-20">
            <div className="container mx-auto px-4 max-w-6xl">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Why Use Our API?
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {apiFeatures.map((feature, index) => (
                  <Card key={index} className="text-center">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <feature.icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4 max-w-6xl">
              <div className="grid lg:grid-cols-2 gap-12 items-start">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-6">
                    Available Endpoints
                  </h2>
                  <p className="text-muted-foreground mb-8">
                    Our API provides access to a wide range of NYC school data. Here's a preview of what's available:
                  </p>
                  <div className="space-y-3">
                    {endpoints.map((endpoint, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-background border"
                      >
                        <Badge 
                          variant="outline" 
                          className="font-mono text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        >
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm font-mono flex-1">{endpoint.path}</code>
                        {!hasApiAccess && (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Plus many more endpoints for filtering, sorting, and accessing detailed school metrics.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-6">
                    What You Can Build
                  </h2>
                  <p className="text-muted-foreground mb-8">
                    Our API powers a variety of applications and use cases:
                  </p>
                  <div className="grid gap-3">
                    {useCases.map((useCase, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm">{useCase}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16 md:py-20">
            <div className="container mx-auto px-4 max-w-4xl">
              <Card className="text-center p-8">
                <CardHeader>
                  <CardTitle className="text-2xl md:text-3xl">
                    Ready to Get Started?
                  </CardTitle>
                  <CardDescription className="text-lg">
                    API access is included with our Premium plan at just $4.99/month.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-6 mb-8">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">1,500+</div>
                      <div className="text-sm text-muted-foreground">NYC Schools</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">10,000</div>
                      <div className="text-sm text-muted-foreground">API Requests/Month</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">99.9%</div>
                      <div className="text-sm text-muted-foreground">Uptime SLA</div>
                    </div>
                  </div>
                  {hasApiAccess ? (
                    <div className="space-y-4">
                      <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                        <Check className="w-4 h-4 mr-1" />
                        API Access Active
                      </Badge>
                      <div>
                        <Link href="/developers/docs">
                          <Button size="lg" data-testid="button-go-to-docs">
                            <BookOpen className="w-5 h-5 mr-2" />
                            Go to Documentation
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      size="lg" 
                      onClick={startCheckout}
                      disabled={checkoutLoading}
                      data-testid="button-subscribe-api"
                    >
                      {checkoutLoading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Star className="w-5 h-5 mr-2" />
                      )}
                      Subscribe to Premium
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
