"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";
import { FILE_STATUS } from "@/components/claim-file";

gsap.registerPlugin(ScrollTrigger);

// Where each claim status is "reached" on the page: the visit is the claim's
// journey, created at DriveCover and settled at Contact. The status words
// come from the trace data (FILE_STATUS), not from here.
const STOPS = ["drivecover", "projects", "contact"];

/*
  A 2px bar on the nav's bottom edge that fills with scroll progress, with a
  tick where each status is reached. It reports the current status index
  (-1 before the first) through onStatus, so the nav can label it.
*/
export function ClaimProgress({ onStatus }: { onStatus: (status: number) => void }) {
  const fill = useRef<HTMLDivElement>(null);
  const [ticks, setTicks] = useState<number[]>([]);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const bar = fill.current;
    if (!bar) return;
    let tops: number[] = [];

    const measure = () => {
      const max = ScrollTrigger.maxScroll(window) || 1;
      // A status counts as reached when its section's heading is near the
      // top of the screen, i.e. once it scrolls ~40% of the way up.
      tops = STOPS.map((id) => {
        const el = document.getElementById(id);
        if (!el) return Infinity;
        return Math.max(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.6);
      });
      setTicks(tops.map((t) => Math.min(1, t / max)));
    };

    let last = -2;
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        bar.style.transform = `scaleX(${self.progress.toFixed(4)})`;
        const y = self.scroll();
        let status = -1;
        tops.forEach((t, i) => {
          if (y >= t) status = i;
        });
        if (status !== last) {
          last = status;
          onStatus(status);
          setSettled(status === STOPS.length - 1);
        }
      },
      onRefresh: (self) => {
        measure();
        self.update?.();
      },
    });
    // Measures via onRefresh above.
    st.refresh();

    return () => st.kill();
  }, [onStatus]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px h-[2px]">
      <div
        ref={fill}
        className={`absolute inset-0 origin-left transition-colors duration-500 ${settled ? "bg-amber" : "bg-sky"}`}
        style={{ transform: "scaleX(0)" }}
      />
      {ticks.map((t, i) => (
        <span
          key={STOPS[i]}
          className="absolute top-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted"
          style={{ left: `${(t * 100).toFixed(2)}%` }}
        />
      ))}
    </div>
  );
}

export const CLAIM_STATUSES = FILE_STATUS.map((s) => s.text);
