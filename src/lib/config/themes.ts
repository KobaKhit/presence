import type { PresenceConfig, PresenceTheme, PresenceThemeConfig, PresenceThemePalette } from "./types";

export const BUILTIN_THEME_PRESETS: PresenceThemeConfig["presets"] = {
  lab: {
    label: "Editorial lab",
    accent: "#0f766e",
    accentBright: "#14b8a6",
    ink: "#0d1b2a",
    muted: "#5c6b7a",
    paper: "#eef1f5",
    paperDeep: "#e2e7ee",
    accentWarm: "#c45c26",
  },
  midnight: {
    label: "Midnight agentic",
    accent: "#38bdf8",
    accentBright: "#7dd3fc",
    ink: "#e2e8f0",
    muted: "#94a3b8",
    paper: "#0b1220",
    paperDeep: "#111827",
    accentWarm: "#f472b6",
  },
  minimal: {
    label: "Minimal professional",
    accent: "#2563eb",
    accentBright: "#3b82f6",
    ink: "#111827",
    muted: "#6b7280",
    paper: "#fafafa",
    paperDeep: "#f3f4f6",
    accentWarm: "#d97706",
  },
};

function isLegacyTheme(theme: PresenceConfig["theme"]): theme is PresenceTheme {
  return theme != null && !("presets" in theme) && "accent" in theme;
}

export function resolveThemeConfig(config: PresenceConfig): PresenceThemeConfig {
  if (!isLegacyTheme(config.theme)) {
    return {
      defaultTheme: config.theme.defaultTheme || Object.keys(config.theme.presets)[0] || "lab",
      presets: { ...BUILTIN_THEME_PRESETS, ...config.theme.presets },
    };
  }
  return {
    defaultTheme: "lab",
    presets: {
      ...BUILTIN_THEME_PRESETS,
      lab: { ...BUILTIN_THEME_PRESETS.lab, ...config.theme, label: "Editorial lab" },
    },
  };
}

export function getThemePalette(
  config: PresenceConfig,
  themeId?: string | null,
): PresenceThemePalette & { id: string; label: string } {
  const resolved = resolveThemeConfig(config);
  const id =
    (themeId && resolved.presets[themeId] ? themeId : null) ||
    resolved.defaultTheme ||
    "lab";
  const preset = resolved.presets[id] ?? BUILTIN_THEME_PRESETS.lab;
  return { id, ...preset };
}

export function themeToCssVars(palette: PresenceThemePalette): Record<string, string> {
  return {
    "--paper": palette.paper,
    "--paper-deep": palette.paperDeep ?? palette.paper,
    "--ink": palette.ink,
    "--ink-soft": palette.ink,
    "--muted": palette.muted,
    "--accent": palette.accent,
    "--accent-bright": palette.accentBright,
    "--accent-warm": palette.accentWarm ?? "#c45c26",
  };
}
