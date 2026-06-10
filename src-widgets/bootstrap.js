/**
 * Entry point that triggers widget hydration on DOMContentLoaded.
 * Kept separate from hydrate.js so that importing hydrate.js in tests
 * does not cause a side-effecting auto-hydrate at module scope.
 */
import { hydrate } from "./hydrate.js";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", hydrate);
} else {
  hydrate();
}
