import { useComparison } from "@/contexts/ComparisonContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { Link } from "wouter";
import { X, GraduationCap, Users, TrendingUp, Sun, MapPin, Home, TrendingDown, Minus, Scale } from "lucide-react";
import { calculateOverallScore, getScoreColor, getSchoolUrl } from "@shared/schema";
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
  value: number; 
  districtAvg: number | undefined;
  unit?: string;
  higherIsBetter?: boolean;
}) {
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

export default function ComparePage() {
  const { comparedSchools, removeFromComparison, clearComparison } = useComparison();
  
  // Fetch all district averages for comparison
  const { data: allDistrictAverages } = useQuery<Record<string, DistrictAverages>>({
    queryKey: ["/api/districts/averages"],
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
  }));

  const colorMap = {
    green: "text-emerald-500",
    yellow: "text-yellow-500",
    amber: "text-amber-500",
    red: "text-red-500",
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead 
        title="Compare Schools Side-by-Side"
        description="Compare NYC elementary schools side-by-side. View test scores, ratings, demographics, and key metrics to make informed kindergarten enrollment decisions."
        keywords="compare NYC schools, school comparison tool, side-by-side school ratings, NYC school metrics, kindergarten school comparison"
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
            {schoolsWithScores.map((school) => (
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
                  <Badge variant="secondary" className="text-xs w-fit" data-testid={`badge-dbn-${school.dbn}`}>
                    {school.dbn}
                  </Badge>
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
            ))}
          </div>

          {/* Detailed Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Metric</TableHead>
                      {schoolsWithScores.map((school) => (
                        <TableHead key={school.dbn} className="text-center" data-testid={`th-${school.dbn}`}>
                          <div className="text-xs truncate max-w-[150px]">{school.name}</div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-muted-foreground" />
                          ELA Proficiency
                        </div>
                      </TableCell>
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
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-muted-foreground" />
                          Math Proficiency
                        </div>
                      </TableCell>
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
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4 text-muted-foreground" />
                          Climate Score
                        </div>
                      </TableCell>
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
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          Progress Score
                        </div>
                      </TableCell>
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
                          <Users className="w-4 h-4 text-muted-foreground" />
                          Student:Teacher Ratio
                        </div>
                      </TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-ratio-${school.dbn}`}>
                          {school.student_teacher_ratio}:1
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          Total Enrollment
                        </div>
                      </TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-enrollment-${school.dbn}`}>
                          {school.enrollment}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-muted-foreground" />
                          Economic Need Index (ENI)
                        </div>
                      </TableCell>
                      {schoolsWithScores.map((school) => (
                        <TableCell key={school.dbn} className="text-center tabular-nums" data-testid={`cell-eni-${school.dbn}`}>
                          {school.economic_need_index != null ? `${school.economic_need_index}%` : 'N/A'}
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
