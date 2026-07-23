export interface PresenceSocial {
  github?: string;
  twitter?: string;
  linkedin?: string;
  [key: string]: string | undefined;
}

/** Single palette applied as CSS variables. */
export interface PresenceThemePalette {
  accent: string;
  accentBright: string;
  ink: string;
  muted: string;
  paper: string;
  paperDeep?: string;
  accentWarm?: string;
}

/**
 * Named theme presets visitors can toggle.
 * `defaultTheme` selects the initial preset id.
 */
export interface PresenceThemeConfig {
  defaultTheme: string;
  presets: Record<string, PresenceThemePalette & { label: string }>;
}

/** @deprecated flat theme — still accepted and mapped to a single "default" preset */
export type PresenceTheme = PresenceThemePalette;

export interface PresenceModules {
  blog: boolean;
  projects: boolean;
  resume: boolean;
  wiki: boolean;
  chat: boolean;
  search: boolean;
}

export interface PresenceFeatures {
  showDeployBadge: boolean;
  enableMcp: boolean;
  enableAgent: boolean;
}

export interface PresenceKnowledgeConfig {
  provider: "wiki" | "graphrag";
  embeddingModel: string;
  chatModel: string;
}

export interface PresenceDeployConfig {
  /**
   * Public GitHub template URL for the Vercel clone button.
   * Leave empty until published — UI will show setup instructions instead of a fake URL.
   */
  templateRepoUrl?: string;
}

export interface PresenceConfig {
  name: string;
  fullName: string;
  tagline: string;
  bio: string;
  /** Rotating role labels shown on the home page */
  roles?: string[];
  /** Path to avatar image under /public, e.g. "/img/about-square.jpg" */
  avatar?: string;
  location?: string;
  email?: string;
  website?: string;
  social: PresenceSocial;
  theme: PresenceThemeConfig | PresenceTheme;
  modules: PresenceModules;
  features: PresenceFeatures;
  knowledge: PresenceKnowledgeConfig;
  deploy?: PresenceDeployConfig;
}
