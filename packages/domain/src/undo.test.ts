import { describe, expect, it } from "vitest";
import type { AuctionState } from "@auction-manager/shared";
import { increaseBid } from "./increase-bid.js";
import { markSold } from "./mark-sold.js";
import { markUnsold } from "./mark-unsold.js";
import { revealNextPlayer } from "./reveal-next-player.js";
import { selectTeam } from "./select-team.js";
import { undoLastAction } from "./undo.js";

describe("undoLastAction", () => {
  it("rejects empty history, unsupported phases, and unsupported commands without mutation", () => {
    const state = createBaseState();
    const now = () => "2026-07-07T08:40:00.000Z";

    expect(undoLastAction({ state, now })).toMatchObject({
      ok: false,
      error: "no_actions_to_undo",
      message: "No actions to undo."
    });

    expect(
      undoLastAction({
        state: {
          ...state,
          phase: "UnsoldBidding",
          undoHistory: [
            {
              command: "RevealNextPlayer",
              playerId: "player-1",
              previousCurrentPlayerId: null,
              previousCurrentBid: null,
              previousSelectedTeamId: null,
              previousPlayerStatus: "Pending",
              timestamp: "2026-07-07T08:31:00.000Z"
            }
          ]
        },
        now
      })
    ).toMatchObject({
      ok: false,
      error: "auction_not_in_initial_phase",
      message: "Undo is not available in this phase."
    });

    const unsupportedState = {
      ...state,
      undoHistory: [
        {
          command: "CloseAuction",
          timestamp: "2026-07-07T08:39:00.000Z"
        }
      ]
    } as unknown as AuctionState;
    expect(undoLastAction({ state: unsupportedState, now })).toMatchObject({
      ok: false,
      error: "unsupported_undo_action"
    });
    expect(unsupportedState.undoHistory).toHaveLength(1);
  });

  it("undoes Reveal Next Player by restoring current and player pending state", () => {
    const revealed = revealNextPlayer({
      state: createBaseState(),
      now: () => "2026-07-07T08:31:00.000Z"
    });
    expect(revealed.ok).toBe(true);
    if (!revealed.ok) return;

    const result = undoLastAction({
      state: revealed.state,
      now: () => "2026-07-07T08:40:00.000Z"
    });

    expect(result).toMatchObject({
      ok: true,
      undoneAction: revealed.state.undoHistory.at(-1),
      message: "Undid Reveal Next Player: Aarav Menon."
    });
    expect(result.state.players[0]).toMatchObject({ status: "Pending" });
    expect(result.state.currentPlayerId).toBeNull();
    expect(result.state.currentBid).toBeNull();
    expect(result.state.selectedTeamId).toBeNull();
    expect(result.state.undoHistory).toEqual([]);
    expect(result.state.updatedAt).toBe("2026-07-07T08:40:00.000Z");
    expect(revealed.state.players[0]?.status).toBe("Current");
  });

  it("undoes Select Team and pops exactly one history entry", () => {
    const current = currentState();
    const selected = selectTeam({
      state: current,
      teamId: "team-1",
      now: () => "2026-07-07T08:32:00.000Z"
    });
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;

    const result = undoLastAction({
      state: selected.state,
      now: () => "2026-07-07T08:40:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.selectedTeamId).toBeNull();
    expect(result.state.currentPlayerId).toBe("player-1");
    expect(result.state.currentBid).toBe(10);
    expect(result.state.players).toBe(selected.state.players);
    expect(result.state.teams).toBe(selected.state.teams);
    expect(result.state.undoHistory).toEqual(current.undoHistory);
  });

  it("undoes Increase Bid without changing player or team state", () => {
    const current = currentState();
    const selected = selectTeam({
      state: current,
      teamId: "team-1",
      now: () => "2026-07-07T08:32:00.000Z"
    });
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    const increased = increaseBid({
      state: selected.state,
      now: () => "2026-07-07T08:33:00.000Z"
    });
    expect(increased.ok).toBe(true);
    if (!increased.ok) return;

    const result = undoLastAction({
      state: increased.state,
      now: () => "2026-07-07T08:40:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.currentBid).toBe(10);
    expect(result.state.selectedTeamId).toBe("team-1");
    expect(result.state.players).toBe(increased.state.players);
    expect(result.state.teams).toBe(increased.state.teams);
    expect(result.state.undoHistory).toHaveLength(
      increased.state.undoHistory.length - 1
    );
    expect(result.state.undoHistory.at(-1)?.command).toBe("SelectTeam");
  });

  it("undoes Mark Sold by restoring player, team, current fields, and roster ownership source", () => {
    const sold = soldState();
    const result = undoLastAction({
      state: sold,
      now: () => "2026-07-07T08:40:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]).toMatchObject({
      status: "Current",
      soldPrice: null,
      winningTeamId: null,
      acquisitionType: null
    });
    expect(result.state.teams[0]).toMatchObject({
      remainingBudget: 170,
      squadCount: 0,
      roleCounts: { Ace: 0 }
    });
    expect(result.state.currentPlayerId).toBe("player-1");
    expect(result.state.currentBid).toBe(10);
    expect(result.state.selectedTeamId).toBe("team-1");
    expect(result.state.undoHistory).toHaveLength(sold.undoHistory.length - 1);
    expect(result.state.undoHistory.at(-1)?.command).toBe("SelectTeam");
    expect(sold.players[0]).toMatchObject({
      status: "Sold",
      soldPrice: 10,
      winningTeamId: "team-1"
    });
  });

  it("undoes Mark Unsold by removing only the affected player from phase2Pool", () => {
    const markedUnsold = markUnsold({
      state: {
        ...currentState(),
        phase2Pool: ["player-2"]
      },
      now: () => "2026-07-07T08:34:00.000Z"
    });
    expect(markedUnsold.ok).toBe(true);
    if (!markedUnsold.ok) return;

    const result = undoLastAction({
      state: markedUnsold.state,
      now: () => "2026-07-07T08:40:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]).toMatchObject({ status: "Current" });
    expect(result.state.phase2Pool).toEqual(["player-2"]);
    expect(result.state.teams).toBe(markedUnsold.state.teams);
    expect(result.state.currentPlayerId).toBe("player-1");
    expect(result.state.currentBid).toBe(10);
    expect(result.state.selectedTeamId).toBeNull();
  });

  it("rejects undo when affected player or winning team is missing from state", () => {
    const state = createBaseState();
    const now = () => "2026-07-07T08:40:00.000Z";

    expect(
      undoLastAction({
        state: {
          ...state,
          undoHistory: [
            {
              command: "RevealNextPlayer",
              playerId: "missing-player",
              previousCurrentPlayerId: null,
              previousCurrentBid: null,
              previousSelectedTeamId: null,
              previousPlayerStatus: "Pending",
              timestamp: "2026-07-07T08:31:00.000Z"
            }
          ]
        },
        now
      })
    ).toMatchObject({
      ok: false,
      error: "affected_player_not_found",
      message: "Undo target player is missing."
    });

    const soldHistory = soldState().undoHistory.at(-1);
    expect(soldHistory?.command).toBe("MarkSold");
    if (soldHistory?.command !== "MarkSold") {
      return;
    }

    expect(
      undoLastAction({
        state: {
          ...soldState(),
          teams: soldState().teams.map((team) =>
            team.id === soldHistory.winningTeamId
              ? { ...team, id: "removed-team" }
              : team
          ),
          undoHistory: [soldHistory]
        },
        now
      })
    ).toMatchObject({
      ok: false,
      error: "winning_team_not_found",
      message: "Undo target team is missing."
    });
  });
});

function currentState(): AuctionState {
  const revealed = revealNextPlayer({
    state: createBaseState(),
    now: () => "2026-07-07T08:31:00.000Z"
  });
  if (!revealed.ok) {
    throw new Error("fixture reveal failed");
  }
  return revealed.state;
}

function soldState(): AuctionState {
  const selected = selectTeam({
    state: currentState(),
    teamId: "team-1",
    now: () => "2026-07-07T08:32:00.000Z"
  });
  if (!selected.ok) {
    throw new Error("fixture select failed");
  }
  const sold = markSold({
    state: selected.state,
    now: () => "2026-07-07T08:34:00.000Z"
  });
  if (!sold.ok) {
    throw new Error("fixture sale failed");
  }
  return sold.state;
}

function createBaseState(): AuctionState {
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
        name: "Bela Rao",
        gender: "Female",
        role: "Ace",
        phase1Category: "Ace Women",
        basePrice: 10,
        status: "Unsold",
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
      playerIds: ["player-1", "player-2"],
      generatedAt: "2026-07-07T08:30:00.000Z"
    },
    currentPlayerId: null,
    currentBid: null,
    selectedTeamId: null,
    phase2Pool: [],
    undoHistory: [],
    createdAt: "2026-07-07T08:30:00.000Z",
    updatedAt: "2026-07-07T08:30:00.000Z",
    persistenceFailure: null
  };
}
