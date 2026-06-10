import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountViewerWidget } from "./viewer-widget.js";

vi.mock("@lichess-org/pgn-viewer", () => ({
  default: vi.fn((el, opts) => {
    // Simulate LPV mounting a moves panel so attachMobileComment can observe it
    const movesEl = document.createElement("div");
    movesEl.className = "lpv__moves";
    el.appendChild(movesEl);
    return {
      node:     { data: { fen: opts.fen || "startpos" } },
      goTo:     vi.fn(),
      toPath:   vi.fn(),
      flip:     vi.fn(),
      curData:  vi.fn(() => ({ ply: 0, san: undefined, comments: [], turn: "white" })),
    };
  }),
}));

vi.mock("@lichess-org/chessground/assets/chessground.base.css", () => ({}));
vi.mock("@lichess-org/chessground/assets/chessground.brown.css", () => ({}));
vi.mock("@lichess-org/chessground/assets/chessground.cburnett.css", () => ({}));

vi.mock("../lib/sound.js", () => ({
  loadSounds: vi.fn(() => Promise.resolve()),
  playSoundForSan: vi.fn(),
}));

beforeEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("mountViewerWidget", () => {
  it("replaces placeholder with .tutorial-viewer-widget", async () => {
    const placeholder = document.createElement("div");
    placeholder.dataset.pgn = "1.e4 e5 2.Nf3 Nc6 *";
    document.body.appendChild(placeholder);

    await mountViewerWidget(placeholder);

    expect(document.body.querySelector(".tutorial-viewer-widget")).not.toBeNull();
    expect(document.body.contains(placeholder)).toBe(false);
  });

  it("shows error when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const placeholder = document.createElement("div");
    placeholder.dataset.pgnUrl = "/some/pgn";
    document.body.appendChild(placeholder);

    await mountViewerWidget(placeholder);

    const wrapper = document.body.querySelector(".tutorial-viewer-widget");
    expect(wrapper).not.toBeNull();
    expect(wrapper.querySelector(".tutorial-widget-error")).not.toBeNull();
  });

  it("creates viewer group for multi-game PGN", async () => {
    // splitPgn splits on /(?=\n\[Event )/ so the second game needs a leading newline
    const multiPgn = '[Event "G1"]\n1.e4 e5 *\n\n[Event "G2"]\n1.d4 d5 *';

    const placeholder = document.createElement("div");
    placeholder.dataset.pgn = multiPgn;
    document.body.appendChild(placeholder);

    await mountViewerWidget(placeholder);

    const group = document.body.querySelector(".tutorial-viewer-group");
    expect(group).not.toBeNull();
    expect(group.querySelectorAll(".tutorial-viewer-widget").length).toBe(2);
  });

  it("appends .lpv__mobile-comment to the LPV element", async () => {
    const placeholder = document.createElement("div");
    placeholder.dataset.pgn = "1.e4 e5 *";
    document.body.appendChild(placeholder);

    await mountViewerWidget(placeholder);

    const card = document.body.querySelector(".lpv__mobile-comment");
    expect(card).not.toBeNull();
    expect(card.querySelector(".lpv__mobile-comment__move")).not.toBeNull();
    expect(card.querySelector(".lpv__mobile-comment__text")).not.toBeNull();
    // Initial position: no san → card should be empty-state
    expect(card.classList.contains("is-empty")).toBe(true);
  });

  it("calling viewer.goTo triggers a mobile comment refresh", async () => {
    const LPV = await import("@lichess-org/pgn-viewer");

    const placeholder = document.createElement("div");
    placeholder.dataset.pgn = "1.e4 e5 *";
    document.body.appendChild(placeholder);

    await mountViewerWidget(placeholder);

    // The viewer instance returned by the mock
    const viewer = LPV.default.mock.results[0].value;
    const callsBefore = viewer.curData.mock.calls.length;

    // Call the wrapped goTo — should call origGoTo AND refresh()
    viewer.goTo("next");

    expect(viewer.curData.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("calling viewer.toPath triggers a mobile comment refresh", async () => {
    const LPV = await import("@lichess-org/pgn-viewer");

    const placeholder = document.createElement("div");
    placeholder.dataset.pgn = "1.e4 e5 *";
    document.body.appendChild(placeholder);

    await mountViewerWidget(placeholder);

    const viewer = LPV.default.mock.results[0].value;
    const callsBefore = viewer.curData.mock.calls.length;

    viewer.toPath("some-path");

    expect(viewer.curData.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("plays a move sound when navigating to a move with a SAN", async () => {
    const LPV   = await import("@lichess-org/pgn-viewer");
    const sound = await import("../lib/sound.js");

    const placeholder = document.createElement("div");
    placeholder.dataset.pgn = "1.e4 e5 2.Nf3 *";
    document.body.appendChild(placeholder);

    await mountViewerWidget(placeholder);

    const viewer = LPV.default.mock.results[0].value;
    viewer.curData.mockReturnValue({ ply: 3, san: "Nf3", comments: [] });
    sound.playSoundForSan.mockClear();

    viewer.goTo("next");

    expect(sound.playSoundForSan).toHaveBeenCalledWith("Nf3");
  });

  it("stays silent when navigating to the start position (no SAN)", async () => {
    const LPV   = await import("@lichess-org/pgn-viewer");
    const sound = await import("../lib/sound.js");

    const placeholder = document.createElement("div");
    placeholder.dataset.pgn = "1.e4 e5 *";
    document.body.appendChild(placeholder);

    await mountViewerWidget(placeholder);

    const viewer = LPV.default.mock.results[0].value;
    viewer.curData.mockReturnValue({ ply: 0, san: undefined, comments: [] });
    sound.playSoundForSan.mockClear();

    viewer.goTo("first");

    expect(sound.playSoundForSan).not.toHaveBeenCalled();
  });
});
