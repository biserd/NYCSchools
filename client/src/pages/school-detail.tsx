import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { School, SchoolWithOverallScore, calculateOverallScore, getAssessmentConfidence, ASSESSMENT_PARTICIPATION_THRESHOLD, ASSESSMENT_MINIMUM_TESTED_COUNT, getScoreColor, Review, getQualityRatingLabel, getQualityRatingBadgeClasses, isHighSchool, isPureHighSchool, getMetricColor, type SchoolTrend, type HsGraduation, type HsRegents, type SchoolAttendance, type SchoolDiscipline, type HsAdmissionsProgram, REGENTS_EXAMS, getSchoolSlug } from "@shared/schema";
import { getBoroughFromDBN } from "@shared/boroughMapping";
import { METRIC_TOOLTIPS } from "@shared/metricHelp";
import { CommuteTime } from "@/components/CommuteTime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Footer } from "@/components/Footer";
import { SafetyIndexCard } from "@/components/SafetyIndexCard";
import { SEOHead } from "@/components/SEOHead";
import { getSchoolSeoMeta } from "@shared/school-seo";
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
  Globe,
  Mail,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCheckout } from "@/hooks/useCheckout";
import { useFreeSchoolView } from "@/hooks/useFreeSchoolView";

interface SubscriptionStatus {
  status: string;
  plan: string;
}

function useChartLegendToggle() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const handleLegendClick = useCallback((e: any) => {
    const key = e.dataKey || e.value;
    if (!key) return;
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const isHidden = useCallback((key: string) => hidden.has(key), [hidden]);
  return { hidden, handleLegendClick, isHidden };
}

function InteractiveLegend({ payload, hidden, onClick }: { payload?: any[]; hidden: Set<string>; onClick: (e: any) => void }) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2" data-testid="interactive-legend">
      {payload.map((entry: any) => {
        const key = entry.dataKey;
        if (!key) return null;
        const isOff = hidden.has(key);
        return (
          <button
            key={key}
            type="button"
            className={`flex items-center gap-1.5 text-xs cursor-pointer select-none transition-opacity ${isOff ? "opacity-35" : "opacity-100"}`}
            onClick={() => onClick({ ...entry, dataKey: key })}
            data-testid={`legend-toggle-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
          >
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
            <span className={isOff ? "line-through" : ""}>{entry.value}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChartSourceLink({ text, url, testId }: { text: string; url?: string; testId?: string }) {
  return (
    <p className="text-xs text-muted-foreground mt-2 text-center" data-testid={testId}>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2">
          {text}
        </a>
      ) : text}
      {" "}
      <span className="italic">Click legend items to show/hide series.</span>
    </p>
  );
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

  const { startCheckout, isLoading: checkoutLoading, isPending: checkoutPending } = useCheckout();

  const historicalLegend = useChartLegendToggle();
  const gradLegend = useChartLegendToggle();
  const regentsLegend = useChartLegendToggle();
  const attendanceLegend = useChartLegendToggle();
  const disciplineLegend = useChartLegendToggle();

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

  const isHS = school ? isHighSchool(school) : false;
  const assessmentConfidence = school && !isHS ? getAssessmentConfidence(school) : null;

  const { data: graduationData } = useQuery<HsGraduation[]>({
    queryKey: ["/api/schools", dbn, "graduation"],
    enabled: !!dbn && isHS,
    staleTime: 1000 * 60 * 10,
  });

  const { data: regentsData } = useQuery<HsRegents[]>({
    queryKey: ["/api/schools", dbn, "regents"],
    enabled: !!dbn && isHS,
    staleTime: 1000 * 60 * 10,
  });

  const { data: attendanceData } = useQuery<SchoolAttendance[]>({
    queryKey: ["/api/schools", dbn, "attendance"],
    enabled: !!dbn,
    staleTime: 1000 * 60 * 10,
  });

  const { data: disciplineData } = useQuery<SchoolDiscipline[]>({
    queryKey: ["/api/schools", dbn, "discipline"],
    enabled: !!dbn,
    staleTime: 1000 * 60 * 10,
  });

  const { data: admissionsData } = useQuery<HsAdmissionsProgram[]>({
    queryKey: ["/api/schools", dbn, "admissions-programs"],
    enabled: !!dbn && isHS,
    staleTime: 1000 * 60 * 10,
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

  const { title: schoolTitle, description: schoolDescription } = getSchoolSeoMeta(schoolWithScore);
  const schoolSlug = getSchoolSlug(schoolWithScore);

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
        title={schoolTitle}
        description={schoolDescription}
        keywords={`${schoolWithScore.name}, NYC school, District ${schoolWithScore.district}, ${borough} schools, kindergarten, elementary school, school ratings`}
        canonicalPath={`/school/${schoolSlug}`}
        appendSiteName={false}
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

          {/* School Prose Introduction — applies to all schools */}
          {schoolWithScore && (() => {
            const boroughLabel =
              schoolWithScore.dbn?.charAt(2) === 'M' ? 'Manhattan' :
              schoolWithScore.dbn?.charAt(2) === 'X' ? 'the Bronx' :
              schoolWithScore.dbn?.charAt(2) === 'K' ? 'Brooklyn' :
              schoolWithScore.dbn?.charAt(2) === 'Q' ? 'Queens' : 'Staten Island';
            const gradeBand = schoolWithScore.grade_band ?? 'K-5';
            const enrollmentText = schoolWithScore.enrollment != null
              ? ` and serves approximately ${schoolWithScore.enrollment.toLocaleString()} students`
              : '';
            const programs: string[] = [];
            if (schoolWithScore.has_gifted_talented) {
              programs.push(`a ${schoolWithScore.gt_program_type === 'citywide' ? 'Citywide' : 'District'} Gifted & Talented program`);
            }
            if (schoolWithScore.has_dual_language) programs.push('a Dual Language program');
            if (schoolWithScore.has_3k) programs.push('3-K');
            if (schoolWithScore.has_prek && !schoolWithScore.has_3k) programs.push('Pre-K');

            return (
              <div className="text-muted-foreground leading-relaxed" data-testid="text-school-intro">
                {gradeBand === '2K' ? (
                  <p>
                    {schoolWithScore.name} is a 2-K program site in District {schoolWithScore.district}, part of New York City&apos;s
                    early childhood education expansion offering care and learning for 2-year-olds.
                    2-K programs are run by community-based providers and family childcare organizations;
                    contact the provider directly for enrollment details and seat availability.
                  </p>
                ) : isHS && schoolWithScore.is_specialized_hs ? (
                  <p>
                    {schoolWithScore.name} is one of NYC&apos;s nine specialized high schools,
                    consistently ranked among the top public high schools in the United States.
                    Admission requires passing the Specialized High Schools Admissions Test (SHSAT) —
                    cutoff scores vary each year based on test difficulty and the applicant pool.
                    {schoolWithScore.graduation_rate_4yr != null && ` With a ${schoolWithScore.graduation_rate_4yr}% graduation rate`}
                    {schoolWithScore.ap_course_count != null && schoolWithScore.ap_course_count > 0 && ` and ${schoolWithScore.ap_course_count} AP courses`}
                    {(schoolWithScore.graduation_rate_4yr != null || (schoolWithScore.ap_course_count != null && schoolWithScore.ap_course_count > 0)) && `, it is one of the most academically rigorous public schools in New York City.`}
                  </p>
                ) : isHS ? (
                  <p>
                    {schoolWithScore.name} is a public high school in {boroughLabel}, District {schoolWithScore.district}, serving grades {gradeBand}
                    {schoolWithScore.enrollment != null && ` with approximately ${schoolWithScore.enrollment.toLocaleString()} students`}.
                    {schoolWithScore.graduation_rate_4yr != null && ` It has a ${schoolWithScore.graduation_rate_4yr}% 4-year graduation rate`}
                    {schoolWithScore.college_readiness_rate != null && ` and ${schoolWithScore.college_readiness_rate}% of graduates meet college-readiness benchmarks`}
                    {(schoolWithScore.graduation_rate_4yr != null || schoolWithScore.college_readiness_rate != null) && '.'}
                    {schoolWithScore.ap_course_count != null && schoolWithScore.ap_course_count > 0 && ` The school offers ${schoolWithScore.ap_course_count} AP courses.`}
                    {schoolWithScore.hs_admission_method && ` Admissions are ${schoolWithScore.hs_admission_method}.`}
                  </p>
                ) : (
                  <p>
                    {schoolWithScore.name} is a public {gradeBand.toLowerCase().includes('6') && !gradeBand.toLowerCase().includes('k') ? 'middle' : gradeBand.toLowerCase().includes('k') ? 'elementary' : ''} school in {boroughLabel}, District {schoolWithScore.district}, offering grades {gradeBand}{enrollmentText}.
                    {schoolWithScore.ela_proficiency != null && ` Students achieve ${schoolWithScore.ela_proficiency}% proficiency in ELA`}
                    {schoolWithScore.ela_proficiency != null && schoolWithScore.math_proficiency != null && ' and'}
                    {schoolWithScore.math_proficiency != null && ` ${schoolWithScore.math_proficiency}% in Math`}
                    {(schoolWithScore.ela_proficiency != null || schoolWithScore.math_proficiency != null) && ' on NYC state assessments.'}
                    {programs.length > 0 && ` The school offers ${programs.join(', ')}.`}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Two-Column Layout: Location & School Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Location & Zone Map - Takes 2 columns */}
            <div className="lg:col-span-2" data-testid="card-location">
              <SchoolZoneMap
                schoolDbn={schoolWithScore.dbn}
                schoolName={schoolWithScore.name}
                latitude={schoolWithScore.latitude}
                longitude={schoolWithScore.longitude}
                address={schoolWithScore.address}
              >
                <CommuteTime schoolDbn={schoolWithScore.dbn} />
              </SchoolZoneMap>
              <div className="mt-4">
                <SafetyIndexCard
                  schoolType="public"
                  schoolKey={schoolWithScore.dbn}
                  schoolName={schoolWithScore.name}
                />
              </div>
            </div>

            {/* School Information Card */}
            <Card className="self-start" data-testid="card-school-info">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">School Information</CardTitle>
                  <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-400" data-testid="badge-unclaimed">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Unclaimed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Profile Not Claimed Notice */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3" data-testid="notice-unclaimed">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Profile Not Claimed</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Information shown is from public sources. School administrators can claim this profile to verify details and add contact information.
                      </p>
                    </div>
                  </div>
                  <Link href="/contact">
                    <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white" data-testid="button-claim-profile">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Claim School Profile
                    </Button>
                  </Link>
                </div>

                {/* Phone */}
                <div data-testid="info-phone">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Phone</span>
                  </div>
                  <div className={schoolWithScore.phone ? "font-medium" : "text-sm text-muted-foreground italic"}>
                    {schoolWithScore.phone || "Not provided"}
                  </div>
                </div>
                
                {/* Email */}
                <div data-testid="info-email">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </div>
                  <div className="text-sm text-muted-foreground italic">
                    Not provided
                  </div>
                </div>
                
                {/* Website */}
                <div data-testid="info-website">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Website</span>
                  </div>
                  {schoolWithScore.website ? (
                    <a 
                      href={schoolWithScore.website.startsWith('http') ? schoolWithScore.website : `https://${schoolWithScore.website}`}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {schoolWithScore.website}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">Not provided</div>
                  )}
                </div>
                
                {/* Principal */}
                <div data-testid="info-principal">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>Principal</span>
                  </div>
                  <div className={schoolWithScore.principal_name ? "font-medium uppercase" : "text-sm text-muted-foreground italic"}>
                    {schoolWithScore.principal_name || "Not provided"}
                  </div>
                </div>
                
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
                    {assessmentConfidence === "low" ? "Withheld: limited test participation" : getScoreLabel(schoolWithScore.overall_score)}
                  </div>
                </div>
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
                      {assessmentConfidence === "low" ? "Withheld: limited test participation" : getScoreLabel(schoolWithScore.overall_score)}
                    </div>
                    {assessmentConfidence === "low" && (
                      <div className="mt-2 text-xs text-amber-700 dark:text-amber-300" data-testid="overall-participation-warning">
                        ELA: {schoolWithScore.ela_tested_count ?? "N/A"} tested · Math: {schoolWithScore.math_tested_count ?? "N/A"} tested
                      </div>
                    )}
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
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 blur-md select-none pointer-events-none" aria-hidden="true">
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
                        <Button data-testid="button-unlock-snapshot" onClick={startCheckout} disabled={checkoutPending}>
                          {checkoutPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                          {checkoutPending ? "Loading..." : "Unlock for $29"}
                        </Button>
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
              {!isHS && (
                <div className={`rounded-md border p-3 text-sm ${assessmentConfidence === "low" ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20" : "bg-muted/40"}`} data-testid="assessment-confidence-explanation">
                  <p className="font-medium">
                    {assessmentConfidence === "low" ? "Overall rating withheld" : assessmentConfidence === "unknown" ? "Test participation not reported" : "Test participation meets the rating threshold"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    We withhold proficiency-driven ratings below {ASSESSMENT_PARTICIPATION_THRESHOLD}% participation, or when the participation rate is unavailable and fewer than {ASSESSMENT_MINIMUM_TESTED_COUNT} students took either subject.
                    {" "}ELA: {schoolWithScore.ela_participation_rate != null ? `${schoolWithScore.ela_participation_rate}%` : `${schoolWithScore.ela_tested_count ?? "N/A"} tested`};
                    {" "}Math: {schoolWithScore.math_participation_rate != null ? `${schoolWithScore.math_participation_rate}%` : `${schoolWithScore.math_tested_count ?? "N/A"} tested`}.
                  </p>
                </div>
              )}
              
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
                    This is the Academics score used throughout the site.
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
                  <li>ELA/Math proficiency: {schoolWithScore.assessment_source || "NYSED Grades 3-8 Results"} ({schoolWithScore.assessment_year || "year not reported"})</li>
                  <li>Climate/Progress scores: 2024-25 NYC Department of Education School Survey and Quality Reports</li>
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
                    <Button data-testid="button-unlock-breakdown" onClick={startCheckout} disabled={checkoutPending}>
                      {checkoutPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                      {checkoutPending ? "Loading..." : "Unlock for $29"}
                    </Button>
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

          {/* Academic Performance with ELA/Math/Science - Only shown for schools with grades 3-8 (not pure high schools like 9-12) */}
          {!isPureHighSchool(schoolWithScore) && (schoolWithScore.ela_proficiency != null || schoolWithScore.math_proficiency != null || schoolWithScore.science_proficiency != null) && (
            <Card data-testid="card-academics-ela-math">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Academic Performance
                  </div>
                  {schoolWithScore.assessment_year && (
                    <span className="text-xs font-normal text-muted-foreground" data-testid="text-assessment-source">
                      {schoolWithScore.assessment_year} | {schoolWithScore.assessment_source || 'NYSED'}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {schoolWithScore.ela_proficiency != null && (
                    <MetricCard
                      label="ELA Proficiency"
                      value={`${schoolWithScore.ela_proficiency}%`}
                      tooltip={METRIC_TOOLTIPS.elaProficiency.tooltip}
                      testId="ela"
                      numericValue={schoolWithScore.ela_proficiency}
                      districtAvg={districtAverages?.elaProficiency}
                    />
                  )}
                  {schoolWithScore.math_proficiency != null && (
                    <MetricCard
                      label="Math Proficiency"
                      value={`${schoolWithScore.math_proficiency}%`}
                      tooltip={METRIC_TOOLTIPS.mathProficiency.tooltip}
                      testId="math"
                      numericValue={schoolWithScore.math_proficiency}
                      districtAvg={districtAverages?.mathProficiency}
                    />
                  )}
                  {schoolWithScore.science_proficiency != null && (
                    <MetricCard
                      label="Science Proficiency"
                      value={`${schoolWithScore.science_proficiency}%`}
                      tooltip={METRIC_TOOLTIPS.scienceProficiency.tooltip}
                      testId="science"
                      numericValue={schoolWithScore.science_proficiency}
                    />
                  )}
                </div>
                
                {/* Grade-Level Breakdown */}
                {(schoolWithScore.ela_grade3 != null || schoolWithScore.ela_grade4 != null || schoolWithScore.ela_grade5 != null || 
                  schoolWithScore.ela_grade6 != null || schoolWithScore.ela_grade7 != null || schoolWithScore.ela_grade8 != null ||
                  schoolWithScore.math_grade3 != null || schoolWithScore.math_grade4 != null || schoolWithScore.math_grade5 != null || 
                  schoolWithScore.math_grade6 != null || schoolWithScore.math_grade7 != null || schoolWithScore.math_grade8 != null) && (
                  <div className="mt-6 pt-4 border-t" data-testid="container-grade-breakdown">
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-1">Scores by Grade</h4>
                      <p className="text-xs text-muted-foreground">Percentage of students scoring proficient (Level 3+4) on state tests in each grade. Data from NYC DOE.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" data-testid="table-grade-breakdown">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Subject</th>
                            {[3, 4, 5, 6, 7, 8].map(grade => {
                              const elaKey = `ela_grade${grade}` as keyof typeof schoolWithScore;
                              const mathKey = `math_grade${grade}` as keyof typeof schoolWithScore;
                              if (schoolWithScore[elaKey] != null || schoolWithScore[mathKey] != null) {
                                return <th key={grade} className="text-center py-2 px-3 font-medium text-muted-foreground">Grade {grade}</th>;
                              }
                              return null;
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 pr-4 font-medium">ELA</td>
                            {[3, 4, 5, 6, 7, 8].map(grade => {
                              const elaKey = `ela_grade${grade}` as keyof typeof schoolWithScore;
                              const mathKey = `math_grade${grade}` as keyof typeof schoolWithScore;
                              const elaScore = schoolWithScore[elaKey] as number | null;
                              const mathScore = schoolWithScore[mathKey] as number | null;
                              if (elaScore != null || mathScore != null) {
                                return (
                                  <td key={grade} className="text-center py-2 px-3" data-testid={`cell-ela-grade${grade}`}>
                                    {elaScore != null ? (
                                      <span className={`font-semibold ${elaScore >= 60 ? 'text-green-600 dark:text-green-400' : elaScore >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {elaScore}%
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                );
                              }
                              return null;
                            })}
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 font-medium">Math</td>
                            {[3, 4, 5, 6, 7, 8].map(grade => {
                              const elaKey = `ela_grade${grade}` as keyof typeof schoolWithScore;
                              const mathKey = `math_grade${grade}` as keyof typeof schoolWithScore;
                              const elaScore = schoolWithScore[elaKey] as number | null;
                              const mathScore = schoolWithScore[mathKey] as number | null;
                              if (elaScore != null || mathScore != null) {
                                return (
                                  <td key={grade} className="text-center py-2 px-3" data-testid={`cell-math-grade${grade}`}>
                                    {mathScore != null ? (
                                      <span className={`font-semibold ${mathScore >= 60 ? 'text-green-600 dark:text-green-400' : mathScore >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {mathScore}%
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                );
                              }
                              return null;
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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
                    ELA, Math{historicalTrend.historicalData.some(d => d.science_proficiency != null) ? ', and Science' : ''} proficiency trends from NYS standardized tests over {historicalTrend.yearsAnalyzed} years.
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
                          Science: d.science_proficiency,
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
                        <Legend content={({ payload }) => <InteractiveLegend payload={payload} hidden={historicalLegend.hidden} onClick={historicalLegend.handleLegendClick} />} />
                        <Line 
                          type="monotone" 
                          dataKey="ELA" 
                          stroke="hsl(var(--chart-1))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2 }}
                          name="ELA Proficiency"
                          hide={historicalLegend.isHidden("ELA")}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Math" 
                          stroke="hsl(var(--chart-2))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2 }}
                          name="Math Proficiency"
                          hide={historicalLegend.isHidden("Math")}
                        />
                        {historicalTrend.historicalData.some(d => d.science_proficiency != null) && (
                          <Line 
                            type="monotone" 
                            dataKey="Science" 
                            stroke="hsl(var(--chart-3))" 
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 2 }}
                            name="Science Proficiency"
                            hide={historicalLegend.isHidden("Science")}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <ChartSourceLink
                    text="Source: NYSED State Report Card Database (2015-2024)"
                    url="https://data.nysed.gov/reportcard.php"
                    testId="source-historical"
                  />
                  
                  {/* Historical Data Table */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm" data-testid="table-historical-data">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-medium">Subject</th>
                          {historicalTrend.historicalData.map(d => (
                            <th key={d.year} className="text-center py-2 px-2 font-medium">{d.year}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 px-2 text-muted-foreground">ELA</td>
                          {historicalTrend.historicalData.map(d => (
                            <td key={d.year} className="text-center py-2 px-2 font-medium">{d.ela_proficiency != null ? `${d.ela_proficiency}%` : '—'}</td>
                          ))}
                        </tr>
                        <tr className={historicalTrend.historicalData.some(d => d.science_proficiency != null) ? 'border-b' : ''}>
                          <td className="py-2 px-2 text-muted-foreground">Math</td>
                          {historicalTrend.historicalData.map(d => (
                            <td key={d.year} className="text-center py-2 px-2 font-medium">{d.math_proficiency != null ? `${d.math_proficiency}%` : '—'}</td>
                          ))}
                        </tr>
                        {historicalTrend.historicalData.some(d => d.science_proficiency != null) && (
                          <tr>
                            <td className="py-2 px-2 text-muted-foreground">Science</td>
                            {historicalTrend.historicalData.map(d => (
                              <td key={d.year} className="text-center py-2 px-2 font-medium">{d.science_proficiency != null ? `${d.science_proficiency}%` : '—'}</td>
                            ))}
                          </tr>
                        )}
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
                          <Button className="gap-2" data-testid="button-upgrade-trends" onClick={startCheckout} disabled={checkoutPending}>
                            {checkoutPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                            {checkoutPending ? "Loading..." : "Upgrade to Premium"}
                          </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}

          {/* High School Performance Dashboard - Only shown for high schools */}
          {isHS && (
            <>
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

              {/* Graduation Outcomes - Hero Section for HS */}
              <Card data-testid="card-graduation-outcomes">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <CardTitle>Graduation Outcomes</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Multi-year graduation rates, diploma types, and dropout data from NYC DOE InfoHub.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {graduationData && graduationData.length > 0 ? (
                    <>
                      {/* Latest cohort headline stats */}
                      {(() => {
                        const latest = graduationData[0];
                        return (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <Badge variant="outline" className="text-xs" data-testid="badge-cohort-label">
                                {latest.cohort_label || `Cohort ${latest.cohort_year}`}
                              </Badge>
                              {latest.total_cohort && (
                                <span className="text-xs text-muted-foreground">{latest.total_cohort.toLocaleString()} students in cohort</span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {latest.grad_rate_4yr !== null && (
                                <HSMetricCard label="4-Year Grad Rate" value={latest.grad_rate_4yr} suffix="%" description="Students graduating within 4 years." testId="grad-4yr" />
                              )}
                              {latest.grad_rate_5yr !== null && (
                                <HSMetricCard label="5-Year Grad Rate" value={latest.grad_rate_5yr} suffix="%" description="Students graduating within 5 years." testId="grad-5yr" />
                              )}
                              {latest.grad_rate_6yr !== null && (
                                <HSMetricCard label="6-Year Grad Rate" value={latest.grad_rate_6yr} suffix="%" description="Students graduating within 6 years." testId="grad-6yr" />
                              )}
                              {latest.dropout_rate !== null && (
                                <HSMetricCard label="Dropout Rate" value={latest.dropout_rate} suffix="%" description="Students who left school without graduating." testId="dropout-rate" isNegative />
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Diploma Breakdown */}
                      {(() => {
                        const latest = graduationData[0];
                        const hasDiplomaData = latest.diploma_regents_pct !== null || latest.diploma_advanced_regents_pct !== null || latest.diploma_local_pct !== null;
                        if (!hasDiplomaData) return null;
                        return (
                          <div>
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Award className="w-4 h-4" />
                              Diploma Breakdown
                            </h4>
                            <div className="grid grid-cols-3 gap-3">
                              {latest.diploma_advanced_regents_pct !== null && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center border border-emerald-200 dark:border-emerald-800" data-testid="container-adv-regents">
                                  <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300" data-testid="text-adv-regents">{latest.diploma_advanced_regents_pct}%</p>
                                  <p className="text-xs text-muted-foreground mt-1">Advanced Regents</p>
                                </div>
                              )}
                              {latest.diploma_regents_pct !== null && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center border border-blue-200 dark:border-blue-800" data-testid="container-regents-diploma">
                                  <p className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-300" data-testid="text-regents-diploma">{latest.diploma_regents_pct}%</p>
                                  <p className="text-xs text-muted-foreground mt-1">Regents Diploma</p>
                                </div>
                              )}
                              {latest.diploma_local_pct !== null && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center border border-amber-200 dark:border-amber-800" data-testid="container-local-diploma">
                                  <p className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300" data-testid="text-local-diploma">{latest.diploma_local_pct}%</p>
                                  <p className="text-xs text-muted-foreground mt-1">Local Diploma</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Graduation Rate Trend Chart */}
                      {graduationData.length >= 2 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Graduation Rate Trends
                          </h4>
                          <p className="text-xs text-muted-foreground mb-3">
                            Compares 4-year, 5-year, and 6-year graduation rates alongside dropout rates across cohorts.
                          </p>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={[...graduationData].reverse().map(g => ({
                                label: g.cohort_label || `${g.cohort_year}`,
                                '4-Year': g.grad_rate_4yr,
                                '5-Year': g.grad_rate_5yr,
                                '6-Year': g.grad_rate_6yr,
                                'Dropout': g.dropout_rate,
                              }))}>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                                <RechartsTooltip formatter={(value: number) => [`${value}%`]} />
                                <Legend content={({ payload }) => <InteractiveLegend payload={payload} hidden={gradLegend.hidden} onClick={gradLegend.handleLegendClick} />} />
                                <Line type="monotone" dataKey="4-Year" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} hide={gradLegend.isHidden("4-Year")} />
                                <Line type="monotone" dataKey="5-Year" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} hide={gradLegend.isHidden("5-Year")} />
                                <Line type="monotone" dataKey="6-Year" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} hide={gradLegend.isHidden("6-Year")} />
                                <Line type="monotone" dataKey="Dropout" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" hide={gradLegend.isHidden("Dropout")} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <ChartSourceLink
                            text="Source: NYC DOE InfoHub Graduation Results (2015-2023)"
                            url="https://infohub.nyced.org/reports/academics/graduation-results"
                            testId="source-graduation"
                          />
                        </div>
                      )}

                      {/* Subgroup Graduation Rates */}
                      {(() => {
                        const latest = graduationData[0];
                        const subgroups = [
                          { label: 'Male', value: latest.grad_rate_male },
                          { label: 'Female', value: latest.grad_rate_female },
                          { label: 'Asian', value: latest.grad_rate_asian },
                          { label: 'Black', value: latest.grad_rate_black },
                          { label: 'Hispanic', value: latest.grad_rate_hispanic },
                          { label: 'White', value: latest.grad_rate_white },
                          { label: 'ELL', value: latest.grad_rate_ell },
                          { label: 'SWD', value: latest.grad_rate_swd },
                          { label: 'Econ. Disadv.', value: latest.grad_rate_econ_disadv },
                        ].filter(s => s.value !== null);

                        if (subgroups.length === 0) return null;

                        return isPremium ? (
                          <div>
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              4-Year Grad Rate by Subgroup
                            </h4>
                            <div className="space-y-2">
                              {subgroups.map(sg => (
                                <div key={sg.label} className="flex items-center gap-3" data-testid={`subgroup-grad-${sg.label.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                                  <span className="text-sm w-28 shrink-0 text-muted-foreground">{sg.label}</span>
                                  <div className="flex-1 bg-muted/50 rounded-full h-5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${(sg.value ?? 0) >= 80 ? 'bg-emerald-500' : (sg.value ?? 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                      style={{ width: `${Math.min(sg.value ?? 0, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium tabular-nums w-12 text-right">{sg.value}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="filter blur-sm pointer-events-none opacity-50">
                              <h4 className="font-semibold text-sm mb-3">4-Year Grad Rate by Subgroup</h4>
                              <div className="space-y-2">
                                {subgroups.slice(0, 3).map(sg => (
                                  <div key={sg.label} className="flex items-center gap-3">
                                    <span className="text-sm w-28 shrink-0">{sg.label}</span>
                                    <div className="flex-1 bg-muted/50 rounded-full h-5" />
                                    <span className="text-sm w-12 text-right">--</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Button data-testid="button-unlock-subgroups" onClick={startCheckout} disabled={checkoutPending}>
                                  {checkoutPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                                  {checkoutPending ? "Loading..." : "Unlock Subgroup Data"}
                                </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    /* Fallback to basic fields if no detailed graduation data */
                    (schoolWithScore.graduation_rate_4yr !== null || schoolWithScore.graduation_rate_6yr !== null) ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {schoolWithScore.graduation_rate_4yr !== null && (
                          <HSMetricCard label="4-Year Graduation Rate" value={schoolWithScore.graduation_rate_4yr} suffix="%" description="Percentage of students graduating within 4 years." testId="grad-4yr" />
                        )}
                        {schoolWithScore.graduation_rate_6yr !== null && (
                          <HSMetricCard label="6-Year Graduation Rate" value={schoolWithScore.graduation_rate_6yr} suffix="%" description="Percentage graduating within 6 years." testId="grad-6yr" />
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground italic">
                        Graduation outcome data is not yet available for this school. Data will be added as NYC DOE InfoHub files are imported.
                      </div>
                    )
                  )}
                </CardContent>
              </Card>

              {/* Regents Exam Performance */}
              <Card data-testid="card-regents-performance" className={!isPremium ? "relative overflow-hidden" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      <CardTitle>Regents Exam Performance</CardTitle>
                    </div>
                    {!isPremium && (
                      <Badge 
                        variant="outline"
                        className="text-xs gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                      >
                        <Crown className="w-3 h-3" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    School-level pass rates for core Regents exams. Pass = 65+, College Ready = 80+.
                  </p>
                </CardHeader>
                {!isPremium ? (
                  <CardContent className="relative">
                    <div className="h-64 relative" data-testid="regents-blurred">
                      <div className="absolute inset-0 blur-md opacity-50 pointer-events-none select-none">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={[
                              { year: '2019', Algebra: 72, English: 85, Living: 68 },
                              { year: '2022', Algebra: 68, English: 80, Living: 65 },
                              { year: '2023', Algebra: 75, English: 82, Living: 70 },
                              { year: '2024', Algebra: 78, English: 88, Living: 73 },
                            ]}
                            margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                            <Line type="monotone" dataKey="Algebra" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                            <Line type="monotone" dataKey="English" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                            <Line type="monotone" dataKey="Living" stroke="hsl(var(--chart-3))" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
                        <div className="text-center p-6 max-w-sm">
                          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2">Unlock Regents Exam Data</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            View detailed Regents pass rates, college readiness scores, and multi-year trends for each exam subject.
                          </p>
                            <Button className="gap-2" data-testid="button-upgrade-regents" onClick={startCheckout} disabled={checkoutPending}>
                              {checkoutPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                              {checkoutPending ? "Loading..." : "Upgrade to Premium"}
                            </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                ) : (
                <CardContent>
                  {regentsData && regentsData.length > 0 ? (
                    (() => {
                      const years = [...new Set(regentsData.map(r => r.year))].sort((a, b) => b - a);
                      const latestYear = years[0];
                      const latestExams = regentsData.filter(r => r.year === latestYear);
                      const olderYears = years.filter(y => y !== latestYear);

                      return (
                        <div className="space-y-6">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs" data-testid="badge-regents-year">
                              {latestYear}-{String(latestYear + 1).slice(-2)} School Year
                            </Badge>
                          </div>

                          {/* Regents Grid */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm" data-testid="table-regents">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Exam</th>
                                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Tested</th>
                                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Pass Rate</th>
                                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">College Ready</th>
                                  {latestExams.some(e => e.mean_score !== null) && (
                                    <th className="text-right py-2 pl-3 font-medium text-muted-foreground">Avg Score</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {latestExams.map(exam => (
                                  <tr key={exam.exam_name} className="border-b last:border-0" data-testid={`row-regents-${exam.exam_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                                    <td className="py-2.5 pr-4 font-medium">{exam.exam_name}</td>
                                    <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                                      {exam.total_tested?.toLocaleString() ?? '—'}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      {exam.pass_rate !== null ? (
                                        <span className={`font-semibold tabular-nums ${exam.pass_rate >= 80 ? 'text-emerald-600' : exam.pass_rate >= 65 ? 'text-yellow-600' : 'text-red-600'}`}>
                                          {exam.pass_rate}%
                                        </span>
                                      ) : '—'}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      {exam.college_ready_rate !== null ? (
                                        <span className={`font-semibold tabular-nums ${exam.college_ready_rate >= 50 ? 'text-emerald-600' : exam.college_ready_rate >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                                          {exam.college_ready_rate}%
                                        </span>
                                      ) : '—'}
                                    </td>
                                    {latestExams.some(e => e.mean_score !== null) && (
                                      <td className="py-2.5 pl-3 text-right tabular-nums text-muted-foreground">
                                        {exam.mean_score !== null ? exam.mean_score.toFixed(0) : '—'}
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Regents Trend Chart (multi-year) */}
                          {olderYears.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Regents Pass Rate Trends
                              </h4>
                              <p className="text-xs text-muted-foreground mb-3">
                                Multi-year pass rates by exam subject. Toggle individual exams to focus on specific subjects.
                              </p>
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={years.sort((a, b) => a - b).map(year => {
                                    const yearExams = regentsData.filter(r => r.year === year);
                                    const entry: any = { year: `${year}-${String(year + 1).slice(-2)}` };
                                    yearExams.forEach(e => { entry[e.exam_name] = e.pass_rate; });
                                    return entry;
                                  })}>
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                                    <RechartsTooltip formatter={(value: number) => [`${value}%`]} />
                                    <Legend content={({ payload }) => <InteractiveLegend payload={payload} hidden={regentsLegend.hidden} onClick={regentsLegend.handleLegendClick} />} />
                                    {(() => {
                                      const examNames = [...new Set(regentsData.map(r => r.exam_name))];
                                      const colors = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2', '#be185d', '#4f46e5', '#65a30d', '#ea580c'];
                                      return examNames.map((name, i) => (
                                        <Line key={name} type="monotone" dataKey={name} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls hide={regentsLegend.isHidden(name)} />
                                      ));
                                    })()}
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                              <ChartSourceLink
                                text="Source: NYC DOE InfoHub Regents Exam Results (2018-2024)"
                                url="https://infohub.nyced.org/reports/academics/test-results"
                                testId="source-regents"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : schoolWithScore.regents_pass_rate !== null ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <HSMetricCard label="Overall Regents Pass Rate" value={schoolWithScore.regents_pass_rate} suffix="%" description="Percentage of students scoring 65+ on Regents exams." testId="regents-overall" />
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      Regents exam data is not yet available for this school. Data will be added as NYC DOE InfoHub files are imported.
                    </div>
                  )}
                </CardContent>
                )}
              </Card>

              {/* College & Career Readiness */}
              {(schoolWithScore.college_readiness_rate !== null || schoolWithScore.college_enrollment_rate !== null || schoolWithScore.ap_course_count !== null) && (
                <Card data-testid="card-college-readiness">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <CardTitle>College & Career Readiness</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Post-secondary preparation metrics including AP courses, readiness benchmarks, and college enrollment.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {schoolWithScore.college_readiness_rate !== null && (
                        <HSMetricCard label="College & Career Readiness" value={schoolWithScore.college_readiness_rate} suffix="%" description="Students meeting NYC's college and career readiness benchmarks." testId="college-ready" />
                      )}
                      {schoolWithScore.college_enrollment_rate !== null && (
                        <HSMetricCard label="College Enrollment Rate" value={schoolWithScore.college_enrollment_rate} suffix="%" description="Graduates enrolling in college within one year." testId="college-enroll" />
                      )}
                      {schoolWithScore.ap_course_count !== null && schoolWithScore.ap_course_count > 0 && (
                        <HSMetricCard label="AP Courses Offered" value={schoolWithScore.ap_course_count} suffix=" courses" description="Advanced Placement courses available." testId="ap-courses" isCount />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {admissionsData && admissionsData.length > 0 && (
                <Card data-testid="card-hs-admissions">
                  <CardHeader>
                    <div className="flex items-center gap-2 flex-wrap">
                      <GraduationCap className="w-5 h-5 text-muted-foreground" />
                      <CardTitle>Admissions & Programs</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fall 2025 admissions data from the official NYC DOE High School Directory. Shows admission methods, demand metrics, and eligibility for each program.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const totalGESeats = admissionsData.reduce((sum, p) => sum + (p.seats_ge ?? 0), 0);
                      const totalGEApps = admissionsData.reduce((sum, p) => sum + (p.grade9_ge_applicants ?? 0), 0);
                      const avgAppsPerSeat = totalGESeats > 0 ? Math.round((totalGEApps / totalGESeats) * 10) / 10 : null;
                      const methods = [...new Set(admissionsData.map(p => p.admission_method).filter(Boolean))];

                      return (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-muted/50 rounded-md p-3 text-center" data-testid="metric-total-programs">
                              <p className="text-sm text-muted-foreground mb-1">Programs</p>
                              <p className="text-2xl font-bold">{admissionsData.length}</p>
                            </div>
                            <div className="bg-muted/50 rounded-md p-3 text-center" data-testid="metric-total-ge-seats">
                              <p className="text-sm text-muted-foreground mb-1">Grade 9 Seats</p>
                              <p className="text-2xl font-bold">{totalGESeats > 0 ? totalGESeats.toLocaleString() : "N/A"}</p>
                            </div>
                            <div className="bg-muted/50 rounded-md p-3 text-center" data-testid="metric-total-ge-applicants">
                              <p className="text-sm text-muted-foreground mb-1">Applicants</p>
                              <p className="text-2xl font-bold">{totalGEApps > 0 ? totalGEApps.toLocaleString() : "N/A"}</p>
                            </div>
                            <div className="bg-muted/50 rounded-md p-3 text-center" data-testid="metric-avg-apps-per-seat">
                              <p className="text-sm text-muted-foreground mb-1">Apps/Seat</p>
                              <p className="text-2xl font-bold">{avgAppsPerSeat !== null ? avgAppsPerSeat : "N/A"}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            <span className="text-sm text-muted-foreground">Methods:</span>
                            {methods.map(m => (
                              <Badge key={m} variant="outline" className="text-xs" data-testid={`badge-method-${m?.replace(/\s+/g, '-').toLowerCase()}`}>
                                {m}
                              </Badge>
                            ))}
                          </div>

                          <div className="space-y-3 mt-4">
                            {admissionsData.map((program) => {
                              const hasSpecialized = program.is_specialized && program.specialized_code;
                              const hasDemand = program.grade9_ge_applicants != null || program.seats_ge != null;
                              const requirements = [program.requirement_1, program.requirement_2, program.requirement_3, program.requirement_4].filter(Boolean);
                              const priorities = [program.priority_1, program.priority_2, program.priority_3].filter(Boolean);
                              const offerRates = [program.offer_rate_1, program.offer_rate_2, program.offer_rate_3].filter(Boolean);

                              return (
                                <div
                                  key={program.id}
                                  className="border rounded-md p-4 space-y-3"
                                  data-testid={`card-program-${program.program_number}`}
                                >
                                  <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-sm leading-tight" data-testid={`text-program-name-${program.program_number}`}>
                                        {program.program_name}
                                      </h4>
                                      {program.interest_area && (
                                        <p className="text-xs text-muted-foreground mt-0.5">{program.interest_area}</p>
                                      )}
                                    </div>
                                    {program.admission_method && (
                                      <Badge
                                        variant={
                                          program.admission_method === 'Screened' || program.admission_method === 'Screened With Assessment' ? 'default' :
                                          program.admission_method === 'Audition' ? 'secondary' :
                                          program.admission_method === 'Test' ? 'destructive' :
                                          'outline'
                                        }
                                        className="text-xs shrink-0"
                                        data-testid={`badge-admission-method-${program.program_number}`}
                                      >
                                        {program.admission_method}
                                      </Badge>
                                    )}
                                  </div>

                                  {program.program_description && (
                                    <p className="text-sm text-muted-foreground">{program.program_description}</p>
                                  )}

                                  {hasDemand && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      {program.grade9_ge_applicants != null && (
                                        <div className="text-center" data-testid={`metric-ge-applicants-${program.program_number}`}>
                                          <p className="text-xs text-muted-foreground">GE Applicants</p>
                                          <p className="text-lg font-semibold">{program.grade9_ge_applicants.toLocaleString()}</p>
                                        </div>
                                      )}
                                      {program.seats_ge != null && (
                                        <div className="text-center" data-testid={`metric-ge-seats-${program.program_number}`}>
                                          <p className="text-xs text-muted-foreground">GE Seats</p>
                                          <p className="text-lg font-semibold">{program.seats_ge}</p>
                                        </div>
                                      )}
                                      {program.applicants_per_seat_ge != null && (
                                        <div className="text-center" data-testid={`metric-apps-seat-ge-${program.program_number}`}>
                                          <p className="text-xs text-muted-foreground">Apps/Seat (GE)</p>
                                          <p className="text-lg font-semibold">{program.applicants_per_seat_ge}</p>
                                        </div>
                                      )}
                                      {program.filled_flag_ge != null && (
                                        <div className="text-center" data-testid={`metric-filled-ge-${program.program_number}`}>
                                          <p className="text-xs text-muted-foreground">Filled?</p>
                                          <p className={`text-lg font-semibold ${program.filled_flag_ge ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                            {program.filled_flag_ge ? 'Yes' : 'No'}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {(program.grade9_swd_applicants != null || program.seats_swd != null) && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-dashed">
                                      {program.grade9_swd_applicants != null && (
                                        <div className="text-center" data-testid={`metric-swd-applicants-${program.program_number}`}>
                                          <p className="text-xs text-muted-foreground">SWD Applicants</p>
                                          <p className="text-lg font-semibold">{program.grade9_swd_applicants.toLocaleString()}</p>
                                        </div>
                                      )}
                                      {program.seats_swd != null && (
                                        <div className="text-center" data-testid={`metric-swd-seats-${program.program_number}`}>
                                          <p className="text-xs text-muted-foreground">SWD Seats</p>
                                          <p className="text-lg font-semibold">{program.seats_swd}</p>
                                        </div>
                                      )}
                                      {program.applicants_per_seat_swd != null && (
                                        <div className="text-center" data-testid={`metric-apps-seat-swd-${program.program_number}`}>
                                          <p className="text-xs text-muted-foreground">Apps/Seat (SWD)</p>
                                          <p className="text-lg font-semibold">{program.applicants_per_seat_swd}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {hasSpecialized && (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-md p-3 border border-indigo-200 dark:border-indigo-800" data-testid={`specialized-stats-${program.program_number}`}>
                                      <p className="text-xs font-medium text-indigo-800 dark:text-indigo-200 mb-2">SHSAT / Specialized HS Stats ({program.specialized_code})</p>
                                      <div className="grid grid-cols-3 gap-2 text-center">
                                        {program.specialized_applicants != null && (
                                          <div>
                                            <p className="text-xs text-indigo-600 dark:text-indigo-300">Applicants</p>
                                            <p className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">{program.specialized_applicants.toLocaleString()}</p>
                                          </div>
                                        )}
                                        {program.specialized_seats != null && (
                                          <div>
                                            <p className="text-xs text-indigo-600 dark:text-indigo-300">Seats</p>
                                            <p className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">{program.specialized_seats}</p>
                                          </div>
                                        )}
                                        {program.specialized_apps_per_seat != null && (
                                          <div>
                                            <p className="text-xs text-indigo-600 dark:text-indigo-300">Apps/Seat</p>
                                            <p className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">{program.specialized_apps_per_seat}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {priorities.length > 0 && (
                                    <div data-testid={`priorities-${program.program_number}`}>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Admissions Priorities</p>
                                      <ol className="list-decimal list-inside space-y-0.5">
                                        {priorities.map((p, i) => (
                                          <li key={i} className="text-sm">{p}</li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}

                                  {offerRates.length > 0 && (
                                    <div data-testid={`offer-rates-${program.program_number}`}>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Offer Distribution</p>
                                      <ul className="space-y-0.5">
                                        {offerRates.map((r, i) => (
                                          <li key={i} className="text-sm text-muted-foreground">{r}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {requirements.length > 0 && (
                                    <div data-testid={`requirements-${program.program_number}`}>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Requirements</p>
                                      <ul className="list-disc list-inside space-y-0.5">
                                        {requirements.map((r, i) => (
                                          <li key={i} className="text-sm">{r}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {program.audition_info && (
                                    <div data-testid={`audition-info-${program.program_number}`}>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Audition Information</p>
                                      <p className="text-sm">{program.audition_info}</p>
                                    </div>
                                  )}

                                  {program.eligibility && (
                                    <div data-testid={`eligibility-${program.program_number}`}>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Eligibility</p>
                                      <p className="text-sm">{program.eligibility}</p>
                                    </div>
                                  )}

                                  {program.seats_10plus != null && program.seats_10plus > 0 && (
                                    <p className="text-xs text-muted-foreground">10th grade seats available</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Attendance & Chronic Absenteeism */}
          {attendanceData && attendanceData.length > 0 && (() => {
            const latestYear = attendanceData[0];
            const previousYear = attendanceData.length > 1 ? attendanceData[1] : null;
            const attendanceRate = latestYear.attendance_rate;
            const caRate = latestYear.chronic_absenteeism_rate;
            const prevCaRate = previousYear?.chronic_absenteeism_rate ?? null;
            const caChange = caRate !== null && prevCaRate !== null ? caRate - prevCaRate : null;

            const attendanceTrend = attendanceData
              .slice()
              .reverse()
              .map((d) => ({
                year: d.year,
                attendance: d.attendance_rate != null ? Math.round(d.attendance_rate * 10) / 10 : null,
                chronicAbsent: d.chronic_absenteeism_rate != null ? Math.round(d.chronic_absenteeism_rate * 10) / 10 : null,
              }));

            const getCALevel = (rate: number | null) => {
              if (rate === null) return { label: "N/A", color: "text-muted-foreground" };
              if (rate < 15) return { label: "Low", color: "text-emerald-600 dark:text-emerald-400" };
              if (rate < 25) return { label: "Moderate", color: "text-yellow-600 dark:text-yellow-400" };
              if (rate < 40) return { label: "High", color: "text-orange-600 dark:text-orange-400" };
              return { label: "Very High", color: "text-red-600 dark:text-red-400" };
            };
            const caLevel = getCALevel(caRate);

            const subgroups = [
              { label: "Male", value: latestYear.ca_rate_male },
              { label: "Female", value: latestYear.ca_rate_female },
              { label: "Asian", value: latestYear.ca_rate_asian },
              { label: "Black", value: latestYear.ca_rate_black },
              { label: "Hispanic", value: latestYear.ca_rate_hispanic },
              { label: "White", value: latestYear.ca_rate_white },
              { label: "SWD", value: latestYear.ca_rate_swd },
              { label: "ELL", value: latestYear.ca_rate_ell },
              { label: "Poverty", value: latestYear.ca_rate_poverty },
              { label: "Temp. Housing", value: latestYear.ca_rate_sth },
            ].filter(sg => sg.value !== null);

            return (
              <Card data-testid="card-attendance" className={!isPremium ? "relative overflow-hidden" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      <CardTitle>Attendance & Chronic Absenteeism</CardTitle>
                    </div>
                    {!isPremium && (
                      <Badge 
                        variant="outline"
                        className="text-xs gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                      >
                        <Crown className="w-3 h-3" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Official NYC DOE attendance data ({latestYear.year}). Chronic absenteeism = students absent 10%+ of school days.
                  </p>
                </CardHeader>
                {!isPremium ? (
                  <CardContent className="relative">
                    <div className="h-64 relative" data-testid="attendance-blurred">
                      <div className="absolute inset-0 blur-md opacity-50 pointer-events-none select-none">
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-muted/50 rounded-md p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-1">Attendance Rate</p>
                            <p className="text-3xl font-bold">92.1%</p>
                          </div>
                          <div className="bg-muted/50 rounded-md p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-1">Chronically Absent</p>
                            <p className="text-3xl font-bold">28.4%</p>
                          </div>
                          <div className="bg-muted/50 rounded-md p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-1">Year-over-Year</p>
                            <p className="text-3xl font-bold">-2.1%</p>
                          </div>
                        </div>
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
                        <div className="text-center p-6 max-w-sm">
                          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2">Unlock Attendance Data</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            View attendance rates, chronic absenteeism trends, subgroup breakdowns, and year-over-year changes.
                          </p>
                            <Button className="gap-2" data-testid="button-upgrade-attendance" onClick={startCheckout} disabled={checkoutPending}>
                              {checkoutPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                              {checkoutPending ? "Loading..." : "Upgrade to Premium"}
                            </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                ) : (
                <CardContent className="space-y-6">
                  {/* Headline Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-md p-4 text-center" data-testid="metric-attendance-rate">
                      <p className="text-sm text-muted-foreground mb-1">Attendance Rate</p>
                      <p className="text-3xl font-bold">
                        {attendanceRate !== null ? `${Math.round(attendanceRate * 10) / 10}%` : "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{latestYear.year}</p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-4 text-center" data-testid="metric-chronic-absent-rate">
                      <p className="text-sm text-muted-foreground mb-1">Chronically Absent</p>
                      <p className="text-3xl font-bold">
                        {caRate !== null ? `${Math.round(caRate * 10) / 10}%` : "N/A"}
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${caLevel.color}`} data-testid="badge-ca-level">
                          {caLevel.label}
                        </Badge>
                        {caChange !== null && (
                          <span className={`text-xs flex items-center gap-0.5 ${caChange < 0 ? "text-emerald-600 dark:text-emerald-400" : caChange > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                            {caChange < 0 ? <TrendingDown className="w-3 h-3" /> : caChange > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {caChange > 0 ? "+" : ""}{Math.round(caChange * 10) / 10}pp
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-md p-4 text-center" data-testid="metric-students-tracked">
                      <p className="text-sm text-muted-foreground mb-1">Students Tracked</p>
                      <p className="text-3xl font-bold">
                        {latestYear.students_contributing !== null ? latestYear.students_contributing.toLocaleString() : "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {latestYear.chronically_absent_count !== null ? `${latestYear.chronically_absent_count.toLocaleString()} chronically absent` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Multi-year Trend Chart */}
                  {attendanceTrend.length > 1 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Multi-Year Attendance Trend</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Tracks attendance rate and chronic absenteeism over time. Lower chronic absenteeism is better.
                      </p>
                      <div className="h-64" data-testid="chart-attendance-trend">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={attendanceTrend} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                              formatter={(value: number) => [`${value}%`]}
                            />
                            <Legend content={({ payload }) => <InteractiveLegend payload={payload} hidden={attendanceLegend.hidden} onClick={attendanceLegend.handleLegendClick} />} />
                            <Line
                              type="monotone"
                              dataKey="attendance"
                              stroke="hsl(var(--chart-1))"
                              strokeWidth={2}
                              dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2 }}
                              name="Attendance Rate"
                              connectNulls
                              hide={attendanceLegend.isHidden("attendance")}
                            />
                            <Line
                              type="monotone"
                              dataKey="chronicAbsent"
                              stroke="hsl(var(--chart-4))"
                              strokeWidth={2}
                              dot={{ fill: "hsl(var(--chart-4))", strokeWidth: 2 }}
                              name="Chronic Absenteeism"
                              connectNulls
                              hide={attendanceLegend.isHidden("chronicAbsent")}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <ChartSourceLink
                        text="Source: NYC DOE InfoHub End-of-Year Attendance & Chronic Absenteeism Data (2018-2025)"
                        url="https://infohub.nyced.org/reports/students-and-schools/school-quality/information-and-data-overview"
                        testId="source-attendance"
                      />
                    </div>
                  )}

                  {/* Subgroup Breakdown */}
                  {subgroups.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Chronic Absenteeism by Group ({latestYear.year})</h4>
                      <div className="space-y-2" data-testid="attendance-subgroups">
                        {subgroups.map((sg) => {
                          const sgLevel = getCALevel(sg.value);
                          const barWidth = sg.value !== null ? Math.min(sg.value, 100) : 0;
                          return (
                            <div key={sg.label} className="flex items-center gap-3" data-testid={`attendance-subgroup-${sg.label.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                              <span className="text-sm w-28 shrink-0 text-muted-foreground">{sg.label}</span>
                              <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                                <div
                                  className={`h-full rounded-sm ${sg.value !== null && sg.value < 15 ? "bg-emerald-500" : sg.value !== null && sg.value < 25 ? "bg-yellow-500" : sg.value !== null && sg.value < 40 ? "bg-orange-500" : "bg-red-500"}`}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              <span className={`text-sm font-medium w-14 text-right ${sgLevel.color}`}>
                                {sg.value !== null ? `${Math.round(sg.value * 10) / 10}%` : "N/A"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> &lt;15% Low</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-500 inline-block" /> 15-25% Moderate</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" /> 25-40% High</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> 40%+ Very High</span>
                      </div>
                    </div>
                  )}
                </CardContent>
                )}
              </Card>
            );
          })()}

          {/* Discipline & Suspensions */}
          {disciplineData && disciplineData.length > 0 && (() => {
            const latestYear = disciplineData[0];
            const previousYear = disciplineData.length > 1 ? disciplineData[1] : null;
            const total = latestYear.total_suspensions;
            const prevTotal = previousYear?.total_suspensions;
            const change = total !== null && prevTotal != null ? total - prevTotal : null;

            const disciplineTrend = [...disciplineData]
              .reverse()
              .filter(d => d.total_suspensions !== null)
              .map(d => ({
                year: d.year,
                total: d.total_suspensions,
                removals: d.teacher_removals ?? 0,
                principal: d.principal_suspensions ?? 0,
                superintendent: d.superintendent_suspensions ?? 0,
              }));

            const raceBreakdown = [
              { label: "Black", value: latestYear.susp_black },
              { label: "Hispanic", value: latestYear.susp_hispanic },
              { label: "White", value: latestYear.susp_white },
              { label: "Asian", value: latestYear.susp_asian },
              { label: "Multi-Racial", value: latestYear.susp_multi_racial },
            ].filter(r => r.value !== null && r.value > 0);

            const populationBreakdown = [
              { label: "SWD", value: latestYear.susp_swd, full: "Students with Disabilities" },
              { label: "Gen Ed", value: latestYear.susp_gen_ed, full: "General Education" },
              { label: "ELL", value: latestYear.susp_ell, full: "English Language Learners" },
              { label: "Non-ELL", value: latestYear.susp_non_ell, full: "Non-ELL" },
              { label: "STH", value: latestYear.susp_sth, full: "Temporary Housing" },
              { label: "Non-STH", value: latestYear.susp_non_sth, full: "Not in Temp Housing" },
            ].filter(r => r.value !== null && r.value > 0);

            const maxRaceVal = Math.max(...raceBreakdown.map(r => r.value ?? 0), 1);
            const maxPopVal = Math.max(...populationBreakdown.map(r => r.value ?? 0), 1);

            return (
              <Card data-testid="card-discipline" className={!isPremium ? "relative overflow-hidden" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                      <CardTitle>Discipline & Suspensions</CardTitle>
                    </div>
                    {!isPremium && (
                      <Badge 
                        variant="outline"
                        className="text-xs gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                      >
                        <Crown className="w-3 h-3" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Official NYC DOE discipline data ({latestYear.year}). Includes teacher removals, principal suspensions (1-5 days), and superintendent suspensions (6+ days).
                  </p>
                </CardHeader>
                {!isPremium ? (
                  <CardContent className="relative">
                    <div className="h-64 relative" data-testid="discipline-blurred">
                      <div className="absolute inset-0 blur-md opacity-50 pointer-events-none select-none">
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="bg-muted/50 rounded-md p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-1">Total Actions</p>
                            <p className="text-3xl font-bold">24</p>
                          </div>
                          <div className="bg-muted/50 rounded-md p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-1">Removals</p>
                            <p className="text-3xl font-bold">8</p>
                          </div>
                          <div className="bg-muted/50 rounded-md p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-1">Principal Susp.</p>
                            <p className="text-3xl font-bold">12</p>
                          </div>
                          <div className="bg-muted/50 rounded-md p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-1">Supt. Susp.</p>
                            <p className="text-3xl font-bold">4</p>
                          </div>
                        </div>
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
                        <div className="text-center p-6 max-w-sm">
                          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2">Unlock Discipline Data</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            View suspension counts, multi-year trends, and demographic breakdowns by race, gender, and student population.
                          </p>
                            <Button className="gap-2" data-testid="button-upgrade-discipline" onClick={startCheckout} disabled={checkoutPending}>
                              {checkoutPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                              {checkoutPending ? "Loading..." : "Upgrade to Premium"}
                            </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                ) : (
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-muted/50 rounded-md p-4 text-center" data-testid="metric-total-suspensions">
                      <p className="text-sm text-muted-foreground mb-1">Total Actions</p>
                      <p className="text-3xl font-bold">
                        {total !== null ? total.toLocaleString() : "N/A"}
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{latestYear.year}</span>
                        {change !== null && (
                          <span className={`text-xs flex items-center gap-0.5 ${change < 0 ? "text-emerald-600 dark:text-emerald-400" : change > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                            {change < 0 ? <TrendingDown className="w-3 h-3" /> : change > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {change > 0 ? "+" : ""}{change}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-md p-4 text-center" data-testid="metric-removals">
                      <p className="text-sm text-muted-foreground mb-1">Removals</p>
                      <p className="text-3xl font-bold">
                        {latestYear.teacher_removals !== null ? latestYear.teacher_removals.toLocaleString() : "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Classroom</p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-4 text-center" data-testid="metric-principal-susp">
                      <p className="text-sm text-muted-foreground mb-1">Principal Susp.</p>
                      <p className="text-3xl font-bold">
                        {latestYear.principal_suspensions !== null ? latestYear.principal_suspensions.toLocaleString() : "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">1-5 days</p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-4 text-center" data-testid="metric-superintendent-susp">
                      <p className="text-sm text-muted-foreground mb-1">Superintendent Susp.</p>
                      <p className="text-3xl font-bold">
                        {latestYear.superintendent_suspensions !== null ? latestYear.superintendent_suspensions.toLocaleString() : "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">6+ days</p>
                    </div>
                  </div>

                  {disciplineTrend.length > 1 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Multi-Year Discipline Trend</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Total disciplinary actions broken down by type over time. Lower numbers indicate fewer incidents.
                      </p>
                      <div className="h-64" data-testid="chart-discipline-trend">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={disciplineTrend} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Legend content={({ payload }) => <InteractiveLegend payload={payload} hidden={disciplineLegend.hidden} onClick={disciplineLegend.handleLegendClick} />} />
                            <Line type="monotone" dataKey="total" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-4))", strokeWidth: 2 }} name="Total" connectNulls hide={disciplineLegend.isHidden("total")} />
                            <Line type="monotone" dataKey="removals" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2 }} name="Removals" connectNulls hide={disciplineLegend.isHidden("removals")} />
                            <Line type="monotone" dataKey="principal" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 2 }} name="Principal" connectNulls hide={disciplineLegend.isHidden("principal")} />
                            <Line type="monotone" dataKey="superintendent" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-5))", strokeWidth: 2 }} name="Superintendent" connectNulls hide={disciplineLegend.isHidden("superintendent")} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <ChartSourceLink
                        text="Source: NYC DOE InfoHub LL93 Annual Reports on Student Discipline (2018-2025)"
                        url="https://infohub.nyced.org/reports/students-and-schools/student-safety-and-discipline"
                        testId="source-discipline"
                      />
                    </div>
                  )}

                  {raceBreakdown.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3">By Race/Ethnicity ({latestYear.year})</h4>
                      <div className="space-y-2" data-testid="discipline-race-breakdown">
                        {raceBreakdown.map((item) => (
                          <div key={item.label} className="flex items-center gap-3" data-testid={`discipline-race-${item.label.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                            <span className="text-sm w-24 shrink-0 text-muted-foreground">{item.label}</span>
                            <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                              <div
                                className="h-full rounded-sm bg-chart-4"
                                style={{ width: `${(item.value! / maxRaceVal) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{item.value!.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {populationBreakdown.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3">By Population ({latestYear.year})</h4>
                      <div className="space-y-2" data-testid="discipline-population-breakdown">
                        {populationBreakdown.map((item) => (
                          <div key={item.label} className="flex items-center gap-3" data-testid={`discipline-pop-${item.label.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm w-24 shrink-0 text-muted-foreground cursor-help">{item.label}</span>
                              </TooltipTrigger>
                              <TooltipContent>{item.full}</TooltipContent>
                            </Tooltip>
                            <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                              <div
                                className="h-full rounded-sm bg-chart-3"
                                style={{ width: `${(item.value! / maxPopVal) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{item.value!.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                )}
              </Card>
            );
          })()}

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
                    const districtRatingWithheld = !isHighSchool(districtSchool) && getAssessmentConfidence(districtSchool) === "low";
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
                          <div className="flex items-center gap-2 shrink-0 ml-3" title={districtRatingWithheld ? "Rating withheld because test participation was limited" : undefined}>
                            <div className={`w-3 h-3 rounded-full ${colorMap[schoolScoreColor]}`} />
                            <span className="font-bold tabular-nums" data-testid={`text-district-school-score-${index}`}>
                              {districtRatingWithheld ? 'Withheld' : districtSchool.overall_score === -1 ? 'N/A' : districtSchool.overall_score}
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
  isCount = false,
  isNegative = false
}: { 
  label: string; 
  value: number; 
  suffix: string; 
  description: string; 
  testId: string;
  isCount?: boolean;
  isNegative?: boolean;
}) {
  const getColor = () => {
    if (isCount) return "text-foreground";
    if (isNegative) {
      if (value <= 5) return "text-emerald-600 dark:text-emerald-400";
      if (value <= 10) return "text-yellow-600 dark:text-yellow-400";
      return "text-red-600 dark:text-red-400";
    }
    if (value >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (value >= 80) return "text-yellow-600 dark:text-yellow-400";
    if (value >= 70) return "text-violet-600 dark:text-violet-400";
    return "text-red-600 dark:text-red-400";
  };

  const getIndicatorColor = () => {
    if (isCount) return "bg-primary";
    if (isNegative) {
      if (value <= 5) return "bg-emerald-500";
      if (value <= 10) return "bg-yellow-500";
      return "bg-red-500";
    }
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
