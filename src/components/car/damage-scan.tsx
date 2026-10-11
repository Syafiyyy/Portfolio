"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { SCAN, TRACE } from "@/data/site";
import type { SceneColors } from "./car-scene";

// three + R3F load only when the stage nears the viewport.
const CarScene = dynamic(() => import("./car-scene"), { ssr: false });

const COLORS: Record<"dark" | "light", SceneColors> = {
  dark: { sky: "#38bdf8", amber: "#f5a524", paint: "#c9d2de" },
  light: { sky: "#0369a1", amber: "#d97706", paint: "#e4e9f0" },
};

// Where each label sits relative to its pin, so text stays off the car body.
// Narrow stages have no room at the sides, so labels stack above/below there.
const LABEL_SIDE: Record<(typeof SCAN.parts)[number]["part"], { wide: "left" | "right"; narrow: "above" | "below" }> = {
  bumper: { wide: "left", narrow: "below" },
  headlamp: { wide: "right", narrow: "above" },
};

// The trace step this stage illustrates.
const VISION_STEP = TRACE.findIndex((t) => t.node === "Gemini vision");
const VISION = TRACE[VISION_STEP];

/*
  The visual for Trace a claim's "Gemini vision" step: a car turning on a
  scanner bed. When the stage scrolls into view the car rises, then a scan
  plane sweeps it on a loop and the damaged parts light up amber with labels.
*/
export function DamageScan() {
  const box = useRef<HTMLDivElement>(null);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const { resolvedTheme } = useTheme();
  const [mount, setMount] = useState(false);
  const [ready, setReady] = useState(false);
  const [cued, setCued] = useState(false);
  const [active, setActive] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [env, setEnv] = useState({ reduced: false, lowEnd: false, interactive: false, webgl: true });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const mq = (q: string) => window.matchMedia(q).matches;
    const cores = navigator.hardwareConcurrency ?? 8;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const reduced = mq("(prefers-reduced-motion: reduce)");

    // Near the viewport: load three and the model in an idle moment, so its
    // parse cost doesn't land on top of page load. On screen: render.
    let idle = 0;
    const whenIdle = (fn: () => void) =>
      typeof window.requestIdleCallback === "function" ? (idle = window.requestIdleCallback(fn, { timeout: 2000 })) : fn();
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        whenIdle(() => {
          const probe = document.createElement("canvas");
          const webgl = !!(probe.getContext("webgl2") || probe.getContext("webgl"));
          setEnv({
            reduced,
            webgl,
            lowEnd: mq("(pointer: coarse)") || cores <= 4 || memory <= 4,
            // Touch drags would fight page scroll, so only fine pointers can rotate.
            interactive: mq("(pointer: fine)"),
          });
          // No WebGL: keep the poster as the picture instead of a 3D scene.
          setMount(webgl);
        });
      },
      { rootMargin: "600px 0px" },
    );
    const onScreen = new IntersectionObserver(([e]) => setActive(e.isIntersecting));
    // Well into view: rise and start scanning (once).
    const inView = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setCued(true);
        inView.disconnect();
      },
      { threshold: 0.45 },
    );
    // On short screens the panel starts within that 600px margin, which would
    // pull three.js in during page load. So arm it on the first scroll,
    // unless the panel is already on screen.
    const armNear = () => near.observe(el);
    if (el.getBoundingClientRect().top < window.innerHeight) armNear();
    else window.addEventListener("scroll", armNear, { once: true, passive: true });
    onScreen.observe(el);
    inView.observe(el);
    return () => {
      if (idle) window.cancelIdleCallback(idle);
      window.removeEventListener("scroll", armNear);
      near.disconnect();
      onScreen.disconnect();
      inView.disconnect();
    };
  }, []);

  const shown = ready && (cued || env.reduced);
  const colors = COLORS[resolvedTheme === "light" ? "light" : "dark"];

  return (
    <figure className="overflow-hidden rounded-md border bg-surface">
      <div className="flex items-center justify-between gap-4 border-b px-4 py-2.5 text-sm text-muted">
        <span>{VISION.node.toLowerCase().replace(" ", "-")}.scan</span>
        <span className="hidden sm:inline">step {VISION_STEP + 1} of {TRACE.length} in the claim below</span>
      </div>

      <div ref={box} className="scan-stage relative aspect-[4/3] w-full sm:aspect-[2/1]">
        {/* Poster: a still of this scene. A faint ghost while three.js loads
            (the real car then rises into it); the full picture without WebGL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/models/car-poster.webp"
          alt=""
          aria-hidden
          width={1400}
          height={700}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${shown ? "opacity-0" : env.webgl ? "opacity-30" : "opacity-100"}`}
        />
        {mount && (
          <div
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${shown ? "opacity-100" : "opacity-0"} ${env.interactive ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            <CarScene
              colors={colors}
              reduced={env.reduced}
              lowEnd={env.lowEnd}
              active={active}
              cued={cued}
              interactive={env.interactive}
              labels={labels}
              onReady={() => setReady(true)}
              onFirstScan={() => setScanned(true)}
            />
          </div>
        )}
        {/* Labels live in the DOM; the scene pins them to the parts every frame. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {SCAN.parts.map((p, i) => (
            <div
              key={p.part}
              ref={(el) => {
                labels.current[i] = el;
              }}
              className="absolute left-0 top-0 opacity-0"
            >
              <span className="scan-pin" />
              <span className="scan-label" data-side={LABEL_SIDE[p.part].wide} data-side-narrow={LABEL_SIDE[p.part].narrow}>
                {p.part} · {p.severity}
              </span>
            </div>
          ))}
        </div>
      </div>

      <figcaption className="flex flex-col gap-1 border-t px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <span className="text-sm text-muted">{VISION.detail}.</span>
        <code
          className={`font-mono text-[13px] sm:whitespace-nowrap transition-opacity duration-300 ${scanned || env.reduced ? "opacity-100" : "opacity-0"}`}
        >
          {VISION.log}
        </code>
      </figcaption>
    </figure>
  );
}
