import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isPromotionMove, promptPromotion, getPromotionPiece } from "./promotion-overlay.js";

// ── isPromotionMove ───────────────────────────────────────────────────────────

describe("isPromotionMove", () => {
  it("white pawn e7→e8 is promotion", () => {
    expect(isPromotionMove("e7", "e8", "w")).toBe(true);
  });

  it("white pawn e2→e4 is not promotion", () => {
    expect(isPromotionMove("e2", "e4", "w")).toBe(false);
  });

  it("black pawn e2→e1 is promotion", () => {
    expect(isPromotionMove("e2", "e1", "b")).toBe(true);
  });

  it("black pawn e7→e5 is not promotion", () => {
    expect(isPromotionMove("e7", "e5", "b")).toBe(false);
  });

  it("non-pawn moves are not promotion (turn check only)", () => {
    // A rook on e1 moving to e8 — no pawn-rank constraint met for white (fromRank=1≠7)
    expect(isPromotionMove("e1", "e8", "w")).toBe(false);
    // Queen on h8 moving anywhere — fromRank=8≠7
    expect(isPromotionMove("h8", "a8", "w")).toBe(false);
  });
});

// ── promptPromotion ───────────────────────────────────────────────────────────

function makeBoard() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const boardEl = document.createElement("div");
  boardEl.style.width = "400px";
  boardEl.style.height = "400px";
  // getBoundingClientRect is stubbed because happy-dom returns zeros for
  // elements that are not actually laid out in a real browser viewport.
  boardEl.getBoundingClientRect = () => ({
    width: 400, height: 400, top: 0, left: 0, bottom: 400, right: 400,
  });
  container.appendChild(boardEl);

  return { container, boardEl };
}

function teardown(container) {
  container.remove();
}

describe("promptPromotion", () => {
  it("resolves with 'q' when queen piece is clicked", async () => {
    const { container, boardEl } = makeBoard();

    const promise = promptPromotion(boardEl, "e8", "w", "white");

    // Overlay is appended to boardEl.parentElement (container).
    const overlay = container.querySelector(".chess-promotion-overlay");
    expect(overlay).toBeTruthy();

    const queen = overlay.querySelector("piece.white.queen");
    expect(queen).toBeTruthy();
    queen.click();

    const result = await promise;
    expect(result).toBe("q");

    teardown(container);
  });

  it("resolves with 'r' when rook piece is clicked", async () => {
    const { container, boardEl } = makeBoard();

    const promise = promptPromotion(boardEl, "a8", "w", "white");

    const overlay = container.querySelector(".chess-promotion-overlay");
    const rook = overlay.querySelector("piece.white.rook");
    expect(rook).toBeTruthy();
    rook.click();

    expect(await promise).toBe("r");
    teardown(container);
  });

  it("resolves with correct piece for black (bishop)", async () => {
    const { container, boardEl } = makeBoard();

    const promise = promptPromotion(boardEl, "d1", "b", "white");

    const overlay = container.querySelector(".chess-promotion-overlay");
    const bishop = overlay.querySelector("piece.black.bishop");
    expect(bishop).toBeTruthy();
    bishop.click();

    expect(await promise).toBe("b");
    teardown(container);
  });

  it("rejects when Escape is pressed", async () => {
    const { container, boardEl } = makeBoard();

    const promise = promptPromotion(boardEl, "e8", "w", "white");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    await expect(promise).rejects.toThrow();

    teardown(container);
  });

  it("rejects when clicking outside picker (overlay background)", async () => {
    const { container, boardEl } = makeBoard();

    const promise = promptPromotion(boardEl, "e8", "w", "white");

    const overlay = container.querySelector(".chess-promotion-overlay");
    // Direct click on the overlay backdrop (not the picker or a piece).
    overlay.click();

    await expect(promise).rejects.toThrow();

    teardown(container);
  });

  it("removes overlay from DOM after resolution", async () => {
    const { container, boardEl } = makeBoard();

    const promise = promptPromotion(boardEl, "e8", "w", "white");

    const overlay = container.querySelector(".chess-promotion-overlay");
    const queen = overlay.querySelector("piece.white.queen");
    queen.click();

    await promise;

    expect(container.querySelector(".chess-promotion-overlay")).toBeNull();

    teardown(container);
  });

  it("removes overlay from DOM after Escape", async () => {
    const { container, boardEl } = makeBoard();

    const promise = promptPromotion(boardEl, "e8", "w", "white");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    await promise.catch(() => {});

    expect(container.querySelector(".chess-promotion-overlay")).toBeNull();

    teardown(container);
  });

  it("applies boardEl.offsetTop/offsetLeft to picker position", async () => {
    const { container, boardEl } = makeBoard();

    // happy-dom does not compute layout; set offsets manually.
    Object.defineProperty(boardEl, "offsetTop",  { value: 50, configurable: true });
    Object.defineProperty(boardEl, "offsetLeft", { value: 0,  configurable: true });

    // a8: rank=8 file=a, white orientation → row=0, col=0, sq=50
    // With the fix: picker top = offY + row*sq = 50+0 = 50px
    //               picker left = offX + col*sq = 0+0  =  0px
    const promise = promptPromotion(boardEl, "a8", "w", "white");
    const overlay = container.querySelector(".chess-promotion-overlay");
    const picker  = overlay.querySelector(".chess-promotion-overlay__picker");

    expect(picker.style.top).toBe("50px");
    expect(picker.style.left).toBe("0px");

    // Cancel cleanly so the promise settles.
    overlay.click();
    await promise.catch(() => {});
    teardown(container);
  });
});

// ── getPromotionPiece ─────────────────────────────────────────────────────────

describe("getPromotionPiece", () => {
  it("returns { piece: null } when the move is not a promotion", async () => {
    const state = {
      boardEl: null,
      wrapper: document.createElement("div"),
      board:   { orientation: () => "white" },
      game:    { turn: () => "w" },
    };
    const result = await getPromotionPiece(state, "e2", "e4");
    expect(result).toEqual({ piece: null });
  });

  it("returns { piece: 'q' } when user selects queen on a promotion move", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const boardEl = document.createElement("div");
    boardEl.getBoundingClientRect = () => ({ width: 400, height: 400, top: 0, left: 0, bottom: 400, right: 400 });
    container.appendChild(boardEl);

    const state = {
      boardEl,
      wrapper: container,
      board:   { orientation: () => "white" },
      game:    { turn: () => "w" },
    };
    const promise = getPromotionPiece(state, "e7", "e8");
    const overlay = container.querySelector(".chess-promotion-overlay");
    overlay.querySelector("piece.white.queen").click();
    const result = await promise;
    expect(result).toEqual({ piece: "q" });
    container.remove();
  });

  it("returns { cancelled: true } when user cancels (Escape)", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const boardEl = document.createElement("div");
    boardEl.getBoundingClientRect = () => ({ width: 400, height: 400, top: 0, left: 0, bottom: 400, right: 400 });
    container.appendChild(boardEl);

    const state = {
      boardEl,
      wrapper: container,
      board:   { orientation: () => "white" },
      game:    { turn: () => "w" },
    };
    const promise = getPromotionPiece(state, "e7", "e8");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    const result = await promise;
    expect(result).toEqual({ cancelled: true });
    container.remove();
  });
});
