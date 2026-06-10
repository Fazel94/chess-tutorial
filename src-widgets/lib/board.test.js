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

import { Chessground } from "@lichess-org/chessground";
import { Board } from "./board.js";

function makeCgMock(orientation = "white") {
  const mock = {
    set: vi.fn(),
    setAutoShapes: vi.fn(),
    destroy: vi.fn(),
    state: { orientation },
  };
  mock.toggleOrientation = vi.fn(() => {
    mock.state.orientation = mock.state.orientation === "white" ? "black" : "white";
  });
  return mock;
}

function makeBoard() {
  const cgInstance = makeCgMock();
  Chessground.mockReturnValueOnce(cgInstance);
  const container = document.createElement("div");
  const board = new Board(container);
  return { board, cg: cgInstance };
}

describe("Board", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("setPosition(fen) calls _cg.set with fen", () => {
    const { board, cg } = makeBoard();
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    board.setPosition(fen);
    expect(cg.set).toHaveBeenCalledWith({ fen, lastMove: undefined });
  });

  it("setPosition(fen, [from,to]) calls _cg.set with fen and lastMove", () => {
    const { board, cg } = makeBoard();
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    board.setPosition(fen, ["e2", "e4"]);
    expect(cg.set).toHaveBeenCalledWith({ fen, lastMove: ["e2", "e4"] });
  });

  it("setPosition without lastMove passes undefined lastMove", () => {
    const { board, cg } = makeBoard();
    board.setPosition("startpos");
    const call = cg.set.mock.calls[0][0];
    expect(call.lastMove).toBeUndefined();
  });

  it("flip() calls toggleOrientation", () => {
    const { board, cg } = makeBoard();
    board.flip();
    expect(cg.toggleOrientation).toHaveBeenCalledOnce();
  });

  it("orientation() returns 'white' by default", () => {
    const { board } = makeBoard();
    expect(board.orientation()).toBe("white");
  });

  it("orientation() returns 'black' when constructed with orientation 'black'", () => {
    const cgInstance = makeCgMock("black");
    Chessground.mockReturnValueOnce(cgInstance);
    const container = document.createElement("div");
    const board = new Board(container, { orientation: "black" });
    expect(board.orientation()).toBe("black");
  });

  it("orientation() toggles to 'black' after flip()", () => {
    const { board } = makeBoard();
    board.flip();
    expect(board.orientation()).toBe("black");
  });

  it("orientation() toggles back to 'white' after two flips", () => {
    const { board } = makeBoard();
    board.flip();
    board.flip();
    expect(board.orientation()).toBe("white");
  });

  it("disableInput calls set with color: undefined and empty dests", () => {
    const { board, cg } = makeBoard();
    board.disableInput();
    expect(cg.set).toHaveBeenCalledOnce();
    const arg = cg.set.mock.calls[0][0];
    expect(arg.movable.color).toBeUndefined();
    expect(arg.movable.dests).toBeInstanceOf(Map);
    expect(arg.movable.dests.size).toBe(0);
  });

  it("enableInput calls set with correct color and dests for white", () => {
    const { board, cg } = makeBoard();
    const dests = new Map([["e2", ["e3", "e4"]]]);
    const onMove = vi.fn();
    board.enableInput({ color: "w", dests, onMove });
    expect(cg.set).toHaveBeenCalledOnce();
    const arg = cg.set.mock.calls[0][0];
    expect(arg.turnColor).toBe("white");
    expect(arg.movable.color).toBe("white");
    expect(arg.movable.dests).toBe(dests);
  });

  it("enableInput calls set with correct color for black", () => {
    const { board, cg } = makeBoard();
    const dests = new Map();
    const onMove = vi.fn();
    board.enableInput({ color: "b", dests, onMove });
    const arg = cg.set.mock.calls[0][0];
    expect(arg.turnColor).toBe("black");
    expect(arg.movable.color).toBe("black");
  });

  it("enableInput wires onMove callback via movable.events.after", () => {
    const { board, cg } = makeBoard();
    const onMove = vi.fn();
    board.enableInput({ color: "w", dests: new Map(), onMove });
    const arg = cg.set.mock.calls[0][0];
    arg.movable.events.after("e2", "e4");
    expect(onMove).toHaveBeenCalledWith({ from: "e2", to: "e4" });
  });

  it("markSquare calls setAutoShapes with green brush on the given square", () => {
    const { board, cg } = makeBoard();
    board.markSquare("e4");
    expect(cg.setAutoShapes).toHaveBeenCalledWith([{ orig: "e4", brush: "green" }]);
  });

  it("clearMarkers calls setAutoShapes with empty array", () => {
    const { board, cg } = makeBoard();
    board.clearMarkers();
    expect(cg.setAutoShapes).toHaveBeenCalledWith([]);
  });

  it("destroy calls _cg.destroy", () => {
    const { board, cg } = makeBoard();
    board.destroy();
    expect(cg.destroy).toHaveBeenCalledOnce();
  });
});
