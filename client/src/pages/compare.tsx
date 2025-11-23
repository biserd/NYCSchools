import { useComparison } from "@/contexts/ComparisonContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { Link } from "wouter";
import { ArrowLeft, X, GraduationCap, Users, TrendingUp, Sun, MapPin } from "lucide-react";
import { calculateOverallScore, getScoreColor } from "@shared/schema";
import { getBoroughFromDBN } from "@shared/boroughMapping";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ComparePage() {
  const { comparedSchools, removeFromComparison, clearComparison } = useComparison();

  if (comparedSchools.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-home">
                <ArrowLeft className="w-4 h-4" />
                Back to Schools
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </header>

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
    yellow: "text-amber-500",
    red: "text-red-500",
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-home">
              <ArrowLeft className="w-4 h-4" />
              Back to Schools
            </Link>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={clearComparison}
                data-testid="button-clear-all-compare"
              >
                Clear All
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-compare-title">
            School Comparison
          </h1>
          <p className="text-muted-foreground" data-testid="text-compare-description">
            Comparing {comparedSchools.length} {comparedSchools.length === 1 ? 'school' : 'schools'}
          </p>
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
                  <Link href={`/school/${school.dbn}`}>
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
                          {school.ela_proficiency}%
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
                          {school.math_proficiency}%
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
                          {school.climate_score}
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
                          {school.progress_score}
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
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
