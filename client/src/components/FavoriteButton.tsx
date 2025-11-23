import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

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

  const { data: favoriteStatus } = useQuery<{ isFavorite: boolean }>({
    queryKey: ["/api/favorites/check", schoolDbn],
    enabled: isAuthenticated,
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (favoriteStatus?.isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${schoolDbn}`);
      } else {
        await apiRequest("POST", "/api/favorites", {
          schoolDbn,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/check", schoolDbn] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: favoriteStatus?.isFavorite ? "Removed from favorites" : "Added to favorites",
        description: favoriteStatus?.isFavorite 
          ? "School removed from your favorites list"
          : "School added to your favorites list",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Please log in",
          description: "You need to log in to save favorites",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update favorite status",
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
          window.location.href = "/api/login";
        }}
        data-testid={`button-favorite-login-${schoolDbn}`}
      >
        <Heart className="w-4 h-4" />
        {showLabel && <span className="ml-2">Login to Save</span>}
      </Button>
    );
  }

  const isFavorite = favoriteStatus?.isFavorite ?? false;

  return (
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
  );
}
