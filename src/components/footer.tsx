import { SITE } from "@/data/site";
import { CLAIM_REF } from "@/components/claim-file";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 text-sm sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-medium">{SITE.name}</p>
          <p className="mt-1 text-muted">Backend developer, {SITE.location}</p>
          <p className="mt-4 font-mono text-xs text-muted">
            last claim <span className="text-fg">{CLAIM_REF}</span> · <span className="text-amber">settled</span>
          </p>
        </div>
        <div className="text-muted">
          <p className="font-mono text-xs uppercase tracking-wider">Built with</p>
          <p className="mt-2">Next.js, Tailwind, three.js (React Three Fiber), GSAP and Lenis.</p>
        </div>
        <div className="text-muted">
          <p className="font-mono text-xs uppercase tracking-wider">Credits</p>
          <p className="mt-2">
            Car model from Kenney&apos;s{" "}
            <a href="https://kenney.nl/assets/car-kit" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-fg">
              Car Kit
            </a>{" "}
            (CC0). Chess evals computed with{" "}
            <a href="https://stockfishchess.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-fg">
              Stockfish
            </a>
            .
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-5">
        <div className="flex items-center justify-between gap-4 border-t py-5 text-xs text-muted">
          <span>
            © {year} {SITE.name}
          </span>
          <a href="#top" className="transition-colors duration-150 hover:text-fg">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
