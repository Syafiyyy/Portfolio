"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TRACE } from "@/data/site";

gsap.registerPlugin(ScrollTrigger);

// Motion tokens (ms → s). Only transform and opacity animate.
const TRAVEL = 0.3;
const FADE = 0.2;
const HOLD = 0.55;
const EASE_OUT = "power3.out";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function Trace() {
  const root = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLLIElement | null)[]>([]);
  const glows = useRef<(HTMLSpanElement | null)[]>([]);
  const logs = useRef<(HTMLLIElement | null)[]>([]);
  const done = useRef<HTMLParagraphElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const [played, setPlayed] = useState(false);

  useIsoLayoutEffect(() => {
    // Dot positions are measured, and re-measured whenever ScrollTrigger
    // refreshes (resize), via function-based values.
    const center = (i: number) => {
      const n = nodes.current[i];
      if (!n || !rail.current) return 0;
      const r = rail.current.getBoundingClientRect();
      const b = n.getBoundingClientRect();
      return b.top - r.top + b.height / 2;
    };
    const count = TRACE.length;

    const showFinal = () => {
      gsap.set(glows.current, { opacity: 1 });
      gsap.set(logs.current, { opacity: 1, y: 0 });
      gsap.set(dot.current, { opacity: 1, y: center(count - 1) });
      gsap.set(done.current, { opacity: 1 });
      setPlayed(true);
    };

    const build = () => {
      const t = gsap.timeline({ paused: true, onComplete: () => setPlayed(true) });
      t.set(glows.current, { opacity: 0 })
        .set(logs.current, { opacity: 0, y: 4 })
        .set(done.current, { opacity: 0 })
        .set(dot.current, { y: () => center(0), opacity: 0 })
        .to(dot.current, { opacity: 1, duration: FADE, ease: EASE_OUT });

      for (let i = 0; i < count; i++) {
        if (i > 0) t.to(dot.current, { y: () => center(i), duration: TRAVEL, ease: "power2.inOut" }, `+=${HOLD}`);
        t.to(glows.current[i], { opacity: 1, duration: FADE, ease: EASE_OUT })
          .to(logs.current[i], { opacity: 1, y: 0, duration: FADE, ease: EASE_OUT }, "<");
      }
      t.to(done.current, { opacity: 1, duration: FADE, ease: EASE_OUT }, `+=${HOLD / 2}`);
      return t;
    };

    const mm = gsap.matchMedia(root);

    // Desktop: pin the trace and let scrolling move the claim (~150vh).
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      tl.current = build();
      ScrollTrigger.create({
        trigger: root.current,
        // Centre it in the space below the sticky nav (h-14).
        start: "center center+=28",
        end: "+=150%",
        pin: true,
        scrub: 0.6,
        animation: tl.current,
        invalidateOnRefresh: true,
      });
    });

    // Small screens: no pinning; play once on enter, as v1 did.
    mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
      const t = (tl.current = build());
      ScrollTrigger.create({
        trigger: root.current,
        start: "top 65%",
        once: true,
        onEnter: () => t.play(0),
      });
      // Re-measure the dot's stops on resize, keeping its place.
      const onRefresh = () => t.invalidate().progress(t.progress());
      ScrollTrigger.addEventListener("refresh", onRefresh);
      return () => ScrollTrigger.removeEventListener("refresh", onRefresh);
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      showFinal();
      ScrollTrigger.addEventListener("refresh", showFinal);
      return () => ScrollTrigger.removeEventListener("refresh", showFinal);
    });

    return () => mm.revert();
  }, []);

  const replay = () => {
    setPlayed(false);
    tl.current?.play(0);
  };

  return (
    <div ref={root} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10">
      {/* The system */}
      <div ref={rail} className="relative min-w-0">
        <div aria-hidden className="absolute bottom-6 left-[11px] top-6 w-px bg-line" />
        <div
          ref={dot}
          aria-hidden
          className="absolute left-[6px] top-0 -mt-[6px] size-3 rounded-full bg-amber opacity-0 shadow-[0_0_0_4px_var(--amber-soft)]"
        />
        <ol className="space-y-3">
          {TRACE.map((step, i) => (
            <li
              key={step.node}
              ref={(el) => {
                nodes.current[i] = el;
              }}
              className="relative pl-10"
            >
              <span aria-hidden className="absolute left-[7px] top-1/2 -mt-[5px] size-[10px] rounded-full border-2 border-line bg-bg" />
              <div className="relative rounded-md border bg-surface px-4 py-3">
                <span
                  ref={(el) => {
                    glows.current[i] = el;
                  }}
                  aria-hidden
                  className="pointer-events-none absolute inset-[-1px] rounded-md border border-sky opacity-0"
                />
                <p className="font-medium">{step.node}</p>
                <p className="text-sm text-muted">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* The logs */}
      <div className="flex min-w-0 flex-col self-start rounded-md border bg-surface">
        <div className="flex items-center justify-between border-b px-4 py-2.5 text-sm text-muted">
          <span>claim-service.log</span>
          <button
            type="button"
            onClick={replay}
            disabled={!played}
            className="font-medium text-sky transition-opacity duration-150 disabled:opacity-40"
          >
            Replay claim
          </button>
        </div>
        <ol className="space-y-3 overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
          {TRACE.map((step, i) => (
            <li
              key={step.log}
              ref={(el) => {
                logs.current[i] = el;
              }}
              className="whitespace-pre opacity-0"
            >
              <span className="text-muted">{String(i + 1).padStart(2, "0")} </span>
              {step.log}
            </li>
          ))}
        </ol>
        <p ref={done} className="border-t px-4 py-2.5 text-sm opacity-0">
          <span className="text-amber">Claim settled.</span>{" "}
          <span className="text-muted">Simulated run; every step maps to code in DriveCover.</span>
        </p>
      </div>
    </div>
  );
}
