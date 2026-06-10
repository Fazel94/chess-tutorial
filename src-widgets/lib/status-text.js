import { STRINGS } from "../strings.js";

/**
 * Format the status text displayed below a board.
 *
 * @param {object} opts
 * @param {"w"|"b"} opts.turn        - Side to move at the current position.
 * @param {boolean} [opts.isCheck]
 * @param {boolean} [opts.isCheckmate]
 * @param {boolean} [opts.isStalemate]
 * @param {boolean} [opts.isDraw]
 * @param {number}  [opts.cursor]     - Current half-move index (-1 = before start).
 * @param {number}  [opts.moveCount]  - Total half-moves in the game.
 * @returns {string} Farsi status string.
 */
export function formatStatus({ turn, isCheck, isCheckmate, isStalemate, isDraw, cursor, moveCount }) {
  if (isCheckmate) {
    const winner = turn === "w" ? STRINGS.black : STRINGS.white;
    return `${STRINGS.checkmate} — ${winner}`;
  }
  if (isStalemate) return STRINGS.stalemate;
  if (isDraw)      return STRINGS.draw;

  const side = turn === "w" ? STRINGS.whiteToMove : STRINGS.blackToMove;

  if (isCheck) return `${STRINGS.check} — ${side}`;

  // Viewer mode: include move counter when a move list exists.
  if (typeof cursor === "number" && typeof moveCount === "number" && moveCount > 0) {
    return `${side} — ${STRINGS.moveN(cursor + 1)} / ${moveCount}`;
  }

  return side;
}
