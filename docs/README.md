# Presence docs

Essential guides for forking and operating a Presence site. Also see `/deploy`, `/setup`, and `/llms.txt` on a running instance.

| Doc | Topic |
|---|---|
| [Entries](./entries.md) | Unified content: md / html / folders + type tabs |
| [Knowledge layer](./knowledge.md) | Sources, wiki, compile, contradictions |
| [Vector store](./vector-store.md) | SQLite default, optional pgvector |
| [Deploy](./deploy.md) | Vercel button, CI, env vars |
| [Agents & MCP](./agents.md) | `/api/mcp`, skills, AG-UI agent |
| [Upstream sync](./upstream-sync.md) | Pulling framework updates from KobaKhit/presence |

## Quick commands

```bash
npm run presence -- compile          # LLM synthesis (if keyed) + graph + vectors
npm run presence -- compile --no-llm # graph + vector reindex without synthesis
npm run presence -- doctor           # orphans, missing links, contradictions
npm run presence -- reindex          # graph + persist embeddings
npm run presence -- ingest <url|file>
```

`npm run persona` still works as an alias.
