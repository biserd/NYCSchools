import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProximityBadgeProps {
  schoolLat: number | null;
  schoolLng: number | null;
  userLat: number | null;
  userLng: number | null;
}

function calculateDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function ProximityBadge({ schoolLat, schoolLng, userLat, userLng }: ProximityBadgeProps) {
  if (!userLat || !userLng || !schoolLat || !schoolLng) {
    return null;
  }

  const distance = calculateDistanceMiles(
    userLat,
    userLng,
    schoolLat,
    schoolLng
  );

  if (distance <= 0.5) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Badge 
              variant="secondary" 
              className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
              data-testid="badge-walkable"
            >
              <MapPin className="h-3 w-3 mr-1" />
              Walkable ({distance.toFixed(2)} mi)
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>This school is within walking distance of your home ({distance.toFixed(2)} miles)</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (distance <= 1.0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Badge 
              variant="secondary" 
              className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
              data-testid="badge-nearby"
            >
              <MapPin className="h-3 w-3 mr-1" />
              Nearby ({distance.toFixed(2)} mi)
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>This school is close to your home ({distance.toFixed(2)} miles)</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return null;
}
