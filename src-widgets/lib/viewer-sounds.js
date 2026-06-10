import { playSoundForSan } from "./sound.js";

/**
 * Play a piece sound after each navigation step in an `@lichess-org/pgn-viewer`
 * instance, matching the move the viewer lands on. Wraps viewer.goTo /
 * viewer.toPath (the same hooks every control, keyboard arrow and move click
 * route through). Stepping to the start position (no SAN) is silent.
 *
 * The caller is responsible for `loadSounds()`; this only plays.
 *
 * @param {object|null} viewer - The LPV viewer instance.
 * @returns {() => void}       - Teardown function (restores original methods).
 */
export function attachMoveSounds(viewer) {
  if (!viewer) return () => {};
  function play() {
    let data;
    try { data = viewer.curData(); } catch (_) { return; }
    if (data && data.san) playSoundForSan(data.san);
  }
  const origGoTo   = viewer.goTo   ? viewer.goTo.bind(viewer)   : null;
  const origToPath = viewer.toPath ? viewer.toPath.bind(viewer) : null;
  if (origGoTo)   viewer.goTo   = (dir, focus) => { origGoTo(dir, focus); play(); };
  if (origToPath) viewer.toPath = (p, focus)   => { origToPath(p, focus); play(); };
  return () => {
    if (origGoTo)   viewer.goTo   = origGoTo;
    if (origToPath) viewer.toPath = origToPath;
  };
}
