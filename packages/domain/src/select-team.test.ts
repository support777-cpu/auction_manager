import { describe, expect, it } from "vitest";
import type { AuctionState } from "@auction-manager/shared";
import { getCurrentPlayerTeamCapacity, selectTeam } from "./select-team.js";

describe("selectTeam", () => {
  it("selects an existing Team and records a reversible undo entry", () => {
    const state = createCurrentState();
    const result = selectTeam({
      state,
      teamId: "team-1",
      now: () => "2026-07-07T09:10:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.selectedTeamId).toBe("team-1");
    expect(result.summary).toBe("Selected Falcons for Aarav Menon.");
    expect(result.undoRecorded).toBe(true);
    expect(result.state.selectedTeamId).toBe("team-1");
    expect(result.state.updatedAt).toBe("2026-07-07T09:10:00.000Z");
    expect(result.state.undoHistory).toEqual([
      {
        command: "SelectTeam",
        previousSelectedTeamId: null,
        nextSelectedTeamId: "team-1",
        currentPlayerId: "player-1",
        currentBid: 10,
        timestamp: "2026-07-07T09:10:00.000Z"
      }
    ]);
    expect(result.state.players).toEqual(state.players);
    expect(result.state.teams).toEqual(state.teams);
    expect(result.state.currentBid).toBe(state.currentBid);
    expect(result.state.phase1Order).toEqual(state.phase1Order);
    expect(result.state.phase).toBe(state.phase);
  });

  it("changes Team and clears selection", () => {
    const selected = selectTeam({
      state: createCurrentState(),
      teamId: "team-1",
      now: () => "2026-07-07T09:10:00.000Z"
    });
    expect(selected.ok).toBe(true);
    if (!selected.ok) {
      return;
    }

    const changed = selectTeam({
      state: selected.state,
      teamId: "team-2",
      now: () => "2026-07-07T09:11:00.000Z"
    });
    expect(changed.ok).toBe(true);
    if (!changed.ok) {
      return;
    }
    expect(changed.state.selectedTeamId).toBe("team-2");
    expect(changed.state.undoHistory.at(-1)).toMatchObject({
      command: "SelectTeam",
      previousSelectedTeamId: "team-1",
      nextSelectedTeamId: "team-2"
    });

    const cleared = selectTeam({
      state: changed.state,
      teamId: null,
      now: () => "2026-07-07T09:12:00.000Z"
    });
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) {
      return;
    }
    expect(cleared.summary).toBe("Cleared selected Team.");
    expect(cleared.state.selectedTeamId).toBeNull();
    expect(cleared.state.undoHistory.at(-1)).toMatchObject({
      command: "SelectTeam",
      previousSelectedTeamId: "team-2",
      nextSelectedTeamId: null
    });
  });

  it("treats selecting the same Team as a success without duplicate undo history", () => {
    const state = { ...createCurrentState(), selectedTeamId: "team-1" };
    const result = selectTeam({
      state,
      teamId: "team-1",
      now: () => "2026-07-07T09:10:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.undoRecorded).toBe(false);
    expect(result.state).toBe(state);
    expect(result.state.undoHistory).toHaveLength(0);
  });

  it("rejects wrong phase, missing current player, missing current bid, and unknown Team", () => {
    expect(
      selectTeam({
        state: { ...createCurrentState(), phase: "Setup" },
        teamId: "team-1",
        now: () => "2026-07-07T09:10:00.000Z"
      })
    ).toMatchObject({ ok: false, error: "auction_not_in_initial_phase" });

    expect(
      selectTeam({
        state: { ...createCurrentState(), currentPlayerId: null },
        teamId: "team-1",
        now: () => "2026-07-07T09:10:00.000Z"
      })
    ).toMatchObject({ ok: false, error: "current_player_required" });

    expect(
      selectTeam({
        state: { ...createCurrentState(), currentBid: null },
        teamId: "team-1",
        now: () => "2026-07-07T09:10:00.000Z"
      })
    ).toMatchObject({ ok: false, error: "current_bid_required" });

    expect(
      selectTeam({
        state: { ...createCurrentState(), currentBid: 0 },
        teamId: "team-1",
        now: () => "2026-07-07T09:10:00.000Z"
      })
    ).toMatchObject({ ok: false, error: "current_bid_required" });

    expect(
      selectTeam({
        state: createCurrentState(),
        teamId: "team-unknown",
        now: () => "2026-07-07T09:10:00.000Z"
      })
    ).toMatchObject({ ok: false, error: "team_not_found" });
  });

  it("reports incomplete role capacity data as blocked", () => {
    const incompleteState = {
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
        },
        createCurrentState().teams[1]!
      ]
    };

    expect(getCurrentPlayerTeamCapacity(incompleteState, "team-1")).toEqual({
      teamId: "team-1",
      canBuy: false,
      reasons: ["Falcons role capacity data is incomplete for Ace."]
    });
  });
});

describe("getCurrentPlayerTeamCapacity", () => {
  it("reports valid capacity for the Current Player role", () => {
    expect(getCurrentPlayerTeamCapacity(createCurrentState(), "team-1")).toEqual({
      teamId: "team-1",
      canBuy: true,
      reasons: []
    });
  });

  it("reports budget, squad-size, role-target, and combined block reasons", () => {
    const blockedState = {
      ...createCurrentState(),
      teams: [
        {
          ...createCurrentState().teams[0],
          remainingBudget: 8,
          squadCount: 13,
          roleCounts: {
            ...createCurrentState().teams[0]!.roleCounts,
            Ace: 2
          }
        },
        createCurrentState().teams[1]!
      ]
    };

    expect(getCurrentPlayerTeamCapacity(blockedState, "team-1")).toEqual({
      teamId: "team-1",
      canBuy: false,
      reasons: [
        "Falcons have 8 remaining; current bid is 10.",
        "Falcons already have 13 of 13 players.",
        "Falcons have 2 of 2 Ace slots filled."
      ]
    });
  });

  it("returns null when capacity cannot be evaluated", () => {
    expect(
      getCurrentPlayerTeamCapacity(
        { ...createCurrentState(), currentPlayerId: null },
        "team-1"
      )
    ).toBeNull();
    expect(getCurrentPlayerTeamCapacity(createCurrentState(), "team-unknown"))
      .toBeNull();
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
      },
      {
        id: "team-2",
        name: "Eagles",
        captain: "Dev Captain",
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
    selectedTeamId: null,
    undoHistory: [],
    createdAt: "2026-07-07T08:30:00.000Z",
    updatedAt: "2026-07-07T08:30:00.000Z",
    persistenceFailure: null
  };
}
