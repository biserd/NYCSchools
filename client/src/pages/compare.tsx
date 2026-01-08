import { useComparison } from "@/contexts/ComparisonContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { Link, useLocation, useRoute } from "wouter";
import { useState, useEffect } from "react";
import { 
  X, GraduationCap, Users, TrendingUp, Sun, MapPin, Home, TrendingDown, Minus, Scale,
  Baby, Sparkles, Star, Shield, HeartHandshake, BookOpen, Award, Clock, UserCheck,
  Globe, Percent, Languages, DollarSign, Lock, CheckCircle, Target, Share2, Check, Copy
} from "lucide-react";
import { calculateOverallScore, getScoreColor, getSchoolUrl, SchoolTrend, TrendDirection, type AdmissionsMetrics, getCompetitivenessLevel, getCompetitivenessDisplay, getComparisonUrl, parseComparisonSlug, School } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getBoroughFromDBN } from "@shared/boroughMapping";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueries } from "@tanstack/react-query";
import { DistrictAverages } from "@/components/DistrictComparison";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";

function ComparisonCell({ value, districtAvg, unit = "", higherIsBetter = true }: { 
  value: number | null | undefined; 
  districtAvg?: number | undefined;
  unit?: string;
  higherIsBetter?: boolean;
}) {
  if (value == null) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  
  if (!districtAvg) {
    return <span>{value}{unit}</span>;
  }
  
  const diff = value - districtAvg;
  const isPositive = higherIsBetter ? diff > 0 : diff < 0;
  const isNeutral = Math.abs(diff) < 2;
  
  const getColor = () => {
    if (isNeutral) return "text-yellow-600 dark:text-yellow-400";
    return isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  };
  
  const getIcon = () => {
    if (isNeutral) return <Minus className="w-3 h-3" />;
    return isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center gap-0.5 cursor-help">
          <span className="font-medium">{value}{unit}</span>
          <span className={`flex items-center gap-0.5 text-xs ${getColor()}`}>
            {getIcon()}
            <span>{diff > 0 ? "+" : ""}{diff.toFixed(0)}</span>
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <div>School: {value}{unit}</div>
          <div>District avg: {districtAvg.toFixed(1)}{unit}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function getTrendBadgeConfig(direction: TrendDirection) {
  switch (direction) {
    case 'improving':
      return {
        icon: TrendingUp,
        label: 'Improving',
        className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      };
    case 'declining':
      return {
        icon: TrendingDown,
        label: 'Declining',
        className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
      };
    case 'stable':
      return {
        icon: Minus,
        label: 'Stable',
        className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      };
    default:
      return null;
  }
}

function BooleanCell({ value, yesLabel = "Yes", noLabel = "No" }: { value: boolean | null | undefined; yesLabel?: string; noLabel?: string }) {
  if (value == null) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  return value ? (
    <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
      {yesLabel}
    </Badge>
  ) : (
    <span className="text-muted-foreground">{noLabel}</span>
  );
}

function GTCell({ hasGT, programType }: { hasGT: boolean | null | undefined; programType: string | null | undefined }) {
  if (!hasGT) {
    return <span className="text-muted-foreground">No</span>;
  }
  const label = programType === 'citywide' ? 'Citywide' : programType === 'district' ? 'District' : 'Yes';
  const className = programType === 'citywide' 
    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
  return <Badge variant="secondary" className={className}>{label}</Badge>;
}

function DualLanguageCell({ hasDualLanguage, languages }: { hasDualLanguage: boolean | null | undefined; languages: string[] | null | undefined }) {
  if (!hasDualLanguage) {
    return <span className="text-muted-foreground">No</span>;
  }
  const langList = languages && languages.length > 0 ? languages : [];
  if (langList.length === 0) {
    return (
      <Badge variant="secondary" className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">
        Yes
      </Badge>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <Badge variant="secondary" className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">
        {langList.length === 1 ? langList[0] : `${langList.length} languages`}
      </Badge>
      {langList.length > 1 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground cursor-help underline decoration-dotted">View all</span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              {langList.map(lang => (
                <div key={lang}>{lang}</div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function formatPTAAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

interface ComparisonSummary {
  sentence: string;
  hasData: boolean;
}

function generateComparisonSummary(
  schools: Array<{ name: string; dbn: string; overall_score: number | null; ela_proficiency?: number | null; math_proficiency?: number | null; climate_score?: number | null; progress_score?: number | null }>
): ComparisonSummary | null {
  if (schools.length < 2) return null;
  
  const metrics = [
    { key: 'overall_score', label: 'Overall Score' },
    { key: 'ela_proficiency', label: 'ELA' },
    { key: 'math_proficiency', label: 'Math' },
    { key: 'climate_score', label: 'Climate' },
    { key: 'progress_score', label: 'Progress' },
  ];
  
  // Track wins per school
  const wins: Record<string, { name: string; count: number; metrics: string[] }> = {};
  schools.forEach(s => { wins[s.dbn] = { name: s.name, count: 0, metrics: [] }; });
  
  let metricsWithData = 0;
  
  for (const metric of metrics) {
    // Get all schools with data for this metric
    const schoolsWithData = schools
      .map(s => ({ school: s, value: (s as any)[metric.key] as number | null }))
      .filter(x => x.value != null);
    
    if (schoolsWithData.length < 2) continue;
    metricsWithData++;
    
    // Find the highest value
    const maxValue = Math.max(...schoolsWithData.map(x => x.value!));
    
    // Find all schools tied for the lead
    const leaders = schoolsWithData.filter(x => x.value === maxValue);
    
    // Only count as a win if there's a single leader (no tie)
    if (leaders.length === 1) {
      const winner = leaders[0].school;
      wins[winner.dbn].count++;
      wins[winner.dbn].metrics.push(metric.label);
    }
  }
  
  if (metricsWithData === 0) {
    return { sentence: '', hasData: false };
  }
  
  // Sort schools by win count
  const sorted = Object.values(wins).sort((a, b) => b.count - a.count);
  const topWinner = sorted[0];
  const secondPlace = sorted[1];
  
  // Generate the sentence
  let sentence: string;
  
  if (topWinner.count === 0) {
    // No clear winner in any category
    sentence = "These schools are closely matched across all metrics.";
  } else if (topWinner.count === secondPlace?.count && topWinner.count > 0) {
    // Tie for first place
    const tiedSchools = sorted.filter(s => s.count === topWinner.count);
    const names = tiedSchools.map(s => getShortSchoolName(s.name));
    if (names.length === 2) {
      sentence = `${names[0]} and ${names[1]} are tied, each leading in ${topWinner.count} ${topWinner.count === 1 ? 'category' : 'categories'}.`;
    } else {
      sentence = `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]} are closely matched.`;
    }
  } else {
    // Clear winner
    const winnerName = getShortSchoolName(topWinner.name);
    const metricsWon = topWinner.metrics.slice(0, 2).join(' and ');
    
    if (topWinner.count === 1) {
      sentence = `${winnerName} leads in ${metricsWon}, with other metrics closely matched.`;
    } else if (topWinner.count >= metricsWithData - 1) {
      sentence = `${winnerName} leads in ${topWinner.count} of ${metricsWithData} categories, including ${metricsWon}.`;
    } else {
      sentence = `${winnerName} leads in ${topWinner.count} categories (${metricsWon}), but other schools excel in different areas.`;
    }
  }
  
  return { sentence, hasData: true };
}

function getShortSchoolName(name: string): string {
  const match = name.match(/^(P\.?S\.?|I\.?S\.?|M\.?S\.?)\s*\.?\s*(\d+)/i);
  if (match) {
    return `${match[1].replace(/\./g, '')} ${match[2]}`;
  }
  if (name.length > 20) {
    return name.substring(0, 18) + '...';
  }
  return name;
}

function ComparisonSummaryCard({ summary }: { summary: ComparisonSummary }) {
  return (
    <Card className="mb-6 border-primary/20 bg-primary/5" data-testid="card-comparison-summary">
      <CardContent className="py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
          {summary.hasData ? (
            <p className="text-sm" data-testid="text-summary">
              {summary.sentence}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="text-no-data">
              Insufficient data to generate a comparison summary.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PTACell({ total, perStudent }: { total: number | null | undefined; perStudent: number | null | undefined }) {
  if (!total || total === 0) {
    return <span className="text-muted-foreground">No data</span>;
  }
  
  return (
    <div className="flex flex-col items-center gap-1">
      <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
        {formatPTAAmount(total)}
      </Badge>
      {perStudent && perStudent > 0 && (
        <span className="text-xs text-muted-foreground">
          ${Math.round(perStudent).toLocaleString()}/student
        </span>
      )}
    </div>
  );
}

export default function ComparePage() {
  const { comparedSchools, removeFromComparison, clearComparison, setComparedSchools } = useComparison();
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [urlInitialized, setUrlInitialized] = useState(false);
  
  // Check for URL params
  const [, params] = useRoute("/compare/:schools");
  const urlSlugs = params?.schools || "";
  
  // Fetch schools from URL if provided (supports both friendly slugs like PS006-M and DBN format)
  const { data: urlSchools, isLoading: urlSchoolsLoading } = useQuery<School[]>({
    queryKey: ["/api/schools/by-slugs", urlSlugs],
    queryFn: async () => {
      if (!urlSlugs) return [];
      const slugParts = urlSlugs.split('-vs-');
      if (slugParts.length === 0) return [];
      const response = await fetch(`/api/schools/by-slugs?slugs=${slugParts.join(",")}`);
      if (!response.ok) throw new Error("Failed to fetch schools");
      return response.json();
    },
    enabled: !!urlSlugs,
  });
  
  // Sync URL schools to comparison context when loaded (only on initial load)
  useEffect(() => {
    if (urlSchools && urlSchools.length > 0 && !urlInitialized) {
      setComparedSchools(urlSchools);
      setUrlInitialized(true);
    }
  }, [urlSchools, urlInitialized, setComparedSchools]);
  
  // Initialize URL tracking when user navigates directly to /compare (no URL params)
  useEffect(() => {
    if (!urlSlugs && !urlInitialized) {
      setUrlInitialized(true);
    }
  }, [urlSlugs, urlInitialized]);
  
  // Filter out any null schools before using them
  const validComparedSchools = comparedSchools.filter((s): s is School => s !== null && s !== undefined);
  
  // Update URL immediately when schools change (after initial load)
  useEffect(() => {
    if (urlInitialized && validComparedSchools.length > 0) {
      const newUrl = getComparisonUrl(validComparedSchools);
      if (window.location.pathname !== newUrl) {
        window.history.replaceState(null, '', newUrl);
      }
    } else if (urlInitialized && validComparedSchools.length === 0) {
      window.history.replaceState(null, '', '/compare');
    }
  }, [validComparedSchools, urlInitialized]);
  
  // Check subscription status
  const { data: subscription, isFetched: subscriptionFetched } = useQuery<{
    status: string;
    plan: string;
  }>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
  
  const isPremium = subscription?.status === "active" && 
    (subscription?.plan === "season_pass" || subscription?.plan === "premium" || subscription?.plan === "developer");
  
  // Copy shareable link to clipboard
  const copyShareableLink = () => {
    const url = `${window.location.origin}${getComparisonUrl(validComparedSchools)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share this link to show your school comparison.",
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // Fetch all district averages for comparison
  const { data: allDistrictAverages } = useQuery<Record<string, DistrictAverages>>({
    queryKey: ["/api/districts/averages"],
  });

  // Fetch historical trends
  const { data: trends } = useQuery<Record<string, SchoolTrend>>({
    queryKey: ["/api/schools-trends"],
  });

  // Only fetch admissions data if user is premium (gated data)
  const canAccessPremiumData = !!user && isPremium;
  
  // Fetch admissions data for all compared schools using useQueries (only for premium users)
  const admissionsQueries = useQueries({
    queries: validComparedSchools.map(school => ({
      queryKey: ["/api/schools", school.dbn, "admissions"],
      enabled: !!school.dbn && canAccessPremiumData,
    })),
  });

  // Build a map of DBN -> latest admissions metrics by grade
  const admissionsDataMap: Record<string, Record<string, AdmissionsMetrics | undefined>> = {};
  validComparedSchools.forEach((school, idx) => {
    const data = (admissionsQueries[idx]?.data as AdmissionsMetrics[]) || [];
    const byGrade: Record<string, AdmissionsMetrics | undefined> = {};
    ['K', 'PK', '3K'].forEach(grade => {
      const gradeMetrics = data.filter(m => m.gradeBand === grade);
      if (gradeMetrics.length > 0) {
        byGrade[grade] = gradeMetrics.sort((a, b) => b.schoolYear.localeCompare(a.schoolYear))[0];
      }
    });
    admissionsDataMap[school.dbn] = byGrade;
  });

  // Check if any school has admissions data
  const hasAdmissionsData = Object.values(admissionsDataMap).some(
    byGrade => Object.values(byGrade).some(m => m !== undefined)
  );

  // Show loading state while checking auth/subscription or loading URL schools
  const isCheckingAccess = authLoading || (!!user && !subscriptionFetched) || urlSchoolsLoading;
  
  // Loading state while checking access
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Scale className="w-12 h-12 mx-auto text-muted-foreground animate-pulse mb-4" />
            <p className="text-muted-foreground">Loading comparison...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  
  if (validComparedSchools.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />

        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <div className="mb-4">
                <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2" data-testid="text-empty-compare-title">
                No Schools to Compare
              </h2>
              <p className="text-muted-foreground mb-6" data-testid="text-empty-compare-description">
                Add schools to your comparison from the main page by clicking the "Compare" button on school cards.
              </p>
              <Link href="/">
                <Button data-testid="button-browse-schools">
                  Browse Schools
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const schoolsWithScores = validComparedSchools.map(school => ({
    ...school,
    overall_score: calculateOverallScore(school),
    scoreColor: getScoreColor(calculateOverallScore(school)),
    borough: getBoroughFromDBN(school.dbn),
    trend: trends?.[school.dbn],
  }));

  const colorMap = {
    green: "text-emerald-500",
    yellow: "text-yellow-500",
    purple: "text-violet-500",
    red: "text-red-500",
    gray: "text-muted-foreground",
  };

  // Helper to check if a school is a high school
  const isHighSchool = (gradeBand: string | null | undefined) => 
    gradeBand?.includes('9-12') || gradeBand?.includes('6-12') || gradeBand?.includes('7-12');
  
  // Only show high school section when ALL schools are high schools (relevant data for all)
  const allHighSchools = schoolsWithScores.every(s => isHighSchool(s.grade_band));

  // Check if we have survey data for any school
  const hasSurveyData = schoolsWithScores.some(s => 
    s.student_safety != null || s.student_engagement != null || s.guardian_satisfaction != null
  );
  
  // Generate comparison summary for 2+ schools
  const comparisonSummary = schoolsWithScores.length >= 2 
    ? generateComparisonSummary(schoolsWithScores)
    : null;
  
  // Dynamic SEO based on compared schools
  const seoTitle = validComparedSchools.length >= 2
    ? `${validComparedSchools[0].name} vs ${validComparedSchools[1].name}${validComparedSchools.length > 2 ? ` + ${validComparedSchools.length - 2} more` : ''} | NYC School Comparison`
    : validComparedSchools.length === 1
    ? `${validComparedSchools[0].name} | NYC School Comparison`
    : "Compare NYC Schools Side-by-Side";
    
  const seoDescription = validComparedSchools.length >= 2
    ? `Compare ${validComparedSchools.map(s => s.name).join(' vs ')} side-by-side. View overall scores, test results, and ratings to choose the best school for your child in NYC.`
    : "Compare NYC schools side-by-side. View test scores, ratings, demographics, historical trends, and key metrics to make informed enrollment decisions.";
    
  const seoKeywords = validComparedSchools.length > 0
    ? `${validComparedSchools.map(s => s.name).join(', ')}, compare NYC schools, school comparison, NYC school ratings`
    : "compare NYC schools, school comparison tool, side-by-side school ratings, NYC school metrics";
    
  const canonicalPath = validComparedSchools.length > 0
    ? getComparisonUrl(validComparedSchools)
    : "/compare";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalPath={canonicalPath}
      />
      <AppHeader />

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-6 h-6 text-primary" />
              <h1 className="text-3xl font-bold" data-testid="text-compare-title">
                School Comparison
              </h1>
            </div>
            <p className="text-muted-foreground" data-testid="text-compare-description">
              Comparing {validComparedSchools.length} {validComparedSchools.length === 1 ? 'school' : 'schools'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyShareableLink}
              data-testid="button-copy-compare-link"
              disabled={validComparedSchools.length === 0}
            >
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
              {copied ? "Copied!" : "Share"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearComparison}
              data-testid="button-clear-all-compare"
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Comparison Summary - shown for 2+ schools */}
        {comparisonSummary && schoolsWithScores.length >= 2 && (
          <ComparisonSummaryCard summary={comparisonSummary} />
        )}

        <div className="grid gap-6 mb-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {schoolsWithScores.map((school) => {
              const trendConfig = school.trend ? getTrendBadgeConfig(school.trend.direction) : null;
              return (
                <Card key={school.dbn} className="relative" data-testid={`card-compare-${school.dbn}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => removeFromComparison(school.dbn)}
                    data-testid={`button-remove-${school.dbn}`}
                    aria-label={`Remove ${school.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm line-clamp-2 pr-8" data-testid={`text-school-name-${school.dbn}`}>
                      {school.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-dbn-${school.dbn}`}>
                        {school.dbn}
                      </Badge>
                      {trendConfig && (
                        <Badge 
                          variant="outline"
                          className={`text-xs gap-1 ${trendConfig.className}`}
                          data-testid={`badge-trend-${school.dbn}`}
                        >
                          <trendConfig.icon className="w-3 h-3" />
                          {trendConfig.label}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <div className={`text-5xl font-bold tabular-nums mb-1 ${colorMap[school.scoreColor]}`} data-testid={`score-overall-${school.dbn}`}>
                        {school.overall_score === -1 ? 'N/A' : school.overall_score}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {school.overall_score === -1 ? 'Insufficient Data' : 'Overall Score'}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Academics</span>
                        <span className="font-medium tabular-nums" data-testid={`score-academics-${school.dbn}`}>{school.academics_score}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Climate</span>
                        <span className="font-medium tabular-nums" data-testid={`score-climate-${school.dbn}`}>{school.climate_score}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium tabular-nums" data-testid={`score-progress-${school.dbn}`}>{school.progress_score}</span>
                      </div>
                    </div>
                    <Link href={getSchoolUrl(school)}>
                      <Button variant="outline" size="sm" className="w-full mt-4" data-testid={`button-view-details-${school.dbn}`}>
                        View Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Premium Gate for Detailed Comparison */}
          {!isPremium && (
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
              <CardContent className="py-8 text-center">
                <div className="mb-4">
                  <div className="relative inline-block">
                    <Scale className="w-12 h-12 text-primary" />
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1">
                      <Lock className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2" data-testid="text-premium-gate-title">
                  Unlock Full Comparison Details
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto" data-testid="text-premium-gate-description">
                  Get detailed metrics, district averages, admissions data, demographics, and more to make confident enrollment decisions.
                </p>
                
                <div className="flex flex-wrap gap-4 justify-center mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>District Comparisons</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Admissions Data</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Survey Results</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Demographics</span>
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  {!user ? (
                    <Button 
                      size="lg"
                      onClick={() => navigate("/login")}
                      data-testid="button-login-compare"
                    >
                      Login to Get Started
                    </Button>
                  ) : (
                    <Button 
                      size="lg"
                      onClick={() => navigate("/pricing")}
                      data-testid="button-upgrade-compare"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Unlock with Season Pass - $29
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  6 months of full access. Built by a NYC Parent for NYC Parents.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Premium Content - Detailed Comparison Tables */}
          {isPremium && (
            <>
          {/* Academic Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Academic Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Metric</TableHead>
                      {schoolsWithScores.map((school) => (
                        <TableHead key={school.dbn} className="text-center" data-testid={`th-academic-${school.dbn}`}>
                          <div className="text-xs truncate max-w-[150px]">{school.name}</div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">ELA Proficiency</TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-ela-${school.dbn}`}>
                          <ComparisonCell 
                            value={school.ela_proficiency} 
                            districtAvg={allDistrictAverages?.[String(school.district)]?.elaProficiency}
                            unit="%"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Math Proficiency</TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-math-${school.dbn}`}>
                          <ComparisonCell 
                            value={school.math_proficiency} 
                            districtAvg={allDistrictAverages?.[String(school.district)]?.mathProficiency}
                            unit="%"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Climate Score</TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-climate-${school.dbn}`}>
                          <ComparisonCell 
                            value={school.climate_score} 
                            districtAvg={allDistrictAverages?.[String(school.district)]?.climateScore}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Progress Score</TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-progress-${school.dbn}`}>
                          <ComparisonCell 
                            value={school.progress_score} 
                            districtAvg={allDistrictAverages?.[String(school.district)]?.progressScore}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          Historical Trend
                        </div>
                      </TableCell>
                      {schoolsWithScores.map((school) => {
                        const trend = school.trend;
                        const trendConfig = trend ? getTrendBadgeConfig(trend.direction) : null;
                        return (
                          <TableCell key={school.dbn} className="text-center" data-testid={`cell-trend-${school.dbn}`}>
                            {trendConfig ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-col items-center gap-1">
                                    <Badge 
                                      variant="outline"
                                      className={`text-xs gap-1 ${trendConfig.className}`}
                                    >
                                      <trendConfig.icon className="w-3 h-3" />
                                      {trendConfig.label}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {trend!.changePercent > 0 ? '+' : ''}{trend!.changePercent.toFixed(1)}%
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    {trend!.yearsAnalyzed} years of data analyzed
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground text-sm">No data</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Programs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Programs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Program</TableHead>
                      {schoolsWithScores.map((school) => (
                        <TableHead key={school.dbn} className="text-center">
                          <div className="text-xs truncate max-w-[150px]">{school.name}</div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-muted-foreground" />
                          Gifted & Talented
                        </div>
                      </TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center" data-testid={`cell-gt-${school.dbn}`}>
                          <GTCell hasGT={school.has_gifted_talented} programType={school.gt_program_type} />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Baby className="w-4 h-4 text-muted-foreground" />
                          3-K Program
                        </div>
                      </TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center" data-testid={`cell-3k-${school.dbn}`}>
                          <BooleanCell value={school.has_3k} yesLabel="Available" noLabel="No" />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Baby className="w-4 h-4 text-muted-foreground" />
                          Pre-K Program
                        </div>
                      </TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center" data-testid={`cell-prek-${school.dbn}`}>
                          <BooleanCell value={school.has_prek} yesLabel="Available" noLabel="No" />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Languages className="w-4 h-4 text-muted-foreground" />
                          Dual Language
                        </div>
                      </TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center" data-testid={`cell-dual-lang-${school.dbn}`}>
                          <DualLanguageCell 
                            hasDualLanguage={school.has_dual_language} 
                            languages={school.dual_language_languages} 
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          PTA Fundraising
                        </div>
                      </TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center" data-testid={`cell-pta-${school.dbn}`}>
                          <PTACell 
                            total={school.pta_fundraising_total} 
                            perStudent={school.pta_per_student} 
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Admissions & Demand */}
          {hasAdmissionsData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Admissions & Demand (K/Pre-K/3K)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">Grade</TableHead>
                        {schoolsWithScores.map((school) => (
                          <TableHead key={school.dbn} className="text-center">
                            <div className="text-xs truncate max-w-[150px]">{school.name}</div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {['K', 'PK', '3K'].map(grade => {
                        const hasGradeData = schoolsWithScores.some(s => admissionsDataMap[s.dbn]?.[grade]);
                        if (!hasGradeData) return null;
                        
                        const gradeLabel = grade === 'K' ? 'Kindergarten' : grade === 'PK' ? 'Pre-K' : '3-K';
                        
                        return (
                          <TableRow key={grade}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Baby className="w-4 h-4 text-muted-foreground" />
                                {gradeLabel}
                              </div>
                            </TableCell>
                            {schoolsWithScores.map((school) => {
                              const metric = admissionsDataMap[school.dbn]?.[grade];
                              if (!metric) {
                                return (
                                  <TableCell key={school.dbn} className="text-center text-muted-foreground">
                                    N/A
                                  </TableCell>
                                );
                              }
                              const level = getCompetitivenessLevel(metric.appsPerSeat, metric.trueAppsPerSeat);
                              const display = getCompetitivenessDisplay(level);
                              const badgeClass = level === 'very_competitive' 
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                : level === 'competitive'
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                : level === 'moderate'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
                              // Use true applicants data when available (more accurate)
                              const displayAppsPerSeat = metric.trueAppsPerSeat ?? metric.appsPerSeat;
                              const displayOfferRate = metric.trueOfferRate ?? metric.offerRate;
                              
                              return (
                                <TableCell key={school.dbn} className="text-center" data-testid={`cell-admissions-${grade}-${school.dbn}`}>
                                  <div className="flex flex-col items-center gap-1">
                                    <Badge variant="secondary" className={badgeClass}>
                                      {display.label}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {displayAppsPerSeat?.toFixed(1)} apps/seat
                                    </span>
                                    {displayOfferRate != null && (
                                      <span className="text-xs text-muted-foreground">
                                        {(displayOfferRate * 100).toFixed(0)}% offer rate
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* NYC School Survey */}
          {hasSurveyData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5" />
                  NYC School Survey
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">Metric</TableHead>
                        {schoolsWithScores.map((school) => (
                          <TableHead key={school.dbn} className="text-center">
                            <div className="text-xs truncate max-w-[150px]">{school.name}</div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-muted-foreground" />
                            Student Safety
                          </div>
                        </TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-safety-${school.dbn}`}>
                            <ComparisonCell value={school.student_safety} unit="%" />
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-muted-foreground" />
                            Student Engagement
                          </div>
                        </TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-engagement-${school.dbn}`}>
                            <ComparisonCell value={school.student_engagement} unit="%" />
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-muted-foreground" />
                            Student-Teacher Trust
                          </div>
                        </TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-trust-${school.dbn}`}>
                            <ComparisonCell value={school.student_teacher_trust} unit="%" />
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <HeartHandshake className="w-4 h-4 text-muted-foreground" />
                            Guardian Satisfaction
                          </div>
                        </TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-guardian-${school.dbn}`}>
                            <ComparisonCell value={school.guardian_satisfaction} unit="%" />
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Teacher Quality</TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-teacher-quality-${school.dbn}`}>
                            <ComparisonCell value={school.teacher_quality} unit="%" />
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Teacher Collaboration</TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-teacher-collab-${school.dbn}`}>
                            <ComparisonCell value={school.teacher_collaboration} unit="%" />
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* School Info & Demographics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                School Info & Demographics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Metric</TableHead>
                      {schoolsWithScores.map((school) => (
                        <TableHead key={school.dbn} className="text-center">
                          <div className="text-xs truncate max-w-[150px]">{school.name}</div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Total Enrollment</TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-enrollment-${school.dbn}`}>
                          {school.enrollment?.toLocaleString() || 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Student:Teacher Ratio</TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-ratio-${school.dbn}`}>
                          {school.student_teacher_ratio}:1
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          Attendance Rate
                        </div>
                      </TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-attendance-${school.dbn}`}>
                          <ComparisonCell value={school.attendance_rate} unit="%" />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-muted-foreground" />
                          Economic Need Index
                        </div>
                      </TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-eni-${school.dbn}`}>
                          <ComparisonCell value={school.economic_need_index} unit="%" higherIsBetter={false} />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          English Language Learners
                        </div>
                      </TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-ell-${school.dbn}`}>
                          <ComparisonCell value={school.ell_percent} unit="%" />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Students with IEPs</TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-iep-${school.dbn}`}>
                          <ComparisonCell value={school.iep_percent} unit="%" />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          Borough
                        </div>
                      </TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center" data-testid={`cell-borough-${school.dbn}`}>
                          {school.borough || 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">District</TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center" data-testid={`cell-district-${school.dbn}`}>
                          District {school.district}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Grade Band</TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center" data-testid={`cell-grade-${school.dbn}`}>
                          {school.grade_band}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Race/Ethnicity Demographics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Race/Ethnicity Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Group</TableHead>
                      {schoolsWithScores.map((school) => (
                        <TableHead key={school.dbn} className="text-center">
                          <div className="text-xs truncate max-w-[150px]">{school.name}</div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Asian</TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-asian-${school.dbn}`}>
                          {school.asian_percent != null ? `${school.asian_percent}%` : 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Black</TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-black-${school.dbn}`}>
                          {school.black_percent != null ? `${school.black_percent}%` : 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Hispanic</TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-hispanic-${school.dbn}`}>
                          {school.hispanic_percent != null ? `${school.hispanic_percent}%` : 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">White</TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-white-${school.dbn}`}>
                          {school.white_percent != null ? `${school.white_percent}%` : 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Multi-Racial</TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-multiracial-${school.dbn}`}>
                          {school.multi_racial_percent != null ? `${school.multi_racial_percent}%` : 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* High School Metrics - Only shown when ALL schools are high schools */}
          {allHighSchools && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  High School Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">Metric</TableHead>
                        {schoolsWithScores.map((school) => (
                          <TableHead key={school.dbn} className="text-center">
                            <div className="text-xs truncate max-w-[150px]">{school.name}</div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">4-Year Graduation Rate</TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-grad4-${school.dbn}`}>
                            <ComparisonCell value={school.graduation_rate_4yr} unit="%" />
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">6-Year Graduation Rate</TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-grad6-${school.dbn}`}>
                            <ComparisonCell value={school.graduation_rate_6yr} unit="%" />
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">College Readiness</TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-college-ready-${school.dbn}`}>
                            <ComparisonCell value={school.college_readiness_rate} unit="%" />
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">College Enrollment</TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-college-enroll-${school.dbn}`}>
                            <ComparisonCell value={school.college_enrollment_rate} unit="%" />
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow className="bg-amber-50/50 dark:bg-amber-900/10">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            SAT Total (Avg)
                            <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300">
                              2012
                            </Badge>
                          </div>
                        </TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums text-muted-foreground" data-testid={`cell-sat-${school.dbn}`}>
                            {school.sat_avg_total || <span className="text-muted-foreground">N/A</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow className="bg-amber-50/50 dark:bg-amber-900/10">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            SAT Reading/Writing
                            <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300">
                              2012
                            </Badge>
                          </div>
                        </TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums text-muted-foreground" data-testid={`cell-sat-reading-${school.dbn}`}>
                            {school.sat_avg_reading || <span className="text-muted-foreground">N/A</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow className="bg-amber-50/50 dark:bg-amber-900/10">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            SAT Math
                            <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300">
                              2012
                            </Badge>
                          </div>
                        </TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums text-muted-foreground" data-testid={`cell-sat-math-${school.dbn}`}>
                            {school.sat_avg_math || <span className="text-muted-foreground">N/A</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Regents Pass Rate</TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-regents-${school.dbn}`}>
                            <ComparisonCell value={school.regents_pass_rate} unit="%" />
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">AP Courses Offered</TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-ap-count-${school.dbn}`}>
                            {school.ap_course_count || <span className="text-muted-foreground">N/A</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">AP Pass Rate (3+)</TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-ap-pass-${school.dbn}`}>
                            <ComparisonCell value={school.ap_pass_rate} unit="%" />
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Admission Method</TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center" data-testid={`cell-admission-${school.dbn}`}>
                            {school.hs_admission_method ? (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {school.hs_admission_method}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Specialized HS</TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center" data-testid={`cell-specialized-${school.dbn}`}>
                            <BooleanCell value={school.is_specialized_hs} />
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
          </>
          )}
          
          <div className="text-xs text-muted-foreground text-center py-4 space-y-1" data-testid="text-data-source">
            <p>Data from NYC Department of Education School Survey and public records.</p>
            <p>Test scores and demographics: 2021-22 to 2022-23 | Climate/Progress: 2023-2024</p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
