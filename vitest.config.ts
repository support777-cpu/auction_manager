import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
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
    include: ["apps/**/*.{test,spec}.ts", "packages/**/*.{test,spec}.ts"],
    exclude: ["apps/web/e2e/**", "**/dist/**", "**/node_modules/**"]
  }
});
