import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFenBar } from "./fen-bar.js";
import { STRINGS } from "../strings.js";

const FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

let container;
beforeEach(() => {
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.appendChild(container);
});

function bar(onLoad) {
  return createFenBar(container, { getFen: () => FEN, onLoad });
}

describe("createFenBar", () => {
  it("renders no input row when read-only (no onLoad)", () => {
    bar(undefined);
    expect(container.querySelector(".fen-input")).toBeNull();
    expect(container.querySelector('[data-ref="fen-display"]').textContent).toBe(FEN);
  });

  it("clears the input and hides the error on a successful load", () => {
    const onLoad = vi.fn(() => true);
    bar(onLoad);
    const input = container.querySelector(".fen-input");
    const error = container.querySelector('[data-ref="fen-error"]');
    input.value = FEN;
    container.querySelector('[data-ref="fen-load"]').click();

    expect(onLoad).toHaveBeenCalledWith(FEN);
    expect(input.value).toBe("");
    expect(error.hidden).toBe(true);
  });

  it("treats undefined return as success (backwards compatible)", () => {
    const onLoad = vi.fn(() => undefined);
    bar(onLoad);
    const input = container.querySelector(".fen-input");
    input.value = FEN;
    container.querySelector('[data-ref="fen-load"]').click();
    expect(input.value).toBe("");
  });

  it("shows the error and keeps the value when onLoad returns false", () => {
    const onLoad = vi.fn(() => false);
    bar(onLoad);
    const input = container.querySelector(".fen-input");
    const error = container.querySelector('[data-ref="fen-error"]');
    input.value = "garbage";
    container.querySelector('[data-ref="fen-load"]').click();

    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe(STRINGS.fenInvalid);
    expect(input.value).toBe("garbage"); // retained so the user can fix it
  });

  it("clears the error once the user edits the input again", () => {
    bar(vi.fn(() => false));
    const input = container.querySelector(".fen-input");
    const error = container.querySelector('[data-ref="fen-error"]');
    input.value = "garbage";
    container.querySelector('[data-ref="fen-load"]').click();
    expect(error.hidden).toBe(false);

    input.value = "g";
    input.dispatchEvent(new Event("input"));
    expect(error.hidden).toBe(true);
  });

  it("ignores empty submissions", () => {
    const onLoad = vi.fn(() => true);
    bar(onLoad);
    const input = container.querySelector(".fen-input");
    input.value = "   ";
    container.querySelector('[data-ref="fen-load"]').click();
    expect(onLoad).not.toHaveBeenCalled();
  });
});
