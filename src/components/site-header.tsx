import Link from "next/link";
import { getPresenceConfig } from "@/lib/config";

const links = [
  { href: "/blog", label: "Blog" },
  { href: "/projects", label: "Projects" },
  { href: "/visuals", label: "Visuals" },
  { href: "/wiki", label: "Wiki" },
  { href: "/chat", label: "Chat" },
  { href: "/resume", label: "Resume" },
];

export function SiteHeader() {
  const config = getPresenceConfig();

  return (
    <header className="relative z-20 border-b border-line/80 bg-white/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-syne)] text-xl font-bold tracking-tight text-ink md:text-2xl">
            {config.name}
          </span>
          <span className="hidden text-xs uppercase tracking-[0.18em] text-muted sm:inline">
            presence
          </span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-ink-soft md:gap-x-6">
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
      </div>
    </header>
  );
}
