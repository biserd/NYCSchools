import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { School, calculateOverallScore, getAssessmentConfidence } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type PriorityType = "sibling" | "zoned" | "district" | "general";

interface ChanceResult {
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

function assessPriorityContext(school: School, priority: PriorityType): ChanceResult {
  const priorityContext: Record<PriorityType, Pick<ChanceResult, "tier" | "tierLabel" | "explanation">> = {
    sibling: {
      tier: "high",
      tierLabel: "Sibling priority reported",
      explanation: "You indicated that a sibling is currently enrolled. Sibling priority can matter for some programs, but its order and eligibility must be confirmed in the program's current MySchools rules.",
    },
    zoned: {
      tier: "medium",
      tierLabel: "Zoned priority reported",
      explanation: "You indicated that this is your zoned school. Zone priority can be important, but it does not guarantee an offer and may not apply to every program at the school.",
    },
    district: {
      tier: "low",
      tierLabel: "In-district status reported",
      explanation: "You indicated that you live in the school's district. Some programs use district priority and others do not, so verify the exact priority order for each program in MySchools.",
    },
    general: {
      tier: "very_low",
      tierLabel: "No local priority reported",
      explanation: "You did not report sibling, zone, or district priority. You may still be eligible, but the tool cannot determine your position without program-specific rules and the actual applicant pool.",
    },
  };

  const factors: ChanceResult["factors"] = [];
  factors.push({
    label: PRIORITY_LABELS[priority].label,
    impact: priority === "sibling" || priority === "zoned" ? "positive" : "neutral",
    description: "Self-reported planning context. Confirm eligibility and priority order for the specific program in MySchools.",
  });

  if (school.has_gifted_talented) {
    factors.push({
      label: "Gifted & Talented Program",
      impact: "neutral",
      description: "This school reports a G&T program. Program eligibility and priorities may differ from the school's other programs.",
    });
  }
  if (school.has_dual_language) {
    factors.push({
      label: "Dual Language Program",
      impact: "neutral",
      description: "This school reports a dual-language program. Confirm language, grade, eligibility, and priority details before applying.",
    });
  }
  if (school.enrollment) {
    factors.push({
      label: "School enrollment",
      impact: "neutral",
      description: `${school.enrollment.toLocaleString()} students are reported enrolled. Total enrollment is not the number of seats available for your grade or program.`,
    });
  }

  return {
    ...priorityContext[priority],
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
    return assessPriorityContext(selectedSchool, priority);
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
          title="NYC School Admissions Priority Planner | NYC School Ratings"
          description="Review your stated NYC school admissions priority context without fabricated acceptance percentages or guarantees."
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
                The Admissions Priority Planner helps you review the priority context you report without inventing an admission percentage.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
                <h3 className="font-medium mb-2">What you'll get:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Qualitative priority context
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Priority group analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Program-specific verification prompts
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
        title="NYC School Admissions Priority Planner | NYC School Ratings"
        description="Review your stated NYC school admissions priority context without fabricated acceptance percentages or guarantees."
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
            Admissions Priority Planner
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Understand the priority context you report, what still needs verification, and which unknowns prevent a reliable admission prediction.
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
                    (() => {
                      const score = calculateOverallScore(selectedSchool);
                      const scoreLabel = score < 0
                        ? (getAssessmentConfidence(selectedSchool) === "low" ? "Withheld: limited participation" : "N/A")
                        : String(score);
                      return (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{selectedSchool.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {selectedSchool.dbn} • District {selectedSchool.district} • {selectedSchool.grade_band}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">
                               Score: {scoreLabel}
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
                      );
                    })()
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
                  Priority rules vary by program and admissions cycle
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
                Review My Priority Context
              </Button>
            </div>

            {/* Info Note */}
            <Alert>
              <Info className="w-4 h-4" />
              <AlertTitle>What This Tool Can and Cannot Do</AlertTitle>
              <AlertDescription>
                This tool organizes the priority information you provide. It does not have the current applicant pool, seats by program, your lottery number, or verified offer history, so it does not calculate an admission probability.
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
                    <CardDescription>Your reported priority context at</CardDescription>
                    <CardTitle className="text-xl">{selectedSchool.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-6">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                      <Info className="h-12 w-12" />
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
                      Priority and Program Context
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
                    Review Another School
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
                    No percentage or offer prediction is calculated. Always confirm current eligibility and priorities in MySchools, review each program rather than only the school, and use a balanced application list.
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
