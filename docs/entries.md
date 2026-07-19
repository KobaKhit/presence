# Entries (unified content)

All blog posts, projects, and data visuals live under **`content/sources/entries/`**.

Tabs filter by frontmatter `type`:

| `type` | Tab / route |
|--------|-------------|
| `post` | Blog → `/blog` |
| `project` | Projects → `/projects` |
| `visual` | Visuals → `/visuals` |

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
