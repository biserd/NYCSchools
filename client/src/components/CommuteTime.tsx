import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { getStoredAddress } from "@/lib/addressStorage";

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

export function CommuteTime({ schoolDbn, compact = false }: CommuteTimeProps) {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(() => {
    const stored = getStoredAddress();
    return stored ? { lat: stored.latitude, lng: stored.longitude } : null;
  });

  useEffect(() => {
    const updateCoordinates = () => {
      const stored = getStoredAddress();
      if (stored) {
        setCoordinates({ lat: stored.latitude, lng: stored.longitude });
      } else {
        setCoordinates(null);
      }
    };

    window.addEventListener('addressChanged', updateCoordinates);
    return () => window.removeEventListener('addressChanged', updateCoordinates);
  }, []);

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
    enabled: !!coordinates,
    staleTime: 1000 * 60 * 30,
    retry: 1,
    retryDelay: 1000,
  });

  if (!coordinates && isLoading) {
    return null;
  }

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

  if (commuteData?.error === "No home address set") {
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
