import { createContext, useContext, useMemo, useCallback, useRef, useEffect } from "react";
import { useFavoritesBatch } from "@/hooks/useFavoritesBatch";
import { useAuth } from "@/hooks/useAuth";

interface FavoritesContextType {
  isFavorite: (dbn: string) => boolean;
  isLoading: boolean;
  invalidateBatch: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

interface FavoritesProviderProps {
  dbns: string[];
  children: React.ReactNode;
}

export function FavoritesProvider({ dbns, children }: FavoritesProviderProps) {
  const { isAuthenticated } = useAuth();
  const { favorites, isLoading, invalidateBatch } = useFavoritesBatch(dbns);

  // Use ref to always have latest favorites data for isFavorite callback
  const favoritesRef = useRef(favorites);
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  // Stable isFavorite callback that always reads from latest ref
  const isFavorite = useCallback((dbn: string): boolean => {
    if (!isAuthenticated) return false;
    return favoritesRef.current[dbn] ?? false;
  }, [isAuthenticated]);

  const value = useMemo(() => ({
    isFavorite,
    isLoading,
    invalidateBatch,
  }), [isFavorite, isLoading, invalidateBatch]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext() {
  return useContext(FavoritesContext);
}
