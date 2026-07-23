# Paid / hosted platform boundary

Presence ships as an **open-source, git-first personal platform**. A future hosted product can reuse the same public site, APIs, and agent surfaces by swapping storage and control-plane adapters.

## What stays in OSS (this repo)

| Capability | Implementation |
|------------|----------------|
| Content model | `content/sources/entries/` folders + markdown/HTML |
| Read APIs | `/api/v1/*`, OpenAPI, `/llms.txt` |
| Knowledge | Wiki compile CLI, SQLite/pgvector, Fuse + graph |
| Agents | Floating chat, MCP, `/api/agent` |
| Themes | Switchable visitor themes |
| Publish contracts | `src/lib/publishing` with **filesystem** adapters |

## What a hosted product supplies

| Capability | Contract hook | Hosted implementation (private app) |
|------------|---------------|--------------------------------------|
| CMS UI | Consumes `EntryDraft` / `PublishResult` schemas | Authenticated editor for posts, projects, visuals |
| Multi-tenant content | `ContentRepository` | Database-backed per-site repositories |
| Assets | `AssetStore` | Object storage (S3/R2) + CDN URLs |
| Compile/reindex jobs | `PublishJobRunner` | Queued workers with per-tenant secrets |
| Auth / seats | Admin token today → entitlements later | Accounts, orgs, RBAC |
| Billing | `Entitlements` | Stripe/etc. plans (`canUseCmsUi`, …) |

## Adapter entry points

```ts
import {
  getContentRepository,   // FilesystemContentRepository by default
  getAssetStore,          // FilesystemAssetStore
  getPublishJobRunner,    // LocalPublishJobRunner
  OSS_ENTITLEMENTS,
} from "@/lib/publishing";
```

Hosted deployments inject alternate implementations (same TypeScript interfaces) without changing route URLs or entry packaging rules.

## Security

- Write routes (`/api/v1/wiki/save`, `/api/v1/wiki/propose`, `/api/v1/admin/compile`) use shared `assertAdmin`.
- Production fails closed: set `PRESENCE_ADMIN_TOKEN` (or set `PRESENCE_REQUIRE_ADMIN=1`).
- Chat navigation only emits allowlisted **internal** hrefs from enabled modules.

## Not in this phase

Accounts, billing, multi-tenant CMS UI, and managed hosting are **out of scope** for the MIT template. Schemas and adapters exist so a separate product can grow without forking the public site experience.
