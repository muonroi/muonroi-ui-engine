import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "MuonroiRuleComponents",
      formats: ["es", "iife"],
      fileName: (format) =>
        format === "iife" ? "muonroi-rule-components.iife.js" : "muonroi-rule-components.esm.js"
    },
    rollupOptions: {
      output: {
        assetFileNames: (chunkInfo) =>
          chunkInfo.name?.endsWith(".css") ? "muonroi-rule-components.css" : "assets/[name]-[hash][extname]"
      }
    }
  }
});
