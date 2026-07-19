# Syncing with upstream Presence

This repo (`kobawebsite`) is Koba's personal Presence site. The open-source framework template lives at:

https://github.com/KobaKhit/presence

## Remotes

```bash
git remote -v
# origin    → your kobawebsite GitHub remote
# upstream  → https://github.com/KobaKhit/presence.git
```

If `upstream` is missing:

```bash
git remote add upstream https://github.com/KobaKhit/presence.git
```

## Pull framework updates

Prefer merging upstream into a branch, then reviewing before main:

```bash
git fetch upstream
git checkout -b sync/presence-upstream
git merge upstream/main
# resolve conflicts — keep personal content/ and identity in content/presence.config.ts
git push -u origin HEAD
# open a PR into main
```

### Conflict guidance

| Path | Prefer |
|---|---|
| `content/presence.config.ts` | **This repo** (Koba identity) — keep `templateRepoUrl` pointing at Presence |
| `content/sources/**`, `content/wiki/**` | **This repo** (personal knowledge) |
| `src/**`, `scripts/**`, `packages/**`, docs framework bits | **Upstream** (framework fixes) |
| `package.json` scripts | Merge carefully; keep `presence` + `persona` alias |

## Pushing fixes back to the template

Framework-only improvements (no personal content) can be cherry-picked or PR'd to `KobaKhit/presence`.

Do **not** copy `.env.local`, `data/`, or personal media into the template.
