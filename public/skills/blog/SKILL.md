# Blog

Immutable writing under `content/sources/entries/` with `type: post`.

## Packaging

**Prefer a folder** when the post has interactive assets (maps, plots, DataTables, notebooks, images):

```
content/sources/entries/2016-02-18-linear-opt-baseball/
  index.md
  embeds/
    baseball-roster.html
```

In `index.md`, reference sibling assets via the entry asset route:

```html
<iframe src="/entries/2016-02-18-linear-opt-baseball/embeds/baseball-roster.html"></iframe>
```

A single flat `.md` file is fine for text-only posts with no local assets.

LaTeX: use `$inline$` / `$$display$$` (KaTeX). Escape currency as `\$189`.

## Rules for agents

1. Do **not** dump post-specific HTML into `public/embeds/`. Keep embeds next to the post under `embeds/` (or another sibling folder in the entry).
2. Shared site chrome (favicon, global CSS) stays in `public/`.
3. Downloadable notebooks/zips may live in `public/ipynb/` **or** inside the entry folder — prefer the entry folder when the file belongs to one post.
4. After moving files, update iframe/`src` paths to `/entries/{slug}/…`.

See [docs/entries.md](/docs/entries) for full packaging details.
