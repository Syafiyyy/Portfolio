"use client";

import { useState } from "react";
import { Magnetic } from "@/components/magnetic";
import { TextLink } from "@/components/text-link";
import { SITE } from "@/data/site";

/*
  The page's last big moment: the email at near-headline size, framed like a
  request in the site's log style. On hover a scan line crosses it and leaves
  the text sky blue behind it (transforms only: an outer mask slides in from
  the left while the inner copy slides the opposite way, so the copy stays
  put and only its visible part grows).
*/
export function Contact() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SITE.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      window.location.href = `mailto:${SITE.email}`;
    }
  };

  return (
    <div>
      <p className="font-mono text-sm text-muted" aria-live="polite">
        <span className="text-fg">POST</span> /contact
        <span className={`ml-3 transition-opacity duration-300 ${copied ? "opacity-100" : "opacity-0"}`}>
          <span className="text-sky">201</span> · copied to clipboard
        </span>
      </p>

      <a
        href={`mailto:${SITE.email}`}
        className="contact-email group relative mt-3 inline-block max-w-full font-semibold leading-[1.1] tracking-tight"
      >
        {SITE.email}
        {/* Sky copy, revealed left to right behind the scan line. */}
        <span aria-hidden className="contact-email-mask">
          <span className="contact-email-copy">{SITE.email}</span>
          <span className="contact-email-line" />
        </span>
      </a>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium">
        <Magnetic>
          <button
            type="button"
            onClick={copy}
            className="press rounded-md border px-3 py-1.5 text-muted transition-[color,border-color,transform] duration-150 hover:border-sky hover:text-fg"
          >
            {copied ? "Copied" : "Copy email"}
          </button>
        </Magnetic>
        <TextLink href={SITE.links.github}>GitHub</TextLink>
        <TextLink href={SITE.links.linkedin}>LinkedIn</TextLink>
        <TextLink href={SITE.resume}>Resume</TextLink>
      </div>
    </div>
  );
}
