# Vector store

Hybrid search = **lexical (Fuse.js)** + **persisted embeddings** + **1–2 hop graph expansion**.

## Default: SQLite

Zero-config local store at `data/vectors.sqlite` (gitignored).

Uses `better-sqlite3` and cosine similarity in-process (no native `sqlite-vec` extension required).

```bash
# optional path override
PRESENCE_VECTOR_DB=./data/vectors.sqlite
# PERSONA_VECTOR_DB=./data/vectors.sqlite   # legacy fallback

npm run presence -- reindex
```

Without an API key, reindex still opens the store and prunes stale ids; it does not invent embeddings.

## Optional: Postgres + pgvector

For Neon / Supabase / self-hosted Postgres:

```bash
npm install pg
# enable extension in your DB: CREATE EXTENSION vector;

DATABASE_URL=postgres://user:pass@host:5432/db
PRESENCE_VECTOR_STORE=pgvector   # optional; auto-detected from postgres:// URL
# PERSONA_VECTOR_STORE=pgvector  # legacy fallback
```

Presence creates the table `persona_embeddings` (name kept for compatibility) and uses `<=>` distance. If `pg` is missing or the extension fails, search falls back to SQLite.

## Env summary

| Variable | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | Preferred embeddings + chat |
| `OPENAI_API_KEY` | Fallback |
| `PRESENCE_VECTOR_DB` | SQLite file path (`PERSONA_VECTOR_DB` fallback) |
| `PRESENCE_VECTOR_STORE` | `sqlite` \| `pgvector` (`PERSONA_VECTOR_STORE` fallback) |
| `DATABASE_URL` | Postgres connection for pgvector |
