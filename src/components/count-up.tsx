"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Counts every number in `value` up from 0 the first time it enters view,
// keeping the text around it ("15 days", "19/19"). The server renders the
// final value, so no-JS and reduced motion just see the real number.
export function CountUp({ value }: { value: string }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen at load: leave it, no flash to zero.
    if (node.getBoundingClientRect().top < window.innerHeight) return;

    const parts = value.split(/(\d+)/);
    const render = (p: number) => {
      node.textContent = parts.map((s, i) => (i % 2 ? String(Math.round(Number(s) * p)) : s)).join("");
    };

    const state = { p: 0 };
    render(0);
    const st = ScrollTrigger.create({
      trigger: node,
      start: "top 90%",
      once: true,
      onEnter: () => gsap.to(state, { p: 1, duration: 1.1, ease: "power2.out", onUpdate: () => render(state.p) }),
    });
    return () => {
      st.kill();
      gsap.killTweensOf(state);
      node.textContent = value;
    };
  }, [value]);

  return (
    <span ref={el} className="tabular-nums">
      {value}
    </span>
  );
}
