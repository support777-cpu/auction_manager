import { describe, expect, it } from "vitest";
import { getSetupReadiness } from "./setup-readiness.js";

describe("setup readiness", () => {
  const validParameters = {
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
  const validPlayerReview = {
    players: [],
    issueGroups: [],
    summary: {
      totalRows: 1,
      importedPlayers: 1,
      mustFixCount: 0,
      canProceedWithPlaceholderCount: 0,
      ignoredSourceFieldCount: 0,
      startAuctionBlocked: false
    }
  };
  const validTeamReview = {
    teams: [],
    issueGroups: [],
    summary: {
      totalRows: 1,
      importedTeams: 1,
      mustFixCount: 0,
      canProceedWithPlaceholderCount: 0,
      ignoredSourceFieldCount: 0,
      startAuctionBlocked: false
    }
  };

  it("blocks when player csv is missing", () => {
    const readiness = getSetupReadiness({
      playerCsvReview: null,
      teamCsvReview: null,
      parameterReview: null
    });

    expect(readiness.startAuctionBlocked).toBe(true);
    expect(readiness.primaryBlockerMessage).toContain("Player CSV");
  });

  it("reports story 16 ready when imports and parameters are valid", () => {
    const readiness = getSetupReadiness({
      playerCsvReview: validPlayerReview,
      teamCsvReview: validTeamReview,
      parameterReview: {
        parameters: validParameters,
        blockingReasons: [],
        reasonsByField: {},
        startAuctionBlocked: false
      }
    });

    expect(readiness.story16Ready).toBe(true);
    expect(readiness.startAuctionBlocked).toBe(false);
    expect(readiness.primaryBlockerMessage).toContain("Start Auction can begin");
    expect(readiness.blockerMessages).toEqual([]);
  });

  it("includes every parameter blocking reason", () => {
    const readiness = getSetupReadiness({
      playerCsvReview: validPlayerReview,
      teamCsvReview: validTeamReview,
      parameterReview: {
        parameters: validParameters,
        blockingReasons: [
          {
            id: "invalid-bid-increment",
            code: "invalid_bid_increment",
            field: "bidIncrement",
            message: "Bid increment must be a positive integer."
          },
          {
            id: "invalid-team-budget",
            code: "invalid_team_budget",
            field: "teamBudget",
            message: "Team budget must be a positive integer."
          }
        ],
        reasonsByField: {},
        startAuctionBlocked: true
      }
    });

    expect(readiness.blockerMessages).toHaveLength(2);
    expect(readiness.primaryBlockerMessage).toContain("Bid increment");
  });
});
