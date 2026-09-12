import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/db/schema.ts"],
      thresholds: {
        statements: 70,
        functions: 70,
        lines: 70,
        branches: 60,
      },
    },
  },
});