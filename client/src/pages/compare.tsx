import { useComparison } from "@/contexts/ComparisonContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { Link } from "wouter";
import { 
  X, GraduationCap, Users, TrendingUp, Sun, MapPin, Home, TrendingDown, Minus, Scale,
  Baby, Sparkles, Star, Shield, HeartHandshake, BookOpen, Award, Clock, UserCheck,
  Globe, Percent, Languages, DollarSign
} from "lucide-react";
import { calculateOverallScore, getScoreColor, getSchoolUrl, SchoolTrend, TrendDirection } from "@shared/schema";
import { getBoroughFromDBN } from "@shared/boroughMapping";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
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
  const { comparedSchools, removeFromComparison, clearComparison } = useComparison();
  
  // Fetch all district averages for comparison
  const { data: allDistrictAverages } = useQuery<Record<string, DistrictAverages>>({
    queryKey: ["/api/districts/averages"],
  });

  // Fetch historical trends
  const { data: trends } = useQuery<Record<string, SchoolTrend>>({
    queryKey: ["/api/schools-trends"],
  });

  if (comparedSchools.length === 0) {
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

  const schoolsWithScores = comparedSchools.map(school => ({
    ...school,
    overall_score: calculateOverallScore(school),
    scoreColor: getScoreColor(calculateOverallScore(school)),
    borough: getBoroughFromDBN(school.dbn),
    trend: trends?.[school.dbn],
  }));

  const colorMap = {
    green: "text-emerald-500",
    yellow: "text-yellow-500",
    amber: "text-amber-500",
    red: "text-red-500",
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

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead 
        title="Compare Schools Side-by-Side"
        description="Compare NYC schools side-by-side. View test scores, ratings, demographics, historical trends, and key metrics to make informed enrollment decisions."
        keywords="compare NYC schools, school comparison tool, side-by-side school ratings, NYC school metrics, school comparison"
        canonicalPath="/compare"
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
              Comparing {comparedSchools.length} {comparedSchools.length === 1 ? 'school' : 'schools'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearComparison}
            data-testid="button-clear-all-compare"
          >
            Clear All
          </Button>
        </div>

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
                        {school.overall_score}
                      </div>
                      <div className="text-xs text-muted-foreground">Overall Score</div>
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
                      <TableRow>
                        <TableCell className="font-medium">SAT Total (Avg)</TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-sat-${school.dbn}`}>
                            {school.sat_avg_total || <span className="text-muted-foreground">N/A</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">SAT Reading/Writing</TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-sat-reading-${school.dbn}`}>
                            {school.sat_avg_reading || <span className="text-muted-foreground">N/A</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">SAT Math</TableCell>
                        {schoolsWithScores.map((school) => (
                          <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-sat-math-${school.dbn}`}>
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
