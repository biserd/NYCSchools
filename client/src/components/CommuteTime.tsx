import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

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
  const { isAuthenticated } = useAuth();

  const { data: commuteData, isLoading } = useQuery<CommuteData>({
    queryKey: ["/api/commute", schoolDbn],
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 10,
  });

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
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

  if (commuteData?.error || !commuteData?.commuteTime) {
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
