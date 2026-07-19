import type { Metadata } from "next";
import { MarkdownBody } from "@/components/markdown-body";
import { getResume } from "@/lib/content/loaders";

export const metadata: Metadata = { title: "Resume" };

export default async function ResumePage() {
  const resume = await getResume();

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:px-8">
      <h1 className="font-[family-name:var(--font-syne)] text-4xl tracking-tight text-ink md:text-5xl">
        Resume
      </h1>
      <p className="mt-3 text-muted">From <code>content/sources/resume.md</code></p>
      <div className="mt-10 rounded-3xl border border-line bg-white/60 p-6 md:p-10">
        {resume ? (
          <MarkdownBody html={resume.html} />
        ) : (
          <p className="text-muted">No resume found.</p>
        )}
      </div>
    </div>
  );
}
