"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import {
  streamChat,
  type ChatSource,
  type NavigationAction,
} from "@/lib/chat/stream-chat";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  navigation?: NavigationAction | null;
  streaming?: boolean;
}

function sourceHref(s: ChatSource): string {
  if (s.href) return s.href;
  if (s.kind === "wiki") return `/wiki/${s.slug}`;
  if (s.slug.startsWith("entries/")) {
    return `/blog/${s.slug.replace(/^entries\//, "")}`;
  }
  return `/wiki/${s.slug}`;
}

export function FloatingChat({
  siteName,
  enabled = true,
}: {
  siteName: string;
  enabled?: boolean;
}) {
  const router = useRouter();
  const { autoNavigate, setAutoNavigate } = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi — ask about ${siteName}'s projects, posts, or wiki. I can also help you navigate the site.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoNavigateRef = useRef(autoNavigate);

  useEffect(() => {
    autoNavigateRef.current = autoNavigate;
  }, [autoNavigate]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }, [open, messages, loading]);

  const applyNavigation = useCallback(
    (action: NavigationAction | null | undefined) => {
      if (!action?.href) return;
      if (autoNavigateRef.current && action.explicit) {
        router.push(action.href);
        setOpen(false);
      }
    },
    [router],
  );

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
          autoNavigate: autoNavigateRef.current,
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
          onNavigation: (action) => {
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant") {
                copy[copy.length - 1] = { ...last, navigation: action };
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
              navigation: result.navigation ?? last.navigation,
              streaming: false,
            };
          }
          return copy;
        });

        applyNavigation(result.navigation);
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
    [applyNavigation, loading, messages],
  );

  const quickActions = [
    { label: "Wiki", href: "/wiki", prompt: null as string | null },
    { label: "Projects", href: "/projects", prompt: null },
    { label: "Writing", href: "/blog", prompt: null },
    {
      label: "What do you work on?",
      href: null,
      prompt: `What does ${siteName} work on? Summarize from the wiki and projects.`,
    },
    {
      label: "Show a visual",
      href: null,
      prompt: "Take me to the visuals section and mention a featured interactive.",
    },
  ];

  function onQuick(action: (typeof quickActions)[number]) {
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

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 md:bottom-8 md:right-8">
      {open && (
        <div className="pointer-events-auto flex h-[min(560px,calc(100vh-7rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-[var(--shadow)] ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-line bg-ink px-4 py-3 text-paper">
            <div>
              <p className="font-[family-name:var(--font-syne)] text-sm font-semibold">
                Ask {siteName}
              </p>
              <p className="text-[11px] text-white/55">
                Wiki-grounded · can navigate the site
              </p>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-line bg-white/40 px-3 py-2 dark:bg-white/5">
            <div className="flex gap-1.5 overflow-x-auto">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => onQuick(a)}
                  className="shrink-0 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-ink-soft transition hover:border-accent/40 hover:text-accent"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 border-b border-line px-3 py-2 text-[11px] text-muted">
            <input
              type="checkbox"
              checked={autoNavigate}
              onChange={(e) => setAutoNavigate(e.target.checked)}
              className="rounded border-line accent-[var(--accent)]"
            />
            Auto-navigate on explicit requests
          </label>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`max-w-[92%] rounded-2xl px-3 py-2.5 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-ink text-paper"
                    : "bg-surface text-ink-soft ring-1 ring-line"
                }`}
              >
                <div className="whitespace-pre-wrap">
                  {m.content}
                  {m.streaming && (
                    <span className="ml-0.5 inline-block h-[1em] w-1.5 animate-pulse bg-accent align-middle" />
                  )}
                </div>
                {m.navigation && !m.streaming && (
                  <button
                    type="button"
                    onClick={() => {
                      router.push(m.navigation!.href);
                      setOpen(false);
                    }}
                    className="mt-2 flex w-full flex-col rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-left transition hover:bg-accent/15"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                      Go to {m.navigation.label}
                    </span>
                    {m.navigation.reason && (
                      <span className="mt-0.5 text-[11px] text-muted">
                        {m.navigation.reason}
                      </span>
                    )}
                  </button>
                )}
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
            className="flex gap-2 border-t border-line bg-surface/80 p-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask or say “take me to projects”…"
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
