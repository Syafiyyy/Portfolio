// All portfolio content lives here. Edit this file to update the site.

export const SITE = {
  name: "Adam Syafi",
  fullName: "Adam Syafi Bin Abdul Aziz",
  // Primary address. The old portfolio-blond-nu-58.vercel.app domain stays
  // in Vercel and redirects here, so earlier links keep working.
  url: "https://portfolio-adamsyafi.vercel.app",
  location: "Selangor, Malaysia",
  role: "Full-stack developer",
  headline: "I design and build software, end to end.",
  intro:
    "IT student at UPTM, based in Selangor. I care about both sides of a product: the interface people touch, and the systems underneath that keep it working.",
  resume: "/Resume_Adam_Syafi.pdf",
  // Hero portrait, 3:4. A cut-out (transparent background) from the original
  // PNG: 900 × 1200 WebP with alpha, quality 82.
  portrait: { src: "/adam-portrait.webp", width: 900, height: 1200 },
  email: "adamsyafi133@gmail.com",
  links: {
    github: "https://github.com/Syafiyyy",
    linkedin: "https://www.linkedin.com/in/adam-syafi-430919326",
  },
  openTo: "Open to internships, freelance work and research assistant roles.",
  // Footer status line.
  now: "building DriveCover · learning Docker",
};

// The developer ID badge in the hero (my own design, not a university card).
// Front: these mono lines plus a QR code to LinkedIn. Back: STACK.
export const BADGE = {
  handle: "~/adam-syafi", // printed on the lanyard
  lines: [
    { key: "access", value: "frontend · backend · ai" },
    { key: "based", value: "Selangor, MY" },
    { key: "edu", value: "BIT @ UPTM" },
  ],
  status: "open to work",
};

// Evidence for the Stack section: the work each tool was used in. Projects
// are shipped work shown on this site; coursework is from my degree and
// shown apart, more quietly. Each links to where it can be seen.
export type WorkId = "drivecover" | "chess" | "site" | "javafx" | "sql";
export const WORK: { id: WorkId; name: string; kind: "project" | "coursework"; href: string }[] = [
  { id: "drivecover", name: "DriveCover", kind: "project", href: "#drivecover" },
  { id: "chess", name: "Chess club app", kind: "project", href: "#projects" },
  { id: "site", name: "This site", kind: "project", href: "https://github.com/Syafiyyy/Portfolio" },
  // No public repos for these: they point to the degree they were part of.
  { id: "javafx", name: "JavaFX desktop app", kind: "coursework", href: "#education" },
  { id: "sql", name: "SQL database project", kind: "coursework", href: "#education" },
];

// Tools by layer, each with the work it was used in (WORK ids). Only tools
// with evidence above are listed. `icon` is a Simple Icons slug (null: a
// glyph of our own). Tools used only in coursework form the coursework row.
export type Layer = "frontend" | "backend" | "data" | "ai" | "tools" | "coursework";
export const TOOLS: { name: string; layer: Layer; icon: string | null; used: WorkId[] }[] = [
  { name: "Next.js", layer: "frontend", icon: "nextdotjs", used: ["site"] },
  { name: "React", layer: "frontend", icon: "react", used: ["site"] },
  { name: "Tailwind", layer: "frontend", icon: "tailwindcss", used: ["site"] },
  { name: "GSAP", layer: "frontend", icon: "gsap", used: ["site"] },
  { name: "Three.js", layer: "frontend", icon: "threedotjs", used: ["site"] },
  { name: "Flutter", layer: "frontend", icon: "flutter", used: ["chess"] },
  { name: "NestJS", layer: "backend", icon: "nestjs", used: ["drivecover"] },
  { name: "Prisma", layer: "backend", icon: "prisma", used: ["drivecover"] },
  { name: "Stripe", layer: "backend", icon: "stripe", used: ["drivecover"] },
  { name: "PostgreSQL", layer: "data", icon: "postgresql", used: ["drivecover"] },
  { name: "Supabase", layer: "data", icon: "supabase", used: ["drivecover"] },
  { name: "Firebase", layer: "data", icon: "firebase", used: ["chess"] },
  { name: "Gemini", layer: "ai", icon: "googlegemini", used: ["drivecover"] },
  { name: "Stockfish", layer: "ai", icon: null, used: ["chess"] },
  { name: "TypeScript", layer: "tools", icon: "typescript", used: ["drivecover"] },
  { name: "Java", layer: "coursework", icon: "openjdk", used: ["javafx"] },
  { name: "MySQL", layer: "coursework", icon: "mysql", used: ["sql"] },
];

// The badge's back: the same tools, folded into fewer groups to fit a card.
const toolsIn = (...layers: Layer[]) => TOOLS.filter((t) => layers.includes(t.layer)).map((t) => t.name);
export const STACK = [
  { group: "frontend", items: toolsIn("frontend") },
  { group: "backend", items: toolsIn("backend", "data", "tools") },
  { group: "ai", items: toolsIn("ai") },
  { group: "coursework", items: toolsIn("coursework") },
];

export const DRIVECOVER = {
  name: "DriveCover",
  lead: "I build backend systems that handle real money and real claims.",
  summary:
    "A motor insurance web app for the Malaysian market. Customers get a quote, buy cover, file a claim and renew, all in one place. It is my final year project, built to the rules a real insurer has to follow.",
  // The repo is private until the FYP is submitted. Set the URL here to show
  // "View the code on GitHub" (and the ⌘K entry) again; while null, the site
  // offers a code walkthrough by email instead.
  repo: null as string | null,
  stack: ["NestJS", "Prisma", "PostgreSQL", "Supabase", "Stripe", "Gemini"],
  facts: [
    { value: "377", label: "automated tests on the pricing and claims engine" },
    { value: "19/19", label: "database tables protected by row level security" },
    { value: "15 days", label: "cooling-off cancellation with real Stripe refunds" },
    { value: "62", label: "issues found in a self-audit, all resolved" },
  ],
};

// Steps of the simulated claim shown in the "Trace a claim" section.
// Each step mirrors a part of DriveCover that is actually built.
export const TRACE = [
  {
    node: "Customer app",
    detail: "Reports an accident in a guided chat and uploads photos",
    log: "POST /api/claims  201  CLM-2611-0042",
  },
  {
    node: "NestJS API",
    detail: "Checks the policy is active and the damage is covered",
    log: "policy.verify  active  cover=comprehensive  ncd=25%",
  },
  {
    node: "Gemini vision",
    detail: "Reads the photos and estimates the damage",
    log: "gemini.assess  severity=moderate  parts=[bumper, headlamp]",
  },
  {
    node: "PostgreSQL",
    detail: "Stores the claim where only its owner can read it",
    log: "db.insert claims  rls=owner_only  status=under_review",
  },
  {
    node: "Settlement",
    detail: "Adjuster approves the amount and an e-invoice is issued",
    log: "claim.settle  RM 2,340.00  einvoice=LHDN-SB-0042",
  },
];

// Hero car scan labels. Mirrors the gemini.assess line above: same parts,
// same severity. Only parts the scene has a zone for can be listed.
export const SCAN = {
  parts: [
    { part: "bumper", severity: "moderate" },
    { part: "headlamp", severity: "moderate" },
  ],
} as const;

export const PROJECTS = [
  {
    name: "Chess club app",
    period: "2024 – 2025",
    description:
      "Diploma final year project for the UPTM Chess Club. Flutter and Firebase app with real-time multiplayer and a Stockfish opponent you can tune from beginner to strong.",
    stack: ["Flutter", "Firebase", "Stockfish"],
    href: null as string | null,
    // Signature animation shown beside the project (see components/signatures).
    signature: "chess" as "chess" | null,
  },
];

// Chess club signature: Légal's mate, a real beginner trap, with real engine
// evals. Evals are White's view, index 0 = start position, then after each
// move: { cp } in pawns, or { mate } in moves (positive = White mates;
// 0 = mate on the board). Generated by scripts/chess-evals.mjs; rerun it if
// the moves change.
export type ChessEval = { cp: number } | { mate: number; winner?: "white" | "black" };

export const CHESS = {
  opening: "Légal's mate",
  caption:
    "A classic beginner trap: Black takes the queen and is mated two moves later. The app's adjustable Stockfish opponent helps players learn to avoid traps like this.",
  engine: "Stockfish 17.1",
  depth: 20,
  moves: [
    { uci: "e2e4", san: "e4" },
    { uci: "e7e5", san: "e5" },
    { uci: "g1f3", san: "Nf3" },
    { uci: "d7d6", san: "d6" },
    { uci: "f1c4", san: "Bc4" },
    { uci: "c8g4", san: "Bg4" },
    { uci: "b1c3", san: "Nc3" },
    { uci: "g7g6", san: "g6" },
    { uci: "f3e5", san: "Nxe5" },
    { uci: "g4d1", san: "Bxd1" },
    { uci: "c4f7", san: "Bxf7+" },
    { uci: "e8e7", san: "Ke7" },
    { uci: "c3d5", san: "Nd5#" },
  ],
  evals: [
    { cp: 0.36 },
    { cp: 0.3 },
    { cp: 0.39 },
    { cp: 0.3 },
    { cp: 0.67 },
    { cp: 0.34 },
    { cp: 0.85 },
    { cp: 0.55 },
    { cp: 2 },
    { cp: 1.98 },
    { mate: 2 },
    { mate: 1 },
    { mate: 1 },
    { mate: 0, winner: "white" },
  ] as ChessEval[],
};

export const EDUCATION = [
  {
    school: "Universiti Poly-Tech Malaysia",
    degree: "Bachelor of IT (Hons) in Computer Application Development",
    period: "2025 – 2028",
    note: null as string | null,
  },
  {
    school: "Universiti Poly-Tech Malaysia",
    degree: "Diploma in Computer Science",
    period: "2023 – 2025",
    note: "First class, CGPA 3.60, Dean's List four semesters",
  },
];
