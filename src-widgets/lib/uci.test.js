import { describe, it, expect } from "vitest";
import { parseUci } from "./uci.js";

describe("parseUci", () => {
  it("parses a normal pawn move", () => {
    expect(parseUci("e2e4")).toEqual({ from: "e2", to: "e4", promotion: undefined });
  });

  it("parses a normal piece move", () => {
    expect(parseUci("g1f3")).toEqual({ from: "g1", to: "f3", promotion: undefined });
  });

  it("parses a promotion move (queen)", () => {
    expect(parseUci("e7e8q")).toEqual({ from: "e7", to: "e8", promotion: "q" });
  });

  it("parses a promotion move (knight)", () => {
    expect(parseUci("a2a1n")).toEqual({ from: "a2", to: "a1", promotion: "n" });
  });

  it("parses a promotion move (rook)", () => {
    expect(parseUci("h7h8r")).toEqual({ from: "h7", to: "h8", promotion: "r" });
  });

  it("parses a promotion move (bishop)", () => {
    expect(parseUci("b7b8b")).toEqual({ from: "b7", to: "b8", promotion: "b" });
  });

  it("returns undefined promotion for a 4-character move", () => {
    const result = parseUci("d1d8");
    expect(result.promotion).toBeUndefined();
  });
});
