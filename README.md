# Adam Syafi — portfolio

Personal portfolio built with Next.js, TypeScript, Tailwind CSS and GSAP.

The centrepiece is **Trace a claim**: a simulated insurance claim moving through DriveCover's real architecture, with the service logs it would produce.

## Edit content

Everything on the page comes from `src/data/site.ts`. The resume behind the "Resume" link is `public/Resume_Adam_Syafi.pdf`.

## Run locally

```bash
npm install
npm run dev
```

## Credits

Started from [dillionverma/portfolio](https://github.com/dillionverma/portfolio) (MIT, see `LICENSE`), then redesigned.

- Car model: Kenney [Car Kit](https://kenney.nl/assets/car-kit) (CC0), compressed with gltf-transform.
- Chess evals: computed once with [Stockfish](https://stockfishchess.org) 17.1 via `scripts/chess-evals.mjs`; the engine itself is not part of this repo.
