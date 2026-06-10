import LichessPgnViewer from "@lichess-org/pgn-viewer";
import { translate } from "../lib/lpv-translate.js";

/**
 * Static board widget. Renders a fixed FEN position using pgn-viewer in
 * view-only mode (no move list, no controls, no players).
 *
 * Reads: data-fen, data-orientation, data-caption.
 */
export function mountBoardWidget(placeholder) {
  const fen         = placeholder.dataset.fen || "";
  const orientation = placeholder.dataset.orientation || "white";
  const caption     = placeholder.dataset.caption || "";

  const wrapper = document.createElement("div");
  wrapper.className = "chess-widget tutorial-board-widget";
  placeholder.replaceWith(wrapper);

  const boardDiv = document.createElement("div");
  wrapper.appendChild(boardDiv);

  LichessPgnViewer(boardDiv, {
    pgn:          "*",
    fen:          fen || undefined,
    orientation:  orientation === "black" ? "black" : "white",
    showMoves:    false,
    showControls: false,
    showPlayers:  false,
    showClocks:   false,
    lichess:      false,
    translate,
    chessground: {
      coordinates: true,
      viewOnly:    true,
    },
  });

  if (caption) {
    wrapper.appendChild(renderCaption(caption));
  }
}

/**
 * Build the caption `<p>`. When the caption has the form
 * "پس از <move sequence> — <explanation>", the move sequence is isolated as an
 * LTR run so the moves don't get visually reordered by the RTL bidi algorithm,
 * and the explanation drops to its own line. Any other caption renders as
 * plain text.
 *
 * @param {string} text
 * @returns {HTMLParagraphElement}
 */
export function renderCaption(text) {
  const p = document.createElement("p");
  p.className = "tutorial-caption";

  const m = text.match(/^(پس از)\s+(.+?)\s+[—–]\s+([\s\S]+)$/);
  if (!m) {
    p.textContent = text;
    return p;
  }

  p.classList.add("has-moves");
  const head = document.createElement("span");
  head.className = "caption-head";
  head.append(m[1] + " ");
  const moves = document.createElement("bdi");
  moves.className = "caption-moves";
  moves.dir = "ltr";
  moves.textContent = m[2];
  head.appendChild(moves);

  const note = document.createElement("span");
  note.className = "caption-note";
  note.textContent = m[3];

  p.append(head, note);
  return p;
}
