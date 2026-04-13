import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * Mid-weight IIFE build — includes mu-rule-flow-designer (React + XYFlow),
 * mu-rule-trace-viewer, and mu-rule-result-panel.
 * Excludes: decision-table components (Monaco Editor causes dynamic import() in IIFE).
 * Output: dist/muonroi-flow-components.iife.js (~1-2MB)
 */
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/register-flow.ts"),
      name: "MuonroiFlowComponents",
      formats: ["iife"],
      fileName: () => "muonroi-flow-components.iife.js"
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: (chunkInfo) =>
          chunkInfo.name?.endsWith(".css") ? "muonroi-flow-components.css" : "assets/[name]-[hash][extname]"
      }
    }
  }
});
