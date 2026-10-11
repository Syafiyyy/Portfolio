# Portfolio — notes for Claude Code

- Owner: Adam Syafi. Replies in casual Malay/English mix are fine.
- Current goal: build v2 from `docs/WOW-BRIEF.md`. Follow its build order and stop after each step for review.
- All content lives in `src/data/site.ts`. Never invent facts about DriveCover; every label must match something it really does.
- Stack: Next.js 16 (App Router), TypeScript, Tailwind v4, GSAP, IBM Plex fonts via @fontsource.
- Run: `npm run dev`. Check `npm run build` passes before every push. Pushing to `main` deploys to Vercel.
- Before UI work, use the frontend-design skill (and VectorLab motion/reduced-motion if installed). The brief's "wow" direction overrides any skill advice to keep motion minimal.
