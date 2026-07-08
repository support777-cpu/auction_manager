import { expect, test, type Page } from "@playwright/test";
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

async function resumeSavedAuction(page: Page) {
  await expect(page.getByTestId("resume-start-surface")).toBeVisible();
  await expect(page.getByTestId("resume-phase")).toContainText("Initial Auction");
  await page.getByTestId("resume-auction").click();
  await expect(page.getByTestId("auction-board")).toBeVisible();
}

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
  page,
  request
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  test.setTimeout(120_000);
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
  await expect(page.getByTestId("live-status-counters")).toBeVisible();
  await expect(page.getByTestId("live-board-stage")).toBeVisible();
  await expect(page.getByTestId("live-command-strip")).toBeVisible();
  await expect(page.getByTestId("team-matrix")).toBeVisible();
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
  await expect(page.getByTestId("live-board-stage")).toContainText("Aarav Menon");
  await expect(page.getByTestId("live-command-strip")).toContainText("Increase Bid");
  await expect(page.getByTestId("team-matrix")).toContainText("Falcons");
  await expect(page.getByTestId("current-player-name")).toContainText("Aarav Menon");
  await expect(page.getByTestId("current-player-role")).toContainText("Ace");
  await expect(page.getByTestId("current-player-base-price")).toContainText("10");
  await expect(page.getByTestId("current-player-photo-placeholder")).toContainText(
    "Player photo placeholder"
  );
  await expect(page.getByTestId("current-bid")).toContainText("10");
  await expect(page.getByTestId("increase-bid")).toContainText("+5");
  await expect(page.getByTestId("increase-bid")).toBeEnabled();
  await page.waitForFunction(() => document.fonts.ready);
  await page.getByTestId("app-shell").screenshot({
    path: testInfo.outputPath("live-frame-1366x768.png")
  });
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

  await page.getByTestId("mark-sold").click();
  await expect(page.getByTestId("mark-sold-success")).toHaveText(
    "Sold Aarav Menon to Falcons for 20."
  );
  await expect(page.getByTestId("current-player-panel")).toContainText(
    "No Current Player"
  );
  await expect(page.getByTestId("current-bid")).toHaveText("No current bid");
  await expect(page.getByTestId("selected-team")).toContainText("None");
  await expect(page.getByTestId("reveal-next")).toBeEnabled();
  await expect(page.locator(".team-board-grid .team-tile").first()).toContainText(
    "180"
  );
  await expect(page.locator(".team-board-grid .team-tile").first()).toContainText(
    "1"
  );
  await expect(page.locator(".team-board-grid .team-tile").first()).toContainText(
    "1 of 2"
  );

  const stateBeforeRosterSwitch = await request.get("/api/state");
  expect(stateBeforeRosterSwitch.status()).toBe(200);
  const stateBeforeRosterSwitchJson = await stateBeforeRosterSwitch.json();

  await page.getByRole("tab", { name: "Rosters" }).click();
  await expect(page.getByTestId("team-rosters-view")).toBeVisible();
  await expect(page.getByTestId("team-rosters-view")).toContainText("Aarav Menon");
  await expect(page.getByTestId("team-rosters-view")).toContainText("Sold");
  await expect(page.getByTestId("team-rosters-view")).toContainText("20");

  const stateOnRosterView = await request.get("/api/state");
  expect(stateOnRosterView.status()).toBe(200);
  const stateOnRosterViewJson = await stateOnRosterView.json();
  expect(stateOnRosterViewJson.state.teamRosters[0].roster).toContainEqual(
    expect.objectContaining({
      name: "Aarav Menon",
      role: "Ace",
      acquisitionType: "Sold",
      soldPrice: 20
    })
  );
  expect(stateOnRosterViewJson.resume.lastSavedAction).toBe("MarkSold");

  await page.getByRole("tab", { name: "Board" }).click();
  await expect(page.getByTestId("auction-board")).toBeVisible();
  await expect(page.getByTestId("current-player-panel")).toContainText("No Current Player");
  await expect(page.getByTestId("current-bid")).toHaveText("No current bid");
  await expect(page.getByTestId("selected-team")).toContainText("None");
  await expect(page.getByTestId("reveal-next")).toBeEnabled();

  const stateAfterRosterSwitch = await request.get("/api/state");
  expect(stateAfterRosterSwitch.status()).toBe(200);
  const stateAfterRosterSwitchJson = await stateAfterRosterSwitch.json();
  expect(stateAfterRosterSwitchJson.resume.lastSavedAction).toBe(
    stateBeforeRosterSwitchJson.resume.lastSavedAction
  );
  expect(stateAfterRosterSwitchJson.state.teamRosters).toEqual(
    stateBeforeRosterSwitchJson.state.teamRosters
  );
  expect(stateAfterRosterSwitchJson.state.currentPlayer).toEqual(
    stateBeforeRosterSwitchJson.state.currentPlayer
  );
  expect(stateAfterRosterSwitchJson.state.currentBid).toEqual(
    stateBeforeRosterSwitchJson.state.currentBid
  );
  expect(stateAfterRosterSwitchJson.state.selectedTeamId).toEqual(
    stateBeforeRosterSwitchJson.state.selectedTeamId
  );

  await page.reload();
  await resumeSavedAuction(page);
  const resumedAfterSale = await request.get("/api/state");
  expect(resumedAfterSale.status()).toBe(200);
  const resumedAfterSaleJson = await resumedAfterSale.json();
  expect(resumedAfterSaleJson.resume).toMatchObject({
    phase: "InitialAuction",
    lastSavedAction: "MarkSold",
    currentPlayerName: null,
    persistenceFailure: null
  });
  expect(resumedAfterSaleJson.state.teamRosters[0].roster).toContainEqual(
    expect.objectContaining({
      name: "Aarav Menon",
      role: "Ace",
      acquisitionType: "Sold",
      soldPrice: 20
    })
  );
  await expect(page.getByTestId("current-player-panel")).toContainText(
    "No Current Player"
  );
  await expect(page.getByTestId("current-bid")).toHaveText("No current bid");
  await expect(page.getByTestId("selected-team")).toContainText("None");
  await expect(page.getByTestId("reveal-next")).toBeEnabled();
  await expect(page.getByTestId("undo-summary")).toContainText("Undo Mark Sold");

  await page.getByTestId("undo-action").click();
  await expect(page.getByTestId("undo-success")).toHaveText(
    "Undid Mark Sold: Aarav Menon."
  );
  await expect(page.getByTestId("current-player-name")).toContainText("Aarav Menon");
  await expect(page.getByTestId("current-bid")).toHaveText("20");
  await expect(page.getByTestId("selected-team")).toContainText("Falcons");
  await expect(page.locator(".team-board-grid .team-tile").first()).toContainText(
    "200"
  );
  await expect(page.locator(".team-board-grid .team-tile").first()).toContainText(
    "0"
  );
  const undoAfterSaleState = await request.get("/api/state");
  expect(undoAfterSaleState.status()).toBe(200);
  const undoAfterSaleJson = await undoAfterSaleState.json();
  expect(undoAfterSaleJson.resume).toMatchObject({
    lastSavedAction: "Undo",
    currentPlayerName: "Aarav Menon",
    persistenceFailure: null
  });
  expect(undoAfterSaleJson.state.teamRosters[0].roster).toEqual([]);
  expect(undoAfterSaleJson.state.players[0]).toMatchObject({
    name: "Aarav Menon",
    status: "Current",
    soldPrice: null,
    winningTeamId: null,
    acquisitionType: null
  });
  expect(undoAfterSaleJson.state.teams[0]).toMatchObject({
    remainingBudget: 200,
    squadCount: 0
  });

  await page.reload();
  await resumeSavedAuction(page);
  await expect(page.getByTestId("current-player-name")).toContainText("Aarav Menon");
  await expect(page.getByTestId("current-bid")).toHaveText("20");
  await expect(page.getByTestId("selected-team")).toContainText("Falcons");
  await page.getByTestId("mark-sold").click();
  await expect(page.getByTestId("mark-sold-success")).toHaveText(
    "Sold Aarav Menon to Falcons for 20."
  );
  await expect(page.locator(".team-board-grid .team-tile").first()).toContainText(
    "180"
  );

  await page.getByTestId("reveal-next").click();
  await expect(page.getByTestId("current-player-name")).toBeVisible();
  const secondPlayerName =
    (await page.getByTestId("current-player-name").textContent()) ?? "";
  expect(secondPlayerName).not.toContain("Aarav Menon");
  await expect(page.getByTestId("current-bid")).toHaveText("10");
  await page.locator(".team-board-grid .team-tile").first().click();
  await expect(page.getByTestId("selected-team")).toContainText("Falcons");

  for (let increaseCount = 0; increaseCount < 100; increaseCount += 1) {
    if (await page.getByTestId("mark-sold").isDisabled()) {
      break;
    }
    await page.getByTestId("increase-bid").click();
  }

  await expect(page.getByTestId("mark-sold")).toBeDisabled();
  await expect(page.getByTestId("selected-team")).toContainText("Blocked:");
  await expect(page.getByTestId("mark-sold-blocked-reason")).toContainText(
    /Blocked: Falcons have 180 remaining; current bid is \d+\./
  );
  const blockedMessage = (
    await page.getByTestId("mark-sold-blocked-reason").textContent()
  )?.trim();
  expect(blockedMessage).toMatch(
    /^Blocked: Falcons have 180 remaining; current bid is \d+\.$/
  );
  const blockedBid = blockedMessage?.match(/current bid is (\d+)\./)?.[1] ?? "";
  await expect(page.getByTestId("current-bid")).toHaveText(blockedBid);
  await expect(page.getByTestId("selected-team")).toContainText(blockedMessage ?? "");

  const rejectedMarkSold = await request.post("/api/auction/mark-sold", {
    data: { clientCommandId: "e2e-mark-sold-blocked" }
  });
  expect(rejectedMarkSold.status()).toBe(409);
  expect(await rejectedMarkSold.json()).toMatchObject({
    ok: false,
    error: "sale_blocked",
    message: blockedMessage
  });

  await page.reload();
  await resumeSavedAuction(page);
  await expect(page.getByTestId("current-player-name")).toContainText(
    secondPlayerName
  );
  await expect(page.getByTestId("current-bid")).toHaveText(blockedBid ?? "");
  await expect(page.getByTestId("selected-team")).toContainText("Falcons");
  await expect(page.getByTestId("mark-sold-blocked-reason")).toContainText(
    blockedMessage ?? ""
  );

  await teamTiles.nth(1).click();
  await expect(page.getByTestId("selected-team")).toContainText("Tigers");
  await expect(page.getByTestId("team-tile-selected")).toContainText("Tigers");

  await page.reload();
  await resumeSavedAuction(page);
  await expect(page.getByTestId("current-player-name")).toContainText(
    secondPlayerName
  );
  await expect(page.getByTestId("current-bid")).toContainText(blockedBid ?? "");
  await expect(page.getByTestId("selected-team")).toContainText("Tigers");
  await expect(page.getByTestId("team-tile-selected")).toContainText("Tigers");

  await page.getByTestId("clear-selected-team").click();
  await expect(page.getByTestId("selected-team")).toContainText("None");

  await page.reload();
  await resumeSavedAuction(page);
  await expect(page.getByTestId("phase1-progress")).toContainText(
    "Phase 1 in progress"
  );
  await expect(page.getByTestId("phase1-current-category")).toContainText(
    "Current category: Ace Women"
  );
  await expect(page.getByTestId("phase1-ordered-count")).toContainText("8");
  await expect(page.getByTestId("current-player-name")).toContainText(
    secondPlayerName
  );
  await expect(page.getByTestId("current-bid")).toContainText(blockedBid ?? "");
  await expect(page.getByTestId("selected-team")).toContainText("None");

  const falconsTile = page.locator(".team-board-grid .team-tile").first();
  await expect(falconsTile).toContainText("180");
  await expect(falconsTile).toContainText("1");

  await page.getByTestId("mark-unsold").click();
  await expect(page.getByTestId("mark-unsold-success")).toHaveText(
    /Marked unsold\..+ moves to Phase 2 rebid\./
  );
  await expect(page.getByTestId("current-player-panel")).toContainText(
    "No Current Player"
  );
  await expect(page.getByTestId("current-bid")).toHaveText("No current bid");
  await expect(page.getByTestId("selected-team")).toContainText("None");
  await expect(page.getByTestId("reveal-next")).toBeEnabled();
  await expect(page.getByTestId("unsold-pool-summary")).toHaveText(
    "Unsold (Phase 2 rebid): 1"
  );
  await expect(falconsTile).toContainText("180");
  await expect(falconsTile).toContainText("1");
  await expect(falconsTile).not.toContainText("2 of 2");

  await page.reload();
  await resumeSavedAuction(page);
  const resumedAfterUnsold = await request.get("/api/state");
  expect(resumedAfterUnsold.status()).toBe(200);
  const resumedAfterUnsoldJson = await resumedAfterUnsold.json();
  expect(resumedAfterUnsoldJson.resume).toMatchObject({
    phase: "InitialAuction",
    lastSavedAction: "MarkUnsold",
    currentPlayerName: null,
    persistenceFailure: null
  });
  expect(resumedAfterUnsoldJson.state.phase2PoolCount).toBe(1);
  expect(
    resumedAfterUnsoldJson.state.players.filter(
      (player: { status: string }) => player.status === "Pending"
    )
  ).toHaveLength(6);
  await expect(page.getByTestId("unsold-pool-summary")).toHaveText(
    "Unsold (Phase 2 rebid): 1"
  );
  await expect(page.getByTestId("current-player-panel")).toContainText(
    "No Current Player"
  );
  await expect(page.getByTestId("reveal-next")).toBeEnabled();
  await expect(page.getByTestId("undo-summary")).toContainText("Undo Mark Unsold");

  await page.keyboard.press("u");
  await expect(page.getByTestId("undo-success")).toHaveText(
    new RegExp(`Undid Mark Unsold: ${secondPlayerName.trim()}\\.`)
  );
  await expect(page.getByTestId("current-player-name")).toContainText(
    secondPlayerName
  );
  await expect(page.getByTestId("current-bid")).toHaveText(blockedBid ?? "");
  await expect(page.getByTestId("selected-team")).toContainText("None");
  await expect(page.getByTestId("unsold-pool-summary")).toHaveText(
    "Unsold (Phase 2 rebid): 0"
  );
  await expect(falconsTile).toContainText("180");
  await expect(falconsTile).toContainText("1");

  const undoAfterUnsoldState = await request.get("/api/state");
  expect(undoAfterUnsoldState.status()).toBe(200);
  const undoAfterUnsoldJson = await undoAfterUnsoldState.json();
  expect(undoAfterUnsoldJson.resume).toMatchObject({
    lastSavedAction: "Undo",
    currentPlayerName: secondPlayerName.trim(),
    persistenceFailure: null
  });
  expect(undoAfterUnsoldJson.state.phase2PoolCount).toBe(0);
  expect(
    undoAfterUnsoldJson.state.players.find(
      (player: { name: string }) => player.name === secondPlayerName.trim()
    )
  ).toMatchObject({
    status: "Current",
    soldPrice: null,
    winningTeamId: null,
    acquisitionType: null
  });

  await page.reload();
  await resumeSavedAuction(page);
  await expect(page.getByTestId("current-player-name")).toContainText(
    secondPlayerName
  );
  await page.getByTestId("mark-unsold").click();
  await expect(page.getByTestId("mark-unsold-success")).toHaveText(
    /Marked unsold\..+ moves to Phase 2 rebid\./
  );
  await expect(page.getByTestId("unsold-pool-summary")).toHaveText(
    "Unsold (Phase 2 rebid): 1"
  );

  for (let playerIndex = 0; playerIndex < 6; playerIndex += 1) {
    await page.getByTestId("reveal-next").click();
    await expect(page.getByTestId("current-player-name")).toBeVisible();
    await page.getByTestId("mark-unsold").click();
    await expect(page.getByTestId("mark-unsold-success")).toBeVisible();
  }

  await expect(page.getByTestId("phase1-complete")).toContainText("Phase 1 complete.");
  await expect(page.getByTestId("start-unsold-bidding-preview")).toBeDisabled();
  await expect(page.getByTestId("start-unsold-bidding-preview")).toContainText(
    "Start Unsold Bidding will rebid 7 unsold players."
  );
  await expect(page.getByTestId("unsold-pool-summary")).toHaveText(
    "Unsold (Phase 2 rebid): 7"
  );
});
