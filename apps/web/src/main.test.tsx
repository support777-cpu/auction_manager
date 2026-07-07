/**
 * @vitest-environment jsdom
 */
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AuctionParameters,
  AuctionParameterReviewResponse,
  BoardStateDto
} from "@auction-manager/shared";
import "@testing-library/jest-dom/vitest";

describe("AuctionBoard Mark Sold blocked state", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("renders exact blocked text near the selected Team and Mark Sold context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/state") {
          return jsonResponse({
            mode: "auction",
            state: createBlockedBoardState()
          });
        }

        if (url === "/api/setup/auction-parameters") {
          return jsonResponse(createParameterReview());
        }

        return jsonResponse({}, 404);
      })
    );

    await import("./main.js");

    expect(await screen.findByTestId("mark-sold")).toBeDisabled();
    expect(await screen.findByTestId("mark-sold-blocked-reason")).toHaveTextContent(
      "Blocked: Falcons have 8 remaining; current bid is 10."
    );
    expect(screen.getByTestId("selected-team")).toHaveTextContent(
      "Blocked: Falcons have 8 remaining; current bid is 10."
    );
  });

  it("shows API conflict text in mark-sold-error without duplicating capacity blockers", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/state") {
        return jsonResponse({
          mode: "auction",
          state: createEligibleBoardState()
        });
      }

      if (url === "/api/setup/auction-parameters") {
        return jsonResponse(createParameterReview());
      }

      if (url === "/api/auction/mark-sold" && init?.method === "POST") {
        return jsonResponse(
          {
            ok: false,
            error: "sale_blocked",
            message: "Falcons can buy Aarav Menon for 10.",
            reasons: [
              {
                code: "sale_blocked",
                message: "Falcons can buy Aarav Menon for 10."
              }
            ]
          },
          409
        );
      }

      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await import("./main.js");

    const markSoldButton = await screen.findByTestId("mark-sold");
    expect(markSoldButton).toBeEnabled();
    fireEvent.click(markSoldButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auction/mark-sold",
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(await screen.findByTestId("mark-sold-error")).toHaveTextContent(
      "Falcons can buy Aarav Menon for 10."
    );
    expect(screen.queryByTestId("mark-sold-blocked-reason")).not.toBeInTheDocument();
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

function createEligibleBoardState(): BoardStateDto {
  return {
    auctionId: "auction-1",
    phase: "InitialAuction",
    parameters: createAuctionParameters(),
    players: [
      {
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
        },
        currentPlayerCapacity: {
          teamId: "team-1",
          canBuy: true,
          reasons: []
        }
      }
    ],
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
    currentBid: 10,
    selectedTeamId: "team-1",
    phase1Progress: {
      currentCategory: "Ace Men",
      orderedPlayerCount: 1,
      pendingPlayerCount: 0,
      revealedPlayerCount: 1,
      categories: [
        {
          category: "Ace Men",
          total: 1,
          pending: 0,
          completed: 0
        }
      ]
    },
    canUndo: false,
    persistenceFailure: null
  };
}

function createBlockedBoardState(): BoardStateDto {
  return {
    auctionId: "auction-1",
    phase: "InitialAuction",
    parameters: createAuctionParameters(),
    players: [
      {
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
    ],
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
          reasons: ["Falcons have 8 remaining; current bid is 10."]
        }
      }
    ],
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
    currentBid: 10,
    selectedTeamId: "team-1",
    phase1Progress: {
      currentCategory: "Ace Men",
      orderedPlayerCount: 1,
      pendingPlayerCount: 0,
      revealedPlayerCount: 1,
      categories: [
        {
          category: "Ace Men",
          total: 1,
          pending: 0,
          completed: 0
        }
      ]
    },
    canUndo: false,
    persistenceFailure: null
  };
}

function createParameterReview(): AuctionParameterReviewResponse {
  return {
    parameters: createAuctionParameters(),
    blockingReasons: [],
    reasonsByField: {},
    startAuctionBlocked: false
  };
}

function createAuctionParameters(): AuctionParameters {
  return {
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
  };
}
