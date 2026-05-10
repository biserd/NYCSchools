import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type NyceecCenter, type NyceecReviewWithUser, getBoroughName, getNyceecUrl } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SafetyIndexCard } from "@/components/SafetyIndexCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { NyceecReviewForm } from "@/components/NyceecReviewForm";
import { NearbyPropertiesPanel } from "@/components/NearbyPropertiesPanel";
import { StarRating } from "@/components/StarRating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import {
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Users,
  Clock,
  Building2,
  Baby,
  ArrowLeft,
  Map,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MessageCircle,
  LogIn,
  Star,
} from "lucide-react";

interface AiInsightsResponse {
  overview: string;
  considerations: string[];
  tourQuestions: string[];
  neighborhoodContext: string;
}

export default function NyceecDetail() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [premiumRequired, setPremiumRequired] = useState(false);

  const locCode = slug?.split('-')[0]?.toUpperCase() || '';

  const { data: center, isLoading, error } = useQuery<NyceecCenter>({
    queryKey: ["/api/nyceec-centers", locCode],
    enabled: !!locCode,
    retry: 1,
  });

  // Auto-fetch cached AI insights on page load (for authenticated users)
  const { data: cachedInsights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery<AiInsightsResponse | null>({
    queryKey: ["/api/nyceec-centers", locCode, "ai-insights"],
    enabled: !!locCode && isAuthenticated && !authLoading,
  });

  const aiInsightsMutation = useMutation({
    mutationFn: async () => {
      setPremiumRequired(false);
      const response = await apiRequest("POST", "/api/nyceec-centers/ai-insights", {
        locCode: center?.locCode,
        name: center?.name,
        centerType: center?.centerType,
        borough: center?.borough,
        district: center?.district,
        address: center?.address,
        seats: center?.seats,
        extendedDay: center?.extendedDay,
        dayLength: center?.dayLength,
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === "PREMIUM_REQUIRED") {
          setPremiumRequired(true);
        }
        throw new Error(errorData.message || "Failed to generate insights");
      }
      return response.json();
    },
    onSuccess: () => {
      refetchInsights();
    },
    onError: () => {
    },
  });

  const handleGenerateInsights = () => {
    aiInsightsMutation.mutate();
  };

  // Use cached insights if available, otherwise use mutation result
  const aiInsights = cachedInsights || aiInsightsMutation.data;

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<NyceecReviewWithUser[]>({
    queryKey: ["/api/nyceec-centers", locCode, "reviews"],
    enabled: !!locCode,
  });

  const { data: reviewStats } = useQuery<{ averageRating: number; totalReviews: number }>({
    queryKey: ["/api/nyceec-centers", locCode, "reviews", "stats"],
    enabled: !!locCode,
  });

  const { data: userReview } = useQuery({
    queryKey: ["/api/nyceec-centers", locCode, "reviews", "user"],
    enabled: !!locCode && isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-48 mb-8" />
          <div className="grid gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Center with code {locCode} not found.</p>
            <Link href="/early-childhood">
              <Button data-testid="button-browse-centers">Browse All Centers</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const boroughName = getBoroughName(center.borough);
  const centerTypeLabel = center.centerType === "NYCEEC" ? "Community-Based" :
    center.centerType === "DOE" ? "DOE School" : "Charter";
  
  const getCenterTypeColor = () => {
    switch (center.centerType) {
      case "NYCEEC":
        return "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800";
      case "DOE":
        return "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800";
      case "CHARTER":
      case "Charter":
        return "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200";
    }
  };

  const centerUrl = getNyceecUrl(center);
  const pageDescription = `${center.name} is a ${centerTypeLabel} early childhood center in ${boroughName}, NYC. ${center.seats ? `Offers ${center.seats} Pre-K seats.` : ''} ${center.extendedDay ? 'Extended day available.' : ''} View details, location, and AI-generated insights.`;

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Preschool",
    "name": center.name,
    "url": `${siteOrigin}${centerUrl}`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": center.address,
      "addressLocality": boroughName,
      "addressRegion": "NY",
      "postalCode": center.zipCode,
      "addressCountry": "US"
    },
    ...(center.latitude && center.longitude ? {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": center.latitude,
        "longitude": center.longitude
      }
    } : {}),
    ...(center.phone ? { "telephone": center.phone } : {}),
    ...(center.email ? { "email": center.email } : {}),
    "description": pageDescription,
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead
        title={`${center.name} - NYC Early Childhood Center`}
        description={pageDescription}
        keywords={`${center.name}, NYC preschool, Pre-K, 3-K, early childhood, ${boroughName}, District ${center.district}, ${centerTypeLabel}`}
        canonicalPath={centerUrl}
      />
      <StructuredData data={organizationSchema} />
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <div className="space-y-6">
          <Link href="/early-childhood">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to All Centers
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-center-name">
                {center.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="outline" className={getCenterTypeColor()} data-testid="badge-center-type">
                  <Building2 className="w-3 h-3 mr-1" />
                  {centerTypeLabel}
                </Badge>
                {center.extendedDay && (
                  <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Extended Day
                  </Badge>
                )}
                {center.seats && (
                  <Badge variant="secondary">
                    <Users className="w-3 h-3 mr-1" />
                    {center.seats} seats
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground" data-testid="text-location">
                <MapPin className="w-4 h-4" />
                <span>{boroughName} • District {center.district}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Link href={`/map?source=nyceec&centerType=${center.centerType}`}>
                <Button variant="outline" size="sm" data-testid="button-view-map">
                  <Map className="w-4 h-4 mr-2" />
                  View on Map
                </Button>
              </Link>
            </div>
          </div>

          <Card data-testid="card-contact">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location & Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium" data-testid="text-address">{center.address}</p>
                <p className="text-muted-foreground">{boroughName}, NY {center.zipCode}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                {center.phone && (
                  <a 
                    href={`tel:${center.phone}`}
                    className="flex items-center gap-2 text-primary hover:underline"
                    data-testid="link-phone"
                  >
                    <Phone className="w-4 h-4" />
                    {center.phone}
                  </a>
                )}
                {center.email && (
                  <a 
                    href={`mailto:${center.email}`}
                    className="flex items-center gap-2 text-primary hover:underline"
                    data-testid="link-email"
                  >
                    <Mail className="w-4 h-4" />
                    {center.email}
                  </a>
                )}
                {center.website && (
                  <a 
                    href={center.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                    data-testid="link-website"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Website
                  </a>
                )}
              </div>

              {center.latitude && center.longitude && (
                <div className="pt-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${center.latitude},${center.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    data-testid="link-directions"
                  >
                    <Map className="w-4 h-4" />
                    Get Directions
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <SafetyIndexCard
            schoolType="nyceec"
            schoolKey={center.locCode}
            schoolName={center.name}
          />

          <NearbyPropertiesPanel
            schoolAddress={center.address}
            schoolName={center.name}
            zipCode={center.zipCode}
          />

          <Card data-testid="card-program">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Baby className="w-5 h-5" />
                Program Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Program Type</p>
                  <p className="font-medium" data-testid="text-program-type">{centerTypeLabel}</p>
                </div>
                {center.seats && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Pre-K Seats</p>
                    <p className="font-medium" data-testid="text-seats">{center.seats}</p>
                  </div>
                )}
                {center.dayLength && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Day Length</p>
                    <p className="font-medium">{center.dayLength}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Extended Day</p>
                  <p className="font-medium">{center.extendedDay ? "Yes" : "No"}</p>
                </div>
                {center.mealsProvided !== null && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Meals Provided</p>
                    <p className="font-medium">{center.mealsProvided ? "Yes" : "No"}</p>
                  </div>
                )}
                {center.indoorOutdoor && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Play Space</p>
                    <p className="font-medium">{center.indoorOutdoor}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-ai-insights" className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Insights
                <Badge variant="outline" className="ml-2 text-xs font-normal">
                  AI-Generated
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isAuthenticated && !authLoading ? (
                <div className="text-center py-6 space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Get AI-Powered Insights</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Sign in to get personalized AI analysis including tour questions to ask,
                      program considerations, and neighborhood context for this center.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3">
                    <Link href="/login">
                      <Button variant="default" size="sm" data-testid="button-login-insights">
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button variant="outline" size="sm" data-testid="button-register-insights">
                        Create Account
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : insightsLoading || aiInsightsMutation.isPending ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{aiInsightsMutation.isPending ? 'Generating insights...' : 'Loading insights...'}</span>
                  </div>
                  <Skeleton className="h-20" />
                  <Skeleton className="h-32" />
                </div>
              ) : aiInsightsMutation.isError && premiumRequired ? (
                <div className="text-center py-6 space-y-4">
                  <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Premium Feature</h4>
                    <p className="text-muted-foreground text-sm">
                      AI Insights for early childhood centers are available with Season Pass.
                      Get personalized analysis and questions to ask during your tour.
                    </p>
                  </div>
                  <Link href="/pricing">
                    <Button data-testid="button-upgrade-insights">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Upgrade to Season Pass
                    </Button>
                  </Link>
                </div>
              ) : aiInsightsMutation.isError ? (
                <div className="text-center py-6 space-y-4">
                  <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
                  <p className="text-muted-foreground">
                    Unable to generate insights. Please try again.
                  </p>
                  <Button variant="outline" onClick={handleGenerateInsights} data-testid="button-retry-insights">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : aiInsights ? (
                <div className="space-y-6">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-sm leading-relaxed" data-testid="text-ai-overview">
                      {aiInsights.overview}
                    </p>
                  </div>

                  {aiInsights.considerations?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" />
                        Key Considerations
                      </h4>
                      <ul className="space-y-2">
                        {aiInsights.considerations.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiInsights.tourQuestions?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Questions to Ask During a Tour
                      </h4>
                      <ul className="space-y-2">
                        {aiInsights.tourQuestions.map((question: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="font-medium text-primary shrink-0">{i + 1}.</span>
                            <span>{question}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiInsights.neighborhoodContext && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Neighborhood Context
                      </h4>
                      <p className="text-sm text-muted-foreground" data-testid="text-neighborhood">
                        {aiInsights.neighborhoodContext}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground italic pt-2 border-t">
                    These insights are AI-generated and should not be considered official ratings. 
                    Always visit the center in person and speak with staff to make informed decisions.
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <p className="text-muted-foreground">
                    Get AI-generated insights about this center, including what to look for
                    and questions to ask during a tour.
                  </p>
                  <Button onClick={handleGenerateInsights} data-testid="button-generate-insights">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Insights
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-parents-guide">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Parent's Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground mb-4">
                When evaluating early childhood centers, there are no official quality ratings like 
                there are for K-12 schools. Here's what to focus on instead:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">During Your Visit</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Observe teacher-child interactions</li>
                    <li>Check cleanliness and safety of the space</li>
                    <li>Ask about staff qualifications and turnover</li>
                    <li>Inquire about daily schedules and curriculum</li>
                    <li>Ask how they handle transitions (potty training, naps)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Key Questions</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>What is the student-to-teacher ratio?</li>
                    <li>How do you communicate with parents?</li>
                    <li>What meals and snacks are provided?</li>
                    <li>How do you handle allergies and special needs?</li>
                    <li>What is your outdoor play policy?</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-reviews">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5" />
                Parent Reviews
                {reviewStats && reviewStats.totalReviews > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {reviewStats.averageRating.toFixed(1)} ({reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''})
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!authLoading && !isAuthenticated ? (
                <div className="bg-muted/50 rounded-lg p-6 text-center space-y-3">
                  <LogIn className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Sign in to share your experience with this center</p>
                  <div className="flex gap-3 justify-center">
                    <Link href="/login">
                      <Button variant="outline" data-testid="button-review-login">Sign In</Button>
                    </Link>
                    <Link href="/register">
                      <Button data-testid="button-review-register">Create Account</Button>
                    </Link>
                  </div>
                </div>
              ) : isAuthenticated && !userReview ? (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-4">Share Your Experience</h4>
                  <NyceecReviewForm locCode={locCode} />
                </div>
              ) : userReview ? (
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Your review:</p>
                  <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={(userReview as any).rating} size="sm" readonly />
                    <span className="text-sm text-muted-foreground">
                      {format(new Date((userReview as any).createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  {(userReview as any).reviewText && (
                    <p className="text-sm">{(userReview as any).reviewText}</p>
                  )}
                </div>
              ) : null}

              {reviewsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium">What Parents Say</h4>
                  {reviews
                    .filter(r => r.userId !== user?.id)
                    .slice(0, 5)
                    .map((review) => (
                      <div key={review.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={review.user?.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {review.user?.firstName?.[0] || review.user?.lastName?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">
                                {review.user?.firstName || 'Anonymous'}
                              </span>
                              <StarRating rating={review.rating} size="sm" readonly />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(review.createdAt), "MMM d, yyyy")}
                              </span>
                            </div>
                            {review.reviewText && (
                              <p className="text-sm text-muted-foreground mt-1">{review.reviewText}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No reviews yet. Be the first to share your experience!
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3 pt-4">
            <Link href="/early-childhood">
              <Button variant="outline" data-testid="button-browse-all">
                Browse All Centers
              </Button>
            </Link>
            <Link href={`/map?source=nyceec&district=${center.district}`}>
              <Button variant="outline" data-testid="button-map-district">
                <Map className="w-4 h-4 mr-2" />
                View District {center.district} Centers
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
