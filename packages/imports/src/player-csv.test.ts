import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createPlayerCsvRow,
  playerCsvHeaders,
  privateSourceFieldNames,
  privateSourceFieldSampleValues,
  samplePlayerCsvRows,
  toCsv
} from "@auction-manager/test-fixtures";
import { describe, expect, it } from "vitest";
import { parsePlayerCsvForSetup } from "./index.js";

const validCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/players-valid.csv"
);
const invalidCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/players-invalid.csv"
);
const privateCellValues = privateSourceFieldSampleValues.filter(
  (value) => !privateSourceFieldNames.some((fieldName) => fieldName === value)
);

describe("Player CSV import adapter", () => {
  it("parses valid registration CSV into privacy-safe Player previews", async () => {
    const review = parsePlayerCsvForSetup(await readFile(validCsvPath, "utf8"));

    expect(review.summary).toMatchObject({
      totalRows: 8,
      importedPlayers: 8,
      mustFixCount: 0,
      canProceedWithPlaceholderCount: 0,
      ignoredSourceFieldCount: privateSourceFieldNames.length,
      startAuctionBlocked: false
    });
    expect(review.players).toEqual([
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
      },
      {
        sourceRowNumber: 4,
        name: "Meera Iyer",
        gender: "Female",
        role: "Girls",
        phase1Category: "Women All Rounders"
      },
      {
        sourceRowNumber: 5,
        name: "Rohan Das",
        gender: "Male",
        role: "Bowling",
        phase1Category: "Men Bowlers"
      },
      {
        sourceRowNumber: 6,
        name: "Kunal Shah",
        gender: "Male",
        role: "Batting",
        phase1Category: "Men Batsmen"
      },
      {
        sourceRowNumber: 7,
        name: "Imran Khan",
        gender: "Male",
        role: "AllRounder",
        phase1Category: "Men All Rounders"
      },
      {
        sourceRowNumber: 8,
        name: "Dev Patel",
        gender: "Male",
        role: "Bowling",
        phase1Category: "Men Bowlers"
      },
      {
        sourceRowNumber: 9,
        name: "Anika Sen",
        gender: "Female",
        role: "Girls",
        phase1Category: "Women All Rounders"
      }
    ]);

    for (const player of review.players) {
      for (const privateField of privateSourceFieldNames) {
        expect(player).not.toHaveProperty(privateField);
      }
    }
  });

  it("classifies invalid Player rows as must_fix without leaking private cell values", async () => {
    const review = parsePlayerCsvForSetup(await readFile(invalidCsvPath, "utf8"));
    const mustFixGroup = review.issueGroups.find((group) => group.severity === "must_fix");
    const serializedReview = JSON.stringify(review);

    expect(review.summary).toMatchObject({
      totalRows: 4,
      importedPlayers: 0,
      mustFixCount: 4,
      startAuctionBlocked: true
    });
    expect(mustFixGroup?.issues.map((issue) => issue.code)).toEqual([
      "missing_required_value",
      "unknown_skill",
      "missing_required_value",
      "unknown_skill"
    ]);
    expect(mustFixGroup?.issues.map((issue) => issue.sourceRowNumber)).toEqual([
      2,
      3,
      4,
      5
    ]);

    for (const privateValue of privateCellValues) {
      expect(serializedReview).not.toContain(privateValue);
    }
    expect(serializedReview).not.toContain("UPI-INVALID");
    expect(serializedReview).not.toContain("987650000");
  });

  it("returns must_fix issues for missing required PRD export headers", () => {
    const csvMissingHeader = toCsv(
      playerCsvHeaders.filter((header) => header !== "Gender"),
      samplePlayerCsvRows
    );

    const review = parsePlayerCsvForSetup(csvMissingHeader);
    const mustFixGroup = review.issueGroups.find((group) => group.severity === "must_fix");

    expect(review.players).toEqual([]);
    expect(review.summary.startAuctionBlocked).toBe(true);
    expect(mustFixGroup?.issues).toEqual([
      expect.objectContaining({
        severity: "must_fix",
        code: "missing_required_header",
        sourceColumn: "Gender"
      })
    ]);
  });

  it("classifies ignored source fields by column name only", () => {
    const review = parsePlayerCsvForSetup(toCsv(playerCsvHeaders, samplePlayerCsvRows));
    const ignoredGroup = review.issueGroups.find(
      (group) => group.severity === "ignored_source_field"
    );
    const ignoredColumns = ignoredGroup?.issues.map((issue) => issue.sourceColumn);
    const ignoredMessages = ignoredGroup?.issues.map((issue) => issue.message).join("\n") ?? "";

    expect(ignoredColumns).toEqual([...privateSourceFieldNames]);
    for (const privateValue of privateCellValues) {
      expect(ignoredMessages).not.toContain(privateValue);
    }
  });

  it("classifies unknown gender values as must_fix", () => {
    const review = parsePlayerCsvForSetup(
      toCsv(playerCsvHeaders, [
        createPlayerCsvRow({
          "Full Name": "Unknown Gender Player",
          Gender: "Other",
          Skill: "Ace"
        })
      ])
    );
    const mustFixGroup = review.issueGroups.find((group) => group.severity === "must_fix");

    expect(review.players).toEqual([]);
    expect(review.summary.startAuctionBlocked).toBe(true);
    expect(mustFixGroup?.issues).toEqual([
      expect.objectContaining({
        code: "unknown_gender",
        sourceRowNumber: 2,
        playerName: "Unknown Gender Player"
      })
    ]);
  });

  it("classifies unmappable gender and skill combinations as must_fix", () => {
    const review = parsePlayerCsvForSetup(
      toCsv(playerCsvHeaders, [
        createPlayerCsvRow({
          "Full Name": "Female Batter",
          Gender: "Female",
          Skill: "Batting"
        })
      ])
    );
    const mustFixGroup = review.issueGroups.find((group) => group.severity === "must_fix");

    expect(review.players).toEqual([]);
    expect(review.summary.startAuctionBlocked).toBe(true);
    expect(mustFixGroup?.issues).toEqual([
      expect.objectContaining({
        code: "unmapped_phase1_category",
        sourceRowNumber: 2,
        playerName: "Female Batter"
      })
    ]);
  });

  it("returns must_fix when the CSV has headers but no Player rows", () => {
    const review = parsePlayerCsvForSetup(toCsv(playerCsvHeaders, []));

    expect(review.players).toEqual([]);
    expect(review.summary).toMatchObject({
      totalRows: 0,
      importedPlayers: 0,
      mustFixCount: 1,
      startAuctionBlocked: true
    });
    expect(review.issueGroups.find((group) => group.severity === "must_fix")?.issues).toEqual([
      expect.objectContaining({
        code: "missing_required_value",
        message: "Player CSV contains headers but no Player rows."
      })
    ]);
  });

  it("returns a parse_error must_fix issue for malformed CSV", () => {
    const review = parsePlayerCsvForSetup('Full Name,Gender,Skill\n"Unclosed quote,Male,Ace\n');

    expect(review.players).toEqual([]);
    expect(review.summary).toMatchObject({
      totalRows: 0,
      importedPlayers: 0,
      mustFixCount: 1,
      startAuctionBlocked: true
    });
    expect(review.issueGroups.find((group) => group.severity === "must_fix")?.issues).toEqual([
      expect.objectContaining({
        code: "parse_error"
      })
    ]);
  });
});
