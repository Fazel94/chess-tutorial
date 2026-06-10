import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { attachHoverNav } from "./keyboard-nav.js";

// The module installs a single document keydown handler on first import.
// _active is cleared via mouseleave — rely on that for test isolation.

function makeWrapper(cbs) {
  const wrapper = document.createElement("div");
  document.body.appendChild(wrapper);
  attachHoverNav(wrapper, cbs);
  return wrapper;
}

function makeCbs() {
  return {
    onFirst: vi.fn(),
    onPrev:  vi.fn(),
    onNext:  vi.fn(),
    onLast:  vi.fn(),
  };
}

afterEach(() => {
  // Reset RTL state
  document.documentElement.removeAttribute("dir");
  // Clear _active by removing all wrappers (mouseleave fires on removal? No — explicit leave needed)
  document.body.innerHTML = "";
  // Fire a global mouseleave-equivalent: dispatch a keydown that has no _active handler.
  // Actually _active persists. We clear it by dispatching mouseleave on any lingering wrapper.
  // Since body is cleared, the safest reset is to just let each test hover its own wrapper
  // explicitly. Tests that need a clean start fire mouseenter themselves.
});

describe("attachHoverNav", () => {
  it("calls onNext when ArrowRight fires on hovered wrapper (LTR)", () => {
    document.documentElement.removeAttribute("dir"); // ensure LTR
    const cbs = makeCbs();
    const wrapper = makeWrapper(cbs);

    wrapper.dispatchEvent(new MouseEvent("mouseenter"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

    expect(cbs.onNext).toHaveBeenCalledOnce();
    expect(cbs.onPrev).not.toHaveBeenCalled();

    wrapper.dispatchEvent(new MouseEvent("mouseleave"));
  });

  it("calls onNext when ArrowLeft fires on hovered wrapper (RTL)", () => {
    document.documentElement.setAttribute("dir", "rtl");
    const cbs = makeCbs();
    const wrapper = makeWrapper(cbs);

    wrapper.dispatchEvent(new MouseEvent("mouseenter"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));

    expect(cbs.onNext).toHaveBeenCalledOnce();
    expect(cbs.onPrev).not.toHaveBeenCalled();

    wrapper.dispatchEvent(new MouseEvent("mouseleave"));
  });

  it("does not call cb when wrapper is not hovered (mouseleave)", () => {
    document.documentElement.removeAttribute("dir");
    const cbs = makeCbs();
    const wrapper = makeWrapper(cbs);

    wrapper.dispatchEvent(new MouseEvent("mouseenter"));
    wrapper.dispatchEvent(new MouseEvent("mouseleave"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

    expect(cbs.onNext).not.toHaveBeenCalled();
    expect(cbs.onPrev).not.toHaveBeenCalled();
    expect(cbs.onFirst).not.toHaveBeenCalled();
    expect(cbs.onLast).not.toHaveBeenCalled();
  });

  it("calls onFirst on Home", () => {
    document.documentElement.removeAttribute("dir");
    const cbs = makeCbs();
    const wrapper = makeWrapper(cbs);

    wrapper.dispatchEvent(new MouseEvent("mouseenter"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));

    expect(cbs.onFirst).toHaveBeenCalledOnce();
    expect(cbs.onLast).not.toHaveBeenCalled();

    wrapper.dispatchEvent(new MouseEvent("mouseleave"));
  });

  it("calls onLast on End", () => {
    document.documentElement.removeAttribute("dir");
    const cbs = makeCbs();
    const wrapper = makeWrapper(cbs);

    wrapper.dispatchEvent(new MouseEvent("mouseenter"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));

    expect(cbs.onLast).toHaveBeenCalledOnce();
    expect(cbs.onFirst).not.toHaveBeenCalled();

    wrapper.dispatchEvent(new MouseEvent("mouseleave"));
  });

  it("scopes to hovered wrapper — two wrappers, only hovered one receives event", () => {
    document.documentElement.removeAttribute("dir");
    const cbsA = makeCbs();
    const cbsB = makeCbs();
    const wrapperA = makeWrapper(cbsA);
    const wrapperB = makeWrapper(cbsB);

    // Hover A, then move to B — only B's callbacks fire
    wrapperA.dispatchEvent(new MouseEvent("mouseenter"));
    wrapperA.dispatchEvent(new MouseEvent("mouseleave"));
    wrapperB.dispatchEvent(new MouseEvent("mouseenter"));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

    expect(cbsB.onNext).toHaveBeenCalledOnce();
    expect(cbsA.onNext).not.toHaveBeenCalled();

    wrapperB.dispatchEvent(new MouseEvent("mouseleave"));
  });
});
