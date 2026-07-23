# AGENTS.md

Canonical copy also served at `/AGENTS.md` (see `public/AGENTS.md`).

You are helping maintain a **Presence** site — Next.js personal platform with an LLM Wiki knowledge layer.

## Quick map
- Identity: `content/presence.config.ts`
- Sources (immutable): `content/sources/`
- Wiki (compiled): `content/wiki/`
- Graph index: `content/wiki-graph.json`
- API contract: `/openapi.json`
- Machine index: `/llms.txt`
- Skills: `/skills/*/SKILL.md`

## Commands
```bash
npm run dev
npm run presence -- compile
npm run presence -- doctor
npm run presence -- reindex
npm run presence -- ingest <url-or-file>
node packages/create-presence/bin/create-presence.js my-site
```

`npm run persona` is an alias for `npm run presence`.

## LLM
Prefer `OPENROUTER_API_KEY` (OpenAI-compatible at `https://openrouter.ai/api/v1`). Fall back to `OPENAI_API_KEY`. Selection lives in `src/lib/llm/`. Without keys, chat/compile stay extractive/graph-only.

## Vectors
Default persistent store: `data/vectors.sqlite` (SQLite). Optional Postgres/pgvector via `DATABASE_URL` + `npm install pg` — see `docs/vector-store.md`.

## Rules
1. Prefer `/api/v1` over scraping.
2. Do not edit sources to “fix” wiki — update wiki or add a new source.
3. After wiki changes, recompile the graph (`presence compile` / `--no-llm`).
4. Keep Zod schemas in sync when adding routes.
5. Do not invent a published template URL — set `deploy.templateRepoUrl` only when real.
6. Entry packaging: posts/projects/visuals with local interactives (maps, plots, widgets) use a **folder** under `content/sources/entries/{slug}/` with `index.md` + sibling assets (e.g. `embeds/`). Serve via `/entries/{slug}/…`. Do not dump post-specific HTML into `public/embeds/`. See `docs/entries.md` and `/skills/blog/SKILL.md`.
7. Visitor chat is the floating agent only (no Chat nav tab). Navigation actions must be allowlisted internal routes; confirm-first by default.
8. Themes live in `content/presence.config.ts` (`theme.presets`); do not hardcode colors only in CSS.
9. Publishing contracts (`src/lib/publishing`) stay filesystem in OSS; see `docs/paid-platform.md` for hosted seams. Write routes use shared `assertAdmin` (fail-closed in production).
