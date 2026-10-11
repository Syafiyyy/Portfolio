# Portfolio: notes for Claude Code

This repo is the single home of Adam's portfolio. v2 is finished; work here is keeping it up to date.

- Owner: Adam Syafi. Replies in casual Malay/English mix are fine.
- Live: https://portfolio-adamsyafi.vercel.app (the old portfolio-blond-nu-58.vercel.app domain redirects there; keep it in Vercel).

## Stack

Next.js 16 (App Router, static prerender), TypeScript, Tailwind v4, GSAP (+ ScrollTrigger, SplitText), Lenis, three.js via React Three Fiber, IBM Plex fonts via @fontsource.

## Run and build

- `npm run dev` for local work at http://localhost:3000.
- `npm run build` must pass before every push. Pushing to `main` deploys to Vercel.
- Commit each change separately; push only when Adam says so.
- Budgets: Lighthouse desktop 95+, mobile 85+. Measure a production build (`npm run build`, `npx next start -p 3100`). First kill anything still listening on ports 3000/3100, because stale servers serving a rebuilt `.next` give false results.
- If new Tailwind classes don't apply in dev, stop the dev server and delete `.next`.

## Honesty rules

- All content lives in `src/data/site.ts`. Components read from it; don't hardcode copy.
- Never invent facts. Every label, number, log line and tool must match something real. If a fact isn't provided, ask; don't fill the gap.
- Tools appear only with evidence: each entry in `TOOLS` lists the work (`WORK`) it was used in. No tool without a project or coursework entry.
- Private repos stay private. `DRIVECOVER.repo` is `null` until the FYP is submitted; the GitHub link only renders when it is set.
- Third-party assets need a licence and a credit (footer + README), e.g. the CarConcept car (CC BY 4.0).

## Design rules

- Kickers are lowercase mono paths (`~/projects`), never uppercase or wide-tracked.
- No em dashes in UI copy.
- Navy / sky / amber. Sky is the accent. Amber belongs to the claim only (DriveCover's claim, settlement, damage). The single exception is the badge's green "open to work" dot (`--ok`).
- Respect reduced motion: show the final state, no loops or physics.
- Animate transform and opacity in the DOM; layout must not shift (CLS).
- New libraries only if the current stack can't do it; lazy-load them and report their size.
- Put custom CSS rules that utilities might override in `@layer components`. Unlayered CSS beats Tailwind utilities.

## Adding a finished project

Follow [docs/ADD-PROJECT.md](docs/ADD-PROJECT.md). It lists the facts Adam must provide, what to edit in `site.ts`, how the Stack section and badge pick it up, and the checks before pushing.

## History

The v2 build brief and its step-by-step plan are in [docs/archive/WOW-BRIEF.md](docs/archive/WOW-BRIEF.md), for reference only.
