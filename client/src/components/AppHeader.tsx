import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { 
  LogIn, 
  LogOut, 
  Heart, 
  Sparkles, 
  Map, 
  Settings, 
  MessageCircle,
  Home,
  Shuffle,
  Gift,
  Zap,
  Star
} from "lucide-react";

interface AppHeaderProps {
  showAIButton?: boolean;
}

export function AppHeader({ showAIButton = true }: AppHeaderProps) {
  const { user, isAuthenticated } = useAuth();

  // Check subscription status - wait for query to complete before showing upgrade button
  const { data: subscription, isFetched: subscriptionFetched } = useQuery<{
    status: string;
    plan: string;
  }>({
    queryKey: ["/api/subscription"],
    enabled: isAuthenticated,
  });

  const isPremium = subscription?.status === "active" && subscription?.plan === "premium";
  // Only show upgrade button after subscription query completes and user is NOT premium
  const showUpgradeButton = isAuthenticated && subscriptionFetched && !isPremium;

  return (
    <header className="bg-background border-b" data-testid="header-main">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link href="/">
            <div className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
              <Home className="w-5 h-5 text-primary" />
              <h1 className="text-xl md:text-2xl font-bold" data-testid="text-site-title">
                NYC School Ratings
              </h1>
            </div>
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            {showAIButton && (
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
            )}
            <Link href="/recommendations">
              <Button
                variant="outline"
                size="sm"
                data-testid="button-recommendations-nav"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Find My Match</span>
                <span className="sm:hidden">Match</span>
              </Button>
            </Link>
            <Link href="/lottery-simulator">
              <Button
                variant="outline"
                size="sm"
                data-testid="button-lottery-nav"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Lottery Simulator</span>
                <span className="sm:hidden">Lottery</span>
              </Button>
            </Link>
            <Link href="/map">
              <Button
                variant="outline"
                size="icon"
                className="sm:w-auto sm:px-3"
                data-testid="button-map-nav"
              >
                <Map className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Map</span>
              </Button>
            </Link>
            {isAuthenticated && user && (
              <Link href="/settings">
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:w-auto sm:px-3"
                  data-testid="button-settings-nav"
                >
                  <Settings className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </Link>
            )}
            {isAuthenticated && user && (
              <Link href="/favorites">
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:w-auto sm:px-3"
                  data-testid="button-favorites-nav"
                >
                  <Heart className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Favorites</span>
                </Button>
              </Link>
            )}
            {/* Only show premium badge or upgrade button after subscription query completes */}
            {isAuthenticated && user && subscriptionFetched && isPremium && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-medium">
                <Star className="w-3 h-3" />
                <span className="hidden sm:inline">Premium</span>
              </div>
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
            {isAuthenticated ? (
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
            ) : (
              <>
                <Link href="/benefits">
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-benefits-nav"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Why Register?</span>
                    <span className="sm:hidden">Benefits</span>
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="default"
                    size="icon"
                    className="sm:w-auto sm:px-3"
                    data-testid="button-login"
                  >
                    <LogIn className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Login</span>
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
