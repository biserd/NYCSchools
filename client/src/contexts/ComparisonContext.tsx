import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { School } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

// Premium tier limits
const FREE_MAX_COMPARE = 2;
const PREMIUM_MAX_COMPARE = 4;

interface ComparisonContextType {
  comparedSchools: School[];
  addToComparison: (school: School) => { success: boolean; error?: string };
  removeFromComparison: (dbn: string) => void;
  clearComparison: () => void;
  setComparedSchools: (schools: School[]) => void;
  isInComparison: (dbn: string) => boolean;
  maxCompare: number;
  isPremium: boolean;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [comparedSchools, setComparedSchools] = useState<School[]>(() => {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const saved = localStorage.getItem("comparedSchools");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load comparison state from localStorage:', error);
      return [];
    }
  });

  // Check subscription status
  const { data: subscriptionData } = useQuery<{ isSubscribed: boolean }>({
    queryKey: ["/api/subscription-status"],
    retry: false,
    staleTime: 60000, // Cache for 1 minute
  });

  const isPremium = subscriptionData?.isSubscribed ?? false;
  const maxCompare = isPremium ? PREMIUM_MAX_COMPARE : FREE_MAX_COMPARE;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem("comparedSchools", JSON.stringify(comparedSchools));
    } catch (error) {
      console.error('Failed to save comparison state to localStorage:', error);
    }
  }, [comparedSchools]);

  const addToComparison = useCallback((school: School): { success: boolean; error?: string } => {
    if (comparedSchools.length >= maxCompare) {
      const message = isPremium 
        ? `Cannot add more than ${PREMIUM_MAX_COMPARE} schools to comparison`
        : `Free accounts can compare up to ${FREE_MAX_COMPARE} schools. The Enrollment Season Pass increases the limit to ${PREMIUM_MAX_COMPARE}.`;
      return { success: false, error: message };
    }
    if (comparedSchools.find(s => s.dbn === school.dbn)) {
      return { success: false, error: "School is already in comparison" };
    }
    setComparedSchools(prev => [...prev, school]);
    return { success: true };
  }, [comparedSchools, maxCompare, isPremium]);

  const removeFromComparison = useCallback((dbn: string) => {
    setComparedSchools(prev => prev.filter(s => s.dbn !== dbn));
  }, []);

  const clearComparison = useCallback(() => {
    setComparedSchools([]);
  }, []);

  const setSchools = useCallback((schools: School[]) => {
    setComparedSchools(schools.slice(0, maxCompare));
  }, [maxCompare]);

  const isInComparison = useCallback((dbn: string) => {
    return comparedSchools.some(s => s.dbn === dbn);
  }, [comparedSchools]);

  return (
    <ComparisonContext.Provider
      value={{
        comparedSchools,
        addToComparison,
        removeFromComparison,
        clearComparison,
        setComparedSchools: setSchools,
        isInComparison,
        maxCompare,
        isPremium,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error("useComparison must be used within ComparisonProvider");
  }
  return context;
}
