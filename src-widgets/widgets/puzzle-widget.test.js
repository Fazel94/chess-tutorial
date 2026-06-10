import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountPuzzleWidget } from "./puzzle-widget.js";

vi.mock("@lichess-org/chessground", () => ({
  Chessground: vi.fn(() => ({
    set: vi.fn(),
    toggleOrientation: vi.fn(),
    setAutoShapes: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock("@lichess-org/chessground/assets/chessground.base.css", () => ({}));
vi.mock("@lichess-org/chessground/assets/chessground.brown.css", () => ({}));
vi.mock("@lichess-org/chessground/assets/chessground.cburnett.css", () => ({}));

vi.mock("../lib/fen-bar.js", () => ({
  createFenBar: vi.fn(() => ({ update: vi.fn() })),
}));

vi.mock("../lib/promotion-overlay.js", () => ({
  promptPromotion: vi.fn().mockResolvedValue("q"),
  isPromotionMove: vi.fn().mockReturnValue(false),
  getPromotionPiece: vi.fn().mockResolvedValue({ cancelled: false, piece: null }),
}));

vi.mock("../lib/sound.js", () => ({
  loadSounds: vi.fn(() => Promise.resolve()),
  playMoveSound: vi.fn(),
  playSound: vi.fn(),
}));

const VALID_FEN =
  "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";

beforeEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

// Grab the latest chessground `movable.events.after` callback so tests can
// simulate a user move (chessground commits the move before firing it).
async function latestAfter() {
  const { Chessground } = await import("@lichess-org/chessground");
  const cg = Chessground.mock.results.at(-1).value;
  let after = null;
  for (const call of cg.set.mock.calls) {
    const fn = call[0]?.movable?.events?.after;
    if (fn) after = fn;
  }
  return after;
}

describe("mountPuzzleWidget", () => {
  it("replaces placeholder with .puzzle-widget wrapper", () => {
    const placeholder = document.createElement("div");
    placeholder.dataset.fen = VALID_FEN;
    document.body.appendChild(placeholder);

    mountPuzzleWidget(placeholder, {
      fen: VALID_FEN,
      solution: ["f1e1"],
      hint: null,
    });

    expect(document.body.querySelector(".puzzle-widget")).not.toBeNull();
    expect(document.body.contains(placeholder)).toBe(false);
  });

  it("shows error for empty solution", () => {
    const placeholder = document.createElement("div");
    document.body.appendChild(placeholder);

    mountPuzzleWidget(placeholder, { fen: "", solution: [], hint: null });

    expect(placeholder.querySelector(".puzzle-error")).not.toBeNull();
  });

  it("renders hint button when hint is provided", () => {
    const placeholder = document.createElement("div");
    document.body.appendChild(placeholder);

    mountPuzzleWidget(placeholder, {
      fen: VALID_FEN,
      solution: ["f1e1"],
      hint: "move the bishop",
    });

    const wrapper = document.body.querySelector(".puzzle-widget");
    expect(wrapper.querySelector('[data-action="hint"]')).not.toBeNull();
  });
});

describe("puzzle sounds", () => {
  function mount(solution) {
    const placeholder = document.createElement("div");
    document.body.appendChild(placeholder);
    mountPuzzleWidget(placeholder, { fen: VALID_FEN, solution, hint: null });
    return placeholder;
  }

  it("loads the sound sprite on mount", async () => {
    const sound = await import("../lib/sound.js");
    mount(["d2d3"]);
    expect(sound.loadSounds).toHaveBeenCalled();
  });

  it("plays a move sound for a correct move", async () => {
    const sound = await import("../lib/sound.js");
    mount(["d2d3", "d7d6"]);
    const after = await latestAfter();
    await after("d2", "d3");
    expect(sound.playMoveSound).toHaveBeenCalled();
  });

  it("plays the wrong-move sound on an incorrect move", async () => {
    const sound = await import("../lib/sound.js");
    mount(["d2d3"]);
    const after = await latestAfter();
    await after("a2", "a3"); // legal, but not the solution move
    expect(sound.playSound).toHaveBeenCalledWith("wrongMove");
  });

  it("plays the won sound when the puzzle is solved", async () => {
    const sound = await import("../lib/sound.js");
    mount(["d2d3"]);
    const after = await latestAfter();
    await after("d2", "d3");
    expect(sound.playSound).toHaveBeenCalledWith("gameWon");
  });
  it("passes a promotion move (flag p) to the sound layer", async () => {
    const sound = await import("../lib/sound.js");
    const placeholder = document.createElement("div");
    document.body.appendChild(placeholder);
    // White pawn on a7 promotes; kings tucked away so it is a quiet promotion.
    mountPuzzleWidget(placeholder, {
      fen: "7k/P7/8/8/8/8/8/7K w - - 0 1",
      solution: ["a7a8q"],
      hint: null,
    });
    const after = await latestAfter();
    await after("a7", "a8");
    expect(sound.playMoveSound).toHaveBeenCalled();
    const move = sound.playMoveSound.mock.calls[0][1];
    expect(move.flags).toContain("p"); // chess.js flags a promotion with "p"
  });
});
