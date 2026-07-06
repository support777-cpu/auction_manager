import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "apps/**/src/**/*.{test,spec}.{ts,tsx}",
      "packages/**/src/**/*.{test,spec}.{ts,tsx}"
    ],
    passWithNoTests: true,
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
