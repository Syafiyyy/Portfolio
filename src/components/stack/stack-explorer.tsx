"use client";

import { useState } from "react";
import { TOOLS, WORK, type Layer, type WorkId } from "@/data/site";
import { TextLink } from "@/components/text-link";

/*
  The Stack section: tools grouped by layer, and the work that proves each
  one. Point at (hover/focus) or pick (click/tap/Enter) a tool to light up
  the work it was used in, or a piece of work to light up its tools. A
  readout spells it out with links to the evidence. Coursework sits in its
  own quieter rows, apart from shipped projects.
*/

type Focus = { kind: "tool"; id: string } | { kind: "work"; id: WorkId } | null;

const LAYERS: Exclude<Layer, "coursework">[] = ["frontend", "backend", "data", "ai", "tools"];
const workById = Object.fromEntries(WORK.map((w) => [w.id, w])) as Record<WorkId, (typeof WORK)[number]>;
const same = (a: Focus, b: Focus) => !!a && !!b && a.kind === b.kind && a.id === b.id;

export function StackExplorer({ icons }: { icons: Record<string, React.ReactNode> }) {
  const [picked, setPicked] = useState<Focus>(null);
  const [pointed, setPointed] = useState<Focus>(null);
  const active = pointed ?? picked;

  // What the active item lights up.
  const litTools = new Set<string>();
  const litWork = new Set<WorkId>();
  if (active?.kind === "tool") {
    litTools.add(active.id);
    TOOLS.find((t) => t.name === active.id)?.used.forEach((w) => litWork.add(w));
  } else if (active?.kind === "work") {
    litWork.add(active.id);
    TOOLS.filter((t) => t.used.includes(active.id)).forEach((t) => litTools.add(t.name));
  }
  const dim = (lit: boolean) => (active && !lit ? "opacity-35" : "");

  const point = (f: Focus) => ({
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setPointed(f),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && setPointed(null),
    // Keyboard focus previews; a click/tap focuses too, but only picks.
    onFocus: (e: React.FocusEvent<HTMLElement>) => e.currentTarget.matches(":focus-visible") && setPointed(f),
    onBlur: () => setPointed(null),
    onClick: () => setPicked((p) => (same(p, f) ? null : f)),
    "aria-pressed": same(picked, f),
  });

  const toolButton = (t: (typeof TOOLS)[number]) => {
    const lit = litTools.has(t.name);
    const quiet = t.layer === "coursework";
    return (
      <li key={t.name}>
        <button
          type="button"
          {...point({ kind: "tool", id: t.name })}
          className={`stack-chip press group ${quiet ? "border-dashed text-muted" : ""} ${lit ? "is-lit" : ""} ${dim(lit)}`}
        >
          <span className="stack-icon">{icons[t.name]}</span>
          {t.name}
        </button>
      </li>
    );
  };

  const workButton = (w: (typeof WORK)[number]) => {
    const lit = litWork.has(w.id);
    return (
      <li key={w.id}>
        <button
          type="button"
          {...point({ kind: "work", id: w.id })}
          className={`stack-chip press ${w.kind === "coursework" ? "border-dashed text-muted" : ""} ${lit ? "is-lit" : ""} ${dim(lit)}`}
        >
          {w.name}
        </button>
      </li>
    );
  };

  // The readout, with links to where the work can be seen.
  const evidence = (id: WorkId) => {
    const w = workById[id];
    return (
      <TextLink href={w.href} tone="sky" arrow={w.href.startsWith("#") ? "↓" : undefined}>
        {w.name}
      </TextLink>
    );
  };
  let readout: React.ReactNode = <span className="text-muted">Pick a tool to see where I used it, or a piece of work to see what it is built with.</span>;
  if (active?.kind === "tool") {
    const t = TOOLS.find((x) => x.name === active.id)!;
    readout = (
      <>
        <span className="text-fg">{t.name}</span>
        <span className="text-muted"> · used in: </span>
        {t.used.map((id, i) => (
          <span key={id}>
            {i > 0 && <span className="text-muted">, </span>}
            {evidence(id)}
          </span>
        ))}
      </>
    );
  } else if (active?.kind === "work") {
    const names = TOOLS.filter((t) => t.used.includes(active.id)).map((t) => t.name);
    readout = (
      <>
        {evidence(active.id)}
        <span className="text-muted"> · built with: </span>
        <span className="text-fg">{names.join(", ")}</span>
      </>
    );
  }

  const coursework = TOOLS.filter((t) => t.layer === "coursework");
  return (
    <div>
      <p className="max-w-[60ch] text-lead text-muted">Grouped by layer. Every tool links to the work it was used in.</p>

      <div className="mt-10 grid gap-x-6 gap-y-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
        {LAYERS.map((layer) => (
          <div key={layer} className="contents">
            <p className="font-mono text-meta text-muted sm:pt-2">{layer}</p>
            <ul className="-mt-2 flex flex-wrap gap-2 sm:mt-0">{TOOLS.filter((t) => t.layer === layer).map(toolButton)}</ul>
          </div>
        ))}
        <p className="mt-2 font-mono text-meta text-muted sm:pt-2">coursework</p>
        <ul className="-mt-2 flex flex-wrap gap-2 sm:mt-2">{coursework.map(toolButton)}</ul>
      </div>

      {/* Reserved height so the readout never shifts the work rows below. */}
      <p aria-live="polite" className="mt-8 min-h-[6.8em] border-y py-3 font-mono text-sm leading-relaxed sm:min-h-[3.4em]">
        {readout}
      </p>

      <div className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
        <p className="font-mono text-meta text-muted sm:pt-2">projects</p>
        <ul className="-mt-2 flex flex-wrap gap-2 sm:mt-0">{WORK.filter((w) => w.kind === "project").map(workButton)}</ul>
        <p className="mt-2 font-mono text-meta text-muted sm:pt-2">coursework</p>
        <ul className="-mt-2 flex flex-wrap gap-2 sm:mt-2">{WORK.filter((w) => w.kind === "coursework").map(workButton)}</ul>
      </div>
    </div>
  );
}
