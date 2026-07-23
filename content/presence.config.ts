import type { PresenceConfig } from "@/lib/config/types";

/**
 * Identity & module toggles — forks edit this file, never framework code.
 * Sample persona: young professional / student establishing presence in an agentic world.
 */
const config: PresenceConfig = {
  name: "Alex",
  fullName: "Alex Rivera",
  tagline: "Building an agent-ready professional presence.",
  bio: "Student and early-career builder documenting projects, visuals, and notes so people — and agents — can understand my work. This site runs on Presence: a personal platform with a wiki, MCP tools, and an on-site agent.",
  roles: ["Student builder", "Data tinkerer", "Agent-native writer"],
  location: "Somewhere on the internet",
  email: "alex@example.com",
  website: "https://example.com",
  social: {
    github: "https://github.com/example",
    twitter: "https://x.com/example",
    linkedin: "https://linkedin.com/in/example",
  },
  theme: {
    defaultTheme: "lab",
    presets: {
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
    },
  },
  modules: {
    blog: true,
    projects: true,
    resume: true,
    wiki: true,
    chat: true,
    search: true,
  },
  features: {
    showDeployBadge: true,
    enableMcp: true,
    enableAgent: true,
  },
  knowledge: {
    provider: "wiki",
    embeddingModel: "openai/text-embedding-3-small",
    chatModel: "openai/gpt-4o-mini",
  },
  deploy: {
    templateRepoUrl: "https://github.com/KobaKhit/presence",
  },
};

export default config;
