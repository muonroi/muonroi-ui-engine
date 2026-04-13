import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * Lightweight standalone IIFE build — only mu-rule-trace-viewer + mu-rule-result-panel.
 * No Monaco editor, no React, no XYFlow. Suitable for direct <script> injection in Angular.
 * Output: dist/muonroi-trace-components.iife.js
 */
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/register-trace.ts"),
      name: "MuonroiTraceComponents",
      formats: ["iife"],
      fileName: () => "muonroi-trace-components.iife.js"
    },
    rollupOptions: {
      output: {
        assetFileNames: (chunkInfo) =>
          chunkInfo.name?.endsWith(".css") ? "muonroi-trace-components.css" : "assets/[name]-[hash][extname]"
      }
    }
  }
});
