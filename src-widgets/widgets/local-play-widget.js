import { Board } from "../lib/board.js";
import { LiveGame } from "../lib/live-game.js";
import { loadSounds, playMoveSound, playSound } from "../lib/sound.js";
import { createFenBar } from "../lib/fen-bar.js";
import { STRINGS } from "../strings.js";
import { getPromotionPiece } from "../lib/promotion-overlay.js";
import { createMoveList } from "../lib/move-list.js";
import { formatStatus } from "../lib/status-text.js";

const STORAGE_KEY = "chess-tutorial:local-play:fen";

/**
 * Local play widget. Two human players alternating on one board.
 * @param {HTMLElement} placeholder
 * @param {{ fen?: string|null }} opts
 */
export function mountLocalPlayWidget(placeholder, opts) {
  const wrapper = document.createElement("div");
  wrapper.className = "chess-widget local-play-widget";
  placeholder.replaceWith(wrapper);

  const saved = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();
  const state = {
    wrapper,
    game:     new LiveGame(opts.fen || saved || undefined),
    board:    null,
    fenBar:   null,
    moveList: null,
    statusEl: null,
    boardEl:  null,
  };

  render(state);
  loadSounds().catch(() => {});
}

function render(state) {
  state.wrapper.innerHTML = `
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
  });
  state.moveList = createMoveList(state.wrapper, {});
  state.fenBar = createFenBar(state.wrapper, {
    getFen: () => state.game.fen(),
    onLoad: (fen) => loadFen(state, fen),
  });
  bind(state);
  enableInput(state);
  updateUI(state);
}

function bind(state) {
  state.wrapper.addEventListener("click", (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    switch (action) {
      case "undo":     undoMove(state); break;
      case "flip":     state.board.flip(); break;
      case "new-game": newGame(state); break;
    }
  });
}

function enableInput(state) {
  if (state.game.isGameOver()) {
    state.board.disableInput();
    return;
  }
  state.board.enableInput({
    color: state.game.turn(),
    dests: state.game.allDests(),
    onMove: async ({ from, to }) => {
      const promoResult = await getPromotionPiece(state, from, to);
      if (promoResult.cancelled) {
        state.board.setPosition(state.game.fen());
        enableInput(state);
        return;
      }
      const promotion = promoResult.piece;

      const m = state.game.move(from, to, promotion);
      if (!m) {
        state.board.setPosition(state.game.fen());
        return;
      }
      playMoveSound(state, m);
      state.board.setPosition(state.game.fen(), [from, to]);
      persist(state);
      updateUI(state);
      enableInput(state);
    },
  });
}

function undoMove(state) {
  const m = state.game.undo();
  if (!m) return;
  playSound("takeBack");
  state.board.setPosition(state.game.fen());
  persist(state);
  updateUI(state);
  enableInput(state);
}

function newGame(state) {
  state.game = new LiveGame();
  state.board.setPosition(state.game.fen());
  persist(state);
  updateUI(state);
  enableInput(state);
  playSound("gameStart");
}

function loadFen(state, fen) {
  try {
    state.game = new LiveGame(fen);
    state.board.setPosition(state.game.fen());
    persist(state);
    updateUI(state);
    enableInput(state);
  } catch { /* invalid FEN — ignore */ }
}

function persist(state) {
  try { localStorage.setItem(STORAGE_KEY, state.game.fen()); } catch { /* full */ }
}

function updateUI(state) {
  const { statusEl } = state;
  if (statusEl) {
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
