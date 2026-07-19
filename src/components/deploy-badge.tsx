"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function DeployBadge({ enabled }: { enabled: boolean }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const key = "presence-deploy-badge-dismissed";
    setDismissed(localStorage.getItem(key) === "1");
  }, [enabled]);

  if (!enabled || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-line bg-white/90 px-4 py-3 shadow-[var(--shadow)] backdrop-blur md:left-auto md:right-6">
      <p className="text-sm text-ink-soft">
        <span className="font-semibold text-ink">Powered by Presence</span>
        {" — "}
        <Link href="/deploy" className="text-accent underline-offset-2 hover:underline">
          deploy yours
        </Link>
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        className="rounded-lg px-2 py-1 text-muted hover:bg-paper-deep"
        onClick={() => {
          localStorage.setItem("presence-deploy-badge-dismissed", "1");
          setDismissed(true);
        }}
      >
        ×
      </button>
    </div>
  );
}
