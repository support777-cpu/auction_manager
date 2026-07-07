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
  await expect(page.getByTestId("setup-start-auction")).toBeDisabled();
  await expect(page.getByTestId("start-auction-blocker")).not.toContainText(/logo/i);
});

test("blocks Start Auction when an imported role base price is missing", async ({ page }) => {
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

  await page.getByTestId("role-base-price-Bowling").fill("");
  await page.getByTestId("auction-parameters-save").click();

  await expect(page.locator(".parameter-errors")).toContainText(
    "Base price is missing for Bowling."
  );
  await expect(page.getByTestId("start-auction-blocker")).toContainText(
    "Blocked: Auction Parameters need attention."
  );
  await expect(page.getByTestId("setup-start-auction")).toBeDisabled();
});

test("reviews and saves auction parameters before starting the auction", async ({
  page
}) => {
  await page.goto("/");

  await expect(page.getByTestId("setup-auction-parameters")).toBeVisible();
  await expect(page.getByTestId("auction-parameters-summary")).toContainText("Ace 10", {
    timeout: 10000
  });
  await expect(page.getByTestId("auction-parameters-summary")).toContainText(
    "Increment 2; Team budget 170"
  );

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

  await page.getByTestId("bid-increment-input").fill("0");
  await page.getByTestId("auction-parameters-save").click();

  await expect(page.locator(".parameter-errors")).toContainText(
    "Bid increment must be a positive integer."
  );
  await expect(page.getByTestId("start-auction-blocker")).toContainText(
    "Blocked: Auction Parameters need attention."
  );
  await expect(page.getByTestId("setup-start-auction")).toBeDisabled();

  await page.getByTestId("bid-increment-input").fill("5");
  await page.getByTestId("team-budget-input").fill("200");
  await page.getByTestId("auction-parameters-save").click();

  await expect(page.getByTestId("auction-parameters-summary")).toContainText(
    "Increment 5; Team budget 200"
  );
  await expect(page.getByTestId("setup-start-auction")).toBeEnabled();

  await page.getByTestId("setup-start-auction").click();

  await expect(page.getByTestId("auction-board")).toBeVisible();
  await expect(page.getByTestId("phase-indicator")).toContainText("Initial Auction");
  await expect(page.getByTestId("current-player-panel")).toContainText(
    "No Current Player"
  );
  await expect(page.getByTestId("phase1-progress")).toContainText(
    "Phase 1 order ready"
  );
  await expect(page.getByTestId("phase1-current-category")).toContainText(
    "Current category: Ace Men"
  );
  await expect(page.getByTestId("phase1-ordered-count")).toContainText("8");
  await expect(page.getByTestId("current-bid")).toContainText("No current bid");
  await expect(page.getByTestId("reveal-next")).toBeEnabled();
  await expect(page.locator(".team-board-grid .team-tile")).toHaveCount(4);
  await expect(page.getByTestId("auction-board")).not.toContainText(
    "private-player@example.com"
  );
  await expect(page.getByTestId("auction-board")).not.toContainText("UPI-PRIVATE");

  await page.getByTestId("reveal-next").evaluate((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("Reveal Next control is not a button.");
    }
    button.click();
    button.click();
  });

  await expect(page.getByTestId("current-player-panel")).toContainText("Aarav Menon");
  await expect(page.getByTestId("current-player-name")).toContainText("Aarav Menon");
  await expect(page.getByTestId("current-player-role")).toContainText("Ace");
  await expect(page.getByTestId("current-player-base-price")).toContainText("10");
  await expect(page.getByTestId("current-player-photo-placeholder")).toContainText(
    "Player photo placeholder"
  );
  await expect(page.getByTestId("current-bid")).toContainText("10");
  await expect(page.getByTestId("increase-bid")).toContainText("+5");
  await expect(page.getByTestId("increase-bid")).toBeEnabled();
  await page.getByTestId("increase-bid").click();
  await expect(page.getByTestId("current-bid")).toHaveText("15");
  await page.keyboard.press("+");
  await expect(page.getByTestId("current-bid")).toHaveText("20");
  await expect(page.getByTestId("phase1-progress")).toContainText(
    "Phase 1 in progress"
  );
  await expect(page.getByTestId("phase1-pending-count")).toHaveText("7");
  await expect(page.getByTestId("phase1-revealed-count")).toHaveText("1");
  await expect(page.getByTestId("reveal-next")).toBeDisabled();
  await expect(page.getByTestId("auction-board")).not.toContainText(
    "private-player@example.com"
  );
  await expect(page.getByTestId("auction-board")).not.toContainText("UPI-PRIVATE");
  await expect(page.getByTestId("selected-team")).toContainText("None");
  await expect(page.getByTestId("team-logo-placeholder").first()).toContainText(
    "Team logo placeholder"
  );
  await expect(page.getByTestId("team-tile").first()).toContainText("0 of 2");

  const teamTiles = page.locator(".team-board-grid .team-tile");
  await teamTiles.first().click();
  await expect(page.getByTestId("selected-team")).toContainText("Falcons");
  await expect(page.getByTestId("team-tile-selected")).toContainText("Falcons");

  await teamTiles.nth(1).click();
  await expect(page.getByTestId("selected-team")).toContainText("Tigers");
  await expect(page.getByTestId("team-tile-selected")).toContainText("Tigers");

  await page.reload();

  await expect(page.getByTestId("auction-board")).toBeVisible();
  await expect(page.getByTestId("current-player-name")).toContainText("Aarav Menon");
  await expect(page.getByTestId("current-bid")).toContainText("20");
  await expect(page.getByTestId("selected-team")).toContainText("Tigers");
  await expect(page.getByTestId("team-tile-selected")).toContainText("Tigers");

  await page.getByTestId("clear-selected-team").click();
  await expect(page.getByTestId("selected-team")).toContainText("None");

  await page.reload();

  await expect(page.getByTestId("auction-board")).toBeVisible();
  await expect(page.getByTestId("phase1-progress")).toContainText(
    "Phase 1 in progress"
  );
  await expect(page.getByTestId("phase1-current-category")).toContainText(
    "Current category: Ace Men"
  );
  await expect(page.getByTestId("phase1-ordered-count")).toContainText("8");
  await expect(page.getByTestId("current-player-name")).toContainText("Aarav Menon");
  await expect(page.getByTestId("current-bid")).toContainText("20");
  await expect(page.getByTestId("selected-team")).toContainText("None");
});
