import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.test.js"],
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.js"],
      exclude: ["src/server.js"],
      reporter: ["text", "html", "json-summary"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    }
  }
});
