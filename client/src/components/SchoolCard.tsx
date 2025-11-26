import { School, calculateOverallScore, getScoreColor, getMetricColor, getQualityRatingLabel, getQualityRatingBadgeClasses, getSchoolUrl, isHighSchool, isPureHighSchool, isCombinedSchool, type SchoolTrend, type TrendDirection } from "@shared/schema";
import { getBoroughFromDBN } from "@shared/boroughMapping";
import { METRIC_TOOLTIPS } from "@shared/metricHelp";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, Users, GraduationCap, MapPin, Info, Plus, Check, Home, TrendingUp, TrendingDown, Minus, BookOpen, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "./FavoriteButton";
import { useComparison } from "@/contexts/ComparisonContext";
import { Link } from "wouter";
import { CommuteTime } from "./CommuteTime";

interface SchoolCardProps {
  school: School;
  trend?: SchoolTrend;
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

export function SchoolCard({ school, trend }: SchoolCardProps) {
  const overallScore = calculateOverallScore(school);
  const trendConfig = trend && trend.direction !== 'insufficient_data' ? getTrendBadgeConfig(trend.direction) : null;
  const scoreColor = getScoreColor(overallScore);
  const elaColor = getMetricColor(school.ela_proficiency);
  const mathColor = getMetricColor(school.math_proficiency);
  const borough = getBoroughFromDBN(school.dbn);
  const { addToComparison, removeFromComparison, isInComparison, comparedSchools } = useComparison();
  const inComparison = isInComparison(school.dbn);
  const canAddMore = comparedSchools.length < 4;
  
  const isHS = isHighSchool(school);
  const isPureHS = isPureHighSchool(school);
  const isCombined = isCombinedSchool(school);
  const hasHSData = isHS && school.graduation_rate_4yr !== null;
  const gradRateColor = hasHSData ? getMetricColor(school.graduation_rate_4yr!) : 'gray';
  const collegeReadyColor = hasHSData && school.college_readiness_rate ? getMetricColor(school.college_readiness_rate) : 'gray';
  
  // Determine if ELA/Math scores are valid (not placeholder 50/50 values)
  const hasValidELAMath = school.ela_proficiency !== 50 || school.math_proficiency !== 50;
  
  // For cards: Show ELA/Math if school has valid scores AND is not a pure high school
  // For pure high schools (9-12 only): Show Graduation Rate and SAT/College Readiness
  // For combined schools (K-12, 6-12) with valid ELA/Math: Show ELA/Math on card (detail panel shows both)
  const showELAMathOnCard = !isPureHS && hasValidELAMath;
  const showHSMetricsOnCard = isPureHS || (!hasValidELAMath && isHS);

  const colorMap: Record<string, string> = {
    green: "bg-emerald-500",
    yellow: "bg-yellow-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    gray: "bg-gray-400",
  };

  // Find best quality rating
  const ratings = [
    { type: 'instruction', value: school.quality_rating_instruction },
    { type: 'safety', value: school.quality_rating_safety },
    { type: 'family', value: school.quality_rating_family }
  ].filter(r => r.value);
  
  const bestRating = ratings.length > 0 
    ? ratings.sort((a, b) => {
        const order = { 'Excellent': 4, 'Good': 3, 'Fair': 2, 'Needs Improvement': 1 };
        return (order[b.value as keyof typeof order] || 0) - (order[a.value as keyof typeof order] || 0);
      })[0]
    : null;

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inComparison) {
      removeFromComparison(school.dbn);
    } else if (canAddMore) {
      addToComparison(school);
    }
  };

  return (
    <Link href={getSchoolUrl(school)} data-testid={`link-school-${school.dbn}`}>
      <Card
        data-testid={`school-card-${school.dbn}`}
        className="overflow-visible hover-elevate active-elevate-2 transition-all"
      >
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <h3 className="text-lg font-semibold text-foreground line-clamp-2 flex-1" data-testid={`text-school-name-${school.dbn}`}>
                {school.name}
              </h3>
              <FavoriteButton schoolDbn={school.dbn} variant="ghost" size="icon" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs" data-testid={`badge-dbn-${school.dbn}`}>
                {school.dbn}
              </Badge>
              {school.has_3k && (
                <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700" data-testid={`badge-3k-${school.dbn}`}>
                  3-K
                </Badge>
              )}
              {school.has_prek && (
                <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700" data-testid={`badge-prek-${school.dbn}`}>
                  Pre-K
                </Badge>
              )}
              {school.has_gifted_talented && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    school.gt_program_type === 'citywide' 
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700' 
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
                  }`} 
                  data-testid={`badge-gt-${school.dbn}`}
                >
                  {school.gt_program_type === 'citywide' ? 'Citywide G&T' : 'G&T'}
                </Badge>
              )}
              {school.is_specialized_hs && (
                <Badge 
                  variant="outline" 
                  className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700" 
                  data-testid={`badge-specialized-${school.dbn}`}
                >
                  Specialized HS
                </Badge>
              )}
              {school.has_dual_language && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Badge 
                        variant="outline" 
                        className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700" 
                        data-testid={`badge-dual-language-${school.dbn}`}
                      >
                        Dual Language
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs" data-testid={`tooltip-dual-language-${school.dbn}`}>
                    <p className="text-sm">
                      {school.dual_language_languages?.length 
                        ? `Dual Language: ${school.dual_language_languages.join(', ')}`
                        : 'Dual Language Program Available'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
              {school.economic_need_index !== null && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Badge variant="outline" className="text-xs gap-1" data-testid={`badge-economic-${school.dbn}`}>
                        <Home className="w-3 h-3" />
                        {school.economic_need_index}% ENI
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs" data-testid={`tooltip-economic-${school.dbn}`}>
                    <p className="text-sm">{METRIC_TOOLTIPS.economicNeedIndex.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {bestRating && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Badge 
                        variant="outline"
                        className={`text-xs ${getQualityRatingBadgeClasses(bestRating.value)}`}
                        data-testid={`badge-quality-${school.dbn}`}
                      >
                        {getQualityRatingLabel(bestRating.value)}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs" data-testid={`tooltip-quality-${school.dbn}`}>
                    <p className="text-sm">
                      Best Quality Rating: {bestRating.value} for {bestRating.type === 'instruction' ? 'Instruction' : bestRating.type === 'safety' ? 'Safety' : 'Family Engagement'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
              {trendConfig && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Badge 
                        variant="outline"
                        className={`text-xs gap-1 ${trendConfig.className}`}
                        data-testid={`badge-trend-${school.dbn}`}
                      >
                        <trendConfig.icon className="w-3 h-3" />
                        {trendConfig.label}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs" data-testid={`tooltip-trend-${school.dbn}`}>
                    <p className="text-sm">
                      {trend!.direction === 'improving' 
                        ? `Test scores improved by ${Math.abs(trend!.changePercent)}% over ${trend!.yearsAnalyzed} years`
                        : trend!.direction === 'declining'
                        ? `Test scores declined by ${Math.abs(trend!.changePercent)}% over ${trend!.yearsAnalyzed} years`
                        : `Test scores remained stable over ${trend!.yearsAnalyzed} years (±5% change)`
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${colorMap[scoreColor]}`} data-testid={`indicator-score-${school.dbn}`} title={METRIC_TOOLTIPS.colorLegend[scoreColor].description} />
              <span className="text-4xl font-bold tabular-nums" data-testid={`score-overall-${school.dbn}`}>
                {overallScore}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground" data-testid={`text-score-label-${school.dbn}`}>Overall</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    data-testid={`button-tooltip-overall-${school.dbn}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Overall score information"
                  >
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs" data-testid={`tooltip-overall-${school.dbn}`}>
                  <p className="text-sm">{METRIC_TOOLTIPS.overallScore.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {showHSMetricsOnCard && hasHSData ? (
            <>
              <div className="flex items-center gap-2 bg-muted/50 rounded-md p-3" data-testid={`container-gradrate-${school.dbn}`}>
                <div className={`w-2 h-2 rounded-full ${colorMap[gradRateColor]} shrink-0`} data-testid={`indicator-gradrate-${school.dbn}`} />
                <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" data-testid={`icon-gradrate-${school.dbn}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium tabular-nums" data-testid={`score-gradrate-${school.dbn}`}>{school.graduation_rate_4yr}%</div>
                  <div className="text-xs text-muted-foreground truncate" data-testid={`label-gradrate-${school.dbn}`}>Grad Rate</div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0 shrink-0"
                      data-testid={`button-tooltip-gradrate-${school.dbn}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Graduation rate information"
                    >
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs" data-testid={`tooltip-gradrate-${school.dbn}`}>
                    <p className="text-sm">4-year graduation rate: percentage of students who graduate within 4 years of entering high school.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="flex items-center gap-2 bg-muted/50 rounded-md p-3" data-testid={`container-sat-${school.dbn}`}>
                {school.sat_avg_total ? (
                  <>
                    <div className={`w-2 h-2 rounded-full ${colorMap[school.sat_avg_total >= 1200 ? 'green' : school.sat_avg_total >= 1000 ? 'yellow' : school.sat_avg_total >= 800 ? 'amber' : 'red']} shrink-0`} data-testid={`indicator-sat-${school.dbn}`} />
                    <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" data-testid={`icon-sat-${school.dbn}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium tabular-nums" data-testid={`score-sat-${school.dbn}`}>{school.sat_avg_total}</div>
                      <div className="text-xs text-muted-foreground truncate" data-testid={`label-sat-${school.dbn}`}>SAT Avg</div>
                    </div>
                  </>
                ) : school.college_readiness_rate ? (
                  <>
                    <div className={`w-2 h-2 rounded-full ${colorMap[collegeReadyColor]} shrink-0`} data-testid={`indicator-college-${school.dbn}`} />
                    <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" data-testid={`icon-college-${school.dbn}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium tabular-nums" data-testid={`score-college-${school.dbn}`}>{school.college_readiness_rate}%</div>
                      <div className="text-xs text-muted-foreground truncate" data-testid={`label-college-${school.dbn}`}>College Ready</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                    <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-muted-foreground">N/A</div>
                      <div className="text-xs text-muted-foreground truncate">SAT/College</div>
                    </div>
                  </>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0 shrink-0"
                      data-testid={`button-tooltip-sat-${school.dbn}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="SAT or college readiness information"
                    >
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs" data-testid={`tooltip-sat-${school.dbn}`}>
                    <p className="text-sm">{school.sat_avg_total ? 'Average SAT score (combined reading & math). 1200+ is excellent, 1000+ is solid.' : 'College & career readiness rate: percentage of students meeting college readiness standards.'}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-muted/50 rounded-md p-3" data-testid={`container-ela-${school.dbn}`}>
                <div className={`w-2 h-2 rounded-full ${colorMap[elaColor]} shrink-0`} data-testid={`indicator-ela-${school.dbn}`} />
                <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" data-testid={`icon-ela-${school.dbn}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium tabular-nums" data-testid={`score-ela-${school.dbn}`}>{school.ela_proficiency}%</div>
                  <div className="text-xs text-muted-foreground truncate" data-testid={`label-ela-${school.dbn}`}>ELA</div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0 shrink-0"
                      data-testid={`button-tooltip-ela-${school.dbn}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="ELA proficiency information"
                    >
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs" data-testid={`tooltip-ela-${school.dbn}`}>
                    <p className="text-sm">{METRIC_TOOLTIPS.elaProficiency.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="flex items-center gap-2 bg-muted/50 rounded-md p-3" data-testid={`container-math-${school.dbn}`}>
                <div className={`w-2 h-2 rounded-full ${colorMap[mathColor]} shrink-0`} data-testid={`indicator-math-${school.dbn}`} />
                <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" data-testid={`icon-math-${school.dbn}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium tabular-nums" data-testid={`score-math-${school.dbn}`}>{school.math_proficiency}%</div>
                  <div className="text-xs text-muted-foreground truncate" data-testid={`label-math-${school.dbn}`}>Math</div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0 shrink-0"
                      data-testid={`button-tooltip-math-${school.dbn}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Math proficiency information"
                    >
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs" data-testid={`tooltip-math-${school.dbn}`}>
                    <p className="text-sm">{METRIC_TOOLTIPS.mathProficiency.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-4 flex-wrap">
            {borough && (
              <span className="flex items-center gap-1" data-testid={`text-borough-${school.dbn}`}>
                <MapPin className="w-3 h-3" data-testid={`icon-borough-${school.dbn}`} />
                {borough}
              </span>
            )}
            <span data-testid={`text-district-${school.dbn}`}>District {school.district}</span>
            <span className="flex items-center gap-1" data-testid={`text-ratio-${school.dbn}`}>
              <Users className="w-3 h-3" data-testid={`icon-ratio-${school.dbn}`} />
              {school.student_teacher_ratio}:1
            </span>
            <CommuteTime schoolDbn={school.dbn} compact data-testid={`commute-${school.dbn}`} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={inComparison ? "default" : "outline"}
              size="sm"
              onClick={handleCompareClick}
              disabled={!inComparison && !canAddMore}
              data-testid={`button-compare-${school.dbn}`}
              className="h-8"
            >
              {inComparison ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Added
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3 mr-1" />
                  Compare
                </>
              )}
            </Button>
            <ChevronRight className="w-4 h-4" data-testid={`icon-chevron-${school.dbn}`} />
          </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
