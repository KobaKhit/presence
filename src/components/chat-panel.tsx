"use client";

import { useState } from "react";
import Link from "next/link";
import { streamChat, type ChatSource } from "@/lib/chat/stream-chat";

interface WikiProposal {
  title: string;
  slug: string;
  summary: string;
  type: "concept" | "entity" | "hub";
  content: string;
  sources: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  mode?: string;
  provider?: string;
  canProposeWiki?: boolean;
  question?: string;
  streaming?: boolean;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ask a multi-hop question — e.g. how optimization work influenced NBA analysis. I’ll ground answers in the compiled wiki.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<WikiProposal | null>(null);
  const [proposalBusy, setProposalBusy] = useState(false);
  const [proposalNote, setProposalNote] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages([
      ...next,
      { role: "assistant", content: "", streaming: true, question: text },
    ]);
    setInput("");
    setLoading(true);
    setProposal(null);
    setProposalNote(null);

    try {
      const result = await streamChat({
        messages: next
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map(({ role, content }) => ({ role, content })),
        onMeta: (meta) => {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              copy[copy.length - 1] = {
                ...last,
                sources: meta.sources,
                mode: meta.mode,
                provider: meta.provider,
                canProposeWiki: meta.canProposeWiki,
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
            mode: result.mode,
            provider: result.provider,
            canProposeWiki: Boolean(result.canProposeWiki),
            question: text,
            streaming: false,
          };
        }
        return copy;
      });
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant" && last.streaming) {
          copy[copy.length - 1] = {
            role: "assistant",
            content: last.content || "Request failed. Is the dev server running?",
            streaming: false,
          };
        } else {
          copy.push({
            role: "assistant",
            content: "Request failed. Is the dev server running?",
          });
        }
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  async function proposeFromMessage(m: Message) {
    if (!m.question || proposalBusy) return;
    setProposalBusy(true);
    setProposalNote(null);
    try {
      const res = await fetch("/api/v1/wiki/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: m.question,
          answer: m.content,
          sourceSlugs: m.sources?.map((s) => s.slug) ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProposalNote(data.error ?? "Propose failed");
        return;
      }
      setProposal(data.proposal as WikiProposal);
    } catch {
      setProposalNote("Could not reach propose endpoint.");
    } finally {
      setProposalBusy(false);
    }
  }

  async function saveProposal(approved: boolean) {
    if (!proposal || proposalBusy) return;
    setProposalBusy(true);
    setProposalNote(null);
    try {
      const res = await fetch("/api/v1/wiki/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal, approved }),
      });
      const data = await res.json();
      if (!approved) {
        setProposal(null);
        setProposalNote("Discarded proposal.");
        return;
      }
      if (!res.ok || !data.ok) {
        setProposalNote(data.error ?? "Save failed");
        return;
      }
      setProposalNote(`Saved wiki page: ${data.path}`);
      setProposal(null);
    } catch {
      setProposalNote("Could not save wiki page.");
    } finally {
      setProposalBusy(false);
    }
  }

  return (
    <div className="flex min-h-[520px] flex-col overflow-hidden rounded-3xl border border-line bg-white/60 shadow-[var(--shadow)]">
      <div className="flex-1 space-y-4 overflow-y-auto p-5 md:p-6">
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed md:text-[15px] ${
              m.role === "user"
                ? "ml-auto bg-ink text-paper"
                : "bg-white/80 text-ink-soft ring-1 ring-line"
            }`}
          >
            <div className="whitespace-pre-wrap">
              {m.content}
              {m.streaming && (
                <span className="ml-0.5 inline-block h-[1em] w-1.5 animate-pulse bg-accent align-middle" />
              )}
            </div>
            {m.sources && m.sources.length > 0 && !m.streaming && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                {m.sources.slice(0, 4).map((s) => (
                  <Link
                    key={s.slug}
                    href={
                      s.href ??
                      (s.kind === "wiki" ? `/wiki/${s.slug}` : `/wiki`)
                    }
                    className="rounded-full bg-paper-deep px-2.5 py-1 text-xs text-accent hover:bg-accent/10"
                  >
                    {s.title}
                  </Link>
                ))}
                {m.mode && (
                  <span className="rounded-full px-2.5 py-1 text-xs text-muted">
                    {m.mode}
                    {m.provider && m.provider !== "none" ? ` · ${m.provider}` : ""}
                  </span>
                )}
              </div>
            )}
            {m.role === "assistant" && m.canProposeWiki && m.question && !m.streaming && (
              <button
                type="button"
                disabled={proposalBusy}
                onClick={() => proposeFromMessage(m)}
                className="mt-3 text-xs font-medium text-accent hover:underline disabled:opacity-60"
              >
                Propose wiki page…
              </button>
            )}
          </div>
        ))}
        {loading && messages[messages.length - 1]?.content === "" && (
          <p className="animate-pulse text-sm text-muted">Searching wiki graph…</p>
        )}

        {proposal && (
          <div className="rounded-2xl border border-accent/30 bg-white p-4 ring-1 ring-accent/20">
            <h3 className="font-[family-name:var(--font-syne)] text-lg text-ink">
              Approve wiki save-back
            </h3>
            <p className="mt-1 text-xs text-muted">
              {proposal.slug}.md · {proposal.type}
            </p>
            <input
              value={proposal.title}
              onChange={(e) => setProposal({ ...proposal, title: e.target.value })}
              className="mt-3 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            />
            <textarea
              value={proposal.content}
              onChange={(e) => setProposal({ ...proposal, content: e.target.value })}
              rows={10}
              className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs leading-relaxed"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={proposalBusy}
                onClick={() => saveProposal(true)}
                className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-bright disabled:opacity-60"
              >
                Approve & save
              </button>
              <button
                type="button"
                disabled={proposalBusy}
                onClick={() => saveProposal(false)}
                className="rounded-full border border-line px-4 py-2 text-xs text-muted hover:border-accent/40 disabled:opacity-60"
              >
                Discard
              </button>
            </div>
          </div>
        )}
        {proposalNote && <p className="text-sm text-ink-soft">{proposalNote}</p>}
      </div>
      <form
        onSubmit={onSubmit}
        className="flex gap-2 border-t border-line bg-white/70 p-3 md:p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="How did optimization influence NBA analysis?"
          className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none ring-accent focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-bright disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
