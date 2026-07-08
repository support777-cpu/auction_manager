/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { BoardStateDto } from "@auction-manager/shared";
import {
  canAttemptMarkSold,
  canAttemptMarkUnsold,
  canIncreaseBid,
  canUndo,
  canSelectTeam,
  canRevealNextPlayer,
  canSwitchLiveView,
  formatAuctionRoleLabel,
  formatLiveBiddingStatus,
  formatRoleCountsSummary,
  getManualAssignmentBlockedReasons,
  getManualAssignmentCounters,
  getManualAssignmentPoolPlayers,
  getPhase1OrderStatusLabel,
  getSoldRosterRowsForTeam,
  getTeamCapacityCopy,
  getTeamRoster,
  isEditableShortcutTarget
} from "./auction-board-helpers.js";

function createBoardState(
  overrides: Partial<BoardStateDto> = {}
): BoardStateDto {
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
      phase1CategoryOrder: ["Ace Men"],
      manualAssignmentBudgetBehavior: "NoBudgetImpact"
    },
    players: [],
    currentPlayer: null,
    currentBid: null,
    selectedTeamId: null,
    phase2PoolCount: 0,
    persistenceFailure: null,
    teams: [],
    teamRosters: [],
    canUndo: false,
    lastUndoAction: null,
    phase1Progress: {
      orderedPlayerCount: 8,
      pendingPlayerCount: 8,
      revealedPlayerCount: 0,
      currentCategory: "Ace Men",
      categories: []
    },
    ...overrides
  };
}

describe("auction board helpers", () => {
  it("labels phase 1 order readiness from progress counts", () => {
    expect(
      getPhase1OrderStatusLabel({
        orderedPlayerCount: 0,
        pendingPlayerCount: 0,
        revealedPlayerCount: 0,
        currentCategory: null,
        categories: []
      })
    ).toBe("No Phase 1 players ordered");
    expect(
      getPhase1OrderStatusLabel({
        orderedPlayerCount: 8,
        pendingPlayerCount: 8,
        revealedPlayerCount: 0,
        currentCategory: "Ace Men",
        categories: []
      })
    ).toBe("Phase 1 order ready");
    expect(
      getPhase1OrderStatusLabel({
        orderedPlayerCount: 8,
        pendingPlayerCount: 7,
        revealedPlayerCount: 1,
        currentCategory: "Ace Men",
        categories: []
      })
    ).toBe("Phase 1 in progress");
    expect(
      getPhase1OrderStatusLabel({
        orderedPlayerCount: 8,
        pendingPlayerCount: 0,
        revealedPlayerCount: 8,
        currentCategory: null,
        categories: []
      })
    ).toBe("Phase 1 order complete");
  });

  it("enables reveal only when initial auction has pending players and no blockers", () => {
    expect(canRevealNextPlayer(createBoardState())).toBe(true);
    expect(
      canRevealNextPlayer(
        createBoardState({
          currentPlayer: {
            id: "player-1",
            name: "Aarav Menon",
            role: "Ace",
            basePrice: 10,
            status: "Current",
            phase1Category: "Ace Men",
            soldPrice: null,
            winningTeamId: null,
            acquisitionType: null
          }
        })
      )
    ).toBe(false);
    expect(
      canRevealNextPlayer(
        createBoardState({
          phase1Progress: {
            orderedPlayerCount: 8,
            pendingPlayerCount: 0,
            revealedPlayerCount: 8,
            currentCategory: null,
            categories: []
          }
        })
      )
    ).toBe(false);
    expect(
      canRevealNextPlayer(
        createBoardState({
          persistenceFailure: "snapshot_write_failed"
        })
      )
    ).toBe(false);
  });

  it("enables Team selection only with a current player, current bid, and no blockers", () => {
    const currentPlayer = {
      id: "player-1",
      name: "Aarav Menon",
      role: "Ace" as const,
      basePrice: 10,
      status: "Current" as const,
      phase1Category: "Ace Men" as const,
      soldPrice: null,
      winningTeamId: null,
      acquisitionType: null
    };

    expect(
      canSelectTeam(
        createBoardState({
          currentPlayer,
          currentBid: 10
        })
      )
    ).toBe(true);
    expect(canSelectTeam(createBoardState({ currentBid: 10 }))).toBe(false);
    expect(canSelectTeam(createBoardState({ currentPlayer }))).toBe(false);
    expect(
      canSelectTeam(
        createBoardState({
          currentPlayer,
          currentBid: 10,
          persistenceFailure: "snapshot_write_failed"
        })
      )
    ).toBe(false);
  });

  it("enables Increase Bid only with a current player, current bid, and no blockers", () => {
    const currentPlayer = {
      id: "player-1",
      name: "Aarav Menon",
      role: "Ace" as const,
      basePrice: 10,
      status: "Current" as const,
      phase1Category: "Ace Men" as const,
      soldPrice: null,
      winningTeamId: null,
      acquisitionType: null
    };

    expect(
      canIncreaseBid(
        createBoardState({
          currentPlayer,
          currentBid: 10
        })
      )
    ).toBe(true);
    expect(canIncreaseBid(createBoardState({ currentBid: 10 }))).toBe(false);
    expect(canIncreaseBid(createBoardState({ currentPlayer }))).toBe(false);
    expect(
      canIncreaseBid(
        createBoardState({
          currentPlayer,
          currentBid: 10,
          persistenceFailure: "snapshot_write_failed"
        })
      )
    ).toBe(false);
  });

  it("enables Mark Sold only with Current Player, Current Bid, selected Team, and no blockers", () => {
    const currentPlayer = {
      id: "player-1",
      name: "Aarav Menon",
      role: "Ace" as const,
      basePrice: 10,
      status: "Current" as const,
      phase1Category: "Ace Men" as const,
      soldPrice: null,
      winningTeamId: null,
      acquisitionType: null
    };
    const teams = [
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
    ];

    expect(
      canAttemptMarkSold(
        createBoardState({
          currentPlayer,
          currentBid: 10,
          selectedTeamId: "team-1",
          teams
        })
      )
    ).toBe(true);
    expect(
      canAttemptMarkSold(
        createBoardState({
          currentPlayer,
          currentBid: 0,
          selectedTeamId: "team-1",
          teams
        })
      )
    ).toBe(false);
    expect(
      canAttemptMarkSold(
        createBoardState({
          currentBid: 10,
          selectedTeamId: "team-1",
          teams
        })
      )
    ).toBe(false);
    expect(
      canAttemptMarkSold(
        createBoardState({
          currentPlayer,
          selectedTeamId: "team-1",
          teams
        })
      )
    ).toBe(false);
    expect(
      canAttemptMarkSold(
        createBoardState({
          currentPlayer,
          currentBid: 10,
          teams
        })
      )
    ).toBe(false);
    expect(
      canAttemptMarkSold(
        createBoardState({
          currentPlayer,
          currentBid: 10,
          selectedTeamId: "team-missing",
          teams
        })
      )
    ).toBe(false);
    expect(
      canAttemptMarkSold(
        createBoardState({
          currentPlayer,
          currentBid: 10,
          selectedTeamId: "team-1",
          teams,
          persistenceFailure: "snapshot_write_failed"
        })
      )
    ).toBe(false);
  });

  it("enables Mark Unsold with any Current Player during Initial Auction regardless of Team or bid", () => {
    const currentPlayer = {
      id: "player-1",
      name: "Aarav Menon",
      role: "Ace" as const,
      basePrice: 10,
      status: "Current" as const,
      phase1Category: "Ace Men" as const,
      soldPrice: null,
      winningTeamId: null,
      acquisitionType: null
    };

    expect(canAttemptMarkUnsold(createBoardState({ currentPlayer }))).toBe(true);
    expect(
      canAttemptMarkUnsold(
        createBoardState({
          currentPlayer,
          currentBid: 12,
          selectedTeamId: "team-1"
        })
      )
    ).toBe(true);
    expect(canAttemptMarkUnsold(createBoardState())).toBe(false);
    expect(
      canAttemptMarkUnsold(
        createBoardState({
          currentPlayer,
          phase: "UnsoldBidding"
        })
      )
    ).toBe(false);
    expect(
      canAttemptMarkUnsold(
        createBoardState({
          currentPlayer,
          persistenceFailure: "snapshot_write_failed"
        })
      )
    ).toBe(false);
  });

  it("enables Undo only when history exists and persistence is healthy", () => {
    expect(
      canUndo(
        createBoardState({
          canUndo: true,
          lastUndoAction: {
            command: "MarkSold",
            summary: "Undo Mark Sold: Aarav Menon."
          }
        })
      )
    ).toBe(true);
    expect(canUndo(createBoardState({ canUndo: false }))).toBe(false);
    expect(
      canUndo(
        createBoardState({
          canUndo: true,
          persistenceFailure: "snapshot_write_failed"
        })
      )
    ).toBe(false);
  });

  it("formats live bidding status from team selection and current bid", () => {
    const team = {
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
      },
      currentPlayerCapacity: {
        teamId: "team-1",
        canBuy: true,
        reasons: []
      }
    };

    expect(
      formatLiveBiddingStatus(
        createBoardState({
          teams: [team],
          teamRosters: [
            {
              teamId: "team-1",
              name: "Falcons",
              captain: "Priya Captain",
              budget: 170,
              remainingBudget: 170,
              squadCount: 0,
              roleCounts: team.roleCounts,
              roster: []
            }
          ],
          selectedTeamId: "team-1",
          currentBid: 10,
          currentPlayer: {
            id: "player-1",
            name: "Aarav Menon",
            role: "Ace",
            phase1Category: "Ace Men",
            basePrice: 10,
            status: "Current",
            soldPrice: null,
            winningTeamId: null,
            acquisitionType: null
          }
        })
      )
    ).toBe("Falcons is bidding");
    expect(
      formatLiveBiddingStatus(
        createBoardState({
          selectedTeamId: null,
          currentBid: 10
        })
      )
    ).toBe("Waiting for bids");
    expect(formatLiveBiddingStatus(createBoardState(), { selecting: true })).toBe(
      "Selecting team..."
    );
  });

  it("ignores Increase Bid shortcut targets inside editable fields", () => {
    expect(isEditableShortcutTarget(null)).toBe(false);
    expect(isEditableShortcutTarget(document.createElement("div"))).toBe(false);
    expect(isEditableShortcutTarget(document.createElement("input"))).toBe(true);
    expect(isEditableShortcutTarget(document.createElement("textarea"))).toBe(true);
    expect(isEditableShortcutTarget(document.createElement("select"))).toBe(true);

    const editable = document.createElement("div");
    Object.defineProperty(editable, "isContentEditable", { value: true });
    expect(isEditableShortcutTarget(editable)).toBe(true);
  });

  it("looks up team rosters and formats role labels from board state", () => {
    const roster = {
      teamId: "team-1",
      name: "Falcons",
      captain: "Priya Captain",
      budget: 170,
      remainingBudget: 160,
      squadCount: 1,
      roleCounts: {
        Ace: 1,
        Batting: 0,
        Bowling: 0,
        AllRounder: 0,
        Girls: 0
      },
      roster: [
        {
          playerId: "player-1",
          name: "Aarav Menon",
          role: "Ace" as const,
          acquisitionType: "Sold" as const,
          soldPrice: 10
        }
      ]
    };
    const boardState = createBoardState({
      teams: [
        {
          id: "team-1",
          name: "Falcons",
          captain: "Priya Captain",
          budget: 170,
          remainingBudget: 160,
          squadCount: 1,
          roleCounts: roster.roleCounts
        }
      ],
      teamRosters: [roster]
    });

    expect(getTeamRoster(boardState, "team-1")).toEqual(roster);
    expect(getSoldRosterRowsForTeam(boardState, "team-missing")).toEqual([]);
    expect(formatAuctionRoleLabel("AllRounder")).toBe("All Rounder");
    expect(formatRoleCountsSummary(roster.roleCounts)).toContain("All Rounder 0");
    expect(canSwitchLiveView(boardState)).toBe(true);
    expect(canSwitchLiveView(createBoardState({ persistenceFailure: "snapshot_write_failed" }))).toBe(
      false
    );
  });

  it("formats team capacity copy for missing current player and blocked reasons", () => {
    const boardState = createBoardState({
      teams: [
        {
          id: "team-1",
          name: "Falcons",
          captain: "Priya Captain",
          budget: 170,
          remainingBudget: 160,
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
      teamRosters: [
        {
          teamId: "team-1",
          name: "Falcons",
          captain: "Priya Captain",
          budget: 170,
          remainingBudget: 160,
          squadCount: 0,
          roleCounts: {
            Ace: 0,
            Batting: 0,
            Bowling: 0,
            AllRounder: 0,
            Girls: 0
          },
          roster: []
        }
      ]
    });

    expect(getTeamCapacityCopy(boardState, "team-1")).toBe("Capacity pending Current Player");

    const blockedBoardState = createBoardState({
      currentPlayer: {
        id: "player-1",
        name: "Aarav Menon",
        role: "Ace",
        phase1Category: "Ace Men",
        basePrice: 10,
        status: "Current",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      },
      teams: [
        {
          id: "team-1",
          name: "Falcons",
          captain: "Priya Captain",
          budget: 170,
          remainingBudget: 8,
          squadCount: 0,
          roleCounts: {
            Ace: 0,
            Batting: 0,
            Bowling: 0,
            AllRounder: 0,
            Girls: 0
          },
          currentPlayerCapacity: {
            teamId: "team-1",
            canBuy: false,
            reasons: []
          }
        }
      ]
    });

    expect(getTeamCapacityCopy(blockedBoardState, "team-1")).toBe("Cannot buy current player");
  });

  it("derives manual assignment counters and blocked reasons from capacity state", () => {
    const boardState = createBoardState({
      phase: "ManualAssignment",
      currentPlayer: {
        id: "player-1",
        name: "Nisha George",
        role: "Girls",
        phase1Category: "Ace Women",
        basePrice: 8,
        status: "Current",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      },
      players: [
        {
          id: "player-1",
          name: "Nisha George",
          role: "Girls",
          phase1Category: "Ace Women",
          basePrice: 8,
          status: "Current",
          soldPrice: null,
          winningTeamId: null,
          acquisitionType: null
        },
        {
          id: "player-2",
          name: "Assigned Player",
          role: "Ace",
          phase1Category: "Ace Men",
          basePrice: 10,
          status: "Assigned",
          soldPrice: null,
          winningTeamId: "team-1",
          acquisitionType: "ManualAssignment"
        }
      ],
      teams: [
        {
          id: "team-1",
          name: "Falcons",
          captain: "Falcons Captain",
          budget: 170,
          remainingBudget: 80,
          squadCount: 5,
          roleCounts: {
            Ace: 0,
            Batting: 1,
            Bowling: 1,
            AllRounder: 1,
            Girls: 1
          },
          currentPlayerCapacity: {
            teamId: "team-1",
            canBuy: true,
            reasons: []
          }
        },
        {
          id: "team-2",
          name: "Lions",
          captain: "Lions Captain",
          budget: 170,
          remainingBudget: 52,
          squadCount: 8,
          roleCounts: {
            Ace: 0,
            Batting: 1,
            Bowling: 1,
            AllRounder: 1,
            Girls: 3
          },
          currentPlayerCapacity: {
            teamId: "team-2",
            canBuy: false,
            reasons: []
          }
        },
        {
          id: "team-3",
          name: "Royals",
          captain: "Royals Captain",
          budget: 170,
          remainingBudget: 60,
          squadCount: 8,
          roleCounts: {
            Ace: 0,
            Batting: 1,
            Bowling: 1,
            AllRounder: 1,
            Girls: 2
          }
        }
      ]
    });

    expect(getManualAssignmentPoolPlayers(boardState)).toHaveLength(1);
    expect(getManualAssignmentCounters(boardState)).toEqual({
      pool: 2,
      assigned: 1,
      remaining: 1,
      valid: 1,
      blocked: 1,
      teams: 3
    });
    expect(getManualAssignmentBlockedReasons(boardState)).toEqual([
      "Lions blocked: Cannot buy current player"
    ]);
    expect(getManualAssignmentBlockedReasons(createBoardState())).toEqual([]);
  });
});
