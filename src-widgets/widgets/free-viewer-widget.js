import LichessPgnViewer from "@lichess-org/pgn-viewer";
import { Chess } from "chess.js";
import { translate } from "../lib/lpv-translate.js";
import { createFenBar } from "../lib/fen-bar.js";
import { loadSounds } from "../lib/sound.js";
import { attachMoveSounds } from "../lib/viewer-sounds.js";
import { attachShortcutsHelp, viewerShortcuts } from "../lib/shortcuts-help.js";
import { STRINGS } from "../strings.js";
/**
 * Free FEN/PGN viewer — the standalone /view/ page.
 * Reads ?fen= and ?pgn= from URL params passed as `opts`.
 *
 * Backed by @lichess-org/pgn-viewer.  The FEN bar (copy / load) is
 * appended after the lpv element so users can still paste positions.
 *
 * @param {HTMLElement} placeholder
 * @param {{ fen?: string|null, pgn?: string|null }} opts
 */
export function mountFreeViewerWidget(placeholder, opts) {
  const wrapper = document.createElement("div");
  wrapper.className = "chess-widget free-viewer-widget";
  placeholder.replaceWith(wrapper);

  const hasMoves = Boolean(opts.pgn);

  const lpvEl = document.createElement("div");
  wrapper.appendChild(lpvEl);

  /** @type {import("@lichess-org/pgn-viewer").PgnViewer} */
  const lpv = LichessPgnViewer(lpvEl, {
    pgn:           opts.pgn || "*",
    fen:           opts.fen || undefined,
    showMoves:     hasMoves ? "auto" : false,
    showControls:  hasMoves,
    showPlayers:   false,
    showClocks:    false,
    keyboardToMove: hasMoves,
    scrollToMove:  true,
    drawArrows:    true,
    initialPly:    0,
    lichess:       false,
    menu: {
      getPgn:               { enabled: false },
      practiceWithComputer: { enabled: false },
      analysisBoard:        { enabled: false },
    },
    translate,
  });

  // Step-through move sounds — only when there are moves to navigate.
  if (hasMoves) {
    attachMoveSounds(lpv);
    attachShortcutsHelp(wrapper, viewerShortcuts());
    loadSounds().catch(() => {});
  }

  // FEN bar — shows current position FEN and allows loading a new one.
  createFenBar(wrapper, {
    getFen: () => {
      // lpv.node is the current position node; .fen is the FEN string.
      try { return lpv.node?.data?.fen ?? opts.fen ?? ""; } catch { return ""; }
    },
    onLoad: (fen) => {
      // Validate before rebuilding — an invalid FEN would otherwise render an
      // empty/broken board with no feedback. Returning false makes the FEN bar
      // show its inline error and keep the typed value.
      try {
        new Chess(fen);
      } catch {
        return false;
      }
      // pgn-viewer has no live FEN-load API; rebuild by clearing and
      // re-invoking mount on the existing wrapper element.
      wrapper.innerHTML = "";
      mountFreeViewerWidget(wrapper, { fen, pgn: null });
      return true;
    },
  });
}
