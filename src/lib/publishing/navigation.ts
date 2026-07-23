import { getPresenceConfig } from "@/lib/config";

export interface NavigationAction {
  href: string;
  label: string;
  reason?: string;
  confidence?: "high" | "medium" | "low";
  /** true when the user explicitly asked to go somewhere */
  explicit?: boolean;
}

const STATIC_ALLOWLIST = new Set([
  "/",
  "/docs",
  "/deploy",
  "/setup",
  "/openapi.json",
  "/llms.txt",
]);

/**
 * Build the set of navigable internal paths from enabled modules.
 * Chat must never propose arbitrary external URLs.
 */
export function getAllowedNavigationPrefixes(): string[] {
  const config = getPresenceConfig();
  const prefixes: string[] = ["/", "/docs", "/deploy", "/setup"];
  if (config.modules.blog) prefixes.push("/blog");
  if (config.modules.projects) {
    prefixes.push("/projects", "/visuals");
  }
  if (config.modules.wiki) prefixes.push("/wiki");
  if (config.modules.resume) prefixes.push("/resume");
  if (config.modules.search) prefixes.push("/api/v1/search");
  return prefixes;
}

export function isAllowedNavigationHref(href: string): boolean {
  if (!href.startsWith("/")) return false;
  if (href.startsWith("//")) return false;
  if (href.includes("://")) return false;
  if (href.includes("\\") || href.includes("..")) return false;

  const pathOnly = href.split("?")[0].split("#")[0];
  if (STATIC_ALLOWLIST.has(pathOnly)) return true;

  const prefixes = getAllowedNavigationPrefixes();
  return prefixes.some(
    (p) => pathOnly === p || pathOnly.startsWith(`${p}/`) || (p === "/" && pathOnly === "/"),
  );
}

export function sanitizeNavigationAction(
  raw: Partial<NavigationAction> | null | undefined,
): NavigationAction | null {
  if (!raw?.href || !raw.label) return null;
  const href = raw.href.trim();
  if (!isAllowedNavigationHref(href)) return null;
  return {
    href,
    label: String(raw.label).slice(0, 80),
    reason: raw.reason ? String(raw.reason).slice(0, 200) : undefined,
    confidence: raw.confidence === "high" || raw.confidence === "low" ? raw.confidence : "medium",
    explicit: Boolean(raw.explicit),
  };
}

/** Heuristic: user explicitly asked to navigate. */
export function looksLikeExplicitNavigation(message: string): boolean {
  return /\b(take me to|go to|open|navigate to|show me the|bring me to)\b/i.test(
    message.trim(),
  );
}
