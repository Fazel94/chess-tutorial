import { STRINGS } from "../strings.js";

/**
 * Reusable FEN display/input bar.
 * Read-only when no `onLoad` is supplied (puzzle mode).
 *
 * `onLoad` may return `false` to signal that the FEN was rejected (e.g. invalid
 * position); the bar then shows an inline error and keeps the typed value so the
 * user can correct it. Any other return value (including `undefined`) is treated
 * as success and clears the input.
 *
 * @param {HTMLElement} container
 * @param {{ getFen: () => string, onLoad?: (fen: string) => (boolean|void) }} cbs
 * @returns {{ update: () => void, destroy: () => void }}
 */
export function createFenBar(container, { getFen, onLoad }) {
  const el = document.createElement("div");
  el.className = "fen-bar";
  el.innerHTML = `
    <div class="fen-display" data-ref="fen-display" title="${STRINGS.fenCopyHint}"></div>
    ${onLoad ? `
      <div class="fen-input-row">
        <input type="text" class="fen-input" data-ref="fen-input" placeholder="${STRINGS.fenPlaceholder}" spellcheck="false" />
        <button class="fen-load-btn" data-ref="fen-load">${STRINGS.fenLoad}</button>
      </div>
      <div class="fen-error" data-ref="fen-error" hidden></div>
    ` : ""}
  `;
  container.appendChild(el);

  const display = el.querySelector('[data-ref="fen-display"]');
  const input   = el.querySelector('[data-ref="fen-input"]');
  const loadBtn = el.querySelector('[data-ref="fen-load"]');
  const errorEl = el.querySelector('[data-ref="fen-error"]');

  function update() { display.textContent = getFen(); }

  display.addEventListener("click", () => {
    const fen = getFen();
    navigator.clipboard.writeText(fen).then(() => {
      const prev = display.textContent;
      display.textContent = STRINGS.fenCopied;
      setTimeout(() => { display.textContent = prev; }, 1000);
    }).catch(() => {});
  });

  if (onLoad && input && loadBtn) {
    const clearError = () => {
      if (!errorEl) return;
      errorEl.hidden = true;
      errorEl.textContent = "";
    };
    const submit = () => {
      const fen = input.value.trim();
      if (!fen) return;
      if (onLoad(fen) === false) {
        if (errorEl) {
          errorEl.textContent = STRINGS.fenInvalid;
          errorEl.hidden = false;
        }
        return;
      }
      clearError();
      input.value = "";
    };
    loadBtn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    input.addEventListener("input", clearError);
  }

  update();
  return { update, destroy() { el.remove(); } };
}
