#!/usr/bin/env node
/**
 * create-presence — scaffold a new Presence site from this template.
 * Usage: node packages/create-presence/bin/create-presence.js [dir]
 *    or: npx create-presence my-site  (when published)
 *
 * Prefer running from the public template checkout (KobaKhit/presence).
 * When copying from a personal instance, sample content replaces personal entries.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const targetArg = process.argv[2] || "my-presence";
const targetDir = path.resolve(process.cwd(), targetArg);

const TEMPLATE_HINTS = [
  "content/presence.config.ts",
  "content/sources",
  "content/wiki",
  "package.json",
  "README.md",
];

const SKIP_NAMES = new Set([
  "node_modules",
  ".next",
  ".git",
  "data",
  ".vercel",
  "packages",
  "dist",
  ".env",
  ".env.local",
]);

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function copyDir(src, dest, skip = SKIP_NAMES) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to, skip);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function findTemplateRoot() {
  const envUrl = process.env.PRESENCE_TEMPLATE_URL?.trim();
  if (envUrl) {
    console.log(`PRESENCE_TEMPLATE_URL is set (${envUrl}) — still copying from local checkout when available.`);
  }

  let dir = path.resolve(__dirname, "../../..");
  if (fs.existsSync(path.join(dir, "content", "presence.config.ts"))) return dir;

  dir = path.resolve(__dirname, "..");
  if (fs.existsSync(path.join(dir, "template"))) return path.join(dir, "template");

  const bundled = path.join(__dirname, "..", "template");
  if (fs.existsSync(bundled)) return bundled;

  return null;
}

function sampleConfigTs() {
  return `import type { PresenceConfig } from "@/lib/config/types";

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
`;
}

function writeSampleContent(dest) {
  const entriesDir = path.join(dest, "content", "sources", "entries");
  fs.mkdirSync(entriesDir, { recursive: true });
  for (const name of fs.readdirSync(entriesDir)) {
    const p = path.join(entriesDir, name);
    fs.rmSync(p, { recursive: true, force: true });
  }

  fs.writeFileSync(
    path.join(entriesDir, "hello-presence.md"),
    `---
type: post
title: "Hello, Presence"
date: "2026-01-15"
summary: "Why a compiled wiki beats stuffing everything into a context window."
tags: ["presence", "knowledge"]
---

Presence is a personal site framework with an LLM Wiki: immutable sources, compiled pages, and a stable API.

Edit this post, add projects, then run \`npm run presence -- compile\`.
`,
  );

  fs.writeFileSync(
    path.join(entriesDir, "sample-project.md"),
    `---
type: project
title: "Sample Project"
date: "2026-02-01"
summary: "A placeholder project — replace with something you built."
tags: ["demo"]
status: active
featured: true
---

Describe what you shipped, link the repo, and let compile fold it into the wiki.
`,
  );

  fs.writeFileSync(
    path.join(entriesDir, "sample-visual.md"),
    `---
type: visual
title: "Sample Visual"
date: "2026-03-01"
summary: "A placeholder visual entry for the /visuals surface."
tags: ["demo", "visual"]
status: active
kind: visual
---

Swap this for a chart, notebook, or interactive piece under \`public/\`.
`,
  );

  fs.writeFileSync(
    path.join(dest, "content", "sources", "resume.md"),
    `---
title: Resume
---

# Alex Rivera

Designer · Builder · Writer

## Experience

- **Independent** — Shipping side projects and writing in public (2024–).
- **Previous role** — Replace with your background.

## Skills

TypeScript, design systems, knowledge tools, product sense.
`,
  );

  const wikiDir = path.join(dest, "content", "wiki");
  fs.mkdirSync(wikiDir, { recursive: true });
  for (const name of fs.readdirSync(wikiDir)) {
    if (name.endsWith(".md")) fs.unlinkSync(path.join(wikiDir, name));
  }

  fs.writeFileSync(
    path.join(wikiDir, "index.md"),
    `---
title: Wiki index
summary: Hub for Alex Rivera's compiled knowledge.
type: hub
---

# Wiki

Start here. Compiled pages grow from \`content/sources/\`.

- [[presence-framework]] — the open-source personal site + knowledge layer
- [[alex-rivera]] — identity overview
`,
  );

  fs.writeFileSync(
    path.join(wikiDir, "presence-framework.md"),
    `---
title: Presence Framework
summary: Open-source Next.js personal site with a compiled LLM Wiki.
type: entity
sources:
  - projects/sample-project
updated: "2026-07-19"
---

# Presence Framework

**Presence** is a forkable personal platform: pages on the outside, \`/api/v1\` + MCP underneath, and a compiled wiki for search and chat.

See also: [[alex-rivera]]
`,
  );

  fs.writeFileSync(
    path.join(wikiDir, "alex-rivera.md"),
    `---
title: Alex Rivera
summary: Sample site owner for the Presence template.
type: entity
updated: "2026-07-19"
---

# Alex Rivera

Sample identity for the Presence template. Replace with your own story in \`content/presence.config.ts\` and sources.

Related: [[presence-framework]]
`,
  );

  fs.writeFileSync(
    path.join(dest, "content", "wiki-graph.json"),
    JSON.stringify(
      {
        nodes: [
          { id: "index", title: "Wiki index", type: "hub" },
          { id: "presence-framework", title: "Presence Framework", type: "entity" },
          { id: "alex-rivera", title: "Alex Rivera", type: "entity" },
        ],
        edges: [
          { source: "index", target: "presence-framework" },
          { source: "index", target: "alex-rivera" },
          { source: "presence-framework", target: "alex-rivera" },
          { source: "alex-rivera", target: "presence-framework" },
        ],
      },
      null,
      2,
    ) + "\n",
  );

  fs.writeFileSync(path.join(dest, "content", "presence.config.ts"), sampleConfigTs());

  // Strip personal public assets if present
  for (const rel of ["public/ipynb", "public/data-visuals"]) {
    const p = path.join(dest, rel);
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
  }

  for (const envName of [".env", ".env.local"]) {
    const p = path.join(dest, envName);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function writeMinimalTemplate(dest) {
  const pkg = {
    name: path.basename(dest),
    version: "0.1.0",
    private: true,
    license: "MIT",
    scripts: {
      dev: "next dev --turbopack",
      build: "next build",
      start: "next start",
      presence: "tsx scripts/presence.ts",
      persona: "tsx scripts/presence.ts",
    },
    dependencies: {
      next: "15.5.20",
      react: "19.1.0",
      "react-dom": "19.1.0",
    },
  };
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, "package.json"), JSON.stringify(pkg, null, 2));
  fs.writeFileSync(
    path.join(dest, "README.md"),
    `# ${path.basename(dest)}

Scaffolded by create-presence.

This is a **minimal stub**. Prefer cloning the template:

https://github.com/KobaKhit/presence

Or from a Presence checkout:

\`\`\`bash
node packages/create-presence/bin/create-presence.js ${path.basename(dest)}
npm install
cp .env.example .env.local
npm run presence -- compile --no-llm
npm run dev
\`\`\`
`,
  );
  fs.mkdirSync(path.join(dest, "content"), { recursive: true });
  writeSampleContent(dest);
}

function main() {
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    die(`Target directory is not empty: ${targetDir}`);
  }

  const root = findTemplateRoot();
  console.log(`create-presence → ${targetDir}`);

  if (!root) {
    console.warn("Full Presence template not found nearby — writing minimal stub.");
    writeMinimalTemplate(targetDir);
    console.log("Done (minimal). Prefer https://github.com/KobaKhit/presence for a full copy.");
    return;
  }

  console.log(`Copying from ${root}`);
  copyDir(root, targetDir, SKIP_NAMES);
  writeSampleContent(targetDir);

  // Ensure package identity for the new site
  const pkgPath = path.join(targetDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      pkg.name = path.basename(targetDir);
      pkg.license = pkg.license || "MIT";
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    } catch {
      /* ignore */
    }
  }

  console.log("\nNext steps:");
  console.log(`  cd ${targetArg}`);
  console.log("  npm install");
  console.log("  cp .env.example .env.local");
  console.log("  npm run presence -- compile --no-llm");
  console.log("  npm run dev");
  console.log("\nChecked paths:", TEMPLATE_HINTS.join(", "));

  try {
    execSync("npm --version", { stdio: "ignore" });
  } catch {
    /* ignore */
  }
}

main();
