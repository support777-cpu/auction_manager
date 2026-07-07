import { describe, expect, it } from "vitest";
import type { AuctionState } from "@auction-manager/shared";
import { markSold } from "./mark-sold.js";

describe("markSold", () => {
  it("returns a blocked budget reason and preserves state identity", () => {
    const state = {
      ...createCurrentState(),
      teams: [
        {
          ...createCurrentState().teams[0]!,
          remainingBudget: 8
        }
      ]
    };

    const result = markSold({ state });

    expect(result).toMatchObject({
      ok: false,
      error: "sale_blocked",
      message: "Blocked: Falcons have 8 remaining; current bid is 10.",
      reasons: [
        {
          code: "budget_exceeded",
          message: "Blocked: Falcons have 8 remaining; current bid is 10."
        }
      ]
    });
    expect(result.state).toBe(state);
    expect(result.state).toEqual(state);
    expect(result.state.updatedAt).toBe("2026-07-07T08:30:00.000Z");
  });

  it("returns a blocked squad reason when budget and role capacity are valid", () => {
    const state = {
      ...createCurrentState(),
      teams: [
        {
          ...createCurrentState().teams[0]!,
          squadCount: 13
        }
      ]
    };

    expect(markSold({ state })).toMatchObject({
      ok: false,
      error: "sale_blocked",
      message: "Blocked: Falcons already have 13 of 13 players.",
      reasons: [
        {
          code: "squad_full",
          message: "Blocked: Falcons already have 13 of 13 players."
        }
      ]
    });
  });

  it("returns a blocked role-target reason when budget and squad capacity are valid", () => {
    const state = {
      ...createCurrentState(),
      teams: [
        {
          ...createCurrentState().teams[0]!,
          roleCounts: {
            ...createCurrentState().teams[0]!.roleCounts,
            Ace: 2
          }
        }
      ]
    };

    expect(markSold({ state })).toMatchObject({
      ok: false,
      error: "sale_blocked",
      message: "Blocked: Falcons have 2 of 2 Ace slots filled.",
      reasons: [
        {
          code: "role_target_full",
          message: "Blocked: Falcons have 2 of 2 Ace slots filled."
        }
      ]
    });
  });

  it("returns blocked squad and role reasons, including combined failures", () => {
    const state = {
      ...createCurrentState(),
      teams: [
        {
          ...createCurrentState().teams[0]!,
          remainingBudget: 8,
          squadCount: 13,
          roleCounts: {
            ...createCurrentState().teams[0]!.roleCounts,
            Ace: 2
          }
        }
      ]
    };

    expect(markSold({ state })).toMatchObject({
      ok: false,
      error: "sale_blocked",
      message: "Blocked: Falcons have 8 remaining; current bid is 10.",
      reasons: [
        {
          code: "budget_exceeded",
          message: "Blocked: Falcons have 8 remaining; current bid is 10."
        },
        {
          code: "squad_full",
          message: "Blocked: Falcons already have 13 of 13 players."
        },
        {
          code: "role_target_full",
          message: "Blocked: Falcons have 2 of 2 Ace slots filled."
        }
      ]
    });
  });

  it("blocks incomplete role capacity data", () => {
    const state = {
      ...createCurrentState(),
      teams: [
        {
          ...createCurrentState().teams[0]!,
          roleCounts: {
            Batting: 0,
            Bowling: 0,
            AllRounder: 0,
            Girls: 0
          }
        }
      ]
    };

    expect(markSold({ state })).toMatchObject({
      ok: false,
      error: "sale_blocked",
      reasons: [
        {
          code: "role_capacity_incomplete",
          message: "Blocked: Falcons role capacity data is incomplete for Ace."
        }
      ]
    });
  });

  it("returns typed prerequisite conflicts without mutation", () => {
    const state = createCurrentState();

    expect(markSold({ state: { ...state, phase: "Setup" } })).toMatchObject({
      ok: false,
      error: "auction_not_in_initial_phase",
      message: "Mark Sold is only available during Initial Auction."
    });
    expect(markSold({ state: { ...state, currentPlayerId: null } })).toMatchObject({
      ok: false,
      error: "current_player_required",
      message: "Reveal a Current Player before marking sold."
    });
    expect(markSold({ state: { ...state, currentPlayerId: "missing-player" } }))
      .toMatchObject({
        ok: false,
        error: "current_player_not_found",
        message: "Current Player could not be found in this auction."
      });
    expect(markSold({ state: { ...state, selectedTeamId: null } })).toMatchObject({
      ok: false,
      error: "selected_team_required",
      message: "Select a Team before marking sold."
    });
    expect(markSold({ state: { ...state, currentBid: null } })).toMatchObject({
      ok: false,
      error: "current_bid_required",
      message: "Current Bid is required before marking sold."
    });
    expect(markSold({ state: { ...state, currentBid: 0 } })).toMatchObject({
      ok: false,
      error: "current_bid_required",
      message: "Current Bid is required before marking sold."
    });
    expect(markSold({ state: { ...state, selectedTeamId: "team-unknown" } }))
      .toMatchObject({
        ok: false,
        error: "selected_team_not_found",
        message: "Selected Team could not be found in this auction."
      });
  });

  it("accepts only validation for valid sales without mutating successful sale state", () => {
    const state = createCurrentState();
    const result = markSold({ state });

    expect(result).toMatchObject({
      ok: true,
      accepted: true,
      message: "Falcons can buy Aarav Menon for 10."
    });
    expect(result.state).toBe(state);
    expect(result.state.players).toEqual(state.players);
    expect(result.state.teams).toEqual(state.teams);
    expect(result.state.undoHistory).toEqual([]);
    expect(result.state.updatedAt).toBe(state.updatedAt);
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
