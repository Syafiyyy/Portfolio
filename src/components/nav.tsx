"use client";

import { useState } from "react";
import { SITE } from "@/data/site";
import { ClaimProgress, CLAIM_STATUSES } from "@/components/claim-progress";
import { TextLink } from "@/components/text-link";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "#drivecover", label: "Work" },
  { href: "#projects", label: "Projects" },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
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
        <div className="flex items-center gap-5">
          {LINKS.map((l) => (
            <TextLink key={l.href} href={l.href} className="hidden sm:inline-flex">
              {l.label}
            </TextLink>
          ))}
          <TextLink href={SITE.resume}>Resume</TextLink>
          <span className="text-muted">
            <ThemeToggle />
          </span>
        </div>
      </nav>
      <ClaimProgress onStatus={setStatus} />
    </header>
  );
}
