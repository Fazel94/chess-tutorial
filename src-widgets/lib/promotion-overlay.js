/**
 * Promotion piece picker overlay.
 *
 * Renders four piece elements (Q / R / B / N) absolutely positioned over
 * the promotion square, using chessground's existing `.cg-wrap piece` CSS
 * classes so no extra images are needed.
 *
 * @param {HTMLElement} boardEl  - The `.board-container` or `.board-el` div
 *                                 that wraps the chessground instance.
 * @param {string}      toSquare - Destination square in algebraic notation ("e8").
 * @param {"w"|"b"}     color    - Side that is promoting.
 * @param {"white"|"black"} [orientation] - Board orientation; defaults to "white".
 * @returns {Promise<"q"|"r"|"b"|"n">} Resolves with the chosen piece.
 *   Rejects if the user presses Escape (caller should snap the board back).
 */
export function promptPromotion(boardEl, toSquare, color, orientation = "white") {
  return new Promise((resolve, reject) => {
    const cgColor = color === "b" ? "black" : "white";
    const pieces  = ["queen", "rook", "bishop", "knight"];
    const keys    = ["q",     "r",    "b",      "n"];

    // ── Position calculation ──────────────────────────────────────────────
    // toSquare is "a1"–"h8".  Map file (a=0…h=7) and rank (1=0…8=7) to
    // fractional board coordinates (0=left/bottom, 1=right/top).
    const file  = toSquare.charCodeAt(0) - 97;      // 0–7
    const rank  = parseInt(toSquare[1], 10) - 1;    // 0–7

    const boardRect = boardEl.getBoundingClientRect();
    const sq        = boardRect.width / 8;

    // Establish positioning context BEFORE reading offsetLeft/Top so
    // boardEl.offsetParent is `parent`, not a distant static ancestor.
    const parent  = boardEl.parentElement;
    const prevPos = getComputedStyle(parent).position;
    if (prevPos === "static") parent.style.position = "relative";
    const offX      = boardEl.offsetLeft;
    const offY      = boardEl.offsetTop;

    // If orientation is black, the board is flipped: rank 8 is at the bottom.
    const isFlipped = orientation === "black";

    const col = isFlipped ? (7 - file) : file;
    const row = isFlipped ? rank       : (7 - rank);

    // ── Overlay container ─────────────────────────────────────────────────
    const overlay = document.createElement("div");
    overlay.className = "chess-promotion-overlay";

    const picker = document.createElement("div");
    picker.className = "chess-promotion-overlay__picker";
    picker.style.left  = `${offX + col * sq}px`;
    picker.style.top   = `${offY + row * sq}px`;
    picker.style.width = `${sq}px`;

    pieces.forEach((role, i) => {
      const piece = document.createElement("piece");
      piece.className = `${cgColor} ${role} chess-promotion-overlay__piece`;
      piece.style.width  = `${sq}px`;
      piece.style.height = `${sq}px`;
      piece.addEventListener("click", (e) => {
        e.stopPropagation();
        cleanup();
        resolve(keys[i]);
      });
      picker.appendChild(piece);
    });
    overlay.appendChild(picker);

    // Click outside picker = cancel.
    overlay.addEventListener("click", () => { cleanup(); reject(new Error("cancelled")); });


    parent.appendChild(overlay);

    // Escape key = cancel.
    function onKey(e) {
      if (e.key === "Escape") { cleanup(); reject(new Error("cancelled")); }
    }
    document.addEventListener("keydown", onKey);

    function cleanup() {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      if (prevPos === "static") parent.style.position = "";
    }
  });
}

/**
 * Returns true if moving a pawn from `from` to `to` is a promotion move,
 * regardless of legality.  Used to decide whether to show the picker.
 *
 * @param {string} from
 * @param {string} to
 * @param {"w"|"b"} turn
 * @returns {boolean}
 */
export function isPromotionMove(from, to, turn) {
  const fromRank = parseInt(from[1], 10);
  const toRank   = parseInt(to[1], 10);
  if (turn === "w") return fromRank === 7 && toRank === 8;
  if (turn === "b") return fromRank === 2 && toRank === 1;
  return false;
}

/**
 * High-level wrapper: if this move is a pawn promotion, prompt the user
 * for the piece; otherwise return { piece: null }. Catches Escape/click-outside
 * and returns { cancelled: true } so the caller can snap back.
 *
 * @param {object} state - Widget state with .boardEl (or .wrapper fallback), .board, .game.
 * @param {string} from
 * @param {string} to
 * @returns {Promise<{ piece: "q"|"r"|"b"|"n" } | { cancelled: true } | { piece: null }>}
 *   - `{ piece: null }`: not a promotion move; no picker shown.
 *   - `{ piece: "q"|… }`: user picked a piece.
 *   - `{ cancelled: true }`: user cancelled; caller should snap board back.
 */
export async function getPromotionPiece(state, from, to) {
  if (!isPromotionMove(from, to, state.game.turn())) return { piece: null };
  const boardEl = state.boardEl ?? state.wrapper.querySelector(".board-container");
  try {
    const piece = await promptPromotion(boardEl, to, state.game.turn(), state.board.orientation());
    return { piece };
  } catch {
    return { cancelled: true };
  }
}
