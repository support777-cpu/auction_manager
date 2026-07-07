/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { BoardStateDto } from "@auction-manager/shared";
import {
  canAttemptMarkSold,
  canIncreaseBid,
  canSelectTeam,
  canRevealNextPlayer,
  getPhase1OrderStatusLabel,
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
    persistenceFailure: null,
    teams: [],
    canUndo: false,
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
});
