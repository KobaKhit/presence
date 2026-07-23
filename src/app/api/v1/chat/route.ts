import { NextResponse } from "next/server";
import { ChatRequestSchema, NavigationActionSchema } from "@/lib/api/schemas";
import { getPresenceConfig } from "@/lib/config";
import { getEntry } from "@/lib/content/entries";
import { getKnowledgeProvider } from "@/lib/knowledge";
import {
  describeLlmForHumans,
  getLlmStatus,
  llmGenerateText,
  llmStreamText,
} from "@/lib/llm";
import {
  looksLikeExplicitNavigation,
  sanitizeNavigationAction,
  type NavigationAction,
} from "@/lib/publishing";
import { z } from "zod";

export const runtime = "nodejs";

const ChatBodySchema = ChatRequestSchema.extend({
  stream: z.boolean().optional(),
});

async function hrefForDoc(kind: string, slug: string): Promise<string> {
  if (kind === "wiki") return `/wiki/${slug}`;
  const entrySlug = slug.startsWith("entries/")
    ? slug.slice("entries/".length)
    : slug.includes("/")
      ? slug.split("/").pop()!
      : slug;
  const entry = await getEntry(entrySlug);
  if (entry?.type === "post") return `/blog/${entry.slug}`;
  if (entry?.type === "visual") return `/visuals/${entry.slug}`;
  if (entry?.type === "project") return `/projects/${entry.slug}`;
  if (slug.startsWith("blog/")) return `/${slug}`;
  if (slug.startsWith("projects/")) return `/${slug}`;
  return `/wiki`;
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function buildContext(lastUserContent: string) {
  const provider = getKnowledgeProvider();
  const ctx = await provider.getChatContext(lastUserContent);
  const sources = await Promise.all(
    ctx.documents.slice(0, 6).map(async (d) => ({
      title: d.title,
      kind: d.kind,
      slug: d.slug,
      summary: d.summary,
      href: await hrefForDoc(d.kind, d.slug),
    })),
  );
  const contextBlock = ctx.documents
    .slice(0, 6)
    .map(
      (d) =>
        `### ${d.title} (${d.kind}:${d.slug})\n${d.summary}\n\n${d.content.slice(0, 1200)}`,
    )
    .join("\n\n---\n\n");
  return { ctx, sources, contextBlock };
}

function extractiveContent(
  documents: { kind: string; title: string; summary: string; content: string; slug: string }[],
  question: string,
  fullName: string,
): string {
  const top = documents.filter((d) => d.kind === "wiki").slice(0, 3);
  if (top.length === 0) {
    return `I searched ${fullName}'s knowledge base for “${question}” but didn't find strong matches. Try the Wiki or ask about projects, writing, or Presence.`;
  }
  return [
    `Based on the compiled wiki (no LLM key configured — grounded extractive mode):`,
    "",
    ...top.map(
      (d) =>
        `**${d.title}** — ${d.summary || d.content.slice(0, 220).replace(/\n/g, " ")}…`,
    ),
    "",
    top.length > 1
      ? `These pages are linked in the knowledge graph; open [/wiki/${top[0].slug}](/wiki/${top[0].slug}) to explore connections.`
      : `Read more: [/wiki/${top[0].slug}](/wiki/${top[0].slug}).`,
    "",
    `_${describeLlmForHumans()}_`,
  ].join("\n");
}

function inferNavigation(
  question: string,
  sources: { title: string; href?: string; kind: string }[],
): NavigationAction | null {
  const explicit = looksLikeExplicitNavigation(question);
  const q = question.toLowerCase();

  const routeHints: { re: RegExp; href: string; label: string }[] = [
    { re: /\b(home|start|landing)\b/, href: "/", label: "Home" },
    { re: /\b(blog|writing|posts?)\b/, href: "/blog", label: "Blog" },
    { re: /\bprojects?\b/, href: "/projects", label: "Projects" },
    { re: /\bvisuals?\b/, href: "/visuals", label: "Visuals" },
    { re: /\bwiki\b/, href: "/wiki", label: "Wiki" },
    { re: /\bresume\b/, href: "/resume", label: "Resume" },
    { re: /\b(docs?|documentation)\b/, href: "/docs", label: "Docs" },
    { re: /\bdeploy\b/, href: "/deploy", label: "Deploy" },
  ];

  for (const hint of routeHints) {
    if (hint.re.test(q)) {
      return sanitizeNavigationAction({
        href: hint.href,
        label: hint.label,
        reason: explicit ? `You asked to open ${hint.label}.` : `Related section: ${hint.label}`,
        confidence: explicit ? "high" : "medium",
        explicit,
      });
    }
  }

  const top = sources.find((s) => s.href);
  if (top?.href) {
    return sanitizeNavigationAction({
      href: top.href,
      label: top.title,
      reason: explicit
        ? `Opening the best match for your request.`
        : `Top related page from the knowledge base.`,
      confidence: explicit ? "high" : "low",
      explicit,
    });
  }

  return null;
}

function parseNavigationFromModel(text: string): NavigationAction | null {
  const match = text.match(/<<nav\s+(\{[\s\S]*?\})\s*>>/);
  if (!match) return null;
  try {
    const parsed = NavigationActionSchema.safeParse(JSON.parse(match[1]));
    if (!parsed.success) return null;
    return sanitizeNavigationAction(parsed.data);
  } catch {
    return null;
  }
}

function stripNavMarker(text: string): string {
  return text.replace(/<<nav\s+\{[\s\S]*?\}\s*>>/g, "").trim();
}

/**
 * Wiki-grounded chat.
 * - Default: JSON response
 * - `{ "stream": true }` or `Accept: text/event-stream`: SSE with meta/delta/done/navigation
 */
export async function POST(request: Request) {
  const config = getPresenceConfig();
  if (!config.modules.chat) {
    return NextResponse.json({ error: "Chat module disabled" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = ChatBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const messages = parsed.data.messages;
  const wantStream =
    parsed.data.stream === true ||
    request.headers.get("accept")?.includes("text/event-stream");

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return NextResponse.json({ error: "No user message" }, { status: 400 });
  }

  const status = getLlmStatus();
  const { ctx, sources, contextBlock } = await buildContext(lastUser.content);
  const explicit = looksLikeExplicitNavigation(lastUser.content);

  const system = `You are the on-site agent for ${config.fullName}'s personal Presence site.
Answer using the provided wiki/source context. Prefer wiki pages for relationships.
Cite page titles inline. If context is insufficient, say so briefly.
Be concise and specific. When helpful, mention paths like /wiki/slug, /blog/slug, /projects/slug, /visuals/slug.
You can suggest in-site navigation. If you recommend a page, append a single marker on its own line:
<<nav {"href":"/path","label":"Short label","reason":"why","confidence":"high|medium|low","explicit":${explicit}}>>
Only use internal paths that exist on this site. Never invent external URLs.`;

  const prompt = `Context:\n${contextBlock}\n\nUser question:\n${lastUser.content}`;

  const fallbackNav = inferNavigation(lastUser.content, sources);

  if (wantStream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(sse(event, data)));
        };

        try {
          if (status.configured) {
            const streamed = await llmStreamText({ system, prompt });
            if (streamed) {
              send("meta", {
                sources,
                mode: "llm",
                provider: streamed.provider,
                model: streamed.model,
                canProposeWiki: true,
              });
              let full = "";
              for await (const delta of streamed.textStream) {
                full += delta;
                send("delta", { text: delta });
              }
              const fromModel = parseNavigationFromModel(full);
              const navigation = fromModel ?? fallbackNav;
              const clean = stripNavMarker(full);
              if (navigation) send("navigation", navigation);
              send("done", {
                role: "assistant",
                content: clean,
                sources,
                mode: "llm",
                provider: streamed.provider,
                model: streamed.model,
                canProposeWiki: true,
                navigation,
              });
              controller.close();
              return;
            }
          }

          const content = extractiveContent(ctx.documents, lastUser.content, config.fullName);
          send("meta", {
            sources,
            mode: "extractive",
            provider: "none",
            canProposeWiki: false,
          });
          const chunk = 24;
          for (let i = 0; i < content.length; i += chunk) {
            send("delta", { text: content.slice(i, i + chunk) });
            await new Promise((r) => setTimeout(r, 8));
          }
          if (fallbackNav) send("navigation", fallbackNav);
          send("done", {
            role: "assistant",
            content,
            sources,
            mode: "extractive",
            provider: "none",
            canProposeWiki: false,
            navigation: fallbackNav,
          });
        } catch (err) {
          console.error("chat stream error", err);
          send("error", {
            message: err instanceof Error ? err.message : "Stream failed",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  if (status.configured) {
    try {
      const generated = await llmGenerateText({ system, prompt });
      if (generated) {
        const fromModel = parseNavigationFromModel(generated.text);
        const navigation = fromModel ?? fallbackNav;
        return NextResponse.json({
          role: "assistant",
          content: stripNavMarker(generated.text),
          sources,
          mode: "llm",
          provider: generated.provider,
          model: generated.model,
          canProposeWiki: true,
          navigation,
        });
      }
    } catch (err) {
      console.error("chat llm error", err);
    }
  }

  return NextResponse.json({
    role: "assistant",
    content: extractiveContent(ctx.documents, lastUser.content, config.fullName),
    sources,
    mode: "extractive",
    provider: "none",
    canProposeWiki: false,
    navigation: fallbackNav,
  });
}
