import Link from "next/link";
import type { Metadata } from "next";
import { getBlogPosts } from "@/lib/content/loaders";

export const metadata: Metadata = { title: "Blog" };

export default async function BlogIndexPage() {
  const posts = await getBlogPosts();
  const [featuredPost, ...morePosts] = posts;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-12 md:px-8 md:pb-32 md:pt-20">
      <header className="animate-rise grid gap-8 border-b border-line pb-12 md:grid-cols-[1fr_0.85fr] md:items-end md:pb-16">
        <div>
          <p className="font-[family-name:var(--font-jetbrains)] text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Field notes · Ideas · Experiments
          </p>
          <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-syne)] text-6xl font-medium leading-[0.92] tracking-[-0.045em] text-ink sm:text-7xl md:text-8xl">
            Writing for curious minds.
          </h1>
        </div>
        <div className="md:pb-2">
          <p className="max-w-xl text-lg leading-relaxed text-ink-soft md:text-xl">
            Essays on data, optimization, and building in public—written for people,
            structured for the knowledge layer.
          </p>
          <p className="mt-5 font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.16em] text-muted">
            {posts.length} {posts.length === 1 ? "story" : "stories"} published
          </p>
        </div>
      </header>

      {featuredPost ? (
        <section className="animate-rise-delay py-10 md:py-14">
          <p className="mb-5 font-[family-name:var(--font-jetbrains)] text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Latest story
          </p>
          <Link
            href={`/blog/${featuredPost.slug}`}
            className="group presence-card relative grid overflow-hidden p-7 transition duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_24px_70px_rgba(13,27,42,0.13)] sm:p-10 md:grid-cols-[minmax(0,1.35fr)_minmax(15rem,0.65fr)] md:gap-16 md:p-12"
          >
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.14em] text-muted">
                <time dateTime={featuredPost.date}>{featuredPost.date}</time>
                <span aria-hidden className="h-px w-6 bg-line" />
                <span>{Math.max(1, Math.ceil(featuredPost.content.split(/\s+/).length / 220))} min read</span>
              </div>
              <h2 className="mt-7 max-w-3xl font-[family-name:var(--font-syne)] text-4xl font-medium leading-[1.02] tracking-[-0.035em] text-ink transition-colors group-hover:text-accent sm:text-5xl md:text-6xl">
                {featuredPost.title}
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
                {featuredPost.summary}
              </p>
            </div>
            <div className="relative z-10 mt-10 flex flex-col justify-between border-t border-line pt-6 md:mt-0 md:border-l md:border-t-0 md:pl-10 md:pt-0">
              <div className="flex flex-wrap gap-2">
                {featuredPost.tags.map((tag) => (
                  <span key={tag} className="presence-chip">
                    {tag}
                  </span>
                ))}
              </div>
              <span className="mt-12 inline-flex items-center gap-3 text-sm font-semibold text-ink transition-colors group-hover:text-accent">
                Read the story
                <span aria-hidden className="text-xl transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </div>
            <span
              aria-hidden
              className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent-bright/10 blur-3xl transition-transform duration-500 group-hover:scale-125"
            />
          </Link>
        </section>
      ) : (
        <p className="py-20 text-lg text-muted">The first story is being written.</p>
      )}

      {morePosts.length > 0 && (
        <section className="border-t border-line pt-10 md:pt-14">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="font-[family-name:var(--font-jetbrains)] text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                The archive
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-syne)] text-4xl font-medium tracking-[-0.03em] text-ink">
                More to explore
              </h2>
            </div>
          </div>
          <ol className="grid gap-4 md:grid-cols-2">
            {morePosts.map((post, index) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-surface/60 p-7 transition duration-300 hover:-translate-y-1 hover:border-accent/30 hover:bg-surface"
                >
                  <div className="flex items-center justify-between gap-4 font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.14em] text-muted">
                    <span>{String(index + 2).padStart(2, "0")}</span>
                    <time dateTime={post.date}>{post.date}</time>
                  </div>
                  <h3 className="mt-12 font-[family-name:var(--font-syne)] text-3xl font-medium leading-tight tracking-[-0.025em] text-ink transition-colors group-hover:text-accent">
                    {post.title}
                  </h3>
                  <p className="mt-4 flex-1 leading-relaxed text-ink-soft">{post.summary}</p>
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                    <span className="text-xs text-muted">{post.tags.slice(0, 2).join(" · ")}</span>
                    <span aria-hidden className="text-lg transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
