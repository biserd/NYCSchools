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
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4">
        <div className="flex min-h-11 items-center justify-between gap-4 flex-nowrap">
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/">
              <div className="flex min-h-11 items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                <Home className="w-5 h-5 text-primary" />
                <span className="text-xl md:text-2xl font-bold" data-testid="text-site-title">
                  NYC School Ratings
                </span>
              </div>
            </Link>
            {subscriptionFetched && isPremiumUser && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-medium" data-testid="badge-premium">
                <Star className="w-3 h-3" />
                <span>Full Access</span>
              </div>
            )}
          </div>
          
          <div className="flex shrink-0 items-center gap-2 flex-nowrap [&_button]:min-h-11 [&_button]:min-w-11">
            {isAuthenticated ? (
              <>
                <Link href="/recommendations">
                  <Button variant="outline" size="sm" data-testid="button-recommendations-nav" aria-label="Find My Match">
                    <Sparkles className="w-4 h-4 2xl:mr-2" />
                    <span className="sr-only 2xl:not-sr-only">Find My Match</span>
                  </Button>
                </Link>
                <Link href="/lottery-simulator">
                  <Button variant="outline" size="sm" data-testid="button-lottery-nav">
                    <Shuffle className="w-4 h-4 2xl:mr-2" />
                    <span className="sr-only 2xl:not-sr-only">Lottery</span>
                  </Button>
                </Link>
                <Link href="/chances-calculator">
                  <Button variant="outline" size="sm" data-testid="button-chances-nav">
                    <Target className="w-4 h-4 2xl:mr-2" />
                    <span className="sr-only 2xl:not-sr-only">Chances</span>
                  </Button>
                </Link>
                <Link href="/map">
                  <Button variant="outline" size="icon" className="sm:w-auto sm:px-3" data-testid="button-map-nav">
                    <Map className="w-4 h-4 2xl:mr-2" />
                    <span className="sr-only 2xl:not-sr-only">Map</span>
                  </Button>
                </Link>
                <Link href="/safe-and-strong">
                  <Button variant="outline" size="sm" data-testid="button-safe-and-strong-nav">
                    <Shield className="w-4 h-4 2xl:mr-2" />
                    <span className="sr-only 2xl:not-sr-only">Safe &amp; Strong</span>
                  </Button>
                </Link>
                <Link href="/favorites">
                  <Button variant="outline" size="icon" className="sm:w-auto sm:px-3" data-testid="button-favorites-nav">
                    <Heart className="w-4 h-4 2xl:mr-2" />
                    <span className="sr-only 2xl:not-sr-only">Favorites</span>
                  </Button>
                </Link>
                {isPremium && (
                  <Link href="/application-tracker">
                    <Button variant="outline" size="icon" className="sm:w-auto sm:px-3" data-testid="button-tracker-nav">
                      <ClipboardList className="w-4 h-4 2xl:mr-2" />
                      <span className="sr-only 2xl:not-sr-only">Tracker</span>
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
                      <span>Upgrade</span>
                    </Button>
                  </Link>
                )}
                <Link href="/settings">
                  <Button variant="outline" size="icon" className="sm:w-auto sm:px-3" data-testid="button-settings-nav">
                    <Settings className="w-4 h-4 2xl:mr-2" />
                    <span className="sr-only 2xl:not-sr-only">Settings</span>
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
                  <LogOut className="w-4 h-4 2xl:mr-2" />
                  <span className="sr-only 2xl:not-sr-only">Logout</span>
                </Button>
              </>
            ) : (
              <>
                <Link href="/recommendations">
                  <Button variant="outline" size="sm" data-testid="button-recommendations-nav" aria-label="Find My Match">
                    <Sparkles className="w-4 h-4 2xl:mr-2" />
                    <span className="sr-only 2xl:not-sr-only">Find My Match</span>
                  </Button>
                </Link>
                <Link href="/lottery-simulator">
                  <Button variant="outline" size="sm" data-testid="button-lottery-nav">
                    <Shuffle className="w-4 h-4 2xl:mr-2" />
                    <span className="sr-only 2xl:not-sr-only">Lottery</span>
                  </Button>
                </Link>
                <Link href="/chances-calculator">
                  <Button variant="outline" size="sm" data-testid="button-chances-nav">
                    <Target className="w-4 h-4 2xl:mr-2" />
                    <span className="sr-only 2xl:not-sr-only">Chances</span>
                  </Button>
                </Link>
                <Link href="/safe-and-strong">
                  <Button variant="outline" size="sm" data-testid="button-safe-and-strong-nav">
                    <Shield className="w-4 h-4 2xl:mr-2" />
                    <span className="sr-only 2xl:not-sr-only">Safe &amp; Strong</span>
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
