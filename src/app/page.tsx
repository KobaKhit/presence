import Link from "next/link";
import Image from "next/image";
import { getPresenceConfig } from "@/lib/config";
import { getBlogPosts, getProjects } from "@/lib/content/loaders";
import { RoleTyper } from "@/components/role-typer";

export default async function HomePage() {
  const config = getPresenceConfig();
  const [allProjects, allPosts] = await Promise.all([getProjects(), getBlogPosts()]);

  const featuredProjects = allProjects.filter((p) => p.featured).slice(0, 6);
  const recentPosts = allPosts.slice(0, 4);

  return (
    <div>
      <section className="mx-auto max-w-5xl px-5 pb-12 pt-14 md:px-8 md:pb-16 md:pt-20">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-16">
          <div className="animate-rise flex-shrink-0">
            <div className="relative h-40 w-40 overflow-hidden rounded-full border-4 border-surface shadow-[var(--shadow)] md:h-48 md:w-48">
              {config.avatar ? (
                <Image
                  src={config.avatar}
                  alt={config.fullName}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-accent text-5xl font-bold text-white">
                  {config.name[0]}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-center gap-3">
              {config.social.github && (
                <a href={config.social.github} target="_blank" rel="noreferrer" className="text-muted transition hover:text-accent" aria-label="GitHub">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                </a>
              )}
              {config.social.linkedin && (
                <a href={config.social.linkedin} target="_blank" rel="noreferrer" className="text-muted transition hover:text-accent" aria-label="LinkedIn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              )}
              {config.social.twitter && (
                <a href={config.social.twitter} target="_blank" rel="noreferrer" className="text-muted transition hover:text-accent" aria-label="X / Twitter">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              )}
              {config.email && (
                <a href={`mailto:${config.email}`} className="text-muted transition hover:text-accent" aria-label="Email">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </a>
              )}
            </div>
          </div>

          <div className="animate-rise-delay">
            <p className="presence-chip mb-4">Agent-ready presence</p>
            <h1 className="font-[family-name:var(--font-syne)] text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
              {config.fullName}
            </h1>
            {config.roles && config.roles.length > 0 && (
              <p className="mt-2 font-[family-name:var(--font-jetbrains)] text-sm text-accent">
                <RoleTyper roles={config.roles} />
              </p>
            )}
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
              {config.bio}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/projects" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-bright">
                Projects
              </Link>
              <Link href="/blog" className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent">
                Writing
              </Link>
              <Link href="/visuals" className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent">
                Visuals
              </Link>
              <Link href="/resume" className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent">
                Resume
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-14 md:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Compiled wiki",
              body: "Sources stay immutable. A living knowledge graph powers search and grounded answers.",
              href: "/wiki",
              cta: "Open wiki",
            },
            {
              title: "On-site agent",
              body: "The floating assistant can answer from your corpus and help visitors navigate.",
              href: "/docs",
              cta: "How it works",
            },
            {
              title: "MCP + API",
              body: "Expose your presence to external agents via MCP tools and a versioned REST contract.",
              href: "/openapi.json",
              cta: "OpenAPI",
            },
          ].map((card) => (
            <div key={card.title} className="presence-card p-5">
              <h2 className="font-[family-name:var(--font-syne)] text-lg text-ink">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{card.body}</p>
              <Link href={card.href} className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
                {card.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {featuredProjects.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 pb-16 md:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="font-[family-name:var(--font-syne)] text-2xl tracking-tight text-ink">
              Select work
            </h2>
            <Link href="/projects" className="text-sm font-medium text-accent hover:underline">
              See all →
            </Link>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProjects.map((p) => (
              <li key={p.slug} className="animate-fade">
                <Link
                  href={p.kind === "visual" ? `/visuals/${p.slug}` : `/projects/${p.slug}`}
                  className="group block h-full overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-accent/40 hover:shadow-[var(--shadow)]"
                >
                  {p.image && (
                    <div className="relative h-40 w-full overflow-hidden bg-paper-deep">
                      <Image src={p.image} alt={p.title} fill className="object-cover transition group-hover:scale-105" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-ink">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted line-clamp-3">{p.summary}</p>
                    {p.kind === "visual" && (
                      <span className="mt-2 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                        Interactive
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recentPosts.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 pb-16 md:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="font-[family-name:var(--font-syne)] text-2xl tracking-tight text-ink">
              Recent writing
            </h2>
            <Link href="/blog" className="text-sm font-medium text-accent hover:underline">
              All posts →
            </Link>
          </div>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface/60 px-4">
            {recentPosts.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group flex items-baseline justify-between gap-4 py-4 transition">
                  <div>
                    <h3 className="font-[family-name:var(--font-syne)] text-base text-ink group-hover:text-accent">
                      {post.title}
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-muted">{post.summary}</p>
                  </div>
                  <time className="flex-shrink-0 font-[family-name:var(--font-jetbrains)] text-xs text-muted">
                    {post.date}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-5 pb-20 md:px-8">
        <div className="rounded-3xl border border-line bg-ink px-8 py-8 text-paper">
          <p className="font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.2em] text-accent-bright">
            Powered by Presence
          </p>
          <p className="mt-3 font-[family-name:var(--font-syne)] text-xl md:text-2xl">
            Your writing, projects, and visuals — compiled so humans and agents can find you.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/wiki" className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-accent-bright hover:text-accent-bright">
              Wiki
            </Link>
            <Link href="/api/mcp" className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-accent-bright hover:text-accent-bright">
              MCP
            </Link>
            <Link href="/api/v1/presence" className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-accent-bright hover:text-accent-bright">
              API
            </Link>
            <Link href="/deploy" className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-accent-bright hover:text-accent-bright">
              Deploy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
