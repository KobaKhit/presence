# Deploy

## One-click Vercel

Set `deploy.templateRepoUrl` in `content/presence.config.ts` to your published template GitHub URL. The `/deploy` page and README button use that value — leave it empty until the repo is public so you do not advertise a fake URL.

Required env on Vercel (declared by the button when URL is set):

- `OPENROUTER_API_KEY` (preferred) or `OPENAI_API_KEY`

Optional: `PRESENCE_ADMIN_TOKEN` for write endpoints (`PERSONA_ADMIN_TOKEN` still accepted as a fallback).

Also ships `railway.json` and `render.yaml` for self-hosters.

## GitHub Action (compile-as-PR)

Workflow: `.github/workflows/wiki-compile.yml`

Triggers:

- Push to `main`/`master` touching `content/sources/**`
- Weekly schedule
- Manual `workflow_dispatch`

Behavior:

- Runs `presence compile` (default **`--no-llm`** to avoid surprise spend)
- Opens/updates branch `chore/wiki-compile` as a PR for human review

Opt-in LLM in CI:

1. Add secret `OPENROUTER_API_KEY` (or `OPENAI_API_KEY`)
2. Set repo variable `PRESENCE_CI_LLM=true` (or legacy `PERSONA_CI_LLM=true`), **or** run the workflow manually with `use_llm=true`

## Growth loop

- Footer **Powered by Presence** badge → `/deploy` (toggle `features.showDeployBadge`)
- `/setup` onboarding for one-click users
