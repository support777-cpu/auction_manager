import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const requiredWorkspacePaths = [
  "apps/web",
  "apps/server",
  "packages/domain",
  "packages/persistence",
  "packages/imports",
  "packages/shared",
  "packages/test-fixtures"
];

const runtimeManifestPaths = [
  "apps/web/package.json",
  "apps/server/package.json",
  "packages/domain/package.json",
  "packages/persistence/package.json",
  "packages/imports/package.json",
  "packages/shared/package.json"
];

type PackageManifest = {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

describe("workspace boundaries", () => {
  it("keeps the architecture-defined workspace paths", () => {
    const missingPaths = requiredWorkspacePaths.filter(
      (workspacePath) => !existsSync(join(process.cwd(), workspacePath))
    );

    expect(missingPaths).toEqual([]);
  });

  it("keeps test fixtures out of runtime package dependencies", async () => {
    const offendingManifests: string[] = [];

    for (const manifestPath of runtimeManifestPaths) {
      const manifest = JSON.parse(
        await readFile(join(process.cwd(), manifestPath), "utf8")
      ) as PackageManifest;
      const runtimeDependencyNames = [
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.optionalDependencies ?? {})
      ];

      if (runtimeDependencyNames.includes("@auction-manager/test-fixtures")) {
        offendingManifests.push(manifestPath);
      }
    }

    expect(offendingManifests).toEqual([]);
  });
});
