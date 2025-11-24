import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { School, SchoolWithOverallScore, calculateOverallScore } from "@shared/schema";
import { SchoolCard } from "@/components/SchoolCard";
import { getBoroughFromDBN } from "@shared/boroughMapping";

type Priority = "academics" | "climate" | "progress" | "balanced";
type ClassSize = "small" | "medium" | "large" | "any";

interface Preferences {
  priority: Priority;
  district: string;
  classSize: ClassSize;
  specificNeeds: string;
}

export default function RecommendationsPage() {
  const [step, setStep] = useState<"questionnaire" | "results">("questionnaire");
  const [preferences, setPreferences] = useState<Preferences>({
    priority: "balanced",
    district: "any",
    classSize: "any",
    specificNeeds: "",
  });
  const [recommendations, setRecommendations] = useState<School[]>([]);
  const [reasoning, setReasoning] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: allSchools } = useQuery<School[]>({
    queryKey: ["/api/schools"],
  });

  const generateRecommendations = async () => {
    setIsLoading(true);
    
    try {
      // Build a specialized prompt for recommendations
      const prompt = `Based on a parent's preferences, recommend the top 5-8 NYC kindergarten schools from our database of 1,533 schools.

Parent Preferences:
- Priority: ${preferences.priority === "balanced" ? "Balanced across all areas" : `Strong ${preferences.priority} performance`}
- District Preference: ${preferences.district === "any" ? "Any district in NYC" : `District ${preferences.district}`}
- Class Size: ${preferences.classSize === "any" ? "No preference" : `Prefer ${preferences.classSize} class sizes`}
${preferences.specificNeeds ? `- Specific Needs: ${preferences.specificNeeds}` : ""}

Please provide:
1. A brief paragraph explaining your recommendation approach (2-3 sentences)
2. Then list 5-8 school DBN codes, one per line, in format: DBN - Brief reason (10 words max)

Example format:
I focused on schools with strong academics and balanced climate scores in Manhattan...

01M015 - Exceptional academics, small classes, strong parent engagement
02M047 - Top ELA scores, diverse programs, excellent leadership
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

      // Handle streaming response
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

      // Parse AI response to extract DBNs and reasoning
      const lines = aiResponse.split("\n").filter(l => l.trim());
      // More robust DBN pattern - matches DBN anywhere in line, handles bullets/dashes
      const dbnPattern = /(\d{2}[A-Z]\d{3})/;
      const extractedDBNs: string[] = [];
      let reasoningText = "";

      for (const line of lines) {
        // Normalize line: remove bullets, em dashes, leading dashes
        const normalizedLine = line.replace(/^[\s\-•—]+/, '').trim();
        const match = normalizedLine.match(dbnPattern);
        
        if (match) {
          const dbn = match[1];
          if (!extractedDBNs.includes(dbn)) {
            extractedDBNs.push(dbn);
          }
        } else if (extractedDBNs.length === 0 && normalizedLine.length > 20) {
          // Collect reasoning before DBN list starts
          reasoningText += normalizedLine + " ";
        }
      }

      // Validate we got some DBNs
      if (extractedDBNs.length === 0) {
        console.error("No DBNs extracted from AI response:", aiResponse);
        setRecommendations([]);
        setReasoning("Sorry, I couldn't generate specific recommendations based on your preferences. Please try adjusting your criteria or try again.");
        setStep("results");
        return;
      }

      // Get full school objects for recommended DBNs
      if (allSchools) {
        const recommendedSchools = allSchools
          .filter(school => extractedDBNs.includes(school.dbn))
          .slice(0, 8);
        
        // Validate we found schools
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
      district: "any",
      classSize: "any",
      specificNeeds: "",
    });
  };

  if (step === "results") {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <SEOHead 
          title="Personalized School Recommendations"
          description="Get AI-powered personalized NYC kindergarten school recommendations based on your priorities, district preferences, and specific needs."
          keywords="school recommendations, personalized schools, NYC kindergarten AI, school finder recommendations, school suggestions"
          canonicalPath="/recommendations"
        />
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-home">
                <ArrowLeft className="w-4 h-4" />
                Back to Schools
              </Link>
              <Button onClick={resetQuestionnaire} variant="outline" size="sm" data-testid="button-new-search">
                New Search
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <h1 className="text-3xl font-bold" data-testid="text-results-title">Your Personalized Recommendations</h1>
            </div>
            <p className="text-muted-foreground" data-testid="text-reasoning">{reasoning}</p>
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
        title="Get School Recommendations"
        description="Get AI-powered personalized NYC kindergarten school recommendations based on your priorities, district preferences, and specific needs."
        keywords="school recommendations, personalized schools, NYC kindergarten AI, school finder recommendations, school suggestions"
        canonicalPath="/recommendations"
      />
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-home">
            <ArrowLeft className="w-4 h-4" />
            Back to Schools
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold" data-testid="text-questionnaire-title">Find Your Perfect School</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Answer a few questions and we'll recommend schools tailored to your priorities
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tell us what matters most</CardTitle>
            <CardDescription>We'll use AI to match you with the best schools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Priority Question */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">What's your top priority?</Label>
              <RadioGroup
                value={preferences.priority}
                onValueChange={(value) => setPreferences({ ...preferences, priority: value as Priority })}
                data-testid="radio-priority"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="academics" id="academics" data-testid="radio-academics" />
                  <Label htmlFor="academics" className="font-normal cursor-pointer">
                    <span className="font-medium">Strong Academics</span> - High test scores and ELA/Math proficiency
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="climate" id="climate" data-testid="radio-climate" />
                  <Label htmlFor="climate" className="font-normal cursor-pointer">
                    <span className="font-medium">Positive Climate</span> - Safe environment, engaged students and parents
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="progress" id="progress" data-testid="radio-progress" />
                  <Label htmlFor="progress" className="font-normal cursor-pointer">
                    <span className="font-medium">Student Progress</span> - Growth and improvement over time
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="balanced" id="balanced" data-testid="radio-balanced" />
                  <Label htmlFor="balanced" className="font-normal cursor-pointer">
                    <span className="font-medium">Balanced Excellence</span> - Strong across all areas
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* District Preference */}
            <div className="space-y-3">
              <Label htmlFor="district" className="text-base font-semibold">
                Preferred District (Optional)
              </Label>
              <Select
                value={preferences.district}
                onValueChange={(value) => setPreferences({ ...preferences, district: value })}
              >
                <SelectTrigger id="district" data-testid="select-district">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any District</SelectItem>
                  {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={d.toString()}>
                      District {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Class Size */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Class Size Preference</Label>
              <RadioGroup
                value={preferences.classSize}
                onValueChange={(value) => setPreferences({ ...preferences, classSize: value as ClassSize })}
                data-testid="radio-class-size"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="small" id="small" data-testid="radio-small" />
                  <Label htmlFor="small" className="font-normal cursor-pointer">
                    Small (under 18:1 student-teacher ratio)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" data-testid="radio-medium" />
                  <Label htmlFor="medium" className="font-normal cursor-pointer">
                    Medium (18-22:1 ratio)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="large" id="large" data-testid="radio-large" />
                  <Label htmlFor="large" className="font-normal cursor-pointer">
                    Large (over 22:1 ratio)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="any-size" data-testid="radio-any-size" />
                  <Label htmlFor="any-size" className="font-normal cursor-pointer">
                    No preference
                  </Label>
                </div>
              </RadioGroup>
            </div>

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
                  Finding Your Matches...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get Personalized Recommendations
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
}
