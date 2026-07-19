import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/markdown-body";
import { getProject, getProjects } from "@/lib/content/loaders";

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.filter((p) => p.kind === "visual").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  return { title: project?.title ?? "Visual" };
}

export default async function VisualPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project || project.kind !== "visual") notFound();

  const isLive = Boolean(project.visualPath);

  return (
    <article className="mx-auto max-w-5xl px-5 py-14 md:px-8">
      <Link href="/visuals" className="text-sm text-accent hover:underline">
        ← Data Visuals
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
        </div>
      </header>

      {isLive ? (
        <div className="mt-8 overflow-hidden rounded-2xl border border-line shadow-[var(--shadow)]">
          <iframe
            src={project.visualPath}
            title={project.title}
            className="h-[600px] w-full md:h-[780px]"
            style={{ border: "none" }}
            allowFullScreen
          />
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white/40 px-6 py-10 text-center">
          <p className="font-[family-name:var(--font-syne)] text-lg text-ink">
            Visual coming soon
          </p>
          <p className="mt-2 text-sm text-muted">
            This piece still needs path cleanup before it can be hosted here.
          </p>
        </div>
      )}

      {project.content.trim() && (
        <div className="mt-10">
          <MarkdownBody html={project.html} />
        </div>
      )}
    </article>
  );
}
