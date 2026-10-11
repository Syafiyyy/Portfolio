# Adding a finished project

A checklist for putting a new, finished project on the site. Work through it in order. Nothing goes on the site that isn't real.

## 1. Facts Adam must provide

Don't start until all of these are in hand. If one is missing, ask; never fill it in.

- [ ] **Name**
- [ ] **Period**, e.g. `2025 – 2026`
- [ ] **One-line problem**: what it solves, for whom
- [ ] **What I built**: Adam's own part, in a sentence or two
- [ ] **Stack**: the tools actually used
- [ ] **2–4 real numbers**, e.g. tests, users, tables, response times. Each must be checkable.
- [ ] **Link**: repo or live demo, or "private" (then no link is shown)
- [ ] **Screenshot**: a real capture of the project

## 2. Edit only `src/data/site.ts`

All content lives there; components read from it.

- [ ] **`PROJECTS`**: add an entry with `name`, `period`, `description` (the problem plus what was built), `stack`, `href` (`null` if private) and `signature: null`.
- [ ] **`WORK`**: add `{ id, name, kind: "project", href }`, and add the new `id` to the `WorkId` type above it.
  - `href` is the evidence: the repo or demo if public, otherwise `"#projects"` (the project on this page).
  - Coursework uses `kind: "coursework"` and shows in the quieter rows.
- [ ] **`TOOLS`**:
  - For each tool the project used, add the new `id` to that tool's `used` list. This is what makes the Stack section link the project.
  - A new tool needs a full entry: `name`, `layer` (frontend, backend, data, ai, tools; or coursework if only used in coursework), `icon` and `used`.
- [ ] **New tool icon**: `icon` is a [Simple Icons](https://simpleicons.org) slug. Also import it and add it to `ICONS` in `src/components/stack/stack-icons.tsx`. That's the one place outside `site.ts` to touch.
- [ ] **Badge back**: nothing to edit. `STACK` is derived from `TOOLS`. Do check it still fits (step 5).

### Rules

- New tools need real evidence. No tool without a project (or coursework entry) in `WORK`.
- Labels must match what the project really does. Leave out anything not provided in step 1.
- No em dashes in copy; kickers stay lowercase mono.

## 3. First time only: numbers and screenshot

`PROJECTS` doesn't have fields for these yet. The first project that brings them needs a small code change:

- [ ] Add `facts?: { value: string; label: string }[]` to the project type. Render them like DriveCover's facts (`CountUp` + label) in the Projects list in `src/app/page.tsx`.
- [ ] Add `image?: { src: string; width: number; height: number; alt: string }` and render it in the project row. Give it explicit `width`/`height` so it can't shift the layout, and use `loading="lazy"`.
- [ ] Keep the frame consistent with the existing project row; change nothing else in the section.

## 4. Screenshot

- [ ] Save it as `public/projects/<slug>.webp`, **150 KB or less**. Convert with sharp (already installed via Next):

  ```sh
  node -e "require('sharp')(process.argv[1]).resize({width:1600,withoutEnlargement:true}).webp({quality:80}).toFile(process.argv[2]).then(i=>console.log(i.size,'bytes'))" input.png public/projects/<slug>.webp
  ```

  If it's still over 150 KB, lower `quality` or `width`.
- [ ] Write real alt text: what the screenshot shows.

## 5. Check before pushing

- [ ] `npm run build` passes.
- [ ] Look at it at **375px** and **desktop** (1440px), dark and light:
  - the new project row and its numbers;
  - the Stack section: the new tools light the project, and the project lights its tools;
  - the badge back (flip it) at 320, 640 and 1024px: nothing cut off.
- [ ] **Lighthouse mobile 85+** on a production build (`npm run build`, `npx next start -p 3100`). Kill stale servers on 3000/3100 first; see CLAUDE.md.
- [ ] Commit, then push to `main` (that deploys to Vercel) once Adam says so. Check the live site after the deploy.

## 6. After it's live

- [ ] Update the GitHub profile README: [Syafiyyy/Syafiyyy](https://github.com/Syafiyyy/Syafiyyy).
- [ ] Update the resume: `private/Resume_Adam_Syafi.docx`. It's not in git, so edit it locally, then export a new `public/Resume_Adam_Syafi.pdf` if the site's download should change too.
