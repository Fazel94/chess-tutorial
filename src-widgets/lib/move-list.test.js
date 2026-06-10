import { describe, it, expect } from "vitest";
import { createMoveList } from "./move-list.js";

/** Minimal Move-like objects that only need `.san`. */
function moves(...sans) {
  return sans.map((san) => ({ san }));
}

describe("createMoveList", () => {
  it("appends .move-list to container", () => {
    const container = document.createElement("div");
    createMoveList(container);
    const el = container.querySelector(".move-list");
    expect(el).not.toBeNull();
    expect(el.parentElement).toBe(container);
  });

  it("render builds correct number of spans", () => {
    const container = document.createElement("div");
    const { render, element } = createMoveList(container);

    // 4 half-moves → 4 .move spans + 2 .move-number spans = 6 spans total
    render(moves("e4", "e5", "Nf3", "Nc6"), 3);
    const moveSpans = element.querySelectorAll(".move");
    const numSpans = element.querySelectorAll(".move-number");
    expect(moveSpans.length).toBe(4);
    expect(numSpans.length).toBe(2);
    expect(numSpans[0].textContent).toBe("1.");
    expect(numSpans[1].textContent).toBe("2.");
  });

  it("render marks cursor as .active", () => {
    const container = document.createElement("div");
    const { render, element } = createMoveList(container);
    render(moves("e4", "e5", "Nf3"), 1);
    const moveSpans = element.querySelectorAll(".move");
    expect(moveSpans[0].classList.contains("active")).toBe(false);
    expect(moveSpans[1].classList.contains("active")).toBe(true);
    expect(moveSpans[2].classList.contains("active")).toBe(false);
  });

  it("setActive moves .active class", () => {
    const container = document.createElement("div");
    const { render, setActive, element } = createMoveList(container);
    render(moves("e4", "e5", "Nf3", "Nc6"), 0);
    // Initially index 0 is active.
    let spans = element.querySelectorAll(".move");
    expect(spans[0].classList.contains("active")).toBe(true);

    setActive(2);
    spans = element.querySelectorAll(".move");
    expect(spans[0].classList.contains("active")).toBe(false);
    expect(spans[2].classList.contains("active")).toBe(true);
  });

  it("cursor -1 means no active span", () => {
    const container = document.createElement("div");
    const { render, element } = createMoveList(container);
    render(moves("e4", "e5"), -1);
    const activeSpans = element.querySelectorAll(".move.active");
    expect(activeSpans.length).toBe(0);
  });

  it("clicking a move span calls onSelect with index", () => {
    const container = document.createElement("div");
    const selected = [];
    const { render, element } = createMoveList(container, {
      onSelect: (idx) => selected.push(idx),
    });
    render(moves("e4", "e5", "Nf3"), 0);

    const moveSpans = element.querySelectorAll(".move");
    moveSpans[2].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(selected).toEqual([2]);
  });

  it("render with getAnnotation adds .nag span and .move-has-comment", () => {
    const container = document.createElement("div");
    const { render, element } = createMoveList(container);

    const annotations = [
      { nag: "!", comment: null },
      { nag: null, comment: "A good reply." },
    ];
    render(moves("e4", "e5"), 0, (i) => annotations[i] ?? { nag: null, comment: null });

    const moveSpans = element.querySelectorAll(".move");

    // First move: has nag "!" → contains a .nag span
    const nagSpan = moveSpans[0].querySelector(".nag");
    expect(nagSpan).not.toBeNull();
    expect(nagSpan.textContent).toBe("!");
    expect(nagSpan.classList.contains("nag-good")).toBe(true);
    expect(moveSpans[0].classList.contains("move-has-comment")).toBe(false);

    // Second move: has comment → .move-has-comment, no nag span
    expect(moveSpans[1].classList.contains("move-has-comment")).toBe(true);
    expect(moveSpans[1].querySelector(".nag")).toBeNull();
  });

  it("re-rendering updates the DOM", () => {
    const container = document.createElement("div");
    const { render, element } = createMoveList(container);

    render(moves("e4", "e5"), 1);
    expect(element.querySelectorAll(".move").length).toBe(2);

    // Re-render with more moves and different cursor
    render(moves("e4", "e5", "Nf3", "Nc6", "Bb5"), 4);
    const spans = element.querySelectorAll(".move");
    expect(spans.length).toBe(5);
    expect(spans[4].classList.contains("active")).toBe(true);
    // Old active at index 1 must be gone
    expect(spans[1].classList.contains("active")).toBe(false);
  });
});
