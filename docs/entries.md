# Entries (unified content)

All blog posts, projects, and data visuals live under **`content/sources/entries/`**.

Tabs filter by frontmatter `type`:

| `type` | Tab / route |
|--------|-------------|
| `post` | Blog → `/blog` |
| `project` | Projects → `/projects` |
| `visual` | Visuals → `/visuals` |

## Math (LaTeX)

Markdown supports KaTeX via `$inline$` and `$$display$$` (also `\(…\)` / `\[…\]`). Escape literal dollar signs as `\$` when they are currency (e.g. `\$189 million`), so they are not parsed as math.

## Packaging (pick one)

### Single markdown file

```
content/sources/entries/hello-world.md
```

```yaml
---
title: "Hello world!"
type: post
date: "2016-01-22"
summary: "..."
tags: ["r", "python"]
---
```

### Single HTML file

```
content/sources/entries/quick-viz.html
```

Optional HTML comments: `<!-- title: My Viz -->` and `<!-- type: visual -->`.

### Folder (md/html + sibling assets)

```
content/sources/entries/nba-3pt-spiral/
  index.md                 # required (or index.html)
  nba_3pt_spiral.html      # interactive app
  data.json                # optional
```

```yaml
---
title: "NBA 3-Point Evolution"
type: visual
date: "2018-01-01"
summary: "..."
visualPath: nba_3pt_spiral.html   # relative → served at /entries/{slug}/…
image: /img/portfolio/nba3pt.png
featured: true
---
```

Relative `visualPath` values are served from `/entries/{slug}/…` (Next.js route that reads the entry folder). Absolute paths like `/data-visuals/…` still work for assets in `public/`.

If `type: visual` and `visualPath` is omitted, `index.html` in the folder is used automatically.

### Blog / project posts with interactive embeds

When a **post** (or project) includes Folium maps, Gadfly plots, DataTables, charts, or other HTML widgets, package it as a **folder** and keep those files next to the markdown:

```
content/sources/entries/2016-03-06-indego-bike-folium/
  index.md
  embeds/
    indego-markers.html
    indego-clusters.html
    indego-heatmap.html
```

Reference them from the post body:

```html
<iframe
  class="embed-map"
  title="Indego markers"
  src="/entries/2016-03-06-indego-bike-folium/embeds/indego-markers.html"
  loading="lazy"
></iframe>
```

**Do not** put post-specific interactive HTML in a global `public/embeds/` dump. `public/` is for site-wide assets; entry folders own content-bound interactives. Markdown tables are auto-wrapped in a scroll container by the renderer.

## Common frontmatter

| Field | Used by |
|-------|---------|
| `title`, `date`, `summary`, `tags` | all |
| `type` | tab filtering (required) |
| `draft: true` | skip from site |
| `status` | project/visual |
| `url`, `github`, `pdf` | links |
| `visualPath` | visual embed |
| `image`, `featured` | cards / home |

Resume stays at `content/sources/resume.md` (not an entry).
