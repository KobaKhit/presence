import config from "../../../content/presence.config";
import type { PresenceConfig } from "./types";

export type { PresenceConfig } from "./types";
export {
  BUILTIN_THEME_PRESETS,
  getThemePalette,
  resolveThemeConfig,
  themeToCssVars,
} from "./themes";

export function getPresenceConfig(): PresenceConfig {
  return config;
}
