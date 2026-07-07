import { describe, expect, it } from "vitest";
import {
  auctionStateSchema,
  boardStateDtoSchema,
  startAuctionRequestSchema,
  startAuctionResponseSchema
} from "./index.js";

describe("auction state contracts", () => {
  it("requires a clientCommandId for Start Auction", () => {
    expect(startAuctionRequestSchema.safeParse({ clientCommandId: "cmd-1" }).success)
      .toBe(true);
    expect(startAuctionRequestSchema.safeParse({}).success).toBe(false);
  });

  it("rejects private setup source fields in board DTOs", () => {
    const state = createBoardState();

    expect(boardStateDtoSchema.safeParse(state).success).toBe(true);
    expect(
      boardStateDtoSchema.safeParse({
        ...state,
        players: [
          {
            ...state.players[0],
            sourceRowNumber: 2,
            email: "private-player@example.com",
            paymentTransactionId: "UPI-PRIVATE"
          }
        ]
      }).success
    ).toBe(false);
  });

  it("validates persisted Phase 1 order and board progress contracts", () => {
    const boardState = createBoardState();

    expect(
      auctionStateSchema.safeParse({
        auctionId: boardState.auctionId,
        phase: boardState.phase,
        parameters: boardState.parameters,
        players: [
          {
            ...boardState.players[0],
            gender: "Male"
          }
        ],
        teams: boardState.teams,
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
        currentPlayerId: null,
        currentBid: null,
        selectedTeamId: null,
        undoHistory: [],
        createdAt: "2026-07-07T08:30:00.000Z",
        updatedAt: "2026-07-07T08:30:00.000Z",
        persistenceFailure: null
      }).success
    ).toBe(true);

    expect(boardStateDtoSchema.safeParse(boardState).success).toBe(true);
    expect(
      boardStateDtoSchema.safeParse({
        ...boardState,
        phase1Progress: {
          ...boardState.phase1Progress,
          sourceRowNumber: 2
        }
      }).success
    ).toBe(false);
  });

  it("validates Start Auction response shape", () => {
    expect(
      startAuctionResponseSchema.safeParse({
        state: createBoardState(),
        result: {
          command: "StartAuction",
          clientCommandId: "cmd-1",
          message: "Auction started from validated setup."
        }
      }).success
    ).toBe(true);
  });

  it("rejects persisted Phase 1 order that omits configured categories", () => {
    const boardState = createBoardState();

    expect(
      auctionStateSchema.safeParse({
        auctionId: boardState.auctionId,
        phase: boardState.phase,
        parameters: boardState.parameters,
        players: boardState.players,
        teams: boardState.teams,
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
        persistenceFailure: null
      }).success
    ).toBe(false);
  });
});

function createBoardState() {
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
        role: "Ace",
        phase1Category: "Ace Men",
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
    currentPlayer: null,
    currentBid: null,
    selectedTeamId: null,
    phase1Progress: {
      currentCategory: "Ace Men",
      orderedPlayerCount: 1,
      pendingPlayerCount: 1,
      revealedPlayerCount: 0,
      categories: [
        {
          category: "Ace Men",
          total: 1,
          pending: 1,
          completed: 0
        }
      ]
    },
    canUndo: false,
    persistenceFailure: null
  } as const;
}
