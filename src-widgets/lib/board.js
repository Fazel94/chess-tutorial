import { Chessground } from "@lichess-org/chessground";
import "@lichess-org/chessground/assets/chessground.base.css";
import "@lichess-org/chessground/assets/chessground.brown.css";
import "@lichess-org/chessground/assets/chessground.cburnett.css";

/**
 * Thin wrapper around a chessground instance.
 *
 * Move input contract (chessground is post-hoc — the board commits the move
 * before firing the callback):
 *   board.enableInput({ color, dests, onMove })
 *     color   "w" | "b"
 *     dests   Map<string, string[]>  — chessground legal-move map
 *     onMove  ({ from, to }) => void — fires after board has already animated
 *
 * Modes that need to reject a legal-but-wrong move (e.g. puzzle) must call
 * board.setPosition(priorFen) inside onMove to snap the piece back.
 */
export class Board {
  /**
   * @param {HTMLElement} container
   * @param {object} [opts]
   * @param {string} [opts.fen] - Initial position FEN
   * @param {"white"|"black"} [opts.orientation]
   */
  constructor(container, opts = {}) {
    this._cg = Chessground(container, {
      fen: opts.fen,
      orientation: opts.orientation || "white",
      coordinates: true,
      animation: { enabled: true, duration: 250 },
      movable: { free: false, color: undefined, dests: new Map(), showDests: true },
      draggable: { showGhost: true },
      highlight: { lastMove: true, check: true },
      drawable: { enabled: false },
    });
  }

  /** Set position from FEN string. Optional lastMove highlights the move squares.
   * @param {string} fen
   * @param {[string,string]} [lastMove] - e.g. ["e2","e4"]
   */
  setPosition(fen, lastMove) {
    this._cg.set({ fen, lastMove });
  }

  /** Flip board orientation. */
  flip() {
    this._cg.toggleOrientation();
  }

  /** @returns {"white"|"black"} Current board orientation. */
  orientation() {
    return this._cg.state.orientation;
  }

  /** Destroy the chessground instance and release DOM listeners. */
  destroy() {
    this._cg.destroy();
  }

  /**
   * Enable user move input for one side.
   * @param {object} opts
   * @param {"w"|"b"} opts.color
   * @param {Map<string,string[]>} opts.dests
   * @param {function} opts.onMove - Called with { from, to } after board animates
   */
  enableInput({ color, dests, onMove }) {
    const cgColor = color === "b" ? "black" : "white";
    this._cg.set({
      turnColor: cgColor,
      movable: {
        color: cgColor,
        dests,
        events: {
          after: (orig, dest) => onMove({ from: orig, to: dest }),
        },
      },
    });
  }

  /** Disable all move input. */
  disableInput() {
    this._cg.set({ movable: { color: undefined, dests: new Map() } });
  }

  /**
   * Highlight a square (e.g. puzzle hint destination).
   * @param {string} square - Algebraic square (e.g. "e4")
   */
  markSquare(square) {
    this._cg.setAutoShapes([{ orig: square, brush: "green" }]);
  }

  /** Remove all auto-shapes (hint highlights). */
  clearMarkers() {
    this._cg.setAutoShapes([]);
  }
}
