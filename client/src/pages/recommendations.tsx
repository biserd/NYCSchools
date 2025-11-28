import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { Sparkles, Loader2, GraduationCap, Languages, Award, Baby, TrendingUp, MapPin, School as SchoolIcon, Building2 } from "lucide-react";
import { School, SchoolWithOverallScore, calculateOverallScore } from "@shared/schema";
import { SchoolCard } from "@/components/SchoolCard";

type Priority = "academics" | "climate" | "progress" | "balanced";
type ClassSize = "small" | "medium" | "large" | "any";
type GradeLevel = "early-childhood" | "elementary" | "middle" | "high" | "any";
type Borough = "manhattan" | "brooklyn" | "queens" | "bronx" | "staten-island" | "any";

interface Preferences {
  priority: Priority;
  gradeLevel: GradeLevel;
  borough: Borough;
  district: string;
  classSize: ClassSize;
  wantsGT: boolean;
  gtType: "any" | "district" | "citywide";
  wantsDualLanguage: boolean;
  dualLanguageLanguage: string;
  wantsEarlyChildhood: boolean;
  earlyChildhoodType: "3k" | "prek" | "either";
  wantsImprovingSchools: boolean;
  specificNeeds: string;
}

const DUAL_LANGUAGE_OPTIONS = [
  { value: "any", label: "Any Language" },
  { value: "Spanish", label: "Spanish" },
  { value: "Chinese", label: "Chinese (Mandarin/Cantonese)" },
  { value: "French", label: "French" },
  { value: "Arabic", label: "Arabic" },
  { value: "Russian", label: "Russian" },
  { value: "Korean", label: "Korean" },
  { value: "Japanese", label: "Japanese" },
  { value: "Hebrew", label: "Hebrew" },
  { value: "Italian", label: "Italian" },
  { value: "Bengali", label: "Bengali" },
  { value: "Haitian Creole", label: "Haitian Creole" },
];

const BOROUGH_DISTRICTS: Record<string, number[]> = {
  "manhattan": [1, 2, 3, 4, 5, 6],
  "bronx": [7, 8, 9, 10, 11, 12],
  "brooklyn": [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 32],
  "queens": [24, 25, 26, 27, 28, 29, 30],
  "staten-island": [31],
};

export default function RecommendationsPage() {
  const [step, setStep] = useState<"questionnaire" | "results">("questionnaire");
  const [preferences, setPreferences] = useState<Preferences>({
    priority: "balanced",
    gradeLevel: "elementary",
    borough: "any",
    district: "any",
    classSize: "any",
    wantsGT: false,
    gtType: "any",
    wantsDualLanguage: false,
    dualLanguageLanguage: "any",
    wantsEarlyChildhood: false,
    earlyChildhoodType: "either",
    wantsImprovingSchools: false,
    specificNeeds: "",
  });
  const [recommendations, setRecommendations] = useState<School[]>([]);
  const [reasoning, setReasoning] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: allSchools } = useQuery<School[]>({
    queryKey: ["/api/schools"],
  });

  const getDistrictsForBorough = () => {
    if (preferences.borough === "any") {
      return Array.from({ length: 32 }, (_, i) => i + 1);
    }
    return BOROUGH_DISTRICTS[preferences.borough] || [];
  };

  const generateRecommendations = async () => {
    setIsLoading(true);
    
    try {
      const gradeLevelText = {
        "early-childhood": "3-K or Pre-K programs",
        "elementary": "elementary schools (grades K-5)",
        "middle": "middle schools (grades 6-8)",
        "high": "high schools (grades 9-12)",
        "any": "schools at any grade level",
      }[preferences.gradeLevel];

      const boroughText = preferences.borough === "any" 
        ? "any borough" 
        : preferences.borough.charAt(0).toUpperCase() + preferences.borough.slice(1).replace("-", " ");

      const specialProgramsText = [];
      if (preferences.wantsGT) {
        const gtTypeText = preferences.gtType === "citywide" 
          ? "Citywide G&T programs" 
          : preferences.gtType === "district" 
          ? "District G&T programs" 
          : "Gifted & Talented programs (any type)";
        specialProgramsText.push(gtTypeText);
      }
      if (preferences.wantsDualLanguage) {
        const langText = preferences.dualLanguageLanguage === "any" 
          ? "Dual Language programs (any language)" 
          : `Dual Language programs in ${preferences.dualLanguageLanguage}`;
        specialProgramsText.push(langText);
      }
      if (preferences.wantsEarlyChildhood) {
        const ecText = preferences.earlyChildhoodType === "3k" 
          ? "3-K programs" 
          : preferences.earlyChildhoodType === "prek" 
          ? "Pre-K programs" 
          : "Early childhood programs (3-K or Pre-K)";
        specialProgramsText.push(ecText);
      }

      const prompt = `Based on a parent's preferences, recommend the top 5-8 NYC schools from our database.

Parent Preferences:
- Grade Level: ${gradeLevelText}
- Priority: ${preferences.priority === "balanced" ? "Balanced across all areas (academics, climate, progress)" : `Strong ${preferences.priority} performance`}
- Location: ${boroughText}${preferences.district !== "any" ? `, specifically District ${preferences.district}` : ""}
- Class Size: ${preferences.classSize === "any" ? "No preference" : `Prefer ${preferences.classSize} class sizes (${preferences.classSize === "small" ? "under 18:1" : preferences.classSize === "medium" ? "18-22:1" : "over 22:1"} student-teacher ratio)`}
${specialProgramsText.length > 0 ? `- Special Programs Wanted: ${specialProgramsText.join(", ")}` : ""}
${preferences.wantsImprovingSchools ? "- Preference for improving schools with positive score trends over recent years" : ""}
${preferences.specificNeeds ? `- Additional Needs: ${preferences.specificNeeds}` : ""}

Important context about our data:
- Schools have has_gifted_talented (boolean) and gt_program_type ('district' or 'citywide') fields
- Schools have has_dual_language (boolean) and dual_language_languages (array) fields
- Schools have has_3k and has_prek (boolean) fields for early childhood
- Schools have historical trend data showing if they are 'improving', 'stable', or 'declining'
- High schools have graduation_rate_4yr, college_readiness_rate, and other HS-specific metrics
- Overall scores combine: Test Proficiency (40%), Climate (30%), Progress (30%)

Please provide:
1. A brief paragraph explaining your recommendation approach (2-3 sentences)
2. Then list 5-8 school DBN codes, one per line, in format: DBN - Brief reason (10 words max)

Example format:
I focused on schools with strong academics and Dual Language programs in Brooklyn...

01M015 - Exceptional academics, Dual Language Spanish, strong community
02M047 - Top ELA scores, G&T program, excellent leadership
...`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: prompt,
          conversationHistory: [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get recommendations");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  aiResponse += parsed.content;
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      const lines = aiResponse.split("\n").filter(l => l.trim());
      const dbnPattern = /(\d{2}[A-Z]\d{3})/;
      const extractedDBNs: string[] = [];
      let reasoningText = "";

      for (const line of lines) {
        const normalizedLine = line.replace(/^[\s\-•—]+/, '').trim();
        const match = normalizedLine.match(dbnPattern);
        
        if (match) {
          const dbn = match[1];
          if (!extractedDBNs.includes(dbn)) {
            extractedDBNs.push(dbn);
          }
        } else if (extractedDBNs.length === 0 && normalizedLine.length > 20) {
          reasoningText += normalizedLine + " ";
        }
      }

      if (extractedDBNs.length === 0) {
        console.error("No DBNs extracted from AI response:", aiResponse);
        setRecommendations([]);
        setReasoning("Sorry, I couldn't generate specific recommendations based on your preferences. Please try adjusting your criteria or try again.");
        setStep("results");
        return;
      }

      if (allSchools) {
        const recommendedSchools = allSchools
          .filter(school => extractedDBNs.includes(school.dbn))
          .slice(0, 8);
        
        if (recommendedSchools.length === 0) {
          console.error("No schools found for DBNs:", extractedDBNs);
          setRecommendations([]);
          setReasoning("Sorry, I couldn't find schools matching the recommendations. Please try again.");
          setStep("results");
          return;
        }
        
        setRecommendations(recommendedSchools);
        setReasoning(reasoningText.trim() || "Based on your preferences, here are personalized school recommendations.");
      }

      setStep("results");
    } catch (error) {
      console.error("Error generating recommendations:", error);
      alert("Sorry, there was an error generating recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetQuestionnaire = () => {
    setStep("questionnaire");
    setRecommendations([]);
    setReasoning("");
    setPreferences({
      priority: "balanced",
      gradeLevel: "elementary",
      borough: "any",
      district: "any",
      classSize: "any",
      wantsGT: false,
      gtType: "any",
      wantsDualLanguage: false,
      dualLanguageLanguage: "any",
      wantsEarlyChildhood: false,
      earlyChildhoodType: "either",
      wantsImprovingSchools: false,
      specificNeeds: "",
    });
  };

  if (step === "results") {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <SEOHead 
          title="Personalized School Recommendations"
          description="AI-powered personalized NYC school recommendations for elementary, middle, and high schools. Find schools with G&T programs, Dual Language, and more."
          keywords="NYC school recommendations, personalized schools, G&T programs, Dual Language schools, school finder, AI recommendations"
          canonicalPath="/recommendations"
        />
        <AppHeader />

        <main className="container mx-auto px-4 py-8 max-w-7xl flex-1">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <h1 className="text-3xl font-bold" data-testid="text-results-title">Your Personalized Recommendations</h1>
            </div>
            <p className="text-muted-foreground" data-testid="text-reasoning">{reasoning}</p>
            
            <div className="flex flex-wrap gap-2 mt-4">
              {preferences.gradeLevel !== "any" && (
                <Badge variant="secondary" className="gap-1">
                  <GraduationCap className="w-3 h-3" />
                  {preferences.gradeLevel === "early-childhood" ? "Early Childhood" : 
                   preferences.gradeLevel === "elementary" ? "Elementary" :
                   preferences.gradeLevel === "middle" ? "Middle School" : "High School"}
                </Badge>
              )}
              {preferences.borough !== "any" && (
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="w-3 h-3" />
                  {preferences.borough.charAt(0).toUpperCase() + preferences.borough.slice(1).replace("-", " ")}
                </Badge>
              )}
              {preferences.wantsGT && (
                <Badge variant="secondary" className="gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  <Award className="w-3 h-3" />
                  G&T {preferences.gtType !== "any" && `(${preferences.gtType})`}
                </Badge>
              )}
              {preferences.wantsDualLanguage && (
                <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  <Languages className="w-3 h-3" />
                  Dual Language {preferences.dualLanguageLanguage !== "any" && `(${preferences.dualLanguageLanguage})`}
                </Badge>
              )}
              {preferences.wantsEarlyChildhood && (
                <Badge variant="secondary" className="gap-1 bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300">
                  <Baby className="w-3 h-3" />
                  {preferences.earlyChildhoodType === "3k" ? "3-K" : preferences.earlyChildhoodType === "prek" ? "Pre-K" : "3-K/Pre-K"}
                </Badge>
              )}
              {preferences.wantsImprovingSchools && (
                <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  <TrendingUp className="w-3 h-3" />
                  Improving Schools
                </Badge>
              )}
            </div>

            <Button onClick={resetQuestionnaire} variant="outline" className="mt-4" data-testid="button-start-over">
              Start Over
            </Button>
          </div>

          {recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((school) => {
                const schoolWithScore: SchoolWithOverallScore = {
                  ...school,
                  overall_score: calculateOverallScore(school),
                };
                return (
                  <SchoolCard
                    key={school.dbn}
                    school={schoolWithScore}
                  />
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No recommendations found. Try adjusting your preferences.</p>
                <Button onClick={resetQuestionnaire} className="mt-4" data-testid="button-try-again">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead 
        title="Find Your Perfect NYC School"
        description="Get AI-powered personalized NYC school recommendations. Find elementary, middle, and high schools with G&T programs, Dual Language, early childhood options, and more."
        keywords="NYC school finder, personalized schools, G&T programs, Dual Language, school recommendations, AI school matcher"
        canonicalPath="/recommendations"
      />
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-3xl flex-1">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold" data-testid="text-questionnaire-title">Find Your Perfect School</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Answer a few questions and we'll recommend schools tailored to your family's needs
          </p>
        </div>

        <div className="space-y-6">
          {/* Grade Level Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <CardTitle>Grade Level</CardTitle>
              </div>
              <CardDescription>What grade level are you looking for?</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={preferences.gradeLevel}
                onValueChange={(value) => setPreferences({ ...preferences, gradeLevel: value as GradeLevel })}
                className="grid grid-cols-2 gap-3"
                data-testid="radio-grade-level"
              >
                <Label htmlFor="early-childhood" className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover-elevate [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                  <RadioGroupItem value="early-childhood" id="early-childhood" data-testid="radio-early-childhood" />
                  <div>
                    <span className="font-medium">Early Childhood</span>
                    <p className="text-xs text-muted-foreground">3-K & Pre-K</p>
                  </div>
                </Label>
                <Label htmlFor="elementary" className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover-elevate [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                  <RadioGroupItem value="elementary" id="elementary" data-testid="radio-elementary" />
                  <div>
                    <span className="font-medium">Elementary</span>
                    <p className="text-xs text-muted-foreground">Grades K-5</p>
                  </div>
                </Label>
                <Label htmlFor="middle" className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover-elevate [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                  <RadioGroupItem value="middle" id="middle" data-testid="radio-middle" />
                  <div>
                    <span className="font-medium">Middle School</span>
                    <p className="text-xs text-muted-foreground">Grades 6-8</p>
                  </div>
                </Label>
                <Label htmlFor="high" className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover-elevate [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                  <RadioGroupItem value="high" id="high" data-testid="radio-high" />
                  <div>
                    <span className="font-medium">High School</span>
                    <p className="text-xs text-muted-foreground">Grades 9-12</p>
                  </div>
                </Label>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Priority Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <CardTitle>Top Priority</CardTitle>
              </div>
              <CardDescription>What matters most to your family?</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={preferences.priority}
                onValueChange={(value) => setPreferences({ ...preferences, priority: value as Priority })}
                className="space-y-3"
                data-testid="radio-priority"
              >
                <Label htmlFor="academics" className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover-elevate [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                  <RadioGroupItem value="academics" id="academics" className="mt-0.5" data-testid="radio-academics" />
                  <div>
                    <span className="font-medium">Strong Academics</span>
                    <p className="text-sm text-muted-foreground">High test scores, ELA/Math proficiency, rigorous curriculum</p>
                  </div>
                </Label>
                <Label htmlFor="climate" className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover-elevate [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                  <RadioGroupItem value="climate" id="climate" className="mt-0.5" data-testid="radio-climate" />
                  <div>
                    <span className="font-medium">Positive Climate</span>
                    <p className="text-sm text-muted-foreground">Safe environment, engaged community, supportive culture</p>
                  </div>
                </Label>
                <Label htmlFor="progress" className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover-elevate [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                  <RadioGroupItem value="progress" id="progress" className="mt-0.5" data-testid="radio-progress" />
                  <div>
                    <span className="font-medium">Student Progress</span>
                    <p className="text-sm text-muted-foreground">Strong year-over-year growth, helping all students advance</p>
                  </div>
                </Label>
                <Label htmlFor="balanced" className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover-elevate [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                  <RadioGroupItem value="balanced" id="balanced" className="mt-0.5" data-testid="radio-balanced" />
                  <div>
                    <span className="font-medium">Balanced Excellence</span>
                    <p className="text-sm text-muted-foreground">Well-rounded schools excelling across all areas</p>
                  </div>
                </Label>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Location Preference */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <CardTitle>Location</CardTitle>
              </div>
              <CardDescription>Where are you looking for schools?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="borough">Borough</Label>
                  <Select
                    value={preferences.borough}
                    onValueChange={(value) => setPreferences({ 
                      ...preferences, 
                      borough: value as Borough,
                      district: "any" // Reset district when borough changes
                    })}
                  >
                    <SelectTrigger id="borough" data-testid="select-borough">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Borough</SelectItem>
                      <SelectItem value="manhattan">Manhattan</SelectItem>
                      <SelectItem value="brooklyn">Brooklyn</SelectItem>
                      <SelectItem value="queens">Queens</SelectItem>
                      <SelectItem value="bronx">Bronx</SelectItem>
                      <SelectItem value="staten-island">Staten Island</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District (Optional)</Label>
                  <Select
                    value={preferences.district}
                    onValueChange={(value) => setPreferences({ ...preferences, district: value })}
                  >
                    <SelectTrigger id="district" data-testid="select-district">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any District</SelectItem>
                      {getDistrictsForBorough().map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          District {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Special Programs */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <SchoolIcon className="w-5 h-5 text-primary" />
                <CardTitle>Special Programs</CardTitle>
              </div>
              <CardDescription>Looking for specific programs?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Gifted & Talented */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    <Label htmlFor="gt-switch" className="font-medium">Gifted & Talented (G&T)</Label>
                  </div>
                  <Switch
                    id="gt-switch"
                    checked={preferences.wantsGT}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, wantsGT: checked })}
                    data-testid="switch-gt"
                  />
                </div>
                {preferences.wantsGT && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="gt-type" className="text-sm">Program Type</Label>
                    <Select
                      value={preferences.gtType}
                      onValueChange={(value) => setPreferences({ ...preferences, gtType: value as "any" | "district" | "citywide" })}
                    >
                      <SelectTrigger id="gt-type" data-testid="select-gt-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any G&T Program</SelectItem>
                        <SelectItem value="district">District G&T Only</SelectItem>
                        <SelectItem value="citywide">Citywide G&T Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Citywide G&T: NEST+M, Anderson School, TAG Young Scholars, Brooklyn School of Inquiry, 30th Avenue School
                    </p>
                  </div>
                )}
              </div>

              {/* Dual Language */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-blue-600" />
                    <Label htmlFor="dl-switch" className="font-medium">Dual Language / Bilingual</Label>
                  </div>
                  <Switch
                    id="dl-switch"
                    checked={preferences.wantsDualLanguage}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, wantsDualLanguage: checked })}
                    data-testid="switch-dual-language"
                  />
                </div>
                {preferences.wantsDualLanguage && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="dl-language" className="text-sm">Preferred Language</Label>
                    <Select
                      value={preferences.dualLanguageLanguage}
                      onValueChange={(value) => setPreferences({ ...preferences, dualLanguageLanguage: value })}
                    >
                      <SelectTrigger id="dl-language" data-testid="select-dl-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DUAL_LANGUAGE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Early Childhood */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Baby className="w-4 h-4 text-pink-600" />
                    <Label htmlFor="ec-switch" className="font-medium">Early Childhood (3-K / Pre-K)</Label>
                  </div>
                  <Switch
                    id="ec-switch"
                    checked={preferences.wantsEarlyChildhood}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, wantsEarlyChildhood: checked })}
                    data-testid="switch-early-childhood"
                  />
                </div>
                {preferences.wantsEarlyChildhood && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="ec-type" className="text-sm">Program Type</Label>
                    <Select
                      value={preferences.earlyChildhoodType}
                      onValueChange={(value) => setPreferences({ ...preferences, earlyChildhoodType: value as "3k" | "prek" | "either" })}
                    >
                      <SelectTrigger id="ec-type" data-testid="select-ec-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="either">Either 3-K or Pre-K</SelectItem>
                        <SelectItem value="3k">3-K Only (Age 3)</SelectItem>
                        <SelectItem value="prek">Pre-K Only (Age 4)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Preferences */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <CardTitle>Additional Preferences</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Improving Schools */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <div>
                    <Label htmlFor="improving-switch" className="font-medium">Improving Schools</Label>
                    <p className="text-xs text-muted-foreground">Prioritize schools with positive score trends</p>
                  </div>
                </div>
                <Switch
                  id="improving-switch"
                  checked={preferences.wantsImprovingSchools}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, wantsImprovingSchools: checked })}
                  data-testid="switch-improving"
                />
              </div>

              {/* Class Size */}
              <div className="space-y-3">
                <Label className="font-medium">Class Size Preference</Label>
                <RadioGroup
                  value={preferences.classSize}
                  onValueChange={(value) => setPreferences({ ...preferences, classSize: value as ClassSize })}
                  className="grid grid-cols-2 gap-2"
                  data-testid="radio-class-size"
                >
                  <Label htmlFor="small" className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm hover-elevate [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                    <RadioGroupItem value="small" id="small" data-testid="radio-small" />
                    <span>Small (&lt;18:1)</span>
                  </Label>
                  <Label htmlFor="medium" className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm hover-elevate [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                    <RadioGroupItem value="medium" id="medium" data-testid="radio-medium" />
                    <span>Medium (18-22:1)</span>
                  </Label>
                  <Label htmlFor="large" className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm hover-elevate [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                    <RadioGroupItem value="large" id="large" data-testid="radio-large" />
                    <span>Large (&gt;22:1)</span>
                  </Label>
                  <Label htmlFor="any-size" className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm hover-elevate [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                    <RadioGroupItem value="any" id="any-size" data-testid="radio-any-size" />
                    <span>No Preference</span>
                  </Label>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            onClick={generateRecommendations}
            disabled={isLoading}
            className="w-full"
            size="lg"
            data-testid="button-get-recommendations"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finding Your Perfect Matches...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get Personalized Recommendations
              </>
            )}
          </Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
