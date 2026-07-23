# Projects & Visuals

Entries under `content/sources/entries/` with `type: project` or `type: visual`.

- Projects → `/projects`
- Visuals → `/visuals` (HTML embeds via `visualPath` or folder `index.html`)

Folder packaging lets each visual (or project with assets) ship custom HTML/JS/CSS/data beside `index.md`.

Same rule as blog: keep interactive assets **inside the entry folder** (e.g. `embeds/`), served at `/entries/{slug}/…` — not a global `public/embeds/` dump.

Samples:
- Project: `campus-signal-lab/` (`url`, `github`, `pdf`, `image`, `featured`)
- Visual: `skill-orbit/` (`visualPath: index.html` + interactive `index.html`)

See [docs/entries.md](/docs/entries) and [blog skill](/skills/blog/SKILL.md) for packaging details.
