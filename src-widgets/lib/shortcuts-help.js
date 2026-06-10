import { STRINGS } from "../strings.js";

/**
 * Keyboard shortcuts help overlay for step-through viewer widgets.
 *
 * Appends a small `?` button to `container`. Clicking it — or pressing `?`
 * while the cursor hovers the container — opens a floating panel listing the
 * supplied shortcuts. Escape or clicking outside closes it.
 *
 * @param {HTMLElement} container
 * @param {Array<{ key: string, label: string }>} shortcuts
 * @returns {{ close: () => void, destroy: () => void }}
 */
export function attachShortcutsHelp(container, shortcuts) {
  // ── DOM ──────────────────────────────────────────────────────────────────────
  const row = document.createElement("div");
  row.className = "shortcuts-help-row";

  const btn = document.createElement("button");
  btn.className = "shortcuts-help-btn";
  btn.setAttribute("aria-label", STRINGS.shortcutsLabel);
  btn.setAttribute("aria-expanded", "false");
  btn.textContent = "?";

  const panel = document.createElement("div");
  panel.className = "shortcuts-help-panel";
  panel.hidden = true;

  const title = document.createElement("div");
  title.className = "shortcuts-help-title";
  title.textContent = STRINGS.shortcutsTitle;

  const list = document.createElement("dl");
  list.className = "shortcuts-help-list";
  for (const { key, label } of shortcuts) {
    const dt = document.createElement("dt");
    dt.textContent = key;
    const dd = document.createElement("dd");
    dd.textContent = label;
    list.appendChild(dt);
    list.appendChild(dd);
  }

  panel.appendChild(title);
  panel.appendChild(list);
  row.appendChild(btn);
  row.appendChild(panel);
  container.appendChild(row);

  // ── Open / close ─────────────────────────────────────────────────────────────
  function open()   { panel.hidden = false; btn.setAttribute("aria-expanded", "true");  }
  function close()  { panel.hidden = true;  btn.setAttribute("aria-expanded", "false"); }
  function toggle() { panel.hidden ? open() : close(); }

  // ── Event handlers ────────────────────────────────────────────────────────────
  btn.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });

  function onKey(e) {
    if (e.key === "Escape" && !panel.hidden) {
      close();
      e.preventDefault();
      return;
    }
    // `?` while hovering the container toggles the panel.
    if (e.key === "?" && container.matches(":hover")) {
      toggle();
      e.preventDefault();
    }
  }

  function onOutside(e) {
    if (!panel.hidden && !row.contains(e.target)) close();
  }

  document.addEventListener("keydown", onKey);
  document.addEventListener("click",   onOutside);

  return {
    close,
    destroy() {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click",   onOutside);
    },
  };
}

/**
 * Build the shortcuts list for a PGN step-through viewer, respecting page
 * direction (RTL swaps the arrow keys).
 *
 * @returns {Array<{ key: string, label: string }>}
 */
export function viewerShortcuts() {
  const rtl = document.documentElement.dir === "rtl";
  const fwd = rtl ? "←" : "→";
  const bwd = rtl ? "→" : "←";
  return [
    { key: fwd,    label: STRINGS.shortcutsNext  },
    { key: bwd,    label: STRINGS.shortcutsPrev  },
    { key: "Home", label: STRINGS.shortcutsFirst },
    { key: "End",  label: STRINGS.shortcutsLast  },
  ];
}
