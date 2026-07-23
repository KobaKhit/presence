import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/markdown-body";
import { getBlogPost, getBlogPosts } from "@/lib/content/loaders";

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  return {
    title: post?.title ?? "Post",
    description: post?.summary,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  const readingMinutes = Math.max(1, Math.ceil(post.content.split(/\s+/).length / 220));

  return (
    <article className="pb-24 md:pb-32">
      <div className="relative overflow-hidden border-b border-line">
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-8 md:px-8 md:pb-20 md:pt-12">
          <Link
            href="/blog"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-accent"
          >
            <span aria-hidden className="transition-transform group-hover:-translate-x-1">←</span>
            All writing
          </Link>
          <header className="animate-rise mt-12 max-w-5xl md:mt-16">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-[family-name:var(--font-jetbrains)] text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              <time dateTime={post.date}>{post.date}</time>
              <span aria-hidden className="h-px w-6 bg-line" />
              <span>{readingMinutes} min read</span>
            </div>
            <h1 className="mt-7 max-w-5xl font-[family-name:var(--font-syne)] text-5xl font-medium leading-[0.98] tracking-[-0.045em] text-ink sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              {post.title}
            </h1>
            {post.summary && (
              <p className="mt-8 max-w-3xl text-xl leading-relaxed text-ink-soft md:text-2xl">
                {post.summary}
              </p>
            )}
            {post.tags.length > 0 && (
              <div className="mt-9 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="presence-chip">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>
        </div>
        <span
          aria-hidden
          className="absolute -right-28 top-16 -z-10 h-80 w-80 rounded-full bg-accent-bright/10 blur-3xl"
        />
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-12 md:px-8 md:pt-20 lg:grid-cols-[10rem_minmax(0,46rem)] lg:gap-16">
        <aside className="hidden lg:block">
          <div className="sticky top-28 border-l border-line pl-5">
            <p className="font-[family-name:var(--font-jetbrains)] text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
              Published
            </p>
            <time dateTime={post.date} className="mt-2 block text-sm text-ink-soft">
              {post.date}
            </time>
            <p className="mt-6 font-[family-name:var(--font-jetbrains)] text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
              Reading time
            </p>
            <p className="mt-2 text-sm text-ink-soft">{readingMinutes} minutes</p>
          </div>
        </aside>
        <div className="blog-prose min-w-0">
          <MarkdownBody html={post.html} />
          <footer className="mt-16 border-t border-line pt-8">
            <Link
              href="/blog"
              className="group inline-flex items-center gap-3 text-sm font-semibold text-ink transition hover:text-accent"
            >
              <span aria-hidden className="transition-transform group-hover:-translate-x-1">←</span>
              Back to all writing
            </Link>
          </footer>
        </div>
      </div>
    </article>
  );
}
