"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Section heading that slides up out of a mask the first time it enters view.
export function Heading({ children, id }: { children: React.ReactNode; id?: string }) {
  const inner = useRef<HTMLSpanElement>(null);

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
        onEnter: () => gsap.to(el, { yPercent: 0, duration: 0.7, ease: "power3.out" }),
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <h2 id={id} className="scroll-mt-20 text-2xl font-semibold tracking-tight">
      {/* pb/-mb keep descenders inside the mask */}
      <span className="-mb-[0.15em] block overflow-hidden pb-[0.15em]">
        <span ref={inner} className="block">
          {children}
        </span>
      </span>
    </h2>
  );
}
