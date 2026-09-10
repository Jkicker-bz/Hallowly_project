// ---------------------------------------------------------------------------
// Owns the two things the brand spec calls "the atmosphere of the
// platform": mode (dark/light) and accent (the Personal Hallow selection).
// Applies them as data-attributes on <html> so tokens.css's selectors
// pick them up everywhere, no per-component theming logic needed.
// Persisted to localStorage — this is real app state on a device the
// person owns, not a Claude-artifact preview, so that's the right tool here.
// ---------------------------------------------------------------------------

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "dark" | "light";
export type Accent = "amethyst" | "lumen" | "bronze" | "flow";

interface ThemeContextValue {
  mode: ThemeMode;
  accent: Accent;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: Accent) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "hallowly:theme-prefs";

function loadPrefs(): { mode: ThemeMode; accent: Accent } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore malformed/blocked storage, fall through to default
  }
  return { mode: "dark", accent: "amethyst" };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initial = loadPrefs();
  const [mode, setMode] = useState<ThemeMode>(initial.mode);
  const [accent, setAccent] = useState<Accent>(initial.accent);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    document.documentElement.setAttribute("data-accent", accent);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, accent }));
    } catch {
      // storage unavailable (private browsing, etc.) — theme still works
      // for this session, it just won't persist across reloads.
    }
  }, [mode, accent]);

  return (
    <ThemeContext.Provider value={{ mode, accent, setMode, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
