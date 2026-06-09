import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@xyflow/react/dist/style.css": resolve(__dirname, "tests/stubs/xyflow-style.css"),
      "@xyflow/react": resolve(__dirname, "tests/stubs/xyflow-react.tsx"),
      "monaco-editor": resolve(__dirname, "tests/stubs/monaco-editor.ts"),
      "@lit-labs/virtualizer/virtualize.js": resolve(__dirname, "tests/stubs/lit-labs-virtualizer.ts"),
      "@lit-labs/virtualizer": resolve(__dirname, "tests/stubs/lit-labs-virtualizer.ts"),
      "@muonroi/ui-engine-core": resolve(__dirname, "../m-ui-engine-core/src/index.ts")
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["lcov", "text"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["**/*.spec.ts", "**/*.test.ts", "**/*.d.ts"]
    }
  }
});
