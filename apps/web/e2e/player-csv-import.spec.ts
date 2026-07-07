import { expect, test, type Page } from "@playwright/test";

const defaultParameters = {
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

async function mockSetupSupportRoutes(page: Page) {
  let playerCsvReview: typeof validReview | typeof invalidReview | null = null;

  await page.route("**/api/setup/auction-parameters", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: {
          parameters: defaultParameters,
          blockingReasons: [
            {
              id: "no-imported-teams",
              code: "no_imported_teams",
              field: "teamBudget",
              message:
                "Team CSV must be imported before Auction Parameters can be validated."
            }
          ],
          reasonsByField: {},
          startAuctionBlocked: true
        }
      });
      return;
    }

    await route.continue();
  });

  await page.route("**/api/setup/auction-parameters/preview", async (route) => {
    await route.fulfill({
      json: {
        parameters: defaultParameters,
        blockingReasons: [],
        reasonsByField: {},
        startAuctionBlocked: false
      }
    });
  });

  await page.route("**/api/setup/readiness", async (route) => {
    if (!playerCsvReview) {
      await route.fulfill({
        json: {
          startAuctionBlocked: true,
          primaryBlockerMessage:
            "Blocked: Player CSV must be imported before Start Auction.",
          blockerMessages: [
            "Blocked: Player CSV must be imported before Start Auction."
          ],
          story16Ready: false
        }
      });
      return;
    }

    if (playerCsvReview.summary.startAuctionBlocked) {
      const message = `Blocked: ${playerCsvReview.summary.mustFixCount} Player CSV issue must be fixed in the source CSV and reimported.`;
      await route.fulfill({
        json: {
          startAuctionBlocked: true,
          primaryBlockerMessage: message,
          blockerMessages: [message],
          story16Ready: false
        }
      });
      return;
    }

    await route.fulfill({
      json: {
        startAuctionBlocked: true,
        primaryBlockerMessage: "Blocked: Team CSV must be imported before Start Auction.",
        blockerMessages: ["Blocked: Team CSV must be imported before Start Auction."],
        story16Ready: false
      }
    });
  });

  await page.route("**/api/setup/player-csv/preview", async (route) => {
    const body = route.request().postData() ?? "";
    playerCsvReview = body.includes("Aarav Menon") ? validReview : invalidReview;
    await route.fulfill({ json: playerCsvReview });
  });
}

const validReview = {
  players: [
    {
      sourceRowNumber: 2,
      name: "Aarav Menon",
      gender: "Male",
      role: "Ace",
      phase1Category: "Ace Men"
    },
    {
      sourceRowNumber: 3,
      name: "Neha Rao",
      gender: "Female",
      role: "Ace",
      phase1Category: "Ace Women"
    }
  ],
  issueGroups: [
    {
      severity: "must_fix",
      count: 0,
      issues: []
    },
    {
      severity: "can_proceed_with_placeholder",
      count: 0,
      issues: []
    },
    {
      severity: "ignored_source_field",
      count: 2,
      issues: [
        {
          id: "ignored-email",
          severity: "ignored_source_field",
          code: "ignored_source_field",
          message: "Email is accepted from registration exports but ignored for auction setup.",
          sourceColumn: "Email"
        },
        {
          id: "ignored-payment-transaction-id",
          severity: "ignored_source_field",
          code: "ignored_source_field",
          message:
            "Payment Transaction Id is accepted from registration exports but ignored for auction setup.",
          sourceColumn: "Payment Transaction Id"
        }
      ]
    }
  ],
  summary: {
    totalRows: 2,
    importedPlayers: 2,
    mustFixCount: 0,
    canProceedWithPlaceholderCount: 0,
    ignoredSourceFieldCount: 2,
    startAuctionBlocked: false
  }
};

const invalidReview = {
  players: [],
  issueGroups: [
    {
      severity: "must_fix",
      count: 1,
      issues: [
        {
          id: "row-2-full-name-missing",
          severity: "must_fix",
          code: "missing_required_value",
          message: "Row 2 is missing Full Name.",
          sourceColumn: "Full Name",
          sourceRowNumber: 2
        }
      ]
    },
    {
      severity: "can_proceed_with_placeholder",
      count: 0,
      issues: []
    },
    {
      severity: "ignored_source_field",
      count: 1,
      issues: [
        {
          id: "ignored-email",
          severity: "ignored_source_field",
          code: "ignored_source_field",
          message: "Email is accepted from registration exports but ignored for auction setup.",
          sourceColumn: "Email"
        }
      ]
    }
  ],
  summary: {
    totalRows: 1,
    importedPlayers: 0,
    mustFixCount: 1,
    canProceedWithPlaceholderCount: 0,
    ignoredSourceFieldCount: 1,
    startAuctionBlocked: true
  }
};

const photoReview = {
  players: [
    {
      player: {
        sourceRowNumber: 2,
        name: "Aarav Menon",
        gender: "Male",
        role: "Ace",
        phase1Category: "Ace Men"
      },
      status: "matched",
      photoAssetId: "asset-player-aarav-menon"
    },
    {
      player: {
        sourceRowNumber: 3,
        name: "Neha Rao",
        gender: "Female",
        role: "Ace",
        phase1Category: "Ace Women"
      },
      status: "missing_uses_placeholder"
    }
  ],
  issueGroups: [
    {
      severity: "must_fix",
      count: 0,
      issues: []
    },
    {
      severity: "can_proceed_with_placeholder",
      count: 1,
      issues: [
        {
          id: "photo-missing-neha-rao",
          severity: "can_proceed_with_placeholder",
          code: "missing_player_photo",
          message: "Neha Rao has no matched photo; player placeholder will be used.",
          playerName: "Neha Rao"
        }
      ]
    },
    {
      severity: "ignored_source_field",
      count: 0,
      issues: []
    }
  ],
  summary: {
    totalPlayers: 2,
    matchedPhotos: 1,
    placeholderPhotos: 1,
    mustFixCount: 0,
    canProceedWithPlaceholderCount: 1,
    ignoredSourceFieldCount: 0,
    startAuctionBlocked: false
  }
};

test("reviews a valid Player CSV without rendering private fields", async ({ page }) => {
  await mockSetupSupportRoutes(page);

  await page.goto("/");
  await page.getByTestId("player-csv-input").setInputFiles({
    name: "players-valid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Full Name,Gender,Skill,Email,Mobile Number,Payment Transaction Id\nAarav Menon,Male,Ace,private-player@example.com,9876543210,UPI-PRIVATE-001\n"
    )
  });

  await expect(page.getByTestId("setup-player-csv")).toBeVisible();
  await expect(page.getByTestId("player-csv-summary")).toContainText("2 imported");
  await expect(page.getByTestId("player-preview-row-2")).toContainText("Aarav Menon");
  await expect(page.getByTestId("player-preview-row-2")).toContainText("Ace Men");
  await expect(page.getByTestId("import-issue-group-ignored_source_field")).toContainText(
    "2"
  );
  await expect(page.getByTestId("import-issue-group-can_proceed_with_placeholder")).toBeVisible();
  await expect(page.getByTestId("import-issue-group-can_proceed_with_placeholder")).toContainText(
    "None"
  );
  await expect(page.getByTestId("setup-player-csv")).not.toContainText(
    "private-player@example.com"
  );
  await expect(page.getByTestId("setup-player-csv")).not.toContainText("9876543210");
  await expect(page.getByTestId("setup-player-csv")).not.toContainText("UPI-PRIVATE-001");
  await expect(page.getByTestId("setup-start-auction")).toBeDisabled();
});

test("keeps Start Auction blocked for invalid Player CSV must_fix issues", async ({ page }) => {
  await mockSetupSupportRoutes(page);

  await page.goto("/");
  await page.getByTestId("player-csv-input").setInputFiles({
    name: "players-invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Full Name,Gender,Skill\n,Male,Batting\n")
  });

  await expect(page.getByTestId("player-csv-summary")).toContainText("1 must fix");
  await expect(page.getByTestId("import-issues-table")).toContainText(
    "Row 2 is missing Full Name."
  );
  await expect(page.getByTestId("import-issue-group-can_proceed_with_placeholder")).toBeVisible();
  await expect(page.getByTestId("import-issue-group-can_proceed_with_placeholder")).toContainText(
    "None"
  );
  await expect(page.getByTestId("setup-start-auction")).toBeDisabled();
  await expect(page.getByTestId("start-auction-blocker")).toContainText(
    "Blocked: 1 Player CSV issue must be fixed in the source CSV and reimported."
  );
});

test("uploads Player photos after CSV review without treating missing photos as blockers", async ({
  page
}) => {
  await mockSetupSupportRoutes(page);
  await page.route("**/api/setup/player-photos", async (route) => {
    expect(route.request().headers()["content-type"]).toContain("multipart/form-data");
    await route.fulfill({ json: photoReview });
  });

  await page.goto("/");

  await expect(page.getByTestId("setup-player-photos")).toBeVisible();
  await expect(page.getByTestId("player-photos-input")).toBeDisabled();
  await expect(page.getByTestId("player-photos-summary")).toContainText("0 matched");
  await expect(page.getByTestId("player-photos-summary")).toContainText("0 placeholders");

  await page.getByTestId("player-csv-input").setInputFiles({
    name: "players-valid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Full Name,Gender,Skill,Email,Mobile Number,Payment Transaction Id\nAarav Menon,Male,Ace,private-player@example.com,9876543210,UPI-PRIVATE-001\n"
    )
  });
  await expect(page.getByTestId("player-photos-input")).toBeEnabled();

  await page.getByTestId("player-photos-input").setInputFiles([
    {
      name: "aarav_menon.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-image")
    }
  ]);

  await expect(page.getByTestId("player-photos-summary")).toContainText("1 matched");
  await expect(page.getByTestId("player-photos-summary")).toContainText("1 placeholder");
  await expect(page.getByTestId("import-issue-group-can_proceed_with_placeholder")).toContainText(
    "Neha Rao has no matched photo; player placeholder will be used."
  );
  await expect(page.getByTestId("setup-start-auction")).toBeDisabled();
  await expect(page.getByTestId("start-auction-blocker")).not.toContainText(/photo/i);
});
