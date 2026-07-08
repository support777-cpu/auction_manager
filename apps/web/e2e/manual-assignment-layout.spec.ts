import { expect, test, type Page } from "@playwright/test";

const manualAssignmentAppState = {
  mode: "auction" as const,
  state: {
    auctionId: "auction-1",
    phase: "ManualAssignment",
    parameters: {
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
    },
    players: [
      {
        id: "player-1",
        name: "Nisha George",
        role: "Girls",
        phase1Category: "Ace Women",
        basePrice: 8,
        status: "Current",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      },
      {
        id: "player-2",
        name: "Rohan Iyer",
        role: "Bowling",
        phase1Category: "Men Bowlers",
        basePrice: 6,
        status: "Unsold",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      },
      {
        id: "player-3",
        name: "Kevin Thomas",
        role: "Batting",
        phase1Category: "Men Batsmen",
        basePrice: 8,
        status: "Unsold",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      },
      {
        id: "player-4",
        name: "Meera Paul",
        role: "Girls",
        phase1Category: "Ace Women",
        basePrice: 8,
        status: "Unsold",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      },
      {
        id: "player-5",
        name: "Assigned Player",
        role: "Ace",
        phase1Category: "Ace Men",
        basePrice: 10,
        status: "Assigned",
        soldPrice: null,
        winningTeamId: "team-3",
        acquisitionType: "ManualAssignment"
      }
    ],
    teams: [
      {
        id: "team-1",
        name: "Eagles",
        captain: "Eagles Captain",
        budget: 170,
        remainingBudget: 84,
        squadCount: 5,
        roleCounts: { Ace: 0, Batting: 1, Bowling: 1, AllRounder: 1, Girls: 2 },
        currentPlayerCapacity: { teamId: "team-1", canBuy: true, reasons: [] }
      },
      {
        id: "team-2",
        name: "Lions",
        captain: "Lions Captain",
        budget: 170,
        remainingBudget: 52,
        squadCount: 8,
        roleCounts: { Ace: 0, Batting: 1, Bowling: 1, AllRounder: 1, Girls: 3 },
        currentPlayerCapacity: {
          teamId: "team-2",
          canBuy: false,
          reasons: ["Girls slot full."]
        }
      },
      {
        id: "team-3",
        name: "Falcons",
        captain: "Falcons Captain",
        budget: 170,
        remainingBudget: 80,
        squadCount: 5,
        roleCounts: { Ace: 0, Batting: 1, Bowling: 1, AllRounder: 1, Girls: 1 },
        currentPlayerCapacity: { teamId: "team-3", canBuy: true, reasons: [] }
      },
      {
        id: "team-4",
        name: "Warriors",
        captain: "Warriors Captain",
        budget: 170,
        remainingBudget: 76,
        squadCount: 6,
        roleCounts: { Ace: 0, Batting: 1, Bowling: 1, AllRounder: 1, Girls: 2 },
        currentPlayerCapacity: { teamId: "team-4", canBuy: true, reasons: [] }
      },
      {
        id: "team-5",
        name: "Titans",
        captain: "Titans Captain",
        budget: 170,
        remainingBudget: 72,
        squadCount: 7,
        roleCounts: { Ace: 0, Batting: 1, Bowling: 1, AllRounder: 1, Girls: 2 },
        currentPlayerCapacity: { teamId: "team-5", canBuy: true, reasons: [] }
      },
      {
        id: "team-6",
        name: "Royals",
        captain: "Royals Captain",
        budget: 170,
        remainingBudget: 60,
        squadCount: 8,
        roleCounts: { Ace: 0, Batting: 1, Bowling: 1, AllRounder: 1, Girls: 2 },
        currentPlayerCapacity: {
          teamId: "team-6",
          canBuy: false,
          reasons: ["squad cap reached."]
        }
      },
      {
        id: "team-7",
        name: "Strikers",
        captain: "Strikers Captain",
        budget: 170,
        remainingBudget: 64,
        squadCount: 6,
        roleCounts: { Ace: 0, Batting: 1, Bowling: 1, AllRounder: 1, Girls: 2 },
        currentPlayerCapacity: { teamId: "team-7", canBuy: true, reasons: [] }
      },
      {
        id: "team-8",
        name: "Kings",
        captain: "Kings Captain",
        budget: 170,
        remainingBudget: 68,
        squadCount: 7,
        roleCounts: { Ace: 0, Batting: 1, Bowling: 1, AllRounder: 1, Girls: 2 },
        currentPlayerCapacity: { teamId: "team-8", canBuy: true, reasons: [] }
      }
    ],
    teamRosters: [
      "team-1",
      "team-2",
      "team-3",
      "team-4",
      "team-5",
      "team-6",
      "team-7",
      "team-8"
    ].map((teamId, index) => ({
      teamId,
      name: [
        "Eagles",
        "Lions",
        "Falcons",
        "Warriors",
        "Titans",
        "Royals",
        "Strikers",
        "Kings"
      ][index],
      captain: [
        "Eagles Captain",
        "Lions Captain",
        "Falcons Captain",
        "Warriors Captain",
        "Titans Captain",
        "Royals Captain",
        "Strikers Captain",
        "Kings Captain"
      ][index],
      budget: 170,
      remainingBudget: [84, 52, 80, 76, 72, 60, 64, 68][index],
      squadCount: [5, 8, 5, 6, 7, 8, 6, 7][index],
      roleCounts: { Ace: 0, Batting: 1, Bowling: 1, AllRounder: 1, Girls: 2 },
      roster: []
    })),
    currentPlayer: {
      id: "player-1",
      name: "Nisha George",
      role: "Girls",
      phase1Category: "Ace Women",
      basePrice: 8,
      status: "Current",
      soldPrice: null,
      winningTeamId: null,
      acquisitionType: null
    },
    currentBid: null,
    selectedTeamId: "team-3",
    phase1Progress: {
      currentCategory: null,
      orderedPlayerCount: 8,
      pendingPlayerCount: 0,
      revealedPlayerCount: 8,
      categories: []
    },
    canUndo: false,
    lastUndoAction: null,
    persistenceFailure: null,
    phase2PoolCount: 0
  },
  resume: {
    phase: "ManualAssignment",
    lastSavedAction: "RevealNextPlayer",
    lastSavedAt: "2026-07-07T08:35:00.000Z",
    pendingPlayerCount: 0,
    currentPlayerName: "Nisha George",
    persistenceFailure: null
  }
};

const parameterReview = {
  parameters: manualAssignmentAppState.state.parameters,
  blockingReasons: [],
  reasonsByField: {},
  startAuctionBlocked: false
};

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

async function expectNoOverlap(
  first: NonNullable<Awaited<ReturnType<ReturnType<Page["getByTestId"]>["boundingBox"]>>>,
  second: NonNullable<Awaited<ReturnType<ReturnType<Page["getByTestId"]>["boundingBox"]>>>
) {
  const separatedVertically =
    first.y + first.height <= second.y + 1 || second.y + second.height <= first.y + 1;
  const separatedHorizontally =
    first.x + first.width <= second.x + 1 || second.x + second.width <= first.x + 1;
  expect(separatedVertically || separatedHorizontally).toBe(true);
}

test("fits mocked manual assignment surface in the first viewport at 1440x900 and 1366x768", async ({
  page
}, testInfo) => {
  test.setTimeout(120_000);

  await page.route("**/api/state", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(manualAssignmentAppState)
    });
  });
  await page.route("**/api/setup/auction-parameters", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(parameterReview)
    });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByTestId("resume-start-surface")).toBeVisible();
  await page.getByTestId("resume-auction").click();

  await expect(page.getByTestId("manual-assignment-surface")).toBeVisible();
  await expect(page.getByTestId("manual-assignment-counters")).toBeVisible();
  await expect(page.getByTestId("manual-pool-count")).toHaveText("5");
  await expect(page.getByTestId("manual-assignment-player-card")).toBeVisible();
  await expect(page.getByTestId("manual-assignment-pool")).toBeVisible();
  await expect(page.getByTestId("manual-assignment-team-matrix")).toBeVisible();
  await expect(page.getByTestId("manual-assignment-blocked-reason")).toBeVisible();
  await expect(page.getByTestId("manual-assignment-command")).toBeDisabled();
  for (const privateValue of [
    "private-player@example.com",
    "+1-555-0100",
    "UPI-PRIVATE",
    "paid_via_upi",
    "txn-abc-123"
  ]) {
    await expect(page.getByTestId("manual-assignment-surface")).not.toContainText(privateValue);
  }
  await expect(page.getByTestId("live-command-strip")).toHaveCount(0);

  async function assertFirstViewportFit(width: number, height: number, screenshotName: string) {
    await page.setViewportSize({ width, height });
    await expect(page.getByTestId("manual-assignment-surface")).toBeVisible();

    await expectWithinFirstViewport(page, page.getByTestId("manual-assignment-counters"));
    await expectWithinFirstViewport(page, page.getByTestId("manual-assignment-player-card"));
    await expectWithinFirstViewport(page, page.getByTestId("manual-assignment-pool"));
    await expectWithinFirstViewport(page, page.getByTestId("manual-assignment-command"));
    await expectWithinFirstViewport(page, page.getByTestId("manual-assignment-team-matrix"));
    await expectWithinFirstViewport(page, page.getByTestId("manual-assignment-blocked-reason"));

    const layoutAnchors = [
      page.getByTestId("manual-assignment-counters"),
      page.getByTestId("manual-assignment-player-card"),
      page.getByTestId("manual-assignment-pool"),
      page.getByTestId("manual-assignment-command"),
      page.getByTestId("manual-assignment-team-matrix"),
      page.getByTestId("manual-assignment-blocked-reason")
    ];
    const layoutBoxes = await Promise.all(
      layoutAnchors.map(async (anchor) => {
        const box = await anchor.boundingBox();
        expect(box).not.toBeNull();
        return box!;
      })
    );
    const overlapPairs = [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [2, 3],
      [2, 4],
      [2, 5],
      [3, 4],
      [3, 5]
    ];
    for (const [firstIndex, secondIndex] of overlapPairs) {
      await expectNoOverlap(layoutBoxes[firstIndex]!, layoutBoxes[secondIndex]!);
    }

    await page.waitForFunction(() => document.fonts.ready);
    await page.getByTestId("app-shell").screenshot({
      path: testInfo.outputPath(screenshotName)
    });
  }

  await assertFirstViewportFit(
    1440,
    900,
    "manual-assignment-frame-1440x900.png"
  );
  await assertFirstViewportFit(
    1366,
    768,
    "manual-assignment-frame-1366x768.png"
  );
});

test("stacks manual assignment surface sections at 390x844", async ({ page }) => {
  test.setTimeout(120_000);

  await page.route("**/api/state", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(manualAssignmentAppState)
    });
  });
  await page.route("**/api/setup/auction-parameters", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(parameterReview)
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByTestId("resume-auction").click();

  await expect(page.getByTestId("manual-assignment-surface")).toBeVisible();
  const countersBox = await page.getByTestId("manual-assignment-counters").boundingBox();
  const playerBox = await page.getByTestId("manual-assignment-player-card").boundingBox();
  const poolBox = await page.getByTestId("manual-assignment-pool").boundingBox();
  const commandBox = await page.getByTestId("manual-assignment-command").boundingBox();
  const matrixBox = await page.getByTestId("manual-assignment-team-matrix").boundingBox();
  const blockedBox = await page.getByTestId("manual-assignment-blocked-reason").boundingBox();

  expect(countersBox).not.toBeNull();
  expect(playerBox).not.toBeNull();
  expect(poolBox).not.toBeNull();
  expect(commandBox).not.toBeNull();
  expect(matrixBox).not.toBeNull();
  expect(blockedBox).not.toBeNull();

  expect(countersBox!.y).toBeLessThan(playerBox!.y);
  expect(playerBox!.y).toBeLessThan(poolBox!.y);
  expect(poolBox!.y).toBeLessThan(commandBox!.y);
  expect(commandBox!.y).toBeLessThan(matrixBox!.y);
  expect(matrixBox!.y).toBeLessThan(blockedBox!.y);
});
