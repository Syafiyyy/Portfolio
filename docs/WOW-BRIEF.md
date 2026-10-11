# Portfolio v2 brief: "wow, on-subject"

v1 is live and tidy but too plain. v2 must make a visitor say "wow" in the first five seconds, while still loading fast and staying readable for recruiters. Every effect must be about the subject: an engineer who builds AI that assesses car damage and moves insurance claims through a backend.

Keep everything that exists (content in `src/data/site.ts`, Trace a claim, sections, colours, IBM Plex). Upgrade the experience on top of it.

## The signature moments

### 1. Hero: the animated portrait (shows design + frontend skill)
The hero belongs to Adam. A large portrait sits on the right (desktop) / top (mobile).
- The photo starts as a **dot-matrix / halftone** version of itself (draw it to a canvas, sample brightness, render dots in sky blue).
- A scan line (same visual language as the car scan) sweeps down and **reveals the real photo** behind it. The intro sequence ends on this reveal.
- On hover the dots briefly return under the cursor (small radius), then settle.
- Large: about 400 px wide on desktop. Photo: `public/adam-portrait.webp`, 900 × 1200 (3:4) WebP with a transparent background, made from the cut-out original in `assets-src/adam-portrait.png` (not committed). The halftone draws dots only on the person.

### 2. DriveCover: the AI damage scan (React Three Fiber)
Lives in the DriveCover section, directly above Trace a claim. It is the visual for the trace's **Gemini vision** step ("reads the photos and estimates the damage") and plays when it scrolls into view, not in the intro.
- A 3D car slowly turning on a dark stage with soft rim light in sky blue.
- Every few seconds a horizontal **scan plane** sweeps across the car (sky-blue line + faint grid glow, like a body scanner). As it passes, two or three parts (front bumper, headlamp, door) **light up amber** and a small label pops beside each: `bumper · moderate`, `headlamp · replace`. Then they fade and the next scan begins.
- The visitor can drag to rotate the car (OrbitControls, limited angles, no zoom).
- Write the scan shader yourself (a custom material or `onBeforeCompile` on the car material: compare world-space position to a moving uniform, add emissive band). Do not copy shader code from other demos.
- Model: Kenney **Car Kit** (CC0) from https://kenney-assets.itch.io/car-kit or https://kenney.nl. Pick one sedan or hatchback, export/convert to `.glb` with `npx gltf-pipeline` or `gltf-transform` and compress (Draco or meshopt). Target under 500 KB. Credit Kenney in README (not required, but kind).
- Under the stage, the Gemini vision log line from `TRACE` appears once the first scan finishes. Labels come from `SCAN` in `site.ts`, which mirrors that log (bumper and headlamp, both moderate).
- Performance: load three.js only when the section nears the viewport; `dpr={[1, 1.5]}`; pause rendering when the hero is off screen; on low-end/mobile, cap frame rate. Show a static poster image while it loads.

### 3. Intro sequence (one orchestrated page load, about 2 s total)
1. Background grid fades in.
2. Headline reveals line by line (split by line, mask + translateY, 120 ms stagger).
3. The halftone portrait fades in; nav and links fade in.
4. Last: the scan line sweeps down the portrait and reveals the real photo.
Plays once per session (sessionStorage). Skip entirely with `prefers-reduced-motion`.

### 4. Trace a claim becomes scroll-driven
- Pin the section and **scrub** the existing GSAP timeline with ScrollTrigger (`scrub: 0.6`), so the amber claim moves as the visitor scrolls. About 150vh of scroll for the whole trace.
- Keep the Replay button for people who scroll fast.
- On mobile (<768px) do not pin; play on enter as v1 does.

## Project signature animations
Rule: every project gets its own small signature animation tied to what it actually does. No generic hover effects standing in for one.

### Chess club app: Légal's mate with an evaluation bar
- A small chessboard (SVG, about 300 px) beside the project text plays **Légal's mate** (1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6 5.Nxe5 Bxd1 6.Bxf7+ Ke7 7.Nd5#), with each move's from/to squares highlighted.
- Why this line: it is a classic beginner trap, which is what the app's adjustable Stockfish opponent helps players learn to avoid, and the eval genuinely swings (about +0.3, then +2.00, then mate in 2 the moment Black takes the queen). The caption says so.
- A vertical evaluation bar beside the board moves after each move, Stockfish-style (White fills from the bottom, Lichess-style; number in mono, e.g. `+0.36`).
- Honesty: the evals are real. Compute them once with Stockfish (the `stockfish` npm WASM build, fixed depth such as 18) in a small script, and store moves + evals in `site.ts` with a note on engine and depth. No made-up numbers.
- Plays once when it scrolls into view, then loops slowly while visible; pauses off screen. Reduced motion: final position and its eval, static.
- Pieces: a flat SVG set drawn in-house (no third-party licence).
- No chess library needed at runtime: the moves are fixed, so store from/to squares (plus castling/capture flags) and animate pieces with transforms.

## Supporting polish (subtle, not more signatures)
- Smooth scrolling with **Lenis** (MIT), wired to GSAP ScrollTrigger's ticker.
- Section headings reveal with a mask on enter (once).
- Magnetic effect on the two hero links and the "Copy email" button (small, max 6 px pull).
- DriveCover fact numbers count up once when they enter view.
- No custom cursor, no glitch, no marquee, no glassmorphism, no gradient buttons.

## Rules
- Libraries: three, @react-three/fiber, @react-three/drei, gsap (+ScrollTrigger), lenis. All MIT. Postprocessing (bloom) only if it stays above 50 fps on a mid laptop.
- Animate transform and opacity in the DOM. WebGL uniforms are fine.
- `prefers-reduced-motion`: no intro, no pinning, car static with damage labels shown, photo shown normally, chessboard on its final position.
- Lighthouse performance 85+ on desktop, layout must not shift when the canvas loads.
- Mobile from 375 px: portrait above the headline, car stage full width and shorter, everything readable, no horizontal scroll.
- Keep honesty: every label and log line describes something DriveCover actually does.

## Build order (stop after each for Adam to review in the browser)
1. Lenis + intro sequence + heading reveals. (done)
2. Car with scan effect. (done, first in the hero)
3. Change of direction: hero portrait (halftone + scan reveal + hover dots), intro ends on the reveal; car scan moves into DriveCover above Trace a claim, plays on view.  (done)
4. Chess club signature animation (precomputed Stockfish evals: `scripts/chess-evals.mjs`).  (done)
5. Scroll-scrubbed Trace a claim + count-up numbers + magnetic links.  (done)
6. Mobile, reduced motion, performance pass, Open Graph image, car poster, Lighthouse, then push to `main` (Vercel deploys automatically).  (done)
