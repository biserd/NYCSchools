import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { School } from "@shared/schema";

interface ComparisonContextType {
  comparedSchools: School[];
  addToComparison: (school: School) => void;
  removeFromComparison: (dbn: string) => void;
  clearComparison: () => void;
  isInComparison: (dbn: string) => boolean;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

const MAX_COMPARE = 4;

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

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem("comparedSchools", JSON.stringify(comparedSchools));
    } catch (error) {
      console.error('Failed to save comparison state to localStorage:', error);
    }
  }, [comparedSchools]);

  const addToComparison = (school: School) => {
    if (comparedSchools.length >= MAX_COMPARE) {
      console.warn(`Cannot add more than ${MAX_COMPARE} schools to comparison`);
      return;
    }
    if (!comparedSchools.find(s => s.dbn === school.dbn)) {
      setComparedSchools([...comparedSchools, school]);
    }
  };

  const removeFromComparison = (dbn: string) => {
    setComparedSchools(comparedSchools.filter(s => s.dbn !== dbn));
  };

  const clearComparison = () => {
    setComparedSchools([]);
  };

  const isInComparison = (dbn: string) => {
    return comparedSchools.some(s => s.dbn === dbn);
  };

  return (
    <ComparisonContext.Provider
      value={{
        comparedSchools,
        addToComparison,
        removeFromComparison,
        clearComparison,
        isInComparison,
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
