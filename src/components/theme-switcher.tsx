"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeSwitcher() {
  const { themeId, setThemeId, presets } = useTheme();

  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      <span className="sr-only">Theme</span>
      <select
        value={themeId}
        onChange={(e) => setThemeId(e.target.value)}
        aria-label="Site theme"
        className="max-w-[9.5rem] cursor-pointer rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-soft outline-none transition hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent"
      >
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}
