# Skill: Wiki module

## Purpose
Browse and query the compiled LLM Wiki (`content/wiki/*.md`) and its link graph.

## Endpoints
- `GET /api/v1/wiki` — page summaries
- `GET /api/v1/wiki/{slug}` — full page
- `GET /api/v1/wiki/graph` — `{ nodes, edges }`
- `GET /api/v1/search?q=` — hybrid lexical + graph expansion

## Conventions
- Pages use `[[wiki-links]]` to other slugs
- Frontmatter: `title`, `summary`, `type` (`hub|entity|concept`), `sources[]`, `updated`
- Retrieval order: wiki pages first, source excerpts second

## UI
The reference site renders a D3 force graph on `/wiki`. Alternate UIs can fetch `/api/v1/wiki/graph` and visualize independently.
