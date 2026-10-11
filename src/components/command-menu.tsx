"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { SITE, DRIVECOVER } from "@/data/site";
import { lockScroll, scrollToSection } from "@/lib/scroll";
import { switchTheme } from "@/components/theme-toggle";

/*
  The site's command menu, loaded only when first opened. Two shapes over
  the same list of commands, both on a native <dialog> (focus trap, Esc,
  focus returned on close):
    palette  ⌘K / Ctrl+K on desktop: type to filter, arrows + Enter.
    sheet    the Menu button on phones: a bottom sheet of large rows,
             dismissed by the backdrop, Esc, Close or dragging it down.
  Panels move with transform and opacity only.
*/

type Group = "go to" | "actions" | "links";
type Item = {
  id: string;
  group: Group;
  label: string;
  hint: string;
  keywords?: string;
  section?: string;
  href?: string;
  action?: "copy" | "theme";
};

const OUT_MS = 220;

export default function CommandMenu({
  variant,
  active,
  onClose,
}: {
  variant: "palette" | "sheet";
  active: string | null;
  onClose: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  // Whatever had focus before opening (the ⌘K or Menu button).
  const opener = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [copied, setCopied] = useState(false);
  const listId = useId();

  const items = useMemo<Item[]>(
    () => [
      { id: "top", group: "go to", label: "Start of the page", hint: "~/", section: "top", keywords: "home hero top" },
      { id: "drivecover", group: "go to", label: "DriveCover", hint: "~/work/drivecover", section: "drivecover", keywords: "work claim" },
      { id: "projects", group: "go to", label: "Other projects", hint: "~/projects", section: "projects", keywords: "chess" },
      { id: "education", group: "go to", label: "Education", hint: "~/education", section: "education", keywords: "degree school" },
      { id: "contact", group: "go to", label: "Contact", hint: "~/contact", section: "contact", keywords: "email hire" },
      { id: "copy", group: "actions", label: copied ? "Copied" : "Copy email", hint: copied ? "201 · copied to clipboard" : SITE.email, action: "copy", keywords: "mail" },
      { id: "theme", group: "actions", label: `Switch to ${isDark ? "light" : "dark"} mode`, hint: "theme", action: "theme", keywords: "dark light theme" },
      { id: "github", group: "links", label: "GitHub", hint: SITE.links.github.replace(/^https:\/\//, ""), href: SITE.links.github, keywords: "code" },
      { id: "linkedin", group: "links", label: "LinkedIn", hint: SITE.links.linkedin.replace(/^https:\/\/(www\.)?/, ""), href: SITE.links.linkedin },
      { id: "resume", group: "links", label: "Resume", hint: "pdf", href: SITE.resume, keywords: "cv" },
      { id: "repo", group: "links", label: "DriveCover code", hint: DRIVECOVER.repo.replace(/^https:\/\//, ""), href: DRIVECOVER.repo, keywords: "github source" },
    ],
    [copied, isDark],
  );

  const shownItems = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return items;
    return items.filter((it) => {
      const text = `${it.label} ${it.hint} ${it.keywords ?? ""} ${it.group}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [items, query]);

  // Open on mount, animate in on the next frame.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    opener.current = document.activeElement as HTMLElement | null;
    d.showModal();
    // Set first focus here: showModal() would otherwise pick the first
    // focusable element, which in the sheet is its scrolling panel.
    d.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    lockScroll(true);
    const raf = requestAnimationFrame(() => setShown(true));
    return () => {
      cancelAnimationFrame(raf);
      lockScroll(false);
    };
  }, []);

  // Animate out, close the dialog, then run what was chosen (scrolling and
  // the theme reveal look wrong under a closing dialog).
  const close = (then?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    window.setTimeout(() => {
      dialog.current?.close();
      // The browser returns focus to the opener on close; make sure of it.
      const o = opener.current;
      if (o?.isConnected && o !== document.body && document.activeElement !== o) o.focus({ preventScroll: true });
      lockScroll(false);
      onClose();
      then?.();
    }, OUT_MS);
  };

  const choose = (it: Item) => {
    if (it.section) {
      close(() => scrollToSection(it.section!));
    } else if (it.href) {
      // Open inside the click/keypress so it isn't treated as a popup.
      window.open(it.href, "_blank", "noopener,noreferrer");
      close();
    } else if (it.action === "copy") {
      navigator.clipboard
        .writeText(SITE.email)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => close(), 900);
        })
        .catch(() => close(() => (window.location.href = `mailto:${SITE.email}`)));
    } else if (it.action === "theme") {
      close(() => {
        const t = document.querySelector("[data-theme-toggle]")?.getBoundingClientRect();
        const x = t ? t.left + t.width / 2 : window.innerWidth - 40;
        const y = t && t.bottom > 0 ? t.top + t.height / 2 : 0;
        switchTheme(isDark ? "light" : "dark", setTheme, x, y);
      });
    }
  };

  const move = (delta: number) => {
    if (!shownItems.length) return;
    const next = (cursor + delta + shownItems.length) % shownItems.length;
    setCursor(next);
    list.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = shownItems[cursor];
      if (it) choose(it);
    }
  };

  // Sheet: drag the handle down to dismiss.
  const drag = useRef<{ y: number; dy: number; t: number } | null>(null);
  const onHandleDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, dy: 0, t: e.timeStamp };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (panel.current) panel.current.style.transition = "none";
  };
  const onHandleMove = (e: React.PointerEvent) => {
    if (!drag.current || !panel.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    panel.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onHandleUp = (e: React.PointerEvent) => {
    const d = drag.current;
    const p = panel.current;
    drag.current = null;
    if (!d || !p) return;
    // Let the CSS transition take over from where the finger left it:
    // down and out past the threshold (or a quick flick), else back up.
    p.style.transition = "";
    p.style.transform = "";
    const fast = d.dy / Math.max(1, e.timeStamp - d.t) > 0.5;
    if (d.dy > 90 || (fast && d.dy > 20)) close();
  };

  // Keep Tab cycling inside the dialog. A modal <dialog> already makes the
  // page inert, but would let focus leave for the browser's own UI.
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !dialog.current) return;
    const focusable = [...dialog.current.querySelectorAll<HTMLElement>("button, input, a[href], [tabindex]:not([tabindex='-1'])")].filter(
      (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Spoken updates: result count while filtering, and the copy confirmation.
  const announcement = copied
    ? "Email copied to clipboard"
    : query
      ? `${shownItems.length} ${shownItems.length === 1 ? "result" : "results"}`
      : "";

  // Rows grouped for display, keeping each row's index in the flat list
  // (the arrow-key cursor moves through the flat list).
  const groups = (["go to", "actions", "links"] as Group[])
    .map((g) => ({ g, rows: shownItems.map((it, i) => ({ it, i })).filter((r) => r.it.group === g) }))
    .filter((x) => x.rows.length);
  const activeId = shownItems[cursor] ? `${listId}-${shownItems[cursor].id}` : undefined;

  return (
    <dialog
      ref={dialog}
      data-state={shown ? "open" : "closed"}
      data-variant={variant}
      aria-label={variant === "palette" ? "Command menu" : "Menu"}
      data-lenis-prevent
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={trapTab}
      className="cmdk fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden bg-transparent p-0 text-fg backdrop:bg-transparent"
    >
      <div aria-hidden className="cmdk-backdrop absolute inset-0 bg-[#050a14]/55" onClick={() => close()} />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {variant === "palette" ? (
        <div
          ref={panel}
          className="cmdk-panel relative mx-auto mt-[12vh] w-[min(36rem,calc(100%-2rem))] overflow-hidden rounded-xl border bg-surface shadow-[0_24px_60px_-12px_rgb(0_0_0/0.45)]"
        >
          <div className="flex items-center gap-3 border-b px-4">
            <span aria-hidden className="font-mono text-meta text-sky">
              ~/
            </span>
            <input
              data-initial-focus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Jump to a section or run a command"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-label="Search commands"
              // Focus is obvious from the caret and the open panel, so no ring here.
              className="h-13 min-w-0 flex-1 bg-transparent text-body shadow-none outline-none placeholder:text-muted"
            />
            <kbd className="rounded border px-1.5 py-0.5 font-mono text-[11px] text-muted">esc</kbd>
          </div>

          {/* tabIndex -1: the list scrolls, which would otherwise make it a
              Tab stop; it is driven from the input with the arrow keys. */}
          <div
            ref={list}
            id={listId}
            role="listbox"
            aria-label="Commands"
            tabIndex={-1}
            className="max-h-[min(24rem,58vh)] overflow-y-auto overscroll-contain p-2"
          >
            {shownItems.length === 0 && (
              <p className="px-3 py-8 text-center text-muted">
                No command matches <span className="font-mono text-fg">{query}</span>
              </p>
            )}
            {groups.map(({ g, rows }, gi) => (
              <div key={g} role="group" aria-labelledby={`${listId}-g${gi}`}>
                <p id={`${listId}-g${gi}`} aria-hidden className={`px-3 pb-1 font-mono text-meta text-muted ${gi === 0 ? "pt-1" : "pt-4"}`}>
                  {g}
                </p>
                {rows.map(({ it, i }) => {
                  const here = it.section === active;
                  return (
                    <div
                      key={it.id}
                      id={`${listId}-${it.id}`}
                      role="option"
                      aria-selected={i === cursor}
                      data-index={i}
                      onPointerMove={() => cursor !== i && setCursor(i)}
                      onClick={() => choose(it)}
                      className="cmdk-option flex cursor-pointer items-baseline justify-between gap-4 rounded-md px-3 py-2.5"
                    >
                      <span className="flex items-baseline gap-2">
                        {it.label}
                        {it.href && (
                          <>
                            <span aria-hidden className="text-[0.9em] text-muted">
                              ↗
                            </span>
                            <span className="sr-only">(opens in a new tab)</span>
                          </>
                        )}
                        {here && <span className="font-mono text-meta text-sky">you are here</span>}
                      </span>
                      {/* The path hints are decoration; the email is worth hearing. */}
                      <span
                        aria-hidden={it.id !== "copy" || undefined}
                        className={`truncate font-mono text-meta ${it.id === "copy" && copied ? "text-sky" : "text-muted"}`}
                      >
                        {it.hint}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <p aria-hidden className="flex gap-4 border-t px-4 py-2.5 font-mono text-[11px] text-muted">
            <span>↑↓ move</span>
            <span>↵ select</span>
            <span>esc close</span>
          </p>
        </div>
      ) : (
        <div
          ref={panel}
          tabIndex={-1}
          className="cmdk-panel absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-2xl border-t bg-surface pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
            className="sticky top-0 z-10 flex touch-none items-center justify-between bg-surface px-5 pb-2 pt-3"
          >
            <span aria-hidden className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line" />
            <p className="mt-3 font-mono text-meta text-muted">
              <span className="text-sky">~</span>/menu
            </p>
            {/* First focus on open: announced as "Menu, dialog, Close". */}
            <button data-initial-focus type="button" onClick={() => close()} className="press link mt-3 text-sm" data-tone="muted">
              <span className="link-label">Close</span>
            </button>
          </div>
          {(["go to", "actions", "links"] as Group[]).map((g, gi) => (
            <div key={g} role="group" aria-labelledby={`${listId}-s${gi}`} className="px-3 pt-2">
              <p id={`${listId}-s${gi}`} className="px-2 pb-1 pt-2 font-mono text-meta text-muted">
                {g}
              </p>
              <ul>
                {items
                  .filter((it) => it.group === g)
                  .map((it) => {
                    const here = it.section === active;
                    return (
                      <li key={it.id}>
                        <button
                          type="button"
                          onClick={() => choose(it)}
                          aria-current={here ? "location" : undefined}
                          className="press flex min-h-12 w-full items-center justify-between gap-4 rounded-lg px-2 text-left active:bg-[color-mix(in_srgb,var(--sky)_10%,transparent)]"
                        >
                          <span className={`flex items-baseline gap-2 ${it.group === "go to" ? "text-title" : ""}`}>
                            {it.label}
                            {it.href && (
                              <>
                                <span aria-hidden className="text-[0.85em] text-muted">
                                  ↗
                                </span>
                                <span className="sr-only">(opens in a new tab)</span>
                              </>
                            )}
                          </span>
                          {/* Hints are visual only: aria-current already says "current
                              location", and the live region announces the copy. */}
                          {here ? (
                            <span aria-hidden className="flex shrink-0 items-center gap-1.5 font-mono text-meta text-sky">
                              <span aria-hidden className="size-1.5 rounded-full bg-sky" />
                              here
                            </span>
                          ) : (
                            <span aria-hidden className={`truncate font-mono text-meta ${it.id === "copy" && copied ? "text-sky" : "text-muted"}`}>
                              {it.group === "go to" ? it.hint : it.id === "copy" ? (copied ? "201 · copied" : "") : ""}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </dialog>
  );
}
