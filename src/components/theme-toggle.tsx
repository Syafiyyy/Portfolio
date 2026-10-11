"use client";

import { useId, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";

/*
  Switch theme, revealing the new one in a circle growing out of (x, y)
  (View Transitions). Without that API, or with reduced motion, the theme
  swaps instantly. Shared by the toggle and the command menu.
*/
export function switchTheme(next: "light" | "dark", setTheme: (t: string) => void, x: number, y: number) {
  // next-themes applies its class in an effect; set it here as well so the
  // view transition captures the new theme in the same frame.
  const apply = () => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(next);
    root.style.colorScheme = next;
    flushSync(() => setTheme(next));
  };
  if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    apply();
    return;
  }
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const vt = document.startViewTransition(apply);
  vt.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
}

// Sun/moon button.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const cut = useId();
  // false during SSR and hydration, true after: avoids a label mismatch.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = resolvedTheme === "dark";

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    switchTheme(isDark ? "light" : "dark", setTheme, r.left + r.width / 2, r.top + r.height / 2);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      data-theme-toggle
      className="press -m-2 grid size-9 place-items-center rounded-full transition-[color,transform] duration-150 hover:text-fg"
      aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle theme"}
    >
      <svg viewBox="0 0 24 24" className="theme-icon size-4.5" fill="currentColor" aria-hidden>
        <mask id={cut}>
          <rect width="24" height="24" fill="white" />
          <circle className="theme-cut" cx="24" cy="4" r="8" fill="black" />
        </mask>
        <g mask={`url(#${cut})`}>
          <circle className="theme-core" cx="12" cy="12" r="5" />
        </g>
        <g className="theme-rays" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 1.5v2M12 20.5v2M1.5 12h2M20.5 12h2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M4.6 19.4L6 18M18 6l1.4-1.4" />
        </g>
      </svg>
    </button>
  );
}
