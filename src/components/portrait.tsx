"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SITE } from "@/data/site";
import { introPlaying } from "@/components/intro";
import { onPortraitCue } from "@/lib/intro-cue";

const CELL = 6; // halftone cell, CSS px
const HOVER_RADIUS = 38; // CSS px
const SETTLE = 0.22; // s, time constant for hover dots to fade back out
const REVEAL = 0.95; // s, scan line top → bottom
const BAND = 26; // CSS px of soft edge above the scan line
const revealEase = gsap.parseEase("power2.inOut");

/*
  The hero photo as a halftone that a scan line uncovers.
  The real <img> is always underneath. A canvas on top draws, per cell, a
  background-coloured square plus a sky-blue dot sized by the photo's
  brightness there. Each cell has a cover value (0..1):
  - before the reveal every cell is covered, so you see only dots
  - the scan line sweeps down and clears cells above it
  - the pointer re-covers cells near it, which then fade back to the photo
  The loop only runs while something is changing.
*/
export function Portrait() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = wrap.current;
    const cv = canvas.current;
    const photo = img.current;
    if (!el || !cv || !photo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const intro = introPlaying();
    // During the intro the wrapper is still invisible here; keep the bare
    // photo hidden until the halftone has been drawn over it.
    if (intro) photo.style.visibility = "hidden";

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let lum = new Float32Array(0); // 0..1 brightness per cell
    let hover = new Float32Array(0); // 0..1 hover cover per cell
    let scanY = intro ? -1 : Infinity; // CSS px; cells below are covered. -1 = not started
    let revealing = false;
    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    let last = 0;
    let colors = { bg: "#0b1220", sky: "#38bdf8" };
    let loaded = false;
    let disposed = false;

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      colors = { bg: cs.getPropertyValue("--bg").trim() || colors.bg, sky: cs.getPropertyValue("--sky").trim() || colors.sky };
    };

    // Sample the photo's brightness per cell, cropped like object-cover.
    const sample = () => {
      const r = el.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      const iw = photo.naturalWidth;
      const ih = photo.naturalHeight;
      const scale = Math.max((cols * CELL) / iw, (rows * CELL) / ih);
      const sw = (cols * CELL) / scale;
      const sh = (rows * CELL) / scale;
      octx.drawImage(photo, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, cols, rows);
      const data = octx.getImageData(0, 0, cols, rows).data;
      lum = new Float32Array(cols * rows);
      for (let i = 0; i < lum.length; i++) {
        const l = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
        lum[i] = l;
      }
      hover = new Float32Array(cols * rows);
    };

    const coverAt = (i: number, cy: number) => {
      // scanY < 0: not revealed yet, all covered. Otherwise cells above the line clear.
      const base = scanY < 0 ? 1 : Math.min(1, Math.max(0, (cy - scanY + BAND) / BAND));
      return Math.max(base, hover[i]);
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (let y = 0; y < rows; y++) {
        const cy = y * CELL + CELL / 2;
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const c = coverAt(i, cy);
          if (c < 0.01) continue;
          ctx.globalAlpha = c;
          ctx.fillStyle = colors.bg;
          ctx.fillRect(x * CELL, y * CELL, CELL + 0.5, CELL + 0.5);
          const r = (CELL / 2) * (0.12 + 0.88 * Math.sqrt(lum[i]));
          ctx.fillStyle = colors.sky;
          ctx.beginPath();
          ctx.arc(x * CELL + CELL / 2, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // The scan line and its glow, while it travels.
      if (revealing) {
        ctx.globalAlpha = 1;
        const g = ctx.createLinearGradient(0, scanY - BAND, 0, scanY);
        g.addColorStop(0, "transparent");
        g.addColorStop(1, colors.sky);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = g;
        ctx.fillRect(0, scanY - BAND, w, BAND);
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.sky;
        ctx.fillRect(0, scanY - 1, w, 2);
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;
      let busy = revealing;

      const decay = Math.exp(-dt / SETTLE);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          let v = hover[i] * decay;
          if (pointer) {
            const dx = x * CELL + CELL / 2 - pointer.x;
            const dy = y * CELL + CELL / 2 - pointer.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < HOVER_RADIUS) v = Math.max(v, 1 - Math.max(0, d - HOVER_RADIUS * 0.35) / (HOVER_RADIUS * 0.65));
          }
          if (v < 0.01) v = 0;
          else busy = true;
          hover[i] = v;
        }
      }
      draw();
      if (busy || pointer) start();
      else last = 0;
    };

    const start = () => {
      if (!raf && !disposed) raf = requestAnimationFrame(tick);
    };

    let tween: gsap.core.Tween | undefined;
    const reveal = () => {
      if (!loaded || revealing || scanY >= 0) return;
      revealing = true;
      const state = { p: 0 };
      tween = gsap.to(state, {
        p: 1,
        duration: REVEAL,
        ease: "none",
        onUpdate: () => {
          scanY = revealEase(state.p) * (h + BAND);
        },
        onComplete: () => {
          revealing = false;
          scanY = Infinity;
          start();
        },
      });
      start();
    };

    let cued = false;
    const offCue = onPortraitCue(() => {
      cued = true;
      reveal();
    });

    const init = () => {
      if (disposed) return;
      loaded = true;
      readColors();
      sample();
      draw();
      // The halftone now covers the photo, so the photo can be shown under it.
      photo.style.visibility = "";
      if (cued) reveal();
    };
    if (photo.complete && photo.naturalWidth) init();
    else photo.addEventListener("load", init, { once: true });

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      start();
    };
    const onLeave = () => {
      pointer = null;
      start();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    const ro = new ResizeObserver(() => {
      if (!loaded) return;
      sample();
      draw();
    });
    ro.observe(el);

    // Theme switch: redraw in the new colours.
    const mo = new MutationObserver(() => {
      readColors();
      if (loaded) draw();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      offCue();
      tween?.kill();
      photo.style.visibility = "";
      photo.removeEventListener("load", init);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <div ref={wrap} className="relative aspect-[3/4] w-full overflow-hidden rounded-md border bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={img}
        src={SITE.portrait.src}
        alt={`Photo of ${SITE.name}`}
        width={SITE.portrait.width}
        height={SITE.portrait.height}
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover"
      />
      <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
    </div>
  );
}
