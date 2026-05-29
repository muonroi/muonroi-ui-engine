import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "MuonroiPdfDesigner",
      formats: ["es", "iife"],
      fileName: (format) =>
        format === "iife" ? "muonroi-pdf-designer.iife.js" : "muonroi-pdf-designer.esm.js"
    },
    rollupOptions: {
      external: ["@muonroi/ui-engine-core", "react", "react-dom", "monaco-editor"],
      output: {
        globals: {
          "@muonroi/ui-engine-core": "MuonroiUiEngineCore",
          "react": "React",
          "react-dom": "ReactDOM",
          "monaco-editor": "monaco"
        },
        assetFileNames: (chunkInfo) =>
          chunkInfo.name?.endsWith(".css") ? "muonroi-pdf-designer.css" : "assets/[name]-[hash][extname]"
      }
    }
  }
});
