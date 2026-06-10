import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src-widgets/**/*.test.js"],
    // Suppress Sass deprecation warnings that come from pgn-viewer SCSS.
    // They don't affect test correctness.
    reporters: ["verbose"],
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [resolve(__dirname, "node_modules")],
        // Suppress Dart Sass 3.0 @import deprecation warnings from pgn-viewer SCSS.
        silenceDeprecations: ["import"],
      },
    },
  },
});
