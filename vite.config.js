import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * Widget bundle build.
 *
 * Emits `widgets.js` + `widgets.css` into `course/site/assets/` (the MkDocs
 * site directory). MkDocs must be built first; we set `emptyOutDir: false` so
 * Vite's output is added next to MkDocs HTML, not on top of it.
 *
 * The bundle is referenced by `course/mkdocs.yml`:
 *   extra_javascript: [assets/widgets.js]
 *   extra_css:        [assets/css/site.css, assets/widgets.css]
 *
 * Stockfish & sound assets live under `course/docs/assets/` and are copied
 * to the site by MkDocs as ordinary static files.
 */
export default defineConfig({
  // Site is served from / (configurable via env if subpath deploy is needed).
  base: "/",

  // No publicDir -- MkDocs owns all static assets (fonts, sounds, stockfish).
  publicDir: false,

  css: {
    preprocessorOptions: {
      scss: {
        // Allow bare package specifiers in @use / @import rules.
        loadPaths: [resolve(__dirname, "node_modules")],
        // Suppress Dart Sass 3.0 @import deprecation warnings from pgn-viewer SCSS.
        silenceDeprecations: ["import"],
      },
    },
  },

  build: {
    outDir: resolve(__dirname, "course/site/assets"),
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, "src-widgets/bootstrap.js"),
      output: {
        entryFileNames: "widgets.js",
        chunkFileNames: "widgets-[name].js",
        assetFileNames: (info) => {
          if (info.name && info.name.endsWith(".css")) return "widgets.css";
          return "widgets-[name][extname]";
        },
      },
    },
  },
});
