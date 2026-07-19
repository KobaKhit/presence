import { NextResponse } from "next/server";
import { getBlogPosts, getProjects, getResume, getWikiPage, getWikiPages } from "@/lib/content/loaders";
import { getPresenceConfig } from "@/lib/config";
import { getKnowledgeProvider } from "@/lib/knowledge";

export const runtime = "nodejs";

const TOOLS = [
  {
    name: "get_presence",
    description: "Get site owner identity (name, bio, social)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_resume",
    description: "Get resume markdown",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_projects",
    description: "List projects",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_blog_posts",
    description: "List blog posts",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_wiki_pages",
    description: "List wiki page summaries",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_wiki_page",
    description: "Fetch a compiled wiki page by slug",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
  },
  {
    name: "search_knowledge",
    description: "Hybrid wiki+source search with vector + graph expansion",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "number" } },
      required: ["query"],
    },
  },
  {
    name: "contact",
    description:
      "Rate-limited contact helper — returns a mailto payload for the site owner (does not send email)",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["subject", "body"],
    },
  },
] as const;

/** Simple in-memory rate limit for contact (per isolate). */
const contactHits = new Map<string, number[]>();
const CONTACT_WINDOW_MS = 60_000;
const CONTACT_MAX = 5;

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anon"
  );
}

function allowContact(key: string): boolean {
  const now = Date.now();
  const prev = (contactHits.get(key) ?? []).filter((t) => now - t < CONTACT_WINDOW_MS);
  if (prev.length >= CONTACT_MAX) {
    contactHits.set(key, prev);
    return false;
  }
  prev.push(now);
  contactHits.set(key, prev);
  return true;
}

/**
 * Streamable-HTTP style MCP endpoint (JSON-RPC).
 * Tools share the same service layer as REST + agent.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON-RPC body" }, { status: 400 });
  }

  const { method, params, id } = body as {
    method?: string;
    params?: Record<string, unknown>;
    id?: string | number | null;
  };

  if (method === "initialize") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id: id ?? null,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "presence-mcp", version: "0.2.0" },
        instructions:
          "Presence personal site MCP. Prefer search_knowledge and get_wiki_page for grounded answers.",
      },
    });
  }

  if (method === "notifications/initialized" || method === "initialized") {
    return new NextResponse(null, { status: 204 });
  }

  if (method === "ping") {
    return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result: {} });
  }

  if (method === "tools/list") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id: id ?? null,
      result: { tools: TOOLS },
    });
  }

  if (method === "tools/call") {
    const name = params?.name as string | undefined;
    const args = (params?.arguments ?? {}) as Record<string, unknown>;
    try {
      const result = await callTool(name ?? "", args, request);
      return NextResponse.json({
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        },
      });
    } catch (err) {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: id ?? null,
        error: { code: -32000, message: err instanceof Error ? err.message : "Tool error" },
      });
    }
  }

  return NextResponse.json({
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
}

export async function GET() {
  return NextResponse.json({
    name: "presence-mcp",
    version: "0.2.0",
    transport: "json-rpc-over-http",
    endpoint: "/api/mcp",
    tools: TOOLS.map((t) => t.name),
  });
}

async function callTool(name: string, args: Record<string, unknown>, request: Request) {
  const config = getPresenceConfig();
  switch (name) {
    case "get_presence":
      return {
        name: config.name,
        fullName: config.fullName,
        tagline: config.tagline,
        bio: config.bio,
        location: config.location,
        website: config.website,
        social: config.social,
      };
    case "get_resume":
      return await getResume();
    case "list_projects": {
      const projects = await getProjects();
      return projects.map(({ slug, title, summary, tags, status, url }) => ({
        slug,
        title,
        summary,
        tags,
        status,
        url,
      }));
    }
    case "list_blog_posts": {
      const posts = await getBlogPosts();
      return posts.map(({ slug, title, date, summary, tags }) => ({
        slug,
        title,
        date,
        summary,
        tags,
      }));
    }
    case "list_wiki_pages": {
      const pages = await getWikiPages();
      return pages.map(({ slug, title, summary, type, links, contradictions }) => ({
        slug,
        title,
        summary,
        type,
        links,
        contradictions: contradictions ?? [],
      }));
    }
    case "get_wiki_page": {
      const slug = String(args.slug ?? "");
      const page = await getWikiPage(slug);
      if (!page) throw new Error(`Wiki page not found: ${slug}`);
      return page;
    }
    case "search_knowledge": {
      const query = String(args.query ?? "");
      const limit = typeof args.limit === "number" ? args.limit : 8;
      const provider = getKnowledgeProvider();
      return await provider.search(query, { limit, expandHops: 1 });
    }
    case "contact": {
      if (!allowContact(clientKey(request))) {
        throw new Error("Rate limit exceeded for contact (max 5/min)");
      }
      const subject = String(args.subject ?? "").slice(0, 200);
      const body = String(args.body ?? "").slice(0, 4000);
      if (!subject || !body) throw new Error("subject and body required");
      const email = config.email;
      if (!email) throw new Error("Site owner has not configured an email");
      const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      return {
        ok: true,
        email,
        mailto,
        note: "Presence does not send email; open the mailto link or copy the payload.",
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
