import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/markdown-body";
import { getWikiPage, getWikiPages } from "@/lib/content/loaders";

export async function generateStaticParams() {
  const pages = await getWikiPages();
  return pages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getWikiPage(slug);
  return { title: page?.title ?? "Wiki" };
}

export default async function WikiPageView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getWikiPage(slug);
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-3xl px-5 py-14 md:px-8">
      <Link href="/wiki" className="text-sm text-accent hover:underline">
        ← Wiki
      </Link>
      <header className="mt-6">
        <span className="font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.18em] text-accent">
          {page.type}
        </span>
        <h1 className="mt-2 font-[family-name:var(--font-syne)] text-4xl tracking-tight text-ink md:text-5xl">
          {page.title}
        </h1>
        {page.summary && (
          <p className="mt-4 text-lg text-ink-soft">{page.summary}</p>
        )}
      </header>

      {page.links.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {page.links.map((link) => (
            <Link
              key={link}
              href={`/wiki/${link}`}
              className="rounded-full bg-white/70 px-3 py-1 text-xs text-accent ring-1 ring-line hover:bg-accent/10"
            >
              [[{link}]]
            </Link>
          ))}
        </div>
      )}

      <div className="mt-10">
        <MarkdownBody html={page.html} />
      </div>

      {page.sources.length > 0 && (
        <aside className="mt-12 rounded-2xl border border-line bg-white/50 p-5">
          <h2 className="font-[family-name:var(--font-syne)] text-lg text-ink">
            Sources
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {page.sources.map((src) => (
              <li key={src}>
                <code>{src}</code>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
