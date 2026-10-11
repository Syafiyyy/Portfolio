"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { firePortraitCue } from "@/lib/intro-cue";

gsap.registerPlugin(SplitText);

const KEY = "intro-played";

// Shared with the boot script and CSS: phones get the overlay intro.
export const PHONE = "(max-width: 767px)";

/*
  Runs before first paint (inlined in <head>) and picks the intro:
  - "play" (larger screens): CSS hides the intro pieces until GSAP takes over.
    If the app hasn't claimed it ("claimed") within 1.5 s, it is skipped and
    the page shows at once rather than staying blank.
  - "overlay" (phones): nothing is hidden. The page, portrait included, paints
    straight away; after hydration the halftone fades in over the photo and
    the scan line reveals it again.
*/
export const INTRO_BOOT = `(function(){try{
var d=document.documentElement;
if(sessionStorage.getItem("${KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
if(matchMedia("${PHONE}").matches){d.dataset.intro="overlay";return}
d.dataset.intro="play";
setTimeout(function(){if(d.dataset.intro==="play")delete d.dataset.intro},1500);
}catch(e){}})();`;

export type IntroMode = "full" | "overlay" | "none";

// Decided once per page load, so React strict mode's double effect still plays it.
let mode: IntroMode | null = null;
export function introMode(): IntroMode {
  if (mode === null) {
    const d = document.documentElement;
    mode = d.dataset.intro === "play" ? "full" : d.dataset.intro === "overlay" ? "overlay" : "none";
    // Claim it so the boot script's deadline no longer applies.
    if (mode === "full") d.dataset.intro = "claimed";
  }
  return mode;
}

/*
  One orchestrated page load, ~2 s. Parts are tagged with data-intro-part="...":
  1. grid      background grid fades in         0.00 – 0.50
  2. eyebrow   name line                         0.10 – 0.55
     headline  line by line, mask + translateY   0.20 – ~1.00 (120 ms stagger)
     sub       intro paragraph                   0.55 – 1.05
  3. portrait  halftone portrait fades in        0.45 – 1.05
     late      nav and hero links                0.85 – 1.40
  4. reveal    fires the portrait cue: the scan line uncovers the photo (~0.9 s),
               so the intro ends on it around 2.0 s
*/
export function Intro() {
  useEffect(() => {
    const d = document.documentElement;
    const m = introMode();
    if (m !== "full") {
      // Overlay (phones): the portrait runs its own fade-in + reveal.
      if (m === "overlay") {
        delete d.dataset.intro;
        try {
          sessionStorage.setItem(KEY, "1");
        } catch {}
      }
      firePortraitCue();
      return;
    }

    let cancelled = false;
    let split: SplitText | undefined;
    let ctx: gsap.Context | undefined;

    // Split after fonts load so line breaks match the final text.
    document.fonts.ready.then(() => {
      // Gave up waiting (see below): the page is already showing, don't hide it.
      if (cancelled || d.dataset.intro !== "claimed") return;
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
          .fromTo(q("portrait"), { y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, 0.45)
          .fromTo(q("late"), { y: 6 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06 }, 0.85)
          .call(firePortraitCue, undefined, 1.1);
      });

      try {
        sessionStorage.setItem(KEY, "1");
      } catch {}
    });

    // If the intro stalls (e.g. fonts never resolve), show the page and
    // reveal the photo without it.
    const fallback = window.setTimeout(() => {
      if (d.dataset.intro === "claimed") delete d.dataset.intro;
      firePortraitCue();
    }, 2500);

    return () => {
      window.clearTimeout(fallback);
      cancelled = true;
      ctx?.revert();
      split?.revert();
    };
  }, []);

  return null;
}
