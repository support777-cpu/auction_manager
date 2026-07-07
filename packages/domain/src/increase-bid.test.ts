import { describe, expect, it } from "vitest";
import type { AuctionState } from "@auction-manager/shared";
import { increaseBid } from "./increase-bid.js";

describe("increaseBid", () => {
  it("increases by the configured increment and records a reversible undo entry", () => {
    const state = createCurrentState();
    const result = increaseBid({
      state,
      now: () => "2026-07-07T09:10:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.previousCurrentBid).toBe(10);
    expect(result.nextCurrentBid).toBe(12);
    expect(result.bidIncrement).toBe(2);
    expect(result.summary).toBe("Increased bid for Aarav Menon to 12.");
    expect(result.state.currentBid).toBe(12);
    expect(result.state.updatedAt).toBe("2026-07-07T09:10:00.000Z");
    expect(result.state.undoHistory).toEqual([
      {
        command: "IncreaseBid",
        currentPlayerId: "player-1",
        previousCurrentBid: 10,
        nextCurrentBid: 12,
        bidIncrement: 2,
        timestamp: "2026-07-07T09:10:00.000Z"
      }
    ]);
    expect(result.state.players).toEqual(state.players);
    expect(result.state.teams).toEqual(state.teams);
    expect(result.state.currentPlayerId).toBe(state.currentPlayerId);
    expect(result.state.selectedTeamId).toBe(state.selectedTeamId);
    expect(result.state.phase).toBe(state.phase);
    expect(result.state.phase1Order).toEqual(state.phase1Order);
    expect(result.state.parameters).toEqual(state.parameters);
    expect(result.state.persistenceFailure).toBeNull();
  });

  it("records every repeated increment as an independent undoable action", () => {
    const first = increaseBid({
      state: createCurrentState(),
      now: () => "2026-07-07T09:10:00.000Z"
    });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    const second = increaseBid({
      state: first.state,
      now: () => "2026-07-07T09:11:00.000Z"
    });
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }

    expect(second.state.currentBid).toBe(14);
    expect(second.state.undoHistory).toHaveLength(2);
    expect(second.state.undoHistory.at(-1)).toMatchObject({
      command: "IncreaseBid",
      previousCurrentBid: 12,
      nextCurrentBid: 14,
      bidIncrement: 2
    });
  });

  it("rejects wrong phase, missing current player, and missing current bid", () => {
    expect(
      increaseBid({
        state: { ...createCurrentState(), phase: "Setup" },
        now: () => "2026-07-07T09:10:00.000Z"
      })
    ).toMatchObject({ ok: false, error: "auction_not_in_initial_phase" });

    expect(
      increaseBid({
        state: { ...createCurrentState(), currentPlayerId: null },
        now: () => "2026-07-07T09:10:00.000Z"
      })
    ).toMatchObject({ ok: false, error: "current_player_required" });

    expect(
      increaseBid({
        state: { ...createCurrentState(), currentBid: null },
        now: () => "2026-07-07T09:10:00.000Z"
      })
    ).toMatchObject({ ok: false, error: "current_bid_required" });

    expect(
      increaseBid({
        state: { ...createCurrentState(), currentBid: 0 },
        now: () => "2026-07-07T09:10:00.000Z"
      })
    ).toMatchObject({ ok: false, error: "current_bid_required" });
  });
});

function createCurrentState(): AuctionState {
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
        status: "Current",
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
        { category: "Ace Women", playerIds: [] },
        { category: "Women All Rounders", playerIds: [] },
        { category: "Men Bowlers", playerIds: [] },
        { category: "Men Batsmen", playerIds: [] },
        { category: "Men All Rounders", playerIds: [] }
      ],
      playerIds: ["player-1"],
      generatedAt: "2026-07-07T08:30:00.000Z"
    },
    currentPlayerId: "player-1",
    currentBid: 10,
    selectedTeamId: "team-1",
    undoHistory: [],
    createdAt: "2026-07-07T08:30:00.000Z",
    updatedAt: "2026-07-07T08:30:00.000Z",
    persistenceFailure: null
  };
}
