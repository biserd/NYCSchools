import { createContext, useContext, useMemo } from "react";
import { useCommuteBatch } from "@/hooks/useCommuteBatch";

interface CommuteData {
  commuteTime: string | null;
  commuteMinutes: number | null;
  distance: string | null;
  distanceMeters: number | null;
  error?: string;
}

interface CommuteContextType {
  getCommute: (dbn: string) => CommuteData | null;
  isLoading: boolean;
  hasCoordinates: boolean;
  isAuthenticated: boolean;
}

const CommuteContext = createContext<CommuteContextType | null>(null);

interface CommuteProviderProps {
  dbns: string[];
  children: React.ReactNode;
}

export function CommuteProvider({ dbns, children }: CommuteProviderProps) {
  const { getCommute, isLoading, hasCoordinates, isAuthenticated } = useCommuteBatch(dbns);

  const value = useMemo(() => ({
    getCommute,
    isLoading,
    hasCoordinates,
    isAuthenticated,
  }), [getCommute, isLoading, hasCoordinates, isAuthenticated]);

  return (
    <CommuteContext.Provider value={value}>
      {children}
    </CommuteContext.Provider>
  );
}

export function useCommuteContext() {
  return useContext(CommuteContext);
}
