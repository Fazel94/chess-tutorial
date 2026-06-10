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

vi.mock("../lib/sound.js", () => ({
  loadSounds: vi.fn().mockResolvedValue(undefined),
  playMoveSound: vi.fn(),
  playSound: vi.fn(),
}));

vi.mock("../lib/fen-bar.js", () => ({
  createFenBar: vi.fn(() => ({ update: vi.fn() })),
}));

import { mountLocalPlayWidget } from "./local-play-widget.js";

beforeEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("mountLocalPlayWidget", () => {
  it("replaces placeholder with .local-play-widget", () => {
    const placeholder = document.createElement("div");
    document.body.appendChild(placeholder);
    mountLocalPlayWidget(placeholder, { fen: null });
    expect(document.body.querySelector(".local-play-widget")).not.toBeNull();
    expect(document.body.contains(placeholder)).toBe(false);
  });

  it("renders undo / flip / new-game buttons", () => {
    const placeholder = document.createElement("div");
    document.body.appendChild(placeholder);
    mountLocalPlayWidget(placeholder, { fen: null });
    const wrapper = document.body.querySelector(".local-play-widget");
    expect(wrapper.querySelector('[data-action="undo"]')).not.toBeNull();
    expect(wrapper.querySelector('[data-action="flip"]')).not.toBeNull();
    expect(wrapper.querySelector('[data-action="new-game"]')).not.toBeNull();
  });

  it("reads fen from opts", async () => {
    // FEN without en-passant square — chess.js will not normalize it
    const fen = "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
    const placeholder = document.createElement("div");
    document.body.appendChild(placeholder);
    const { Chessground } = await import("@lichess-org/chessground");
    mountLocalPlayWidget(placeholder, { fen });
    expect(Chessground).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ fen })
    );
  });
});
