/**
 * Widget hydration entry point.
 *
 * MkDocs renders `<div class="chess-widget" data-mode="…" data-…="…">`
 * placeholders into the page HTML at build time. This module finds them on
 * DOMContentLoaded and mounts the matching widget class in their place.
 *
 * One module per data-mode value:
 *   board, viewer, puzzle, engine_play, local_play,
 *   free_viewer, puzzle_from_url, engine_play_from_url, local_play_from_url
 *
 * Widgets are lazy-mounted via IntersectionObserver: each placeholder receives
 * a skeleton to reserve layout space; the real mount fires when the placeholder
 * enters a 200 px lead ahead of the viewport. Falls back to immediate mount
 * when IntersectionObserver is unavailable.
 */

import { mountBoardWidget }          from "./widgets/board-widget.js";
import { mountViewerWidget }         from "./widgets/viewer-widget.js";
import { mountPuzzleWidget }         from "./widgets/puzzle-widget.js";
import { mountEnginePlayWidget }     from "./widgets/engine-play-widget.js";
import { mountLocalPlayWidget }      from "./widgets/local-play-widget.js";
import { mountFreeViewerWidget }     from "./widgets/free-viewer-widget.js";
import { mountPracticeOpeningWidget } from "./widgets/practice-opening-widget.js";
import { STRINGS } from "./strings.js";
import { escapeHtml } from "./lib/escape.js";

import "./styles/widgets.css";
import "./styles/lpv-overrides.scss";

const MOUNTERS = {
  board:                 (el) => mountBoardWidget(el),
  viewer:                (el) => mountViewerWidget(el),
  puzzle:                (el) => mountPuzzleWidget(el, readPuzzleAttrs(el)),
  engine_play:           (el) => mountEnginePlayWidget(el, readEngineAttrs(el)),
  local_play:            (el) => mountLocalPlayWidget(el, readLocalAttrs(el)),
  free_viewer:           (el) => mountFreeViewerWidget(el, readUrlParams()),
  puzzle_from_url:       (el) => mountPuzzleWidget(el, readPuzzleFromUrl()),
  engine_play_from_url:  (el) => mountEnginePlayWidget(el, readEngineFromUrl()),
  local_play_from_url:   (el) => mountLocalPlayWidget(el, readLocalFromUrl()),
  practice_opening:      (el) => mountPracticeOpeningAsync(el),
};

// Guard against double-mount (e.g. observer firing twice before unobserve).
const mounted = new WeakSet();

/** Inject a skeleton child so the placeholder reserves layout height. */
function injectSkeleton(el) {
  const sk = document.createElement("div");
  sk.className = "chess-widget-skeleton";
  el.appendChild(sk);
}

/**
 * Mount a single placeholder. Called either immediately (fallback) or from the
 * IntersectionObserver callback. Returns true if mounting was attempted.
 */
export function mountSingle(el) {
  if (mounted.has(el)) return false;
  mounted.add(el);

  const mode = el.dataset.mode;
  const mount = MOUNTERS[mode];
  if (!mount) {
    console.warn("[chess-widget] unknown mode:", mode);
    return false;
  }
  try {
    mount(el);
  } catch (err) {
    console.error("[chess-widget] mount failed for", mode, err);
    el.innerHTML = `<div class="chess-widget-error">widget error: ${escapeHtml(err.message)}</div>`;
  }
  return true;
}

export function hydrate() {
  const placeholders = document.querySelectorAll(".chess-widget");

  if (typeof IntersectionObserver === "undefined") {
    // Fallback: mount everything immediately.
    for (const el of placeholders) {
      mountSingle(el);
    }
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        mountSingle(entry.target);
      }
    },
    { rootMargin: "200px 0px" }
  );

  for (const el of placeholders) {
    injectSkeleton(el);
    observer.observe(el);
  }
}

// ─── Attribute parsers ───────────────────────────────────────────────────────

function readPuzzleAttrs(el) {
  const sol = el.dataset.solution || "";
  return {
    fen:      el.dataset.fen || "",
    solution: sol ? sol.split(",").map((s) => s.trim()).filter(Boolean) : [],
    hint:     el.dataset.hint || null,
  };
}

function readEngineAttrs(el) {
  return {
    fen:        el.dataset.fen || null,
    difficulty: el.dataset.difficulty || "intermediate",
    color:      el.dataset.color || "w",
  };
}

function readLocalAttrs(el) {
  return { fen: el.dataset.fen || null };
}

function readUrlParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    fen: p.get("fen") || null,
    pgn: p.get("pgn") || null,
  };
}

function readPuzzleFromUrl() {
  const p = new URLSearchParams(window.location.search);
  const data = p.get("data");
  if (data) {
    try {
      const decoded = JSON.parse(atob(data));
      return {
        fen:      decoded.fen || "",
        solution: decoded.solution || [],
        hint:     decoded.hint || null,
      };
    } catch { /* fall through */ }
  }
  const sol = p.get("solution") || "";
  return {
    fen:      p.get("fen") || "",
    solution: sol ? sol.split(",").map((s) => s.trim()).filter(Boolean) : [],
    hint:     p.get("hint") || null,
  };
}

function readEngineFromUrl() {
  const p = new URLSearchParams(window.location.search);
  return {
    fen:        p.get("fen") || null,
    difficulty: p.get("difficulty") || "intermediate",
    color:      p.get("color") || "w",
  };
}

function readLocalFromUrl() {
  const p = new URLSearchParams(window.location.search);
  return { fen: p.get("fen") || null };
}

// ─── Practice opening (async PGN fetch wrapper) ──────────────────────────────

async function mountPracticeOpeningAsync(el) {
  const pgnUrl = el.dataset.pgnUrl || "";
  const playAs = el.dataset.playAs === "black" ? "black" : "white";
  const nextUrl = el.dataset.nextUrl || "";
  const nextLabel = el.dataset.nextLabel || "";

  // The placeholder needs to be replaced by *something* synchronously so the
  // skeleton goes away while fetch is in flight.
  const wrapper = document.createElement("div");
  wrapper.className = "chess-widget practice-opening-widget";
  wrapper.innerHTML = `<div class="tutorial-widget-loading">${STRINGS.loading}</div>`;
  el.replaceWith(wrapper);

  if (!pgnUrl) {
    wrapper.innerHTML = `<div class="chess-widget-error">${STRINGS.notFound}</div>`;
    return;
  }

  let pgn;
  try {
    const res = await fetch(pgnUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    pgn = await res.text();
  } catch {
    wrapper.innerHTML = `<div class="chess-widget-error">${STRINGS.notFound}: ${escapeHtml(pgnUrl)}</div>`;
    return;
  }

  // Hand back to a fresh placeholder div so the widget can replace it.
  const placeholder = document.createElement("div");
  wrapper.replaceWith(placeholder);
  mountPracticeOpeningWidget(placeholder, { pgn, playAs, nextUrl, nextLabel });
}
