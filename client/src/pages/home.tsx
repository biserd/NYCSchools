import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterBar, SortOption } from "@/components/FilterBar";
import { SchoolList } from "@/components/SchoolList";
import { SchoolDetailPanel } from "@/components/SchoolDetailPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { School, SchoolWithOverallScore, calculateOverallScore, type SchoolTrend } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, User, Heart, Sparkles, Map, Settings, MessageCircle, Menu } from "lucide-react";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitialFiltersFromURL(): {
  search: string;
  district: string;
  gradeBand: string;
  earlyChildhood: string;
  giftedTalented: string;
  trend: string;
  dualLanguage: string;
  sort: SortOption;
} {
  if (typeof window === "undefined") {
    return {
      search: "",
      district: "2",
      gradeBand: "All",
      earlyChildhood: "All",
      giftedTalented: "All",
      trend: "All",
      dualLanguage: "All",
      sort: "overall",
    };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    search: params.get("q") || "",
    district: params.get("district") || "2",
    gradeBand: params.get("grade") || "All",
    earlyChildhood: params.get("ec") || "All",
    giftedTalented: params.get("gt") || "All",
    trend: params.get("trend") || "All",
    dualLanguage: params.get("dl") || "All",
    sort: (params.get("sort") as SortOption) || "overall",
  };
}

export default function Home() {
  const initialFilters = useMemo(() => getInitialFiltersFromURL(), []);
  
  const [searchQuery, setSearchQuery] = useState(initialFilters.search);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialFilters.search);
  const [selectedDistrict, setSelectedDistrict] = useState(initialFilters.district);
  const [selectedGradeBand, setSelectedGradeBand] = useState(initialFilters.gradeBand);
  const [earlyChildhoodFilter, setEarlyChildhoodFilter] = useState(initialFilters.earlyChildhood);
  const [giftedTalentedFilter, setGiftedTalentedFilter] = useState(initialFilters.giftedTalented);
  const [trendFilter, setTrendFilter] = useState(initialFilters.trend);
  const [dualLanguageFilter, setDualLanguageFilter] = useState(initialFilters.dualLanguage);
  const [sortBy, setSortBy] = useState<SortOption>(initialFilters.sort);
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithOverallScore | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const updateURLParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(window.location.search);
    
    Object.entries(updates).forEach(([key, value]) => {
      const defaultValues: Record<string, string> = {
        q: "",
        district: "2",
        grade: "All",
        ec: "All",
        gt: "All",
        trend: "All",
        dl: "All",
        sort: "overall",
      };
      
      if (value === defaultValues[key]) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    const newSearch = params.toString();
    const newURL = newSearch ? `/?${newSearch}` : "/";
    window.history.replaceState(null, "", newURL);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleDistrictChange = useCallback((value: string) => {
    setSelectedDistrict(value);
    updateURLParams({ district: value });
  }, [updateURLParams]);

  const handleGradeBandChange = useCallback((value: string) => {
    setSelectedGradeBand(value);
    updateURLParams({ grade: value });
  }, [updateURLParams]);

  const handleEarlyChildhoodChange = useCallback((value: string) => {
    setEarlyChildhoodFilter(value);
    updateURLParams({ ec: value });
  }, [updateURLParams]);

  const handleGiftedTalentedChange = useCallback((value: string) => {
    setGiftedTalentedFilter(value);
    updateURLParams({ gt: value });
  }, [updateURLParams]);

  const handleTrendChange = useCallback((value: string) => {
    setTrendFilter(value);
    updateURLParams({ trend: value });
  }, [updateURLParams]);

  const handleDualLanguageChange = useCallback((value: string) => {
    setDualLanguageFilter(value);
    updateURLParams({ dl: value });
  }, [updateURLParams]);

  const handleSortChange = useCallback((value: SortOption) => {
    setSortBy(value);
    updateURLParams({ sort: value });
  }, [updateURLParams]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      updateURLParams({ q: searchQuery });
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, updateURLParams]);

  const { data: rawSchools, isLoading } = useQuery<School[]>({
    queryKey: ["/api/schools"],
  });

  // Fetch all school trends for filtering
  const { data: trends } = useQuery<Record<string, SchoolTrend>>({
    queryKey: ['/api/schools-trends'],
    staleTime: 1000 * 60 * 10, // 10 minutes
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
      switch (selectedGradeBand) {
        case "PreK":
          filtered = filtered.filter((school) => school.has_prek === true);
          break;
        case "3K":
          filtered = filtered.filter((school) => school.has_3k === true);
          break;
        case "Elementary":
          filtered = filtered.filter((school) => 
            school.grade_band?.includes("K-5") || 
            school.grade_band?.includes("PK-5") ||
            school.grade_band?.match(/^[0-5]-[0-5]$/)
          );
          break;
        case "Middle":
          filtered = filtered.filter((school) => 
            school.grade_band === "6-8"
          );
          break;
        case "K-8":
          filtered = filtered.filter((school) => 
            school.grade_band?.includes("K-8") || 
            school.grade_band?.includes("PK-8") ||
            school.grade_band?.match(/^[0-8]-[0-8]$/)
          );
          break;
        case "HighSchool":
          filtered = filtered.filter((school) => 
            school.grade_band?.includes("9-12") || 
            school.grade_band?.includes("6-12") ||
            school.grade_band?.includes("7-12")
          );
          break;
      }
    }

    if (earlyChildhoodFilter !== "All") {
      if (earlyChildhoodFilter === "Pre-K") {
        filtered = filtered.filter((school) => school.has_prek === true);
      } else if (earlyChildhoodFilter === "3-K") {
        filtered = filtered.filter((school) => school.has_3k === true);
      }
    }

    if (giftedTalentedFilter !== "All") {
      if (giftedTalentedFilter === "G&T") {
        filtered = filtered.filter((school) => school.has_gifted_talented === true);
      } else if (giftedTalentedFilter === "Citywide") {
        filtered = filtered.filter((school) => school.gt_program_type === "citywide");
      } else if (giftedTalentedFilter === "District") {
        filtered = filtered.filter((school) => school.gt_program_type === "district");
      }
    }

    // Filter by historical trend
    if (trendFilter !== "All" && trends) {
      filtered = filtered.filter((school) => {
        const trend = trends[school.dbn];
        if (!trend || trend.direction === 'insufficient_data') return false;
        
        switch (trendFilter) {
          case "Improving":
            return trend.direction === 'improving';
          case "Stable":
            return trend.direction === 'stable';
          case "Declining":
            return trend.direction === 'declining';
          default:
            return true;
        }
      });
    }

    // Filter by dual language programs
    if (dualLanguageFilter !== "All") {
      switch (dualLanguageFilter) {
        case "DualLanguage":
          filtered = filtered.filter((school) => school.has_dual_language === true);
          break;
        case "Spanish":
          filtered = filtered.filter((school) => 
            school.has_dual_language && school.dual_language_languages?.includes("Spanish")
          );
          break;
        case "Chinese":
          filtered = filtered.filter((school) => 
            school.has_dual_language && school.dual_language_languages?.includes("Chinese")
          );
          break;
        case "French":
          filtered = filtered.filter((school) => 
            school.has_dual_language && school.dual_language_languages?.includes("French")
          );
          break;
        case "Other":
          filtered = filtered.filter((school) => 
            school.has_dual_language && 
            school.dual_language_languages?.some(lang => 
              !["Spanish", "Chinese", "French"].includes(lang)
            )
          );
          break;
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
  }, [schools, debouncedSearchQuery, selectedDistrict, selectedGradeBand, earlyChildhoodFilter, giftedTalentedFilter, trendFilter, dualLanguageFilter, trends, sortBy]);

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
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl font-bold" data-testid="text-page-title">
                NYC School Ratings
              </h1>
              <p className="text-muted-foreground text-sm hidden sm:block" data-testid="text-page-subtitle">
                Find and compare NYC public and charter elementary schools
              </p>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
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
                Ask AI
              </Button>
              <Button variant="outline" size="sm" asChild data-testid="button-recommendations-nav">
                <Link href="/recommendations">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Find My Match
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild data-testid="button-map-nav">
                <Link href="/map">
                  <Map className="w-4 h-4 mr-2" />
                  Map View
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild data-testid="button-settings-nav">
                <Link href="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </Button>
              {isAuthenticated && user && (
                <Button variant="outline" size="sm" asChild data-testid="button-favorites-nav">
                  <Link href="/favorites">
                    <Heart className="w-4 h-4 mr-2" />
                    Favorites
                  </Link>
                </Button>
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
                <Button variant="default" size="sm" asChild data-testid="button-login">
                  <Link href="/login">
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </Link>
                </Button>
              )}
              <ThemeToggle />
            </div>

            <div className="flex md:hidden items-center gap-2">
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await fetch('/api/logout', { method: 'POST' });
                    window.location.href = '/';
                  }}
                  data-testid="button-logout-mobile"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="default" size="sm" asChild data-testid="button-login-mobile">
                  <Link href="/login">
                    <LogIn className="w-4 h-4" />
                  </Link>
                </Button>
              )}
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" data-testid="button-mobile-menu">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => {
                      const chatButton = document.querySelector('[data-testid="button-chat-open"]') as HTMLButtonElement;
                      if (chatButton) chatButton.click();
                    }}
                    data-testid="menu-item-ai"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Ask AI Assistant
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/recommendations" data-testid="menu-item-match">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Find My Match
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/map" data-testid="menu-item-map">
                      <Map className="w-4 h-4 mr-2" />
                      Map View
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isAuthenticated && user && (
                    <DropdownMenuItem asChild>
                      <Link href="/favorites" data-testid="menu-item-favorites">
                        <Heart className="w-4 h-4 mr-2" />
                        My Favorites
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/settings" data-testid="menu-item-settings">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        selectedDistrict={selectedDistrict}
        onDistrictChange={handleDistrictChange}
        selectedGradeBand={selectedGradeBand}
        onGradeBandChange={handleGradeBandChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        earlyChildhoodFilter={earlyChildhoodFilter}
        onEarlyChildhoodFilterChange={handleEarlyChildhoodChange}
        giftedTalentedFilter={giftedTalentedFilter}
        onGiftedTalentedFilterChange={handleGiftedTalentedChange}
        trendFilter={trendFilter}
        onTrendFilterChange={handleTrendChange}
        dualLanguageFilter={dualLanguageFilter}
        onDualLanguageFilterChange={handleDualLanguageChange}
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
