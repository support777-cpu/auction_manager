import { describe, expect, it } from "vitest";
import type { AuctionState } from "@auction-manager/shared";
import { revealNextPlayer } from "./reveal-next-player.js";

describe("revealNextPlayer", () => {
  it("reveals the first pending player from persisted Phase 1 order", () => {
    const state = createState();
    const result = revealNextPlayer({
      state,
      now: () => "2026-07-07T09:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.revealedPlayerId).toBe("player-2");
    expect(result.summary).toBe("Revealed Riya Shah at base price 10.");
    expect(result.state.currentPlayerId).toBe("player-2");
    expect(result.state.currentBid).toBe(10);
    expect(result.state.selectedTeamId).toBeNull();
    expect(result.state.updatedAt).toBe("2026-07-07T09:00:00.000Z");
    expect(result.state.players.find((player) => player.id === "player-2")?.status)
      .toBe("Current");
    expect(result.state.players.find((player) => player.id === "player-1")?.status)
      .toBe("Pending");
    expect(result.state.phase1Order).toEqual(state.phase1Order);
    expect(result.state.teams).toEqual(state.teams);
  });

  it("appends a reversible undo-history entry for Story 2.9", () => {
    const state = { ...createState(), selectedTeamId: "team-1" };
    const result = revealNextPlayer({
      state,
      now: () => "2026-07-07T09:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.undoHistory).toEqual([
      {
        command: "RevealNextPlayer",
        playerId: "player-2",
        previousCurrentPlayerId: null,
        previousCurrentBid: null,
        previousSelectedTeamId: "team-1",
        previousPlayerStatus: "Pending",
        timestamp: "2026-07-07T09:00:00.000Z"
      }
    ]);
  });

  it("rejects reveal outside Initial Auction", () => {
    const result = revealNextPlayer({
      state: { ...createState(), phase: "Setup" },
      now: () => "2026-07-07T09:00:00.000Z"
    });

    expect(result).toMatchObject({
      ok: false,
      error: "auction_not_in_initial_phase"
    });
  });

  it("rejects reveal while a current player requires an outcome", () => {
    const result = revealNextPlayer({
      state: { ...createState(), currentPlayerId: "player-1" },
      now: () => "2026-07-07T09:00:00.000Z"
    });

    expect(result).toMatchObject({
      ok: false,
      error: "current_player_requires_outcome"
    });
  });

  it("returns a typed conflict when no pending players remain", () => {
    const state = {
      ...createState(),
      players: createState().players.map((player) => ({
        ...player,
        status: "Sold" as const,
        soldPrice: player.basePrice,
        winningTeamId: "team-1",
        acquisitionType: "Auction" as const
      }))
    };

    const result = revealNextPlayer({
      state,
      now: () => "2026-07-07T09:00:00.000Z"
    });

    expect(result).toMatchObject({
      ok: false,
      error: "no_pending_phase1_players"
    });
  });
});

function createState(): AuctionState {
  return {
    auctionId: "auction-1",
    phase: "InitialAuction",
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
        name: "Aarav Menon",
        gender: "Male",
        role: "Ace",
        phase1Category: "Ace Men",
        basePrice: 10,
        status: "Pending",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      },
      {
        id: "player-2",
        name: "Riya Shah",
        gender: "Female",
        role: "Ace",
        phase1Category: "Ace Women",
        basePrice: 10,
        status: "Pending",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      }
    ],
    teams: [
      {
        id: "team-1",
        name: "Falcons",
        captain: "Priya Captain",
        budget: 170,
        remainingBudget: 170,
        squadCount: 0,
        roleCounts: {
          Ace: 0,
          Batting: 0,
          Bowling: 0,
          AllRounder: 0,
          Girls: 0
        }
      }
    ],
    phase1Order: {
      categories: [
        { category: "Ace Men", playerIds: ["player-1"] },
        { category: "Ace Women", playerIds: ["player-2"] },
        { category: "Women All Rounders", playerIds: [] },
        { category: "Men Bowlers", playerIds: [] },
        { category: "Men Batsmen", playerIds: [] },
        { category: "Men All Rounders", playerIds: [] }
      ],
      playerIds: ["player-2", "player-1"],
      generatedAt: "2026-07-07T08:30:00.000Z"
    },
    currentPlayerId: null,
    currentBid: null,
    selectedTeamId: null,
    undoHistory: [],
    createdAt: "2026-07-07T08:30:00.000Z",
    updatedAt: "2026-07-07T08:30:00.000Z",
    persistenceFailure: null
  };
}
