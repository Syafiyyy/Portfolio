// Computes the Stockfish evals stored in CHESS (src/data/site.ts).
//
// The engine is not a dependency of this repo (it is GPL and only its output
// numbers are used). Install it anywhere and pass the path:
//   npm i --prefix /tmp/sf stockfish@17.1.0
//   node scripts/chess-evals.mjs /tmp/sf/node_modules/stockfish/src/stockfish-17.1-single-a496a04.js
//
// Single thread + fixed depth + fresh hash per position keeps the output
// reproducible. Scores are converted to White's point of view: { cp } in
// pawns, or { mate } in moves (positive = White mates; 0 = mate on the board).

import { spawn } from "node:child_process";

const DEPTH = 20;
// Légal's mate: 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6 5.Nxe5 Bxd1 6.Bxf7+ Ke7 7.Nd5#
const MOVES = ["e2e4", "e7e5", "g1f3", "d7d6", "f1c4", "c8g4", "b1c3", "g7g6", "f3e5", "g4d1", "c4f7", "e8e7", "c3d5"];

const enginePath = process.argv[2];
if (!enginePath) {
  console.error("usage: node scripts/chess-evals.mjs <path to stockfish .js>");
  process.exit(1);
}

const engine = spawn(process.execPath, [enginePath], { stdio: ["pipe", "pipe", "inherit"] });
let buffer = "";
const waiters = [];
engine.stdout.on("data", (chunk) => {
  buffer += chunk;
  let i;
  while ((i = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, i).trim();
    buffer = buffer.slice(i + 1);
    for (const w of [...waiters]) w(line);
  }
});
const send = (cmd) => engine.stdin.write(cmd + "\n");
const until = (test, onLine = () => {}) =>
  new Promise((resolve) => {
    const w = (line) => {
      onLine(line);
      if (test(line)) {
        waiters.splice(waiters.indexOf(w), 1);
        resolve(line);
      }
    };
    waiters.push(w);
  });

let engineName = "";
send("uci");
await until((l) => l === "uciok", (l) => l.startsWith("id name ") && (engineName = l.slice(8)));
send("setoption name Threads value 1");
send("setoption name Hash value 64");

const evals = [];
// Index 0 is the start position, then one entry after each move.
for (let ply = 0; ply <= MOVES.length; ply++) {
  send("ucinewgame");
  send("isready");
  await until((l) => l === "readyok");
  send(`position startpos${ply ? " moves " + MOVES.slice(0, ply).join(" ") : ""}`);
  send(`go depth ${DEPTH}`);
  // Keep the deepest exact score. A finished game (mate on the board) only
  // reports "depth 0 score mate 0", so don't insist on reaching DEPTH.
  let score = null;
  await until(
    (l) => l.startsWith("bestmove"),
    (l) => {
      const m = l.match(/^info depth (\d+) .*score (cp|mate) (-?\d+)/);
      if (m && !/ (upper|lower)bound/.test(l)) score = { depth: Number(m[1]), kind: m[2], value: Number(m[3]) };
    },
  );
  // Engine scores are from the side to move; White moves on even plies.
  const sign = ply % 2 === 0 ? 1 : -1;
  let ev;
  if (score.kind === "cp") ev = { cp: (sign * score.value) / 100 };
  // "mate 0": the side to move is mated, so the other side has won.
  else if (score.value === 0) ev = { mate: 0, winner: sign > 0 ? "black" : "white" };
  else ev = { mate: sign * score.value };
  evals.push(ev);
  console.error(`ply ${ply} (depth ${score.depth}): ${JSON.stringify(ev)}`);
}

send("quit");
console.log(JSON.stringify({ engine: engineName, depth: DEPTH, moves: MOVES, evals }, null, 2));
