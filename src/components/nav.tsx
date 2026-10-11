"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { SITE } from "@/data/site";

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

  return (
    <header data-intro-part="late" className="sticky top-0 z-20 border-b bg-bg/90 backdrop-blur-sm">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 text-sm">
        <a href="#top" className="font-medium">
          {SITE.name}
        </a>
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
    </header>
  );
}
