import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useState, useMemo } from "react";
import { School, SchoolWithOverallScore, calculateOverallScore, Favorite } from "@shared/schema";
import { SchoolDetailPanel } from "@/components/SchoolDetailPanel";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, Zap, Star, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { SchoolCard } from "@/components/SchoolCard";
import { UpgradeModal } from "@/components/UpgradeModal";

const FREE_TIER_MAX_FAVORITES = 5;

export default function FavoritesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithOverallScore | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data: favorites, isLoading: favoritesLoading } = useQuery<Favorite[]>({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  // Check subscription status - wait for query to complete before showing nudges
  const { data: subscription, isFetched: subscriptionFetched } = useQuery<{
    status: string;
    plan: string;
  }>({
    queryKey: ["/api/subscription"],
    enabled: isAuthenticated,
  });

  // Check for premium access - includes recurring subscriptions and Season Pass
  const isPremium = subscription?.status === "active" && 
    (subscription?.plan === "premium" || subscription?.plan === "season_pass");
  // Only show upgrade nudge after subscription query completes and user is NOT premium
  const showUpgradeNudge = subscriptionFetched && !isPremium;

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
      <div className="flex flex-col min-h-screen bg-background" data-testid="loading-favorites">
        <SEOHead title="My Favorite Schools" description="View and manage your saved schools." canonicalPath="/favorites" noindex />
        <AppHeader />
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-32" />
        </div>
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen bg-background" data-testid="favorites-login-prompt">
        <SEOHead title="My Favorite Schools" description="View and manage your saved schools." canonicalPath="/favorites" noindex />
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
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
        <Footer />
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
        noindex
      />
      <AppHeader />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-6 h-6 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-favorites-title">
            My Favorite Schools
          </h1>
        </div>
        <p className="text-muted-foreground" data-testid="text-favorites-count">
          {favoriteSchools.length} {favoriteSchools.length === 1 ? 'school' : 'schools'} saved
        </p>
      </div>

      {/* Upgrade nudge for free users - only show after subscription check completes */}
      {showUpgradeNudge && favoriteSchools.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {favoriteSchools.length} of {FREE_TIER_MAX_FAVORITES} favorites used
                  </span>
                  {favoriteSchools.length >= FREE_TIER_MAX_FAVORITES && (
                    <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      Limit reached
                    </Badge>
                  )}
                </div>
                <Progress 
                  value={(favoriteSchools.length / FREE_TIER_MAX_FAVORITES) * 100} 
                  className="h-2 mb-2"
                />
                <p className="text-xs text-muted-foreground">
                  Upgrade to Premium for unlimited favorites and smarter school comparisons
                </p>
              </div>
              <Button size="sm" onClick={() => setShowUpgradeModal(true)} data-testid="button-upgrade-favorites">
                <Zap className="w-4 h-4 mr-1" />
                Upgrade
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Premium badge for premium users - only show after subscription check completes */}
      {subscriptionFetched && isPremium && (
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>Unlimited favorites with Premium</span>
          </div>
        </div>
      )}

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
        isPremium={isPremium}
      />
      
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        trigger="favorites_limit"
      />
      
      <Footer />
    </div>
  );
}
