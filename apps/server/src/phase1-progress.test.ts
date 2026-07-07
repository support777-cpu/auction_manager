import { describe, expect, it } from "vitest";
import type { AuctionState } from "@auction-manager/shared";
import { toPhase1ProgressDto } from "./phase1-progress.js";

describe("toPhase1ProgressDto", () => {
  it("keeps the current player category while they are on block", () => {
    const state = createState({
      currentPlayerId: "player-2",
      players: [
        createPlayer({ id: "player-1", status: "Sold" }),
        createPlayer({ id: "player-2", status: "Current" }),
        createPlayer({ id: "player-3", status: "Pending" })
      ],
      phase1Order: {
        categories: [
          { category: "Ace Men", playerIds: ["player-1", "player-2"] },
          { category: "Ace Women", playerIds: ["player-3"] }
        ],
        playerIds: ["player-1", "player-2", "player-3"],
        generatedAt: "2026-07-07T08:30:00.000Z"
      }
    });

    expect(toPhase1ProgressDto(state)).toMatchObject({
      currentCategory: "Ace Men",
      pendingPlayerCount: 1,
      revealedPlayerCount: 2,
      categories: [
        { category: "Ace Men", total: 2, pending: 0, completed: 1 },
        { category: "Ace Women", total: 1, pending: 1, completed: 0 }
      ]
    });
  });

  it("ignores orphan order ids when counting progress", () => {
    const state = createState({
      phase1Order: {
        categories: [{ category: "Ace Men", playerIds: ["player-1", "missing-player"] }],
        playerIds: ["player-1", "missing-player"],
        generatedAt: "2026-07-07T08:30:00.000Z"
      }
    });

    expect(toPhase1ProgressDto(state)).toMatchObject({
      orderedPlayerCount: 2,
      pendingPlayerCount: 1,
      revealedPlayerCount: 0
    });
  });
});

function createState(overrides: Partial<AuctionState>): AuctionState {
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
      phase1CategoryOrder: ["Ace Men", "Ace Women"],
      manualAssignmentBudgetBehavior: "NoBudgetImpact"
    },
    players: [createPlayer({ id: "player-1" })],
    teams: [],
    phase1Order: {
      categories: [{ category: "Ace Men", playerIds: ["player-1"] }],
      playerIds: ["player-1"],
      generatedAt: "2026-07-07T08:30:00.000Z"
    },
    currentPlayerId: null,
    currentBid: null,
    selectedTeamId: null,
    undoHistory: [],
    createdAt: "2026-07-07T08:30:00.000Z",
    updatedAt: "2026-07-07T08:30:00.000Z",
    persistenceFailure: null,
    ...overrides
  };
}

function createPlayer(
  overrides: Partial<AuctionState["players"][number]>
): AuctionState["players"][number] {
  return {
    id: "player-1",
    name: "Aarav Menon",
    gender: "Male",
    role: "Ace",
    phase1Category: "Ace Men",
    basePrice: 10,
    status: "Pending",
    soldPrice: null,
    winningTeamId: null,
    acquisitionType: null,
    ...overrides
  };
}
