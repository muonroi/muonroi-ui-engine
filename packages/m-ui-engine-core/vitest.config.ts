import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["lcov", "text"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["**/*.spec.ts", "**/*.test.ts", "**/*.d.ts"]
    }
  }
});
