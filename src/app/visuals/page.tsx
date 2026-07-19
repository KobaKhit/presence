import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getProjects } from "@/lib/content/loaders";

export const metadata: Metadata = { title: "Data Visuals" };

export default async function VisualsPage() {
  const visuals = (await getProjects()).filter((p) => p.kind === "visual");

  return (
    <div className="mx-auto max-w-5xl px-5 py-14 md:px-8">
      <h1 className="font-[family-name:var(--font-syne)] text-4xl tracking-tight text-ink md:text-5xl">
        Data Visuals
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Interactive explorations — D3, Three.js, Plotly, Vega, and more.
      </p>

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visuals.map((v) => (
          <li key={v.slug}>
            <Link
              href={`/visuals/${v.slug}`}
              className="group block h-full overflow-hidden rounded-2xl border border-line bg-white/55 transition hover:border-accent/40 hover:shadow-[var(--shadow)]"
            >
              {v.image && (
                <div className="relative h-40 w-full overflow-hidden bg-paper-deep">
                  <Image
                    src={v.image}
                    alt={v.title}
                    fill
                    className="object-cover transition group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-[family-name:var(--font-syne)] text-lg text-ink">
                    {v.title}
                  </h2>
                  <span className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-wider text-muted">
                    {v.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {v.summary}
                </p>
                {v.visualPath ? (
                  <span className="mt-3 inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent">
                    Interactive
                  </span>
                ) : (
                  <span className="mt-3 inline-block rounded-full bg-paper-deep px-2.5 py-0.5 text-[11px] text-muted">
                    Coming soon
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
