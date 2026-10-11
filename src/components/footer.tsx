import { SITE } from "@/data/site";
import { CLAIM_REF } from "@/components/claim-file";
import { TextLink } from "@/components/text-link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t">
      <div className="frame grid gap-8 py-12 text-sm sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-medium">{SITE.name}</p>
          <p className="mt-1 text-muted">
            {SITE.role}, {SITE.location}
          </p>
          <p className="mt-4 font-mono text-xs text-muted">
            last claim <span className="text-fg">{CLAIM_REF}</span> · <span className="text-amber">settled</span>
          </p>
        </div>
        <div className="text-muted">
          <p className="font-mono text-meta">built with</p>
          <p className="mt-2">Next.js, Tailwind, three.js (React Three Fiber), GSAP and Lenis.</p>
        </div>
        <div className="text-muted">
          <p className="font-mono text-meta">credits</p>
          <p className="mt-2">
            Car model from Kenney&apos;s{" "}
            <TextLink href="https://kenney.nl/assets/car-kit" inline>
              Car Kit
            </TextLink>{" "}
            (CC0). Chess evals computed with{" "}
            <TextLink href="https://stockfishchess.org" inline>
              Stockfish
            </TextLink>
            .
          </p>
        </div>
      </div>
      <div className="frame">
        <div className="flex items-center justify-between gap-4 border-t py-5 text-xs text-muted">
          <span>
            © {year} {SITE.name}
          </span>
          <TextLink href="#top" arrow="↑">
            Back to top
          </TextLink>
        </div>
      </div>
    </footer>
  );
}
