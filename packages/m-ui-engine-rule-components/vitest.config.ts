import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@xyflow/react/dist/style.css": resolve(__dirname, "tests/stubs/xyflow-style.css"),
      "@xyflow/react": resolve(__dirname, "tests/stubs/xyflow-react.tsx"),
      "monaco-editor": resolve(__dirname, "tests/stubs/monaco-editor.ts"),
      "@muonroi/ui-engine-core": resolve(__dirname, "../m-ui-engine-core/src/index.ts")
    }
  },
  test: {
    environment: "jsdom",
    css: true
  }
});
