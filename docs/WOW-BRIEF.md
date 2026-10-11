# Portfolio v2 brief: "wow, on-subject"

v1 is live and tidy but too plain. v2 must make a visitor say "wow" in the first five seconds, while still loading fast and staying readable for recruiters. Every effect must be about the subject: an engineer who builds AI that assesses car damage and moves insurance claims through a backend.

Keep everything that exists (content in `src/data/site.ts`, Trace a claim, sections, colours, IBM Plex). Upgrade the experience on top of it.

## The three signature moments

### 1. Hero: the AI damage scan (React Three Fiber)
- A 3D car on the right side of the hero (left/top on mobile), slowly turning on a dark stage with soft rim light in sky blue.
- Every few seconds a horizontal **scan plane** sweeps across the car (sky-blue line + faint grid glow, like a body scanner). As it passes, two or three parts (front bumper, headlamp, door) **light up amber** and a small label pops beside each: `bumper · moderate`, `headlamp · replace`. Then they fade and the next scan begins.
- The visitor can drag to rotate the car (OrbitControls, limited angles, no zoom).
- Write the scan shader yourself (a custom material or `onBeforeCompile` on the car material: compare world-space position to a moving uniform, add emissive band). Do not copy shader code from other demos.
- Model: Kenney **Car Kit** (CC0) from https://kenney-assets.itch.io/car-kit or https://kenney.nl. Pick one sedan or hatchback, export/convert to `.glb` with `npx gltf-pipeline` or `gltf-transform` and compress (Draco or meshopt). Target under 500 KB. Credit Kenney in README (not required, but kind).
- Performance: lazy-load the canvas after first paint; `dpr={[1, 1.5]}`; pause rendering when the hero is off screen; on low-end/mobile, cap frame rate. Show a static poster image while it loads.

### 2. Intro sequence (one orchestrated page load, about 1.6 s total)
1. Background grid fades in.
2. Headline reveals line by line (split by line, mask + translateY, 120 ms stagger).
3. The car rises into view and the first scan runs.
4. Nav and links fade in last.
Plays once per session (sessionStorage). Skip entirely with `prefers-reduced-motion`.

### 3. Trace a claim becomes scroll-driven
- Pin the section and **scrub** the existing GSAP timeline with ScrollTrigger (`scrub: 0.6`), so the amber claim moves as the visitor scrolls. About 150vh of scroll for the whole trace.
- Keep the Replay button for people who scroll fast.
- On mobile (<768px) do not pin; play on enter as v1 does.

## The animated photo (shows design + frontend skill)
- The profile photo starts as a **dot-matrix / halftone** version of itself (draw it to a canvas, sample brightness, render dots in sky blue).
- A scan line (same visual language as the car) sweeps down and **reveals the real photo** behind it.
- On hover the dots briefly return under the cursor (small radius), then settle.
- Make it larger than v1 (about 160 px wide on desktop). Ask Adam for a higher-resolution photo if the current `public/adam.jpg` (238 × 309) looks soft at that size.

## Supporting polish (subtle, not more signatures)
- Smooth scrolling with **Lenis** (MIT), wired to GSAP ScrollTrigger's ticker.
- Section headings reveal with a mask on enter (once).
- Magnetic effect on the two hero links and the "Copy email" button (small, max 6 px pull).
- DriveCover fact numbers count up once when they enter view.
- No custom cursor, no glitch, no marquee, no glassmorphism, no gradient buttons.

## Rules
- Libraries: three, @react-three/fiber, @react-three/drei, gsap (+ScrollTrigger), lenis. All MIT. Postprocessing (bloom) only if it stays above 50 fps on a mid laptop.
- Animate transform and opacity in the DOM. WebGL uniforms are fine.
- `prefers-reduced-motion`: no intro, no pinning, car static with damage labels shown, photo shown normally.
- Lighthouse performance 85+ on desktop, layout must not shift when the canvas loads.
- Mobile from 375 px: car smaller and above the headline, everything readable, no horizontal scroll.
- Keep honesty: every label and log line describes something DriveCover actually does.

## Build order (stop after each for Adam to review in the browser)
1. Lenis + intro sequence + heading reveals.
2. Hero car with scan effect.
3. Animated photo.
4. Scroll-scrubbed Trace a claim + count-up numbers + magnetic links.
5. Mobile, reduced motion, performance pass, then push to `main` (Vercel deploys automatically).
