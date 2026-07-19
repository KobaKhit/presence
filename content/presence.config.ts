import type { PresenceConfig } from "@/lib/config/types";

/**
 * Identity & module toggles — forks edit this file, never framework code.
 */
const config: PresenceConfig = {
  name: "Alex",
  fullName: "Alex Rivera",
  tagline: "Designer, builder, and curious generalist.",
  bio: "I write about craft, ship side projects, and keep a living wiki of what I learn. This site runs on Presence — fork it and make it yours.",
  roles: ["Designer", "Builder", "Writer"],
  location: "Somewhere on the internet",
  email: "alex@example.com",
  website: "https://example.com",
  social: {
    github: "https://github.com/example",
    twitter: "https://x.com/example",
    linkedin: "https://linkedin.com/in/example",
  },
  theme: {
    accent: "#0f766e",
    accentBright: "#14b8a6",
    ink: "#0d1b2a",
    muted: "#5c6b7a",
    paper: "#f0f3f7",
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
