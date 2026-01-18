import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { School, SchoolWithOverallScore, calculateOverallScore, getScoreColor, Review, getQualityRatingLabel, getQualityRatingBadgeClasses, isHighSchool, isPureHighSchool, getMetricColor, type SchoolTrend } from "@shared/schema";
import { getBoroughFromDBN } from "@shared/boroughMapping";
import { METRIC_TOOLTIPS } from "@shared/metricHelp";
import { CommuteTime } from "@/components/CommuteTime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { AppHeader } from "@/components/AppHeader";
import { FavoriteButton } from "@/components/FavoriteButton";
import { TrackSchoolButton } from "@/components/TrackSchoolButton";
import { StarRating } from "@/components/StarRating";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewsList } from "@/components/ReviewsList";
import { AdmissionsSection } from "@/components/AdmissionsSection";
import { SchoolZoneMap } from "@/components/SchoolZoneMap";
import { SchoolFAQ } from "@/components/SchoolFAQ";
import { LocationMap } from "@/components/LocationMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDistrictAverages, DistrictComparisonBadge, DistrictAverages, InlineComparison } from "@/components/DistrictComparison";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";
import { 
  GraduationCap, 
  Users, 
  MapPin, 
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  MessageCircle,
  Sparkles,
  Home,
  Calculator,
  BookOpen,
  Award,
  Star,
  History,
  Languages,
  DollarSign,
  AlertCircle,
  Lock,
  Crown,
  Zap,
  Loader2,
  LogIn,
  Phone,
  ExternalLink,
  Globe
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCheckout } from "@/hooks/useCheckout";
import { useFreeSchoolView } from "@/hooks/useFreeSchoolView";

interface SubscriptionStatus {
  status: string;
  plan: string;
}

// Helper to format district comparison delta with proper rounding
function formatDelta(value: number, compare: number): string {
  const diff = Math.round(value - compare);
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `${diff}`;
  return '±0';
}

export default function SchoolDetail() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Extract DBN from slug (format: "02m158-ps-158-bayard-taylor" or legacy "02M158")
  const dbn = slug?.split('-')[0]?.toUpperCase() || '';

  const { data: school, isLoading, error } = useQuery<School>({
    queryKey: ["/api/schools", dbn],
    enabled: !!dbn,
  });

  // Fetch subscription status for premium features
  const { data: subscription } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription"],
    enabled: !authLoading && isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
  
  // Track free school view - visitors get one school with full access
  const { isThisFreeSchool, isLoading: freeViewLoading } = useFreeSchoolView(dbn);

  // Check for premium access - includes:
  // 1. Recurring subscriptions and Season Pass
  // 2. OR this is the user's one free school view
  const hasPaidPremium = subscription?.status === "active" && 
    (subscription?.plan === "premium" || subscription?.plan === "season_pass");
  const isPremium = hasPaidPremium || isThisFreeSchool;

  const schoolWithScore: SchoolWithOverallScore | null = school ? {
    ...school,
    overall_score: calculateOverallScore(school),
  } : null;

  // Fetch district averages for comparison
  const { districtAverages, citywideAverages, isLoading: districtLoading } = useDistrictAverages(school?.district || 0);
  
  // Fetch historical trends
  const { data: historicalTrend, isLoading: trendLoading } = useQuery<SchoolTrend>({
    queryKey: ["/api/schools", dbn, "history"],
    enabled: !!dbn,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch all schools to get top schools in the same district
  const { data: allSchools } = useQuery<School[]>({
    queryKey: ["/api/schools"],
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Get top 3 schools in the same district (excluding current school) - memoized for performance
  const topDistrictSchools = useMemo(() => {
    if (!allSchools || !school) return [];
    return allSchools
      .filter(s => s.district === school.district && s.dbn !== dbn)
      .map(s => ({ ...s, overall_score: calculateOverallScore(s) }))
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 3);
  }, [allSchools, school?.district, dbn]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center text-muted-foreground">Loading school details...</div>
        </div>
      </div>
    );
  }

  if (!schoolWithScore) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">School with DBN {dbn} not found.</p>
            <Link href="/">
              <Button data-testid="button-browse-schools">Browse All Schools</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const scoreColor = getScoreColor(schoolWithScore.overall_score);
  const borough = getBoroughFromDBN(schoolWithScore.dbn);
  
  const colorMap = {
    green: "bg-emerald-500",
    yellow: "bg-yellow-500",
    purple: "bg-violet-500",
    red: "bg-red-500",
    gray: "bg-gray-400",
  };

  const getScoreLabel = (score: number) => {
    if (score === -1) return "Insufficient Data";
    if (score >= 80) return "Outstanding";
    if (score >= 60) return "Strong";
    if (score >= 40) return "Average";
    return "Below Average";
  };

  const boroughText = borough ? ` in ${borough}` : '';
  const schoolDescription = `${schoolWithScore.name}${boroughText}, District ${schoolWithScore.district}. Overall Score: ${schoolWithScore.overall_score}. ELA: ${schoolWithScore.ela_proficiency}%, Math: ${schoolWithScore.math_proficiency}%. View detailed metrics, NYC School Survey results, parent reviews, and commute times.`;
  const schoolSlug = slug || '';

  const educationalOrgSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": schoolWithScore.name,
    "url": `https://nycschoolsratings.com/school/${schoolSlug}`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": borough || "New York",
      "addressRegion": "NY",
      "addressCountry": "US"
    },
    "description": schoolDescription,
    ...(schoolWithScore.latitude && schoolWithScore.longitude ? {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": schoolWithScore.latitude,
        "longitude": schoolWithScore.longitude
      }
    } : {}),
    "educationalLevel": schoolWithScore.grade_band,
    "numberOfStudents": schoolWithScore.enrollment,
    "telephone": schoolWithScore.phone || undefined,
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead 
        title={schoolWithScore.name}
        description={schoolDescription}
        keywords={`${schoolWithScore.name}, NYC school, District ${schoolWithScore.district}, ${borough} schools, kindergarten, elementary school, school ratings`}
        canonicalPath={`/school/${schoolSlug}`}
      />
      <StructuredData data={educationalOrgSchema} />
      <AppHeader />

      <main className="mx-auto w-full max-w-7xl px-4 md:px-8 py-8">
        <div className="space-y-6">
          {/* AI Assistant Banner */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 rounded-lg p-4" data-testid="banner-ai-assistant">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm text-foreground" data-testid="text-ai-banner-description">
                  Have questions about this school? Ask our AI assistant for personalized insights!
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const chatButton = document.querySelector('[data-testid="button-chat-open"]') as HTMLButtonElement;
                  if (chatButton) chatButton.click();
                }}
                data-testid="button-ai-assistant-banner"
                className="shrink-0 bg-primary hover:bg-primary/90"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Ask AI
              </Button>
            </div>
          </div>
          
          {/* School Header - Simplified */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2" data-testid="text-school-name">
                {schoolWithScore.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" data-testid="badge-dbn">{schoolWithScore.dbn}</Badge>
                {schoolWithScore.grade_band && (
                  <Badge variant="outline" className="text-xs" data-testid="badge-grades">
                    Grades {schoolWithScore.grade_band}
                  </Badge>
                )}
                {schoolWithScore.has_3k && (
                  <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700" data-testid="badge-3k">
                    3-K
                  </Badge>
                )}
                {schoolWithScore.has_prek && (
                  <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700" data-testid="badge-prek">
                    Pre-K
                  </Badge>
                )}
                {schoolWithScore.has_gifted_talented && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      schoolWithScore.gt_program_type === 'citywide' 
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700' 
                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
                    }`} 
                    data-testid="badge-gt"
                  >
                    {schoolWithScore.gt_program_type === 'citywide' ? 'Citywide G&T' : 'District G&T'}
                  </Badge>
                )}
                {schoolWithScore.is_specialized_hs && (
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700" 
                    data-testid="badge-specialized"
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Specialized HS
                  </Badge>
                )}
                {schoolWithScore.has_dual_language && (
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700" 
                    data-testid="badge-dual-language"
                  >
                    <Languages className="w-3 h-3 mr-1" />
                    Dual Language
                  </Badge>
                )}
                {borough && (
                  <Badge variant="outline" className="text-xs" data-testid="badge-borough">
                    {borough}
                  </Badge>
                )}
                <Link 
                  href={`/?district=${schoolWithScore.district}`}
                  data-testid="link-district"
                >
                  <Badge variant="outline" className="text-xs text-primary hover:bg-primary/10 cursor-pointer">
                    District {schoolWithScore.district}
                  </Badge>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FavoriteButton 
                schoolDbn={schoolWithScore.dbn} 
                variant="default" 
                size="default"
                showLabel={true}
              />
              <TrackSchoolButton 
                schoolDbn={schoolWithScore.dbn} 
                variant="outline" 
                size="default"
                showLabel={true}
              />
            </div>
          </div>

          {/* Two-Column Layout: Location & School Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Location & Directions Card - Takes 2 columns */}
            <Card className="lg:col-span-2" data-testid="card-location">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5" />
                  Location & Directions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Embedded Map */}
                {schoolWithScore.latitude && schoolWithScore.longitude && (
                  <LocationMap
                    latitude={schoolWithScore.latitude}
                    longitude={schoolWithScore.longitude}
                    schoolName={schoolWithScore.name}
                    address={schoolWithScore.address || undefined}
                  />
                )}
                
                {/* Address */}
                {schoolWithScore.address && schoolWithScore.address !== "TBD" && (
                  <div className="flex items-start gap-2" data-testid="location-address">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <span className="text-sm">{schoolWithScore.address}</span>
                  </div>
                )}
                
                {/* Commute Time */}
                <CommuteTime schoolDbn={schoolWithScore.dbn} />
              </CardContent>
            </Card>

            {/* School Information Card */}
            <Card data-testid="card-school-info">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">School Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Phone */}
                {schoolWithScore.phone && (
                  <div data-testid="info-phone">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span>Phone</span>
                    </div>
                    <div className="font-medium">{schoolWithScore.phone}</div>
                  </div>
                )}
                
                {/* Principal */}
                {schoolWithScore.principal_name && (
                  <div data-testid="info-principal">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>Principal</span>
                    </div>
                    <div className="font-medium uppercase">{schoolWithScore.principal_name}</div>
                  </div>
                )}
                
                {/* Overall Rating with District Badge */}
                <div data-testid="info-rating">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Star className="w-3.5 h-3.5" />
                    <span>Overall Rating</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-3xl font-bold ${
                      schoolWithScore.overall_score >= 80 ? 'text-emerald-600' :
                      schoolWithScore.overall_score >= 70 ? 'text-yellow-600' :
                      schoolWithScore.overall_score >= 0 ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {schoolWithScore.overall_score === -1 ? 'N/A' : schoolWithScore.overall_score}
                    </span>
                    {districtAverages && schoolWithScore.overall_score >= 0 && (
                      <DistrictComparisonBadge 
                        value={schoolWithScore.overall_score} 
                        districtAvg={districtAverages.overallScore} 
                      />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getScoreLabel(schoolWithScore.overall_score)}
                  </div>
                </div>
                
                {/* Website Link */}
                {schoolWithScore.website && (
                  <div data-testid="info-website">
                    <a 
                      href={schoolWithScore.website.startsWith('http') ? schoolWithScore.website : `https://${schoolWithScore.website}`}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Globe className="w-4 h-4" />
                      Visit School Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Overall Snapshot - Horizontal 4-Card Grid */}
          <Card data-testid="card-overall-score">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Overall Snapshot</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Performance across key metrics</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap" data-testid="score-legend">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>80+ Outstanding</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span>70-79 Strong</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span>&lt;70 Needs Work</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                  <span>N/A Insufficient Data</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isPremium ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="snapshot-grid">
                  {/* Overall Score Card */}
                  <div className="border rounded-lg p-4 relative" data-testid="snapshot-overall">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-primary">Overall</span>
                      <div className={`w-2.5 h-2.5 rounded-full ${colorMap[scoreColor]}`} />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-bold ${
                        schoolWithScore.overall_score >= 80 ? 'text-emerald-600' :
                        schoolWithScore.overall_score >= 70 ? 'text-yellow-600' :
                        schoolWithScore.overall_score >= 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {schoolWithScore.overall_score === -1 ? 'N/A' : schoolWithScore.overall_score}
                      </span>
                      {districtAverages && schoolWithScore.overall_score >= 0 && (
                        <span className={`text-sm font-medium ${
                          schoolWithScore.overall_score > districtAverages.overallScore ? 'text-emerald-600' :
                          schoolWithScore.overall_score < districtAverages.overallScore ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {formatDelta(schoolWithScore.overall_score, districtAverages.overallScore)}
                        </span>
                      )}
                    </div>
                    {districtAverages && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Dist. avg: {districtAverages.overallScore}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {getScoreLabel(schoolWithScore.overall_score)}
                    </div>
                  </div>

                  {/* Academics Score Card */}
                  <div className="border rounded-lg p-4 relative" data-testid="snapshot-academics">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-primary">Academics</span>
                      <div className={`w-2.5 h-2.5 rounded-full ${colorMap[getScoreColor(schoolWithScore.academics_score ?? -1)]}`} />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-bold ${
                        (schoolWithScore.academics_score ?? -1) >= 80 ? 'text-emerald-600' :
                        (schoolWithScore.academics_score ?? -1) >= 70 ? 'text-yellow-600' :
                        (schoolWithScore.academics_score ?? -1) >= 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {schoolWithScore.academics_score === null || schoolWithScore.academics_score === undefined ? 'N/A' : schoolWithScore.academics_score}
                      </span>
                      {districtAverages && schoolWithScore.academics_score !== null && schoolWithScore.academics_score !== undefined && (
                        <span className={`text-sm font-medium ${
                          schoolWithScore.academics_score > districtAverages.academicsScore ? 'text-emerald-600' :
                          schoolWithScore.academics_score < districtAverages.academicsScore ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {formatDelta(schoolWithScore.academics_score, districtAverages.academicsScore)}
                        </span>
                      )}
                    </div>
                    {districtAverages && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Dist. avg: {districtAverages.academicsScore}
                      </div>
                    )}
                  </div>

                  {/* Climate Score Card */}
                  <div className="border rounded-lg p-4 relative" data-testid="snapshot-climate">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-primary">Climate</span>
                      <div className={`w-2.5 h-2.5 rounded-full ${colorMap[getScoreColor(schoolWithScore.climate_score ?? -1)]}`} />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-bold ${
                        (schoolWithScore.climate_score ?? -1) >= 80 ? 'text-emerald-600' :
                        (schoolWithScore.climate_score ?? -1) >= 70 ? 'text-yellow-600' :
                        (schoolWithScore.climate_score ?? -1) >= 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {schoolWithScore.climate_score === null || schoolWithScore.climate_score === undefined ? 'N/A' : schoolWithScore.climate_score}
                      </span>
                      {districtAverages && schoolWithScore.climate_score !== null && schoolWithScore.climate_score !== undefined && (
                        <span className={`text-sm font-medium ${
                          schoolWithScore.climate_score > districtAverages.climateScore ? 'text-emerald-600' :
                          schoolWithScore.climate_score < districtAverages.climateScore ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {formatDelta(schoolWithScore.climate_score, districtAverages.climateScore)}
                        </span>
                      )}
                    </div>
                    {districtAverages && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Dist. avg: {districtAverages.climateScore}
                      </div>
                    )}
                  </div>

                  {/* Progress Score Card */}
                  <div className="border rounded-lg p-4 relative" data-testid="snapshot-progress">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-primary">Progress</span>
                      <div className={`w-2.5 h-2.5 rounded-full ${colorMap[getScoreColor(schoolWithScore.progress_score ?? -1)]}`} />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-bold ${
                        (schoolWithScore.progress_score ?? -1) >= 80 ? 'text-emerald-600' :
                        (schoolWithScore.progress_score ?? -1) >= 70 ? 'text-yellow-600' :
                        (schoolWithScore.progress_score ?? -1) >= 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {schoolWithScore.progress_score === null || schoolWithScore.progress_score === undefined ? 'N/A' : schoolWithScore.progress_score}
                      </span>
                      {districtAverages && schoolWithScore.progress_score !== null && schoolWithScore.progress_score !== undefined && (
                        <span className={`text-sm font-medium ${
                          schoolWithScore.progress_score > districtAverages.progressScore ? 'text-emerald-600' :
                          schoolWithScore.progress_score < districtAverages.progressScore ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {formatDelta(schoolWithScore.progress_score, districtAverages.progressScore)}
                        </span>
                      )}
                    </div>
                    {districtAverages && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Dist. avg: {districtAverages.progressScore}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative" data-testid="locked-snapshot">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 blur-sm select-none pointer-events-none" aria-hidden="true">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-primary">Overall</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-emerald-600">{schoolWithScore.overall_score === -1 ? 'N/A' : schoolWithScore.overall_score}</span>
                        <span className="text-sm font-medium text-emerald-600">+8</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Dist. avg: 80</div>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-primary">Academics</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-emerald-600">92</span>
                        <span className="text-sm font-medium text-emerald-600">+12</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Dist. avg: 80</div>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-primary">Climate</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-yellow-600">78</span>
                        <span className="text-sm font-medium text-muted-foreground">±0</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Dist. avg: 78</div>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-primary">Progress</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-emerald-600">85</span>
                        <span className="text-sm font-medium text-emerald-600">+5</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Dist. avg: 80</div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-background/90 backdrop-blur-sm rounded-lg p-6 text-center shadow-lg border max-w-sm">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                        <Lock className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg mb-2">Unlock Detailed Scores</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        See how {schoolWithScore.name} compares to District {schoolWithScore.district} across all key metrics
                      </p>
                      <Link href="/pricing">
                        <Button data-testid="button-unlock-snapshot">
                          <Lock className="w-4 h-4 mr-2" />
                          Unlock for $29
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* How We Calculate Scores */}
          <Card data-testid="card-scoring-methodology">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">How We Calculate Scores</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                Our Overall Score provides a transparent, data-driven metric combining test proficiency with NYC DOE quality indicators.
              </p>
              
              {/* Formula Display */}
              <div className="bg-muted/50 rounded-lg p-4 border" data-testid="formula-display">
                <p className="text-sm font-medium mb-3">Overall Score Formula:</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono bg-background px-2 py-1 rounded border">Overall Score</span>
                  <span>=</span>
                  <span className="font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">Test Proficiency (40%)</span>
                  <span>+</span>
                  <span className="font-mono bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">Climate (30%)</span>
                  <span>+</span>
                  <span className="font-mono bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">Progress (30%)</span>
                </div>
              </div>

              {/* Component Explanations */}
              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-3" data-testid="explanation-academics">
                  <p className="font-medium text-sm">Test Proficiency (40% weight)</p>
                  <p className="text-xs text-muted-foreground">
                    Average of ELA and Math proficiency percentages from NYS grades 3-8 standardized tests. 
                    Represents the percentage of students meeting or exceeding state standards.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Note: This differs from the "Academics" subscore shown below, which is a separate NYC DOE quality metric.
                  </p>
                </div>
                <div className="border-l-4 border-green-500 pl-3" data-testid="explanation-climate">
                  <p className="font-medium text-sm">Climate Score (30% weight)</p>
                  <p className="text-xs text-muted-foreground">
                    NYC DOE metric measuring school environment via the NYC School Survey (students, teachers, parents). 
                    Includes rigorous instruction, collaborative teachers, supportive environment, and trust.
                  </p>
                </div>
                <div className="border-l-4 border-purple-500 pl-3" data-testid="explanation-progress">
                  <p className="font-medium text-sm">Progress Score (30% weight)</p>
                  <p className="text-xs text-muted-foreground">
                    NYC DOE metric tracking year-over-year student academic growth. 
                    Measures how effectively schools help students advance, regardless of starting point.
                  </p>
                </div>
              </div>

              {/* Data Sources */}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                <p className="font-medium mb-1">Data Sources:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>ELA/Math proficiency: NYC Open Data (grades 3-8 state test results)</li>
                  <li>Climate/Progress scores: NYC Department of Education School Survey and Quality Reports</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Component Scores - Only show when reliable data is available */}
          {schoolWithScore.overall_score >= 0 ? (
            isPremium ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="component-scores">
                <ScoreBar
                  label="Academics"
                  score={schoolWithScore.academics_score}
                  tooltip={METRIC_TOOLTIPS.academics.tooltip}
                  testId="academics"
                />
                <ScoreBar
                  label="Climate"
                  score={schoolWithScore.climate_score}
                  tooltip={METRIC_TOOLTIPS.climate.tooltip}
                  testId="climate"
                />
                <ScoreBar
                  label="Progress"
                  score={schoolWithScore.progress_score}
                  tooltip={METRIC_TOOLTIPS.progress.tooltip}
                  testId="progress"
                />
              </div>
            ) : (
              <Card data-testid="locked-component-scores">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-lg mb-2">Unlock Full Score Breakdown</h4>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    Understand what drives this school's performance with detailed Academics, Climate, and Progress metrics
                  </p>
                  <Link href="/pricing">
                    <Button data-testid="button-unlock-breakdown">
                      <Lock className="w-4 h-4 mr-2" />
                      Unlock for $29
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          ) : (
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" data-testid="card-insufficient-data-notice">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200">Why is there insufficient data?</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      This high school lacks the graduation rate, college readiness, or test proficiency data needed to calculate a reliable overall score. 
                      This may occur for newer schools, schools with small cohorts, or schools where data was not reported to NYC DOE. 
                      Available metrics are still shown below.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Academic Performance with ELA/Math - Only shown for schools with grades 3-8 (not pure high schools like 9-12) */}
          {!isPureHighSchool(schoolWithScore) && (
            <Card data-testid="card-academics-ela-math">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Academic Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <MetricCard
                    label="ELA Proficiency"
                    value={`${schoolWithScore.ela_proficiency}%`}
                    tooltip={METRIC_TOOLTIPS.elaProficiency.tooltip}
                    testId="ela"
                    numericValue={schoolWithScore.ela_proficiency}
                    districtAvg={districtAverages?.elaProficiency}
                  />
                  <MetricCard
                    label="Math Proficiency"
                    value={`${schoolWithScore.math_proficiency}%`}
                    tooltip={METRIC_TOOLTIPS.mathProficiency.tooltip}
                    testId="math"
                    numericValue={schoolWithScore.math_proficiency}
                    districtAvg={districtAverages?.mathProficiency}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Special Programs Section */}
          {(schoolWithScore.has_dual_language || schoolWithScore.has_gifted_talented) && (
            <Card data-testid="card-programs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5" />
                  Special Programs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schoolWithScore.has_dual_language && (
                    <div data-testid="container-dual-language-detail">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700">
                          Dual Language Program
                        </Badge>
                      </div>
                      {schoolWithScore.dual_language_languages && schoolWithScore.dual_language_languages.length > 0 && (
                        <div className="ml-1">
                          <p className="text-sm text-muted-foreground mb-2">Languages offered:</p>
                          <div className="flex flex-wrap gap-2">
                            {schoolWithScore.dual_language_languages.map((lang) => (
                              <Badge key={lang} variant="secondary" className="text-xs" data-testid={`badge-lang-${lang.toLowerCase().replace(/\s+/g, '-')}`}>
                                {lang}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Students learn academic content in two languages, developing bilingual and biliterate skills.
                      </p>
                    </div>
                  )}
                  {schoolWithScore.has_gifted_talented && (
                    <div data-testid="container-gt-detail">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant="outline" 
                          className={schoolWithScore.gt_program_type === 'citywide' 
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700' 
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
                          }
                        >
                          {schoolWithScore.gt_program_type === 'citywide' ? 'Citywide G&T Program' : 'District G&T Program'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {schoolWithScore.gt_program_type === 'citywide' 
                          ? 'Citywide program accepting students from across NYC through a competitive process.'
                          : 'District program serving academically advanced students within the district.'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* School Zone Map */}
          <SchoolZoneMap 
            schoolDbn={schoolWithScore.dbn}
            schoolName={schoolWithScore.name}
            latitude={schoolWithScore.latitude}
            longitude={schoolWithScore.longitude}
          />

          {/* Admissions & Demand Section - for K/Pre-K/3K schools */}
          <AdmissionsSection 
            dbn={schoolWithScore.dbn}
            schoolName={schoolWithScore.name}
            has3k={schoolWithScore.has_3k ?? false}
            hasPrek={schoolWithScore.has_prek ?? false}
            gradeBand={schoolWithScore.grade_band}
          />

          {/* PTA Fundraising Section */}
          {schoolWithScore.pta_fundraising_total && schoolWithScore.pta_fundraising_total > 0 && (
            <Card data-testid="card-pta-fundraising">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    PTA Fundraising
                  </CardTitle>
                  <Badge variant="outline" className="text-xs" data-testid="badge-pta-year">
                    {schoolWithScore.pta_fundraising_year}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div data-testid="container-pta-total">
                    <p className="text-3xl font-bold tabular-nums text-green-600 dark:text-green-400" data-testid="text-pta-total">
                      ${schoolWithScore.pta_fundraising_total.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Raised</p>
                  </div>
                  {schoolWithScore.pta_per_student && (
                    <div data-testid="container-pta-per-student">
                      <p className="text-3xl font-bold tabular-nums" data-testid="text-pta-per-student">
                        ${schoolWithScore.pta_per_student.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Per Student</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Source: NYC DOE Local Law 171 Report. Self-reported PTA/PA income data for the {schoolWithScore.pta_fundraising_year} school year.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Historical Trends - Only shown for schools with historical data (not pure high schools) */}
          {historicalTrend && historicalTrend.direction !== 'insufficient_data' && historicalTrend.historicalData.length >= 2 && !isPureHighSchool(schoolWithScore) && (
            isPremium ? (
              <Card data-testid="card-historical-trends">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-primary" />
                      <CardTitle>Historical Trends</CardTitle>
                    </div>
                    <Badge 
                      variant="outline"
                      className={`text-xs gap-1 ${
                        historicalTrend.direction === 'improving' 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                          : historicalTrend.direction === 'declining'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                      }`}
                      data-testid="badge-trend-direction"
                    >
                      {historicalTrend.direction === 'improving' && <TrendingUp className="w-3 h-3" />}
                      {historicalTrend.direction === 'declining' && <TrendingDown className="w-3 h-3" />}
                      {historicalTrend.direction === 'stable' && <Minus className="w-3 h-3" />}
                      {historicalTrend.direction === 'improving' && `Improving +${Math.abs(historicalTrend.changePercent)}%`}
                      {historicalTrend.direction === 'declining' && `Declining ${historicalTrend.changePercent}%`}
                      {historicalTrend.direction === 'stable' && 'Stable'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    ELA and Math proficiency trends from NYS grades 3-8 standardized tests over {historicalTrend.yearsAnalyzed} years.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-64" data-testid="chart-historical">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={historicalTrend.historicalData.map(d => ({
                          year: d.year,
                          ELA: d.ela_proficiency,
                          Math: d.math_proficiency,
                        }))}
                        margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="year" 
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                          tickFormatter={(v) => `${v}%`}
                        />
                        <RechartsTooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          labelStyle={{ 
                            color: 'hsl(var(--foreground))',
                            fontWeight: 600,
                            marginBottom: '4px'
                          }}
                          itemStyle={{ 
                            color: 'hsl(var(--foreground))',
                            padding: '2px 0'
                          }}
                          formatter={(value: number) => [`${value}%`, undefined]}
                          labelFormatter={(label) => `Year: ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="ELA" 
                          stroke="hsl(var(--chart-1))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2 }}
                          name="ELA Proficiency"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Math" 
                          stroke="hsl(var(--chart-2))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2 }}
                          name="Math Proficiency"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Historical Data Table */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm" data-testid="table-historical-data">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-medium">Year</th>
                          {historicalTrend.historicalData.map(d => (
                            <th key={d.year} className="text-center py-2 px-2 font-medium">{d.year}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 px-2 text-muted-foreground">ELA</td>
                          {historicalTrend.historicalData.map(d => (
                            <td key={d.year} className="text-center py-2 px-2 font-medium">{d.ela_proficiency ?? 'N/A'}%</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-2 px-2 text-muted-foreground">Math</td>
                          {historicalTrend.historicalData.map(d => (
                            <td key={d.year} className="text-center py-2 px-2 font-medium">{d.math_proficiency ?? 'N/A'}%</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-4 italic">
                    Note: 2020-2021 data unavailable due to COVID-19 testing cancellations. 
                    Trend calculated by comparing earliest and most recent available years ({historicalTrend.historicalData[0]?.year}-{historicalTrend.historicalData[historicalTrend.historicalData.length - 1]?.year}).
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* Premium CTA with blurred preview for non-premium users */
              <Card data-testid="card-historical-trends-premium" className="relative overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-primary" />
                      <CardTitle>Historical Trends</CardTitle>
                    </div>
                    <Badge 
                      variant="outline"
                      className="text-xs gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                    >
                      <Crown className="w-3 h-3" />
                      Premium
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    See how this school's ELA and Math scores have changed over the years.
                  </p>
                </CardHeader>
                <CardContent className="relative">
                  {/* Blurred preview */}
                  <div className="h-64 relative" data-testid="chart-historical-blurred">
                    <div className="absolute inset-0 blur-md opacity-50 pointer-events-none select-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[
                            { year: '2019', ELA: 45, Math: 42 },
                            { year: '2022', ELA: 52, Math: 48 },
                            { year: '2023', ELA: 58, Math: 55 },
                            { year: '2024', ELA: 62, Math: 59 },
                          ]}
                          margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="ELA" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                          <Line type="monotone" dataKey="Math" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Overlay CTA */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
                      <div className="text-center p-6 max-w-sm">
                        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                          <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Unlock Historical Trends</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          See {historicalTrend.yearsAnalyzed} years of ELA and Math performance data to understand if this school is improving, declining, or stable.
                        </p>
                        <Link href="/pricing">
                          <Button className="gap-2" data-testid="button-upgrade-trends">
                            <Crown className="w-4 h-4" />
                            Upgrade to Premium
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}

          {/* High School Metrics - Only shown for high schools with any HS data */}
          {isHighSchool(schoolWithScore) && (
            schoolWithScore.graduation_rate_4yr !== null ||
            schoolWithScore.graduation_rate_6yr !== null ||
            schoolWithScore.sat_avg_total !== null ||
            schoolWithScore.sat_avg_reading !== null ||
            schoolWithScore.college_readiness_rate !== null ||
            schoolWithScore.ap_course_count !== null
          ) && (
            <Card data-testid="card-high-school-metrics">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  <CardTitle>High School Outcomes</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Key metrics for evaluating high school success: graduation rates, standardized test performance, and college preparation.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Graduation Rates */}
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Graduation Rates
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {schoolWithScore.graduation_rate_4yr !== null && (
                      <HSMetricCard
                        label="4-Year Graduation Rate"
                        value={schoolWithScore.graduation_rate_4yr}
                        suffix="%"
                        description="Percentage of students graduating within 4 years of entering high school."
                        testId="grad-4yr"
                      />
                    )}
                    {schoolWithScore.graduation_rate_6yr !== null && (
                      <HSMetricCard
                        label="6-Year Graduation Rate"
                        value={schoolWithScore.graduation_rate_6yr}
                        suffix="%"
                        description="Percentage graduating within 6 years, including students who need additional time."
                        testId="grad-6yr"
                      />
                    )}
                  </div>
                </div>

                {/* SAT Scores - Historical Data */}
                {(schoolWithScore.sat_avg_reading !== null || schoolWithScore.sat_avg_total !== null) && (
                  <div className="opacity-60">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        SAT Performance
                      </h4>
                      <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300">
                        2012 Data
                      </Badge>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        This SAT data is from 2012 and may not reflect current school performance. NYC DOE no longer publishes school-level SAT data.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {schoolWithScore.sat_avg_reading !== null && (
                        <div className="bg-muted/50 rounded-lg p-3 text-center" data-testid="container-sat-reading">
                          <p className="text-2xl font-bold tabular-nums text-muted-foreground" data-testid="text-sat-reading">{schoolWithScore.sat_avg_reading}</p>
                          <p className="text-xs text-muted-foreground">Reading</p>
                        </div>
                      )}
                      {schoolWithScore.sat_avg_math !== null && (
                        <div className="bg-muted/50 rounded-lg p-3 text-center" data-testid="container-sat-math">
                          <p className="text-2xl font-bold tabular-nums text-muted-foreground" data-testid="text-sat-math">{schoolWithScore.sat_avg_math}</p>
                          <p className="text-xs text-muted-foreground">Math</p>
                        </div>
                      )}
                      {schoolWithScore.sat_avg_total !== null && (
                        <div className="bg-muted/50 rounded-lg p-3 text-center" data-testid="container-sat-total">
                          <p className="text-2xl font-bold tabular-nums text-muted-foreground" data-testid="text-sat-total">{schoolWithScore.sat_avg_total}</p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* College Readiness */}
                {(schoolWithScore.college_readiness_rate !== null || schoolWithScore.ap_course_count !== null) && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      College Preparation
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {schoolWithScore.college_readiness_rate !== null && (
                        <HSMetricCard
                          label="College & Career Readiness"
                          value={schoolWithScore.college_readiness_rate}
                          suffix="%"
                          description="Percentage of students meeting NYC's college and career readiness benchmarks."
                          testId="college-ready"
                        />
                      )}
                      {schoolWithScore.ap_course_count !== null && schoolWithScore.ap_course_count > 0 && (
                        <HSMetricCard
                          label="AP Courses Offered"
                          value={schoolWithScore.ap_course_count}
                          suffix=" courses"
                          description="Number of Advanced Placement courses available for college-level study."
                          testId="ap-courses"
                          isCount={true}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Specialized HS Note */}
                {schoolWithScore.is_specialized_hs && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800" data-testid="specialized-hs-note">
                    <div className="flex items-start gap-3">
                      <Star className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-indigo-800 dark:text-indigo-200">Specialized High School</p>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                          This is one of New York City's nine specialized high schools. Admission requires passing the 
                          Specialized High Schools Admissions Test (SHSAT) or meeting audition requirements.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* School Survey Results */}
          {(schoolWithScore.student_safety !== null || 
            schoolWithScore.teacher_quality !== null || 
            schoolWithScore.guardian_satisfaction !== null) && (
            <Card data-testid="card-survey">
              <CardHeader>
                <CardTitle>NYC School Survey Results</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Annual survey responses from students, teachers, and parents about school quality and culture.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {schoolWithScore.student_safety !== null && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Student Voice</h4>
                    <p className="text-xs text-muted-foreground mb-2">How students rate their feelings of safety, respect, and belonging at school.</p>
                    <div className="grid gap-2">
                      <SurveyMetric 
                        label="Safety & Respect" 
                        value={schoolWithScore.student_safety} 
                        districtAvg={districtAverages?.studentSafety}
                      />
                    </div>
                  </div>
                )}
                
                {schoolWithScore.teacher_quality !== null && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Teacher Perspective</h4>
                    <p className="text-xs text-muted-foreground mb-2">Teachers' views on instruction quality, professional development, and school leadership.</p>
                    <div className="grid gap-2">
                      <SurveyMetric 
                        label="Instruction Quality" 
                        value={schoolWithScore.teacher_quality} 
                        districtAvg={districtAverages?.teacherQuality}
                      />
                    </div>
                  </div>
                )}
                
                {schoolWithScore.guardian_satisfaction !== null && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Parent Feedback</h4>
                    <p className="text-xs text-muted-foreground mb-2">How parents/guardians rate their overall satisfaction with the school.</p>
                    <div className="grid gap-2">
                      <SurveyMetric 
                        label="Overall Satisfaction" 
                        value={schoolWithScore.guardian_satisfaction} 
                        districtAvg={districtAverages?.guardianSatisfaction}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* School Details */}
          <Card data-testid="card-details">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                School Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Total Enrollment</dt>
                  <dd className="text-lg font-semibold" data-testid="text-enrollment">{schoolWithScore.enrollment.toLocaleString()}</dd>
                  {/* Enrollment Breakdown by Grade Level */}
                  {(schoolWithScore.elementary_enrollment || schoolWithScore.middle_enrollment || schoolWithScore.high_school_enrollment) && (
                    <div className="mt-2 space-y-1 text-sm" data-testid="enrollment-breakdown">
                      {schoolWithScore.elementary_enrollment && schoolWithScore.elementary_enrollment > 0 && (
                        <div className="flex justify-between" data-testid="elementary-enrollment">
                          <span className="text-muted-foreground">K-5 (Elementary)</span>
                          <span className="font-medium tabular-nums">{schoolWithScore.elementary_enrollment.toLocaleString()}</span>
                        </div>
                      )}
                      {schoolWithScore.middle_enrollment && schoolWithScore.middle_enrollment > 0 && (
                        <div className="flex justify-between" data-testid="middle-enrollment">
                          <span className="text-muted-foreground">6-8 (Middle)</span>
                          <span className="font-medium tabular-nums">{schoolWithScore.middle_enrollment.toLocaleString()}</span>
                        </div>
                      )}
                      {schoolWithScore.high_school_enrollment && schoolWithScore.high_school_enrollment > 0 && (
                        <div className="flex justify-between" data-testid="hs-enrollment">
                          <span className="text-muted-foreground">9-12 (High School)</span>
                          <span className="font-medium tabular-nums">{schoolWithScore.high_school_enrollment.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Grade Span</dt>
                  <dd className="text-lg font-semibold" data-testid="text-grade-span">{schoolWithScore.grade_band}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Student-Teacher Ratio</dt>
                  <dd className="text-lg font-semibold" data-testid="text-ratio">{schoolWithScore.student_teacher_ratio}:1</dd>
                </div>
              </dl>
            </CardContent>
          </Card>


          {/* Student Demographics Card */}
          {(schoolWithScore.economic_need_index !== null || schoolWithScore.ell_percent !== null || 
            schoolWithScore.iep_percent !== null || schoolWithScore.asian_percent !== null || 
            schoolWithScore.black_percent !== null || schoolWithScore.hispanic_percent !== null || 
            schoolWithScore.white_percent !== null || schoolWithScore.multi_racial_percent !== null) && (
            <Card data-testid="card-demographics">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Student Demographics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Economic Need & Special Populations */}
                {(schoolWithScore.economic_need_index !== null || schoolWithScore.ell_percent !== null || schoolWithScore.iep_percent !== null) && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3">Economic Need & Special Populations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {schoolWithScore.economic_need_index !== null && (
                        <div className="bg-muted/50 rounded-lg p-3" data-testid="container-economic-need">
                          <p className="text-xs text-muted-foreground mb-1">Economic Need Index</p>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-2xl font-bold tabular-nums" data-testid="text-economic-need">{schoolWithScore.economic_need_index}%</p>
                            <InlineComparison 
                              value={schoolWithScore.economic_need_index} 
                              districtAvg={districtAverages?.economicNeedIndex}
                              higherIsBetter={false}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">Percentage of students facing economic hardship. Lower indicates fewer students in need.</p>
                        </div>
                      )}
                      {schoolWithScore.ell_percent !== null && (
                        <div className="bg-muted/50 rounded-lg p-3" data-testid="container-ell">
                          <p className="text-xs text-muted-foreground mb-1">ELL Students</p>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-2xl font-bold tabular-nums" data-testid="text-ell">{schoolWithScore.ell_percent}%</p>
                            <InlineComparison 
                              value={schoolWithScore.ell_percent} 
                              districtAvg={districtAverages?.ellPercent}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">Students receiving English Language Learner services.</p>
                        </div>
                      )}
                      {schoolWithScore.iep_percent !== null && (
                        <div className="bg-muted/50 rounded-lg p-3" data-testid="container-iep">
                          <p className="text-xs text-muted-foreground mb-1">IEP Students</p>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-2xl font-bold tabular-nums" data-testid="text-iep">{schoolWithScore.iep_percent}%</p>
                            <InlineComparison 
                              value={schoolWithScore.iep_percent} 
                              districtAvg={districtAverages?.iepPercent}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">Students with Individualized Education Programs for special needs.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Race/Ethnicity Demographics */}
                {(schoolWithScore.asian_percent !== null || schoolWithScore.black_percent !== null || 
                  schoolWithScore.hispanic_percent !== null || schoolWithScore.white_percent !== null || 
                  schoolWithScore.multi_racial_percent !== null) && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2" data-testid="text-diversity-title">Racial & Ethnic Diversity</h4>
                    <p className="text-xs text-muted-foreground mb-3">Percentage of students by race/ethnicity.</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="grid-diversity">
                      {schoolWithScore.asian_percent !== null && (
                        <div className="bg-muted/30 rounded-lg p-2 text-center" data-testid="container-asian-percent">
                          <p className="text-xl font-bold tabular-nums" data-testid="text-asian-percent">{schoolWithScore.asian_percent}%</p>
                          <p className="text-xs text-muted-foreground">Asian</p>
                        </div>
                      )}
                      {schoolWithScore.black_percent !== null && (
                        <div className="bg-muted/30 rounded-lg p-2 text-center" data-testid="container-black-percent">
                          <p className="text-xl font-bold tabular-nums" data-testid="text-black-percent">{schoolWithScore.black_percent}%</p>
                          <p className="text-xs text-muted-foreground">Black</p>
                        </div>
                      )}
                      {schoolWithScore.hispanic_percent !== null && (
                        <div className="bg-muted/30 rounded-lg p-2 text-center" data-testid="container-hispanic-percent">
                          <p className="text-xl font-bold tabular-nums" data-testid="text-hispanic-percent">{schoolWithScore.hispanic_percent}%</p>
                          <p className="text-xs text-muted-foreground">Hispanic/Latino</p>
                        </div>
                      )}
                      {schoolWithScore.white_percent !== null && (
                        <div className="bg-muted/30 rounded-lg p-2 text-center" data-testid="container-white-percent">
                          <p className="text-xl font-bold tabular-nums" data-testid="text-white-percent">{schoolWithScore.white_percent}%</p>
                          <p className="text-xs text-muted-foreground">White</p>
                        </div>
                      )}
                      {schoolWithScore.multi_racial_percent !== null && (
                        <div className="bg-muted/30 rounded-lg p-2 text-center" data-testid="container-multi-racial-percent">
                          <p className="text-xl font-bold tabular-nums" data-testid="text-multi-racial-percent">{schoolWithScore.multi_racial_percent}%</p>
                          <p className="text-xs text-muted-foreground">Multi-Racial</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Other Schools in District Section */}
          {topDistrictSchools.length > 0 && (
            <Card data-testid="card-other-district-schools">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Check Out Other Schools in District {schoolWithScore.district}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {topDistrictSchools.map((districtSchool, index) => {
                    const schoolSlugForLink = `${districtSchool.dbn.toLowerCase()}-${districtSchool.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
                    const schoolScoreColor = getScoreColor(districtSchool.overall_score);
                    return (
                      <Link 
                        key={districtSchool.dbn} 
                        href={`/school/${schoolSlugForLink}`}
                        className="block"
                        data-testid={`link-district-school-${index}`}
                      >
                        <div className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate" data-testid={`text-district-school-name-${index}`}>
                              {districtSchool.name}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span>{districtSchool.dbn}</span>
                              {districtSchool.grade_band && (
                                <span>• Grades {districtSchool.grade_band}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <div className={`w-3 h-3 rounded-full ${colorMap[schoolScoreColor]}`} />
                            <span className="font-bold tabular-nums" data-testid={`text-district-school-score-${index}`}>
                              {districtSchool.overall_score === -1 ? 'N/A' : districtSchool.overall_score}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-4 text-center">
                  <Link href={`/?district=${schoolWithScore.district}`}>
                    <Button variant="outline" size="sm" data-testid="button-view-all-district-schools">
                      View All District {schoolWithScore.district} Schools
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* FAQ Section */}
          <SchoolFAQ school={schoolWithScore} />

          {/* Reviews Section */}
          <ReviewsSection schoolName={schoolWithScore.name} schoolDbn={schoolWithScore.dbn} userId={user?.id} isAuthenticated={isAuthenticated} />
          
          <div className="text-xs text-muted-foreground text-center py-4 space-y-1" data-testid="text-data-source">
            <p>Data from NYC Department of Education School Survey and public records.</p>
            <p>Test scores and demographics: 2021-22 to 2022-23 | Climate/Progress: 2023-2024</p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

function ReviewsSection({ schoolName, schoolDbn, userId, isAuthenticated }: { schoolName: string; schoolDbn: string; userId?: string; isAuthenticated: boolean }) {
  const { data: stats } = useQuery<{ averageRating: number; totalReviews: number }>({
    queryKey: ["/api/schools", schoolDbn, "reviews", "stats"],
  });

  const { data: userReview, isLoading: isLoadingUserReview } = useQuery<Review | null>({
    queryKey: ["/api/schools", schoolDbn, "reviews", "user"],
    enabled: isAuthenticated && !!userId,
  });

  const [activeTab, setActiveTab] = useState("reviews");

  useEffect(() => {
    if (!isLoadingUserReview && isAuthenticated) {
      setActiveTab("write");
    } else if (!isAuthenticated) {
      setActiveTab("reviews");
    }
  }, [isAuthenticated, isLoadingUserReview]);

  return (
    <Card data-testid="card-reviews">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <CardTitle>Parent Reviews for {schoolName}</CardTitle>
          </div>
          {stats && stats.totalReviews > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={stats.averageRating} readonly size="sm" />
              <span className="text-sm text-muted-foreground">
                {stats.averageRating.toFixed(1)} ({stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isAuthenticated ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="write" data-testid="tab-write-review">Write Review</TabsTrigger>
              <TabsTrigger value="reviews" data-testid="tab-view-reviews">
                View Reviews {stats && stats.totalReviews > 0 && `(${stats.totalReviews})`}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="write" className="space-y-4">
              <ReviewForm 
                schoolDbn={schoolDbn}
                existingReview={userReview || undefined}
                onSuccess={() => setActiveTab("reviews")}
              />
            </TabsContent>
            <TabsContent value="reviews">
              <ReviewsList schoolDbn={schoolDbn} currentUserId={userId} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground mb-2">Log in to write your own review</p>
              <Link href="/login">
                <Button 
                  variant="default" 
                  size="sm" 
                  data-testid="button-login-to-review"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Log In
                </Button>
              </Link>
            </div>
            <ReviewsList schoolDbn={schoolDbn} currentUserId={userId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreBar({ label, score, tooltip, testId }: { label: string; score: number; tooltip: string; testId: string }) {
  return (
    <Card data-testid={`card-${testId}`}>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" data-testid={`label-${testId}`}>{label}</span>
            <span className="text-2xl font-bold tabular-nums" data-testid={`score-${testId}`}>{score}</span>
          </div>
          <Progress value={score} className="h-2" data-testid={`progress-${testId}`} />
          <p className="text-xs text-muted-foreground leading-relaxed" data-testid={`description-${testId}`}>{tooltip}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, tooltip, testId, numericValue, districtAvg, unit = "%" }: { 
  label: string; 
  value: string; 
  tooltip: string; 
  testId: string;
  numericValue?: number;
  districtAvg?: number | null;
  unit?: string;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-2" data-testid={`container-${testId}`}>
      <dt className="text-sm font-medium text-foreground">{label}</dt>
      <div className="flex items-center gap-2">
        <dd className="text-2xl font-bold tabular-nums" data-testid={`score-${testId}`}>{value}</dd>
        {numericValue !== undefined && districtAvg !== undefined && districtAvg !== null && (
          <InlineComparison value={numericValue} districtAvg={districtAvg} unit={unit} />
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed" data-testid={`description-${testId}`}>{tooltip}</p>
    </div>
  );
}

function SurveyMetric({ label, value, districtAvg }: { label: string; value: number; districtAvg?: number | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">{value}%</span>
        {districtAvg !== undefined && districtAvg !== null && (
          <InlineComparison value={value} districtAvg={districtAvg} unit="%" />
        )}
      </div>
    </div>
  );
}

function ComparisonStat({ label, schoolValue, districtAvg, unit = "" }: { 
  label: string; 
  schoolValue: number; 
  districtAvg?: number;
  unit?: string;
}) {
  if (districtAvg === undefined || districtAvg === null || isNaN(districtAvg)) {
    return (
      <div className="bg-muted/30 rounded-md p-2" data-testid={`comparison-stat-${label.toLowerCase()}`}>
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div className="flex items-center gap-1">
          <span className="font-semibold">{schoolValue}{unit}</span>
        </div>
        <div className="text-xs text-muted-foreground">Dist. avg: N/A</div>
      </div>
    );
  }
  
  const diff = schoolValue - districtAvg;
  const isPositive = diff > 0;
  const isNeutral = Math.abs(diff) < 2;
  
  const getColor = () => {
    if (isNeutral) return "text-yellow-600 dark:text-yellow-400";
    return isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  };
  
  const getArrow = () => {
    if (isNeutral) return "→";
    return isPositive ? "↑" : "↓";
  };

  return (
    <div className="bg-muted/30 rounded-md p-2" data-testid={`comparison-stat-${label.toLowerCase()}`}>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="flex items-center gap-1">
        <span className="font-semibold">{schoolValue}{unit}</span>
        <span className={`text-xs ${getColor()}`}>
          {getArrow()} {isPositive ? "+" : ""}{diff.toFixed(0)}{unit}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        Dist. avg: {districtAvg.toFixed(0)}{unit}
      </div>
    </div>
  );
}

function HSMetricCard({ 
  label, 
  value, 
  suffix, 
  description, 
  testId,
  isCount = false 
}: { 
  label: string; 
  value: number; 
  suffix: string; 
  description: string; 
  testId: string;
  isCount?: boolean;
}) {
  const getColor = () => {
    if (isCount) return "text-foreground";
    if (value >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (value >= 80) return "text-yellow-600 dark:text-yellow-400";
    if (value >= 70) return "text-violet-600 dark:text-violet-400";
    return "text-red-600 dark:text-red-400";
  };

  const getIndicatorColor = () => {
    if (isCount) return "bg-primary";
    if (value >= 90) return "bg-emerald-500";
    if (value >= 80) return "bg-yellow-500";
    if (value >= 70) return "bg-violet-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-2" data-testid={`container-${testId}`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getIndicatorColor()}`} />
        <dt className="text-sm font-medium text-foreground">{label}</dt>
      </div>
      <dd className={`text-2xl font-bold tabular-nums ${getColor()}`} data-testid={`text-${testId}`}>
        {value}{suffix}
      </dd>
      <p className="text-xs text-muted-foreground leading-relaxed" data-testid={`description-${testId}`}>
        {description}
      </p>
    </div>
  );
}
