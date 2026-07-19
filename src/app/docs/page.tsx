import type { Metadata } from "next";
import Link from "next/link";
import fs from "fs/promises";
import path from "path";

export const metadata: Metadata = { title: "Docs" };

const DOCS = [
  { slug: "entries", title: "Entries (content)", file: "entries.md" },
  { slug: "knowledge", title: "Knowledge layer", file: "knowledge.md" },
  { slug: "vector-store", title: "Vector store", file: "vector-store.md" },
  { slug: "deploy", title: "Deploy & CI", file: "deploy.md" },
  { slug: "agents", title: "Agents & MCP", file: "agents.md" },
] as const;

async function readDoc(file: string): Promise<string> {
  try {
    return await fs.readFile(path.join(process.cwd(), "docs", file), "utf-8");
  } catch {
    return "_Doc missing — see `/docs` folder in the repo._";
  }
}

export default async function DocsPage({
  searchParams,
}: {
  searchParams?: Promise<{ doc?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const active = DOCS.find((d) => d.slug === params.doc) ?? DOCS[0];
  const body = await readDoc(active.file);

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:px-8">
      <h1 className="font-[family-name:var(--font-syne)] text-4xl tracking-tight text-ink">
        Docs
      </h1>
      <p className="mt-3 text-muted">
        Essential operator guides. Full markdown lives in the repo under <code>docs/</code>.
      </p>

      <nav className="mt-8 flex flex-wrap gap-2">
        {DOCS.map((d) => (
          <Link
            key={d.slug}
            href={`/docs?doc=${d.slug}`}
            className={`rounded-full px-4 py-1.5 text-sm ${
              d.slug === active.slug
                ? "bg-accent text-white"
                : "border border-line bg-white/50 text-ink-soft hover:border-accent/40"
            }`}
          >
            {d.title}
          </Link>
        ))}
      </nav>

      <article className="prose-presence mt-10 whitespace-pre-wrap font-[family-name:var(--font-geist-sans)] text-sm leading-relaxed text-ink-soft">
        {body}
      </article>

      <p className="mt-10 text-sm text-muted">
        Also: <Link href="/setup" className="text-accent hover:underline">Setup</Link>
        {" · "}
        <Link href="/deploy" className="text-accent hover:underline">Deploy</Link>
        {" · "}
        <a href="/llms.txt" className="text-accent hover:underline">
          llms.txt
        </a>
      </p>
    </div>
  );
}
