"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Portrait } from "@/components/portrait";
import { SITE, BADGE, STACK } from "@/data/site";

/*
  The hero's developer ID badge, hanging on a lanyard from above the hero.
  Server-rendered complete and hanging still (the portrait inside is the
  page's LCP and paints at once). After hydration a small physics loop
  takes over (requestAnimationFrame, no library):

    card    the lanyard's end (the clip) is a point mass under gravity on a
            springy rope from the anchor, with air damping. Drag the card
            anywhere: it follows the pointer from where you grabbed it, up
            to the rope's stretch limit. Let go and it keeps the throw: it
            swings with momentum and settles on its own. The card's angle
            follows the rope, lagging a little; a very small sway runs
            while it is left alone.
    rope    a 6-segment verlet rope from the anchor to the clip, drawn as a
            curve with the handle printed along it. It goes slack and bends
            when the card is pushed up, and stretches a little when pulled.
    walls   the hero's sides are soft walls: a hard throw bounces back
            instead of swinging the card out of view.
    tilt    on hover the card tips toward the cursor in 3D (max 6°).

  A click/tap without movement (or Enter/Space on the flip button) turns the
  card over; a drag never does. The face turned away is inert, so focus and
  screen readers only reach the visible side.
  Reduced motion: no physics; it hangs still and flips instantly.
*/

// Physics, in CSS px and seconds. Rest is the clip hanging straight down.
// The lanyard is ~720px (mostly above the hero), so gravity is scaled to
// give a ~1.7s swing: T = 2π·√(L/g).
const GRAVITY = 9800;
const ROPE_K = 900; // rope spring when taut, per unit mass
const DAMPING = 1.5; // air drag on the card, 1/s
const STRETCH = 0.12; // the rope stretches at most 12% past its length
const TURN_K = 140; // card angle chasing the rope's angle (spring)
const TURN_DAMP = 11; //  ...and its damping
const SWAY = 30; // idle sway force, px/s², at a frequency off the pendulum's own
const SWAY_W = 1.3;
const TILT_MAX = 6; // deg, hover tilt toward the cursor
const WALL_K = 2600; // soft walls at the hero's sides (a cushioned bounce)...
const WALL_DAMP = 14;
const WALL_HARD = 12; // ...and a hard stop this far past them
const MAX_THROW = 1500; // px/s, release speed cap
const SEGMENTS = 6;

export function IdBadge({ qr }: { qr: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const strap = useRef<HTMLDivElement>(null);
  const rope = useRef<SVGSVGElement>(null);
  const ropePath = useRef<SVGPathElement>(null);
  const hanger = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const flipper = useRef<HTMLDivElement>(null);
  const frontBtn = useRef<HTMLButtonElement>(null);
  const backBtn = useRef<HTMLButtonElement>(null);
  const [flipped, setFlipped] = useState(false);
  // Set by a flip from the keyboard/button: move focus to the new face.
  const refocus = useRef(false);
  // Set when a pointer press turned into a drag, so it doesn't also flip.
  const dragged = useRef(false);
  // Push the card sideways (px/s), e.g. as it flips.
  const kick = useRef<(vx: number) => void>(() => {});

  useEffect(() => {
    const w = wrap.current;
    const s = strap.current;
    const r = rope.current;
    const path = ropePath.current;
    const h = hanger.current;
    const c = card.current;
    const t = tilt.current;
    if (!w || !s || !r || !path || !h || !c || !t) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Coordinates are relative to the clip's rest point; the anchor is
    // straight above it at the lanyard's full length.
    let L = s.offsetHeight;
    let L0 = L - GRAVITY / ROPE_K; // natural length, so rest sits exactly at L
    const p = { x: 0, y: 0 }; // clip offset from rest
    const v = { x: 0, y: 0 };
    let angle = 0; // card angle, rad (positive = clockwise)
    let spin = 0;
    const tiltNow = { x: 0, y: 0 };
    const tiltTo = { x: 0, y: 0 };
    // Rope points: 0 = anchor (pinned), SEGMENTS = clip (follows the card).
    const pts = Array.from({ length: SEGMENTS + 1 }, (_, i) => ({ x: 0, y: -L + (L * i) / SEGMENTS, px: 0, py: -L + (L * i) / SEGMENTS }));

    // Sideways room inside the hero, relative to rest (measured lazily).
    const walls = { min: -Infinity, max: Infinity };
    const measureWalls = () => {
      const sec = w.closest("section");
      if (!sec) return;
      const sr = sec.getBoundingClientRect();
      const wr = w.getBoundingClientRect();
      walls.min = sr.left + 16 - wr.left;
      walls.max = sr.right - 16 - wr.right;
    };
    measureWalls();

    let drag: { id: number; gx: number; gy: number; x0: number; y0: number; restX: number; restY: number; lx: number; ly: number; lt: number } | null = null;

    // The SVG rope replaces the static strap now that it can move.
    s.style.visibility = "hidden";
    r.style.visibility = "visible";
    h.style.transformOrigin = "50% 0";

    const restPoint = () => {
      const b = w.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + h.offsetTop };
    };
    const toLocal = (x: number, y: number, a: number) => ({ x: x * Math.cos(a) + y * Math.sin(a), y: -x * Math.sin(a) + y * Math.cos(a) });
    const toWorld = (x: number, y: number, a: number) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });

    // Keep the clip within the rope's stretch limit.
    const limit = () => {
      const dx = p.x;
      const dy = p.y + L;
      const d = Math.hypot(dx, dy);
      const max = L * (1 + STRETCH);
      if (d > max) {
        p.x = (dx / d) * max;
        p.y = (dy / d) * max - L;
        // Drop the outward part of the velocity.
        const out = (v.x * dx + v.y * dy) / d;
        if (out > 0) {
          v.x -= (out * dx) / d;
          v.y -= (out * dy) / d;
        }
      }
    };

    const step = (dt: number, time: number) => {
      if (!drag) {
        // Gravity, the rope (a spring only when taut), damping, idle sway.
        let ax = SWAY * Math.sin(time * SWAY_W);
        let ay = GRAVITY;
        const dx = p.x;
        const dy = p.y + L;
        const d = Math.hypot(dx, dy) || 1;
        if (d > L0) {
          ax -= (ROPE_K * (d - L0) * dx) / d;
          ay -= (ROPE_K * (d - L0) * dy) / d;
        }
        const over = p.x > walls.max ? p.x - walls.max : p.x < walls.min ? p.x - walls.min : 0;
        if (over) ax -= WALL_K * over + WALL_DAMP * v.x;
        v.x += (ax - DAMPING * v.x) * dt;
        v.y += (ay - DAMPING * v.y) * dt;
        p.x += v.x * dt;
        p.y += v.y * dt;
        if (p.x > walls.max + WALL_HARD || p.x < walls.min - WALL_HARD) {
          p.x = gsap.utils.clamp(walls.min - WALL_HARD, walls.max + WALL_HARD, p.x);
          v.x *= -0.3;
        }
        limit();
      }
      // The card turns toward the rope's direction, with a little lag.
      const target = -Math.atan2(p.x, p.y + L);
      spin += (TURN_K * (target - angle) - TURN_DAMP * spin) * dt;
      angle += spin * dt;
      // Verlet rope between the pinned anchor and the clip.
      const end = pts[SEGMENTS];
      end.x = end.px = p.x;
      end.y = end.py = p.y;
      for (let i = 1; i < SEGMENTS; i++) {
        const q = pts[i];
        const nx = q.x + (q.x - q.px) * 0.96;
        const ny = q.y + (q.y - q.py) * 0.96 + 2400 * dt * dt;
        q.px = q.x;
        q.py = q.y;
        q.x = nx;
        q.y = ny;
      }
      const seg = L0 / SEGMENTS;
      for (let k = 0; k < 6; k++)
        for (let i = 0; i < SEGMENTS; i++) {
          const a = pts[i];
          const b = pts[i + 1];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const diff = (d - seg) / d;
          // Ends are pinned: only free points move.
          const wa = i === 0 ? 0 : i + 1 === SEGMENTS ? 1 : 0.5;
          const wb = i + 1 === SEGMENTS ? 0 : i === 0 ? 1 : 0.5;
          a.x += dx * diff * wa;
          a.y += dy * diff * wa;
          b.x -= dx * diff * wb;
          b.y -= dy * diff * wb;
        }
      // Hover tilt, eased.
      tiltNow.x += (tiltTo.x - tiltNow.x) * Math.min(1, dt * 10);
      tiltNow.y += (tiltTo.y - tiltNow.y) * Math.min(1, dt * 10);
    };

    // Only touch the DOM when something visibly moved (the idle sway is tiny).
    let lastHang = "";
    let lastTilt = "";
    let lastRope = "";
    const render = () => {
      const hang = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) rotate(${angle.toFixed(3)}rad)`;
      const tl = `rotateX(${tiltNow.x.toFixed(1)}deg) rotateY(${tiltNow.y.toFixed(1)}deg)`;
      if (hang !== lastHang) h.style.transform = lastHang = hang;
      if (tl !== lastTilt) t.style.transform = lastTilt = tl;
      // Smooth curve through the rope points, drawn clip → anchor so the
      // printed handle reads upward, like the static strap.
      const q = [...pts].reverse();
      let d = `M${q[0].x.toFixed(1)} ${q[0].y.toFixed(1)}`;
      for (let i = 1; i < q.length - 1; i++) {
        const mx = (q[i].x + q[i + 1].x) / 2;
        const my = (q[i].y + q[i + 1].y) / 2;
        d += ` Q${q[i].x.toFixed(1)} ${q[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
      }
      d += ` L${q[q.length - 1].x.toFixed(1)} ${q[q.length - 1].y.toFixed(1)}`;
      if (d !== lastRope) path.setAttribute("d", (lastRope = d));
    };

    let raf = 0;
    let last = 0;
    let visible = true;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - (last || now)) / 1000, 1 / 30);
      last = now;
      // Two substeps keep the stiff rope stable.
      step(dt / 2, now / 1000);
      step(dt / 2, now / 1000);
      render();
    };
    const run = (on: boolean) => {
      cancelAnimationFrame(raf);
      last = 0;
      if (on) raf = requestAnimationFrame(frame);
    };
    // Only animate while the hero is on screen and the tab is visible.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      run(visible && !document.hidden);
    });
    io.observe(w);
    const onVis = () => run(visible && !document.hidden);
    document.addEventListener("visibilitychange", onVis);

    // Dragging: the card follows the pointer from the grab point.
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      measureWalls();
      const rest = restPoint();
      const at = toLocal(e.clientX - (rest.x + p.x), e.clientY - (rest.y + p.y), angle);
      drag = { id: e.pointerId, gx: at.x, gy: at.y, x0: e.clientX, y0: e.clientY, restX: rest.x, restY: rest.y, lx: p.x, ly: p.y, lt: e.timeStamp };
      dragged.current = false;
      tiltTo.x = tiltTo.y = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) {
        if (!dragged.current && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 4) {
          dragged.current = true;
          c.setPointerCapture(e.pointerId);
        }
        if (!dragged.current) return;
        const g = toWorld(drag.gx, drag.gy, angle);
        p.x = gsap.utils.clamp(walls.min, walls.max, e.clientX - drag.restX - g.x);
        p.y = e.clientY - drag.restY - g.y;
        limit();
        // Throw velocity: a smoothed estimate from recent moves.
        const dt = Math.max(1, e.timeStamp - drag.lt) / 1000;
        v.x = v.x * 0.4 + ((p.x - drag.lx) / dt) * 0.6;
        v.y = v.y * 0.4 + ((p.y - drag.ly) / dt) * 0.6;
        drag.lx = p.x;
        drag.ly = p.y;
        drag.lt = e.timeStamp;
        return;
      }
      // Hover: tip toward the cursor.
      if (e.pointerType !== "mouse") return;
      const b = c.getBoundingClientRect();
      const nx = ((e.clientX - b.left) / b.width) * 2 - 1;
      const ny = ((e.clientY - b.top) / b.height) * 2 - 1;
      tiltTo.y = gsap.utils.clamp(-1, 1, nx) * TILT_MAX;
      tiltTo.x = -gsap.utils.clamp(-1, 1, ny) * TILT_MAX;
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      // A pause before letting go drops the throw.
      if (e.timeStamp - drag.lt > 80) v.x = v.y = 0;
      const speed = Math.hypot(v.x, v.y);
      if (speed > MAX_THROW) {
        v.x *= MAX_THROW / speed;
        v.y *= MAX_THROW / speed;
      }
      drag = null;
    };
    const onLeave = () => {
      tiltTo.x = tiltTo.y = 0;
    };
    // The browser's own image drag (a faded copy of the photo) must never start.
    const noNativeDrag = (e: DragEvent) => e.preventDefault();

    const onResize = () => {
      measureWalls();
      L = s.offsetHeight;
      L0 = L - GRAVITY / ROPE_K;
    };
    window.addEventListener("resize", onResize);
    c.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    c.addEventListener("pointerup", onUp);
    c.addEventListener("pointercancel", onUp);
    c.addEventListener("pointerleave", onLeave);
    c.addEventListener("dragstart", noNativeDrag);
    kick.current = (vx) => {
      v.x += vx;
    };

    return () => {
      run(false);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      c.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerup", onUp);
      c.removeEventListener("pointercancel", onUp);
      c.removeEventListener("pointerleave", onLeave);
      c.removeEventListener("dragstart", noNativeDrag);
      kick.current = () => {};
      s.style.visibility = "";
      r.style.visibility = "";
      h.style.transform = "";
      t.style.transform = "";
    };
  }, []);

  // Flip: animate and hand focus to the face now showing.
  useEffect(() => {
    const f = flipper.current;
    if (!f) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) gsap.set(f, { rotationY: flipped ? 180 : 0 });
    else gsap.to(f, { rotationY: flipped ? 180 : 0, duration: 0.7, ease: "power3.inOut" });
    if (refocus.current) {
      refocus.current = false;
      (flipped ? backBtn : frontBtn).current?.focus({ preventScroll: true });
    }
  }, [flipped]);

  const flip = (fromButton: boolean) => {
    refocus.current = fromButton;
    kick.current(flipped ? -140 : 140);
    setFlipped((x) => !x);
  };

  return (
    <div ref={wrap} className="badge-swing-vars relative w-64 lg:w-72">
      {/* Lanyard, static: what reduced motion and no-JS see. It runs from
          above the hero (clipped by its overflow) down to the clip. */}
      <div ref={strap} aria-hidden className="badge-strap absolute left-1/2 -translate-x-1/2" style={{ top: "calc(-1 * var(--strap-out))" }}>
        <span>{`${BADGE.handle}  `.repeat(3)}</span>
      </div>
      {/* Lanyard, live: a rope drawn from the clip's rest point. */}
      <svg ref={rope} aria-hidden className="badge-rope pointer-events-none absolute left-1/2 size-px overflow-visible" style={{ top: "var(--strap-in)", visibility: "hidden" }}>
        <path ref={ropePath} id="badge-rope-path" d="M0 0 L0 -1" className="badge-rope-band" />
        <text className="badge-rope-print" dy="3">
          <textPath href="#badge-rope-path" startOffset="10">
            {`${BADGE.handle}  `.repeat(3)}
          </textPath>
        </text>
      </svg>

      {/* Own compositor layers: moving them never repaints the card. */}
      <div ref={hanger} className="relative will-change-transform" style={{ marginTop: "var(--strap-in)" }}>
        <div aria-hidden className="badge-clip mx-auto" />
        <div
          ref={card}
          onClick={() => {
            if (dragged.current) {
              dragged.current = false;
              return;
            }
            flip(false);
          }}
          className="badge-card relative -mt-2 cursor-grab touch-none select-none active:cursor-grabbing"
        >
          <div ref={tilt} className="badge-tilt will-change-transform">
          <div ref={flipper} className="badge-flipper relative">
            {/* Front */}
            <section
              aria-label={`Developer ID badge: ${SITE.name}`}
              inert={flipped}
              className="badge-face relative overflow-hidden rounded-xl border bg-surface shadow-[0_18px_40px_-18px_rgb(0_0_0/0.55)]"
            >
              <span aria-hidden className="badge-slot" />
              <div className="flex items-center justify-between px-4 pb-2 pt-6 font-mono text-[11px] text-muted">
                <span>dev id</span>
                <span className="flex items-center gap-1.5 text-fg">
                  <span aria-hidden className="badge-dot" />
                  {BADGE.status}
                </span>
              </div>
              <div className="px-4">
                {/* Square on phones keeps the hero short; 4:5 from sm. */}
                <Portrait className="relative aspect-square w-full overflow-hidden rounded-md border bg-surface sm:aspect-[4/5]" />
              </div>
              <div className="flex items-start justify-between gap-3 px-4 pt-3">
                <div className="min-w-0">
                  {/* One line each, so the card's height can't change when
                      the web font swaps in (that would shift the hero). */}
                  <p className="truncate text-title leading-tight">{SITE.name}</p>
                  <p className="mt-0.5 truncate text-sm text-muted">{SITE.role}</p>
                </div>
                <div className="shrink-0 overflow-hidden rounded-sm">{qr}</div>
              </div>
              <dl className="px-4 pb-3 pt-2 font-mono text-[11px] leading-relaxed">
                {BADGE.lines.map((l) => (
                  <div key={l.key} className="flex gap-1.5">
                    <dt className="text-muted">{l.key}:</dt>
                    <dd>{l.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex items-center justify-between border-t px-4 py-2 font-mono text-[11px] text-muted">
                <span aria-hidden>qr: linkedin</span>
                <button
                  ref={frontBtn}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    flip(true);
                  }}
                  className="press link"
                  data-tone="muted"
                  aria-label="Flip the badge to see my tech stack"
                >
                  <span className="link-label">flip</span>
                  <span aria-hidden>↻</span>
                </button>
              </div>
            </section>

            {/* Back: the stack */}
            <section
              aria-label="Tech stack"
              inert={!flipped}
              // Hidden (not just turned away) until it's flipped to, so its chips
              // rewrapping when the web font loads isn't counted as a layout shift.
              // Hides only after the flip back has finished turning.
              className={`badge-face badge-back absolute inset-0 flex flex-col overflow-hidden rounded-xl border bg-surface shadow-[0_18px_40px_-18px_rgb(0_0_0/0.55)] transition-[visibility] ${
                flipped ? "visible" : "invisible delay-700"
              }`}
            >
              <span aria-hidden className="badge-slot" />
              <div className="px-4 pb-2 pt-6 font-mono text-[11px] text-muted">
                <span className="text-sky">~</span>/stack
              </div>
              <div className="space-y-3 px-4 pt-1 sm:space-y-4">
                {STACK.map((g) => (
                  <div key={g.group}>
                    <p className="font-mono text-meta text-muted">{g.group}</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {g.items.map((it) => (
                        <li key={it} className="rounded-sm border px-2 py-px text-[13px] sm:py-0.5 sm:text-sm">
                          {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {/* What I'm open to and where to find me, from SITE. */}
              <div className="mt-auto space-y-2 px-4 pb-3 pt-3">
                {/* Not on phones: the back is shorter there, and Contact says it too. */}
                <p className="hidden text-sm text-muted sm:block">{SITE.openTo}</p>
                <dl className="font-mono text-[11px] leading-relaxed">
                  <div className="flex gap-1.5">
                    <dt className="text-muted">github:</dt>
                    <dd>{SITE.links.github.replace(/^https:\/\/github\.com\//, "")}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-muted">mail:</dt>
                    <dd className="truncate">{SITE.email}</dd>
                  </div>
                </dl>
              </div>
              <div className="flex items-center justify-between border-t px-4 py-2 font-mono text-[11px] text-muted">
                <span aria-hidden>{BADGE.handle}</span>
                <button
                  ref={backBtn}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    flip(true);
                  }}
                  className="press link"
                  data-tone="muted"
                  aria-label="Flip the badge back to the front"
                >
                  <span className="link-label">flip back</span>
                  <span aria-hidden>↻</span>
                </button>
              </div>
            </section>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
