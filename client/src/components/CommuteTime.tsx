import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin, LogIn, Star, Loader2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCheckout } from "@/hooks/useCheckout";
import { UpgradeModal } from "@/components/UpgradeModal";

interface CommuteTimeProps {
  schoolDbn: string;
  compact?: boolean;
}

interface CommuteData {
  commuteTime: string | null;
  commuteMinutes: number | null;
  distance: string | null;
  distanceMeters: number | null;
  error?: string;
  premiumRequired?: boolean;
}

interface UserProfile {
  homeAddress: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function CommuteTime({ schoolDbn, compact = false }: CommuteTimeProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { startCheckout, isLoading: checkoutLoading } = useCheckout();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch user profile (address) from database - only for authenticated users
  // Wait for auth check to complete before fetching profile
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
    enabled: !authLoading && isAuthenticated,
    staleTime: 1000 * 60 * 5, // Cache profile for 5 minutes
    retry: false, // Don't retry on 401
  });

  const coordinates = profile?.latitude && profile?.longitude 
    ? { lat: profile.latitude, lng: profile.longitude }
    : null;

  // Fetch commute data - only when authenticated and has coordinates
  // Wait for both auth check and profile to be resolved
  const { data: commuteData, isLoading, isError } = useQuery<CommuteData>({
    queryKey: ["/api/commute", schoolDbn, coordinates?.lat, coordinates?.lng],
    queryFn: async () => {
      if (!coordinates) {
        return { commuteTime: null, commuteMinutes: null, distance: null, distanceMeters: null, error: "No home address set" };
      }
      try {
        const response = await fetch(`/api/commute/${schoolDbn}?lat=${coordinates.lat}&lng=${coordinates.lng}`);
        if (!response.ok) {
          // Check if this is a premium required error
          if (response.status === 403) {
            return { commuteTime: null, commuteMinutes: null, distance: null, distanceMeters: null, premiumRequired: true };
          }
          return { commuteTime: null, commuteMinutes: null, distance: null, distanceMeters: null, error: "Failed to fetch commute time" };
        }
        return response.json();
      } catch (error) {
        return { commuteTime: null, commuteMinutes: null, distance: null, distanceMeters: null, error: "Network error" };
      }
    },
    enabled: !authLoading && isAuthenticated && !!coordinates,
    staleTime: 1000 * 60 * 30,
    retry: false, // Don't retry on errors
  });

  // For unauthenticated users - show sign up prompt with prominent styling
  if (!authLoading && !isAuthenticated) {
    return compact ? (
      <div 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
        }}
      >
        <Badge 
          variant="secondary" 
          className="flex items-center gap-1 bg-primary/10 text-primary border-primary/20 hover-elevate cursor-pointer"
        >
          <LogIn className="h-3 w-3" />
          <span>Sign up for commute</span>
        </Badge>
      </div>
    ) : (
      <div 
        className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20" 
        data-testid="commute-signup-prompt"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center justify-center h-8 w-8 shrink-0 rounded-full bg-primary/10">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              See commute times from your home
            </p>
            <p className="text-xs text-muted-foreground">
              Sign up to calculate transit times to this school
            </p>
          </div>
        </div>
        <a href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="w-full sm:w-auto">
          <Button size="sm" className="w-full sm:w-auto" data-testid="button-signup-commute">
            <LogIn className="h-3 w-3 mr-1" />
            Sign Up Free
          </Button>
        </a>
      </div>
    );
  }

  // Loading state while checking auth or profile
  if (authLoading || profileLoading) {
    return compact ? null : (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  // Authenticated but loading commute data
  if (isLoading && coordinates) {
    return compact ? (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Loading...</span>
      </div>
    ) : (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Calculating commute...</span>
      </div>
    );
  }

  // Authenticated but no address set
  if (!coordinates) {
    return compact ? (
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>Set address</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Set your home address in Settings to see commute times</p>
        </TooltipContent>
      </Tooltip>
    ) : (
      <div className="flex items-center gap-2" data-testid="commute-set-address">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Set your home address to see commute times
        </span>
        <Link href="/settings">
          <Button variant="outline" size="sm" data-testid="button-go-to-settings">
            Go to Settings
          </Button>
        </Link>
      </div>
    );
  }

  // Premium required - show upgrade CTA
  if (commuteData?.premiumRequired) {
    return compact ? (
      <>
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowUpgradeModal(true);
          }}
        >
          <Badge 
            variant="secondary" 
            className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover-elevate cursor-pointer"
          >
            <Zap className="h-3 w-3" />
            <span>Premium</span>
          </Badge>
        </div>
        <UpgradeModal 
          open={showUpgradeModal} 
          onOpenChange={setShowUpgradeModal}
          trigger="commute_locked"
        />
      </>
    ) : (
      <>
        <div 
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700" 
          data-testid="commute-premium-prompt"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center h-8 w-8 shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Commute Calculator
              </p>
              <p className="text-xs text-muted-foreground">
                Upgrade to Premium to see transit times from your home
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="w-full sm:w-auto" 
            onClick={() => setShowUpgradeModal(true)}
            data-testid="button-upgrade-commute"
          >
            <Zap className="h-3 w-3 mr-1" />
            Unlock
          </Button>
        </div>
        <UpgradeModal 
          open={showUpgradeModal} 
          onOpenChange={setShowUpgradeModal}
          trigger="commute_locked"
        />
      </>
    );
  }

  if (isError || commuteData?.error || !commuteData?.commuteTime) {
    return compact ? (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>N/A</span>
      </div>
    ) : (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Transit route not available</span>
      </div>
    );
  }

  const getCommuteColor = (minutes: number | null) => {
    if (!minutes) return "default";
    if (minutes <= 20) return "default";
    if (minutes <= 40) return "secondary";
    return "destructive";
  };

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge 
            variant={getCommuteColor(commuteData.commuteMinutes)}
            className="flex items-center gap-1"
            data-testid="badge-commute-time"
          >
            <Clock className="h-3 w-3" />
            {commuteData.commuteTime}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Public transit commute from your home</p>
          <p className="text-xs text-muted-foreground">Distance: {commuteData.distance}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-2" data-testid="container-commute-time">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={getCommuteColor(commuteData.commuteMinutes)}
            data-testid="badge-commute-time"
          >
            {commuteData.commuteTime}
          </Badge>
          <span className="text-sm text-muted-foreground">via public transit</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1" data-testid="text-commute-distance">
          Distance: {commuteData.distance}
        </p>
      </div>
    </div>
  );
}
