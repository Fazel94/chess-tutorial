import { describe, it, expect, vi, beforeEach } from "vitest";
import { attachShortcutsHelp, viewerShortcuts } from "./shortcuts-help.js";

const SHORTCUTS = [
  { key: "←", label: "حرکت بعدی"  },
  { key: "→", label: "حرکت قبلی"  },
  { key: "Home", label: "اول بازی" },
  { key: "End",  label: "آخر بازی" },
];

let container;
function mount(shortcuts = SHORTCUTS) {
  container = document.createElement("div");
  document.body.appendChild(container);
  return attachShortcutsHelp(container, shortcuts);
}

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("dir");
});

describe("attachShortcutsHelp", () => {
  it("appends a ? button and hidden panel to the container", () => {
    mount();
    const btn   = container.querySelector(".shortcuts-help-btn");
    const panel = container.querySelector(".shortcuts-help-panel");
    expect(btn).not.toBeNull();
    expect(panel).not.toBeNull();
    expect(panel.hidden).toBe(true);
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("clicking the button opens the panel", () => {
    mount();
    container.querySelector(".shortcuts-help-btn").click();
    const panel = container.querySelector(".shortcuts-help-panel");
    expect(panel.hidden).toBe(false);
    expect(container.querySelector(".shortcuts-help-btn").getAttribute("aria-expanded")).toBe("true");
  });

  it("clicking the button again closes the panel", () => {
    mount();
    const btn = container.querySelector(".shortcuts-help-btn");
    btn.click();
    btn.click();
    expect(container.querySelector(".shortcuts-help-panel").hidden).toBe(true);
  });

  it("pressing Escape closes the panel", () => {
    mount();
    container.querySelector(".shortcuts-help-btn").click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(container.querySelector(".shortcuts-help-panel").hidden).toBe(true);
  });

  it("pressing Escape does nothing when panel is already closed", () => {
    mount();
    expect(() =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    ).not.toThrow();
    expect(container.querySelector(".shortcuts-help-panel").hidden).toBe(true);
  });

  it("clicking outside the row closes the panel", () => {
    mount();
    container.querySelector(".shortcuts-help-btn").click();
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(container.querySelector(".shortcuts-help-panel").hidden).toBe(true);
  });

  it("renders all shortcut entries in the list", () => {
    mount();
    const dts = Array.from(container.querySelectorAll(".shortcuts-help-list dt")).map(n => n.textContent);
    const dds = Array.from(container.querySelectorAll(".shortcuts-help-list dd")).map(n => n.textContent);
    expect(dts).toEqual(["←", "→", "Home", "End"]);
    expect(dds).toContain("حرکت بعدی");
    expect(dds).toContain("حرکت قبلی");
  });

  it("destroy removes event listeners (panel stays closed after Escape)", () => {
    const { destroy } = mount();
    container.querySelector(".shortcuts-help-btn").click();
    destroy();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    // After destroy the handler is gone; panel state unchanged by Escape
    expect(container.querySelector(".shortcuts-help-panel").hidden).toBe(false);
  });
});

describe("viewerShortcuts", () => {
  it("returns ← as forward key on RTL page", () => {
    document.documentElement.setAttribute("dir", "rtl");
    const shortcuts = viewerShortcuts();
    expect(shortcuts[0].key).toBe("←");
    expect(shortcuts[1].key).toBe("→");
  });

  it("returns → as forward key on LTR page", () => {
    document.documentElement.setAttribute("dir", "ltr");
    const shortcuts = viewerShortcuts();
    expect(shortcuts[0].key).toBe("→");
    expect(shortcuts[1].key).toBe("←");
  });

  it("always includes Home and End", () => {
    const shortcuts = viewerShortcuts();
    const keys = shortcuts.map(s => s.key);
    expect(keys).toContain("Home");
    expect(keys).toContain("End");
  });
});
