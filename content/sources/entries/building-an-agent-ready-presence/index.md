---
title: "Building an agent-ready presence"
type: post
date: "2026-03-12"
summary: "How students and early-career builders can package writing, projects, and interactives so humans and agents can discover their work."
tags: ["presence", "agents", "career", "latex"]
image: "/entries/building-an-agent-ready-presence/embeds/cover-note.svg"
---

# Building an agent-ready presence

Most personal sites still assume a human visitor clicks around. In an agentic world, your work also needs a **machine-readable surface**: stable URLs, structured entries, a compiled wiki, and tools like MCP.

This sample post demonstrates the full Presence writing stack — wiki links, math, tables, code, and a colocated interactive embed.

## Why it matters

[[presence-framework|Presence]] treats sources as immutable and compiles a wiki agents can query. See also [[alex-rivera]] for the sample persona.

A simple utility score for “how discoverable is this page?” might look like:

$$
S = w_c \cdot C + w_l \cdot L + w_a \cdot A
$$

where $C$ is citation coverage, $L$ is internal link density, and $A$ is agent tool exposure (API / MCP).

## Feature checklist

| Feature | Presence support | Shown here |
|---------|------------------|------------|
| Frontmatter + tags | Yes | Yes |
| KaTeX math | `$…$` / `$$…$$` | Yes |
| GFM tables | Scrollable | Yes |
| Code blocks | Yes | Yes |
| Wiki links | `[[slug]]` | Yes |
| Colocated embeds | `/entries/{slug}/…` | Yes |

## A tiny compile loop

```bash
npm run presence -- compile --no-llm
npm run presence -- doctor
npm run presence -- reindex
```

## Interactive embed

The widget below lives next to this markdown file under `embeds/` and is served from the entry asset route:

<iframe class="embed-plot" src="/entries/building-an-agent-ready-presence/embeds/signal-widget.html" title="Signal widget"></iframe>

## Next steps

1. Replace this sample with your own post folder.
2. Keep interactives beside the post — not in a global `public/embeds/` dump.
3. Ask the floating agent: *“take me to the skill orbit visual”*.
