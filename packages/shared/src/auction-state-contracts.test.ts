import { describe, expect, it } from "vitest";
import {
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
    canUndo: false,
    persistenceFailure: null
  } as const;
}
