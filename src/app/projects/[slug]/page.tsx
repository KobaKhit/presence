import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MarkdownBody } from "@/components/markdown-body";
import { getProject, getProjects } from "@/lib/content/loaders";

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.filter((p) => p.kind !== "visual").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  return { title: project?.title ?? "Project" };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();
  if (project.kind === "visual") redirect(`/visuals/${slug}`);

  return (
    <article className="mx-auto max-w-5xl px-5 py-14 md:px-8">
      <Link href="/projects" className="text-sm text-accent hover:underline">
        ← Projects
      </Link>
      <header className="mt-6">
        <h1 className="font-[family-name:var(--font-syne)] text-4xl tracking-tight text-ink md:text-5xl">
          {project.title}
        </h1>
        <p className="mt-4 text-lg text-ink-soft">{project.summary}</p>
        <div className="mt-4 flex flex-wrap gap-4">
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-accent hover:underline"
            >
              Live →
            </a>
          )}
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-accent hover:underline"
            >
              Code →
            </a>
          )}
          {project.pdf && (
            <a
              href={project.pdf}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-accent hover:underline"
            >
              Paper →
            </a>
          )}
        </div>
      </header>

      {project.content.trim() && (
        <div className="mt-10">
          <MarkdownBody html={project.html} />
        </div>
      )}
    </article>
  );
}
