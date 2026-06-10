/**
 * Reusable move-list component.
 *
 * Builds the DOM once on `render()`; subsequent `setActive()` calls only
 * toggle the `.active` class — no innerHTML thrash per step.
 *
 * @param {HTMLElement} container - Element to append the `.move-list` div into.
 * @param {object} [opts]
 * @param {function} [opts.onSelect] - Called with `(moveIdx)` when a move span is clicked.
 * @returns {{ render, setActive, element, destroy: () => void }}
 */
export function createMoveList(container, { onSelect } = {}) {
  const el = document.createElement("div");
  el.className = "move-list";
  container.appendChild(el);

  /** @type {HTMLElement[]} Ordered list of `.move` spans, index = half-move index */
  let moveSpans = [];

  /** @param {string} nag */
  function nagCssClass(nag) {
    switch (nag) {
      case "!":  return "nag-good";
      case "?":  return "nag-mistake";
      case "!!": return "nag-brilliant";
      case "??": return "nag-blunder";
      case "!?": return "nag-interesting";
      case "?!": return "nag-dubious";
      default:   return "";
    }
  }

  /**
   * Build the complete move list DOM. Safe to call multiple times (replaces
   * previous content).
   *
   * @param {import("chess.js").Move[]} moves
   * @param {number} cursor  - Active half-move index (-1 = before first move).
   * @param {function} [getAnnotation] - `(idx) => { nag, comment }` — optional.
   */
  function render(moves, cursor, getAnnotation) {
    el.innerHTML = "";
    moveSpans = [];

    for (let i = 0; i < moves.length; i++) {
      if (i % 2 === 0) {
        const numSpan = document.createElement("span");
        numSpan.className = "move-number";
        numSpan.textContent = `${Math.floor(i / 2) + 1}.`;
        el.appendChild(numSpan);
      }

      const ann = getAnnotation ? getAnnotation(i) : { nag: null, comment: null };

      const moveSpan = document.createElement("span");
      moveSpan.className = "move" + (i === cursor ? " active" : "") + (ann.comment ? " move-has-comment" : "");
      moveSpan.dataset.moveIdx = String(i);

      moveSpan.textContent = moves[i].san;

      if (ann.nag) {
        const nagSpan = document.createElement("span");
        const cls = nagCssClass(ann.nag);
        nagSpan.className = "nag" + (cls ? ` ${cls}` : "");
        nagSpan.textContent = ann.nag;
        moveSpan.appendChild(nagSpan);
      }

      el.appendChild(moveSpan);
      moveSpans.push(moveSpan);
    }

    scrollActive();
  }

  /**
   * Move the `.active` class from the current active span to the one at `idx`.
   * Does nothing if `moves` haven't been rendered yet.
   *
   * @param {number} idx - Half-move index, or -1 (no active move).
   */
  function setActive(idx) {
    for (const span of moveSpans) span.classList.remove("active");
    if (idx >= 0 && idx < moveSpans.length) {
      moveSpans[idx].classList.add("active");
    }
    scrollActive();
  }

  function scrollActive() {
    const active = el.querySelector(".move.active");
    if (!active) return;
    const activeRect = active.getBoundingClientRect();
    const elRect     = el.getBoundingClientRect();
    if (activeRect.bottom > elRect.bottom) el.scrollTop += activeRect.bottom - elRect.bottom;
    if (activeRect.top    < elRect.top)    el.scrollTop -= elRect.top - activeRect.top;
  }

  // Click delegation — single listener on the container.
  el.addEventListener("click", (e) => {
    const target = e.target.closest("[data-move-idx]");
    if (target && onSelect) onSelect(Number(target.dataset.moveIdx));
  });

  return { render, setActive, element: el, destroy() { el.remove(); } };
}
