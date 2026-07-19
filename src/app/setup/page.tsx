"use client";

import { useState } from "react";
import Link from "next/link";

const steps = [
  {
    title: "Name & bio",
    body: "Edit content/presence.config.ts — name, tagline, social links, theme accents.",
  },
  {
    title: "Add sources",
    body: "Drop markdown or HTML into content/sources/entries/ (type: post|project|visual). Use a folder with index.md for visuals that need sibling assets. Keep resume.md updated.",
  },
  {
    title: "Compile wiki",
    body: "Run npm run presence -- compile (or use the button below in local/dev). Review generated pages, then commit.",
  },
];

export default function SetupPage() {
  const [step, setStep] = useState(0);
  const [compileMsg, setCompileMsg] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);

  async function compileWiki() {
    setCompiling(true);
    setCompileMsg(null);
    try {
      const res = await fetch("/api/v1/admin/compile", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setCompileMsg(data.error ?? "Compile failed");
      } else {
        setCompileMsg(
          `Compiled graph: ${data.pageCount} pages, ${data.linkCount} links. ${data.note ?? ""}`,
        );
      }
    } catch {
      setCompileMsg("Could not reach compile endpoint.");
    } finally {
      setCompiling(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 md:px-8">
      <h1 className="font-[family-name:var(--font-syne)] text-4xl tracking-tight text-ink">
        Setup
      </h1>
      <p className="mt-3 text-muted">
        First-run onboarding for one-click deploys that never opened a terminal.
      </p>

      <ol className="mt-10 space-y-4">
        {steps.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                step === i
                  ? "border-accent bg-white shadow-[var(--shadow)]"
                  : "border-line bg-white/40 hover:border-accent/30"
              }`}
            >
              <span className="font-[family-name:var(--font-jetbrains)] text-xs text-accent">
                Step {i + 1}
              </span>
              <h2 className="mt-1 font-[family-name:var(--font-syne)] text-xl text-ink">
                {s.title}
              </h2>
              <p className="mt-2 text-sm text-ink-soft">{s.body}</p>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-2xl border border-line bg-white/60 p-5">
        <h3 className="font-[family-name:var(--font-syne)] text-lg">Compile wiki</h3>
        <p className="mt-2 text-sm text-muted">
          Rebuilds the link graph from <code>content/wiki</code>. Full LLM entity extraction runs via{" "}
          <code>npm run presence -- compile</code> when <code>OPENROUTER_API_KEY</code> (preferred) or{" "}
          <code>OPENAI_API_KEY</code> is set.
        </p>
        <button
          type="button"
          onClick={compileWiki}
          disabled={compiling}
          className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-bright disabled:opacity-60"
        >
          {compiling ? "Compiling…" : "Compile wiki"}
        </button>
        {compileMsg && <p className="mt-3 text-sm text-ink-soft">{compileMsg}</p>}
      </div>

      <p className="mt-8 text-sm text-muted">
        Next: explore the <Link href="/wiki" className="text-accent hover:underline">wiki</Link> or{" "}
        <Link href="/chat" className="text-accent hover:underline">chat</Link>.
      </p>
    </div>
  );
}
