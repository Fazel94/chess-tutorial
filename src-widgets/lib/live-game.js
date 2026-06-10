import { Chess } from "chess.js";

/**
 * Live game state for interactive play.
 * Unlike Game (read-only PGN navigator), this accepts new moves
 * and tracks game-over conditions.
 */
export class LiveGame {
  /**
   * @param {string} [fen] - Starting position FEN. Defaults to standard start.
   */
  constructor(fen) {
    this._chess = fen ? new Chess(fen) : new Chess();
    this._startFen = this._chess.fen();
  }

  /** Current FEN. */
  fen() {
    return this._chess.fen();
  }

  /** Starting FEN. */
  startFen() {
    return this._startFen;
  }

  /** @returns {"w"|"b"} Side to move. */
  turn() {
    return this._chess.turn();
  }

  /**
   * Attempt a move. Returns the Move object on success, null if illegal.
   * @param {string} from - Square (e.g. "e2")
   * @param {string} to - Square (e.g. "e4")
   * @param {string} [promotion] - Promotion piece ("q","r","b","n")
   * @returns {import("chess.js").Move|null}
   */
  move(from, to, promotion) {
    try {
      return this._chess.move({ from, to, promotion: promotion || "q" });
    } catch {
      return null;
    }
  }

  /**
   * Undo the last move. Returns the undone Move or null.
   * @returns {import("chess.js").Move|null}
   */
  undo() {
    return this._chess.undo();
  }

  /** @returns {boolean} */
  isGameOver() {
    return this._chess.isGameOver();
  }

  /** @returns {boolean} */
  isCheckmate() {
    return this._chess.isCheckmate();
  }

  /** @returns {boolean} */
  isStalemate() {
    return this._chess.isStalemate();
  }

  /** @returns {boolean} */
  isDraw() {
    return this._chess.isDraw();
  }

  /** @returns {boolean} */
  isCheck() {
    return this._chess.isCheck();
  }

  /** Verbose move history. */
  history() {
    return this._chess.history({ verbose: true });
  }

  /**
   * Returns a chessground-shaped legal-move map for the side to move.
   * @returns {Map<string, string[]>}
   */
  allDests() {
    const dests = new Map();
    for (const m of this._chess.moves({ verbose: true })) {
      if (!dests.has(m.from)) dests.set(m.from, []);
      dests.get(m.from).push(m.to);
    }
    return dests;
  }

  /** Move count (number of half-moves played). */
  get moveCount() {
    return this._chess.history().length;
  }
}
