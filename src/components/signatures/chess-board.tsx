"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { CHESS, type ChessEval } from "@/data/site";

/*
  Chess club signature: a real opening plays out on a small board while an
  evaluation bar follows Stockfish's verdict after each move (numbers from
  CHESS in site.ts). Plays when scrolled into view, loops while visible,
  pauses off screen. Reduced motion: final position, final eval, still.
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
const share = (e: ChessEval) =>
  "cp" in e ? cpShare(e.cp) : e.mate > 0 || e.winner === "white" ? 1 : 0;
const fmtPawns = (pawns: number) => (pawns > 0 ? "+" : pawns < 0 ? "−" : "") + Math.abs(pawns).toFixed(2);
// "#2" = White mates in 2, "#-2" = Black does; a finished game shows the result.
const fmt = (e: ChessEval) =>
  "cp" in e ? fmtPawns(e.cp) : e.mate === 0 ? (e.winner === "white" ? "1–0" : "0–1") : `#${e.mate}`;

const MOVE = 0.5; // s, piece travel
const GAP = 0.7; // s, pause between moves
const HOLD = 3.2; // s, final position (the mate) before the loop restarts

export function ChessBoard() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <T extends Element>(s: string) => el.querySelector<T>(s)!;
    const piece = (id: string) => q<SVGGElement>(`[data-piece="${id}"]`);
    const fill = q<HTMLDivElement>("[data-eval-fill]");
    const label = q<HTMLSpanElement>("[data-eval-label]");
    const hiFrom = q<SVGRectElement>("[data-hi=from]");
    const hiTo = q<SVGRectElement>("[data-hi=to]");
    const moves = Array.from(el.querySelectorAll<HTMLElement>("[data-move]"));
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

    const ctx = gsap.context(() => {
      if (reduced) {
        START.forEach((p) => {
          const at = [...FINAL].find(([, id]) => id === p.id)?.[0];
          if (at) gsap.set(piece(p.id), { ...xy(at) });
          else gsap.set(piece(p.id), { opacity: 0 });
        });
        highlight(STEPS.length - 1);
        markMove(STEPS.length - 1);
        const last = CHESS.evals[CHESS.evals.length - 1];
        showShare(share(last));
        label.textContent = fmt(last);
        return;
      }

      // Bar share always tweens; the number rolls between two pawn scores and
      // switches straight to a mate/result label otherwise.
      const ev = { share: share(CHESS.evals[0]), pawns: 0 };
      const tl = gsap.timeline({ paused: true, repeat: -1, defaults: { ease: "power2.inOut" } });
      tl.call(() => {
        START.forEach((p) => gsap.set(piece(p.id), { ...xy(p.square), opacity: 1 }));
        gsap.set([hiFrom, hiTo], { opacity: 0 });
        markMove(-1);
        ev.share = share(CHESS.evals[0]);
        showShare(ev.share);
        label.textContent = fmt(CHESS.evals[0]);
      });

      STEPS.forEach((s, i) => {
        const at = 0.6 + i * (MOVE + GAP);
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
        tl.fromTo(
          ev,
          { share: share(prev), pawns: "cp" in prev ? prev.cp : 0 },
          {
            share: share(next),
            pawns: "cp" in next ? next.cp : 0,
            duration: 0.6,
            ease: "power2.out",
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
      });
      tl.to({}, { duration: HOLD });
      // Fade out before the loop restarts so pieces don't jump home.
      tl.to(el.querySelectorAll("[data-piece]"), { opacity: 0, duration: 0.3, ease: "power1.out" });

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
        <span data-eval-label className="font-mono text-sm text-fg">
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
        </div>
        <svg
          viewBox={`0 0 ${SQ * 8} ${SQ * 8}`}
          className="block aspect-square w-full overflow-hidden rounded-sm"
          role="img"
          aria-label={`Chessboard playing ${CHESS.opening}: ${moveText()}`}
        >
          <defs>
            <PieceSymbols />
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
          {START.map((p) => {
            const { x, y } = xy(p.square);
            return (
              <g key={p.id} data-piece={p.id} transform={`translate(${x} ${y})`}>
                <use href={`#piece-${p.kind}`} className={p.white ? "chess-white" : "chess-black"} />
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-3 font-mono text-[13px] leading-relaxed">
        {CHESS.moves.map((m, i) => (
          <span key={m.uci}>
            {i % 2 === 0 && <span className="text-muted">{i / 2 + 1}. </span>}
            <span data-move className="chess-move">
              {m.san}
            </span>{" "}
          </span>
        ))}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        <span className="text-fg">{CHESS.opening}.</span> {CHESS.caption}
      </p>
    </div>
  );
}

function moveText() {
  return CHESS.moves.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m.san}` : m.san)).join(" ");
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
