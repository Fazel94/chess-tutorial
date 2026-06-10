import { Chess } from "chess.js";
import { Board } from "../lib/board.js";
import { LiveGame } from "../lib/live-game.js";
import { createFenBar } from "../lib/fen-bar.js";
import { STRINGS } from "../strings.js";
import { getPromotionPiece } from "../lib/promotion-overlay.js";
import { playMoveSound } from "../lib/sound.js";

/**
 * Practice Opening widget. Loads a PGN, plays the opponent's mainline replies
 * automatically, and validates user moves against the book mainline. A
 * legal-but-wrong move snaps the board back and reveals the expected SAN.
 *
 * Reads attrs (via hydrate): data-pgn-url, data-play-as.
 *
 * @param {HTMLElement} placeholder
 * @param {{ pgn: string, playAs: "white"|"black" }} opts
 */
export function mountPracticeOpeningWidget(placeholder, opts) {
  const parsed = parsePgnMainline(opts.pgn);
  if (!parsed) {
    placeholder.innerHTML = `<p class="puzzle-error">${STRINGS.invalidPractice}</p>`;
    placeholder.classList.add("chess-widget-error");
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "chess-widget practice-opening-widget";
  wrapper.innerHTML = `
    <div class="puzzle-info"><span class="puzzle-label">${STRINGS.practiceLabel}</span></div>
    <div class="board-container"></div>
    <div class="status practice-status" data-ref="status"></div>
    <div class="practice-annotation" data-ref="annotation">
      <span class="practice-move-counter" data-ref="counter"></span>
      <span class="practice-annotation-text" data-ref="annotation-text"></span>
    </div>
    <div class="controls">
      <button data-action="hint">${STRINGS.practiceHint}</button>
      <button data-action="reset">${STRINGS.practiceRetry}</button>
      <button data-action="flip">${STRINGS.flipBoard}</button>
    </div>
  `;
  placeholder.replaceWith(wrapper);

  const playAs = opts.playAs === "black" ? "black" : "white";
  const userColor = playAs === "black" ? "b" : "w";

  const state = {
    startFen:  parsed.startFen,
    line:      parsed.line,
    cursor:    0,
    hintShown: false,
    userColor,
    game:      new LiveGame(parsed.startFen),
    board:     null,
    fenBar:    null,
    nextEl:    null,
    wrapper,
    statusEl:  wrapper.querySelector('[data-ref="status"]'),
    boardEl:   wrapper.querySelector(".board-container"),
    counterEl:     wrapper.querySelector('[data-ref="counter"]'),
    annotationEl:  wrapper.querySelector('[data-ref="annotation-text"]'),
  };

  state.board = new Board(state.boardEl, {
    fen: state.game.fen(),
    orientation: playAs,
  });
  state.fenBar = createFenBar(wrapper, { getFen: () => state.game.fen() });

  // Optional "continue" link shown once the line is completed.
  if (opts.nextUrl) {
    const controls = wrapper.querySelector(".controls");
    const link = document.createElement("a");
    link.className = "practice-next";
    link.href = opts.nextUrl;
    link.textContent = opts.nextLabel || STRINGS.practiceNext;
    link.hidden = true;
    controls.appendChild(link);
    state.nextEl = link;
  }

  bind(state);
  startTurn(state);
}

function bind(state) {
  state.wrapper.addEventListener("click", (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    switch (action) {
      case "hint":  showHint(state); break;
      case "reset": reset(state); break;
      case "flip":  state.board.flip(); break;
    }
  });
}

/** Dispatch the next ply: user input or opponent book reply. */
function startTurn(state) {
  if (state.cursor >= state.line.length) {
    finish(state);
    return;
  }
  if (state.game.turn() === state.userColor) {
    updateUI(state);
    enableInput(state);
  } else {
    updateUI(state, { thinking: true });
    state.board.disableInput();
    setTimeout(() => playBookMove(state), 400);
  }
}

function enableInput(state) {
  state.board.enableInput({
    color: state.game.turn(),
    dests: state.game.allDests(),
    onMove: (move) => handleUserMove(state, move),
  });
}

function rejectMove(state, { wrong = false, expectedSan = null } = {}) {
  state.board.setPosition(state.game.fen());
  if (wrong) flashWrong(state, expectedSan);
  enableInput(state);
}

async function handleUserMove(state, { from, to }) {
  const expected = state.line[state.cursor];
  if (from !== expected.from || to !== expected.to) {
    rejectMove(state, { wrong: true, expectedSan: expected.san });
    return;
  }

  let promotion = expected.promotion;
  const promoResult = await getPromotionPiece(state, from, to);
  if (promoResult.cancelled) {
    rejectMove(state);
    return;
  }
  if (promoResult.piece !== null) {
    if (expected.promotion && promoResult.piece !== expected.promotion) {
      rejectMove(state, { wrong: true, expectedSan: expected.san });
      return;
    }
    promotion = promoResult.piece;
  }

  const result = state.game.move(from, to, promotion);
  if (!result) {
    rejectMove(state);
    return;
  }

  const playedIdx = state.cursor;
  state.cursor++;
  state.hintShown = false;
  state.board.clearMarkers();
  state.board.setPosition(state.game.fen(), [from, to]);
  playMoveSound(state, result);
  setAnnotation(state, playedIdx);
  startTurn(state);
}

function playBookMove(state) {
  const next = state.line[state.cursor];
  if (!next) { finish(state); return; }
  const playedIdx = state.cursor;
  const result = state.game.move(next.from, next.to, next.promotion);
  state.cursor++;
  state.board.setPosition(state.game.fen(), [next.from, next.to]);
  if (result) playMoveSound(state, result);
  setAnnotation(state, playedIdx);
  startTurn(state);
}

function showHint(state) {
  if (state.hintShown) return;
  if (state.cursor >= state.line.length) return;
  if (state.game.turn() !== state.userColor) return;
  const next = state.line[state.cursor];
  state.board.markSquare(next.to);
  state.hintShown = true;
}

function reset(state) {
  state.board.disableInput();
  state.board.clearMarkers();
  state.game = new LiveGame(state.startFen);
  state.cursor = 0;
  state.hintShown = false;
  state.board.setPosition(state.game.fen());
  setAnnotation(state, null);
  startTurn(state);
}

function flashWrong(state, expectedSan) {
  const { statusEl } = state;
  statusEl.classList.remove("practice-complete");
  statusEl.classList.add("practice-wrong");
  statusEl.textContent = `${STRINGS.practiceWrongMove} ${expectedSan}`;
  setTimeout(() => {
    statusEl.classList.remove("practice-wrong");
    updateUI(state);
  }, 1500);
}

function finish(state) {
  const { statusEl } = state;
  state.board.disableInput();
  if (statusEl) {
    statusEl.classList.remove("practice-wrong");
    statusEl.classList.add("practice-complete");
    statusEl.textContent = STRINGS.practiceComplete;
  }
  if (state.counterEl) state.counterEl.textContent = STRINGS.practiceMoveCounter(state.line.length, state.line.length);
  if (state.nextEl) state.nextEl.hidden = false;
  if (state.fenBar) state.fenBar.update();
}

function updateUI(state, { thinking = false } = {}) {
  const { statusEl } = state;
  if (!statusEl) return;
  if (state.cursor >= state.line.length) {
    finish(state);
    return;
  }
  statusEl.textContent = thinking
    ? STRINGS.practiceOpponentThinking
    : STRINGS.practiceYourMove;
  statusEl.classList.remove("practice-wrong", "practice-complete");
  if (state.counterEl) state.counterEl.textContent = STRINGS.practiceMoveCounter(state.cursor, state.line.length);
  if (state.nextEl) state.nextEl.hidden = true;
  if (state.fenBar) state.fenBar.update();
}

/** Show the Farsi comment for the move at `idx` (clears when idx is null). */
function setAnnotation(state, idx) {
  if (!state.annotationEl) return;
  state.annotationEl.textContent = idx == null ? "" : (state.line[idx]?.comment || "");
}

/**
 * Extract starting FEN + mainline move list (with per-move Farsi comments)
 * from a PGN string. Returns null if the PGN is unparseable or has no moves.
 *
 * @param {string} pgn
 * @returns {{ startFen: string, line: Array<{from:string,to:string,promotion?:string,san:string,comment:string}> } | null}
 */
export function parsePgnMainline(pgn) {
  if (!pgn) return null;
  const chess = new Chess();
  try {
    chess.loadPgn(pgn, { strict: false });
  } catch {
    return null;
  }
  const verbose = chess.history({ verbose: true });
  if (verbose.length === 0) return null;

  // chess.js keys comments by the FEN of the position they annotate — for a
  // move comment that is the position *after* the move (move.after).
  const commentByFen = new Map();
  try {
    for (const { fen, comment } of chess.getComments()) {
      commentByFen.set(fen, (comment || "").trim());
    }
  } catch { /* older chess.js without getComments — comments stay empty */ }

  // Honour an explicit [FEN ...] tag; otherwise standard start.
  const fenTag = pgn.match(/\[FEN\s+"([^"]+)"\]/);
  const startFen = fenTag ? fenTag[1] : new Chess().fen();
  try {
    new Chess(startFen);
  } catch {
    return null;
  }

  return {
    startFen,
    line: verbose.map((m) => ({
      from: m.from,
      to: m.to,
      promotion: m.promotion || undefined,
      san: m.san,
      comment: commentByFen.get(m.after) || "",
    })),
  };
}
