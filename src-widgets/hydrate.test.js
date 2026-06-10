import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Style/asset mocks ──────────────────────────────────────────────────────
vi.mock("./styles/widgets.css", () => ({}));
vi.mock("./styles/lpv-overrides.scss", () => ({}));
vi.mock("@lichess-org/chessground/assets/chessground.base.css", () => ({}));
vi.mock("@lichess-org/chessground/assets/chessground.brown.css", () => ({}));
vi.mock("@lichess-org/chessground/assets/chessground.cburnett.css", () => ({}));
vi.mock("../lib/lpv-translate.js", () => ({ translate: {} }));

// ── Widget mounter mocks ───────────────────────────────────────────────────
vi.mock("./widgets/board-widget.js", () => ({ mountBoardWidget: vi.fn() }));
vi.mock("./widgets/viewer-widget.js", () => ({ mountViewerWidget: vi.fn() }));
vi.mock("./widgets/puzzle-widget.js", () => ({ mountPuzzleWidget: vi.fn() }));
vi.mock("./widgets/engine-play-widget.js", () => ({ mountEnginePlayWidget: vi.fn() }));
vi.mock("./widgets/local-play-widget.js", () => ({ mountLocalPlayWidget: vi.fn() }));
vi.mock("./widgets/free-viewer-widget.js", () => ({ mountFreeViewerWidget: vi.fn() }));

// ── Imports (after mocks are hoisted) ─────────────────────────────────────
import { hydrate, mountSingle } from "./hydrate.js";
import { mountBoardWidget } from "./widgets/board-widget.js";
import { mountViewerWidget } from "./widgets/viewer-widget.js";
import { mountPuzzleWidget } from "./widgets/puzzle-widget.js";
import { mountEnginePlayWidget } from "./widgets/engine-play-widget.js";
import { mountLocalPlayWidget } from "./widgets/local-play-widget.js";
import { mountFreeViewerWidget } from "./widgets/free-viewer-widget.js";

// ── IntersectionObserver mock factory ─────────────────────────────────────
/**
 * Install a controllable IntersectionObserver mock on `globalThis`.
 * Returns { fireEntries, observedEls, unobservedEls }.
 *   fireEntries(entries) → drives the captured callback.
 */
function installMockObserver() {
  let capturedCallback = null;
  const observedEls = [];
  const unobservedEls = [];

  const MockIO = vi.fn((callback) => {
    capturedCallback = callback;
    return {
      observe: vi.fn((el) => observedEls.push(el)),
      unobserve: vi.fn((el) => unobservedEls.push(el)),
      disconnect: vi.fn(),
    };
  });

  globalThis.IntersectionObserver = MockIO;

  return {
    fireEntries: (entries) => {
      if (!capturedCallback) throw new Error("IntersectionObserver callback not captured");
      capturedCallback(entries);
    },
    observedEls,
    unobservedEls,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function makePlaceholder(mode = "board") {
  const el = document.createElement("div");
  el.className = "chess-widget";
  el.dataset.mode = mode;
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
  // Restore IntersectionObserver between tests (some tests delete it).
  // Set a safe no-op so tests that install their own mock start fresh.
  delete globalThis.IntersectionObserver;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("hydrate() — lazy path (IntersectionObserver available)", () => {
  it("does not call any mounter synchronously on hydrate()", () => {
    const { observedEls } = installMockObserver();
    const el1 = makePlaceholder("board");
    const el2 = makePlaceholder("viewer");

    hydrate();

    // No mounter called yet.
    expect(mountBoardWidget).not.toHaveBeenCalled();
    expect(mountViewerWidget).not.toHaveBeenCalled();
    // Both elements are being observed.
    expect(observedEls).toContain(el1);
    expect(observedEls).toContain(el2);
  });

  it("calls the mounter for an element when the observer fires isIntersecting", () => {
    const { fireEntries } = installMockObserver();
    const el1 = makePlaceholder("board");
    const el2 = makePlaceholder("board");

    hydrate();

    // Fire intersection for el1 only.
    fireEntries([{ isIntersecting: true, target: el1 }]);

    expect(mountBoardWidget).toHaveBeenCalledTimes(1);
    expect(mountBoardWidget).toHaveBeenCalledWith(el1);
    // el2 not yet mounted.
    const calls = mountBoardWidget.mock.calls.map((c) => c[0]);
    expect(calls).not.toContain(el2);
  });

  it("does not re-mount an element when the observer fires a second time", () => {
    const { fireEntries } = installMockObserver();
    const el = makePlaceholder("board");

    hydrate();

    fireEntries([{ isIntersecting: true, target: el }]);
    // Fire again (guard should block it).
    fireEntries([{ isIntersecting: true, target: el }]);

    expect(mountBoardWidget).toHaveBeenCalledTimes(1);
  });

  it("ignores entries where isIntersecting is false", () => {
    const { fireEntries } = installMockObserver();
    const el = makePlaceholder("board");

    hydrate();

    fireEntries([{ isIntersecting: false, target: el }]);

    expect(mountBoardWidget).not.toHaveBeenCalled();
  });

  it("injects a skeleton child into each placeholder before mount", () => {
    const { fireEntries } = installMockObserver();
    const el = makePlaceholder("board");

    hydrate();

    // Skeleton is present before intersection fires.
    expect(el.querySelector(".chess-widget-skeleton")).not.toBeNull();

    fireEntries([{ isIntersecting: true, target: el }]);
    // After mount, mountBoardWidget called (it would call replaceWith in real code;
    // here the spy doesn't — that's OK, we're testing dispatch not DOM teardown).
    expect(mountBoardWidget).toHaveBeenCalledWith(el);
  });
});

describe("hydrate() — fallback path (IntersectionObserver undefined)", () => {
  it("mounts all placeholders immediately when IntersectionObserver is absent", () => {
    // Ensure IntersectionObserver is absent (deleted in beforeEach; confirm here).
    expect(globalThis.IntersectionObserver).toBeUndefined();

    const el1 = makePlaceholder("board");
    const el2 = makePlaceholder("viewer");

    hydrate();

    expect(mountBoardWidget).toHaveBeenCalledWith(el1);
    expect(mountViewerWidget).toHaveBeenCalledWith(el2);
  });
});
