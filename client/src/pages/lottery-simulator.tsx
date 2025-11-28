import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { 
  Shuffle, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Plus, 
  Play, 
  Info, 
  Trophy,
  AlertCircle,
  HelpCircle,
  GraduationCap,
  Users,
  Building2,
  MapPin
} from "lucide-react";
import { School, calculateOverallScore } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type PriorityType = "sibling" | "zoned" | "district" | "borough" | "citywide";

interface RankedSchool {
  school: School;
  priority: PriorityType;
}

interface SimulationResult {
  dbn: string;
  schoolName: string;
  rank: number;
  acceptanceProbability: number;
  matchedInSimulations: number;
  totalSimulations: number;
  priority: PriorityType;
}

interface OverallResult {
  matchedSchool: SimulationResult | null;
  matchRate: number;
  waitlistRate: number;
  unmatchedRate: number;
}

const PRIORITY_LABELS: Record<PriorityType, string> = {
  sibling: "Sibling Priority",
  zoned: "Zoned",
  district: "In-District",
  borough: "In-Borough",
  citywide: "Citywide",
};

// Priority tiers determine order within each school's applicant pool
// Higher tier = processed first (guaranteed seat if available)
const PRIORITY_TIERS: Record<PriorityType, number> = {
  sibling: 1,    // Processed first - nearly guaranteed if seats exist
  zoned: 2,      // Processed second - high priority for zoned schools
  district: 3,   // In-district applicants processed next
  borough: 4,    // In-borough processed after district
  citywide: 5,   // Citywide applicants processed last
};

interface SchoolDemandProfile {
  estimatedSeats: number;        // Estimated seats per grade
  estimatedApplicants: number;   // Estimated applicants in your tier
  demandRatio: number;           // Applicants per seat (higher = more competitive)
}

function estimateSchoolDemand(school: School, priority: PriorityType): SchoolDemandProfile {
  // Estimate seats based on enrollment (3-K/Pre-K typically have 18-36 seats per class)
  const baseSeats = school.enrollment ? Math.max(18, Math.min(72, school.enrollment / 8)) : 36;
  
  // Estimate base applicants - more for popular/high-rated schools
  const overallScore = calculateOverallScore(school);
  let demandMultiplier = 1.0;
  
  if (overallScore >= 90) demandMultiplier = 3.5;
  else if (overallScore >= 80) demandMultiplier = 2.5;
  else if (overallScore >= 70) demandMultiplier = 1.8;
  else if (overallScore >= 60) demandMultiplier = 1.2;
  else demandMultiplier = 0.8;
  
  // Special programs increase demand significantly
  if (school.has_gifted_talented) demandMultiplier *= 1.5;
  if (school.has_dual_language) demandMultiplier *= 1.3;
  
  // Estimate total applicants across all priority tiers
  const totalApplicants = Math.round(baseSeats * demandMultiplier);
  
  // Distribute applicants across priority tiers (realistic distribution)
  // Sibling: ~5%, Zoned: ~30%, District: ~40%, Borough: ~15%, Citywide: ~10%
  const tierDistributions: Record<PriorityType, number> = {
    sibling: 0.05,
    zoned: 0.30,
    district: 0.40,
    borough: 0.15,
    citywide: 0.10,
  };
  
  // Calculate applicants in your tier and higher priority tiers
  let applicantsAheadOfYou = 0;
  let applicantsInYourTier = Math.max(1, Math.round(totalApplicants * tierDistributions[priority]));
  
  for (const [tier, pct] of Object.entries(tierDistributions)) {
    if (PRIORITY_TIERS[tier as PriorityType] < PRIORITY_TIERS[priority]) {
      applicantsAheadOfYou += Math.round(totalApplicants * pct);
    }
  }
  
  // Calculate remaining seats after higher-priority applicants
  const seatsAfterHigherPriority = Math.max(0, baseSeats - applicantsAheadOfYou);
  
  return {
    estimatedSeats: seatsAfterHigherPriority,
    estimatedApplicants: applicantsInYourTier,
    demandRatio: applicantsInYourTier / Math.max(1, seatsAfterHigherPriority),
  };
}

function runMonteCarloSimulation(
  rankedSchools: RankedSchool[],
  numSimulations: number = 1000
): { results: SimulationResult[]; overall: OverallResult } {
  const results: SimulationResult[] = rankedSchools.map((rs, index) => ({
    dbn: rs.school.dbn,
    schoolName: rs.school.name,
    rank: index + 1,
    acceptanceProbability: 0,
    matchedInSimulations: 0,
    totalSimulations: numSimulations,
    priority: rs.priority,
  }));
  
  // Pre-calculate demand profiles for each school
  const demandProfiles = rankedSchools.map(rs => 
    estimateSchoolDemand(rs.school, rs.priority)
  );
  
  let totalMatched = 0;
  let totalWaitlisted = 0;
  
  for (let sim = 0; sim < numSimulations; sim++) {
    // Each simulation: applicant gets random lottery numbers for each school
    // They're matched to highest-ranked school where they beat the cutoff
    let matched = false;
    let lastSchoolIndex = -1;
    
    for (let i = 0; i < rankedSchools.length; i++) {
      const profile = demandProfiles[i];
      lastSchoolIndex = i;
      
      // Sibling priority is nearly guaranteed (98% if seats available)
      if (rankedSchools[i].priority === "sibling") {
        if (profile.estimatedSeats > 0 && Math.random() < 0.98) {
          results[i].matchedInSimulations++;
          matched = true;
          totalMatched++;
          break;
        }
        continue;
      }
      
      // Zoned priority is very high (90% if seats available for your zone)
      if (rankedSchools[i].priority === "zoned") {
        if (profile.estimatedSeats > 0 && Math.random() < 0.85) {
          results[i].matchedInSimulations++;
          matched = true;
          totalMatched++;
          break;
        }
        continue;
      }
      
      // For other priorities: lottery within tier
      // Acceptance probability = seats available / applicants in tier
      const acceptanceProb = Math.min(0.95, profile.estimatedSeats / profile.estimatedApplicants);
      const lotteryNumber = Math.random();
      
      if (lotteryNumber < acceptanceProb) {
        results[i].matchedInSimulations++;
        matched = true;
        totalMatched++;
        break;
      }
    }
    
    // Waitlist calculation based on last school attempted
    if (!matched && lastSchoolIndex >= 0) {
      const lastProfile = demandProfiles[lastSchoolIndex];
      // Waitlist probability based on how close to cutoff
      const waitlistProb = Math.min(0.5, 0.3 / Math.max(0.5, lastProfile.demandRatio));
      if (Math.random() < waitlistProb) {
        totalWaitlisted++;
      }
    }
  }
  
  // Calculate probabilities
  results.forEach(r => {
    r.acceptanceProbability = Math.round((r.matchedInSimulations / numSimulations) * 100);
  });
  
  // Find most likely match
  let matchedSchool: SimulationResult | null = null;
  let maxMatches = 0;
  results.forEach(r => {
    if (r.matchedInSimulations > maxMatches) {
      maxMatches = r.matchedInSimulations;
      matchedSchool = r;
    }
  });
  
  return {
    results,
    overall: {
      matchedSchool,
      matchRate: Math.round((totalMatched / numSimulations) * 100),
      waitlistRate: Math.round((totalWaitlisted / numSimulations) * 100),
      unmatchedRate: Math.round(((numSimulations - totalMatched - totalWaitlisted) / numSimulations) * 100),
    },
  };
}

export default function LotterySimulatorPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [rankedSchools, setRankedSchools] = useState<RankedSchool[]>([]);
  const [simulationResults, setSimulationResults] = useState<{
    results: SimulationResult[];
    overall: OverallResult;
  } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [districtFilter, setDistrictFilter] = useState<string>("all");

  const { data: allSchools, isLoading } = useQuery<School[]>({
    queryKey: ["/api/schools"],
  });

  // Filter schools to only show 3-K and Pre-K eligible (elementary schools)
  const eligibleSchools = useMemo(() => {
    if (!allSchools) return [];
    return allSchools.filter(school => 
      (school.has_3k || school.has_prek) ||
      (school.grade_band === "ES" || school.grade_band?.includes("K"))
    );
  }, [allSchools]);

  // Apply search and district filter
  const filteredSchools = useMemo(() => {
    let schools = eligibleSchools;
    
    if (districtFilter !== "all") {
      schools = schools.filter(s => s.district?.toString() === districtFilter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      schools = schools.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.dbn.toLowerCase().includes(query)
      );
    }
    
    // Exclude already ranked schools
    const rankedDBNs = new Set(rankedSchools.map(rs => rs.school.dbn));
    schools = schools.filter(s => !rankedDBNs.has(s.dbn));
    
    return schools.slice(0, 50); // Limit display
  }, [eligibleSchools, searchQuery, districtFilter, rankedSchools]);

  const addSchool = (school: School) => {
    if (rankedSchools.length >= 12) return;
    setRankedSchools([...rankedSchools, { school, priority: "district" }]);
    setSimulationResults(null);
  };

  const removeSchool = (index: number) => {
    setRankedSchools(rankedSchools.filter((_, i) => i !== index));
    setSimulationResults(null);
  };

  const moveSchool = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= rankedSchools.length) return;
    
    const newRanked = [...rankedSchools];
    [newRanked[index], newRanked[newIndex]] = [newRanked[newIndex], newRanked[index]];
    setRankedSchools(newRanked);
    setSimulationResults(null);
  };

  const updatePriority = (index: number, priority: PriorityType) => {
    const newRanked = [...rankedSchools];
    newRanked[index] = { ...newRanked[index], priority };
    setRankedSchools(newRanked);
    setSimulationResults(null);
  };

  const runSimulation = () => {
    if (rankedSchools.length === 0) return;
    
    setIsSimulating(true);
    
    // Simulate with a small delay for UX
    setTimeout(() => {
      const results = runMonteCarloSimulation(rankedSchools, 1000);
      setSimulationResults(results);
      setIsSimulating(false);
    }, 500);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 80) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getProbabilityColor = (prob: number): string => {
    if (prob >= 60) return "bg-emerald-500";
    if (prob >= 40) return "bg-yellow-500";
    if (prob >= 20) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead 
        title="NYC School Lottery Simulator"
        description="Simulate your NYC 3-K and Pre-K school lottery outcomes. Rank schools, set your priority status, and see estimated acceptance probabilities."
        keywords="NYC school lottery, 3-K lottery simulator, Pre-K lottery, school lottery odds, NYC DOE lottery"
        canonicalPath="/lottery-simulator"
      />
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-7xl flex-1">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shuffle className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold" data-testid="text-page-title">NYC School Lottery Simulator</h1>
          </div>
          <p className="text-muted-foreground">
            Simulate your 3-K/Pre-K lottery outcomes based on your school rankings and priority status
          </p>
        </div>

        {/* Educational Alert */}
        <Alert className="mb-6">
          <HelpCircle className="h-4 w-4" />
          <AlertTitle>How This Works</AlertTitle>
          <AlertDescription>
            This simulator estimates your lottery odds based on school popularity, your priority status, and ranking order. 
            Actual lottery results depend on thousands of other applicants and their preferences. 
            <strong> Always rank schools by your true preference</strong> — the NYC lottery algorithm is designed so that 
            ranking strategically doesn't improve your odds.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: School Search */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  <CardTitle>Add Schools to Your List</CardTitle>
                </div>
                <CardDescription>
                  Search for 3-K and Pre-K schools and add up to 12 to your ranking ({12 - rankedSchools.length} remaining)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by school name or DBN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-school-search"
                    />
                  </div>
                  <Select value={districtFilter} onValueChange={setDistrictFilter}>
                    <SelectTrigger className="w-36" data-testid="select-district-filter">
                      <SelectValue placeholder="District" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Districts</SelectItem>
                      {Array.from({ length: 32 }, (_, i) => i + 1).map(d => (
                        <SelectItem key={d} value={d.toString()}>District {d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-[300px] border rounded-lg">
                  {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground">Loading schools...</div>
                  ) : filteredSchools.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {searchQuery ? "No schools found matching your search" : "No eligible schools available"}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredSchools.map(school => {
                        const score = calculateOverallScore(school);
                        return (
                          <div 
                            key={school.dbn} 
                            className="p-3 hover-elevate flex items-center justify-between gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{school.name}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{school.dbn}</span>
                                <span>•</span>
                                <span>District {school.district}</span>
                                {school.has_3k && <Badge variant="secondary" className="text-xs">3-K</Badge>}
                                {school.has_prek && <Badge variant="secondary" className="text-xs">Pre-K</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${getScoreColor(score)}`}>
                                {score > 0 ? score : "N/A"}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addSchool(school)}
                                disabled={rankedSchools.length >= 12}
                                data-testid={`button-add-school-${school.dbn}`}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Ranked Schools */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    <CardTitle>Your Ranked Schools</CardTitle>
                  </div>
                  <Badge variant="outline">{rankedSchools.length}/12</Badge>
                </div>
                <CardDescription>
                  Order schools by your true preference. First choice at top.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rankedSchools.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No schools added yet</p>
                    <p className="text-sm">Search and add schools from the left</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rankedSchools.map((rs, index) => (
                      <div 
                        key={rs.school.dbn}
                        className="flex items-center gap-2 p-3 border rounded-lg bg-card"
                      >
                        <div className="flex flex-col gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => moveSchool(index, "up")}
                            disabled={index === 0}
                            data-testid={`button-move-up-${index}`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => moveSchool(index, "down")}
                            disabled={index === rankedSchools.length - 1}
                            data-testid={`button-move-down-${index}`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-sm">{rs.school.name}</div>
                          <div className="text-xs text-muted-foreground">District {rs.school.district}</div>
                        </div>
                        
                        <Select 
                          value={rs.priority} 
                          onValueChange={(v) => updatePriority(index, v as PriorityType)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs" data-testid={`select-priority-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sibling">Sibling</SelectItem>
                            <SelectItem value="zoned">Zoned</SelectItem>
                            <SelectItem value="district">In-District</SelectItem>
                            <SelectItem value="borough">In-Borough</SelectItem>
                            <SelectItem value="citywide">Citywide</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeSchool(index)}
                          data-testid={`button-remove-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Separator className="my-4" />

                <Button
                  onClick={runSimulation}
                  disabled={rankedSchools.length === 0 || isSimulating}
                  className="w-full"
                  size="lg"
                  data-testid="button-run-simulation"
                >
                  {isSimulating ? (
                    <>
                      <Shuffle className="w-4 h-4 mr-2 animate-spin" />
                      Running 1,000 Simulations...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run Lottery Simulation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Priority Guide */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Priority Status Guide</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sibling</span>
                  <span className="text-emerald-600">Highest priority</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zoned</span>
                  <span className="text-emerald-600">Very high</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">In-District</span>
                  <span className="text-yellow-600">Moderate boost</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">In-Borough</span>
                  <span className="text-amber-600">Slight boost</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Citywide</span>
                  <span className="text-muted-foreground">Base odds</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Results Section */}
        {simulationResults && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <CardTitle>Simulation Results</CardTitle>
              </div>
              <CardDescription>
                Based on 1,000 Monte Carlo simulations with estimated school demand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                      {simulationResults.overall.matchRate}%
                    </div>
                    <div className="text-sm text-emerald-700 dark:text-emerald-300">Matched to a School</div>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {simulationResults.overall.waitlistRate}%
                    </div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">Waitlisted</div>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {simulationResults.overall.unmatchedRate}%
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-300">Not Matched</div>
                  </CardContent>
                </Card>
              </div>

              {/* Most Likely Outcome */}
              {simulationResults.overall.matchedSchool && (
                <Alert className="bg-primary/5 border-primary">
                  <Trophy className="h-4 w-4 text-primary" />
                  <AlertTitle>Most Likely Match</AlertTitle>
                  <AlertDescription>
                    <strong>{simulationResults.overall.matchedSchool.schoolName}</strong> (Choice #{simulationResults.overall.matchedSchool.rank}) 
                    with {simulationResults.overall.matchedSchool.acceptanceProbability}% probability
                  </AlertDescription>
                </Alert>
              )}

              {/* Per-School Results */}
              <div className="space-y-3">
                <h3 className="font-semibold">Per-School Probability</h3>
                {simulationResults.results.map((result, index) => (
                  <div key={result.dbn} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {result.rank}
                        </span>
                        <span className="font-medium truncate max-w-[200px] md:max-w-none">
                          {result.schoolName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {PRIORITY_LABELS[result.priority]}
                        </Badge>
                      </div>
                      <span className="font-bold">{result.acceptanceProbability}%</span>
                    </div>
                    <Progress 
                      value={result.acceptanceProbability} 
                      className={`h-2 ${getProbabilityColor(result.acceptanceProbability)}`}
                    />
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <Alert variant="default" className="bg-muted/50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>About This Simulation</AlertTitle>
                <AlertDescription className="text-sm">
                  This simulation estimates odds based on school popularity (scores, special programs), 
                  estimated seat counts, and your priority status. It models the NYC DOE's priority-tier system 
                  where siblings and zoned applicants are processed first. However, actual lottery results depend 
                  on the real applicant pool each year. Use this to understand relative competitiveness, 
                  not to predict exact outcomes.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
