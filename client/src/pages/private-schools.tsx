import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type PrivateSchool, getTuitionRange, getGradeRangeDisplay, getPrivateSchoolUrl } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import {
  Search,
  MapPin,
  Users,
  GraduationCap,
  Church,
  Building2,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";

interface PrivateSchoolStats {
  totalSchools: number;
  byBorough: Record<string, number>;
  byReligiousAffiliation: Record<string, number>;
  avgEnrollment: number;
  avgStudentTeacherRatio: number;
}

const SCHOOLS_PER_PAGE = 50;

export default function PrivateSchools() {
  const [searchQuery, setSearchQuery] = useState("");
  const [boroughFilter, setBoroughFilter] = useState("all");
  const [religiousFilter, setReligiousFilter] = useState("all");
  const [coedFilter, setCoedFilter] = useState("all");
  const [gradeLevelFilter, setGradeLevelFilter] = useState("all");
  const [displayCount, setDisplayCount] = useState(SCHOOLS_PER_PAGE);

  // Helper to check if school serves a given grade level
  const schoolServesGradeLevel = (school: PrivateSchool, level: string): boolean => {
    const low = school.lowestGrade;
    const high = school.highestGrade;
    if (!low || !high) return false;
    
    // Grade order for comparison
    const gradeOrder = ['PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const lowIdx = gradeOrder.indexOf(low);
    const highIdx = gradeOrder.indexOf(high);
    if (lowIdx === -1 || highIdx === -1) return false;
    
    // Check grade levels
    if (level === 'elementary') {
      // Elementary: Pre-K through 5
      return lowIdx <= 6 && highIdx >= 0; // Overlaps with PK-5
    } else if (level === 'middle') {
      // Middle: 6-8
      return lowIdx <= 9 && highIdx >= 7; // Overlaps with 6-8
    } else if (level === 'high') {
      // High: 9-12
      return lowIdx <= 13 && highIdx >= 10; // Overlaps with 9-12
    }
    return true;
  };

  const { data: schools = [], isLoading } = useQuery<PrivateSchool[]>({
    queryKey: ["/api/private-schools"],
  });

  const { data: stats } = useQuery<PrivateSchoolStats>({
    queryKey: ["/api/private-schools-stats"],
  });

  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      if (searchQuery && !school.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (boroughFilter !== "all" && school.borough !== boroughFilter) {
        return false;
      }
      if (religiousFilter !== "all") {
        if (religiousFilter === "Non-Religious" && school.isReligious) {
          return false;
        } else if (religiousFilter !== "Non-Religious" && school.religiousAffiliation !== religiousFilter) {
          return false;
        }
      }
      if (coedFilter !== "all" && school.coedStatus !== coedFilter) {
        return false;
      }
      if (gradeLevelFilter !== "all" && !schoolServesGradeLevel(school, gradeLevelFilter)) {
        return false;
      }
      return true;
    });
  }, [schools, searchQuery, boroughFilter, religiousFilter, coedFilter, gradeLevelFilter]);

  const hasFilters = searchQuery || boroughFilter !== "all" || religiousFilter !== "all" || coedFilter !== "all" || gradeLevelFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setBoroughFilter("all");
    setReligiousFilter("all");
    setCoedFilter("all");
    setGradeLevelFilter("all");
    setDisplayCount(SCHOOLS_PER_PAGE);
  };

  // Reset display count when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setDisplayCount(SCHOOLS_PER_PAGE);
  };
  
  const handleBoroughChange = (value: string) => {
    setBoroughFilter(value);
    setDisplayCount(SCHOOLS_PER_PAGE);
  };
  
  const handleReligiousChange = (value: string) => {
    setReligiousFilter(value);
    setDisplayCount(SCHOOLS_PER_PAGE);
  };
  
  const handleCoedChange = (value: string) => {
    setCoedFilter(value);
    setDisplayCount(SCHOOLS_PER_PAGE);
  };
  
  const handleGradeLevelChange = (value: string) => {
    setGradeLevelFilter(value);
    setDisplayCount(SCHOOLS_PER_PAGE);
  };

  const loadMoreSchools = () => {
    setDisplayCount(prev => prev + SCHOOLS_PER_PAGE);
  };

  const displayedSchools = filteredSchools.slice(0, displayCount);
  const hasMoreSchools = displayCount < filteredSchools.length;

  const religiousOptions = useMemo(() => {
    const affiliations = new Set<string>();
    schools.forEach((s) => {
      if (s.religiousAffiliation) {
        affiliations.add(s.religiousAffiliation);
      }
    });
    return Array.from(affiliations).sort();
  }, [schools]);

  return (
    <div className="min-h-screen bg-background" data-testid="page-private-schools">
      <SEOHead
        title="NYC Private Schools 2026: Browse 623 Schools by Borough, Tuition & Grades"
        description="Browse 623 NYC private schools across Manhattan, Brooklyn, Queens, the Bronx and Staten Island. Filter by religious affiliation, grade level, enrollment size, and student-teacher ratio."
        canonicalPath="/private-schools"
        appendSiteName={false}
        keywords="NYC private schools, private school directory, New York City private schools, Catholic schools NYC, independent schools"
      />
      <AppHeader />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
              Private Schools
            </Badge>
            <Badge variant="outline">{schools.length} Schools</Badge>
          </div>
          <h1 className="text-3xl font-bold mb-3">NYC Private Schools</h1>
          <div className="space-y-3 text-muted-foreground">
            <p>
              New York City has 623 private schools ranging from elite Manhattan prep schools with $65,000+ tuition to small religious academies in Brooklyn and Queens. This directory covers every private school across all five boroughs — Catholic, Jewish, Islamic, non-sectarian, Montessori, and independent — with enrollment size, grade range, and student-teacher ratios for each.
            </p>
            <p>
              Use the filters above to narrow by borough, religious affiliation, grade level, or school type. Looking for the most selective options? Manhattan's Upper East Side prep schools — Brearley, Chapin, Spence, Dalton, Trinity — are among the most competitive in the country, with tuition exceeding $65,000/year and waitlists that rival Ivy League admissions. Brooklyn and Queens offer strong Catholic academy options in the $8,000–$15,000 range.
            </p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card className="p-4">
              <div className="text-2xl font-bold text-primary">{stats.totalSchools}</div>
              <div className="text-xs text-muted-foreground">Total Schools</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-primary">{stats.avgEnrollment}</div>
              <div className="text-xs text-muted-foreground">Avg Enrollment</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-primary">{stats.avgStudentTeacherRatio}:1</div>
              <div className="text-xs text-muted-foreground">Avg Student-Teacher</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-primary">{stats.byReligiousAffiliation?.['Non-Religious'] || 0}</div>
              <div className="text-xs text-muted-foreground">Non-Religious</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-primary">{stats.byReligiousAffiliation?.['Catholic'] || 0}</div>
              <div className="text-xs text-muted-foreground">Catholic Schools</div>
            </Card>
          </div>
        )}

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by school name..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              
              <Select value={boroughFilter} onValueChange={handleBoroughChange}>
                <SelectTrigger className="w-full md:w-40" data-testid="select-borough">
                  <SelectValue placeholder="Borough" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Boroughs</SelectItem>
                  <SelectItem value="Manhattan">Manhattan</SelectItem>
                  <SelectItem value="Brooklyn">Brooklyn</SelectItem>
                  <SelectItem value="Queens">Queens</SelectItem>
                  <SelectItem value="Bronx">Bronx</SelectItem>
                  <SelectItem value="Staten Island">Staten Island</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={religiousFilter} onValueChange={handleReligiousChange}>
                <SelectTrigger className="w-full md:w-48" data-testid="select-religious">
                  <SelectValue placeholder="Affiliation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Affiliations</SelectItem>
                  <SelectItem value="Non-Religious">Non-Religious</SelectItem>
                  {religiousOptions.filter(r => r !== 'Non-Religious').map((affiliation) => (
                    <SelectItem key={affiliation} value={affiliation}>{affiliation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={coedFilter} onValueChange={handleCoedChange}>
                <SelectTrigger className="w-full md:w-40" data-testid="select-coed">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  <SelectItem value="coed">Coeducational</SelectItem>
                  <SelectItem value="male">All Boys</SelectItem>
                  <SelectItem value="female">All Girls</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={gradeLevelFilter} onValueChange={handleGradeLevelChange}>
                <SelectTrigger className="w-full md:w-40" data-testid="select-grade-level">
                  <SelectValue placeholder="Grade Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="elementary">Elementary (PK-5)</SelectItem>
                  <SelectItem value="middle">Middle (6-8)</SelectItem>
                  <SelectItem value="high">High School (9-12)</SelectItem>
                </SelectContent>
              </Select>
              
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Showing {displayedSchools.length} of {filteredSchools.length} schools
                {filteredSchools.length !== schools.length && ` (${schools.length} total)`}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedSchools.map((school) => (
                <Link key={school.ncesId} href={getPrivateSchoolUrl(school)}>
                  <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-school-${school.ncesId}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-sm line-clamp-2">{school.name}</h3>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                        <MapPin className="w-3 h-3" />
                        <span>{school.borough || school.city}, NY</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {school.isReligious && school.religiousAffiliation && (
                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                            <Church className="w-2.5 h-2.5 mr-1" />
                            {school.religiousAffiliation}
                          </Badge>
                        )}
                        {!school.isReligious && (
                          <Badge variant="outline" className="text-xs">
                            Non-Religious
                          </Badge>
                        )}
                        {school.coedStatus && school.coedStatus !== 'coed' && (
                          <Badge variant="outline" className="text-xs">
                            {school.coedStatus === 'male' ? "Boys" : "Girls"}
                          </Badge>
                        )}
                        {school.gradesOffered && (
                          <Badge variant="secondary" className="text-xs">
                            <GraduationCap className="w-2.5 h-2.5 mr-1" />
                            {getGradeRangeDisplay(school)}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {school.enrollment ? `${school.enrollment} students` : 'Enrollment N/A'}
                        </span>
                        {school.studentTeacherRatio && (
                          <span>{school.studentTeacherRatio}:1 ratio</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {hasMoreSchools && (
              <div className="flex justify-center mt-8">
                <Button 
                  onClick={loadMoreSchools} 
                  variant="outline" 
                  size="lg"
                  data-testid="button-load-more"
                >
                  Load More Schools ({filteredSchools.length - displayCount} remaining)
                </Button>
              </div>
            )}

            {filteredSchools.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No schools found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or search query
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
