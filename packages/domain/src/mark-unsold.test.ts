import { describe, expect, it } from "vitest";
import type { AuctionState } from "@auction-manager/shared";
import { markUnsold } from "./mark-unsold.js";

describe("markUnsold", () => {
  it("returns typed prerequisite conflicts preserving state identity without mutation", () => {
    const state = createCurrentState();
    const now = () => "2026-07-07T08:35:00.000Z";

    const setupState = { ...state, phase: "Setup" as const };
    const setupResult = markUnsold({ state: setupState, now });
    expect(setupResult).toMatchObject({
      ok: false,
      error: "auction_not_in_initial_phase",
      message: "Mark Unsold is only available during Initial Auction."
    });
    expect(setupResult.state).toBe(setupState);

    const noCurrentState = { ...state, currentPlayerId: null };
    const noCurrentResult = markUnsold({ state: noCurrentState, now });
    expect(noCurrentResult).toMatchObject({
      ok: false,
      error: "current_player_required",
      message: "Reveal a Current Player before marking unsold."
    });
    expect(noCurrentResult.state).toBe(noCurrentState);

    const missingPlayerState = { ...state, currentPlayerId: "missing-player" };
    const missingPlayerResult = markUnsold({ state: missingPlayerState, now });
    expect(missingPlayerResult).toMatchObject({
      ok: false,
      error: "current_player_not_found",
      message: "Current Player could not be found in this auction."
    });
    expect(missingPlayerResult.state).toBe(missingPlayerState);

    const staleStatusState = {
      ...state,
      players: [{ ...state.players[0]!, status: "Sold" as const }]
    };
    const staleStatusResult = markUnsold({ state: staleStatusState, now });
    expect(staleStatusResult).toMatchObject({
      ok: false,
      error: "current_player_required",
      message: "Current Player must be active before marking unsold."
    });
    expect(staleStatusResult.state).toBe(staleStatusState);
    expect(staleStatusResult.state.updatedAt).toBe("2026-07-07T08:30:00.000Z");
    expect(staleStatusResult.state.phase2Pool).toEqual([]);
    expect(staleStatusResult.state.undoHistory).toEqual([]);
  });

  it("rejects when the Current Player is already in the Phase 2 pool", () => {
    const state = {
      ...createCurrentState(),
      phase2Pool: ["player-1"]
    };
    const result = markUnsold({
      state,
      now: () => "2026-07-07T08:35:00.000Z"
    });

    expect(result).toMatchObject({
      ok: false,
      error: "player_already_in_phase2_pool",
      message: "Current Player is already in the Phase 2 pool."
    });
    expect(result.state).toBe(state);
    expect(state.phase2Pool).toEqual(["player-1"]);
  });

  it("marks the Current Player unsold into the Phase 2 pool without touching teams", () => {
    const state = createCurrentState();
    const result = markUnsold({
      state,
      now: () => "2026-07-07T08:35:00.000Z"
    });

    expect(result).toMatchObject({
      ok: true,
      accepted: true,
      message: "Marked unsold. Aarav Menon moves to Phase 2 rebid."
    });
    expect(result.state).not.toBe(state);
    expect(result.state.players[0]).toMatchObject({
      id: "player-1",
      status: "Unsold",
      soldPrice: null,
      winningTeamId: null,
      acquisitionType: null
    });
    expect(result.state.phase2Pool).toEqual(["player-1"]);
    expect(result.state.teams).toBe(state.teams);
    expect(result.state.currentPlayerId).toBeNull();
    expect(result.state.currentBid).toBeNull();
    expect(result.state.selectedTeamId).toBeNull();
    expect(result.state.updatedAt).toBe("2026-07-07T08:35:00.000Z");
    expect(result.state.undoHistory).toEqual([
      {
        command: "MarkUnsold",
        playerId: "player-1",
        previousPlayerStatus: "Current",
        previousCurrentPlayerId: "player-1",
        previousCurrentBid: 10,
        previousSelectedTeamId: "team-1",
        timestamp: "2026-07-07T08:35:00.000Z"
      }
    ]);
    expect(result.state.phase1Order).toBe(state.phase1Order);
    expect(result.state.parameters).toBe(state.parameters);
    expect(result.state.createdAt).toBe("2026-07-07T08:30:00.000Z");
    expect(result.state.persistenceFailure).toBeNull();

    expect(state.players[0]).toMatchObject({
      status: "Current",
      soldPrice: null,
      winningTeamId: null,
      acquisitionType: null
    });
    expect(state.phase2Pool).toEqual([]);
    expect(state.currentPlayerId).toBe("player-1");
    expect(state.undoHistory).toEqual([]);
    expect(state.updatedAt).toBe("2026-07-07T08:30:00.000Z");
  });

  it("discards a raised bid and selected Team while capturing them in the undo entry", () => {
    const state = {
      ...createCurrentState(),
      currentBid: 16,
      selectedTeamId: "team-1"
    };

    const result = markUnsold({
      state,
      now: () => "2026-07-07T08:36:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.currentBid).toBeNull();
    expect(result.state.selectedTeamId).toBeNull();
    expect(result.state.teams).toBe(state.teams);
    expect(result.state.teams[0]).toMatchObject({
      remainingBudget: 170,
      squadCount: 0,
      roleCounts: { Ace: 0 }
    });
    expect(result.state.undoHistory.at(-1)).toEqual({
      command: "MarkUnsold",
      playerId: "player-1",
      previousPlayerStatus: "Current",
      previousCurrentPlayerId: "player-1",
      previousCurrentBid: 16,
      previousSelectedTeamId: "team-1",
      timestamp: "2026-07-07T08:36:00.000Z"
    });
  });

  it("succeeds without a selected Team and never records a winner or price", () => {
    const state = {
      ...createCurrentState(),
      selectedTeamId: null
    };

    const result = markUnsold({
      state,
      now: () => "2026-07-07T08:36:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.players[0]).toMatchObject({
      status: "Unsold",
      soldPrice: null,
      winningTeamId: null,
      acquisitionType: null
    });
    expect(result.state.undoHistory.at(-1)).toMatchObject({
      command: "MarkUnsold",
      previousSelectedTeamId: null
    });
  });

  it("appends the player exactly once to a non-empty Phase 2 pool", () => {
    const state = {
      ...createCurrentState(),
      players: [
        {
          ...createCurrentState().players[0]!
        },
        {
          ...createCurrentState().players[0]!,
          id: "player-2",
          name: "Bela Rao",
          status: "Unsold" as const
        }
      ],
      phase1Order: {
        categories: [
          { category: "Ace Men" as const, playerIds: ["player-1", "player-2"] },
          { category: "Ace Women" as const, playerIds: [] },
          { category: "Women All Rounders" as const, playerIds: [] },
          { category: "Men Bowlers" as const, playerIds: [] },
          { category: "Men Batsmen" as const, playerIds: [] },
          { category: "Men All Rounders" as const, playerIds: [] }
        ],
        playerIds: ["player-1", "player-2"],
        generatedAt: "2026-07-07T08:30:00.000Z"
      },
      phase2Pool: ["player-2"]
    };

    const result = markUnsold({
      state,
      now: () => "2026-07-07T08:36:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.phase2Pool).toEqual(["player-2", "player-1"]);
    expect(
      result.state.phase2Pool.filter((playerId) => playerId === "player-1")
    ).toHaveLength(1);
    expect(state.phase2Pool).toEqual(["player-2"]);
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
    phase2Pool: [],
    undoHistory: [],
    createdAt: "2026-07-07T08:30:00.000Z",
    updatedAt: "2026-07-07T08:30:00.000Z",
    persistenceFailure: null
  };
}
