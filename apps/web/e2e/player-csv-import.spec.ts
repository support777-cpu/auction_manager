import { expect, test } from "@playwright/test";

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

test("reviews a valid Player CSV without rendering private fields", async ({ page }) => {
  await page.route("**/api/setup/player-csv/preview", async (route) => {
    expect(route.request().headers()["content-type"]).toContain("text/csv");
    expect(route.request().postData()).toContain("Aarav Menon");
    await route.fulfill({ json: validReview });
  });

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
  await page.route("**/api/setup/player-csv/preview", async (route) => {
    await route.fulfill({ json: invalidReview });
  });

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
