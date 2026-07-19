import config from "../../../content/presence.config";
import type { PresenceConfig } from "./types";

export type { PresenceConfig } from "./types";

export function getPresenceConfig(): PresenceConfig {
  return config;
}
