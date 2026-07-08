import { expect, test, type Locator, type Page } from "@playwright/test";

const parameters = {
  roleBasePrices: {
    Ace: 10,
    Batting: 8,
    Bowling: 6,
    AllRounder: 6,
    Girls: 6
  },
  bidIncrement: 2,
  teamBudget: 170,
  maxSquadSize: 13,
  roleTargets: {
    Ace: 2,
    Batting: 3,
    Bowling: 2,
    AllRounder: 2,
    Girls: 2
  },
  phase1CategoryOrder: [
    "Ace Men",
    "Ace Women",
    "Women All Rounders",
    "Men Bowlers",
    "Men Batsmen",
    "Men All Rounders"
  ],
  manualAssignmentBudgetBehavior: "NoBudgetImpact"
};

const teamNames = [
  "Falcons",
  "Tigers",
  "Royals",
  "Warriors",
  "Lions",
  "Sharks",
  "Eagles",
  "Hurricanes"
] as const;

function createRosterAppState(phase: "InitialAuction" | "Closed") {
  const teams = teamNames.map((name, index) => ({
    id: `team-${index + 1}`,
    name,
    captain: index === 0 ? "Priya Captain" : `${name} Captain`,
    budget: 170,
    remainingBudget: index === 0 ? 160 : index === 1 ? 170 : 150 - index * 4,
    squadCount: index === 0 || index === 1 ? 1 : index % 2,
    roleCounts: {
      Ace: index === 0 ? 1 : 0,
      Batting: index === 1 ? 1 : 0,
      Bowling: 0,
      AllRounder: 0,
      Girls: 0
    },
    currentPlayerCapacity: {
      teamId: `team-${index + 1}`,
      canBuy: true,
      reasons: [] as string[]
    }
  }));

  const state = {
    auctionId: "auction-1",
    phase,
    parameters,
    players: [
      {
        id: "player-1",
        name: "Aarav Menon",
        role: "Ace",
        phase1Category: "Ace Men",
        basePrice: 10,
        status: "Sold",
        soldPrice: 10,
        winningTeamId: "team-1",
        acquisitionType: "Auction"
      },
      {
        id: "player-2",
        name: "Riya Shah",
        role: "Batting",
        phase1Category: "Men Batsmen",
        basePrice: 8,
        status: "Assigned",
        soldPrice: null,
        winningTeamId: "team-2",
        acquisitionType: "ManualAssignment"
      }
    ],
    teams,
    teamRosters: teams.map((team, index) => ({
      teamId: team.id,
      name: team.name,
      captain: team.captain,
      budget: team.budget,
      remainingBudget: team.remainingBudget,
      squadCount: team.squadCount,
      roleCounts: { ...team.roleCounts },
      roster:
        index === 0
          ? [
              {
                playerId: "player-1",
                name: "Aarav Menon",
                role: "Ace",
                acquisitionType: "Sold",
                soldPrice: 10
              }
            ]
          : index === 1
            ? [
                {
                  playerId: "player-2",
                  name: "Riya Shah",
                  role: "Batting",
                  acquisitionType: "ManualAssignment",
                  soldPrice: null
                }
              ]
            : []
    })),
    currentPlayer: null,
    currentBid: null,
    selectedTeamId: null,
    phase1Progress: {
      currentCategory: phase === "Closed" ? null : "Men Batsmen",
      orderedPlayerCount: 8,
      pendingPlayerCount: phase === "Closed" ? 0 : 6,
      revealedPlayerCount: phase === "Closed" ? 8 : 2,
      categories: [
        { category: "Ace Men", total: 1, pending: 0, completed: 1 },
        {
          category: "Men Batsmen",
          total: 7,
          pending: phase === "Closed" ? 0 : 6,
          completed: phase === "Closed" ? 7 : 1
        }
      ]
    },
    canUndo: phase !== "Closed",
    lastUndoAction:
      phase === "Closed"
        ? null
        : {
            command: "MarkSold",
            summary: "Undo Mark Sold: Aarav Menon -> Falcons, 10."
          },
    persistenceFailure: null,
    phase2PoolCount: phase === "Closed" ? 0 : 1
  };

  return {
    mode: "auction" as const,
    state,
    resume: {
      phase,
      lastSavedAction: "MarkSold",
      lastSavedAt: "2026-07-07T08:35:00.000Z",
      pendingPlayerCount: state.phase1Progress.pendingPlayerCount,
      currentPlayerName: null,
      persistenceFailure: null
    }
  };
}

const parameterReview = {
  parameters,
  blockingReasons: [],
  reasonsByField: {},
  startAuctionBlocked: false
};

async function routeRosterState(page: Page, phase: "InitialAuction" | "Closed") {
  await page.route("**/api/state", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(createRosterAppState(phase))
    });
  });
  await page.route("**/api/setup/auction-parameters", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(parameterReview)
    });
  });
}

async function expectWithinFirstViewport(page: Page, locator: Locator) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
}

async function expectNoOverlap(firstLocator: Locator, secondLocator: Locator) {
  const first = await firstLocator.boundingBox();
  const second = await secondLocator.boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();

  const separatedVertically =
    first!.y + first!.height <= second!.y + 1 ||
    second!.y + second!.height <= first!.y + 1;
  const separatedHorizontally =
    first!.x + first!.width <= second!.x + 1 ||
    second!.x + second!.width <= first!.x + 1;
  expect(separatedVertically || separatedHorizontally).toBe(true);
}

async function assertRosterLayout(
  page: Page,
  width: number,
  height: number,
  screenshotName: string,
  testInfo: Parameters<Parameters<typeof test>[1]>[1]
) {
  await page.setViewportSize({ width, height });
  await expect(page.getByTestId("team-rosters-view")).toBeVisible();
  await expect(page.getByTestId("roster-board-header")).toBeVisible();
  await expect(page.getByTestId("board-rosters-switch")).toBeVisible();
  await expect(page.getByTestId("roster-team-grid")).toBeVisible();
  await expect(page.getByTestId("roster-player-row").first()).toBeVisible();
  await expect(page.getByTestId("roster-empty-team").first()).toBeVisible();

  await expectWithinFirstViewport(page, page.getByTestId("live-status-counters"));
  await expectWithinFirstViewport(page, page.getByTestId("board-rosters-switch"));
  await expectWithinFirstViewport(page, page.getByTestId("roster-board-header"));
  await expectWithinFirstViewport(page, page.getByTestId("roster-team-grid"));

  const teamSections = page.getByTestId("roster-team-section");
  await expect(teamSections).toHaveCount(8);
  for (let index = 0; index < 8; index += 1) {
    await expectWithinFirstViewport(page, teamSections.nth(index));
  }

  await expectNoOverlap(
    page.getByTestId("board-rosters-switch"),
    page.getByTestId("roster-board-header")
  );
  await expectNoOverlap(
    page.getByTestId("roster-board-header"),
    page.getByTestId("roster-team-grid")
  );

  await page.waitForFunction(() => document.fonts.ready);
  await page.getByTestId("app-shell").screenshot({
    path: testInfo.outputPath(screenshotName)
  });
}

test("captures live roster board layout at desktop targets", async ({ page }, testInfo) => {
  test.setTimeout(120_000);

  await routeRosterState(page, "InitialAuction");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByTestId("resume-auction").click();
  await page.getByTestId("board-rosters-switch").getByRole("tab", { name: "Teams" }).click();

  await expect(page.getByTestId("roster-board-title")).toHaveText("Teams");
  await expect(page.getByTestId("team-rosters-view")).not.toContainText(
    "private-player@example.com"
  );
  await expect(page.getByTestId("team-rosters-view")).not.toContainText("txn-private-001");

  await assertRosterLayout(
    page,
    1440,
    900,
    "live-rosters-frame-1440x900.png",
    testInfo
  );
  await assertRosterLayout(
    page,
    1366,
    768,
    "live-rosters-frame-1366x768.png",
    testInfo
  );

  await page.setViewportSize({ width: 390, height: 844 });
  const firstTeam = await page.getByTestId("roster-team-section").nth(0).boundingBox();
  const secondTeam = await page.getByTestId("roster-team-section").nth(1).boundingBox();
  expect(firstTeam).not.toBeNull();
  expect(secondTeam).not.toBeNull();
  expect(firstTeam!.y).toBeLessThan(secondTeam!.y);
});

test("captures Closed roster board layout without live commands", async ({ page }, testInfo) => {
  test.setTimeout(120_000);

  await routeRosterState(page, "Closed");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByTestId("resume-auction").click();

  await expect(page.getByTestId("closed-rosters-view")).toBeAttached();
  await expect(page.getByTestId("roster-board-title")).toHaveText("Final Teams");
  await expect(page.getByTestId("live-status-counters")).toContainText("Auction Closed");
  await expect(page.getByTestId("live-command-strip")).toHaveCount(0);
  await page.getByTestId("board-rosters-switch").getByRole("tab", { name: "Auction" }).click();
  await expect(page.getByTestId("auction-board")).toBeVisible();
  await expect(page.getByTestId("live-command-strip")).toHaveCount(0);
  await page.getByTestId("board-rosters-switch").getByRole("tab", { name: "Teams" }).click();

  await assertRosterLayout(
    page,
    1440,
    900,
    "closed-rosters-frame-1440x900.png",
    testInfo
  );
  await assertRosterLayout(
    page,
    1366,
    768,
    "closed-rosters-frame-1366x768.png",
    testInfo
  );

  await page.setViewportSize({ width: 390, height: 844 });
  const firstTeam = await page.getByTestId("roster-team-section").nth(0).boundingBox();
  const secondTeam = await page.getByTestId("roster-team-section").nth(1).boundingBox();
  expect(firstTeam).not.toBeNull();
  expect(secondTeam).not.toBeNull();
  expect(firstTeam!.y).toBeLessThan(secondTeam!.y);
});
