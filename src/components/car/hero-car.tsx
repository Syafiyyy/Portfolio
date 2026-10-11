"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { onCarCue } from "@/lib/intro-cue";
import type { SceneColors } from "./car-scene";

// three + R3F stay out of the first-load bundle.
const CarScene = dynamic(() => import("./car-scene"), { ssr: false });

const COLORS: Record<"dark" | "light", SceneColors> = {
  dark: { sky: "#38bdf8", amber: "#f5a524", paint: "#c9d2de" },
  light: { sky: "#0369a1", amber: "#d97706", paint: "#e4e9f0" },
};

export function HeroCar() {
  const box = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [mount, setMount] = useState(false);
  const [ready, setReady] = useState(false);
  const [cued, setCued] = useState(false);
  const [active, setActive] = useState(true);
  const [env, setEnv] = useState({ reduced: false, lowEnd: false, interactive: false });

  // Read the device once, then mount the canvas after first paint.
  useEffect(() => {
    const mq = (q: string) => window.matchMedia(q).matches;
    const cores = navigator.hardwareConcurrency ?? 8;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const coarse = mq("(pointer: coarse)");

    const start = () => {
      setEnv({
        reduced: mq("(prefers-reduced-motion: reduce)"),
        lowEnd: coarse || cores <= 4 || memory <= 4,
        // Touch drags would fight page scroll, so only fine pointers can rotate.
        interactive: mq("(pointer: fine)"),
      });
      setMount(true);
    };
    // Safari has no requestIdleCallback.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(start, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(start, 200);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => onCarCue(() => setCued(true)), []);

  // Stop rendering while the hero is off screen.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const shown = ready && (cued || env.reduced);
  const colors = COLORS[resolvedTheme === "light" ? "light" : "dark"];

  return (
    <div ref={box} className="relative aspect-[4/3] w-full overflow-hidden lg:aspect-square">
      <Poster hidden={shown} />
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
            onReady={() => setReady(true)}
          />
        </div>
      )}
    </div>
  );
}

// Shown until the model is ready: the empty scanner bed the car will rise onto.
function Poster({ hidden }: { hidden: boolean }) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 flex items-end justify-center pb-[18%] transition-opacity duration-500 ${hidden ? "opacity-0" : "opacity-100"}`}
    >
      <div className="scan-bed" />
    </div>
  );
}
