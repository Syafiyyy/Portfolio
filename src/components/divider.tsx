"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/*
  The handoff between two sections. The first time the boundary scrolls into
  view, the hairline draws across from the left behind a sky leading point
  (a dot with a short trail, like the claim moving on), and a faint strip of
  the hero grid fades in under it. Rendered complete on the server, so with
  no JS, reduced motion, or a boundary already on screen it is just there.

  Sits absolutely at the top of a `relative` section.
*/
export function Divider() {
  const line = useRef<HTMLDivElement>(null);
  const point = useRef<HTMLSpanElement>(null);
  const echo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = line.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    const ctx = gsap.context(() => {
      gsap.set(el, { scaleX: 0 });
      gsap.set(echo.current, { opacity: 0 });
      ScrollTrigger.create({
        trigger: el,
        start: "top 92%",
        once: true,
        onEnter: () => {
          gsap
            .timeline({ defaults: { duration: 1.2, ease: "power2.inOut" } })
            .to(el, { scaleX: 1 }, 0)
            .fromTo(point.current, { x: 0, opacity: 1 }, { x: () => el.offsetWidth }, 0)
            .to(point.current, { opacity: 0, duration: 0.35, ease: "power1.out" }, ">-0.2")
            .to(echo.current, { opacity: 1, duration: 1, ease: "power1.out" }, 0.3);
        },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-x-clip">
      <div ref={echo} className="grid-echo absolute inset-x-0 top-0 h-28" />
      <div ref={line} className="relative h-px origin-left bg-line" />
      {/* Zero-width anchor at the line's leading edge: trail behind it, dot on it. */}
      <span ref={point} className="absolute left-0 top-0 opacity-0">
        <span className="absolute right-0 top-0 h-px w-24 bg-linear-to-r from-transparent to-sky" />
        <span className="absolute -left-[3px] -top-[2.5px] size-[6px] rounded-full bg-sky shadow-[0_0_10px_2px_color-mix(in_srgb,var(--sky)_55%,transparent)]" />
      </span>
    </div>
  );
}
