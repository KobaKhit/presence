# Presence

[![codecov](https://codecov.io/gh/KobaKhit/presence/graph/badge.svg)](https://codecov.io/gh/KobaKhit/presence)

Open-source **Next.js personal site framework** where the site is the front door, the API is a contract, and a compiled LLM Wiki powers search, chat, and MCP.

> Use this repo as a **GitHub Template** → edit `content/` → deploy. Zero-config boot (SQLite vectors, no cloud DB required).

**Template:** [https://github.com/KobaKhit/presence](https://github.com/KobaKhit/presence)

## Features

- **Site**: home, blog, projects, visuals, resume, wiki, docs — with switchable themes
- **Floating agent**: wiki-grounded chat that can suggest (or auto-follow) in-site navigation
- **Knowledge layer**: immutable `content/sources/` + compiled `content/wiki/` with `[[wiki-links]]`
- **Hybrid retrieval**: Fuse lexical + **persistent vectors** (SQLite default / optional pgvector) + graph expansion
- **API**: versioned `/api/v1/*` + generated `/openapi.json`
- **Agents**: `/api/agent` (SSE), `/api/mcp`, `/llms.txt`, skills
- **Publishing contracts**: filesystem adapters today; hosted CMS adapters later (`docs/paid-platform.md`)
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
5. Pick themes in config (`lab` / `midnight` / `minimal`) — visitors can toggle in the header

## Sample showcase

The template ships one full-feature example of each entry type:

| Type | Slug | Demonstrates |
|------|------|--------------|
| Post | `building-an-agent-ready-presence` | KaTeX, table, wiki links, colocated embed |
| Project | `campus-signal-lab` | featured, url/github/pdf/image, assets |
| Visual | `skill-orbit` | `visualPath` + interactive `index.html` |

## OSS vs hosted

| Open source (this repo) | Future paid / hosted |
|-------------------------|----------------------|
| Git + folder content | CMS UI for posts / projects / visuals |
| Local compile CLI | Queued compile jobs |
| Filesystem adapters | DB + object storage |
| Admin token on write routes | Accounts, seats, billing |

See [docs/paid-platform.md](docs/paid-platform.md).

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
