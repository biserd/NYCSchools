import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useState, useMemo } from "react";
import { School, SchoolWithOverallScore, calculateOverallScore, Favorite } from "@shared/schema";
import { SchoolDetailPanel } from "@/components/SchoolDetailPanel";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Heart } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { SchoolCard } from "@/components/SchoolCard";

export default function FavoritesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithOverallScore | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: favorites, isLoading: favoritesLoading } = useQuery<Favorite[]>({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const { data: allSchools } = useQuery<School[]>({
    queryKey: ["/api/schools"],
  });

  const favoriteSchools = useMemo(() => {
    if (!favorites || !allSchools) return [];
    
    const favoriteDbnSet = new Set(favorites.map(f => f.schoolDbn));
    return allSchools
      .filter(school => favoriteDbnSet.has(school.dbn))
      .map((school): SchoolWithOverallScore => ({
        ...school,
        overall_score: calculateOverallScore(school),
      }));
  }, [favorites, allSchools]);

  if (authLoading || favoritesLoading) {
    return (
      <div className="min-h-screen bg-background" data-testid="loading-favorites">
        <header className="bg-background border-b">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
            <Skeleton className="h-10 w-64" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="favorites-login-prompt">
        <Card className="p-8 max-w-md text-center">
          <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-4">
            Please log in to view and manage your favorite schools.
          </p>
          <Link href="/login">
            <Button data-testid="button-login-favorites">
              Login to Continue
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background" data-testid="favorites-page">
      <SEOHead 
        title="My Favorite Schools"
        description="View and manage your favorite NYC elementary schools. Compare saved schools and make informed kindergarten enrollment decisions."
        keywords="favorite schools, saved schools, NYC kindergarten favorites, school bookmarks, compare schools"
        canonicalPath="/favorites"
      />
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Search
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-favorites-title">
            My Favorite Schools
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-favorites-count">
            {favoriteSchools.length} {favoriteSchools.length === 1 ? 'school' : 'schools'} saved
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8" data-testid="main-favorites">
        {favoriteSchools.length === 0 ? (
          <Card className="p-12 text-center" data-testid="empty-favorites">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No Favorites Yet</h2>
            <p className="text-muted-foreground mb-4">
              Start adding schools to your favorites to compare them here.
            </p>
            <Link href="/">
              <Button data-testid="button-browse-schools">
                Browse Schools
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="favorites-grid">
            {favoriteSchools.map((school) => (
              <SchoolCard
                key={school.dbn}
                school={school}
              />
            ))}
          </div>
        )}
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
