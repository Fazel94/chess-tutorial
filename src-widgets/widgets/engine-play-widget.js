import { Board } from "../lib/board.js";
import { LiveGame } from "../lib/live-game.js";
import { Engine } from "../lib/engine.js";
import { createFenBar } from "../lib/fen-bar.js";
import { STRINGS } from "../strings.js";
import { loadSounds, playMoveSound } from "../lib/sound.js";
import { getPromotionPiece } from "../lib/promotion-overlay.js";
import { createMoveList } from "../lib/move-list.js";
import { formatStatus } from "../lib/status-text.js";
import { parseUci } from "../lib/uci.js";

/**
 * Engine play widget. User plays Stockfish from a given (optional) FEN.
 *
 * @param {HTMLElement} placeholder
 * @param {{ fen?: string|null, difficulty?: string, color?: string }} opts
 */
export function mountEnginePlayWidget(placeholder, opts) {
  const state = {
    playerColor: opts.color === "b" ? "b" : "w",
    difficulty:  opts.difficulty || "intermediate",
    game:        new LiveGame(opts.fen || undefined),
    engine:      new Engine(),
    thinking:    false,
    board:       null,
    fenBar:      null,
    moveList:    null,
    wrapper:     null,
    statusEl:    null,
    boardEl:     null,
  };

  const wrapper = document.createElement("div");
  wrapper.className = "chess-widget engine-play-widget";
  state.wrapper = wrapper;
  placeholder.replaceWith(wrapper);
  bindOnce(state);

  render(state);
  initEngine(state);
}

function teardown(state) {
  state.board?.destroy();
  state.fenBar?.destroy();
  state.moveList?.destroy();
  state.board    = null;
  state.fenBar   = null;
  state.moveList = null;
  state.statusEl = null;
  state.boardEl  = null;
}

function render(state) {
  teardown(state);
  const diffOpts = ["beginner", "intermediate", "advanced"]
    .map((d) => `<option value="${d}"${d === state.difficulty ? " selected" : ""}>${STRINGS.difficulty[d]}</option>`)
    .join("");
  const colorOpts = [
    { val: "w", label: STRINGS.playAsWhite },
    { val: "b", label: STRINGS.playAsBlack },
  ].map(({ val, label }) =>
    `<option value="${val}"${val === state.playerColor ? " selected" : ""}>${label}</option>`,
  ).join("");

  state.wrapper.innerHTML = `
    <div class="play-settings">
      <label>${STRINGS.difficultyLabel}: <select data-ref="difficulty">${diffOpts}</select></label>
      <label>${STRINGS.colorLabel}: <select data-ref="color">${colorOpts}</select></label>
    </div>
    <div class="board-container"></div>
    <div class="status" data-ref="status"></div>
    <div class="controls">
      <button data-action="undo">${STRINGS.undo}</button>
      <button data-action="flip">${STRINGS.flipBoard}</button>
      <button data-action="new-game">${STRINGS.newGame}</button>
    </div>
  `;
  state.statusEl = state.wrapper.querySelector('[data-ref="status"]');

  state.boardEl = state.wrapper.querySelector(".board-container");
  state.board = new Board(state.boardEl, {
    fen: state.game.fen(),
    orientation: state.playerColor === "b" ? "black" : "white",
  });
  state.fenBar = createFenBar(state.wrapper, {
    getFen: () => state.game.fen(),
    onLoad: (fen) => loadFen(state, fen),
  });
  state.moveList = createMoveList(state.wrapper, {});

}

function bindOnce(state) {
  state.wrapper.addEventListener("click", (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    switch (action) {
      case "undo":     undoMove(state); break;
      case "flip":     state.board.flip(); break;
      case "new-game": newGame(state); break;
    }
  });
  state.wrapper.addEventListener("change", (e) => {
    const ref = e.target.dataset.ref;
    if (ref === "difficulty") {
      state.difficulty = e.target.value;
      state.engine.setDifficulty(state.difficulty);
    } else if (ref === "color") {
      state.playerColor = e.target.value;
      newGame(state);
    }
  });
}

async function initEngine(state) {
  const { statusEl } = state;
  statusEl.textContent = STRINGS.engineLoading;
  try {
    await state.engine.init();
    state.engine.setDifficulty(state.difficulty);
    loadSounds().catch(() => {});
    enablePlayerInput(state);
    updateUI(state);
    if (state.playerColor !== state.game.turn()) await engineMove(state);
  } catch (err) {
    statusEl.textContent = STRINGS.engineError;
    console.error("Engine init failed:", err);
  }
}

function enablePlayerInput(state) {
  if (state.game.isGameOver()) return;
  state.board.enableInput({
    color: state.playerColor,
    dests: state.game.allDests(),
    onMove: (move) => handleMove(state, move),
  });
}

async function handleMove(state, { from, to }) {
  const promoResult = await getPromotionPiece(state, from, to);
  if (promoResult.cancelled) {
    state.board.setPosition(state.game.fen());
    enablePlayerInput(state);
    return;
  }
  const piece = promoResult.piece;
  const result = state.game.move(from, to, piece);
  if (!result) {
    state.board.setPosition(state.game.fen());
    return;
  }
  state.board.disableInput();
  state.board.setPosition(state.game.fen(), [from, to]);
  playMoveSound(state, result);
  updateUI(state);
  if (state.game.isGameOver()) return;
  await engineMove(state);
}

async function engineMove(state) {
  state.board.disableInput();
  state.thinking = true;
  updateUI(state);
  const bestMove = await state.engine.getBestMove(state.game.fen());
  const { from, to, promotion } = parseUci(bestMove);
  const engineMoveResult = state.game.move(from, to, promotion);
  state.board.setPosition(state.game.fen(), [from, to]);
  playMoveSound(state, engineMoveResult);
  state.thinking = false;
  updateUI(state);
  if (!state.game.isGameOver()) enablePlayerInput(state);
}

function undoMove(state) {
  if (state.thinking || state.game.moveCount < 2) return;
  state.game.undo();
  state.game.undo();
  state.board.setPosition(state.game.fen());
  enablePlayerInput(state);
  updateUI(state);
}

function newGame(state) {
  state.engine.stop();
  state.board.disableInput();
  state.game = new LiveGame(state.game.startFen());
  render(state);
  initEngine(state);
}

async function loadFen(state, fen) {
  try {
    state.engine.stop();
    state.board.disableInput();
    state.game = new LiveGame(fen);
    state.board.setPosition(state.game.fen());
    updateUI(state);
    state.fenBar.update();
    if (state.playerColor !== state.game.turn()) {
      await engineMove(state);
    } else {
      enablePlayerInput(state);
    }
  } catch { /* invalid FEN — ignore */ }
}

function updateUI(state) {
  const { statusEl } = state;
  if (!statusEl) return;

  if (state.thinking) {
    statusEl.textContent = STRINGS.engineThinking;
  } else {
    statusEl.textContent = formatStatus({
      turn:        state.game.turn(),
      isCheck:     state.game.isCheck(),
      isCheckmate: state.game.isCheckmate(),
      isStalemate: state.game.isStalemate(),
      isDraw:      state.game.isDraw(),
    });
  }

  if (state.moveList) {
    const moves = state.game.history();
    state.moveList.render(moves, moves.length - 1);
  }

  if (state.fenBar) state.fenBar.update();
}
