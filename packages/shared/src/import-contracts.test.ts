import {
  playerCsvImportReviewResponseSchema,
  setupPlayerPreviewSchema,
  importIssueSeverityValues,
  auctionRoleValues,
  phase1CategoryValues
} from "./index.js";
import { privateSourceFieldNames } from "@auction-manager/test-fixtures";
import { describe, expect, it } from "vitest";

describe("Player CSV import shared contracts", () => {
  it("uses the canonical severity, role, and Phase 1 category names", () => {
    expect(importIssueSeverityValues).toEqual([
      "must_fix",
      "can_proceed_with_placeholder",
      "ignored_source_field"
    ]);
    expect(auctionRoleValues).toEqual([
      "Ace",
      "Batting",
      "Bowling",
      "AllRounder",
      "Girls"
    ]);
    expect(phase1CategoryValues).toEqual([
      "Ace Men",
      "Ace Women",
      "Women All Rounders",
      "Men Bowlers",
      "Men Batsmen",
      "Men All Rounders"
    ]);
  });

  it("keeps setup Player preview records privacy-safe and strict", () => {
    const preview = setupPlayerPreviewSchema.parse({
      sourceRowNumber: 2,
      name: "Aarav Menon",
      gender: "Male",
      role: "Ace",
      phase1Category: "Ace Men"
    });

    expect(Object.keys(preview)).toEqual([
      "sourceRowNumber",
      "name",
      "gender",
      "role",
      "phase1Category"
    ]);

    for (const privateField of privateSourceFieldNames) {
      expect(preview).not.toHaveProperty(privateField);
    }

    expect(() =>
      setupPlayerPreviewSchema.parse({
        ...preview,
        Email: "private-player@example.com"
      })
    ).toThrow();
  });

  it("validates grouped Player CSV import review responses", () => {
    const review = playerCsvImportReviewResponseSchema.parse({
      players: [
        {
          sourceRowNumber: 2,
          name: "Aarav Menon",
          gender: "Male",
          role: "Ace",
          phase1Category: "Ace Men"
        }
      ],
      issueGroups: [
        {
          severity: "must_fix",
          count: 1,
          issues: [
            {
              id: "row-3-missing-full-name",
              severity: "must_fix",
              code: "missing_required_value",
              message: "Row 3 is missing Full Name.",
              sourceColumn: "Full Name",
              sourceRowNumber: 3
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
        totalRows: 2,
        importedPlayers: 1,
        mustFixCount: 1,
        canProceedWithPlaceholderCount: 0,
        ignoredSourceFieldCount: 1,
        startAuctionBlocked: true
      }
    });

    expect(review.players[0]?.name).toBe("Aarav Menon");
    expect(review.issueGroups.map((group) => group.severity)).toEqual(
      importIssueSeverityValues
    );
  });
});
