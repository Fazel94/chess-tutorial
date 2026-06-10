import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mountPracticeOpeningWidget,
  parsePgnMainline,
} from "./practice-opening-widget.js";

// ── Capture the constructor opts so tests can drive onMove directly ──
let lastBoardOpts = null;
const boardInstance = {
  set: vi.fn(),
  toggleOrientation: vi.fn(),
  setAutoShapes: vi.fn(),
  destroy: vi.fn(),
};

vi.mock("@lichess-org/chessground", () => ({
  Chessground: vi.fn((_el, opts) => {
    lastBoardOpts = opts;
    return boardInstance;
  }),
}));
vi.mock("@lichess-org/chessground/assets/chessground.base.css", () => ({}));
vi.mock("@lichess-org/chessground/assets/chessground.brown.css", () => ({}));
vi.mock("@lichess-org/chessground/assets/chessground.cburnett.css", () => ({}));

vi.mock("../lib/fen-bar.js", () => ({
  createFenBar: vi.fn(() => ({ update: vi.fn() })),
}));

vi.mock("../lib/promotion-overlay.js", () => ({
  getPromotionPiece: vi.fn().mockResolvedValue({ piece: null }),
}));

vi.mock("../lib/sound.js", () => ({
  playMoveSound: vi.fn(),
}));

const ITALIAN_PGN = `[Event "Italian"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *`;
const ANNOTATED_PGN = `[Event "Italian"]\n\n1. e4 {control the center} e5 {symmetric reply} 2. Nf3 {develop with tempo} Nc6 *`;

beforeEach(() => {
  document.body.innerHTML = "";
  lastBoardOpts = null;
  vi.clearAllMocks();
});

/**
 * Pull `movable.events.after(from, to)` out of the most recent Board call.
 * Returns null when input hasn't been enabled.
 */
function getOnMove() {
  const calls = boardInstance.set.mock.calls;
  for (let i = calls.length - 1; i >= 0; i--) {
    const after = calls[i][0]?.movable?.events?.after;
    if (typeof after === "function") {
      return (from, to) => after(from, to);
    }
  }
  return null;
}

describe("parsePgnMainline", () => {
  it("returns null on empty PGN", () => {
    expect(parsePgnMainline("")).toBeNull();
    expect(parsePgnMainline(null)).toBeNull();
  });

  it("extracts mainline UCI + SAN from a tagged PGN", () => {
    const parsed = parsePgnMainline(ITALIAN_PGN);
    expect(parsed).not.toBeNull();
    expect(parsed.line).toHaveLength(6);
    expect(parsed.line[0]).toMatchObject({ from: "e2", to: "e4", san: "e4" });
    expect(parsed.line[1]).toMatchObject({ from: "e7", to: "e5", san: "e5" });
    expect(parsed.line[5]).toMatchObject({ from: "f8", to: "c5", san: "Bc5" });
  });

  it("honours [FEN ...] header", () => {
    const pgn = `[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]\n\n1. e4 *`;
    const parsed = parsePgnMainline(pgn);
    expect(parsed.startFen.startsWith("rnbqkbnr")).toBe(true);
  });

  it("attaches per-move comments keyed to the move that precedes them", () => {
    const parsed = parsePgnMainline(ANNOTATED_PGN);
    expect(parsed.line[0]).toMatchObject({ san: "e4", comment: "control the center" });
    expect(parsed.line[1]).toMatchObject({ san: "e5", comment: "symmetric reply" });
    expect(parsed.line[2]).toMatchObject({ san: "Nf3", comment: "develop with tempo" });
    expect(parsed.line[3].comment).toBe(""); // Nc6 has no comment
  });
});

describe("mountPracticeOpeningWidget", () => {
  it("replaces placeholder with .practice-opening-widget", () => {
    const ph = document.createElement("div");
    document.body.appendChild(ph);

    mountPracticeOpeningWidget(ph, { pgn: ITALIAN_PGN, playAs: "white" });

    expect(document.body.querySelector(".practice-opening-widget")).not.toBeNull();
    expect(document.body.contains(ph)).toBe(false);
  });

  it("renders hint, retry, flip buttons", () => {
    const ph = document.createElement("div");
    document.body.appendChild(ph);

    mountPracticeOpeningWidget(ph, { pgn: ITALIAN_PGN, playAs: "white" });
    const wrapper = document.body.querySelector(".practice-opening-widget");

    expect(wrapper.querySelector('[data-action="hint"]')).not.toBeNull();
    expect(wrapper.querySelector('[data-action="reset"]')).not.toBeNull();
    expect(wrapper.querySelector('[data-action="flip"]')).not.toBeNull();
  });

  it("shows error when PGN is empty / unparseable", () => {
    const ph = document.createElement("div");
    document.body.appendChild(ph);

    mountPracticeOpeningWidget(ph, { pgn: "", playAs: "white" });

    expect(ph.querySelector(".puzzle-error")).not.toBeNull();
    expect(ph.classList.contains("chess-widget-error")).toBe(true);
  });

  it("enables input for the user on mount when playAs=white", () => {
    const ph = document.createElement("div");
    document.body.appendChild(ph);

    mountPracticeOpeningWidget(ph, { pgn: ITALIAN_PGN, playAs: "white" });

    // Board was constructed; input enabled via second .set call carrying movable.
    // We inspect the most recent set() that has movable.color === "white".
    const calls = boardInstance.set.mock.calls;
    const lastEnable = [...calls].reverse().find(
      (c) => c[0]?.movable?.color
    );
    expect(lastEnable?.[0].movable.color).toBe("white");
  });

  it("auto-plays the opening book move when playAs=black", async () => {
    const ph = document.createElement("div");
    document.body.appendChild(ph);

    vi.useFakeTimers();
    mountPracticeOpeningWidget(ph, { pgn: ITALIAN_PGN, playAs: "black" });

    // Fast-forward the 400 ms book-move delay.
    await vi.advanceTimersByTimeAsync(500);
    vi.useRealTimers();

    // After the opening move 1.e4, the position FEN should reflect white's pawn on e4.
    // The Board.setPosition(...) path calls _cg.set with { fen: ..., lastMove: ["e2","e4"] }.
    const calls = boardInstance.set.mock.calls;
    const moved = calls.find((c) => c[0]?.lastMove?.[0] === "e2" && c[0]?.lastMove?.[1] === "e4");
    expect(moved).toBeDefined();
  });

  it("flashes practice-wrong and snaps back on a wrong user move", async () => {
    const ph = document.createElement("div");
    document.body.appendChild(ph);

    mountPracticeOpeningWidget(ph, { pgn: ITALIAN_PGN, playAs: "white" });
    const onMove = getOnMove();
    expect(typeof onMove).toBe("function");

    // Book wants 1.e4; play 1.a3 instead.
    await onMove("a2", "a3");

    const status = document.body.querySelector(".practice-status");
    expect(status.classList.contains("practice-wrong")).toBe(true);
    expect(status.textContent).toContain("e4"); // expected SAN surfaced
  });

  it("marks .practice-complete after the user finishes the line", async () => {
    // Use a tiny 2-ply line so we can drive it through quickly.
    const shortPgn = `[Event "tiny"]\n\n1. e4 e5 *`;
    const ph = document.createElement("div");
    document.body.appendChild(ph);

    vi.useFakeTimers();
    mountPracticeOpeningWidget(ph, { pgn: shortPgn, playAs: "white" });

    // 1. e4 (user)
    let onMove = getOnMove();
    await onMove("e2", "e4");

    // Opponent's 1...e5 is scheduled at 400 ms
    await vi.advanceTimersByTimeAsync(500);
    vi.useRealTimers();

    const status = document.body.querySelector(".practice-status");
    expect(status.classList.contains("practice-complete")).toBe(true);
  });

  it("does not render a next link when no nextUrl is given", () => {
    const ph = document.createElement("div");
    document.body.appendChild(ph);
    mountPracticeOpeningWidget(ph, { pgn: ITALIAN_PGN, playAs: "white" });
    expect(document.body.querySelector(".practice-next")).toBeNull();
  });

  it("renders the next link hidden, then shows it on completion", async () => {
    const ph = document.createElement("div");
    document.body.appendChild(ph);
    // One user ply so completion happens immediately after the move.
    mountPracticeOpeningWidget(ph, {
      pgn: `[Event "tiny"]\n\n1. e4 *`,
      playAs: "white",
      nextUrl: "/play/",
      nextLabel: "ادامه بده",
    });

    const link = document.body.querySelector(".practice-next");
    expect(link).not.toBeNull();
    expect(link.getAttribute("href")).toBe("/play/");
    expect(link.textContent).toBe("ادامه بده");
    expect(link.hidden).toBe(true);

    await getOnMove()("e2", "e4");
    expect(link.hidden).toBe(false);
  });

  it("shows the move counter and updates it as moves are played", async () => {
    const ph = document.createElement("div");
    document.body.appendChild(ph);
    mountPracticeOpeningWidget(ph, { pgn: ANNOTATED_PGN, playAs: "white" });

    const counter = document.body.querySelector(".practice-move-counter");
    expect(counter).not.toBeNull();
    expect(counter.textContent).toBe("حرکت ۰ از ۴"); // nothing played yet, 4 plies total

    await getOnMove()("e2", "e4");
    // After e4 (1 ply) the counter reflects completed plies (jumps once opponent replies too)
    expect(counter.textContent).toMatch(/از ۴$/);
    expect(counter.textContent).not.toBe("حرکت ۰ از ۴");
  });

  it("shows the Farsi/why annotation for the move just played", async () => {
    const ph = document.createElement("div");
    document.body.appendChild(ph);
    mountPracticeOpeningWidget(ph, { pgn: ANNOTATED_PGN, playAs: "white" });

    const note = document.body.querySelector(".practice-annotation-text");
    expect(note).not.toBeNull();
    expect(note.textContent).toBe(""); // nothing played yet

    await getOnMove()("e2", "e4");
    // The user's e4 comment, or the auto-played e5 comment, is now shown.
    expect(["control the center", "symmetric reply"]).toContain(note.textContent);
  });

  it("clears the annotation on reset", async () => {
    const ph = document.createElement("div");
    document.body.appendChild(ph);
    mountPracticeOpeningWidget(ph, { pgn: ANNOTATED_PGN, playAs: "white" });
    await getOnMove()("e2", "e4");
    const note = document.body.querySelector(".practice-annotation-text");
    expect(note.textContent).not.toBe("");

    document.body.querySelector('[data-action="reset"]').click();
    expect(note.textContent).toBe("");
  });
});

describe("shipped practice PGNs", () => {
  const { readFileSync } = require("node:fs");
  const files = [
    "italian-mainline.pgn",
    "ruy-lopez-mainline.pgn",
    "sicilian-basic.pgn",
    "italian-bd2.pgn",
    "italian-two-knights.pgn",
  ];

  it.each(files)("%s parses with a comment on every move", (file) => {
    const pgn = readFileSync(`course/docs/practice/pgn/${file}`, "utf8");
    const parsed = parsePgnMainline(pgn);
    expect(parsed).not.toBeNull();
    expect(parsed.line.length).toBeGreaterThan(0);
    for (const move of parsed.line) {
      expect(typeof move.comment).toBe("string");
      expect(move.comment.length).toBeGreaterThan(0);
    }
  });
});
