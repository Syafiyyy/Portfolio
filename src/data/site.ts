// All portfolio content lives here. Edit this file to update the site.

export const SITE = {
  name: "Adam Syafi",
  fullName: "Adam Syafi Bin Abdul Aziz",
  url: "https://portfolio-blond-nu-58.vercel.app",
  location: "Selangor, Malaysia",
  headline: "I build backend systems that handle real money and real claims.",
  intro:
    "IT student at Universiti Poly-Tech Malaysia. I like the parts of software most people never see: payments, permissions, and the rules that decide who gets paid.",
  resume: "/Resume_Adam_Syafi.pdf",
  photo: "/adam.jpg",
  email: "adamsyafi133@gmail.com",
  links: {
    github: "https://github.com/Syafiyyy",
    linkedin: "https://www.linkedin.com/in/adam-syafi-430919326",
  },
  openTo: "Open to internships, freelance work and research assistant roles.",
};

export const DRIVECOVER = {
  name: "DriveCover",
  summary:
    "A motor insurance web app for the Malaysian market. Customers get a quote, buy cover, file a claim and renew, all in one place. It is my final year project, built to the rules a real insurer has to follow.",
  repo: "https://github.com/Syafiyyy/drivecover",
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
  },
];

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
