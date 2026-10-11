import type Lenis from "lenis";

// The page's Lenis instance, when smooth scroll is on (not under reduced
// motion). Set by <SmoothScroll>; read by anything that scrolls on command.
let lenis: Lenis | null = null;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

// Clears the sticky nav when landing on a section.
const NAV_OFFSET = -72;

// Scroll to a section by id ("top" for the start of the page).
export function scrollToSection(id: string) {
  if (id === "top") {
    if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0 });
    return;
  }
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: NAV_OFFSET });
  else el.scrollIntoView();
}

// Freeze page scroll while a dialog is open.
export function lockScroll(locked: boolean) {
  if (locked) lenis?.stop();
  else lenis?.start();
  document.documentElement.style.overflow = locked ? "hidden" : "";
}
