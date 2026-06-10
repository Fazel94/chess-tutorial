import { Board } from "../lib/board.js";
import { LiveGame } from "../lib/live-game.js";
import { createFenBar } from "../lib/fen-bar.js";
import { STRINGS } from "../strings.js";
import { getPromotionPiece } from "../lib/promotion-overlay.js";
import { formatStatus } from "../lib/status-text.js";
import { parseUci } from "../lib/uci.js";
import { loadSounds, playMoveSound, playSound } from "../lib/sound.js";

/**
 * Puzzle widget. Validates user moves against a UCI solution sequence;
 * legal-but-wrong moves snap the board back. Auto-plays opponent replies
 * at odd indices.
 *
 * @param {HTMLElement} placeholder
 * @param {{ fen: string, solution: string[], hint?: string }} opts
 */
export function mountPuzzleWidget(placeholder, opts) {
  if (!opts.fen || !opts.solution || opts.solution.length === 0) {
    placeholder.innerHTML = `<p class="puzzle-error">${STRINGS.invalidPuzzle}</p>`;
    placeholder.classList.add("chess-widget-error");
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "chess-widget puzzle-widget";
  wrapper.innerHTML = `
    <div class="puzzle-info"><span class="puzzle-label">${STRINGS.puzzleLabel}</span></div>
    <div class="board-container"></div>
    <div class="status puzzle-status" data-ref="status"></div>
    <div class="controls">
      ${opts.hint ? `<button data-action="hint">${STRINGS.puzzleHint}</button>` : ""}
      <button data-action="reset">${STRINGS.puzzleReset}</button>
      <button data-action="flip">${STRINGS.flipBoard}</button>
    </div>
  `;
  placeholder.replaceWith(wrapper);

  const state = {
    puzzleFen:   opts.fen,
    solution:    opts.solution,
    hint:        opts.hint || null,
    solutionIdx: 0,
    hintShown:   false,
    game:        new LiveGame(opts.fen),
    board:       null,
    fenBar:      null,
    wrapper,
    statusEl: null,
    boardEl:  null,
  };

  state.boardEl = wrapper.querySelector(".board-container");
  state.board  = new Board(state.boardEl, { fen: state.game.fen() });
  state.fenBar = createFenBar(wrapper, { getFen: () => state.game.fen() });
  state.statusEl = wrapper.querySelector('[data-ref="status"]');

  bind(state);
  enableInput(state);
  updateUI(state);
  loadSounds().catch(() => {});
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

function enableInput(state) {
  if (state.solutionIdx >= state.solution.length) return;
  state.board.enableInput({
    color: state.game.turn(),
    dests: state.game.allDests(),
    onMove: (move) => handleMove(state, move),
  });
}

/**
 * Snap the board back to the current game position and optionally flash "wrong".
 * @param {object} state
 * @param {{ wrong?: boolean }} [opts]
 */
function rejectMove(state, { wrong = false } = {}) {
  state.board.setPosition(state.game.fen());
  if (wrong) flashStatus(state, "wrong");
  enableInput(state);
}

async function handleMove(state, { from, to }) {
  const expected = state.solution[state.solutionIdx];
  const { from: expFrom, to: expTo, promotion: expPromo } = parseUci(expected);

  if (from !== expFrom || to !== expTo) {
    rejectMove(state, { wrong: true });
    return;
  }

  // Handle promotion: ask the user which piece, then validate against solution.
  let promotion = expPromo;
  const promoResult = await getPromotionPiece(state, from, to);
  if (promoResult.cancelled) {
    rejectMove(state);
    return;
  }
  if (promoResult.piece !== null) {
    if (expPromo && promoResult.piece !== expPromo) {
      rejectMove(state, { wrong: true });
      return;
    }
    promotion = promoResult.piece;
  }

  const result = state.game.move(from, to, promotion);
  if (!result) {
    rejectMove(state);
    return;
  }

  state.solutionIdx++;
  state.hintShown = false;
  state.board.clearMarkers();
  state.board.setPosition(state.game.fen(), [from, to]);
  playMoveSound(state, result);

  if (state.solutionIdx >= state.solution.length) {
    updateUI(state);
    flashStatus(state, "solved");
    return;
  }

  playOpponent(state);
}

async function playOpponent(state) {
  const uci = state.solution[state.solutionIdx];
  const { from, to, promotion } = parseUci(uci);

  await new Promise((r) => setTimeout(r, 400));

  const oppResult = state.game.move(from, to, promotion);
  state.solutionIdx++;
  state.board.setPosition(state.game.fen(), [from, to]);
  if (oppResult) playMoveSound(state, oppResult);
  updateUI(state);

  if (state.solutionIdx >= state.solution.length) {
    flashStatus(state, "solved");
  } else {
    enableInput(state);
  }
}

function showHint(state) {
  if (state.hintShown) return;
  const { statusEl } = state;
  statusEl.textContent = `${STRINGS.puzzleHintPrefix}: ${state.hint}`;
  statusEl.classList.remove("puzzle-wrong", "puzzle-solved");
  state.hintShown = true;
  const uci = state.solution[state.solutionIdx];
  if (uci) state.board.markSquare(uci.slice(2, 4));
}

function reset(state) {
  state.board.disableInput();
  state.board.clearMarkers();
  state.game = new LiveGame(state.puzzleFen);
  state.solutionIdx = 0;
  state.hintShown = false;
  state.board.setPosition(state.game.fen());
  updateUI(state);
  enableInput(state);
}

function flashStatus(state, type) {
  const { statusEl } = state;
  statusEl.classList.remove("puzzle-wrong", "puzzle-solved");
  if (type === "wrong") {
    statusEl.textContent = STRINGS.puzzleWrong;
    statusEl.classList.add("puzzle-wrong");
    playSound("wrongMove");
    setTimeout(() => {
      statusEl.classList.remove("puzzle-wrong");
      updateUI(state);
    }, 800);
  } else if (type === "solved") {
    statusEl.textContent = STRINGS.puzzleSolved;
    statusEl.classList.add("puzzle-solved");
    playSound("gameWon");
  }
}

function updateUI(state) {
  const { statusEl } = state;
  if (!statusEl) return;
  if (state.solutionIdx >= state.solution.length) {
    statusEl.textContent = STRINGS.puzzleSolved;
    statusEl.classList.remove("puzzle-wrong");
    statusEl.classList.add("puzzle-solved");
  } else {
    statusEl.textContent = formatStatus({ turn: state.game.turn() });
    statusEl.classList.remove("puzzle-wrong", "puzzle-solved");
  }
  if (state.fenBar) state.fenBar.update();
}
