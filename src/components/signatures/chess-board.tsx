"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { CHESS, type ChessEval } from "@/data/site";

/*
  Chess club signature: a real opening plays out on a small board while an
  evaluation bar follows Stockfish's verdict after each move (numbers from
  CHESS in site.ts). Then the trap lands:
    the blunder   the move where the eval flips from a score to a forced
                  mate gets "??", the bar snaps, and a note gives the swing
    the mate      a scan line sweeps the board lighting the mating net (the
                  squares the mated king can't use, computed from the final
                  position), the king tips over, and the result is stamped.
  Everything shown is derived from the moves and evals, nothing typed in.
  Plays when scrolled into view, loops while visible, pauses off screen.
  Reduced motion: the final position with all of the above already shown.
*/

const SQ = 40; // SVG units per square
const FILES = "abcdefgh";
const BACK_RANK = "RNBQKBNR";

type Kind = "P" | "N" | "B" | "R" | "Q" | "K";
type Piece = { id: string; white: boolean; kind: Kind; square: string };

const START: Piece[] = [];
for (let f = 0; f < 8; f++) {
  const file = FILES[f];
  START.push({ id: `w${BACK_RANK[f]}${file}`, white: true, kind: BACK_RANK[f] as Kind, square: `${file}1` });
  START.push({ id: `wP${file}`, white: true, kind: "P", square: `${file}2` });
  START.push({ id: `bP${file}`, white: false, kind: "P", square: `${file}7` });
  START.push({ id: `b${BACK_RANK[f]}${file}`, white: false, kind: BACK_RANK[f] as Kind, square: `${file}8` });
}

const xy = (square: string) => ({ x: FILES.indexOf(square[0]) * SQ, y: (8 - Number(square[1])) * SQ });

// Replays the moves once to know, per ply, which piece moves, what it
// captures and whether a rook comes along (castling).
type Step = { piece: string; to: string; captured?: string; rook?: { piece: string; to: string } };
const STEPS: Step[] = [];
const FINAL = new Map(START.map((p) => [p.square, p.id]));
for (const { uci } of CHESS.moves) {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const piece = FINAL.get(from)!;
  const step: Step = { piece, to, captured: FINAL.get(to) };
  FINAL.delete(from);
  FINAL.set(to, piece);
  const df = FILES.indexOf(to[0]) - FILES.indexOf(from[0]);
  if (piece[1] === "K" && Math.abs(df) === 2) {
    const rookFrom = `${df > 0 ? "h" : "a"}${from[1]}`;
    const rookTo = `${df > 0 ? "f" : "d"}${from[1]}`;
    const rook = FINAL.get(rookFrom)!;
    FINAL.delete(rookFrom);
    FINAL.set(rookTo, rook);
    step.rook = { piece: rook, to: rookTo };
  }
  STEPS.push(step);
}

// Lichess-style mapping from centipawns to White's share of the bar (0..1).
// A forced mate fills the bar for the side that mates.
const cpShare = (pawns: number) => 0.5 + 0.5 * (2 / (1 + Math.exp(-0.00368208 * pawns * 100)) - 1);
const share = (e: ChessEval) => ("cp" in e ? cpShare(e.cp) : e.mate > 0 || e.winner === "white" ? 1 : 0);
const fmtPawns = (pawns: number) => (pawns > 0 ? "+" : pawns < 0 ? "−" : "") + Math.abs(pawns).toFixed(2);
// "#2" = White mates in 2, "#-2" = Black does; a finished game shows the result.
const fmt = (e: ChessEval) =>
  "cp" in e ? fmtPawns(e.cp) : e.mate === 0 ? (e.winner === "white" ? "1–0" : "0–1") : `#${e.mate}`;

// The blunder: the first move after which a scored position becomes a
// forced mate. CHESS.evals[i] is the position after move i (0 = start).
const BLUNDER = CHESS.moves.findIndex((_, i) => {
  const before = CHESS.evals[i];
  const after = CHESS.evals[i + 1];
  return "cp" in before && "mate" in after && after.mate !== 0;
});
const NOTE = (() => {
  if (BLUNDER < 0) return "";
  const before = CHESS.evals[BLUNDER];
  const after = CHESS.evals[BLUNDER + 1];
  const takes = STEPS[BLUNDER].captured?.[1] === "Q" ? " takes the queen." : "";
  const who = "mate" in after && after.mate > 0 ? "White" : "Black";
  const n = "mate" in after ? Math.abs(after.mate) : 0;
  return `${CHESS.moves[BLUNDER].san}??${takes} ${fmt(before)} → ${fmt(after)}: ${who} mates in ${n}.`;
})();

// The mating net: the mated king's square and every neighbouring square it
// can't move to because the winner attacks it (its own pieces excluded).
const LAST = CHESS.evals[CHESS.evals.length - 1];
const MATED = "mate" in LAST && LAST.mate === 0 ? (LAST.winner === "white" ? "b" : "w") : null;
const sqIdx = (s: string) => [FILES.indexOf(s[0]), Number(s[1]) - 1] as const;
const sqName = (f: number, r: number) => `${FILES[f]}${r + 1}`;
function attacked(board: Map<string, string>, target: string, byWhite: boolean) {
  const [tf, tr] = sqIdx(target);
  for (const [sq, id] of board) {
    if ((id[0] === "w") !== byWhite) continue;
    const [f, r] = sqIdx(sq);
    const df = tf - f;
    const dr = tr - r;
    const ad = Math.abs(df);
    const ar = Math.abs(dr);
    if (!df && !dr) continue;
    const k = id[1];
    if (k === "N" && ((ad === 1 && ar === 2) || (ad === 2 && ar === 1))) return true;
    if (k === "K" && Math.max(ad, ar) === 1) return true;
    if (k === "P" && dr === (byWhite ? 1 : -1) && ad === 1) return true;
    const diag = ad === ar;
    const line = !df || !dr;
    if ((k === "B" && diag) || (k === "R" && line) || (k === "Q" && (diag || line))) {
      const sf = Math.sign(df);
      const sr = Math.sign(dr);
      let cf = f + sf;
      let cr = r + sr;
      let clear = true;
      while (cf !== tf || cr !== tr) {
        if (board.has(sqName(cf, cr))) {
          clear = false;
          break;
        }
        cf += sf;
        cr += sr;
      }
      if (clear) return true;
    }
  }
  return false;
}
const KING = MATED ? [...FINAL].find(([, id]) => id.startsWith(`${MATED}K`)) : undefined;
const NET: string[] = [];
if (KING) {
  const [kingSq] = KING;
  // Without the king, so sliders see through the square it would leave.
  const board = new Map(FINAL);
  board.delete(kingSq);
  const [kf, kr] = sqIdx(kingSq);
  for (let df = -1; df <= 1; df++)
    for (let dr = -1; dr <= 1; dr++) {
      const f = kf + df;
      const r = kr + dr;
      if (f < 0 || f > 7 || r < 0 || r > 7) continue;
      const s = sqName(f, r);
      const own = FINAL.get(s)?.[0] === MATED;
      if ((s === kingSq || !own) && attacked(board, s, MATED === "b")) NET.push(s);
    }
}

const MOVE = 0.5; // s, piece travel
const GAP = 0.7; // s, pause between moves
const BEAT = 1.1; // s, extra pause after the blunder so it registers
const SCAN = 1.0; // s, scan line across the board
const HOLD = 2.6; // s, the stamped result before the loop restarts

export function ChessBoard() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <T extends Element>(s: string) => el.querySelector<T>(s)!;
    const piece = (id: string) => q<SVGGElement>(`[data-piece="${id}"]`);
    const fill = q<HTMLDivElement>("[data-eval-fill]");
    const flash = q<HTMLDivElement>("[data-eval-flash]");
    const label = q<HTMLSpanElement>("[data-eval-label]");
    const hiFrom = q<SVGRectElement>("[data-hi=from]");
    const hiTo = q<SVGRectElement>("[data-hi=to]");
    const moves = Array.from(el.querySelectorAll<HTMLElement>("[data-move]"));
    const annot = el.querySelector<HTMLElement>("[data-annot]");
    const note = el.querySelector<HTMLElement>("[data-note]");
    const scan = q<SVGGElement>("[data-scan]");
    const net = Array.from(el.querySelectorAll<SVGRectElement>("[data-net]"));
    const stamp = el.querySelector<HTMLElement>("[data-stamp]");
    const king = KING ? piece(KING[1]) : null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const showShare = (v: number) => {
      fill.style.transform = `scaleY(${v})`;
    };
    const markMove = (ply: number) => moves.forEach((m, i) => m.toggleAttribute("data-active", i === ply));
    const highlight = (ply: number) => {
      const uci = CHESS.moves[ply].uci;
      const a = xy(uci.slice(0, 2));
      const b = xy(uci.slice(2, 4));
      gsap.set(hiFrom, { attr: { x: a.x, y: a.y }, opacity: 1 });
      gsap.set(hiTo, { attr: { x: b.x, y: b.y }, opacity: 1 });
    };
    // The mated king tips over on its base.
    const tip = { rotation: -78, transformOrigin: "50% 86%" };

    const ctx = gsap.context(() => {
      if (reduced) {
        START.forEach((p) => {
          const at = [...FINAL].find(([, id]) => id === p.id)?.[0];
          if (at) gsap.set(piece(p.id), { ...xy(at) });
          else gsap.set(piece(p.id), { opacity: 0 });
        });
        highlight(STEPS.length - 1);
        markMove(STEPS.length - 1);
        showShare(share(LAST));
        label.textContent = fmt(LAST);
        gsap.set([annot, note, ...net, stamp], { opacity: 1 });
        gsap.set([hiFrom, hiTo], { opacity: 0 });
        if (king) gsap.set(king, tip);
        return;
      }

      // Bar share always tweens; the number rolls between two pawn scores and
      // switches straight to a mate/result label otherwise.
      const ev = { share: share(CHESS.evals[0]), pawns: 0 };
      const tl = gsap.timeline({ paused: true, repeat: -1, defaults: { ease: "power2.inOut" } });
      tl.call(() => {
        START.forEach((p) => gsap.set(piece(p.id), { ...xy(p.square), opacity: 1, rotation: 0 }));
        gsap.set([hiFrom, hiTo, annot, note, ...net, stamp, flash], { opacity: 0 });
        gsap.set(scan, { x: -SQ, opacity: 0 });
        markMove(-1);
        ev.share = share(CHESS.evals[0]);
        showShare(ev.share);
        label.textContent = fmt(CHESS.evals[0]);
      });

      let at = 0.6;
      STEPS.forEach((s, i) => {
        tl.call(() => {
          highlight(i);
          markMove(i);
        }, undefined, at);
        tl.to(piece(s.piece), { ...xy(s.to), duration: MOVE }, at);
        if (s.captured) tl.to(piece(s.captured), { opacity: 0, duration: 0.2 }, at + MOVE * 0.7);
        if (s.rook) tl.to(piece(s.rook.piece), { ...xy(s.rook.to), duration: MOVE }, at + 0.1);
        const prev = CHESS.evals[i];
        const next = CHESS.evals[i + 1];
        const rolls = "cp" in prev && "cp" in next;
        const snap = i === BLUNDER;
        tl.fromTo(
          ev,
          { share: share(prev), pawns: "cp" in prev ? prev.cp : 0 },
          {
            share: share(next),
            pawns: "cp" in next ? next.cp : 0,
            // The blunder snaps the bar; every other move eases.
            duration: snap ? 0.14 : 0.6,
            ease: snap ? "expo.out" : "power2.out",
            // Built up front; don't paint any of these until their turn.
            immediateRender: false,
            onStart: () => {
              if (!rolls) label.textContent = fmt(next);
            },
            onUpdate: () => {
              showShare(ev.share);
              if (rolls) label.textContent = fmtPawns(ev.pawns);
            },
          },
          at + MOVE,
        );
        if (snap) {
          const t = at + MOVE;
          tl.fromTo(flash, { opacity: 0.9 }, { opacity: 0, duration: 0.7, ease: "power2.out" }, t);
          tl.fromTo(label, { scale: 1.45 }, { scale: 1, duration: 0.5, ease: "back.out(3)" }, t);
          tl.fromTo(annot, { opacity: 0, x: -4 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }, t + 0.05);
          tl.fromTo(note, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, t + 0.2);
        }
        at += MOVE + GAP + (snap ? BEAT : 0);
      });

      // The mate: scan across the board, lighting the net as the line passes
      // each square's file; then the king tips and the result is stamped.
      const t0 = at - GAP + 0.3;
      // The last move's highlight would read as part of the net: clear it.
      tl.to([hiFrom, hiTo], { opacity: 0, duration: 0.25, ease: "power1.out" }, t0);
      tl.set(scan, { opacity: 1 }, t0);
      tl.fromTo(scan, { x: -SQ }, { x: SQ * 8, duration: SCAN, ease: "none", immediateRender: false }, t0);
      tl.to(scan, { opacity: 0, duration: 0.2 }, t0 + SCAN - 0.1);
      net.forEach((r) => {
        const f = Number(r.dataset.file);
        tl.fromTo(r, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power1.out", immediateRender: false }, t0 + ((f + 0.5) / 9) * SCAN);
      });
      const t1 = t0 + SCAN + 0.15;
      if (king) {
        tl.to(king, { ...tip, duration: 0.55, ease: "power2.in" }, t1);
        tl.to(king, { rotation: tip.rotation + 6, duration: 0.12, ease: "power1.out", yoyo: true, repeat: 1 }, t1 + 0.55);
      }
      tl.fromTo(
        stamp,
        { opacity: 0, scale: 1.6 },
        { opacity: 1, scale: 1, duration: 0.32, ease: "back.out(2.2)", immediateRender: false },
        t1 + 0.75,
      );
      tl.to({}, { duration: HOLD });
      // Fade out before the loop restarts so pieces don't jump home.
      tl.to([...el.querySelectorAll("[data-piece]"), ...net, stamp], { opacity: 0, duration: 0.3, ease: "power1.out" });

      let started = false;
      const io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            if (!started) {
              started = true;
              tl.play(0);
            } else tl.resume();
          } else tl.pause();
        },
        { threshold: 0.4 },
      );
      io.observe(el);
      return () => io.disconnect();
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="w-full max-w-[20rem]">
      <div className="mb-2 flex items-baseline justify-between gap-3 text-xs text-muted">
        <span>
          {CHESS.engine}, depth {CHESS.depth}
        </span>
        <span data-eval-label className="inline-block origin-right font-mono text-sm text-fg">
          {fmt(CHESS.evals[0])}
        </span>
      </div>
      <div className="flex gap-2">
        {/* Eval bar: White's share fills from the bottom. */}
        <div aria-hidden className="relative w-2.5 shrink-0 overflow-hidden rounded-sm bg-[var(--piece-black)] ring-1 ring-line">
          <div
            data-eval-fill
            className="absolute inset-0 origin-bottom bg-[var(--piece-white)]"
            style={{ transform: `scaleY(${share(CHESS.evals[0])})` }}
          />
          <div className="absolute inset-x-0 top-1/2 h-px bg-sky/60" />
          <div data-eval-flash className="absolute inset-0 bg-sky opacity-0" />
        </div>
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${SQ * 8} ${SQ * 8}`}
            className="block aspect-square w-full overflow-hidden rounded-sm"
            role="img"
            aria-label={`Chessboard playing ${CHESS.opening}: ${moveText()}`}
          >
            <defs>
              <PieceSymbols />
              <linearGradient id="chess-scan" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="var(--sky)" stopOpacity={0} />
                <stop offset="1" stopColor="var(--sky)" stopOpacity={0.35} />
              </linearGradient>
            </defs>
            {Array.from({ length: 64 }, (_, i) => {
              const f = i % 8;
              const r = Math.floor(i / 8);
              return (
                <rect
                  key={i}
                  x={f * SQ}
                  y={r * SQ}
                  width={SQ}
                  height={SQ}
                  fill={(f + r) % 2 === 0 ? "var(--board-light)" : "var(--board-dark)"}
                />
              );
            })}
            {/* Edge coordinates, like a real board. */}
            {Array.from({ length: 8 }, (_, i) => (
              <g key={i} className="fill-muted font-mono" fontSize={7}>
                <text x={2.5} y={i * SQ + 8.5}>
                  {8 - i}
                </text>
                <text x={i * SQ + SQ - 6} y={SQ * 8 - 2.5}>
                  {FILES[i]}
                </text>
              </g>
            ))}
            <rect data-hi="from" width={SQ} height={SQ} className="fill-sky" fillOpacity={0.18} opacity={0} />
            <rect data-hi="to" width={SQ} height={SQ} className="fill-sky" fillOpacity={0.32} opacity={0} />
            {/* Mating net; the king's own square is outlined as well. */}
            {NET.map((s) => {
              const { x, y } = xy(s);
              const isKing = s === KING?.[0];
              return (
                <rect
                  key={s}
                  data-net
                  data-file={FILES.indexOf(s[0])}
                  x={x + 1}
                  y={y + 1}
                  width={SQ - 2}
                  height={SQ - 2}
                  className="fill-sky stroke-sky"
                  fillOpacity={isKing ? 0.4 : 0.26}
                  strokeWidth={isKing ? 2 : 0}
                  opacity={0}
                />
              );
            })}
            {START.map((p) => {
              const { x, y } = xy(p.square);
              return (
                <g key={p.id} data-piece={p.id} transform={`translate(${x} ${y})`}>
                  <use href={`#piece-${p.kind}`} className={p.white ? "chess-white" : "chess-black"} />
                </g>
              );
            })}
            {/* Scan line with a short trail, the site's scan language. */}
            <g data-scan opacity={0}>
              <rect x={-26} y={0} width={26} height={SQ * 8} fill="url(#chess-scan)" />
              <rect x={-1} y={0} width={2} height={SQ * 8} className="fill-sky" />
            </g>
          </svg>
          {KING && (
            // Low on the board, clear of the net and the mating pieces.
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[22%] flex justify-center">
              <span
                data-stamp
                className="-rotate-6 rounded-md border-2 border-sky bg-surface/85 px-3 py-0.5 font-mono text-2xl font-medium text-sky opacity-0 backdrop-blur-[2px]"
              >
                {fmt(LAST)}
              </span>
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 font-mono text-[13px] leading-relaxed">
        {CHESS.moves.map((m, i) => (
          <span key={m.uci}>
            {i % 2 === 0 && <span className="text-muted">{i / 2 + 1}. </span>}
            <span data-move className="chess-move">
              {m.san}
            </span>
            {i === BLUNDER && (
              <span data-annot className="inline-block font-medium text-sky opacity-0">
                ??
              </span>
            )}{" "}
          </span>
        ))}
      </p>
      {NOTE && (
        <p data-note className="mt-1 font-mono text-[12px] leading-relaxed text-sky opacity-0">
          {NOTE}
        </p>
      )}
      <p className="mt-1 text-xs leading-relaxed text-muted">
        <span className="text-fg">{CHESS.opening}.</span> {CHESS.caption}
      </p>
    </div>
  );
}

function moveText() {
  return CHESS.moves.map((m, i) => `${i % 2 === 0 ? `${i / 2 + 1}. ` : ""}${m.san}${i === BLUNDER ? "??" : ""}`).join(" ");
}

// A flat piece set drawn for this site on a 40 × 40 square; the symbol
// viewBox crops the margin so pieces fill more of their square.
function PieceSymbols() {
  const base = <rect x={10} y={31} width={20} height={4} rx={1} />;
  return (
    <>
      <symbol id="piece-P" viewBox="3 2 34 34" width={SQ} height={SQ}>
        <circle cx={20} cy={14} r={5} />
        <path d="M15 31 L17 19.5 H23 L25 31 Z" />
        {base}
      </symbol>
      <symbol id="piece-R" viewBox="3 2 34 34" width={SQ} height={SQ}>
        <path d="M12 8 H16 V11 H18.5 V8 H21.5 V11 H24 V8 H28 V15 H12 Z" />
        <path d="M13.5 31 L15 16 H25 L26.5 31 Z" />
        {base}
      </symbol>
      <symbol id="piece-N" viewBox="3 2 34 34" width={SQ} height={SQ}>
        <path d="M13 31 L15 23 C12.5 21.5 11 19 12.5 16.5 L18.5 10 L19.5 6 L22.5 9 C27.5 10.5 29.5 16 28.5 22.5 L27 31 Z" />
        <circle cx={19} cy={13.5} r={1.3} className="chess-eye" />
        {base}
      </symbol>
      <symbol id="piece-B" viewBox="3 2 34 34" width={SQ} height={SQ}>
        <circle cx={20} cy={6.5} r={2} />
        <path d="M20 8.5 C25.5 12 26 17.5 23.5 20.5 H16.5 C14 17.5 14.5 12 20 8.5 Z" />
        <path d="M14.5 31 L17 20.5 H23 L25.5 31 Z" />
        <path d="M21.5 11.5 L18.5 15.5" className="chess-cut" />
        {base}
      </symbol>
      <symbol id="piece-Q" viewBox="3 2 34 34" width={SQ} height={SQ}>
        <path d="M11.5 11 L15 18 H25 L28.5 11 L24 14.5 L20 8 L16 14.5 Z" />
        <circle cx={11.5} cy={10} r={1.8} />
        <circle cx={20} cy={7} r={1.8} />
        <circle cx={28.5} cy={10} r={1.8} />
        <path d="M13.5 31 L15 18 H25 L26.5 31 Z" />
        {base}
      </symbol>
      <symbol id="piece-K" viewBox="3 2 34 34" width={SQ} height={SQ}>
        <rect x={19} y={3.5} width={2} height={8} />
        <rect x={16.5} y={6} width={7} height={2} />
        <path d="M14 18 C14 11.5 26 11.5 26 18 Z" />
        <path d="M13.5 31 L15 18 H25 L26.5 31 Z" />
        {base}
      </symbol>
    </>
  );
}
