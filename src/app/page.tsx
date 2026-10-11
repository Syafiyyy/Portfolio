import { Trace } from "@/components/trace";
import { Contact } from "@/components/contact";
import { IdBadge } from "@/components/badge/id-badge";
import { LinkQr } from "@/components/badge/link-qr";
import { DamageScan } from "@/components/car/damage-scan";
import { ChessBoard } from "@/components/signatures/chess-board";
import { CountUp } from "@/components/count-up";
import { Magnetic } from "@/components/magnetic";
import { TextLink } from "@/components/text-link";
import { SectionFrame } from "@/components/section-frame";
import { SITE, DRIVECOVER, PROJECTS, EDUCATION } from "@/data/site";

export default function Page() {
  return (
    <main id="top">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden data-intro-part="grid" className="hero-grid pointer-events-none absolute inset-0" />
        <div className="frame relative grid items-center gap-8 pb-20 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-14 lg:pt-20 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          {/* The ID badge hangs above the headline on small screens, right of
              it on large; it hangs from the top, so it isn't centred. */}
          <div data-intro-part="portrait" className="self-start lg:order-2 lg:justify-self-center">
            <IdBadge qr={<LinkQr url={SITE.links.linkedin} label="QR code: LinkedIn profile" className="block size-[4.25rem]" />} />
          </div>
          <div className="max-w-3xl lg:order-1">
            <p data-intro-part="eyebrow" className="text-muted">
              {SITE.name}, {SITE.location}
            </p>
            <h1 data-intro-part="headline" className="mt-4 text-display xl:max-w-[15ch]">
              {SITE.headline}
            </h1>
            <p data-intro-part="sub" className="mt-6 max-w-[60ch] text-lead text-muted">{SITE.intro}</p>
            <div data-intro-part="late" className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
              <Magnetic>
                <TextLink href="#drivecover" tone="sky" arrow="↓">
                  See my work
                </TextLink>
              </Magnetic>
              <Magnetic>
                <TextLink href={SITE.resume} className="text-fg">
                  Download resume
                </TextLink>
              </Magnetic>
            </div>
          </div>
        </div>
      </section>

      {/* DriveCover */}
      <SectionFrame id="drivecover" kicker="~/work/drivecover" title="DriveCover" band>
        <div className="max-w-2xl">
          <p className="text-lead">{DRIVECOVER.lead}</p>
          <p className="mt-3 text-lead text-muted">{DRIVECOVER.summary}</p>
          <p className="mt-4">Below is one claim, from the moment a driver reports it to the moment it is paid.</p>
        </div>

        <div className="mt-10">
          <DamageScan />
        </div>

        <div className="mt-10">
          <Trace />
        </div>

        <dl className="mt-14 grid gap-px overflow-hidden rounded-md border bg-line sm:grid-cols-2 lg:grid-cols-4">
          {DRIVECOVER.facts.map((f) => (
            <div key={f.label} className="bg-bg p-5">
              <dt className="sr-only">{f.label}</dt>
              <dd className="font-mono text-figure">
                <CountUp value={f.value} />
              </dd>
              <dd className="mt-2 text-sm leading-snug text-muted">{f.label}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <p className="text-muted">Built with {DRIVECOVER.stack.join(", ")}.</p>
          <TextLink href={DRIVECOVER.repo} tone="sky" className="font-medium">
            View the code on GitHub
          </TextLink>
        </div>
      </SectionFrame>

      {/* Projects */}
      <SectionFrame id="projects" kicker="~/projects" title="Other projects">
        <ul className="divide-y border-y">
          {PROJECTS.map((p) => (
            <li key={p.name} className="grid gap-2 py-6 sm:grid-cols-[12rem_1fr] sm:gap-8">
              <div>
                <p className="text-title">{p.name}</p>
                <p className="mt-1 text-sm tabular-nums text-muted">{p.period}</p>
              </div>
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
                <div>
                  <p className="max-w-[65ch] leading-relaxed text-muted">{p.description}</p>
                  <p className="mt-2 text-sm">{p.stack.join(", ")}</p>
                  {p.href && (
                    <TextLink href={p.href} tone="sky" className="mt-2 text-sm font-medium">
                      View project
                    </TextLink>
                  )}
                </div>
                {p.signature === "chess" && <ChessBoard />}
              </div>
            </li>
          ))}
        </ul>
      </SectionFrame>

      {/* Education: compact rows, it is reference rather than story. */}
      <SectionFrame id="education" kicker="~/education" title="Education" pad="py-16">
        <ul className="divide-y border-y">
          {EDUCATION.map((e) => (
            <li key={e.degree} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-6">
              <p className="text-sm tabular-nums text-muted sm:pt-0.5">{e.period}</p>
              <div>
                {/* One line from sm; the school drops below on phones. */}
                <p className="font-medium">
                  {e.degree}
                  <span className="block font-normal text-muted sm:inline">
                    <span className="hidden sm:inline">, </span>
                    {e.school}
                  </span>
                </p>
                {e.note && <p className="mt-1 text-sm">{e.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      </SectionFrame>

      {/* Contact */}
      <SectionFrame id="contact" kicker="~/contact" title="Contact" pad="pb-28 pt-20">
        <p className="max-w-[60ch] text-lead text-muted">{SITE.openTo} Email is the fastest way to reach me.</p>
        <div className="mt-12">
          <Contact />
        </div>
      </SectionFrame>
    </main>
  );
}
