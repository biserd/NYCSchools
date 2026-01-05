import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface CommuteData {
  commuteTime: string | null;
  commuteMinutes: number | null;
  distance: string | null;
  distanceMeters: number | null;
  error?: string;
}

interface CommutesBatchResponse {
  commutes: Record<string, CommuteData>;
}

interface UserProfile {
  homeAddress: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function useCommuteBatch(dbns: string[]) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
    enabled: !authLoading && isAuthenticated,
    staleTime: 1000 * 60 * 5,
    retry: 1, // Allow one retry for transient failures
  });

  const coordinates = profile?.latitude && profile?.longitude 
    ? { lat: profile.latitude, lng: profile.longitude }
    : null;

  const dbnsKey = dbns.sort().join(",");
  
  const { data, isLoading, refetch } = useQuery<CommutesBatchResponse>({
    queryKey: ["/api/commute/batch", dbnsKey, coordinates?.lat, coordinates?.lng],
    queryFn: async () => {
      if (!dbns.length || !coordinates) return { commutes: {} };
      const response = await fetch(
        `/api/commute/batch?dbns=${encodeURIComponent(dbnsKey)}&lat=${coordinates.lat}&lng=${coordinates.lng}`
      );
      if (!response.ok) {
        if (response.status === 403) {
          return { commutes: {} };
        }
        throw new Error("Failed to fetch commutes");
      }
      return response.json();
    },
    enabled: isAuthenticated && !authLoading && !profileLoading && dbns.length > 0 && !!coordinates,
    staleTime: 1000 * 60 * 30,
    retry: 2, // Allow retries for transient Google API failures
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const getCommute = (dbn: string): CommuteData | null => {
    return data?.commutes?.[dbn] ?? null;
  };

  return {
    commutes: data?.commutes ?? {},
    getCommute,
    isLoading: authLoading || profileLoading || isLoading,
    hasCoordinates: !!coordinates,
    isAuthenticated,
    refetch, // Expose for manual retry after failures
  };
}
