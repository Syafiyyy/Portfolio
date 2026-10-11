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

- Car model: [CarConcept](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept) by Eric Chadwick, Khronos glTF Sample Assets, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), modified (logos removed, simplified, recoloured). © 2024 Darmstadt Graphics Group GmbH. The Khronos and 3D Commerce logos in the original are trademarks and are not included. Processed with gltf-transform: Pearl paint variant, plain tinted glass, simplified to ~89k triangles, 1K WebP textures, meshopt compression.
- Chess evals: computed once with [Stockfish](https://stockfishchess.org) 17.1 via `scripts/chess-evals.mjs`; the engine itself is not part of this repo.
