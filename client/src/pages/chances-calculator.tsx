import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { 
  Calculator,
  Star,
  Lock,
  Users,
  Home,
  Building2,
  MapPin,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Info,
  Search,
  Loader2,
} from "lucide-react";
import { School, calculateOverallScore } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type PriorityType = "sibling" | "zoned" | "district" | "general";

interface ChanceResult {
  probability: number;
  tier: "high" | "medium" | "low" | "very_low";
  tierLabel: string;
  explanation: string;
  factors: { label: string; impact: "positive" | "negative" | "neutral"; description: string }[];
}

const PRIORITY_LABELS: Record<PriorityType, { label: string; icon: typeof Home; description: string }> = {
  sibling: { 
    label: "Sibling Priority", 
    icon: Users, 
    description: "You have a sibling currently enrolled at this school" 
  },
  zoned: { 
    label: "Zoned", 
    icon: Home, 
    description: "This school is your zoned school based on your address" 
  },
  district: { 
    label: "In-District", 
    icon: Building2, 
    description: "You live in the same district as the school but it's not your zoned school" 
  },
  general: { 
    label: "General Applicant", 
    icon: MapPin, 
    description: "You live outside the school's district or zone" 
  },
};

function calculateChances(school: School, priority: PriorityType): ChanceResult {
  const overallScore = calculateOverallScore(school);
  
  // Base probability based on priority
  let baseProbability: number;
  switch (priority) {
    case "sibling":
      baseProbability = 95; // Nearly guaranteed
      break;
    case "zoned":
      baseProbability = 85; // Very high for zoned schools
      break;
    case "district":
      baseProbability = 45; // Moderate
      break;
    case "general":
      baseProbability = 15; // Lower for out-of-district
      break;
  }
  
  // Adjust based on school popularity (higher scores = more competitive)
  let popularityModifier = 0;
  if (overallScore >= 90) popularityModifier = -20;
  else if (overallScore >= 80) popularityModifier = -15;
  else if (overallScore >= 70) popularityModifier = -10;
  else if (overallScore >= 60) popularityModifier = -5;
  else popularityModifier = 5;
  
  // Special programs increase competition
  let programModifier = 0;
  if (school.has_gifted_talented) programModifier -= 15;
  if (school.has_dual_language) programModifier -= 10;
  
  // Enrollment size affects odds (larger schools have more seats)
  let sizeModifier = 0;
  if (school.enrollment && school.enrollment > 800) sizeModifier = 10;
  else if (school.enrollment && school.enrollment > 500) sizeModifier = 5;
  else if (school.enrollment && school.enrollment < 300) sizeModifier = -5;
  
  // Calculate final probability
  let probability = baseProbability + popularityModifier + programModifier + sizeModifier;
  probability = Math.max(5, Math.min(98, probability)); // Clamp between 5-98%
  
  // Determine tier
  let tier: ChanceResult["tier"];
  let tierLabel: string;
  if (probability >= 75) {
    tier = "high";
    tierLabel = "High Chance";
  } else if (probability >= 50) {
    tier = "medium";
    tierLabel = "Moderate Chance";
  } else if (probability >= 25) {
    tier = "low";
    tierLabel = "Competitive";
  } else {
    tier = "very_low";
    tierLabel = "Very Competitive";
  }
  
  // Build explanation
  let explanation = "";
  switch (priority) {
    case "sibling":
      explanation = "Sibling priority gives you the highest placement in the lottery. You're very likely to secure a spot.";
      break;
    case "zoned":
      explanation = probability >= 75 
        ? "As a zoned family, you have strong priority for this school."
        : "While you have zone priority, this school is in high demand which may affect your chances.";
      break;
    case "district":
      explanation = "In-district applicants are considered after zoned families. Your chances depend on remaining seats.";
      break;
    case "general":
      explanation = "General applicants are considered after zone and district families. Focus on schools where you have higher priority.";
      break;
  }
  
  // Build factors list
  const factors: ChanceResult["factors"] = [];
  
  // Priority factor
  factors.push({
    label: PRIORITY_LABELS[priority].label,
    impact: priority === "sibling" || priority === "zoned" ? "positive" : priority === "district" ? "neutral" : "negative",
    description: priority === "sibling" 
      ? "Highest priority tier - processed first"
      : priority === "zoned"
      ? "Second priority tier - strong advantage"
      : priority === "district"
      ? "Third priority tier - moderate advantage"
      : "Lowest priority tier - processed last"
  });
  
  // School rating factor
  if (overallScore >= 80) {
    factors.push({
      label: "High-Rated School",
      impact: "negative",
      description: `This school has a ${overallScore} rating, attracting more applicants`
    });
  } else if (overallScore < 60) {
    factors.push({
      label: "Lower Competition",
      impact: "positive",
      description: "This school may have fewer applicants competing for seats"
    });
  }
  
  // Special programs
  if (school.has_gifted_talented) {
    factors.push({
      label: "Gifted & Talented Program",
      impact: "negative",
      description: "G&T programs attract citywide applicants, increasing competition"
    });
  }
  
  if (school.has_dual_language) {
    factors.push({
      label: "Dual Language Program",
      impact: "negative",
      description: "Dual language programs are in high demand"
    });
  }
  
  // School size
  if (school.enrollment && school.enrollment > 700) {
    factors.push({
      label: "Large School",
      impact: "positive",
      description: "More seats available per grade level"
    });
  }
  
  return {
    probability,
    tier,
    tierLabel,
    explanation,
    factors,
  };
}

function getTierColor(tier: ChanceResult["tier"]) {
  switch (tier) {
    case "high":
      return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700";
    case "medium":
      return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
    case "low":
      return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700";
    case "very_low":
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700";
  }
}

function getProgressColor(tier: ChanceResult["tier"]) {
  switch (tier) {
    case "high":
      return "[&>div]:bg-emerald-500";
    case "medium":
      return "[&>div]:bg-yellow-500";
    case "low":
      return "[&>div]:bg-orange-500";
    case "very_low":
      return "[&>div]:bg-red-500";
  }
}

export default function ChancesCalculatorPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [priority, setPriority] = useState<PriorityType | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Fetch subscription status
  const { data: subscription, isFetched: subscriptionFetched } = useQuery<{
    status: string;
    plan: string;
  }>({
    queryKey: ["/api/subscription"],
    enabled: isAuthenticated,
  });

  const isPremium = subscription?.status === "active" && 
    (subscription?.plan === "premium" || subscription?.plan === "season_pass");

  // Fetch schools for search
  const { data: schools, isLoading: schoolsLoading } = useQuery<School[]>({
    queryKey: ["/api/schools"],
  });

  // Filter schools based on search
  const filteredSchools = useMemo(() => {
    if (!schools || !searchQuery || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return schools
      .filter(s => 
        s.name.toLowerCase().includes(query) || 
        s.dbn.toLowerCase().includes(query) ||
        s.address.toLowerCase().includes(query)
      )
      .filter(s => s.grade_band !== "9-12") // Exclude pure high schools
      .slice(0, 10);
  }, [schools, searchQuery]);

  // Calculate chances
  const chanceResult = useMemo(() => {
    if (!selectedSchool || !priority) return null;
    return calculateChances(selectedSchool, priority);
  }, [selectedSchool, priority]);

  const handleCalculate = () => {
    if (selectedSchool && priority) {
      setShowResults(true);
    }
  };

  const handleReset = () => {
    setSelectedSchool(null);
    setPriority(null);
    setShowResults(false);
    setSearchQuery("");
  };

  // Premium gate
  if (isAuthenticated && subscriptionFetched && !isPremium) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEOHead
          title="Chances Calculator - NYC School Ratings"
          description="Calculate your chances of getting into your target NYC school based on priority groups."
          canonicalPath="/chances-calculator"
        />
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Premium Feature</h1>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                The Chances Calculator helps you understand your odds of admission to any NYC school based on priority groups.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
                <h3 className="font-medium mb-2">What you'll get:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Admission probability estimates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Priority group analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    School demand factors
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Personalized recommendations
                  </li>
                </ul>
              </div>
              <Link href="/pricing">
                <Button data-testid="button-upgrade-chances">
                  <Star className="w-4 h-4 mr-2" />
                  Unlock for $29
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Loading state
  if (authLoading || (isAuthenticated && !subscriptionFetched)) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Chances Calculator - NYC School Ratings"
        description="Calculate your chances of getting into your target NYC school based on priority groups like zone, sibling, and district status."
        canonicalPath="/chances-calculator"
      />
      <AppHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">
            <Calculator className="w-3 h-3 mr-1" />
            Premium Tool
          </Badge>
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-chances">
            Chances Calculator
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Estimate your admission chances based on your priority status and school demand factors.
          </p>
        </div>

        {!showResults ? (
          <div className="space-y-6">
            {/* Step 1: Select School */}
            <Card data-testid="card-select-school">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                  Select a School
                </CardTitle>
                <CardDescription>
                  Search for the school you're interested in
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by school name, DBN, or address..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelectedSchool(null);
                      }}
                      className="pl-10"
                      data-testid="input-school-search"
                    />
                  </div>
                  
                  {/* Search Results */}
                  {filteredSchools.length > 0 && !selectedSchool && (
                    <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                      {filteredSchools.map((school) => (
                        <button
                          key={school.dbn}
                          onClick={() => {
                            setSelectedSchool(school);
                            setSearchQuery(school.name);
                          }}
                          className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                          data-testid={`button-select-school-${school.dbn}`}
                        >
                          <div className="font-medium">{school.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span>{school.dbn}</span>
                            <span>•</span>
                            <span>District {school.district}</span>
                            <span>•</span>
                            <span>{school.grade_band}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Selected School */}
                  {selectedSchool && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{selectedSchool.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {selectedSchool.dbn} • District {selectedSchool.district} • {selectedSchool.grade_band}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">
                              Score: {calculateOverallScore(selectedSchool)}
                            </Badge>
                            {selectedSchool.has_gifted_talented && (
                              <Badge variant="secondary">G&T</Badge>
                            )}
                            {selectedSchool.has_dual_language && (
                              <Badge variant="secondary">Dual Language</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSchool(null);
                            setSearchQuery("");
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Select Priority */}
            <Card data-testid="card-select-priority">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                  Select Your Priority Status
                </CardTitle>
                <CardDescription>
                  Your priority determines your place in the admission queue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(Object.entries(PRIORITY_LABELS) as [PriorityType, typeof PRIORITY_LABELS[PriorityType]][]).map(([key, value]) => {
                    const Icon = value.icon;
                    const isSelected = priority === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setPriority(key)}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          isSelected 
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                            : "hover:border-primary/50 hover:bg-muted/50"
                        }`}
                        data-testid={`button-priority-${key}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium">{value.label}</div>
                            <div className="text-xs text-muted-foreground">{value.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Calculate Button */}
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleCalculate}
                disabled={!selectedSchool || !priority}
                data-testid="button-calculate"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calculate My Chances
              </Button>
            </div>

            {/* Info Note */}
            <Alert>
              <Info className="w-4 h-4" />
              <AlertTitle>How This Works</AlertTitle>
              <AlertDescription>
                This calculator estimates your admission chances based on NYC DOE priority groups, school popularity, 
                and enrollment data. Actual results may vary based on year-to-year applicant pools.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          /* Results */
          <div className="space-y-6">
            {chanceResult && selectedSchool && (
              <>
                {/* Main Result Card */}
                <Card data-testid="card-result">
                  <CardHeader className="text-center pb-2">
                    <CardDescription>Your estimated chances at</CardDescription>
                    <CardTitle className="text-xl">{selectedSchool.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-6">
                    {/* Probability Circle */}
                    <div className="relative w-40 h-40 mx-auto">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="12"
                          className="text-muted"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="12"
                          strokeDasharray={`${chanceResult.probability * 4.4} 440`}
                          className={
                            chanceResult.tier === "high" ? "text-emerald-500" :
                            chanceResult.tier === "medium" ? "text-yellow-500" :
                            chanceResult.tier === "low" ? "text-orange-500" :
                            "text-red-500"
                          }
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold" data-testid="text-probability">
                          {chanceResult.probability}%
                        </span>
                        <span className="text-sm text-muted-foreground">chance</span>
                      </div>
                    </div>

                    {/* Tier Badge */}
                    <Badge 
                      variant="outline" 
                      className={`text-sm px-4 py-1 ${getTierColor(chanceResult.tier)}`}
                      data-testid="badge-tier"
                    >
                      {chanceResult.tierLabel}
                    </Badge>

                    {/* Explanation */}
                    <p className="text-muted-foreground max-w-md mx-auto">
                      {chanceResult.explanation}
                    </p>
                  </CardContent>
                </Card>

                {/* Factors Card */}
                <Card data-testid="card-factors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Factors Affecting Your Chances
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {chanceResult.factors.map((factor, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            factor.impact === "positive" 
                              ? "bg-emerald-100 dark:bg-emerald-900/30" 
                              : factor.impact === "negative"
                              ? "bg-red-100 dark:bg-red-900/30"
                              : "bg-muted"
                          }`}>
                            {factor.impact === "positive" ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : factor.impact === "negative" ? (
                              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            ) : (
                              <Info className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{factor.label}</div>
                            <div className="text-sm text-muted-foreground">{factor.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Button variant="outline" onClick={handleReset} data-testid="button-reset">
                    Calculate for Another School
                  </Button>
                  <Link href={`/school/${selectedSchool.dbn}`}>
                    <Button data-testid="button-view-school">
                      View School Details
                    </Button>
                  </Link>
                </div>

                {/* Disclaimer */}
                <Alert variant="default">
                  <AlertCircle className="w-4 h-4" />
                  <AlertTitle>Important Note</AlertTitle>
                  <AlertDescription>
                    These estimates are based on historical patterns and school characteristics. 
                    Actual admission outcomes depend on the specific applicant pool each year. 
                    Always apply to multiple schools to maximize your options.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
