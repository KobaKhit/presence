# Presence

Open-source **Next.js personal site framework** where the site is the front door, the API is a contract, and a compiled LLM Wiki powers search, chat, and MCP.

> Use this repo as a **GitHub Template** → edit `content/` → deploy. Zero-config boot (SQLite vectors, no cloud DB required).

**Template:** [https://github.com/KobaKhit/presence](https://github.com/KobaKhit/presence)

## Features

- **Site**: home, blog, projects, resume, wiki, chat, docs
- **Knowledge layer**: immutable `content/sources/` + compiled `content/wiki/` with `[[wiki-links]]`
- **Hybrid retrieval**: Fuse lexical + **persistent vectors** (SQLite default / optional pgvector) + graph expansion
- **Incremental compile**: entity extract → create/update pages → flag contradictions
- **API**: versioned `/api/v1/*` + generated `/openapi.json`
- **Agents**: `/api/agent` (SSE), `/api/mcp`, `/llms.txt`, skills
- **Growth loop**: deploy badge → `/deploy` (config-driven template URL)

## Quick start

```bash
npm install
cp .env.example .env.local   # optional OPENROUTER_API_KEY
npm run presence -- compile --no-llm
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scaffold from a checkout

```bash
node packages/create-presence/bin/create-presence.js my-site
```

## Customize

1. Edit `content/presence.config.ts` (sample identity is **Alex Rivera**)
2. Replace content under `content/sources/entries/` (`type: post|project|visual`)
3. Run `npm run presence -- compile`
4. Set `deploy.templateRepoUrl` if you fork the template under your org

## CLI

```bash
npm run presence -- compile
npm run presence -- compile --no-llm
npm run presence -- doctor
npm run presence -- reindex
npm run presence -- ingest <url-or-file>
```

`npm run persona` is a temporary alias for the same CLI.

## License

MIT
