import { useState, useEffect } from "react";
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
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { AppHeader } from "@/components/AppHeader";
import { FavoriteButton } from "@/components/FavoriteButton";
import { StarRating } from "@/components/StarRating";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewsList } from "@/components/ReviewsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDistrictAverages, DistrictComparisonBadge, DistrictAverages, InlineComparison } from "@/components/DistrictComparison";
import { 
  GraduationCap, 
  Users, 
  MapPin, 
  Info,
  TrendingUp,
  MessageSquare,
  MessageCircle,
  Sparkles,
  Home,
  Calculator
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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

  // Fetch district averages for comparison
  const { districtAverages, citywideAverages, isLoading: districtLoading } = useDistrictAverages(school?.district || 0);

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
      <AppHeader />

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
                {schoolWithScore.grade_band && (
                  <Badge variant="outline" className="text-xs gap-1" data-testid="badge-grades">
                    <GraduationCap className="w-3 h-3" />
                    Grades {schoolWithScore.grade_band}
                  </Badge>
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
              <CardTitle>Overall Snapshot</CardTitle>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground" data-testid="score-legend">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>90+ Outstanding</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span>80-89 Strong</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>70-79 Average</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span>&lt;70 Needs Work</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full ${colorMap[scoreColor]}`} data-testid="indicator-overall" />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="text-5xl font-bold tabular-nums" data-testid="score-overall">
                      {schoolWithScore.overall_score}
                    </div>
                    {districtAverages && (
                      <DistrictComparisonBadge 
                        value={schoolWithScore.overall_score} 
                        districtAvg={districtAverages.overallScore} 
                      />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground" data-testid="label-overall">
                    {getScoreLabel(schoolWithScore.overall_score)}
                  </div>
                </div>
              </div>
              
              {/* District Comparison Summary - shows unique metrics not duplicated below */}
              {districtAverages && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="text-sm font-medium mb-2 text-muted-foreground">District {schoolWithScore.district} Comparison</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm" data-testid="district-comparison-summary">
                    <ComparisonStat 
                      label="Overall" 
                      schoolValue={schoolWithScore.overall_score} 
                      districtAvg={districtAverages.overallScore}
                    />
                    <ComparisonStat 
                      label="Academics" 
                      schoolValue={schoolWithScore.academics_score} 
                      districtAvg={districtAverages.academicsScore}
                    />
                    <ComparisonStat 
                      label="Climate" 
                      schoolValue={schoolWithScore.climate_score} 
                      districtAvg={districtAverages.climateScore}
                    />
                    <ComparisonStat 
                      label="Progress" 
                      schoolValue={schoolWithScore.progress_score} 
                      districtAvg={districtAverages.progressScore}
                    />
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
              <Link href="/login">
                <Button variant="default" size="sm" data-testid="button-login-to-review">
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
