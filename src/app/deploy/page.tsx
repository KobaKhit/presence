import type { Metadata } from "next";
import Link from "next/link";
import { getPresenceConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Deploy Presence" };

function vercelCloneUrl(templateRepoUrl: string): string {
  const params = new URLSearchParams({
    "repository-url": templateRepoUrl,
    env: "OPENROUTER_API_KEY",
    envDescription: "OpenRouter API key for chat and wiki compilation (OpenAI fallback also supported)",
    "project-name": "my-presence",
    "repository-name": "my-presence",
  });
  return `https://vercel.com/new/clone?${params.toString()}`;
}

export default function DeployPage() {
  const config = getPresenceConfig();
  const templateRepoUrl = config.deploy?.templateRepoUrl?.trim() ?? "";
  const cloneUrl = templateRepoUrl ? vercelCloneUrl(templateRepoUrl) : null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:px-8">
      <h1 className="font-[family-name:var(--font-syne)] text-4xl tracking-tight text-ink md:text-5xl">
        Deploy your Presence
      </h1>
      <p className="mt-4 text-lg text-ink-soft">
        Fork this framework, drop your writing into <code>content/</code>, and ship a site with wiki, chat, API, and MCP.
      </p>

      <section className="mt-12 space-y-6">
        <div className="rounded-3xl border border-line bg-white/60 p-6">
          <h2 className="font-[family-name:var(--font-syne)] text-2xl">What you get</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-soft">
            <li>Personal pages: home, blog, projects, resume</li>
            <li>Browsable LLM Wiki + D3 link graph</li>
            <li>Versioned <code>/api/v1/*</code> + <code>/openapi.json</code></li>
            <li>Wiki-grounded chat and <code>/api/mcp</code> tools</li>
            <li><code>llms.txt</code> + skills so agents can build alternate UIs</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-line bg-ink p-6 text-paper">
          <h2 className="font-[family-name:var(--font-syne)] text-2xl">One-click deploy</h2>
          {cloneUrl ? (
            <>
              <p className="mt-3 text-white/70">
                Clones the template at <code className="text-accent-bright">{templateRepoUrl}</code> into your GitHub account.
              </p>
              <a
                className="mt-6 inline-flex rounded-full bg-accent-bright px-5 py-3 text-sm font-semibold text-ink"
                href={cloneUrl}
                target="_blank"
                rel="noreferrer"
              >
                Deploy with Vercel
              </a>
            </>
          ) : (
            <div className="mt-3 space-y-3 text-white/70">
              <p>
                Set <code className="text-accent-bright">deploy.templateRepoUrl</code> in{" "}
                <code className="text-accent-bright">content/presence.config.ts</code> to your published
                GitHub template URL to enable the Vercel clone button.
              </p>
              <p className="text-sm">
                Until then: fork or copy this repo, push to GitHub, and import the project in the Vercel dashboard.
              </p>
              {config.social.github && (
                <a
                  className="inline-flex rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-paper hover:bg-white/10"
                  href={config.social.github}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open GitHub
                </a>
              )}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-line bg-white/60 p-6">
          <h2 className="font-[family-name:var(--font-syne)] text-2xl">Try the live surfaces</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/wiki" className="text-accent hover:underline">
              Wiki graph
            </Link>
            <span className="text-muted">Floating agent (bottom-right)</span>
            <Link href="/docs" className="text-accent hover:underline">
              Docs
            </Link>
            <a href="/api/mcp" className="text-accent hover:underline">
              MCP endpoint
            </a>
            <a href="/openapi.json" className="text-accent hover:underline">
              OpenAPI
            </a>
            <Link href="/setup" className="text-accent hover:underline">
              Setup wizard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
