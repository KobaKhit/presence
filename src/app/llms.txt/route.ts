import { getPresenceConfig } from "@/lib/config";
import { getEnabledModules } from "@/lib/modules/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getPresenceConfig();
  const modules = getEnabledModules();

  const body = `# ${config.fullName} — llms.txt

> Presence personal site with a compiled LLM Wiki knowledge layer.
> Prefer the API and skills over scraping HTML.

## Identity
- Name: ${config.fullName}
- Tagline: ${config.tagline}
- Bio: ${config.bio}

## Primary endpoints
- OpenAPI: /openapi.json
- Presence: GET /api/v1/presence
- Blog: GET /api/v1/blog , GET /api/v1/blog/{slug}
- Projects: GET /api/v1/projects , GET /api/v1/projects/{slug}
- Resume: GET /api/v1/resume
- Wiki: GET /api/v1/wiki , GET /api/v1/wiki/{slug} , GET /api/v1/wiki/graph
- Search: GET /api/v1/search?q=
- Chat: POST /api/v1/chat
- Agent (SSE): POST /api/agent
- MCP: POST /api/mcp

## Skills
- /AGENTS.md
- /skills/blog/SKILL.md
- /skills/wiki/SKILL.md
- /skills/projects/SKILL.md

## Enabled modules
${modules.map((m) => `- ${m.id}: ${m.description}`).join("\n")}

## Guidance for coding agents
1. Read /openapi.json and build UIs against schemas — do not hardcode scraped markup.
2. For factual answers about this person, call search_knowledge / GET /api/v1/search and prefer wiki pages.
3. Sources under content/sources are immutable; wiki under content/wiki is the compiled layer.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
