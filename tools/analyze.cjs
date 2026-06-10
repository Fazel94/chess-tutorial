#!/usr/bin/env node
/**
 * analyze.js — thin UCI wrapper around the repo's stockfish.js
 *
 * Usage:
 *   node tools/analyze.js "<FEN>"            → best move + score at depth 18
 *   node tools/analyze.js "<FEN>" <depth>    → custom depth
 *   node tools/analyze.js fen "<moves>"      → build FEN from start + move list
 *
 * Output (JSON to stdout):
 *   { fen, depth, bestMove, score, scoreType, pv, info }
 *
 * scoreType: "cp" (centipawns) | "mate" (moves to mate)
 * score is always from the side-to-move's perspective.
 */

const path   = require("path");
const Stockfish = require(path.join(__dirname, "../course/docs/assets/stockfish/stockfish.js"));

const SF_WASM = path.join(__dirname, "../course/docs/assets/stockfish/stockfish-nnue-16-single.wasm");

async function getBestMove(fen, depth = 18) {
  const sf = await Stockfish({ locateFile: (f) => f.endsWith(".wasm") ? SF_WASM : f });

  return new Promise((resolve) => {
    let bestMove = null, score = null, scoreType = null, pv = null;
    const infoLines = [];

    sf.addMessageListener((line) => {
      if (line.startsWith("info depth")) {
        const dm = line.match(/depth (\d+)/);
        if (dm && parseInt(dm[1]) >= depth) {
          const cp   = line.match(/ score cp (-?\d+)/);
          const mate = line.match(/ score mate (-?\d+)/);
          const pvM  = line.match(/ pv (.+)/);
          if (cp)   { score = parseInt(cp[1]);   scoreType = "cp"; }
          if (mate) { score = parseInt(mate[1]); scoreType = "mate"; }
          if (pvM)  { pv = pvM[1].trim().split(" "); }
          infoLines.push(line);
        }
      }
      if (line.startsWith("bestmove")) {
        bestMove = line.split(" ")[1];
        sf.terminate();
        resolve({ fen, depth, bestMove, score, scoreType, pv: pv || [], info: infoLines.slice(-1)[0] || "" });
      }
    });

    sf.postMessage("uci");
    sf.postMessage("setoption name Use NNUE value true");
    sf.postMessage("isready");
    sf.postMessage(`position fen ${fen}`);
    sf.postMessage(`go depth ${depth}`);
  });
}

// ── CLI entry ─────────────────────────────────────────────────────────────

const [,, fenArg, depthArg] = process.argv;

if (!fenArg) {
  console.error("Usage: node tools/analyze.js \"<FEN>\" [depth]");
  process.exit(1);
}

const depth = depthArg ? parseInt(depthArg) : 18;

getBestMove(fenArg, depth).then((result) => {
  console.log(JSON.stringify(result, null, 2));
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
