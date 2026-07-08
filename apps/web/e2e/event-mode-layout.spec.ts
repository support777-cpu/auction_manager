import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const validCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/players-valid.csv"
);
const teamsEightValidCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/teams-eight-valid.csv"
);

async function expectWithinFirstViewport(
  page: Page,
  locator: ReturnType<Page["getByTestId"]>
) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
}

test("fits eight-team live board in the first viewport at 1440x900 and 1366x768", async ({
  page
}, testInfo) => {
  test.setTimeout(120_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await page.getByTestId("player-csv-input").setInputFiles({
    name: "players-valid.csv",
    mimeType: "text/csv",
    buffer: await readFile(validCsvPath)
  });
  await expect(page.getByTestId("player-csv-summary")).toContainText("8 imported");

  await page.getByTestId("team-csv-input").setInputFiles({
    name: "teams-eight-valid.csv",
    mimeType: "text/csv",
    buffer: await readFile(teamsEightValidCsvPath)
  });
  await expect(page.getByTestId("team-csv-summary")).toContainText("8 imported");

  await page.getByTestId("auction-parameters-save").click();
  await expect(page.getByTestId("setup-start-auction")).toBeEnabled();
  await page.getByTestId("setup-start-auction").click();

  await expect(page.getByTestId("live-status-counters")).toBeVisible();
  await expect(page.getByTestId("live-teams-counter")).toHaveText("8");
  await page.getByTestId("reveal-next").click();
  await expect(page.getByTestId("current-player-name")).toBeVisible();
  await expect(page.getByTestId("auction-board")).not.toContainText(
    "private-player@example.com"
  );
  await expect(page.getByTestId("auction-board")).not.toContainText("UPI-PRIVATE");

  const teamTiles = page.locator('[data-testid="team-tile"], [data-testid="team-tile-selected"]');
  await expect(teamTiles).toHaveCount(8);

  async function assertFirstViewportFit(width: number, height: number, screenshotName: string) {
    await page.setViewportSize({ width, height });
    await expect(page.getByTestId("auction-board")).toBeVisible();

    await expectWithinFirstViewport(page, page.getByTestId("live-status-counters"));
    await expectWithinFirstViewport(page, page.getByTestId("live-board-stage"));
    await expectWithinFirstViewport(page, page.getByTestId("current-player-panel"));
    await expectWithinFirstViewport(page, page.getByTestId("current-bid"));
    await expectWithinFirstViewport(page, page.getByTestId("live-command-strip"));
    await expectWithinFirstViewport(page, page.getByTestId("mark-sold"));
    await expectWithinFirstViewport(page, page.getByTestId("increase-bid"));
    await expectWithinFirstViewport(page, page.getByTestId("team-matrix"));
    await expectWithinFirstViewport(page, page.getByTestId("selected-team"));
    const outcomeRegion = page.getByTestId("live-outcome-region");
    if ((await outcomeRegion.count()) > 0 && (await outcomeRegion.isVisible())) {
      await expectWithinFirstViewport(page, outcomeRegion);
    }

    for (let index = 0; index < 8; index += 1) {
      await expectWithinFirstViewport(page, teamTiles.nth(index));
    }

    await page.waitForFunction(() => document.fonts.ready);
    await page.getByTestId("app-shell").screenshot({
      path: testInfo.outputPath(screenshotName)
    });
  }

  await assertFirstViewportFit(1440, 900, "live-frame-1440x900-eight-teams.png");
  await assertFirstViewportFit(1366, 768, "live-frame-1366x768-eight-teams.png");

  await teamTiles.first().click();
  await expect(page.getByTestId("selected-team")).toContainText("Falcons is bidding");

  for (let increaseCount = 0; increaseCount < 100; increaseCount += 1) {
    if (await page.getByTestId("mark-sold").isDisabled()) {
      break;
    }
    await page.getByTestId("increase-bid").click();
  }

  await expect(page.getByTestId("mark-sold")).toBeDisabled();
  await expect(page.getByTestId("mark-sold-blocked-reason")).toContainText(
    /Blocked: Falcons have \d+ remaining; current bid is \d+\./
  );

  for (const size of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 }
  ]) {
    await page.setViewportSize(size);
    await expectWithinFirstViewport(page, page.getByTestId("live-command-strip"));
    await expectWithinFirstViewport(page, page.getByTestId("mark-sold-blocked-reason"));
    await expectWithinFirstViewport(page, page.getByTestId("team-tile-selected"));
  }
});
