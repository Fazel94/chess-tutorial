/**
 * HTML escape for interpolation into innerHTML. Use textContent when
 * possible; reach for this only when an innerHTML template is unavoidable.
 *
 * @param {unknown} s
 * @returns {string}
 */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
