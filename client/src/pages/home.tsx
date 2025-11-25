import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterBar, SortOption } from "@/components/FilterBar";
import { SchoolList } from "@/components/SchoolList";
import { SchoolDetailPanel } from "@/components/SchoolDetailPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { School, SchoolWithOverallScore, calculateOverallScore } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, User, Heart, Sparkles, Map, Settings, MessageCircle } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("2");
  const [selectedGradeBand, setSelectedGradeBand] = useState("All");
  const [earlyChildhoodFilter, setEarlyChildhoodFilter] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("overall");
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithOverallScore | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

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

    if (debouncedSearchQuery) {
      const normalizeBasic = (str: string) => 
        str.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const normalizeSchoolSearch = (str: string) => {
        let normalized = str.toLowerCase();
        normalized = normalized.replace(/p\.?\s*s\.?\s*/gi, 'ps');
        normalized = normalized.replace(/i\.?\s*s\.?\s*/gi, 'is');
        normalized = normalized.replace(/m\.?\s*s\.?\s*/gi, 'ms');
        normalized = normalized.replace(/j\.?\s*h\.?\s*s\.?\s*/gi, 'jhs');
        normalized = normalized.replace(/h\.?\s*s\.?\s*/gi, 'hs');
        normalized = normalized.replace(/[^a-z0-9]/g, '');
        normalized = normalized.replace(/(ps|is|ms|jhs|hs)0*(\d+)/g, '$1$2');
        return normalized;
      };
      
      const normalizedQuery = normalizeSchoolSearch(debouncedSearchQuery);
      filtered = filtered.filter(
        (school) =>
          normalizeSchoolSearch(school.name).includes(normalizedQuery) ||
          normalizeBasic(school.dbn).includes(normalizeBasic(debouncedSearchQuery))
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

    if (earlyChildhoodFilter !== "All") {
      if (earlyChildhoodFilter === "Pre-K") {
        filtered = filtered.filter((school) => school.has_prek === true);
      } else if (earlyChildhoodFilter === "3-K") {
        filtered = filtered.filter((school) => school.has_3k === true);
      }
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
  }, [schools, debouncedSearchQuery, selectedDistrict, selectedGradeBand, earlyChildhoodFilter, sortBy]);

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

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "NYC School Ratings",
    "url": "https://nyc-school-ratings.replit.app",
    "description": "Find and compare NYC public and charter elementary schools with ratings, test scores, and parent reviews",
    "sameAs": []
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "NYC School Ratings",
    "url": "https://nyc-school-ratings.replit.app",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://nyc-school-ratings.replit.app/?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background" data-testid="home-page">
      <SEOHead 
        description="Find and compare NYC public and charter elementary schools. Browse 1,500+ schools with ratings, test scores, demographics, and parent reviews to make informed kindergarten enrollment decisions."
        keywords="NYC schools, kindergarten, elementary schools, public schools, charter schools, school ratings, school finder, New York City education, school comparison, parent reviews, NYC DOE"
        canonicalPath="/"
      />
      <StructuredData data={organizationSchema} />
      <StructuredData data={websiteSchema} />
      <header className="bg-background border-b" data-testid="header-main">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-page-title">
                NYC School Ratings
              </h1>
              <p className="text-muted-foreground" data-testid="text-page-subtitle">
                Find and compare NYC public and charter elementary schools
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const chatButton = document.querySelector('[data-testid="button-chat-open"]') as HTMLButtonElement;
                  if (chatButton) chatButton.click();
                }}
                data-testid="button-ai-assistant-header"
                className="bg-primary hover:bg-primary/90"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Ask AI Assistant
              </Button>
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
                  onClick={async () => {
                    await fetch('/api/logout', { method: 'POST' });
                    window.location.href = '/';
                  }}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              ) : (
                <Link href="/login">
                  <Button
                    variant="default"
                    size="sm"
                    data-testid="button-login"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                </Link>
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
        earlyChildhoodFilter={earlyChildhoodFilter}
        onEarlyChildhoodFilterChange={setEarlyChildhoodFilter}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8" data-testid="main-content">
        <div className="mb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 rounded-lg p-6" data-testid="banner-ai-assistant">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1 flex items-center gap-2" data-testid="text-ai-banner-title">
                  Need help finding the perfect school?
                </h2>
                <p className="text-muted-foreground text-sm" data-testid="text-ai-banner-description">
                  Chat with our AI assistant to get personalized recommendations, compare schools, and find answers to all your questions about NYC kindergarten schools.
                </p>
              </div>
            </div>
            <Button
              variant="default"
              onClick={() => {
                const chatButton = document.querySelector('[data-testid="button-chat-open"]') as HTMLButtonElement;
                if (chatButton) chatButton.click();
              }}
              data-testid="button-ai-assistant-banner"
              className="shrink-0 bg-primary hover:bg-primary/90"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Ask AI Assistant
            </Button>
          </div>
        </div>
        
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
      
      <Footer />
    </div>
  );
}
