import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getStoredTheme(): Theme {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return "light";
  }
  try {
    const stored = localStorage.getItem("theme");
    return (stored as Theme) || "light";
  } catch {
    return "light";
  }
}

function storeTheme(theme: Theme) {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem("theme", theme);
  } catch {
    console.warn("Failed to save theme to localStorage");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    if (typeof document === "undefined") return;
    
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    storeTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
