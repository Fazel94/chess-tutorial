import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("../lib/engine.js", () => ({
  Engine: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    setDifficulty: vi.fn(),
    getBestMove: vi.fn().mockResolvedValue("e2e4"),
    stop: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock("../lib/sound.js", () => ({
  loadSounds: vi.fn().mockResolvedValue(undefined),
  playMoveSound: vi.fn(),
  playSound: vi.fn(),
}));

vi.mock("../lib/fen-bar.js", () => ({
  createFenBar: vi.fn(() => ({ update: vi.fn(), destroy: vi.fn() })),
}));

vi.mock("../lib/board.js", () => ({
  Board: vi.fn().mockImplementation(() => ({
    enableInput: vi.fn(),
    disableInput: vi.fn(),
    setPosition: vi.fn(),
    flip: vi.fn(),
    destroy: vi.fn(),
    orientation: vi.fn().mockReturnValue("white"),
  })),
}));

vi.mock("../lib/live-game.js", () => ({
  LiveGame: vi.fn().mockImplementation(() => ({
    fen: vi.fn().mockReturnValue("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"),
    turn: vi.fn().mockReturnValue("w"),
    move: vi.fn().mockReturnValue({ san: "e4" }),
    undo: vi.fn(),
    allDests: vi.fn().mockReturnValue(new Map()),
    isGameOver: vi.fn().mockReturnValue(false),
    isCheck: vi.fn().mockReturnValue(false),
    isCheckmate: vi.fn().mockReturnValue(false),
    isStalemate: vi.fn().mockReturnValue(false),
    isDraw: vi.fn().mockReturnValue(false),
    history: vi.fn().mockReturnValue([]),
    moveCount: 0,
    startFen: vi.fn().mockReturnValue(undefined),
  })),
}));

vi.mock("../lib/promotion-overlay.js", () => ({
  getPromotionPiece: vi.fn().mockResolvedValue({ piece: null }),
}));

vi.mock("../lib/move-list.js", () => ({
  createMoveList: vi.fn(() => ({ render: vi.fn(), destroy: vi.fn() })),
}));

vi.mock("../lib/status-text.js", () => ({
  formatStatus: vi.fn().mockReturnValue("نوبت سفید"),
}));

import { mountEnginePlayWidget } from "./engine-play-widget.js";

beforeEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("mountEnginePlayWidget", () => {
  it("replaces placeholder with .engine-play-widget", () => {
    const placeholder = document.createElement("div");
    document.body.appendChild(placeholder);
    mountEnginePlayWidget(placeholder, { fen: null, difficulty: "intermediate", color: "w" });
    expect(document.body.querySelector(".engine-play-widget")).not.toBeNull();
    expect(document.body.contains(placeholder)).toBe(false);
  });

  it("renders difficulty and color selects", () => {
    const placeholder = document.createElement("div");
    document.body.appendChild(placeholder);
    mountEnginePlayWidget(placeholder, { fen: null, difficulty: "beginner", color: "b" });
    const wrapper = document.body.querySelector(".engine-play-widget");
    expect(wrapper.querySelector('[data-ref="difficulty"]')).not.toBeNull();
    expect(wrapper.querySelector('[data-ref="color"]')).not.toBeNull();
  });

  it("renders undo / flip / new-game buttons", () => {
    const placeholder = document.createElement("div");
    document.body.appendChild(placeholder);
    mountEnginePlayWidget(placeholder, { fen: null, difficulty: "intermediate", color: "w" });
    const wrapper = document.body.querySelector(".engine-play-widget");
    expect(wrapper.querySelector('[data-action="undo"]')).not.toBeNull();
    expect(wrapper.querySelector('[data-action="flip"]')).not.toBeNull();
    expect(wrapper.querySelector('[data-action="new-game"]')).not.toBeNull();
  });

  it("new game calls destroy on previous board, fenBar, and moveList", async () => {
    const { Board } = await import("../lib/board.js");
    const { createFenBar } = await import("../lib/fen-bar.js");
    const { createMoveList } = await import("../lib/move-list.js");

    const placeholder = document.createElement("div");
    document.body.appendChild(placeholder);
    mountEnginePlayWidget(placeholder, { fen: null, difficulty: "intermediate", color: "w" });

    // Capture the first instances created during initial render
    const firstBoard    = Board.mock.results[0].value;
    const firstFenBar   = createFenBar.mock.results[0].value;
    const firstMoveList = createMoveList.mock.results[0].value;

    // Trigger a new game (calls render → teardown → destroy on old instances)
    const wrapper = document.body.querySelector(".engine-play-widget");
    wrapper.querySelector('[data-action="new-game"]').click();

    expect(firstBoard.destroy).toHaveBeenCalled();
    expect(firstFenBar.destroy).toHaveBeenCalled();
    expect(firstMoveList.destroy).toHaveBeenCalled();
  });

  it("clicking new-game twice calls Board constructor exactly 3 times (no listener leak)", async () => {
    const { Board } = await import("../lib/board.js");

    const placeholder = document.createElement("div");
    document.body.appendChild(placeholder);
    mountEnginePlayWidget(placeholder, { fen: null, difficulty: "intermediate", color: "w" });

    const wrapper = document.body.querySelector(".engine-play-widget");
    wrapper.querySelector('[data-action="new-game"]').click();
    wrapper.querySelector('[data-action="new-game"]').click();

    // With a leaking click handler, the second click would fire two handlers
    // (one per prior render), causing render() to run twice → Board called 4×.
    // bindOnce ensures one handler total → exactly 3 Board constructions.
    expect(Board).toHaveBeenCalledTimes(3);
  });

  it("loadFen does not enable input before engine move when it is engine's turn", async () => {
    const { Board } = await import("../lib/board.js");
    const { createFenBar } = await import("../lib/fen-bar.js");
    const { Engine } = await import("../lib/engine.js");
    const { LiveGame } = await import("../lib/live-game.js");

    // Make the engine's turn: playerColor = "w", game.turn() = "b"
    LiveGame.mockImplementation(() => ({
      fen: vi.fn().mockReturnValue("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"),
      turn: vi.fn().mockReturnValue("b"),
      move: vi.fn().mockReturnValue({ san: "e5" }),
      undo: vi.fn(),
      allDests: vi.fn().mockReturnValue(new Map()),
      isGameOver: vi.fn().mockReturnValue(false),
      isCheck: vi.fn().mockReturnValue(false),
      isCheckmate: vi.fn().mockReturnValue(false),
      isStalemate: vi.fn().mockReturnValue(false),
      isDraw: vi.fn().mockReturnValue(false),
      history: vi.fn().mockReturnValue([]),
      moveCount: 1,
      startFen: vi.fn().mockReturnValue(undefined),
    }));

    let engineResolve;
    Engine.mockImplementation(() => ({
      init: vi.fn().mockResolvedValue(undefined),
      setDifficulty: vi.fn(),
      getBestMove: vi.fn().mockReturnValue(
        new Promise((res) => { engineResolve = res; })
      ),
      stop: vi.fn(),
      destroy: vi.fn(),
    }));

    const placeholder = document.createElement("div");
    document.body.appendChild(placeholder);
    mountEnginePlayWidget(placeholder, { fen: null, difficulty: "intermediate", color: "w" });

    const boardInstance = Board.mock.results[0].value;

    // Simulate the FEN bar submitting a FEN where it's engine's turn
    const fenBarCb = createFenBar.mock.calls[0][1];
    const loadPromise = fenBarCb.onLoad("some fen");

    // enableInput must NOT have been called yet (engine still thinking)
    expect(boardInstance.enableInput).not.toHaveBeenCalled();

    // Unblock the engine
    engineResolve("e7e5");
    await loadPromise;
  });

});
