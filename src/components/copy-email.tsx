"use client";

import { useState } from "react";
import { Magnetic } from "@/components/magnetic";

export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href={`mailto:${email}`} className="text-lg font-medium underline decoration-line underline-offset-4 transition-colors duration-150 hover:decoration-sky">
        {email}
      </a>
      <Magnetic>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border px-3 py-1 text-sm text-muted transition-colors duration-150 hover:text-fg"
          aria-live="polite"
        >
          {copied ? "Copied" : "Copy email"}
        </button>
      </Magnetic>
    </div>
  );
}
