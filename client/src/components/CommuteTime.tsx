import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

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
}

interface UserProfile {
  homeAddress: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function CommuteTime({ schoolDbn, compact = false }: CommuteTimeProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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

  // For unauthenticated users - show sign up prompt
  if (!authLoading && !isAuthenticated) {
    return compact ? (
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <LogIn className="h-3 w-3" />
            <span>Sign up</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Sign up to see commute times from your home</p>
        </TooltipContent>
      </Tooltip>
    ) : (
      <div className="flex items-center gap-2" data-testid="commute-signup-prompt">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Sign up to see commute times
        </span>
        <Link href="/auth">
          <Button variant="outline" size="sm" data-testid="button-signup-commute">
            <LogIn className="h-3 w-3 mr-1" />
            Sign Up
          </Button>
        </Link>
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
