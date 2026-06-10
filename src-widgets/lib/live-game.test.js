import { describe, it, expect } from "vitest";
import { LiveGame } from "./live-game.js";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Stalemate: black king on a8, white queen on b6, white king on c6 — black to move, no legal moves
const STALEMATE_FEN = "k7/8/1QK5/8/8/8/8/8 b - - 0 1";

// Scholar's mate sequence: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7#
const SCHOLARS_MATE_MOVES = [
  ["e2", "e4"],
  ["e7", "e5"],
  ["f1", "c4"],
  ["b8", "c6"],
  ["d1", "h5"],
  ["g8", "f6"],
  ["h5", "f7"],
];

function playScholars() {
  const g = new LiveGame();
  for (const [from, to] of SCHOLARS_MATE_MOVES) {
    g.move(from, to);
  }
  return g;
}

describe("LiveGame", () => {
  it("starts at starting position", () => {
    const g = new LiveGame();
    // Compare just the piece placement and active color portions — ignore clock
    expect(g.fen().startsWith("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w")).toBe(true);
  });

  it("makes a legal move and returns Move object", () => {
    const g = new LiveGame();
    const m = g.move("e2", "e4");
    expect(m).not.toBeNull();
    expect(m.from).toBe("e2");
    expect(m.to).toBe("e4");
    expect(m.piece).toBe("p");
  });

  it("returns null for illegal move", () => {
    const g = new LiveGame();
    expect(g.move("e2", "e5")).toBeNull(); // pawn can't jump two squares from e2 to e5
    expect(g.move("a1", "a3")).toBeNull(); // rook blocked
    expect(g.move("e1", "e2")).toBeNull(); // king into own piece
  });

  it("undo returns move and restores position", () => {
    const g = new LiveGame();
    g.move("e2", "e4");
    const fenAfterMove = g.fen();
    const undone = g.undo();
    expect(undone).not.toBeNull();
    expect(undone.from).toBe("e2");
    expect(undone.to).toBe("e4");
    // Position is restored; compare board + active color
    expect(g.fen()).not.toBe(fenAfterMove);
    expect(g.fen().startsWith("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w")).toBe(true);
  });

  it("undo on empty game returns null", () => {
    const g = new LiveGame();
    expect(g.undo()).toBeNull();
  });

  it("allDests returns a Map with legal moves", () => {
    const g = new LiveGame();
    const dests = g.allDests();
    expect(dests).toBeInstanceOf(Map);
    // At start white has 20 legal moves spread across pawn and knight squares
    let total = 0;
    for (const squares of dests.values()) total += squares.length;
    expect(total).toBe(20);
    // e2 pawn can go to e3 or e4
    expect(dests.get("e2")).toContain("e3");
    expect(dests.get("e2")).toContain("e4");
  });

  it("allDests is empty after game over", () => {
    const g = playScholars();
    expect(g.isGameOver()).toBe(true);
    const dests = g.allDests();
    expect(dests.size).toBe(0);
  });

  it("isGameOver false at start", () => {
    const g = new LiveGame();
    expect(g.isGameOver()).toBe(false);
  });

  it("isCheck detects check", () => {
    // After 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 black king is NOT in check — it's after Qh5
    // Use a known check position: after 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7+ (before mate)
    // Scholar's mate sequence minus the last move gives check on f7
    const g = new LiveGame();
    const moves = SCHOLARS_MATE_MOVES.slice(0, 6); // up to ...Nf6
    for (const [from, to] of moves) g.move(from, to);
    // Now play Qxf7+ (check, not yet mate — king can move)
    g.move("h5", "f7");
    // After Qxf7# the game is checkmate, isCheck is true inside checkmate
    expect(g.isCheck()).toBe(true);
  });

  it("isCheckmate detects checkmate", () => {
    const g = playScholars();
    expect(g.isCheckmate()).toBe(true);
    expect(g.isGameOver()).toBe(true);
  });

  it("isDraw detects stalemate/draw", () => {
    const g = new LiveGame(STALEMATE_FEN);
    // In the stalemate FEN black has no legal moves and is not in check
    expect(g.isStalemate()).toBe(true);
    expect(g.isDraw()).toBe(true);
    expect(g.isGameOver()).toBe(true);
  });

  it("turn() returns w at start, b after one move", () => {
    const g = new LiveGame();
    expect(g.turn()).toBe("w");
    g.move("e2", "e4");
    expect(g.turn()).toBe("b");
  });

  it("moveCount increments correctly", () => {
    const g = new LiveGame();
    expect(g.moveCount).toBe(0);
    g.move("e2", "e4");
    expect(g.moveCount).toBe(1);
    g.move("e7", "e5");
    expect(g.moveCount).toBe(2);
    g.undo();
    expect(g.moveCount).toBe(1);
  });

  it("move with promotion piece q/n works", () => {
    // Position with white pawn on e7 ready to promote
    // FEN: white pawn on e7, black king on h8, white king on a1
    const promotionFen = "7k/4P3/8/8/8/8/8/K7 w - - 0 1";
    const g = new LiveGame(promotionFen);

    // Promote to queen
    const mQ = g.move("e7", "e8", "q");
    expect(mQ).not.toBeNull();
    expect(mQ.promotion).toBe("q");

    // Reset and promote to knight
    const g2 = new LiveGame(promotionFen);
    const mN = g2.move("e7", "e8", "n");
    expect(mN).not.toBeNull();
    expect(mN.promotion).toBe("n");
  });

  it("startFen() returns the initial FEN", () => {
    const g = new LiveGame();
    expect(g.startFen()).toBe(g.fen()); // no moves yet, same as current

    // With a custom starting FEN
    const g2 = new LiveGame(STALEMATE_FEN);
    expect(g2.startFen()).toBe(STALEMATE_FEN);

    // After moves, startFen stays pinned to construction-time FEN
    g.move("e2", "e4");
    expect(g.startFen()).not.toBe(g.fen());
  });
});
