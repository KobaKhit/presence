import type { Metadata } from "next";
import { ChatPanel } from "@/components/chat-panel";

export const metadata: Metadata = { title: "Chat" };

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:px-8">
      <h1 className="font-[family-name:var(--font-syne)] text-4xl tracking-tight text-ink md:text-5xl">
        Chat
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        Grounded in the compiled wiki with graph-expanded retrieval. Works without an API key in extractive mode.
      </p>
      <div className="mt-10">
        <ChatPanel />
      </div>
    </div>
  );
}
