import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

interface FavoritesBatchResponse {
  favorites: Record<string, boolean>;
}

export function useFavoritesBatch(dbns: string[]) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const dbnsKey = dbns.sort().join(",");
  
  const { data, isLoading } = useQuery<FavoritesBatchResponse>({
    queryKey: ["/api/favorites/batch", dbnsKey],
    queryFn: async () => {
      if (!dbns.length) return { favorites: {} };
      const response = await fetch(`/api/favorites/batch?dbns=${encodeURIComponent(dbnsKey)}`);
      if (!response.ok) throw new Error("Failed to fetch favorites");
      return response.json();
    },
    enabled: isAuthenticated && dbns.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const isFavorite = (dbn: string): boolean => {
    return data?.favorites?.[dbn] ?? false;
  };

  const invalidateBatch = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/favorites/batch"] });
    queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
  };

  return {
    favorites: data?.favorites ?? {},
    isFavorite,
    isLoading,
    invalidateBatch,
  };
}

export function useFavoriteToggle(schoolDbn: string, currentIsFavorite: boolean) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (currentIsFavorite) {
        await apiRequest("DELETE", `/api/favorites/${schoolDbn}`);
      } else {
        await apiRequest("POST", "/api/favorites", { schoolDbn });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/batch"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/check", schoolDbn] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });
}
