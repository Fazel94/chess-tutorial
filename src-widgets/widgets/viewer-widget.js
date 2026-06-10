import LichessPgnViewer from "@lichess-org/pgn-viewer";
import { translate } from "../lib/lpv-translate.js";
import { STRINGS } from "../strings.js";
import { loadSounds } from "../lib/sound.js";
import { attachMoveSounds } from "../lib/viewer-sounds.js";
import { attachShortcutsHelp, viewerShortcuts } from "../lib/shortcuts-help.js";

/**
 * PGN step-through viewer backed by @lichess-org/pgn-viewer.
 *
 * Gains over the previous hand-rolled version:
 *   - Variation tree rendering
 *   - ARIA / screen-reader move announcements
 *   - User arrow/circle drawing on the board
 *   - Robust chessops PGN parser (NAGs, nested variations, comments)
 *
 * Reads: data-pgn-url, data-pgn, data-caption, data-orientation.
 * Multi-game PGNs are split and rendered as one viewer per game.
 */
export async function mountViewerWidget(placeholder) {
  const pgnUrl    = placeholder.dataset.pgnUrl || "";
  const pgnInline = placeholder.dataset.pgn    || "";
  const caption   = placeholder.dataset.caption || "";

  const wrapper = document.createElement("div");
  wrapper.className = "chess-widget tutorial-viewer-widget";
  wrapper.innerHTML = `<div class="tutorial-widget-loading">${STRINGS.loading}</div>`;
  placeholder.replaceWith(wrapper);

  let pgnText = pgnInline;
  if (!pgnText && pgnUrl) {
    try {
      const res = await fetch(pgnUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      pgnText = await res.text();
    } catch (err) {
      wrapper.innerHTML = `<div class="tutorial-widget-error">${STRINGS.notFound}: ${pgnUrl}</div>`;
      return;
    }
  }

  if (!pgnText) {
    wrapper.innerHTML = `<div class="tutorial-widget-error">${STRINGS.notFound}</div>`;
    return;
  }

  const games = splitPgn(pgnText);
  wrapper.innerHTML = "";

  if (games.length === 1) {
    mountSingle(wrapper, games[0], null, caption);
  } else {
    wrapper.className = "chess-widget tutorial-viewer-group";
    games.forEach((pgn) => {
      const sub = document.createElement("div");
      sub.className = "chess-widget tutorial-viewer-widget";
      wrapper.appendChild(sub);
      mountSingle(sub, pgn, extractEventTag(pgn) || null, null);
    });
    if (caption) {
      const p = document.createElement("p");
      p.className = "tutorial-caption";
      p.textContent = caption;
      wrapper.appendChild(p);
    }
  }
}

// ─── Single viewer ────────────────────────────────────────────────────────────

const LPV_MENU = {
  getPgn:               { enabled: false },
  practiceWithComputer: { enabled: false },
  analysisBoard:        { enabled: false },
};

function mountSingle(container, pgn, title, caption) {
  if (title) {
    const h = document.createElement("div");
    h.className = "viewer-title";
    h.textContent = title;
    container.appendChild(h);
  }

  const lpvEl = document.createElement("div");
  container.appendChild(lpvEl);

  const viewer = LichessPgnViewer(lpvEl, {
    pgn,
    showMoves:     "auto",
    showControls:  true,
    showPlayers:   false,
    showClocks:    false,
    keyboardToMove: true,
    scrollToMove:  true,
    drawArrows:    true,
    initialPly:    0,
    lichess:       false,
    menu:          LPV_MENU,
    translate,
  });

  attachMobileComment(lpvEl, viewer);
  attachMoveSounds(viewer);
  loadSounds().catch(() => {});
  attachShortcutsHelp(container, viewerShortcuts());

  if (caption) {
    const p = document.createElement("p");
    p.className = "tutorial-caption";
    p.textContent = caption;
    container.appendChild(p);
  }
}

// ─── Mobile annotation card ───────────────────────────────────────────────────

/**
 * Format a move label in algebraic notation for the annotation card.
 * Examples: "12. O-O-O"  (white, ply 23)  or  "12...Rxd7"  (black, ply 24).
 *
 * @param {{ ply: number, san: string }} data
 * @returns {string}
 */
function formatMoveLabel(data) {
  const moveNumber   = Math.ceil(data.ply / 2);
  const playedByWhite = data.ply % 2 === 1;
  return playedByWhite
    ? `${moveNumber}. ${data.san}`
    : `${moveNumber}...${data.san}`;
}

/**
 * Inject a `.lpv__mobile-comment` card into the LPV root and keep it in sync
 * with the currently selected move by wrapping viewer.goTo / viewer.toPath.
 *
 * Visible only at ≤ 700 px (controlled by CSS).  Does nothing when the LPV
 * API is unavailable (e.g. in unit-test environments that pass null).
 *
 * @param {HTMLElement} lpvEl   - The LPV root element.
 * @param {object|null} viewer  - The LPV viewer instance.
 * @returns {() => void}        - Teardown function (restores original methods).
 */
function attachMobileComment(lpvEl, viewer) {
  // LPV uses Snabbdom's patch(element, blueprint) which REPLACES the original
  // element in the DOM. After mount, viewer.div is the actual live element;
  // lpvEl is detached. Use viewer.div when available, fall back to lpvEl for
  // test environments where the mock doesn't set .div.
  const root = (viewer && viewer.div) ? viewer.div : lpvEl;

  // Build card DOM
  const card = document.createElement("div");
  card.className = "lpv__mobile-comment is-empty";

  const moveEl = document.createElement("div");
  moveEl.className = "lpv__mobile-comment__move";

  const textEl = document.createElement("div");
  textEl.className = "lpv__mobile-comment__text";

  card.appendChild(moveEl);
  card.appendChild(textEl);
  root.appendChild(card);

  // Render current move data into the card
  function refresh() {
    if (!viewer) return;
    let data;
    try { data = viewer.curData(); } catch (_) { return; }
    if (!data || !data.san) {
      // Initial position or no move selected
      card.classList.add("is-empty");
      moveEl.textContent = "";
      textEl.textContent = "";
      return;
    }
    const comment = (data.comments || []).join("\n").trim();
    moveEl.textContent = formatMoveLabel(data);
    textEl.textContent = comment || STRINGS.mobileNoComment;
    card.classList.toggle("is-empty", !comment);
  }

  refresh();

  // Wrap viewer navigation methods so the card refreshes after each step.
  if (!viewer) return () => {};
  const origGoTo   = viewer.goTo   ? viewer.goTo.bind(viewer)   : null;
  const origToPath = viewer.toPath ? viewer.toPath.bind(viewer) : null;
  if (origGoTo)   viewer.goTo   = (dir, focus) => { origGoTo(dir, focus); refresh(); };
  if (origToPath) viewer.toPath = (p, focus)   => { origToPath(p, focus); refresh(); };

  return () => {
    if (origGoTo)   viewer.goTo   = origGoTo;
    if (origToPath) viewer.toPath = origToPath;
  };
}
// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitPgn(pgnText) {
  return pgnText.split(/(?=\n\[Event )/).map(p => p.trim()).filter(Boolean);
}

function extractEventTag(pgn) {
  const m = pgn.match(/\[Event\s+"([^"]+)"\]/);
  return m ? m[1] : null;
}
