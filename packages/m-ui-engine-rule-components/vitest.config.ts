import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "monaco-editor": resolve(__dirname, "tests/stubs/monaco-editor.ts"),
      "@muonroi/ui-engine-core": resolve(__dirname, "../m-ui-engine-core/src/index.ts")
    }
  },
  test: {
    environment: "happy-dom"
  }
});
