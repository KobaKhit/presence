# Agents & MCP

## Surfaces

| Endpoint | Role |
|---|---|
| `/api/v1/*` | Versioned REST (Zod → `/openapi.json`) |
| `/api/mcp` | JSON-RPC tools over HTTP |
| `/api/agent` | AG-UI-style SSE (search + grounded reply) |
| `/llms.txt` | Machine index |
| `/skills/*/SKILL.md` | Module skills |
| `/AGENTS.md` | Agent operating notes |

## MCP tools

- `get_presence`
- `get_resume`
- `list_projects` / `list_blog_posts`
- `list_wiki_pages` / `get_wiki_page`
- `search_knowledge` — hybrid lexical + vector + graph
- `contact` — rate-limited mailto payload (no outbound email send)

## LLM

Centralized in `src/lib/llm/`: OpenRouter → OpenAI → extractive none.

Local/Ollama mode is intentionally not supported in this fork.
