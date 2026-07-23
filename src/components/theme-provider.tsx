"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "presence-theme";
const AUTO_NAV_KEY = "presence-auto-navigate";

export interface ThemePresetInfo {
  id: string;
  label: string;
  accent: string;
  accentBright: string;
  ink: string;
  muted: string;
  paper: string;
  paperDeep?: string;
  accentWarm?: string;
}

interface ThemeContextValue {
  themeId: string;
  setThemeId: (id: string) => void;
  presets: ThemePresetInfo[];
  autoNavigate: boolean;
  setAutoNavigate: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeVars(preset: ThemePresetInfo) {
  const root = document.documentElement;
  root.dataset.theme = preset.id;
  root.style.setProperty("--paper", preset.paper);
  root.style.setProperty("--paper-deep", preset.paperDeep ?? preset.paper);
  root.style.setProperty("--ink", preset.ink);
  root.style.setProperty("--ink-soft", preset.ink);
  root.style.setProperty("--muted", preset.muted);
  root.style.setProperty("--accent", preset.accent);
  root.style.setProperty("--accent-bright", preset.accentBright);
  root.style.setProperty("--accent-warm", preset.accentWarm ?? "#c45c26");
  // Surface/line derive from ink for dark themes
  const isDark = luminance(preset.paper) < 0.35;
  root.style.setProperty(
    "--surface",
    isDark ? "rgba(15, 23, 42, 0.72)" : "rgba(255, 255, 255, 0.72)",
  );
  root.style.setProperty(
    "--line",
    isDark ? "rgba(226, 232, 240, 0.12)" : "rgba(13, 27, 42, 0.1)",
  );
  root.style.setProperty(
    "--shadow",
    isDark
      ? "0 18px 50px rgba(0, 0, 0, 0.45)"
      : "0 18px 50px rgba(13, 27, 42, 0.08)",
  );
}

function luminance(hex: string): number {
  const c = hex.replace("#", "");
  if (c.length < 6) return 1;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ThemeProvider({
  defaultTheme,
  presets,
  children,
}: {
  defaultTheme: string;
  presets: ThemePresetInfo[];
  children: ReactNode;
}) {
  const [themeId, setThemeIdState] = useState(defaultTheme);
  const [autoNavigate, setAutoNavigateState] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && presets.some((p) => p.id === stored)) {
        setThemeIdState(stored);
      }
      const nav = localStorage.getItem(AUTO_NAV_KEY);
      if (nav === "1") setAutoNavigateState(true);
    } catch {
      /* ignore */
    }
  }, [presets]);

  useEffect(() => {
    const preset = presets.find((p) => p.id === themeId) ?? presets[0];
    if (preset) applyThemeVars(preset);
  }, [themeId, presets]);

  const setThemeId = useCallback(
    (id: string) => {
      if (!presets.some((p) => p.id === id)) return;
      setThemeIdState(id);
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {
        /* ignore */
      }
    },
    [presets],
  );

  const setAutoNavigate = useCallback((value: boolean) => {
    setAutoNavigateState(value);
    try {
      localStorage.setItem(AUTO_NAV_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ themeId, setThemeId, presets, autoNavigate, setAutoNavigate }),
    [themeId, setThemeId, presets, autoNavigate, setAutoNavigate],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
