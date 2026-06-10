/**
 * Hover-scoped keyboard navigation for step-through widgets.
 *
 * One shared document-level `keydown` handler is installed the first time
 * this module is imported. `attachHoverNav` registers a wrapper element so
 * that keyboard events are forwarded only to the widget the cursor is
 * currently hovering over.
 *
 * Arrow-key semantics are RTL-aware:
 *   LTR: ArrowRight = forward, ArrowLeft = backward
 *   RTL: ArrowLeft  = forward, ArrowRight = backward
 *
 * @param {HTMLElement} wrapper - Root element of the widget.
 * @param {object} cbs
 * @param {function} cbs.onFirst
 * @param {function} cbs.onPrev
 * @param {function} cbs.onNext
 * @param {function} cbs.onLast
 */
export function attachHoverNav(wrapper, { onFirst, onPrev, onNext, onLast }) {
  wrapper.addEventListener("mouseenter", () => { _active = { onFirst, onPrev, onNext, onLast }; });
  wrapper.addEventListener("mouseleave", () => {
    if (_active && _active.onFirst === onFirst) _active = null;
  });
  _ensureHandler();
}

// ─── Module-level shared state ────────────────────────────────────────────────

let _active = null;
let _attached = false;

function _ensureHandler() {
  if (_attached) return;
  _attached = true;
  document.addEventListener("keydown", (e) => {
    if (!_active) return;
    const rtl = document.documentElement.dir === "rtl";
    const fwd = rtl ? "ArrowLeft"  : "ArrowRight";
    const bwd = rtl ? "ArrowRight" : "ArrowLeft";
    if      (e.key === fwd)    { _active.onNext();  e.preventDefault(); }
    else if (e.key === bwd)    { _active.onPrev();  e.preventDefault(); }
    else if (e.key === "Home") { _active.onFirst(); e.preventDefault(); }
    else if (e.key === "End")  { _active.onLast();  e.preventDefault(); }
  });
}
