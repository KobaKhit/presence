import Link from "next/link";
import type { Metadata } from "next";
import { getBlogPosts } from "@/lib/content/loaders";

export const metadata: Metadata = { title: "Blog" };

export default async function BlogIndexPage() {
  const posts = await getBlogPosts();

  return (
    <div className="mx-auto max-w-5xl px-5 py-14 md:px-8 md:py-20">
      <header className="max-w-2xl">
        <h1 className="animate-rise font-[family-name:var(--font-syne)] text-4xl font-extrabold tracking-tight text-ink md:text-6xl">
          Writing
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Notes on data science, optimization, and building things — source material for the wiki.
        </p>
      </header>

      <ul className="mt-14 divide-y divide-line border-y border-line">
        {posts.map((post) => (
          <li key={post.slug} className="animate-rise-delay">
            <Link
              href={`/blog/${post.slug}`}
              className="group grid gap-3 py-8 transition md:grid-cols-[7.5rem_1fr] md:gap-8"
            >
              <time className="font-[family-name:var(--font-jetbrains)] text-xs tracking-wide text-muted md:pt-2">
                {post.date}
              </time>
              <div>
                <h2 className="font-[family-name:var(--font-syne)] text-2xl font-semibold tracking-tight text-ink transition group-hover:text-accent md:text-3xl">
                  {post.title}
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-soft">
                  {post.summary}
                </p>
                {post.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-wider text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
