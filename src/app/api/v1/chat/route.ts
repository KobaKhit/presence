import { NextResponse } from "next/server";
import { ChatRequestSchema } from "@/lib/api/schemas";
import { getPresenceConfig } from "@/lib/config";
import { getEntry } from "@/lib/content/entries";
import { getKnowledgeProvider } from "@/lib/knowledge";
import {
  describeLlmForHumans,
  getLlmStatus,
  llmGenerateText,
  llmStreamText,
} from "@/lib/llm";
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
): string {
  const top = documents.filter((d) => d.kind === "wiki").slice(0, 3);
  if (top.length === 0) {
    return `I searched the knowledge base for “${question}” but didn't find strong matches. Try the Wiki index or ask about optimization, NBA analytics, or Presence.`;
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

/**
 * Wiki-grounded chat.
 * - Default: JSON response
 * - `{ "stream": true }` or `Accept: text/event-stream`: SSE with meta/delta/done events
 */
export async function POST(request: Request) {
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

  const config = getPresenceConfig();
  const status = getLlmStatus();
  const { ctx, sources, contextBlock } = await buildContext(lastUser.content);

  const system = `You are the on-site agent for ${config.fullName}'s personal site (Presence framework).
Answer using the provided wiki/source context. Prefer wiki pages for relationships.
Cite page titles inline. If context is insufficient, say so briefly.
Be concise and specific. When helpful, mention paths like /wiki/slug, /blog/slug, /projects/slug, /visuals/slug.`;
  const prompt = `Context:\n${contextBlock}\n\nUser question:\n${lastUser.content}`;

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
              send("done", {
                role: "assistant",
                content: full,
                sources,
                mode: "llm",
                provider: streamed.provider,
                model: streamed.model,
                canProposeWiki: true,
              });
              controller.close();
              return;
            }
          }

          const content = extractiveContent(ctx.documents, lastUser.content);
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
          send("done", {
            role: "assistant",
            content,
            sources,
            mode: "extractive",
            provider: "none",
            canProposeWiki: false,
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

  // Non-streaming JSON (backward compatible)
  if (status.configured) {
    try {
      const generated = await llmGenerateText({ system, prompt });
      if (generated) {
        return NextResponse.json({
          role: "assistant",
          content: generated.text,
          sources,
          mode: "llm",
          provider: generated.provider,
          model: generated.model,
          canProposeWiki: true,
        });
      }
    } catch (err) {
      console.error("chat llm error", err);
    }
  }

  return NextResponse.json({
    role: "assistant",
    content: extractiveContent(ctx.documents, lastUser.content),
    sources,
    mode: "extractive",
    provider: "none",
    canProposeWiki: false,
  });
}
