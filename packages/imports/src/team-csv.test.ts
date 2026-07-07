import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createTeamCsvRow,
  invalidTeamCsvRows,
  sampleTeamCsvRows,
  teamCsvHeaders,
  toCsv
} from "@auction-manager/test-fixtures";
import { describe, expect, it } from "vitest";
import { parseTeamCsvForSetup, parseTeamCsvForSetupStaging } from "./index.js";

const validCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/teams-valid.csv"
);
const invalidCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/teams-invalid.csv"
);

describe("Team CSV import adapter", () => {
  it("parses valid fixture Team CSV into privacy-safe Team previews", async () => {
    const review = parseTeamCsvForSetup(await readFile(validCsvPath, "utf8"));

    expect(review.summary).toMatchObject({
      totalRows: 4,
      importedTeams: 4,
      mustFixCount: 0,
      canProceedWithPlaceholderCount: 0,
      ignoredSourceFieldCount: 0,
      startAuctionBlocked: false
    });
    expect(review.teams).toEqual([
      { sourceRowNumber: 2, name: "Falcons", captain: "Priya Captain" },
      { sourceRowNumber: 3, name: "Tigers", captain: "Rahul Captain" },
      { sourceRowNumber: 4, name: "Royals", captain: "Anita Captain" },
      { sourceRowNumber: 5, name: "Warriors", captain: "Joel Captain" }
    ]);
  });

  it("accepts canonical Team Name and Captain Name headers", () => {
    const review = parseTeamCsvForSetup(
      toCsv(["Team Name", "Captain Name"], sampleTeamCsvRows.map((row) => ({
        "Team Name": row.Team,
        "Captain Name": row.Captain
      })))
    );

    expect(review.summary.startAuctionBlocked).toBe(false);
    expect(review.teams.map((team) => team.name)).toEqual([
      "Falcons",
      "Tigers",
      "Royals",
      "Warriors"
    ]);
  });

  it("falls back to populated alias cells when mixed canonical cells are blank", () => {
    const review = parseTeamCsvForSetup(
      toCsv(["Team Name", "Captain Name", "Team", "Captain"], [
        {
          "Team Name": "",
          "Captain Name": "",
          Team: "Falcons",
          Captain: "Priya Captain"
        }
      ])
    );

    expect(review.summary.startAuctionBlocked).toBe(false);
    expect(review.teams).toEqual([
      { sourceRowNumber: 2, name: "Falcons", captain: "Priya Captain" }
    ]);
  });

  it("classifies invalid Team rows as must_fix and excludes them from previews", async () => {
    const review = parseTeamCsvForSetup(await readFile(invalidCsvPath, "utf8"));
    const mustFixGroup = review.issueGroups.find((group) => group.severity === "must_fix");

    expect(review.teams).toEqual([]);
    expect(review.summary).toMatchObject({
      totalRows: 2,
      importedTeams: 0,
      mustFixCount: 3,
      startAuctionBlocked: true
    });
    expect(mustFixGroup?.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "missing_team_name",
        sourceColumn: "Team Name",
        sourceRowNumber: 2
      }),
      expect.objectContaining({
        code: "missing_captain_name",
        sourceColumn: "Captain Name",
        sourceRowNumber: 3,
        teamName: "No Captain XI"
      }),
      expect.objectContaining({
        code: "missing_required_value",
        message: "Team CSV contains no valid Team rows."
      })
    ]));
  });

  it("returns missing header must_fix issues for absent canonical and alias headers", () => {
    const review = parseTeamCsvForSetup("Team\nFalcons\n");
    const mustFixGroup = review.issueGroups.find((group) => group.severity === "must_fix");

    expect(review.teams).toEqual([]);
    expect(review.summary.startAuctionBlocked).toBe(true);
    expect(mustFixGroup?.issues).toEqual([
      expect.objectContaining({
        code: "missing_required_header",
        sourceColumn: "Captain Name"
      })
    ]);
  });

  it("classifies duplicate Team names case-insensitively", () => {
    const review = parseTeamCsvForSetup(
      toCsv(teamCsvHeaders, [
        createTeamCsvRow({ Team: "Falcons", Captain: "Priya Captain" }),
        createTeamCsvRow({ Team: " falcons ", Captain: "Second Captain" })
      ])
    );
    const mustFixGroup = review.issueGroups.find((group) => group.severity === "must_fix");

    expect(review.teams).toEqual([]);
    expect(review.summary.startAuctionBlocked).toBe(true);
    expect(mustFixGroup?.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "duplicate_team_name",
        teamName: "Falcons"
      }),
      expect.objectContaining({
        code: "duplicate_team_name",
        teamName: "falcons"
      }),
      expect.objectContaining({
        code: "missing_required_value"
      })
    ]));
  });

  it("returns must_fix when the CSV has headers but zero valid Team rows", () => {
    const review = parseTeamCsvForSetup(toCsv(teamCsvHeaders, []));

    expect(review.teams).toEqual([]);
    expect(review.summary.startAuctionBlocked).toBe(true);
    expect(
      review.issueGroups
        .find((group) => group.severity === "must_fix")
        ?.issues.some((issue) => issue.code === "missing_required_value")
    ).toBe(true);
  });

  it("returns must_fix when all Team CSV rows are invalid", () => {
    const review = parseTeamCsvForSetup(toCsv(teamCsvHeaders, invalidTeamCsvRows));
    const mustFixIssues = review.issueGroups.find((group) => group.severity === "must_fix")?.issues ?? [];

    expect(review.teams).toEqual([]);
    expect(review.summary).toMatchObject({
      importedTeams: 0,
      mustFixCount: 3,
      startAuctionBlocked: true
    });
    expect(mustFixIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "missing_team_name" }),
      expect.objectContaining({ code: "missing_captain_name" }),
      expect.objectContaining({ code: "missing_required_value" })
    ]));
  });

  it("classifies ignored extra columns by column name only", () => {
    const review = parseTeamCsvForSetup(
      toCsv(["Team", "Captain", "Secret Notes"], [
        { Team: "Falcons", Captain: "Priya Captain", "Secret Notes": "private strategy" }
      ])
    );
    const ignoredGroup = review.issueGroups.find(
      (group) => group.severity === "ignored_source_field"
    );
    const serialized = JSON.stringify(review);

    expect(review.summary.ignoredSourceFieldCount).toBe(1);
    expect(ignoredGroup?.issues).toEqual([
      expect.objectContaining({
        code: "ignored_source_field",
        sourceColumn: "Secret Notes"
      })
    ]);
    expect(serialized).not.toContain("private strategy");
  });

  it("returns a parse_error must_fix issue for malformed CSV", () => {
    const review = parseTeamCsvForSetup('Team,Captain\n"Unclosed quote,Priya\n');

    expect(review.teams).toEqual([]);
    expect(review.summary).toMatchObject({
      totalRows: 0,
      importedTeams: 0,
      mustFixCount: 1,
      startAuctionBlocked: true
    });
    expect(review.issueGroups.find((group) => group.severity === "must_fix")?.issues).toEqual([
      expect.objectContaining({
        code: "parse_error"
      })
    ]);
  });

  it("returns staging records with normalized Team previews only", () => {
    const staging = parseTeamCsvForSetupStaging(toCsv(teamCsvHeaders, sampleTeamCsvRows));

    expect(staging.review.summary.importedTeams).toBe(4);
    expect(staging.teams).toEqual(staging.review.teams);
  });
});
