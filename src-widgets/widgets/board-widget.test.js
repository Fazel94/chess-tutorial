import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@lichess-org/chessground/assets/chessground.base.css", () => ({}));
vi.mock("@lichess-org/chessground/assets/chessground.brown.css", () => ({}));
vi.mock("@lichess-org/chessground/assets/chessground.cburnett.css", () => ({}));

vi.mock("../lib/lpv-translate.js", () => ({ translate: {} }));

vi.mock("@lichess-org/pgn-viewer", () => ({
  default: vi.fn((el, opts) => ({
    node: { data: { fen: opts.fen || "startpos" } },
    goTo: vi.fn(),
    flip: vi.fn(),
  })),
}));

import { mountBoardWidget, renderCaption } from "./board-widget.js";

beforeEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("mountBoardWidget", () => {
  it("replaces placeholder with .tutorial-board-widget wrapper", () => {
    const placeholder = document.createElement("div");
    placeholder.dataset.fen =
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    document.body.appendChild(placeholder);
    mountBoardWidget(placeholder);
    expect(document.body.querySelector(".tutorial-board-widget")).not.toBeNull();
    expect(document.body.contains(placeholder)).toBe(false);
  });

  it("appends caption when data-caption is set", () => {
    const placeholder = document.createElement("div");
    placeholder.dataset.fen = "8/8/8/8/8/8/8/8 w - - 0 1";
    placeholder.dataset.caption = "Test caption";
    document.body.appendChild(placeholder);
    mountBoardWidget(placeholder);
    const wrapper = document.body.querySelector(".tutorial-board-widget");
    expect(wrapper.querySelector(".tutorial-caption").textContent).toBe(
      "Test caption"
    );
  });

  it("calls LichessPgnViewer with showMoves:false and viewOnly:true", async () => {
    const LPV = (await import("@lichess-org/pgn-viewer")).default;
    const placeholder = document.createElement("div");
    placeholder.dataset.fen = "8/8/8/8/8/8/8/8 w - - 0 1";
    document.body.appendChild(placeholder);
    mountBoardWidget(placeholder);
    expect(LPV).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ showMoves: false })
    );
  });
});

describe("renderCaption", () => {
  it("renders a plain caption as text (no move split)", () => {
    const p = renderCaption("هر دو شاه قلعه کوچک رفتند");
    expect(p.classList.contains("has-moves")).toBe(false);
    expect(p.textContent).toBe("هر دو شاه قلعه کوچک رفتند");
    expect(p.querySelector(".caption-moves")).toBeNull();
  });

  it("isolates the move sequence as an LTR bdi and splits off the note", () => {
    const p = renderCaption(
      "پس از 1.e4 e5 2.Nf3 Nc6 3.Ng1 Nf6 4.Nf3 Bc5 5.Ng5 — اسب سفید چهار بار حرکت کرده، سیاه کاملاً توسعه یافته"
    );
    expect(p.classList.contains("has-moves")).toBe(true);

    const moves = p.querySelector(".caption-moves");
    expect(moves).not.toBeNull();
    expect(moves.tagName.toLowerCase()).toBe("bdi");
    expect(moves.getAttribute("dir")).toBe("ltr");
    // The move sequence is captured verbatim and in reading order.
    expect(moves.textContent).toBe("1.e4 e5 2.Nf3 Nc6 3.Ng1 Nf6 4.Nf3 Bc5 5.Ng5");

    const head = p.querySelector(".caption-head");
    expect(head.textContent.startsWith("پس از")).toBe(true);

    const note = p.querySelector(".caption-note");
    expect(note.textContent).toBe("اسب سفید چهار بار حرکت کرده، سیاه کاملاً توسعه یافته");
  });

  it("handles a single-move head", () => {
    const p = renderCaption("پس از 4...Bxf3 — سیاه فیل را معاوضه کرد");
    expect(p.querySelector(".caption-moves").textContent).toBe("4...Bxf3");
    expect(p.querySelector(".caption-note").textContent).toBe("سیاه فیل را معاوضه کرد");
  });

  it("splits on the first em dash only (keeps later dashes in the note)", () => {
    const p = renderCaption("پس از 1.e4 — مرکز — توضیح بیشتر");
    expect(p.querySelector(".caption-moves").textContent).toBe("1.e4");
    expect(p.querySelector(".caption-note").textContent).toBe("مرکز — توضیح بیشتر");
  });
});
