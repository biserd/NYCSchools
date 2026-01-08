import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, Target, Info, ChevronDown, ChevronUp, ExternalLink, AlertTriangle, Lock, Zap, Loader2 } from "lucide-react";
import { useState } from "react";
import { type AdmissionsMetrics, getCompetitivenessLevel, getCompetitivenessDisplay } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useFreeSchoolView } from "@/hooks/useFreeSchoolView";
import { useCheckout } from "@/hooks/useCheckout";

interface AdmissionsSectionProps {
  dbn: string;
  schoolName: string;
  has3k?: boolean;
  hasPrek?: boolean;
  gradeBand?: string;
}

export function AdmissionsSection({ dbn, schoolName, has3k, hasPrek, gradeBand }: AdmissionsSectionProps) {
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { startCheckout, isPending: checkoutPending } = useCheckout();

  const { data: subscription } = useQuery<{ status: string; plan: string }>({
    queryKey: ["/api/subscription"],
    enabled: isAuthenticated && !authLoading,
  });
  
  // Check if this is the user's free school view
  const { isThisFreeSchool } = useFreeSchoolView(dbn);

  // Premium access: paid subscription OR this is their one free school
  const hasPaidPremium = subscription?.status === "active" && 
    (subscription?.plan === "premium" || subscription?.plan === "season_pass");
  const isPremium = hasPaidPremium || isThisFreeSchool;

  const { data: admissionsData, isLoading } = useQuery<AdmissionsMetrics[]>({
    queryKey: ["/api/schools", dbn, "admissions"],
  });

  const hasEarlyGrades = gradeBand?.includes("PK") || gradeBand?.includes("K") || has3k || hasPrek;
  
  if (!isLoading && (!admissionsData || admissionsData.length === 0)) {
    if (!hasEarlyGrades) return null;
    return null;
  }

  const metricsByGrade = (admissionsData || []).reduce((acc, m) => {
    if (!acc[m.gradeBand]) acc[m.gradeBand] = [];
    acc[m.gradeBand].push(m);
    return acc;
  }, {} as Record<string, AdmissionsMetrics[]>);

  const getLatestMetric = (grade: string) => {
    const gradeMetrics = metricsByGrade[grade];
    if (!gradeMetrics || gradeMetrics.length === 0) return undefined;
    return gradeMetrics.sort((a, b) => b.schoolYear.localeCompare(a.schoolYear))[0];
  };

  const gradeLabels: Record<string, string> = {
    'K': 'Kindergarten',
    'PK': 'Pre-K',
    '3K': '3-K'
  };

  const getCompetitivenessColor = (level: string) => {
    switch (level) {
      case 'very_competitive': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700';
      case 'competitive': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      case 'moderate': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      case 'accessible': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600';
    }
  };

  const hasAnyData = Object.keys(metricsByGrade).length > 0;

  if (!hasAnyData && !isLoading) {
    return null;
  }

  return (
    <Card className="p-4 mt-4" data-testid="section-admissions">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-base">Admissions & Demand</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>Data from NYC DOE Local Law 72 reports showing application demand and offer rates for K, Pre-K, and 3-K programs.</p>
          </TooltipContent>
        </Tooltip>
        {!isPremium && (
          <Badge variant="outline" className="ml-auto text-xs gap-1">
            <Lock className="h-3 w-3" />
            Premium
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : !isPremium ? (
        <div className="relative">
          <div className="space-y-4 blur-sm select-none pointer-events-none" aria-hidden="true">
            {Object.keys(gradeLabels).map(grade => {
              const metric = getLatestMetric(grade);
              if (!metric) return null;

              return (
                <div 
                  key={grade} 
                  className="border rounded-lg p-3 bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{gradeLabels[grade]}</span>
                      <span className="text-xs text-muted-foreground">({metric.schoolYear})</span>
                    </div>
                    <Badge variant="outline" className="bg-gray-100 text-gray-600">
                      --
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="space-y-0.5">
                      <div className="text-muted-foreground text-xs">Seats</div>
                      <div className="font-medium">---</div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-muted-foreground text-xs">Applicants</div>
                      <div className="font-medium">---</div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-muted-foreground text-xs">Apps/Seat</div>
                      <div className="font-medium">--</div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-muted-foreground text-xs">Offer Rate</div>
                      <div className="font-medium">--%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-background/90 backdrop-blur-sm rounded-lg p-6 text-center shadow-lg border max-w-xs">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Unlock Admissions Data</h4>
              <p className="text-sm text-muted-foreground mb-4">
                See application demand, competitiveness levels, and offer rates for K, Pre-K, and 3-K programs.
              </p>
              <Button 
                onClick={startCheckout}
                disabled={checkoutPending}
                className="bg-gradient-to-r from-primary to-primary/80"
                data-testid="button-unlock-admissions"
              >
                {checkoutPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Get Premium
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(gradeLabels).map(grade => {
            const metric = getLatestMetric(grade);
            if (!metric) return null;

            const competitivenessLevel = getCompetitivenessLevel(metric.appsPerSeat, metric.trueAppsPerSeat);
            const competitivenessInfo = getCompetitivenessDisplay(competitivenessLevel);
            // Use true applicants data when available (more accurate odds)
            const displayAppsPerSeat = metric.trueAppsPerSeat ?? metric.appsPerSeat;
            const displayOfferRate = metric.trueOfferRate ?? metric.offerRate;
            const displayApplicants = metric.trueApplicants ?? metric.totalApplicants;

            return (
              <div 
                key={grade} 
                className="border rounded-lg p-3 bg-muted/30"
                data-testid={`admissions-grade-${grade}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{gradeLabels[grade]}</span>
                    <span className="text-xs text-muted-foreground">({metric.schoolYear})</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getCompetitivenessColor(competitivenessLevel)}
                    data-testid={`badge-competitiveness-${grade}`}
                  >
                    {competitivenessInfo.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="space-y-0.5">
                    <div className="text-muted-foreground text-xs">Seats</div>
                    <div className="font-medium" data-testid={`text-seats-${grade}`}>
                      {metric.seatsAvailable?.toLocaleString() ?? 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-muted-foreground text-xs flex items-center gap-1 cursor-help">
                          Applicants
                          <Info className="h-3 w-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Unique applicants who ranked this school (not total applications).</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className="font-medium" data-testid={`text-applicants-${grade}`}>
                      {displayApplicants?.toLocaleString() ?? 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-muted-foreground text-xs flex items-center gap-1 cursor-help">
                          Apps/Seat
                          <Info className="h-3 w-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Applicants per available seat. Higher = more competitive.</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className="font-medium" data-testid={`text-apps-per-seat-${grade}`}>
                      {displayAppsPerSeat?.toFixed(1) ?? 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-muted-foreground text-xs flex items-center gap-1 cursor-help">
                          Offer Rate
                          <Info className="h-3 w-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Percentage of applicants who received an offer.</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className="font-medium" data-testid={`text-offer-rate-${grade}`}>
                      {displayOfferRate != null ? `${(displayOfferRate * 100).toFixed(0)}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                {metric.estimatedFillRate != null && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Est. Fill Rate:</span>
                      <span className="font-medium">{(metric.estimatedFillRate * 100).toFixed(0)}%</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-3 w-3 text-amber-500 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Estimated based on {metric.estimationMethod === 'historical_yield' ? 'historical yield data' : 'district averages'}.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {Object.keys(metricsByGrade).length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No admissions data available for this school.
            </div>
          )}

          <Collapsible open={methodologyOpen} onOpenChange={setMethodologyOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between text-muted-foreground hover:text-foreground"
                data-testid="button-toggle-methodology"
              >
                <span className="text-xs">How is this data calculated?</span>
                {methodologyOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs space-y-2" data-testid="section-methodology">
                <p className="font-medium">Data Sources</p>
                <p className="text-muted-foreground">
                  Data is sourced from NYC DOE Local Law 72 "Student Applications, Admissions and Offers" reports, 
                  which provide official data on seats, applicants, and offers for each school.
                </p>
                
                <p className="font-medium mt-3">Key Metrics</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li><strong>Applicants:</strong> Unique applicants who ranked this school (not raw application count, since families apply to multiple schools)</li>
                  <li><strong>Apps per Seat:</strong> Unique Applicants ÷ Seats Available</li>
                  <li><strong>Offer Rate:</strong> Offers Made ÷ Unique Applicants</li>
                  <li><strong>Est. Fill Rate:</strong> Uses Bayesian-smoothed historical yield to estimate how full the school will be</li>
                </ul>
                
                <p className="font-medium mt-3">Competitiveness Levels</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li><strong>Very Competitive:</strong> 3+ applicants per seat</li>
                  <li><strong>Competitive:</strong> 2-3 applicants per seat</li>
                  <li><strong>Moderate:</strong> 1.2-2 applicants per seat</li>
                  <li><strong>Accessible:</strong> Less than 1.2 applicants per seat</li>
                </ul>

                <p className="font-medium mt-3">How Admissions Work</p>
                <p className="text-muted-foreground">
                  NYC uses a centralized matching algorithm. Families rank schools by preference, and each program 
                  has priority groups (zone, sibling, in-district). If more applicants than seats within a priority 
                  group, random numbers determine who gets offers.
                </p>

                <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                  <a 
                    href="https://infohub.nyced.org/reports/government-reports/student-applications-admissions-and-offers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View Source Data
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </Card>
  );
}
