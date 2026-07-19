import type { ZodType } from "zod";

export interface PresenceModule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  /** Relative app routes this module owns (for docs / discovery). */
  routes: string[];
  schemas?: Record<string, ZodType>;
  mcpTools?: string[];
  agentTools?: string[];
  skillPath?: string;
}

export type ModuleRegistry = Record<string, PresenceModule>;
