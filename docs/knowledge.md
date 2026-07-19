# Knowledge layer

Presence follows the LLM Wiki pattern:

1. **`content/sources/`** — immutable intake (blog, projects, resume, inbox).
2. **`content/wiki/`** — compiled markdown pages with `[[wiki-links]]`.
3. **`content/wiki-graph.json`** — adjacency index built at compile time.

## Compile

```bash
npm run presence -- compile
```

With `OPENROUTER_API_KEY` (preferred) or `OPENAI_API_KEY`:

1. Extract entities from sources
2. **Create** missing wiki pages
3. **Incrementally update** existing pages (merge new facts; flag contradictions)
4. Rebuild the link graph
5. Refresh the persistent vector index

Flags:

| Flag | Effect |
|---|---|
| `--no-llm` | Graph (+ vectors) only |
| `--force` | Blind overwrite instead of incremental merge |
| `--create-only` | Only add missing pages |
| `--no-reindex` | Skip embedding upserts |
| `--max-pages <n>` | Cap entities processed |

## Contradictions

Incremental synthesis may:

- Set `contradictions:` in page frontmatter
- Add a `## Views that evolved` section

`presence doctor` surfaces both. Do not “fix” contradictions by editing sources — update the wiki or add a newer source.
