import { describe, expect, it } from "vitest";
import { getDefaultAuctionParameters } from "./auction-parameters.js";
import { startAuctionFromSetup } from "./start-auction.js";

const parameters = getDefaultAuctionParameters();

const validPlayerReview = {
  players: [
    {
      sourceRowNumber: 2,
      name: "Aarav Menon",
      gender: "Male",
      role: "Ace",
      phase1Category: "Ace Men"
    }
  ],
  issueGroups: [],
  summary: {
    totalRows: 1,
    importedPlayers: 1,
    mustFixCount: 0,
    canProceedWithPlaceholderCount: 0,
    ignoredSourceFieldCount: 0,
    startAuctionBlocked: false
  }
} as const;

const validTeamReview = {
  teams: [
    {
      sourceRowNumber: 2,
      name: "Falcons",
      captain: "Priya Captain"
    }
  ],
  issueGroups: [],
  summary: {
    totalRows: 1,
    importedTeams: 1,
    mustFixCount: 0,
    canProceedWithPlaceholderCount: 0,
    ignoredSourceFieldCount: 0,
    startAuctionBlocked: false
  }
} as const;

const ready = {
  startAuctionBlocked: false,
  primaryBlockerMessage: "",
  blockerMessages: [],
  story16Ready: true
} as const;

describe("startAuctionFromSetup", () => {
  it("initializes auction state from setup without private source fields", () => {
    const result = startAuctionFromSetup({
      players: validPlayerReview.players,
      playerPhotoReview: {
        players: [
          {
            player: validPlayerReview.players[0],
            status: "matched",
            photoAssetId: "asset-player-aarav"
          }
        ],
        issueGroups: [],
        summary: {
          totalPlayers: 1,
          matchedPhotos: 1,
          placeholderPhotos: 0,
          mustFixCount: 0,
          canProceedWithPlaceholderCount: 0,
          ignoredSourceFieldCount: 0,
          startAuctionBlocked: false
        }
      },
      teams: validTeamReview.teams,
      teamLogoReview: {
        teams: [
          {
            team: validTeamReview.teams[0],
            status: "matched",
            logoAssetId: "asset-team-falcons"
          }
        ],
        issueGroups: [],
        summary: {
          totalTeams: 1,
          matchedLogos: 1,
          placeholderLogos: 0,
          mustFixCount: 0,
          canProceedWithPlaceholderCount: 0,
          ignoredSourceFieldCount: 0,
          startAuctionBlocked: false
        }
      },
      parameters,
      setupReadiness: ready,
      clientCommandId: "cmd-1",
      ids: {
        auctionId: () => "auction-1",
        playerId: () => "player-1",
        teamId: () => "team-1"
      },
      now: () => "2026-07-07T08:30:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state).toMatchObject({
      auctionId: "auction-1",
      phase: "InitialAuction",
      phase1Order: {
        categories: [
          {
            category: "Ace Men",
            playerIds: ["player-1"]
          },
          {
            category: "Ace Women",
            playerIds: []
          },
          {
            category: "Women All Rounders",
            playerIds: []
          },
          {
            category: "Men Bowlers",
            playerIds: []
          },
          {
            category: "Men Batsmen",
            playerIds: []
          },
          {
            category: "Men All Rounders",
            playerIds: []
          }
        ],
        playerIds: ["player-1"],
        generatedAt: "2026-07-07T08:30:00.000Z"
      },
      currentPlayerId: null,
      currentBid: null,
      selectedTeamId: null,
      undoHistory: []
    });
    expect(result.state.players[0]).toMatchObject({
      id: "player-1",
      name: "Aarav Menon",
      role: "Ace",
      basePrice: parameters.roleBasePrices.Ace,
      status: "Pending",
      photoAssetId: "asset-player-aarav",
      soldPrice: null,
      winningTeamId: null,
      acquisitionType: null
    });
    expect(result.state.teams[0]).toMatchObject({
      id: "team-1",
      name: "Falcons",
      captain: "Priya Captain",
      logoAssetId: "asset-team-falcons",
      budget: parameters.teamBudget,
      remainingBudget: parameters.teamBudget,
      squadCount: 0
    });
    expect(Object.values(result.state.teams[0].roleCounts)).toEqual([0, 0, 0, 0, 0]);
    expect(JSON.stringify(result.state)).not.toContain("sourceRowNumber");
  });

  it("blocks when setup readiness still has blockers", () => {
    const result = startAuctionFromSetup({
      players: validPlayerReview.players,
      playerPhotoReview: null,
      teams: validTeamReview.teams,
      teamLogoReview: null,
      parameters,
      setupReadiness: {
        startAuctionBlocked: true,
        primaryBlockerMessage: "Blocked: Player CSV must be imported before Start Auction.",
        blockerMessages: ["Blocked: Player CSV must be imported before Start Auction."],
        story16Ready: false
      },
      clientCommandId: "cmd-1",
      ids: {
        auctionId: () => "auction-1",
        playerId: () => "player-1",
        teamId: () => "team-1"
      },
      now: () => "2026-07-07T08:30:00.000Z"
    });

    expect(result).toEqual({
      ok: false,
      blockers: ["Blocked: Player CSV must be imported before Start Auction."]
    });
  });

  it("blocks when phase 1 order generation fails", () => {
    const result = startAuctionFromSetup({
      players: [
        ...validPlayerReview.players,
        {
          sourceRowNumber: 3,
          name: "Duplicate Aarav",
          gender: "Male",
          role: "Ace",
          phase1Category: "Ace Men"
        }
      ],
      playerPhotoReview: null,
      teams: validTeamReview.teams,
      teamLogoReview: null,
      parameters,
      setupReadiness: ready,
      clientCommandId: "cmd-1",
      ids: {
        auctionId: () => "auction-1",
        playerId: () => "player-1",
        teamId: () => "team-1"
      },
      now: () => "2026-07-07T08:30:00.000Z"
    });

    expect(result).toEqual({
      ok: false,
      blockers: [
        "Phase 1 order could not be generated: duplicate player id player-1."
      ]
    });
  });

  it("locks parameters by cloning them into state", () => {
    const mutableParameters = getDefaultAuctionParameters();
    const result = startAuctionFromSetup({
      players: validPlayerReview.players,
      playerPhotoReview: null,
      teams: validTeamReview.teams,
      teamLogoReview: null,
      parameters: mutableParameters,
      setupReadiness: ready,
      clientCommandId: "cmd-1",
      ids: {
        auctionId: () => "auction-1",
        playerId: () => "player-1",
        teamId: () => "team-1"
      },
      now: () => "2026-07-07T08:30:00.000Z"
    });

    mutableParameters.teamBudget = 999;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.parameters.teamBudget).toBe(parameters.teamBudget);
    }
  });
});
