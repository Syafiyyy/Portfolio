"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Section heading that slides up out of a mask the first time it enters view,
// while a scan line crosses it (the site's scan language) and fades.
export function Heading({ children, id }: { children: React.ReactNode; id?: string }) {
  const inner = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const line = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = inner.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen at load (e.g. reload mid-page): leave it alone, no flash.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    const ctx = gsap.context(() => {
      gsap.set(el, { yPercent: 110 });
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => {
          gsap.to(el, { yPercent: 0, duration: 0.7, ease: "power3.out" });
          // The line runs the width of the words, starting as they rise.
          gsap
            .timeline({ delay: 0.12 })
            .set(line.current, { x: 0, opacity: 1 })
            .to(line.current, { x: () => text.current?.offsetWidth ?? 0, duration: 0.75, ease: "power2.inOut" })
            .to(line.current, { opacity: 0, duration: 0.3, ease: "power1.out" }, ">-0.1");
        },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <h2 id={id} className="scroll-mt-20 text-2xl font-semibold tracking-tight">
      {/* pb/-mb keep descenders inside the mask */}
      <span className="-mb-[0.15em] block overflow-hidden pb-[0.15em]">
        <span ref={inner} className="block">
          <span ref={text} className="relative inline-block">
            {children}
            <span
              ref={line}
              aria-hidden
              className="pointer-events-none absolute -bottom-[0.05em] -top-[0.05em] left-0 w-[2px] bg-sky opacity-0 shadow-[0_0_12px_2px_color-mix(in_srgb,var(--sky)_55%,transparent)]"
            />
          </span>
        </span>
      </span>
    </h2>
  );
}
