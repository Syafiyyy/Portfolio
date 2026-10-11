import {
  siFirebase,
  siFlutter,
  siGooglegemini,
  siGsap,
  siMysql,
  siNestjs,
  siNextdotjs,
  siOpenjdk,
  siPostgresql,
  siPrisma,
  siReact,
  siStripe,
  siSupabase,
  siTailwindcss,
  siThreedotjs,
  siTypescript,
} from "simple-icons";
import { TOOLS } from "@/data/site";

/*
  Monochrome tool icons for the Stack section, from Simple Icons (CC0),
  rendered on the server so only the finished <svg>s reach the browser.
  They draw in currentColor; the section tints them.
*/
const ICONS: Record<string, { path: string }> = {
  firebase: siFirebase,
  flutter: siFlutter,
  googlegemini: siGooglegemini,
  gsap: siGsap,
  mysql: siMysql,
  nestjs: siNestjs,
  nextdotjs: siNextdotjs,
  openjdk: siOpenjdk,
  postgresql: siPostgresql,
  prisma: siPrisma,
  react: siReact,
  stripe: siStripe,
  supabase: siSupabase,
  tailwindcss: siTailwindcss,
  threedotjs: siThreedotjs,
  typescript: siTypescript,
};

// Simple Icons has no Stockfish mark: a knight from the site's own chess set.
function Knight() {
  return (
    <svg viewBox="3 2 34 34" aria-hidden className="size-4 fill-current">
      <path d="M13 31 L15 23 C12.5 21.5 11 19 12.5 16.5 L18.5 10 L19.5 6 L22.5 9 C27.5 10.5 29.5 16 28.5 22.5 L27 31 Z" />
      <rect x={10} y={31} width={20} height={4} rx={1} />
    </svg>
  );
}

export function stackIcons(): Record<string, React.ReactNode> {
  return Object.fromEntries(
    TOOLS.map((t) => {
      const icon = t.icon ? ICONS[t.icon] : null;
      return [
        t.name,
        icon ? (
          <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
            <path d={icon.path} />
          </svg>
        ) : (
          <Knight />
        ),
      ];
    }),
  );
}
