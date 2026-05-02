import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useCheckout } from "@/hooks/useCheckout";
import { useQuery } from "@tanstack/react-query";
import { 
  LogOut, 
  LogIn,
  Heart, 
  Sparkles, 
  Map, 
  Settings, 
  Home,
  Shuffle,
  Zap,
  Star,
  ClipboardList,
  Target,
  Shield
} from "lucide-react";

export function AppHeader() {
  const { user, isAuthenticated } = useAuth();
  const { startCheckout, isPending, isPremium } = useCheckout();

  const { data: subscription, isFetched: subscriptionFetched } = useQuery<{
    status: string;
    plan: string;
  }>({
    queryKey: ["/api/subscription"],
    enabled: isAuthenticated,
  });

  const isPremiumUser = subscription?.status === "active" && 
    (subscription?.plan === "premium" || subscription?.plan === "season_pass");
  const showUpgradeButton = isAuthenticated && subscriptionFetched && !isPremiumUser;

  return (
    <header className="bg-background border-b" data-testid="header-main">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                <Home className="w-5 h-5 text-primary" />
                <h1 className="text-xl md:text-2xl font-bold" data-testid="text-site-title">
                  NYC School Ratings
                </h1>
              </div>
            </Link>
            {subscriptionFetched && isPremiumUser && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-medium" data-testid="badge-premium">
                <Star className="w-3 h-3" />
                <span>Premium</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {isAuthenticated ? (
              <>
                <Link href="/recommendations">
                  <Button variant="outline" size="sm" data-testid="button-recommendations-nav">
                    <Sparkles className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Find My Match</span>
                    <span className="sm:hidden">Match</span>
                  </Button>
                </Link>
                <Link href="/lottery-simulator">
                  <Button variant="outline" size="sm" data-testid="button-lottery-nav">
                    <Shuffle className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Lottery</span>
                    <span className="sm:hidden">Lottery</span>
                  </Button>
                </Link>
                <Link href="/chances-calculator">
                  <Button variant="outline" size="sm" data-testid="button-chances-nav">
                    <Target className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Chances</span>
                    <span className="sm:hidden">Chances</span>
                  </Button>
                </Link>
                <Link href="/map">
                  <Button variant="outline" size="icon" className="sm:w-auto sm:px-3" data-testid="button-map-nav">
                    <Map className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Map</span>
                  </Button>
                </Link>
                <Link href="/safe-and-strong">
                  <Button variant="outline" size="sm" data-testid="button-safe-and-strong-nav">
                    <Shield className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Safe &amp; Strong</span>
                    <span className="sm:hidden">Safe</span>
                  </Button>
                </Link>
                <Link href="/favorites">
                  <Button variant="outline" size="icon" className="sm:w-auto sm:px-3" data-testid="button-favorites-nav">
                    <Heart className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Favorites</span>
                  </Button>
                </Link>
                {isPremium && (
                  <Link href="/application-tracker">
                    <Button variant="outline" size="icon" className="sm:w-auto sm:px-3" data-testid="button-tracker-nav">
                      <ClipboardList className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Tracker</span>
                    </Button>
                  </Link>
                )}
                {showUpgradeButton && (
                  <Link href="/pricing">
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-gradient-to-r from-primary to-primary/80"
                      data-testid="button-upgrade-nav"
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Upgrade</span>
                      <span className="sm:hidden">Pro</span>
                    </Button>
                  </Link>
                )}
                <Link href="/settings">
                  <Button variant="outline" size="icon" className="sm:w-auto sm:px-3" data-testid="button-settings-nav">
                    <Settings className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:w-auto sm:px-3"
                  onClick={async () => {
                    await fetch('/api/logout', { method: 'POST' });
                    window.location.href = '/';
                  }}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            ) : (
              <>
                <Link href="/recommendations">
                  <Button variant="outline" size="sm" data-testid="button-recommendations-nav">
                    <Sparkles className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Find My Match</span>
                    <span className="sm:hidden">Match</span>
                  </Button>
                </Link>
                <Link href="/lottery-simulator">
                  <Button variant="outline" size="sm" data-testid="button-lottery-nav">
                    <Shuffle className="w-4 h-4 mr-2" />
                    <span>Lottery</span>
                  </Button>
                </Link>
                <Link href="/chances-calculator">
                  <Button variant="outline" size="sm" data-testid="button-chances-nav">
                    <Target className="w-4 h-4 mr-2" />
                    <span>Chances</span>
                  </Button>
                </Link>
                <Link href="/safe-and-strong">
                  <Button variant="outline" size="sm" data-testid="button-safe-and-strong-nav">
                    <Shield className="w-4 h-4 mr-2" />
                    <span>Safe &amp; Strong</span>
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="sm" data-testid="button-pricing-nav">
                    <Zap className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Pricing</span>
                    <span className="sm:hidden">Pricing</span>
                  </Button>
                </Link>
                <Link href="/login">
                  <Button 
                    variant="default" 
                    size="sm" 
                    data-testid="button-login-nav"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Log In</span>
                    <span className="sm:hidden">Login</span>
                  </Button>
                </Link>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
