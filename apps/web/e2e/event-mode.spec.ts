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
const validTeamCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/teams-valid.csv"
);
const invalidTeamCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/teams-invalid.csv"
);
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64"
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

test("uploads Player photos in event mode and keeps missing photos non-blocking", async ({
  page
}) => {
  await page.goto("/");

  await page.getByTestId("player-csv-input").setInputFiles({
    name: "players-valid.csv",
    mimeType: "text/csv",
    buffer: await readFile(validCsvPath)
  });
  await expect(page.getByTestId("player-csv-summary")).toContainText("8 imported");

  await page.getByTestId("player-photos-input").setInputFiles([
    {
      name: "aarav_menon.jpg",
      mimeType: "image/jpeg",
      buffer: tinyPng
    }
  ]);

  await expect(page.getByTestId("player-photos-summary")).toContainText("1 matched");
  await expect(page.getByTestId("player-photos-summary")).toContainText("7 placeholders");
  await expect(page.getByTestId("import-issue-group-can_proceed_with_placeholder")).toContainText(
    "Dev Patel has no matched photo; player placeholder will be used."
  );
  await expect(page.getByTestId("setup-start-auction")).toBeDisabled();
  await expect(page.getByTestId("start-auction-blocker")).not.toContainText(/photo/i);
});

test("keeps Start Auction blocked for invalid Team CSV in event mode", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("player-csv-input").setInputFiles({
    name: "players-valid.csv",
    mimeType: "text/csv",
    buffer: await readFile(validCsvPath)
  });
  await expect(page.getByTestId("player-csv-summary")).toContainText("8 imported");

  await page.getByTestId("team-csv-input").setInputFiles({
    name: "teams-invalid.csv",
    mimeType: "text/csv",
    buffer: await readFile(invalidTeamCsvPath)
  });

  await expect(page.getByTestId("team-csv-summary")).toContainText("3 must fix");
  await expect(page.getByTestId("import-issues-table")).toContainText(
    "Row 2 is missing Team Name."
  );
  await expect(page.getByTestId("start-auction-blocker")).toContainText(
    "Blocked: 3 Team CSV issues must be fixed in the source CSV and reimported."
  );
  await expect(page.getByTestId("setup-start-auction")).toBeDisabled();
});

test("uploads Team logos in event mode and keeps missing logos non-blocking", async ({
  page
}) => {
  await page.goto("/");

  await page.getByTestId("player-csv-input").setInputFiles({
    name: "players-valid.csv",
    mimeType: "text/csv",
    buffer: await readFile(validCsvPath)
  });
  await expect(page.getByTestId("player-csv-summary")).toContainText("8 imported");

  await page.getByTestId("team-csv-input").setInputFiles({
    name: "teams-valid.csv",
    mimeType: "text/csv",
    buffer: await readFile(validTeamCsvPath)
  });
  await expect(page.getByTestId("team-csv-summary")).toContainText("4 imported");
  await expect(page.getByTestId("team-preview-row-2")).toContainText("Falcons");
  await expect(page.getByTestId("team-preview-row-2")).toContainText("Priya Captain");

  await page.getByTestId("team-logos-input").setInputFiles([
    {
      name: "falcons.png",
      mimeType: "image/png",
      buffer: tinyPng
    }
  ]);

  await expect(page.getByTestId("team-logos-summary")).toContainText("1 matched");
  await expect(page.getByTestId("team-logos-summary")).toContainText("3 placeholders");
  await expect(page.getByTestId("import-issue-group-can_proceed_with_placeholder")).toContainText(
    "Tigers has no matched logo; team placeholder will be used."
  );
  await expect(page.getByTestId("team-logos-summary")).toContainText(
    "Start Auction is not blocked by missing logos."
  );
  await expect(page.getByTestId("setup-start-auction")).toBeDisabled();
  await expect(page.getByTestId("start-auction-blocker")).not.toContainText(/logo/i);
});
