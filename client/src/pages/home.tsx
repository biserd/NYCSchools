import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterBar, SortOption } from "@/components/FilterBar";
import { SchoolList } from "@/components/SchoolList";
import { SchoolDetailPanel } from "@/components/SchoolDetailPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { School, SchoolWithOverallScore, calculateOverallScore } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, User, Heart, Sparkles, Map, Settings } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedGradeBand, setSelectedGradeBand] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("overall");
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithOverallScore | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: rawSchools, isLoading } = useQuery<School[]>({
    queryKey: ["/api/schools"],
  });

  const schools = useMemo(() => {
    if (!rawSchools) return [];
    
    return rawSchools.map((school): SchoolWithOverallScore => ({
      ...school,
      overall_score: calculateOverallScore(school),
    }));
  }, [rawSchools]);

  const filteredAndSortedSchools = useMemo(() => {
    let filtered = schools;

    if (searchQuery) {
      const normalizeString = (str: string) => 
        str.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const normalizedQuery = normalizeString(searchQuery);
      filtered = filtered.filter(
        (school) =>
          normalizeString(school.name).includes(normalizedQuery) ||
          normalizeString(school.dbn).includes(normalizedQuery)
      );
    }

    if (selectedDistrict !== "all") {
      filtered = filtered.filter(
        (school) => school.district === parseInt(selectedDistrict)
      );
    }

    if (selectedGradeBand !== "All") {
      filtered = filtered.filter((school) => school.grade_band === selectedGradeBand);
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "overall":
          return b.overall_score - a.overall_score;
        case "academics":
          return b.academics_score - a.academics_score;
        case "climate":
          return b.climate_score - a.climate_score;
        case "progress":
          return b.progress_score - a.progress_score;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return sorted;
  }, [schools, searchQuery, selectedDistrict, selectedGradeBand, sortBy]);

  const handleSchoolClick = (school: SchoolWithOverallScore) => {
    setSelectedSchool(school);
    setDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" data-testid="loading-state">
        <div className="sticky top-0 z-50 bg-background border-b" data-testid="skeleton-filter-bar">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <Skeleton className="h-12 flex-1" data-testid="skeleton-search" />
                <Skeleton className="h-12 w-full md:w-48" data-testid="skeleton-district" />
                <Skeleton className="h-12 w-full md:w-48" data-testid="skeleton-grade" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-32" data-testid="skeleton-sort-1" />
                <Skeleton className="h-8 w-24" data-testid="skeleton-sort-2" />
                <Skeleton className="h-8 w-24" data-testid="skeleton-sort-3" />
              </div>
            </div>
          </div>
        </div>
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-8" data-testid="skeleton-schools">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" data-testid={`skeleton-card-${i}`} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="home-page">
      <header className="bg-background border-b" data-testid="header-main">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-page-title">
                NYC Kindergarten School Finder
              </h1>
              <p className="text-muted-foreground" data-testid="text-page-subtitle">
                Find and compare NYC public and charter elementary schools
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/recommendations">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-recommendations-nav"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Find My Match
                </Button>
              </Link>
              <Link href="/map">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-map-nav"
                >
                  <Map className="w-4 h-4 mr-2" />
                  Map View
                </Button>
              </Link>
              {isAuthenticated && user && (
                <>
                  <Link href="/favorites">
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="button-favorites-nav"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      My Favorites
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="button-settings-nav"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 mr-2" data-testid="container-user-info">
                    {user.profileImageUrl && (
                      <img 
                        src={user.profileImageUrl} 
                        alt={`${user.firstName || 'User'}'s profile`} 
                        className="w-8 h-8 rounded-full object-cover"
                        data-testid="img-user-avatar"
                      />
                    )}
                    <span className="text-sm text-muted-foreground" data-testid="text-user-name">
                      {user.firstName || user.email || 'User'}
                    </span>
                  </div>
                </>
              )}
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => window.location.href = '/api/login'}
                  data-testid="button-login"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedDistrict={selectedDistrict}
        onDistrictChange={setSelectedDistrict}
        selectedGradeBand={selectedGradeBand}
        onGradeBandChange={setSelectedGradeBand}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8" data-testid="main-content">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground" data-testid="text-results-count">
            Showing {filteredAndSortedSchools.length} {filteredAndSortedSchools.length === 1 ? 'school' : 'schools'}
          </p>
        </div>
        <SchoolList
          schools={filteredAndSortedSchools}
        />
      </main>

      <SchoolDetailPanel
        school={selectedSchool}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
