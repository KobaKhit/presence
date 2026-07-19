"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { streamChat, type ChatSource } from "@/lib/chat/stream-chat";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  streaming?: boolean;
}

const QUICK_ACTIONS = [
  { label: "Wiki", href: "/wiki", prompt: null },
  { label: "Projects", href: "/projects", prompt: null },
  { label: "Writing", href: "/blog", prompt: null },
  {
    label: "What do you work on?",
    href: null,
    prompt: "What does Koba work on? Summarize from the wiki.",
  },
  {
    label: "Linear optimization",
    href: null,
    prompt:
      "Explain linear optimization in Koba's work and link related wiki pages.",
  },
];

function sourceHref(s: ChatSource): string {
  if (s.href) return s.href;
  if (s.kind === "wiki") return `/wiki/${s.slug}`;
  if (s.slug.startsWith("entries/")) {
    return `/blog/${s.slug.replace(/^entries\//, "")}`;
  }
  return `/wiki/${s.slug}`;
}

export function FloatingChat() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi — ask about projects, posts, or the wiki. I can also help you get around the site.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hidden = pathname === "/chat";

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }, [open, messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const next: Message[] = [...messages, { role: "user", content: trimmed }];
      setMessages([
        ...next,
        { role: "assistant", content: "", streaming: true },
      ]);
      setInput("");
      setLoading(true);

      try {
        const result = await streamChat({
          messages: next.map(({ role, content }) => ({ role, content })),
          signal: ac.signal,
          onMeta: (meta) => {
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant") {
                copy[copy.length - 1] = {
                  ...last,
                  sources: meta.sources,
                  streaming: true,
                };
              }
              return copy;
            });
          },
          onDelta: (delta) => {
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant") {
                copy[copy.length - 1] = {
                  ...last,
                  content: last.content + delta,
                  streaming: true,
                };
              }
              return copy;
            });
          },
        });

        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = {
              role: "assistant",
              content: result.content || last.content,
              sources: result.sources,
              streaming: false,
            };
          }
          return copy;
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant" && last.streaming) {
            copy[copy.length - 1] = {
              role: "assistant",
              content:
                last.content ||
                "Couldn’t reach the chat API. Is the server running?",
              streaming: false,
            };
          } else {
            copy.push({
              role: "assistant",
              content: "Couldn’t reach the chat API. Is the server running?",
            });
          }
          return copy;
        });
      } finally {
        setLoading(false);
      }
    },
    [loading, messages],
  );

  function onQuick(action: (typeof QUICK_ACTIONS)[number]) {
    if (action.href) {
      router.push(action.href);
      setOpen(false);
      return;
    }
    if (action.prompt) {
      setOpen(true);
      void send(action.prompt);
    }
  }

  if (hidden) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 md:bottom-8 md:right-8">
      {open && (
        <div className="pointer-events-auto flex h-[min(560px,calc(100vh-7rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_20px_60px_rgba(13,27,42,0.18)] ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-line bg-ink px-4 py-3 text-paper">
            <div>
              <p className="font-[family-name:var(--font-syne)] text-sm font-semibold">
                Ask Koba
              </p>
              <p className="text-[11px] text-white/55">Wiki-grounded · streaming</p>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/chat"
                className="rounded-lg px-2 py-1 text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white"
                onClick={() => setOpen(false)}
              >
                Expand
              </Link>
              <button
                type="button"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto border-b border-line bg-white/50 px-3 py-2">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => onQuick(a)}
                className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-ink-soft transition hover:border-accent/40 hover:text-accent"
              >
                {a.label}
              </button>
            ))}
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`max-w-[92%] rounded-2xl px-3 py-2.5 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-ink text-paper"
                    : "bg-white text-ink-soft ring-1 ring-line"
                }`}
              >
                <div className="whitespace-pre-wrap">
                  {m.content}
                  {m.streaming && (
                    <span className="ml-0.5 inline-block h-[1em] w-1.5 animate-pulse bg-accent align-middle" />
                  )}
                </div>
                {m.sources && m.sources.length > 0 && !m.streaming && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-2">
                    {m.sources.slice(0, 4).map((s) => (
                      <Link
                        key={`${s.kind}-${s.slug}`}
                        href={sourceHref(s)}
                        onClick={() => setOpen(false)}
                        className="rounded-full bg-paper-deep px-2 py-0.5 text-[11px] text-accent hover:bg-accent/10"
                      >
                        {s.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && messages[messages.length - 1]?.content === "" && (
              <p className="animate-pulse text-xs text-muted">Searching knowledge…</p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex gap-2 border-t border-line bg-white/80 p-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-bright disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_12px_32px_rgba(15,118,110,0.45)] transition hover:scale-105 hover:bg-accent-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright focus-visible:ring-offset-2"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
