import { getKnowledgeProvider } from "@/lib/knowledge";
import { getPresenceConfig } from "@/lib/config";
import { llmGenerateText, getLlmStatus } from "@/lib/llm";

export const runtime = "nodejs";

/**
 * Lightweight AG-UI-style SSE agent endpoint.
 * Uses the same LLM provider stack as /api/v1/chat when a key is configured.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message =
    typeof body.message === "string"
      ? body.message
      : Array.isArray(body.messages)
        ? [...body.messages].reverse().find((m: { role?: string }) => m.role === "user")
            ?.content
        : "";

  if (!message || typeof message !== "string") {
    return new Response(JSON.stringify({ error: "message required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("RUN_STARTED", { threadId: "presence", runId: crypto.randomUUID() });

      const provider = getKnowledgeProvider();
      send("TOOL_CALL_START", { toolCallId: "1", toolCallName: "search_knowledge" });
      const ctx = await provider.getChatContext(message);
      send("TOOL_CALL_END", {
        toolCallId: "1",
        result: ctx.documents.slice(0, 4).map((d) => ({
          title: d.title,
          slug: d.slug,
          kind: d.kind,
        })),
      });

      const config = getPresenceConfig();
      const contextBlock = ctx.documents
        .slice(0, 6)
        .map(
          (d) =>
            `### ${d.title} (${d.kind}:${d.slug})\n${d.summary}\n\n${d.content.slice(0, 800)}`,
        )
        .join("\n\n");

      let text: string;
      const status = getLlmStatus();
      if (status.configured) {
        try {
          const generated = await llmGenerateText({
            system: `You are the on-site agent for ${config.fullName}'s personal site.
Answer from wiki/source context. Be concise; cite page titles.`,
            prompt: `Context:\n${contextBlock}\n\nUser:\n${message}`,
          });
          text =
            generated?.text ??
            `LLM (${status.provider}) returned empty. Try /wiki.`;
        } catch {
          text = extractiveReply(ctx.documents, message);
        }
      } else {
        text = extractiveReply(ctx.documents, message);
      }

      send("TEXT_MESSAGE_START", { messageId: "m1", role: "assistant" });
      const chunkSize = 48;
      for (let i = 0; i < text.length; i += chunkSize) {
        send("TEXT_MESSAGE_CONTENT", {
          messageId: "m1",
          delta: text.slice(i, i + chunkSize),
        });
      }
      send("TEXT_MESSAGE_END", { messageId: "m1" });
      send("RUN_FINISHED", {
        threadId: "presence",
        runId: "done",
        presence: config.name,
        provider: status.provider,
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function extractiveReply(
  documents: {
    kind: string;
    title: string;
    summary: string;
    content: string;
    slug: string;
  }[],
  message: string,
): string {
  const top = documents.filter((d) => d.kind === "wiki").slice(0, 3);
  if (top.length === 0) {
    return `No strong wiki matches for “${message}”. Try /wiki or ask about optimization, NBA analytics, or Presence.`;
  }
  return [
    `Grounded answer from the compiled wiki:`,
    "",
    ...top.map(
      (d) =>
        `**${d.title}** — ${d.summary || d.content.slice(0, 200).replace(/\n/g, " ")}`,
    ),
    "",
    `Explore: /wiki/${top[0].slug}`,
  ].join("\n");
}
