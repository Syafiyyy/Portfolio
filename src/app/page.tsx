import { Trace } from "@/components/trace";
import { Contact } from "@/components/contact";
import { Heading } from "@/components/heading";
import { Portrait } from "@/components/portrait";
import { DamageScan } from "@/components/car/damage-scan";
import { ChessBoard } from "@/components/signatures/chess-board";
import { CountUp } from "@/components/count-up";
import { Magnetic } from "@/components/magnetic";
import { SITE, DRIVECOVER, PROJECTS, EDUCATION } from "@/data/site";

export default function Page() {
  return (
    <main id="top">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden data-intro-part="grid" className="hero-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-5xl items-center gap-8 px-5 pb-20 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-14 lg:pt-20">
          {/* Portrait sits above the headline on small screens, right of it on large. */}
          <div data-intro-part="portrait" className="w-[13.5rem] sm:w-64 lg:order-2 lg:w-full">
            <Portrait />
          </div>
          <div className="max-w-3xl lg:order-1">
            <p data-intro-part="eyebrow" className="text-muted">
              {SITE.name}, {SITE.location}
            </p>
            <h1 data-intro-part="headline" className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-[3.4rem]">
              {SITE.headline}
            </h1>
            <p data-intro-part="sub" className="mt-6 max-w-[60ch] text-lg leading-relaxed text-muted">{SITE.intro}</p>
            <div data-intro-part="late" className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
              <Magnetic>
                <a href="#drivecover" className="text-sky underline-offset-4 hover:underline">
                  See how a claim moves through DriveCover
                </a>
              </Magnetic>
              <Magnetic>
                <a href={SITE.resume} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                  Download resume
                </a>
              </Magnetic>
            </div>
          </div>
        </div>
      </section>

      {/* DriveCover */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <div className="max-w-2xl">
            <Heading id="drivecover">DriveCover</Heading>
            <p className="mt-4 leading-relaxed text-muted">{DRIVECOVER.summary}</p>
            <p className="mt-4 leading-relaxed">
              Below is one claim, from the moment a driver reports it to the moment it is paid.
            </p>
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
                <dd className="font-mono text-2xl">
                  <CountUp value={f.value} />
                </dd>
                <dd className="mt-1 text-sm leading-snug text-muted">{f.label}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <p className="text-muted">Built with {DRIVECOVER.stack.join(", ")}.</p>
            <a href={DRIVECOVER.repo} target="_blank" rel="noopener noreferrer" className="font-medium text-sky underline-offset-4 hover:underline">
              View the code on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <Heading id="projects">Other projects</Heading>
          <ul className="mt-8 divide-y border-y">
            {PROJECTS.map((p) => (
              <li key={p.name} className="grid gap-2 py-6 sm:grid-cols-[12rem_1fr] sm:gap-8">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted">{p.period}</p>
                </div>
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
                  <div>
                    <p className="max-w-[65ch] leading-relaxed text-muted">{p.description}</p>
                    <p className="mt-2 text-sm">{p.stack.join(", ")}</p>
                    {p.href && (
                      <a href={p.href} className="mt-2 inline-block text-sm font-medium text-sky underline-offset-4 hover:underline">
                        View project
                      </a>
                    )}
                  </div>
                  {p.signature === "chess" && <ChessBoard />}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Education */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <Heading id="education">Education</Heading>
          <ul className="mt-8 divide-y border-y">
            {EDUCATION.map((e) => (
              <li key={e.degree} className="grid gap-2 py-6 sm:grid-cols-[12rem_1fr] sm:gap-8">
                <p className="text-sm text-muted sm:pt-0.5">{e.period}</p>
                <div>
                  <p className="font-medium">{e.degree}</p>
                  <p className="text-muted">{e.school}</p>
                  {e.note && <p className="mt-1 text-sm">{e.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contact */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-5 pb-28 pt-20">
          <Heading id="contact">Contact</Heading>
          <p className="mt-4 max-w-[60ch] leading-relaxed text-muted">{SITE.openTo} Email is the fastest way to reach me.</p>
          <div className="mt-12">
            <Contact />
          </div>
        </div>
      </section>
    </main>
  );
}
