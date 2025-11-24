import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { School, SchoolWithOverallScore, calculateOverallScore, getScoreColor, Review, getQualityRatingLabel, getQualityRatingBadgeClasses } from "@shared/schema";
import { getBoroughFromDBN } from "@shared/boroughMapping";
import { METRIC_TOOLTIPS } from "@shared/metricHelp";
import { CommuteTime } from "@/components/CommuteTime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { FavoriteButton } from "@/components/FavoriteButton";
import { StarRating } from "@/components/StarRating";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewsList } from "@/components/ReviewsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  GraduationCap, 
  Users, 
  MapPin, 
  Info,
  TrendingUp,
  Heart,
  School as SchoolIcon,
  MessageSquare,
  MessageCircle,
  Sparkles,
  Home
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut, User } from "lucide-react";

export default function SchoolDetail() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Extract DBN from slug (format: "02m158-ps-158-bayard-taylor" or legacy "02M158")
  const dbn = slug?.split('-')[0]?.toUpperCase() || '';

  const { data: school, isLoading, error } = useQuery<School>({
    queryKey: ["/api/schools", dbn],
    enabled: !!dbn,
  });

  const schoolWithScore: SchoolWithOverallScore | null = school ? {
    ...school,
    overall_score: calculateOverallScore(school),
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Loading...</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center text-muted-foreground">Loading school details...</div>
        </div>
      </div>
    );
  }

  if (!schoolWithScore) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">School Not Found</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>
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
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  const getScoreLabel = (score: number) => {
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
    "url": `https://nyc-kindergarten-school-finder.replit.app/school/${schoolSlug}`,
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
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <SchoolIcon className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">NYC Kindergarten Finder</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link href="/favorites">
                  <Button variant="ghost" size="icon" data-testid="button-nav-favorites">
                    <Heart className="w-5 h-5" />
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild
                  data-testid="button-user-menu"
                >
                  <a href="/api/logout">
                    <User className="w-4 h-4 mr-2" />
                    {user?.firstName || user?.email}
                    <LogOut className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </>
            ) : (
              <Button 
                variant="default" 
                size="sm" 
                asChild
                data-testid="button-login"
              >
                <a href="/api/login">
                  <LogIn className="w-4 h-4 mr-2" />
                  Log In
                </a>
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
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
          
          {/* School Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2" data-testid="text-school-name">
                {schoolWithScore.name}
              </h2>
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <Badge variant="secondary" data-testid="badge-dbn">{schoolWithScore.dbn}</Badge>
                {schoolWithScore.economic_need_index !== null && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Badge variant="outline" className="text-xs gap-1" data-testid="badge-eni">
                          <Home className="w-3 h-3" />
                          {schoolWithScore.economic_need_index}% ENI
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">{METRIC_TOOLTIPS.economicNeedIndex.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {borough && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-borough">
                    <MapPin className="w-3 h-3" />
                    {borough}
                  </span>
                )}
                <span className="text-sm text-muted-foreground" data-testid="text-district">
                  District {schoolWithScore.district}
                </span>
              </div>
              <CommuteTime schoolDbn={schoolWithScore.dbn} />
            </div>
            <FavoriteButton 
              schoolDbn={schoolWithScore.dbn} 
              variant="default" 
              size="default"
              showLabel={true}
            />
          </div>

          {/* Overall Score Card */}
          <Card data-testid="card-overall-score">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Overall Snapshot</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0"
                      data-testid="button-tooltip-snapshot"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Overall snapshot information"
                    >
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm" data-testid="tooltip-snapshot">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Score Color Guide:</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="text-xs">{METRIC_TOOLTIPS.colorLegend.green.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-500" />
                          <span className="text-xs">{METRIC_TOOLTIPS.colorLegend.yellow.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-xs">{METRIC_TOOLTIPS.colorLegend.red.description}</span>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full ${colorMap[scoreColor]}`} data-testid="indicator-overall" />
                <div>
                  <div className="text-5xl font-bold tabular-nums" data-testid="score-overall">
                    {schoolWithScore.overall_score}
                  </div>
                  <div className="text-sm text-muted-foreground" data-testid="label-overall">
                    {getScoreLabel(schoolWithScore.overall_score)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Component Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Academic Performance */}
          <Card data-testid="card-academics">
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
                />
                <MetricCard
                  label="Math Proficiency"
                  value={`${schoolWithScore.math_proficiency}%`}
                  tooltip={METRIC_TOOLTIPS.mathProficiency.tooltip}
                  testId="math"
                />
              </div>
            </CardContent>
          </Card>

          {/* School Survey Results */}
          {(schoolWithScore.student_safety !== null || 
            schoolWithScore.teacher_quality !== null || 
            schoolWithScore.guardian_satisfaction !== null) && (
            <Card data-testid="card-survey">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>NYC School Survey Results</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0"
                        data-testid="button-tooltip-survey"
                        aria-label="Survey information"
                      >
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">Annual survey responses from students, teachers, and parents about school quality and culture.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {schoolWithScore.student_safety !== null && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Student Voice</h4>
                    <div className="grid gap-2">
                      <SurveyMetric label="Safety & Respect" value={schoolWithScore.student_safety} />
                    </div>
                  </div>
                )}
                
                {schoolWithScore.teacher_quality !== null && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Teacher Perspective</h4>
                    <div className="grid gap-2">
                      <SurveyMetric label="Instruction Quality" value={schoolWithScore.teacher_quality} />
                    </div>
                  </div>
                )}
                
                {schoolWithScore.guardian_satisfaction !== null && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Parent Feedback</h4>
                    <div className="grid gap-2">
                      <SurveyMetric label="Overall Satisfaction" value={schoolWithScore.guardian_satisfaction} />
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
                  <dt className="text-sm text-muted-foreground">Enrollment</dt>
                  <dd className="text-lg font-semibold" data-testid="text-enrollment">{schoolWithScore.enrollment}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Grade Span</dt>
                  <dd className="text-lg font-semibold" data-testid="text-grade-span">{schoolWithScore.grade_band}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Student-Teacher Ratio</dt>
                  <dd className="text-lg font-semibold" data-testid="text-ratio">{schoolWithScore.student_teacher_ratio}:1</dd>
                </div>
                {schoolWithScore.address && schoolWithScore.address !== "TBD" && (
                  <div className="md:col-span-2">
                    <dt className="text-sm text-muted-foreground">Address</dt>
                    <dd className="text-lg font-semibold" data-testid="text-address">{schoolWithScore.address}</dd>
                  </div>
                )}
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
                    <div className="grid grid-cols-3 gap-4">
                      {schoolWithScore.economic_need_index !== null && (
                        <div data-testid="container-economic-need">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-2xl font-bold tabular-nums" data-testid="text-economic-need">{schoolWithScore.economic_need_index}%</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Economic need information">
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{METRIC_TOOLTIPS.economicNeedIndex.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-muted-foreground">Economic Need Index</p>
                        </div>
                      )}
                      {schoolWithScore.ell_percent !== null && (
                        <div data-testid="container-ell">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-2xl font-bold tabular-nums" data-testid="text-ell">{schoolWithScore.ell_percent}%</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="ELL information">
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{METRIC_TOOLTIPS.ellPercent.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-muted-foreground">ELL Students</p>
                        </div>
                      )}
                      {schoolWithScore.iep_percent !== null && (
                        <div data-testid="container-iep">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-2xl font-bold tabular-nums" data-testid="text-iep">{schoolWithScore.iep_percent}%</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="IEP information">
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{METRIC_TOOLTIPS.iepPercent.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-muted-foreground">IEP Students</p>
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
                    <h4 className="font-semibold text-sm mb-3" data-testid="text-diversity-title">Racial & Ethnic Diversity</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="grid-diversity">
                      {schoolWithScore.asian_percent !== null && (
                        <div data-testid="container-asian-percent">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xl font-bold tabular-nums" data-testid="text-asian-percent">{schoolWithScore.asian_percent}%</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Asian students information">
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{METRIC_TOOLTIPS.asianPercent.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-muted-foreground">Asian</p>
                        </div>
                      )}
                      {schoolWithScore.black_percent !== null && (
                        <div data-testid="container-black-percent">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xl font-bold tabular-nums" data-testid="text-black-percent">{schoolWithScore.black_percent}%</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Black students information">
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{METRIC_TOOLTIPS.blackPercent.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-muted-foreground">Black</p>
                        </div>
                      )}
                      {schoolWithScore.hispanic_percent !== null && (
                        <div data-testid="container-hispanic-percent">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xl font-bold tabular-nums" data-testid="text-hispanic-percent">{schoolWithScore.hispanic_percent}%</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Hispanic/Latino students information">
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{METRIC_TOOLTIPS.hispanicPercent.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-muted-foreground">Hispanic/Latino</p>
                        </div>
                      )}
                      {schoolWithScore.white_percent !== null && (
                        <div data-testid="container-white-percent">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xl font-bold tabular-nums" data-testid="text-white-percent">{schoolWithScore.white_percent}%</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="White students information">
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{METRIC_TOOLTIPS.whitePercent.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-muted-foreground">White</p>
                        </div>
                      )}
                      {schoolWithScore.multi_racial_percent !== null && (
                        <div data-testid="container-multi-racial-percent">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xl font-bold tabular-nums" data-testid="text-multi-racial-percent">{schoolWithScore.multi_racial_percent}%</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Multi-racial students information">
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{METRIC_TOOLTIPS.multiRacialPercent.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-muted-foreground">Multi-Racial</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reviews Section */}
          <ReviewsSection schoolDbn={schoolWithScore.dbn} userId={user?.id} isAuthenticated={isAuthenticated} />
          
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

function ReviewsSection({ schoolDbn, userId, isAuthenticated }: { schoolDbn: string; userId?: string; isAuthenticated: boolean }) {
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
            <CardTitle>Parent Reviews</CardTitle>
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
              <p className="text-muted-foreground mb-2">Sign in to write a review</p>
              <Button variant="default" size="sm" asChild data-testid="button-login-to-review">
                <a href="/api/login">
                  <LogIn className="w-4 h-4 mr-2" />
                  Log In
                </a>
              </Button>
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium" data-testid={`label-${testId}`}>{label}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    data-testid={`button-tooltip-${testId}`}
                    aria-label={`${label} information`}
                  >
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-2xl font-bold tabular-nums" data-testid={`score-${testId}`}>{score}</span>
          </div>
          <Progress value={score} className="h-2" data-testid={`progress-${testId}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, tooltip, testId }: { label: string; value: string; tooltip: string; testId: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-1" data-testid={`container-${testId}`}>
      <div className="flex items-center gap-1">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0"
              data-testid={`button-tooltip-${testId}`}
              aria-label={`${label} information`}
            >
              <Info className="h-3 w-3 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <dd className="text-2xl font-bold tabular-nums" data-testid={`score-${testId}`}>{value}</dd>
    </div>
  );
}

function SurveyMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}%</span>
    </div>
  );
}
