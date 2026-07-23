---
title: "Campus Signal Lab"
type: project
date: "2026-02-01"
summary: "A student research studio that turns course notes into a searchable personal knowledge graph with MCP endpoints."
tags: ["research", "knowledge-graph", "mcp", "education"]
status: active
featured: true
url: "https://example.com/campus-signal-lab"
github: "https://github.com/example/campus-signal-lab"
pdf: "/entries/campus-signal-lab/assets/one-pager.txt"
image: "/entries/campus-signal-lab/assets/poster.svg"
---

# Campus Signal Lab

**Campus Signal Lab** is a sample project for Presence: a portfolio entry with live links, GitHub, a downloadable one-pager, and narrative depth.

## Problem

Students produce lots of artifacts — notes, notebooks, demos — but recruiters and agents only see a thin resume.

## Approach

1. Capture sources under `content/sources/entries/`
2. Compile a wiki with `npm run presence -- compile`
3. Expose MCP + `/api/v1` so assistants can query the corpus

## Stack

- Next.js Presence template
- OpenRouter (optional) for synthesis
- SQLite vector store by default

## Outcomes

- Featured on the home page (`featured: true`)
- Linked from the sample wiki
- Demonstrates `url`, `github`, `pdf`, and `image` frontmatter

Download the [one-pager](/entries/campus-signal-lab/assets/one-pager.txt) or explore the related visual [Skill Orbit](/visuals/skill-orbit).
