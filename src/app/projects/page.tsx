import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getProjects } from "@/lib/content/loaders";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const projects = (await getProjects()).filter((p) => p.kind === "project");

  return (
    <div className="mx-auto max-w-5xl px-5 py-14 md:px-8">
      <h1 className="font-[family-name:var(--font-syne)] text-4xl tracking-tight text-ink md:text-5xl">
        Projects
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Reproducible research, tools, and web experiments.
      </p>

      <ul className="mt-12 grid gap-5 md:grid-cols-2">
        {projects.map((project) => (
          <li key={project.slug}>
            <Link
              href={`/projects/${project.slug}`}
              className="group block h-full overflow-hidden rounded-3xl border border-line bg-white/55 transition hover:border-accent/40 hover:shadow-[var(--shadow)]"
            >
              {project.image && (
                <div className="relative h-44 w-full overflow-hidden bg-paper-deep">
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover transition group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-[family-name:var(--font-syne)] text-xl text-ink">
                    {project.title}
                  </h2>
                  <span className="font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-wider text-muted">
                    {project.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {project.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-paper-deep px-2.5 py-0.5 text-xs text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
