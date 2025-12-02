import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ZonedSchoolBadgeProps {
  schoolDbn: string;
  gradeLevel: "elementary" | "middle" | "high" | "combined";
}

interface UserZones {
  elementary: string | null;
  middle: string | null;
  high: string | null;
}

export function ZonedSchoolBadge({ schoolDbn, gradeLevel }: ZonedSchoolBadgeProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: userZones } = useQuery<UserZones>({
    queryKey: ["/api/user-zones"],
    enabled: !authLoading && isAuthenticated,
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  if (!isAuthenticated || !userZones) {
    return null;
  }

  let isZonedSchool = false;
  let zoneType = "";

  if (gradeLevel === "elementary" && userZones.elementary === schoolDbn) {
    isZonedSchool = true;
    zoneType = "elementary";
  } else if (gradeLevel === "middle" && userZones.middle === schoolDbn) {
    isZonedSchool = true;
    zoneType = "middle school";
  } else if (gradeLevel === "high" && userZones.high === schoolDbn) {
    isZonedSchool = true;
    zoneType = "high school";
  } else if (gradeLevel === "combined") {
    if (userZones.elementary === schoolDbn) {
      isZonedSchool = true;
      zoneType = "elementary";
    } else if (userZones.middle === schoolDbn) {
      isZonedSchool = true;
      zoneType = "middle school";
    }
  }

  if (!isZonedSchool) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Badge 
            variant="secondary" 
            className="bg-primary/10 text-primary border-primary/20"
            data-testid="badge-zoned-school"
          >
            <Home className="h-3 w-3 mr-1" />
            Your Zoned School
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm font-medium mb-1">Your Zoned School</p>
        <p className="text-sm">
          Based on your home address, this appears to be your designated {zoneType} school 
          according to NYC DOE official school zone boundaries. Verify with your local 
          school district for confirmation.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Source: NYC DOE School Zones 2024-2025 via NYC Open Data
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
