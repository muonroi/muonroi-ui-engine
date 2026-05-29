import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "monaco-editor": resolve(__dirname, "tests/stubs/monaco-editor.ts"),
      "@microsoft/signalr": resolve(__dirname, "tests/stubs/signalr.ts"),
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
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["**/*.spec.ts", "**/*.test.ts", "**/*.test.tsx", "**/*.d.ts"]
    }
  }
});
