export interface ChatSource {
  title: string;
  kind: string;
  slug: string;
  summary: string;
  href?: string;
}

export interface StreamChatResult {
  content: string;
  sources: ChatSource[];
  mode?: string;
  provider?: string;
  model?: string;
  canProposeWiki?: boolean;
}

/**
 * POST /api/v1/chat with stream:true and consume SSE meta/delta/done events.
 */
export async function streamChat(options: {
  messages: { role: string; content: string }[];
  onDelta: (text: string) => void;
  onMeta?: (meta: {
    sources: ChatSource[];
    mode?: string;
    provider?: string;
    model?: string;
    canProposeWiki?: boolean;
  }) => void;
  signal?: AbortSignal;
}): Promise<StreamChatResult> {
  const res = await fetch("/api/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ messages: options.messages, stream: true }),
    signal: options.signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Chat failed" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  if (!res.body) {
    throw new Error("No response body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let sources: ChatSource[] = [];
  let mode: string | undefined;
  let provider: string | undefined;
  let model: string | undefined;
  let canProposeWiki = false;
  let eventName = "message";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";

    for (const line of parts) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
        continue;
      }
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (eventName === "meta") {
        sources = (data.sources as ChatSource[]) ?? [];
        mode = data.mode as string | undefined;
        provider = data.provider as string | undefined;
        model = data.model as string | undefined;
        canProposeWiki = Boolean(data.canProposeWiki);
        options.onMeta?.({ sources, mode, provider, model, canProposeWiki });
      } else if (eventName === "delta" && typeof data.text === "string") {
        content += data.text;
        options.onDelta(data.text);
      } else if (eventName === "done") {
        content = (data.content as string) ?? content;
        sources = (data.sources as ChatSource[]) ?? sources;
        mode = (data.mode as string) ?? mode;
        provider = (data.provider as string) ?? provider;
        model = (data.model as string) ?? model;
        canProposeWiki = Boolean(data.canProposeWiki);
      } else if (eventName === "error") {
        throw new Error((data.message as string) ?? "Stream error");
      }
    }
  }

  return { content, sources, mode, provider, model, canProposeWiki };
}
