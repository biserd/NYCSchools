import { createContext, useContext, useMemo } from "react";
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
  const { isFavorite, isLoading, invalidateBatch } = useFavoritesBatch(dbns);

  const value = useMemo(() => ({
    isFavorite: isAuthenticated ? isFavorite : () => false,
    isLoading,
    invalidateBatch,
  }), [isFavorite, isLoading, invalidateBatch, isAuthenticated]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext() {
  return useContext(FavoritesContext);
}
