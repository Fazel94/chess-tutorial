import { describe, it, expect } from "vitest";
import { formatStatus } from "./status-text.js";
import { STRINGS } from "../strings.js";

describe("formatStatus", () => {
  // ── Checkmate ─────────────────────────────────────────────────────────────
  // When turn=w, white is in checkmate ⇒ black wins.
  it("checkmate: turn=w → black wins", () => {
    const result = formatStatus({ turn: "w", isCheckmate: true });
    expect(result).toBe(`${STRINGS.checkmate} — ${STRINGS.black}`);
  });

  // When turn=b, black is in checkmate ⇒ white wins.
  it("checkmate: turn=b → white wins", () => {
    const result = formatStatus({ turn: "b", isCheckmate: true });
    expect(result).toBe(`${STRINGS.checkmate} — ${STRINGS.white}`);
  });

  // ── Stalemate ─────────────────────────────────────────────────────────────
  it("stalemate (turn=w)", () => {
    const result = formatStatus({ turn: "w", isStalemate: true });
    expect(result).toBe(STRINGS.stalemate);
    expect(result.length).toBeGreaterThan(0);
  });

  it("stalemate (turn=b)", () => {
    const result = formatStatus({ turn: "b", isStalemate: true });
    expect(result).toBe(STRINGS.stalemate);
  });

  // ── Draw ──────────────────────────────────────────────────────────────────
  it("draw (turn=w)", () => {
    const result = formatStatus({ turn: "w", isDraw: true });
    expect(result).toBe(STRINGS.draw);
    expect(result.length).toBeGreaterThan(0);
  });

  it("draw (turn=b)", () => {
    const result = formatStatus({ turn: "b", isDraw: true });
    expect(result).toBe(STRINGS.draw);
  });

  // ── Check ─────────────────────────────────────────────────────────────────
  it("check: turn=w (white to move, in check)", () => {
    const result = formatStatus({ turn: "w", isCheck: true });
    expect(result).toBe(`${STRINGS.check} — ${STRINGS.whiteToMove}`);
    expect(result.length).toBeGreaterThan(0);
  });

  it("check: turn=b (black to move, in check)", () => {
    const result = formatStatus({ turn: "b", isCheck: true });
    expect(result).toBe(`${STRINGS.check} — ${STRINGS.blackToMove}`);
  });

  // ── Plain to-move ─────────────────────────────────────────────────────────
  it("plain white to move", () => {
    const result = formatStatus({ turn: "w" });
    expect(result).toBe(STRINGS.whiteToMove);
    expect(result.length).toBeGreaterThan(0);
  });

  it("plain black to move", () => {
    const result = formatStatus({ turn: "b" });
    expect(result).toBe(STRINGS.blackToMove);
    expect(result.length).toBeGreaterThan(0);
  });

  // ── Viewer mode (cursor + moveCount) ─────────────────────────────────────
  it("viewer mode: turn=w includes move counter", () => {
    // cursor=1 (0-based) → display index 2; moveCount=10
    const result = formatStatus({ turn: "w", cursor: 1, moveCount: 10 });
    expect(result).toBe(`${STRINGS.whiteToMove} — ${STRINGS.moveN(2)} / 10`);
    expect(result.length).toBeGreaterThan(0);
  });

  it("viewer mode: turn=b includes move counter", () => {
    const result = formatStatus({ turn: "b", cursor: 3, moveCount: 8 });
    expect(result).toBe(`${STRINGS.blackToMove} — ${STRINGS.moveN(4)} / 8`);
  });

  it("viewer mode: cursor=-1 shows move 0 (before game start)", () => {
    // cursor=-1 → cursor+1=0, so moveN(0)
    const result = formatStatus({ turn: "w", cursor: -1, moveCount: 5 });
    expect(result).toBe(`${STRINGS.whiteToMove} — ${STRINGS.moveN(0)} / 5`);
  });

  it("viewer mode: skipped when moveCount=0", () => {
    // moveCount=0 ⇒ condition is false, falls through to plain side label
    const result = formatStatus({ turn: "w", cursor: 0, moveCount: 0 });
    expect(result).toBe(STRINGS.whiteToMove);
  });

  it("viewer mode: skipped when cursor is missing", () => {
    const result = formatStatus({ turn: "b", moveCount: 10 });
    expect(result).toBe(STRINGS.blackToMove);
  });

  // ── Terminal states take priority over non-terminal flags ─────────────────
  it("checkmate takes priority over check flag", () => {
    const result = formatStatus({ turn: "w", isCheckmate: true, isCheck: true });
    expect(result).toBe(`${STRINGS.checkmate} — ${STRINGS.black}`);
  });

  it("stalemate takes priority over draw flag", () => {
    const result = formatStatus({ turn: "w", isStalemate: true, isDraw: true });
    expect(result).toBe(STRINGS.stalemate);
  });
});
