"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { fireCarCue } from "@/lib/intro-cue";

gsap.registerPlugin(SplitText);

const KEY = "intro-played";

// Runs before first paint (inlined in <head>). Marks the page so CSS hides the
// intro pieces until GSAP takes over; the timeout un-hides them if JS never runs.
export const INTRO_BOOT = `(function(){try{
var d=document.documentElement;
if(sessionStorage.getItem("${KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
d.dataset.intro="play";
setTimeout(function(){if(d.dataset.intro==="play")delete d.dataset.intro},4000);
}catch(e){}})();`;

// Decided once per page load, so React strict mode's double effect still plays it.
let shouldPlay: boolean | null = null;

/*
  One orchestrated page load, ~1.6 s. Parts are tagged with data-intro-part="...":
  1. grid      background grid fades in         0.00 – 0.50
  2. eyebrow   name line                         0.10 – 0.55
     headline  line by line, mask + translateY   0.20 – ~1.00 (120 ms stagger)
     sub       intro paragraph                   0.55 – 1.05
  3. car       fires the car cue: the hero car rises and runs its first scan
  4. late      nav and hero links, last          1.05 – 1.60
*/
export function Intro() {
  useEffect(() => {
    const d = document.documentElement;
    if (shouldPlay === null) shouldPlay = d.dataset.intro === "play";
    if (!shouldPlay) {
      fireCarCue();
      return;
    }

    let cancelled = false;
    let split: SplitText | undefined;
    let ctx: gsap.Context | undefined;

    // Split after fonts load so line breaks match the final text.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      ctx = gsap.context(() => {
        const q = (s: string) => gsap.utils.toArray<HTMLElement>(`[data-intro-part="${s}"]`);
        const all = gsap.utils.toArray<HTMLElement>("[data-intro-part]");

        split = SplitText.create(q("headline"), { type: "lines", mask: "lines" });

        // Take over from the CSS guard in the same frame.
        gsap.set(all, { opacity: 0 });
        gsap.set(q("headline"), { opacity: 1 });
        gsap.set(split.lines, { yPercent: 110 });
        delete d.dataset.intro;

        gsap
          .timeline({
            defaults: { ease: "power3.out" },
            onComplete: () => {
              split?.revert();
              gsap.set(all, { clearProps: "opacity,transform" });
            },
          })
          .to(q("grid"), { opacity: 1, duration: 0.5, ease: "power1.out" }, 0)
          .fromTo(q("eyebrow"), { y: 8 }, { opacity: 1, y: 0, duration: 0.45 }, 0.1)
          .to(split.lines, { yPercent: 0, duration: 0.7, stagger: 0.12 }, 0.2)
          .fromTo(q("sub"), { y: 8 }, { opacity: 1, y: 0, duration: 0.5 }, 0.55)
          .addLabel("car", 0.75)
          .call(fireCarCue, undefined, "car")
          .fromTo(q("late"), { y: 6 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06 }, 1.05);
      });

      try {
        sessionStorage.setItem(KEY, "1");
      } catch {}
    });

    // If the intro stalls (e.g. fonts never resolve), still let the car in.
    const fallback = window.setTimeout(fireCarCue, 3000);

    return () => {
      window.clearTimeout(fallback);
      cancelled = true;
      ctx?.revert();
      split?.revert();
    };
  }, []);

  return null;
}
