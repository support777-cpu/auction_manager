import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@auction-manager/domain": resolve(projectRoot, "packages/domain/src/index.ts"),
      "@auction-manager/imports": resolve(projectRoot, "packages/imports/src/index.ts"),
      "@auction-manager/persistence": resolve(
        projectRoot,
        "packages/persistence/src/index.ts"
      ),
      "@auction-manager/shared": resolve(projectRoot, "packages/shared/src/index.ts"),
      "@auction-manager/test-fixtures": resolve(
        projectRoot,
        "packages/test-fixtures/src/index.ts"
      )
    }
  },
  test: {
    include: ["apps/**/*.{test,spec}.{ts,tsx}", "packages/**/*.{test,spec}.ts"],
    exclude: ["apps/web/e2e/**", "**/dist/**", "**/node_modules/**"],
    environment: "node",
    environmentMatchGlobs: [["apps/web/src/**/*.test.tsx", "jsdom"]],
    setupFiles: ["./apps/web/src/test-setup.ts"]
  }
});
