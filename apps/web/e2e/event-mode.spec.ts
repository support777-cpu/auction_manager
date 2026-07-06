import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const validCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/players-valid.csv"
);
const invalidCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/players-invalid.csv"
);

test("serves the app shell and health endpoint from event mode", async ({
  page,
  request
}) => {
  const health = await request.get("/api/health");

  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({
    ok: true,
    service: "auction-manager",
    mode: "event"
  });

  await page.goto("/");

  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByTestId("setup-empty-state")).toContainText("No auction is loaded");
  await expect(page.getByTestId("setup-start")).toBeVisible();
});

test("previews valid Player CSV through the event-mode API", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("player-csv-input").setInputFiles({
    name: "players-valid.csv",
    mimeType: "text/csv",
    buffer: await readFile(validCsvPath)
  });

  await expect(page.getByTestId("player-csv-summary")).toContainText("8 imported");
  await expect(page.getByTestId("player-preview-row-2")).toContainText("Aarav Menon");
  await expect(page.getByTestId("player-preview-row-2")).toContainText("Ace Men");
  await expect(page.getByTestId("setup-player-csv")).not.toContainText(
    "private-player@example.com"
  );
  await expect(page.getByTestId("setup-player-csv")).not.toContainText("UPI-PRIVATE");
  await expect(page.getByTestId("setup-start-auction")).toBeDisabled();
});

test("keeps Start Auction blocked for invalid Player CSV in event mode", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("player-csv-input").setInputFiles({
    name: "players-invalid.csv",
    mimeType: "text/csv",
    buffer: await readFile(invalidCsvPath)
  });

  await expect(page.getByTestId("player-csv-summary")).toContainText("4 must fix");
  await expect(page.getByTestId("import-issues-table")).toContainText(
    "Row 2 is missing Full Name."
  );
  await expect(page.getByTestId("start-auction-blocker")).toContainText(
    "Blocked: 4 Player CSV issues must be fixed in the source CSV and reimported."
  );
  await expect(page.getByTestId("setup-start-auction")).toBeDisabled();
});
