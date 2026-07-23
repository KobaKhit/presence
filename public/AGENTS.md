# Agent guide — Presence personal site

You are working with a **Presence** site: Next.js App Router + a compiled LLM Wiki.

## Read first
1. `/llms.txt` — machine map of endpoints and skills
2. `/openapi.json` — stable API contract (prefer this over scraping HTML)
3. `content/presence.config.ts` — identity and module toggles
4. This file and `/skills/*/SKILL.md`
5. `/docs` — operator guides (knowledge, vectors, deploy, agents)

## Content rules
- `content/sources/**` is **immutable intake**. Do not rewrite history; add new sources.
- `content/wiki/**` is the **compiled** knowledge base. Densely `[[wiki-link]]` pages. Cite sources in frontmatter.
- After wiki edits, run `npm run presence -- compile` (or POST `/api/v1/admin/compile`) to refresh `content/wiki-graph.json`.
- Contradictions belong in wiki frontmatter / “Views that evolved” — not by rewriting sources.
- **Packaging:** entries with local interactive assets (Folium, plots, DataTables, custom HTML) live in `content/sources/entries/{slug}/` as `index.md` + siblings (commonly `embeds/`). Reference with `/entries/{slug}/…`. Do not put post-specific widgets in `public/embeds/`. Details: `/docs` → entries, `/skills/blog/SKILL.md`.

## API (one service layer)
| Surface | Path |
|---|---|
| REST | `/api/v1/{presence,blog,projects,resume,wiki,search,chat}` |
| Wiki save-back | `POST /api/v1/wiki/propose`, `POST /api/v1/wiki/save` |
| Agent SSE | `/api/agent` |
| MCP | `/api/mcp` |
| Spec | `/openapi.json` |

## LLM
Prefer `OPENROUTER_API_KEY` (OpenAI-compatible). Fall back to `OPENAI_API_KEY`. Without keys, chat is extractive and compile is graph-only. Local/Ollama mode is not supported.

## Building alternate UIs
Consume JSON from `/api/v1/*`. Do not depend on CSS class names from the reference theme. The default UI is a theme, not a cage.

## Knowledge retrieval
Prefer wiki pages for multi-hop questions. Use `GET /api/v1/search?q=` (lexical + persisted vectors + graph expand). Pass wiki context before raw source chunks when answering.

## Safety
Never compile on every page request. Compilation is explicit (CLI, admin button, or CI). Rate-limit chat/MCP in production.
