"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SITE } from "@/data/site";
import { ClaimProgress, CLAIM_STATUSES } from "@/components/claim-progress";
import { TextLink } from "@/components/text-link";
import { ThemeToggle } from "@/components/theme-toggle";

gsap.registerPlugin(ScrollTrigger);

// Loaded the first time someone opens it (⌘K, or Menu on phones).
const loadMenu = () => import("@/components/command-menu");
const CommandMenu = dynamic(loadMenu, { ssr: false });

const LINKS = [
  { id: "drivecover", label: "Work" },
  { id: "projects", label: "Projects" },
  { id: "contact", label: "Contact" },
];
// Sections tracked for "you are here" (Education has no nav link).
const SECTIONS = ["drivecover", "projects", "education", "contact"];

const noop = () => () => {};

export function Nav() {
  // Latest claim status passed while scrolling (-1: none yet).
  const [status, setStatus] = useState(-1);
  const settled = status === CLAIM_STATUSES.length - 1;
  const [active, setActive] = useState<string | null>(null);
  const [menu, setMenu] = useState<null | "palette" | "sheet">(null);
  const header = useRef<HTMLElement>(null);
  const links = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  // Shortcut hint: ⌘K on Apple devices, Ctrl K elsewhere.
  const mac = useSyncExternalStore(noop, () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent), () => true);

  // Which section is on screen: the one crossing 45% of the viewport.
  useEffect(() => {
    const triggers = SECTIONS.map((id, i) => {
      const section = document.getElementById(id)?.closest("section");
      if (!section) return null;
      return ScrollTrigger.create({
        trigger: section,
        start: "top 45%",
        end: "bottom 45%",
        // Measure after the pinned Trace has added its scroll length.
        refreshPriority: -1,
        onToggle: (self) => {
          if (self.isActive) setActive(id);
          else if (i === 0 && self.direction < 0) setActive(null);
        },
      });
    });
    return () => triggers.forEach((t) => t?.kill());
  }, []);

  // Slide the dot under the active link (or fade it out: hero, Education).
  useEffect(() => {
    const place = () => {
      const d = dot.current;
      const a = links.current?.querySelector<HTMLElement>(`[href="#${active}"]`);
      if (!d) return;
      if (!a || !a.offsetParent) {
        d.style.opacity = "0";
        return;
      }
      d.style.opacity = "1";
      d.style.transform = `translateX(${a.offsetLeft + a.offsetWidth / 2 - 2}px)`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active]);

  // Scrolling down collapses the bar to its progress line; up restores it.
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    let lastY = window.scrollY;
    const set = (collapsed: boolean) => el.toggleAttribute("data-collapsed", collapsed);
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      if (Math.abs(dy) < 6) return;
      set(dy > 0 && y > 120);
      lastY = y;
    };
    // Mouse at the top edge peeks it back open.
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.clientY < 20) set(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  // ⌘K / Ctrl+K opens the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMenu((m) => m ?? "palette");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
    <header ref={header} data-intro-part="late" className="pointer-events-none sticky top-0 z-20">
      <div className="nav-shell pointer-events-auto relative border-b bg-bg/90 backdrop-blur-sm">
        <nav className="frame flex h-14 items-center justify-between gap-4 text-sm">
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
            <div ref={links} className="relative hidden items-center gap-5 sm:flex">
              {LINKS.map((l) => (
                <TextLink key={l.id} href={`#${l.id}`} current={active === l.id}>
                  {l.label}
                </TextLink>
              ))}
              <TextLink href={SITE.resume}>Resume</TextLink>
              <span aria-hidden ref={dot} className="nav-dot absolute -bottom-2.5 left-0 size-1 rounded-full bg-sky opacity-0" />
            </div>
            <button
              type="button"
              onClick={() => setMenu("palette")}
              onPointerEnter={() => void loadMenu()}
              aria-label="Open command menu"
              aria-haspopup="dialog"
              aria-expanded={menu === "palette"}
              aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
              className="press hidden items-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] text-muted transition-[color,border-color,transform] duration-150 hover:border-sky hover:text-fg sm:inline-flex"
            >
              {mac ? "⌘K" : "Ctrl K"}
            </button>
            <button
              type="button"
              onClick={() => setMenu("sheet")}
              onPointerDown={() => void loadMenu()}
              aria-haspopup="dialog"
              aria-expanded={menu === "sheet"}
              className="press link sm:hidden"
              data-tone="muted"
            >
              <span className="link-label">Menu</span>
            </button>
            <span className="text-muted">
              <ThemeToggle />
            </span>
          </div>
        </nav>
        <ClaimProgress onStatus={setStatus} />
      </div>
    </header>
    {/* Outside the header: it ignores pointer events so the page under its
        collapsed shell stays clickable, and the dialog would inherit that. */}
    {menu && <CommandMenu variant={menu} active={active} onClose={() => setMenu(null)} />}
    </>
  );
}
