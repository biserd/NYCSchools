import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type PrivateSchool } from "@shared/schema";
import { getTuitionRange, getGradeRangeDisplay, getPrivateSchoolUrl } from "@shared/school-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { AppHeader } from "@/components/AppHeader";
import { PrivateDirectoryContent } from '@shared/PrivateDirectoryContent';
import { PRIVATE_DIRECTORY_META, PRIVATE_BOROUGHS, PRIVATE_GRADES } from '@shared/discovery-pages';
import { privateSchoolServesStage } from '@shared/parent-guide-data';
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
  const [boroughFilter, setBoroughFilter] = useState<string>(() => {
    const value = new URLSearchParams(window.location.search).get('borough');
    return PRIVATE_BOROUGHS.find(b => b === value) || 'all';
  });
  const [religiousFilter, setReligiousFilter] = useState("all");
  const [coedFilter, setCoedFilter] = useState("all");
  const [gradeLevelFilter, setGradeLevelFilter] = useState<string>(() => {
    const value = new URLSearchParams(window.location.search).get('grade');
    return PRIVATE_GRADES.find(g => g.value === value)?.value || 'all';
  });
  const [displayCount, setDisplayCount] = useState(SCHOOLS_PER_PAGE);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (boroughFilter === 'all') url.searchParams.delete('borough'); else url.searchParams.set('borough', boroughFilter);
    if (gradeLevelFilter === 'all') url.searchParams.delete('grade'); else url.searchParams.set('grade', gradeLevelFilter);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [boroughFilter, gradeLevelFilter]);

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
        if (religiousFilter === "Non-Religious" && school.religiousAffiliation !== "Non-Religious") {
          return false;
        } else if (religiousFilter !== "Non-Religious" && school.religiousAffiliation !== religiousFilter) {
          return false;
        }
      }
      if (coedFilter !== "all" && school.coedStatus !== coedFilter) {
        return false;
      }
      if (!privateSchoolServesStage(school, gradeLevelFilter)) {
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
        title={PRIVATE_DIRECTORY_META.title}
        description={PRIVATE_DIRECTORY_META.description}
        canonicalPath="/private-schools"
        appendSiteName={false}
        keywords="best private schools NYC 2026, NYC private schools, private school directory, New York City private schools, Catholic schools NYC, independent schools, private school tuition NYC"
      />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: PRIVATE_DIRECTORY_META.heading,
          description: PRIVATE_DIRECTORY_META.description,
          url: "https://nycschoolsratings.com/private-schools",
          itemListElement: displayedSchools.map((school, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            item: {
              "@type": "School",
              name: school.name,
              url: `https://nycschoolsratings.com${getPrivateSchoolUrl(school)}`,
              address: {
                "@type": "PostalAddress",
                addressLocality: school.borough,
                addressRegion: "NY",
                addressCountry: "US",
              },
              ...(school.enrollment ? { numberOfStudents: school.enrollment } : {}),
            },
          })),
        }}
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
          <h1 className="text-3xl font-bold mb-3">{PRIVATE_DIRECTORY_META.heading}</h1>
          <div className="space-y-3 text-muted-foreground">
            <PrivateDirectoryContent borough={boroughFilter} grade={gradeLevelFilter}/>
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

        <Card className="mb-6 scroll-mt-6" id="school-results">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by school name..."
                  aria-label="Search private schools by name"
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
                  <SelectItem value="elementary">Elementary (K-5)</SelectItem>
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
                        {school.religiousAffiliation && school.religiousAffiliation !== 'Non-Religious' && school.religiousAffiliation !== 'Unknown' && (
                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                            <Church className="w-2.5 h-2.5 mr-1" />
                            {school.religiousAffiliation}
                          </Badge>
                        )}
                        {school.religiousAffiliation === 'Non-Religious' && (
                          <Badge variant="outline" className="text-xs">
                            Non-Religious
                          </Badge>
                        )}
                        {(!school.religiousAffiliation || school.religiousAffiliation === 'Unknown') && <Badge variant="outline" className="text-xs">Affiliation not recorded</Badge>}
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
                          <span>{school.studentTeacherRatio}:1 students/FTE teacher</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Directory source year: {school.dataSourceYear || 'not recorded'} · Whole-school figures, not class size.</p>
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
