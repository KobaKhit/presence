import Link from "next/link";
import type { Metadata } from "next";
import { WikiGraphViz } from "@/components/wiki-graph-viz";
import { getWikiPages } from "@/lib/content/loaders";
import { getKnowledgeProvider } from "@/lib/knowledge";

export const metadata: Metadata = { title: "Wiki" };

export default async function WikiIndexPage() {
  const [pages, graph] = await Promise.all([
    getWikiPages(),
    getKnowledgeProvider().getGraph(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
      <div className="max-w-2xl">
        <h1 className="font-[family-name:var(--font-syne)] text-4xl tracking-tight text-ink md:text-5xl">
          Wiki
        </h1>
        <p className="mt-3 text-muted">
          Compiled knowledge — denser than sources, linked like a graph. Drag nodes; click to open a page.
        </p>
      </div>

      <div className="mt-10">
        <WikiGraphViz graph={graph} height={440} />
      </div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <li key={page.slug}>
            <Link
              href={`/wiki/${page.slug}`}
              className="block h-full rounded-2xl border border-line bg-white/55 p-5 transition hover:border-accent/40"
            >
              <span className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.16em] text-accent">
                {page.type}
              </span>
              <h2 className="mt-2 font-[family-name:var(--font-syne)] text-xl text-ink">
                {page.title}
              </h2>
              <p className="mt-2 text-sm text-ink-soft">{page.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
