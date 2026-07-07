import {
  mediaMatchStatusValues,
  photoMatchStatusValues,
  playerPhotoMatchRecordSchema,
  playerPhotoReviewResponseSchema,
  playerCsvImportReviewResponseSchema,
  setupTeamPreviewSchema,
  setupPlayerPreviewSchema,
  teamCsvImportReviewResponseSchema,
  teamLogoMatchRecordSchema,
  teamLogoReviewResponseSchema,
  importIssueCodeValues,
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

  it("exposes strict privacy-safe photo review records with only internal asset IDs", () => {
    expect(photoMatchStatusValues).toEqual([
      "matched",
      "missing_uses_placeholder",
      "ambiguous_uses_placeholder",
      "undecodable_uses_placeholder"
    ]);
    expect(importIssueCodeValues).toEqual(
      expect.arrayContaining([
        "missing_player_photo",
        "unsupported_photo_format",
        "ambiguous_photo_match",
        "unmatched_photo_file",
        "photo_not_decodable",
        "photo_storage_failed"
      ])
    );

    const matchRecord = playerPhotoMatchRecordSchema.parse({
      player: {
        sourceRowNumber: 2,
        name: "Aarav Menon",
        gender: "Male",
        role: "Ace",
        phase1Category: "Ace Men"
      },
      status: "matched",
      photoAssetId: "asset-player-aarav-menon"
    });

    expect(matchRecord.photoAssetId).toBe("asset-player-aarav-menon");
    expect(JSON.stringify(matchRecord)).not.toContain("aarav_menon.jpg");
    expect(JSON.stringify(matchRecord)).not.toContain("/Users/operator/Desktop");
    for (const privateField of privateSourceFieldNames) {
      expect(matchRecord.player).not.toHaveProperty(privateField);
    }

    expect(() =>
      playerPhotoMatchRecordSchema.parse({
        ...matchRecord,
        sourcePath: "/Users/operator/Desktop/aarav_menon.jpg"
      })
    ).toThrow();

    expect(() =>
      playerPhotoMatchRecordSchema.parse({
        player: matchRecord.player,
        status: "matched"
      })
    ).toThrow();
  });

  it("keeps photo placeholders out of start-auction blocking logic", () => {
    const review = playerPhotoReviewResponseSchema.parse({
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
            name: "Dev Patel",
            gender: "Male",
            role: "Bowling",
            phase1Category: "Men Bowlers"
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
              id: "photo-missing-dev-patel",
              severity: "can_proceed_with_placeholder",
              code: "missing_player_photo",
              message: "Dev Patel has no matched photo; player placeholder will be used.",
              playerName: "Dev Patel"
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
    });

    expect(review.summary.startAuctionBlocked).toBe(false);
    expect(review.summary.placeholderPhotos).toBe(1);
  });
});

describe("Team import shared contracts", () => {
  it("keeps setup Team preview records privacy-safe and strict", () => {
    const preview = setupTeamPreviewSchema.parse({
      sourceRowNumber: 2,
      name: "Falcons",
      captain: "Priya Captain"
    });

    expect(Object.keys(preview)).toEqual(["sourceRowNumber", "name", "captain"]);

    expect(() =>
      setupTeamPreviewSchema.parse({
        ...preview,
        Budget: "170"
      })
    ).toThrow();
  });

  it("validates grouped Team CSV review responses and blocker semantics", () => {
    const review = teamCsvImportReviewResponseSchema.parse({
      teams: [
        {
          sourceRowNumber: 2,
          name: "Falcons",
          captain: "Priya Captain"
        }
      ],
      issueGroups: [
        {
          severity: "must_fix",
          count: 1,
          issues: [
            {
              id: "row-3-team-name-missing",
              severity: "must_fix",
              code: "missing_team_name",
              message: "Row 3 is missing Team Name.",
              sourceColumn: "Team Name",
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
              id: "ignored-budget",
              severity: "ignored_source_field",
              code: "ignored_source_field",
              message: "Budget is ignored for Team CSV setup.",
              sourceColumn: "Budget"
            }
          ]
        }
      ],
      summary: {
        totalRows: 2,
        importedTeams: 1,
        mustFixCount: 1,
        canProceedWithPlaceholderCount: 0,
        ignoredSourceFieldCount: 1,
        startAuctionBlocked: true
      }
    });

    expect(review.teams[0]?.captain).toBe("Priya Captain");
    expect(review.issueGroups.map((group) => group.severity)).toEqual(
      importIssueSeverityValues
    );
    expect(() =>
      teamCsvImportReviewResponseSchema.parse({
        ...review,
        summary: {
          ...review.summary,
          startAuctionBlocked: false
        }
      })
    ).toThrow();
  });

  it("exposes strict privacy-safe logo review records with only internal asset IDs", () => {
    expect(mediaMatchStatusValues).toEqual(photoMatchStatusValues);
    expect(importIssueCodeValues).toEqual(
      expect.arrayContaining([
        "missing_team_name",
        "missing_captain_name",
        "duplicate_team_name",
        "missing_team_logo",
        "ambiguous_logo_match",
        "unmatched_logo_file",
        "logo_not_decodable",
        "logo_storage_failed"
      ])
    );

    const matchRecord = teamLogoMatchRecordSchema.parse({
      team: {
        sourceRowNumber: 2,
        name: "Falcons",
        captain: "Priya Captain"
      },
      status: "matched",
      logoAssetId: "asset-team-falcons"
    });

    expect(matchRecord.logoAssetId).toBe("asset-team-falcons");
    expect(JSON.stringify(matchRecord)).not.toContain("falcons.png");
    expect(JSON.stringify(matchRecord)).not.toContain("/Users/operator/Desktop");

    expect(() =>
      teamLogoMatchRecordSchema.parse({
        ...matchRecord,
        sourcePath: "/Users/operator/Desktop/falcons.png"
      })
    ).toThrow();

    expect(() =>
      teamLogoMatchRecordSchema.parse({
        team: matchRecord.team,
        status: "matched"
      })
    ).toThrow();
  });

  it("keeps logo placeholders out of start-auction blocking logic", () => {
    const review = teamLogoReviewResponseSchema.parse({
      teams: [
        {
          team: {
            sourceRowNumber: 2,
            name: "Falcons",
            captain: "Priya Captain"
          },
          status: "matched",
          logoAssetId: "asset-team-falcons"
        },
        {
          team: {
            sourceRowNumber: 3,
            name: "Tigers",
            captain: "Rahul Captain"
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
              id: "logo-missing-3",
              severity: "can_proceed_with_placeholder",
              code: "missing_team_logo",
              message: "Tigers has no matched logo; team placeholder will be used.",
              teamName: "Tigers"
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
        totalTeams: 2,
        matchedLogos: 1,
        placeholderLogos: 1,
        mustFixCount: 0,
        canProceedWithPlaceholderCount: 1,
        ignoredSourceFieldCount: 0,
        startAuctionBlocked: false
      }
    });

    expect(review.summary.startAuctionBlocked).toBe(false);
    expect(review.summary.placeholderLogos).toBe(1);
    expect(() =>
      teamLogoReviewResponseSchema.parse({
        ...review,
        summary: {
          ...review.summary,
          startAuctionBlocked: true
        }
      })
    ).toThrow();
  });
});
