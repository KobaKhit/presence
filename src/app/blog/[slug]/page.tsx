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

  return (
    <article className="pb-20">
      <div className="border-b border-line bg-white/35">
        <div className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
          <Link
            href="/blog"
            className="inline-flex text-sm font-medium text-accent transition hover:text-accent-bright"
          >
            ← Writing
          </Link>
          <header className="mt-8 max-w-3xl">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-[family-name:var(--font-jetbrains)] text-xs tracking-wide text-muted">
              <time dateTime={post.date}>{post.date}</time>
              {post.tags.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span>{post.tags.join(" · ")}</span>
                </>
              )}
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-syne)] text-4xl font-extrabold leading-[1.1] tracking-tight text-ink md:text-5xl lg:text-6xl">
              {post.title}
            </h1>
            {post.summary && (
              <p className="mt-6 text-xl leading-relaxed text-ink-soft md:text-2xl">
                {post.summary}
              </p>
            )}
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 pt-12 md:px-8 md:pt-16">
        <div className="blog-prose">
          <MarkdownBody html={post.html} />
        </div>
      </div>
    </article>
  );
}
