import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type PrivateSchool, getTuitionRange, getGradeRangeDisplay } from "@shared/schema";
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

export default function PrivateSchools() {
  const [searchQuery, setSearchQuery] = useState("");
  const [boroughFilter, setBoroughFilter] = useState("all");
  const [religiousFilter, setReligiousFilter] = useState("all");
  const [coedFilter, setCoedFilter] = useState("all");

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
      return true;
    });
  }, [schools, searchQuery, boroughFilter, religiousFilter, coedFilter]);

  const hasFilters = searchQuery || boroughFilter !== "all" || religiousFilter !== "all" || coedFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setBoroughFilter("all");
    setReligiousFilter("all");
    setCoedFilter("all");
  };

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
        title="NYC Private Schools Directory | Browse 600+ Schools"
        description="Explore 600+ NYC private schools with enrollment data, religious affiliations, and grade information. Find the perfect private school for your child in Manhattan, Brooklyn, Queens, Bronx, and Staten Island."
        canonicalPath="/private-schools"
        keywords={["NYC private schools", "private school directory", "New York City private schools", "Catholic schools NYC", "independent schools"]}
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
          <h1 className="text-3xl font-bold mb-2">NYC Private Schools</h1>
          <p className="text-muted-foreground max-w-2xl">
            Browse {schools.length}+ private schools across New York City. Filter by borough, religious affiliation, and more to find the right fit for your child.
          </p>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              
              <Select value={boroughFilter} onValueChange={setBoroughFilter}>
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
              
              <Select value={religiousFilter} onValueChange={setReligiousFilter}>
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
              
              <Select value={coedFilter} onValueChange={setCoedFilter}>
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
                Showing {filteredSchools.length} of {schools.length} schools
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchools.map((school) => (
                <Link key={school.ncesId} href={`/private-school/${school.ncesId}`}>
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
