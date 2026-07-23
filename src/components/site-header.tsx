import Link from "next/link";
import { getPresenceConfig } from "@/lib/config";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function SiteHeader() {
  const config = getPresenceConfig();

  const links = [
    config.modules.blog && { href: "/blog", label: "Blog" },
    config.modules.projects && { href: "/projects", label: "Projects" },
    config.modules.projects && { href: "/visuals", label: "Visuals" },
    config.modules.wiki && { href: "/wiki", label: "Wiki" },
    config.modules.resume && { href: "/resume", label: "Resume" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <header className="relative z-20 border-b border-line/80 bg-surface/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-syne)] text-xl font-bold tracking-tight text-ink md:text-2xl">
            {config.name}
          </span>
          <span className="hidden text-xs uppercase tracking-[0.18em] text-muted sm:inline">
            presence
          </span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 md:gap-x-5">
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-ink-soft md:gap-x-5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
