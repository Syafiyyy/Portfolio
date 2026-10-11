import { TRACE } from "@/data/site";

/*
  The claim as a document that fills in while Trace a claim plays. Every value
  is read from the TRACE log lines, so it can only say what the trace says.
  Trace owns the timeline; this component only renders and exposes elements
  through data attributes:
    [data-file-row=i]       row i, revealed at trace step i
    [data-file-skeleton=i]  placeholder bar shown until then
    [data-file-value=i]     the value, slides up out of a mask
    [data-file-flash=i]     brief highlight when the row fills
    [data-file-status=k]    status chip states, cross-faded
    [data-file-ref]         the claim reference in the header
    [data-file-stamp]       the SETTLED stamp
*/

// Log lines separate fields with two or more spaces: "policy.verify  active  cover=…".
const fieldsOf = (log: string) => log.split(/\s{2,}/);
const kv = (log: string) =>
  Object.fromEntries(
    fieldsOf(log).flatMap((f) => {
      const m = f.match(/^([\w.]+)=(.*)$/);
      return m ? [[m[1], m[2]]] : [];
    }),
  ) as Record<string, string>;
const step = (node: string) => {
  const i = TRACE.findIndex((t) => t.node === node);
  return { i, log: TRACE[i].log, fields: fieldsOf(TRACE[i].log), kv: kv(TRACE[i].log) };
};
const human = (s: string) => s.replace(/_/g, " ");

const created = step("Customer app"); // POST /api/claims  201  CLM-2611-0042
const policy = step("NestJS API"); // policy.verify  active  cover=…  ncd=…
const vision = step("Gemini vision"); // gemini.assess  severity=…  parts=[…]
const record = step("PostgreSQL"); // db.insert claims  rls=…  status=…
const settle = step("Settlement"); // claim.settle  RM 2,340.00  einvoice=…

export const CLAIM_REF = created.fields.at(-1)!;
const amount = settle.fields[1];

export const FILE_ROWS = [
  { step: created.i, label: "Report", value: "Guided chat, photos uploaded" },
  {
    step: policy.i,
    label: "Policy",
    value: `${policy.fields[1]} · ${policy.kv.cover} · NCD ${policy.kv.ncd}`,
  },
  {
    step: vision.i,
    label: "Damage",
    value: `${vision.kv.parts.replace(/[[\]]/g, "")} · ${vision.kv.severity}`,
    thumb: true,
  },
  {
    step: record.i,
    label: "Record",
    // rls=owner_only -> "owner-only access"
    value: `${record.kv.rls.replace(/_/g, "-")} access · ${human(record.kv.status)}`,
  },
  { step: settle.i, label: "Settlement", value: `${amount} · e-invoice ${settle.kv.einvoice}` },
];

// Status chip: what the log says the claim is at each point.
export const FILE_STATUS = [
  { step: created.i, text: `${created.fields[1]} created` },
  { step: record.i, text: human(record.kv.status) },
  { step: settle.i, text: "settled" },
];

export function ClaimFile() {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-md border bg-surface">
      <div className="flex items-center justify-between gap-4 border-b px-4 py-2.5 text-sm">
        <span className="text-muted">
          Claim file <span data-file-ref className="ml-1 inline-block font-mono text-fg">{CLAIM_REF}</span>
        </span>
        {/* All states share one grid cell so the chip never changes size. */}
        <span className="grid shrink-0 items-center font-mono text-xs">
          {FILE_STATUS.map((s, k) => (
            <span
              key={s.text}
              data-file-status={k}
              className={`col-start-1 row-start-1 justify-self-end whitespace-nowrap rounded-sm border px-1.5 py-0.5 ${
                k === FILE_STATUS.length - 1 ? "border-amber text-amber" : "border-sky/60 text-sky opacity-0"
              }`}
            >
              {s.text}
            </span>
          ))}
        </span>
      </div>

      <dl className="divide-y divide-dashed px-4">
        {FILE_ROWS.map((r, i) => (
          <div key={r.label} data-file-row={i} className="relative grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 py-2.5 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
            <span data-file-flash={i} aria-hidden className="pointer-events-none absolute -inset-x-4 inset-y-0 bg-sky/10 opacity-0" />
            <dt className="font-mono text-meta lowercase text-muted">{r.label}</dt>
            <dd className="relative min-w-0">
              <span data-file-skeleton={i} aria-hidden className="absolute left-0 top-1/2 h-2 w-32 -translate-y-1/2 rounded-full bg-line opacity-0" />
              {/* Mask for the slide-up; a block so the value wraps inside it. */}
              <span className="block overflow-hidden">
                <span data-file-value={i} className="flex min-w-0 items-center gap-3 text-[15px]">
                  {r.thumb && (
                    // The scan from above, zoomed in on the car.
                    <span className="h-7 w-14 shrink-0 overflow-hidden rounded-sm border border-amber/60 bg-bg sm:h-9 sm:w-[72px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/models/car-poster.webp"
                        alt=""
                        width={1400}
                        height={700}
                        loading="lazy"
                        decoding="async"
                        className="size-full scale-[2.1] object-cover object-[48%_58%]"
                      />
                    </span>
                  )}
                  <span className="min-w-0">
                    {/* Words stay whole: no break inside "e-invoice" or "LHDN-SB-0042". */}
                    {r.value.split(/(\s+)/).map((t, j) =>
                      j % 2 ? t : (
                        <span key={j} className="inline-block max-w-full">
                          {t}
                        </span>
                      ),
                    )}
                  </span>
                </span>
              </span>
            </dd>
          </div>
        ))}
      </dl>
      {/* Room for the stamp so it never covers a value. */}
      <div aria-hidden className="h-14 border-t border-dashed" />

      {/* The last thing to land. Amber is the claim's colour on this site. */}
      <div
        data-file-stamp
        aria-hidden
        className="claim-stamp pointer-events-none absolute bottom-3 right-4 rounded-sm px-3 py-1.5 text-center font-mono text-amber"
      >
        <span className="block text-lg font-medium leading-none tracking-[0.2em]">SETTLED</span>
        <span className="mt-1 block text-xs leading-none">{amount}</span>
      </div>
    </div>
  );
}
