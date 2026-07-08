import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const eventDataDirectory = mkdtempSync(join(tmpdir(), "auction-manager-event-layout-"));

export default defineConfig({
  testDir: "./apps/web/e2e",
  testMatch: "**/{event-mode-layout,manual-assignment-layout,roster-layout}.spec.ts",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html"], ["line"]] : "list",
  webServer: {
    command: `DATA_DIRECTORY=${eventDataDirectory} PORT=4175 npm run start:event`,
    url: "http://127.0.0.1:4175/api/health",
    reuseExistingServer: false,
    timeout: 120_000
  },
  use: {
    baseURL: "http://127.0.0.1:4175",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
