"use client";

import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { SITE } from "@/data/site";
import { ClaimProgress, CLAIM_STATUSES } from "@/components/claim-progress";

const LINKS = [
  { href: "#drivecover", label: "Work" },
  { href: "#projects", label: "Projects" },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
  const { resolvedTheme, setTheme } = useTheme();
  // false during SSR and hydration, true after: avoids a theme label mismatch.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = resolvedTheme === "dark";
  // Latest claim status passed while scrolling (-1: none yet).
  const [status, setStatus] = useState(-1);
  const settled = status === CLAIM_STATUSES.length - 1;

  return (
    <header data-intro-part="late" className="sticky top-0 z-20 border-b bg-bg/90 backdrop-blur-sm">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5 text-sm">
        <div className="flex min-w-0 items-baseline gap-3">
          <a href="#top" className="shrink-0 font-medium">
            {SITE.name}
          </a>
          {/* Status label; too tight to fit beside the links under 360px. */}
          <span
            aria-hidden
            className={`truncate font-mono text-xs max-[359px]:hidden transition-opacity duration-300 ${status < 0 ? "opacity-0" : "opacity-100"} ${
              settled ? "text-amber" : "text-sky"
            }`}
          >
            {CLAIM_STATUSES[Math.max(status, 0)]}
          </span>
        </div>
        <div className="flex items-center gap-5 text-muted">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hidden transition-colors duration-150 hover:text-fg sm:inline">
              {l.label}
            </a>
          ))}
          <a href={SITE.resume} target="_blank" rel="noopener noreferrer" className="transition-colors duration-150 hover:text-fg">
            Resume
          </a>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="transition-colors duration-150 hover:text-fg"
            aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle theme"}
          >
            {mounted ? (isDark ? "Light" : "Dark") : "Theme"}
          </button>
        </div>
      </nav>
      <ClaimProgress onStatus={setStatus} />
    </header>
  );
}
