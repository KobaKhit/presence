import Link from "next/link";
import { getPresenceConfig } from "@/lib/config";
import { DeployBadge } from "./deploy-badge";

export function SiteFooter() {
  const config = getPresenceConfig();

  return (
    <>
      <footer className="relative z-10 mt-24 border-t border-line/80 bg-white/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="font-[family-name:var(--font-syne)] text-base text-ink">
              {config.fullName}
            </p>
            <p className="mt-1">{config.tagline}</p>
            <p className="mt-2">
              <a
                href="https://github.com/KobaKhit/presence"
                className="hover:text-accent"
                target="_blank"
                rel="noreferrer"
              >
                Built with Presence
              </a>
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            {config.social.github && (
              <a href={config.social.github} className="hover:text-accent" target="_blank" rel="noreferrer">
                GitHub
              </a>
            )}
            {config.social.twitter && (
              <a href={config.social.twitter} className="hover:text-accent" target="_blank" rel="noreferrer">
                X
              </a>
            )}
            {config.social.linkedin && (
              <a href={config.social.linkedin} className="hover:text-accent" target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            )}
            <Link href="/docs" className="hover:text-accent">
              Docs
            </Link>
            <Link href="/deploy" className="hover:text-accent">
              Deploy
            </Link>
            <Link href="/setup" className="hover:text-accent">
              Setup
            </Link>
            <a href="/openapi.json" className="hover:text-accent">
              API
            </a>
            <a href="/llms.txt" className="hover:text-accent">
              llms.txt
            </a>
          </div>
        </div>
      </footer>
      <DeployBadge enabled={config.features.showDeployBadge} />
    </>
  );
}
