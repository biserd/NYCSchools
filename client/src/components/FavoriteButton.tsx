import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useFavoritesContext } from "@/contexts/FavoritesContext";
import { trackEvent } from "@/lib/analytics";

interface FavoriteButtonProps {
  schoolDbn: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function FavoriteButton({ 
  schoolDbn, 
  variant = "ghost", 
  size = "sm",
  showLabel = false 
}: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const favoritesContext = useFavoritesContext();
  const isFavoriteFromContext = favoritesContext?.isFavorite(schoolDbn);

  const { data: favoriteStatus } = useQuery<{ isFavorite: boolean }>({
    queryKey: ["/api/favorites/check", schoolDbn],
    enabled: isAuthenticated && !favoritesContext,
  });

  const currentIsFavorite = favoritesContext ? isFavoriteFromContext : favoriteStatus?.isFavorite;

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (currentIsFavorite) {
        await apiRequest("DELETE", `/api/favorites/${schoolDbn}`);
      } else {
        await apiRequest("POST", "/api/favorites", {
          schoolDbn,
        });
      }
    },
    onSuccess: () => {
      trackEvent("favorite_school", { school_dbn: schoolDbn, action: currentIsFavorite ? "remove" : "add" });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/check", schoolDbn] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/batch"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      if (favoritesContext) {
        favoritesContext.invalidateBatch();
      }
      toast({
        title: currentIsFavorite ? "Removed from favorites" : "Added to favorites",
        description: currentIsFavorite 
          ? "School removed from your favorites list"
          : "School added to your favorites list",
      });
    },
    onError: (error: unknown) => {
      const apiError = error as ApiError;
      
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Please log in",
          description: "You need to log in to save favorites",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
        return;
      }
      
      // Handle favorite limit error - show upgrade modal
      if (apiError?.code === "FAVORITE_LIMIT_REACHED" || (apiError?.status === 403 && !isUnauthorizedError(error as Error))) {
        setShowUpgradeModal(true);
        return;
      }
      
      toast({
        title: "Error",
        description: apiError?.message || "Failed to update favorite status",
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={(e) => {
          e.stopPropagation();
          window.location.href = "/login";
        }}
        data-testid={`button-favorite-login-${schoolDbn}`}
      >
        <Heart className="w-4 h-4" />
        {showLabel && <span className="ml-2">Login to Save</span>}
      </Button>
    );
  }

  const isFavorite = currentIsFavorite ?? false;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite.mutate();
        }}
        disabled={toggleFavorite.isPending}
        data-testid={`button-favorite-${schoolDbn}`}
      >
        <Heart 
          className={`w-4 h-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
          data-testid={`icon-favorite-${schoolDbn}`}
        />
        {showLabel && <span className="ml-2">{isFavorite ? "Saved" : "Save"}</span>}
      </Button>
      
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        trigger="favorites_limit"
      />
    </>
  );
}
