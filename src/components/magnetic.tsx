"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const MAX = 6; // px, the furthest the element is pulled
const REACH = 24; // px around the element where the pull starts

// Pulls its child slightly toward a nearby mouse pointer and lets go when it
// leaves. Mouse only; nothing for touch or reduced motion.
export function Magnetic({ children }: { children: React.ReactNode }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const mq = (q: string) => window.matchMedia(q).matches;
    if (!mq("(pointer: fine)") || mq("(prefers-reduced-motion: reduce)")) return;

    const toX = gsap.quickTo(node, "x", { duration: 0.35, ease: "power3.out" });
    const toY = gsap.quickTo(node, "y", { duration: 0.35, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      // Measure without our own offset so the target doesn't chase itself.
      const r = node.getBoundingClientRect();
      const ox = Number(gsap.getProperty(node, "x")) || 0;
      const oy = Number(gsap.getProperty(node, "y")) || 0;
      const cx = r.left - ox + r.width / 2;
      const cy = r.top - oy + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const inside = Math.abs(dx) < r.width / 2 + REACH && Math.abs(dy) < r.height / 2 + REACH;
      if (!inside) {
        toX(0);
        toY(0);
        return;
      }
      // Pull scales with distance from centre, capped at MAX.
      toX(gsap.utils.clamp(-MAX, MAX, dx * 0.2));
      toY(gsap.utils.clamp(-MAX, MAX, dy * 0.3));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      gsap.killTweensOf(node);
      gsap.set(node, { clearProps: "transform" });
    };
  }, []);

  return (
    <span ref={el} className="inline-block">
      {children}
    </span>
  );
}
