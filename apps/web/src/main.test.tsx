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

  it("keeps the setup start surface when no auction is active", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/state") {
          return jsonResponse({
            mode: "setup",
            state: null,
            resume: null
          });
        }

        if (url === "/api/setup/auction-parameters") {
          return jsonResponse(createParameterReview());
        }

        return jsonResponse({}, 404);
      })
    );

    await import("./main.js");

    expect(await screen.findByTestId("setup-empty-state")).toBeInTheDocument();
    expect(screen.getByTestId("setup-start")).toHaveTextContent("Start setup");
  });

  it("shows saved auction metadata and resumes without a command POST", async () => {
    const savedState = createEligibleBoardState();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/state") {
        return jsonResponse(createAuctionAppState(savedState));
      }

      if (url === "/api/setup/auction-parameters") {
        return jsonResponse(createParameterReview());
      }

      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await import("./main.js");

    expect(await screen.findByTestId("resume-start-surface")).toBeInTheDocument();
    expect(screen.getByTestId("resume-phase")).toHaveTextContent("Initial Auction");
    expect(screen.getByTestId("resume-last-action")).toHaveTextContent(
      "Reveal Next Player"
    );
    expect(screen.getByTestId("resume-last-saved-at")).toHaveTextContent(
      "2026-07-07T08:35:00.000Z"
    );
    expect(screen.getByTestId("resume-current-player")).toHaveTextContent(
      "Aarav Menon"
    );

    fireEvent.click(screen.getByTestId("resume-auction"));

    expect(await screen.findByTestId("current-player-panel")).toHaveTextContent(
      "Aarav Menon"
    );
    expect(screen.getByTestId("current-bid")).toHaveTextContent("10");
    expect(screen.getByTestId("selected-team")).toHaveTextContent("Falcons");
    expect(
      fetchMock.mock.calls.some((call) => {
        const [url, init] = call as unknown as [
          RequestInfo | URL,
          RequestInit | undefined
        ];
        return String(url).startsWith("/api/auction/") && init?.method === "POST";
      })
    ).toBe(false);
  });

  it("shows persistence failure copy on resume and keeps board controls disabled", async () => {
    const failedState = {
      ...createEligibleBoardState(),
      persistenceFailure: "snapshot_write_failed"
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/state") {
          return jsonResponse(createAuctionAppState(failedState));
        }

        if (url === "/api/setup/auction-parameters") {
          return jsonResponse(createParameterReview());
        }

        return jsonResponse({}, 404);
      })
    );

    await import("./main.js");

    expect(await screen.findByTestId("resume-start-surface")).toHaveTextContent(
      "Local recovery snapshot could not be written. Resolve persistence before the next command."
    );
    fireEvent.click(screen.getByTestId("resume-auction"));
    expect(await screen.findByTestId("reveal-next")).toBeDisabled();
    expect(screen.getByTestId("increase-bid")).toBeDisabled();
    expect(screen.getByTestId("mark-sold")).toBeDisabled();
    expect(screen.getByTestId("mark-unsold")).toBeDisabled();
    expect(screen.getByTestId("app-shell")).toHaveTextContent(
      "Local recovery snapshot could not be written. Resolve persistence before the next command."
    );
  });

  it("shows the state load error surface when /api/state fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/state") {
          return jsonResponse(
            {
              ok: false,
              error: "state_response_invalid",
              message: "Auction state could not be loaded. Restart the app and try again."
            },
            500
          );
        }

        if (url === "/api/setup/auction-parameters") {
          return jsonResponse(createParameterReview());
        }

        return jsonResponse({}, 404);
      })
    );

    await import("./main.js");

    expect(await screen.findByTestId("state-load-error")).toHaveTextContent(
      "Auction state could not be loaded"
    );
  });

  it("renders exact blocked text near the selected Team and Mark Sold context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/state") {
          return jsonResponse(createAuctionAppState(createBlockedBoardState()));
        }

        if (url === "/api/setup/auction-parameters") {
          return jsonResponse(createParameterReview());
        }

        return jsonResponse({}, 404);
      })
    );

    await import("./main.js");
    await resumeSavedAuction();

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
        return jsonResponse(createAuctionAppState(createEligibleBoardState()));
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
    await resumeSavedAuction();

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

  it("applies accepted Mark Sold state, shows sale summary, and enables Reveal Next", async () => {
    const acceptedState = createSoldBoardState();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/state") {
        return jsonResponse(createAuctionAppState(createEligibleBoardState()));
      }

      if (url === "/api/setup/auction-parameters") {
        return jsonResponse(createParameterReview());
      }

      if (url === "/api/auction/mark-sold" && init?.method === "POST") {
        return jsonResponse({
          state: acceptedState,
          result: {
            command: "MarkSold",
            clientCommandId: "cmd-mark-sold-1",
            message: "Sold Aarav Menon to Falcons for 10."
          }
        });
      }

      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await import("./main.js");
    await resumeSavedAuction();

    fireEvent.click(await screen.findByTestId("mark-sold"));

    expect(await screen.findByTestId("mark-sold-success")).toHaveTextContent(
      "Sold Aarav Menon to Falcons for 10."
    );
    expect(screen.getByTestId("current-player-panel")).toHaveTextContent(
      "No Current Player"
    );
    expect(screen.getByTestId("current-bid")).toHaveTextContent("No current bid");
    expect(screen.getByTestId("selected-team")).toHaveTextContent("None");
    expect(screen.getByTestId("reveal-next")).toBeEnabled();
    expect(screen.queryByTestId("mark-sold-error")).not.toBeInTheDocument();
  });
});

describe("AuctionBoard Mark Unsold", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("applies accepted Mark Unsold state, shows unsold summary, and enables Reveal Next", async () => {
    const acceptedState = createUnsoldBoardState();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/state") {
        return jsonResponse(createAuctionAppState(createEligibleBoardState()));
      }

      if (url === "/api/setup/auction-parameters") {
        return jsonResponse(createParameterReview());
      }

      if (url === "/api/auction/mark-unsold" && init?.method === "POST") {
        return jsonResponse({
          state: acceptedState,
          result: {
            command: "MarkUnsold",
            clientCommandId: "cmd-mark-unsold-1",
            message: "Marked unsold. Aarav Menon moves to Phase 2 rebid."
          }
        });
      }

      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await import("./main.js");
    await resumeSavedAuction();

    fireEvent.click(await screen.findByTestId("mark-unsold"));

    expect(await screen.findByTestId("mark-unsold-success")).toHaveTextContent(
      "Marked unsold. Aarav Menon moves to Phase 2 rebid."
    );
    expect(screen.getByTestId("current-player-panel")).toHaveTextContent(
      "No Current Player"
    );
    expect(screen.getByTestId("current-bid")).toHaveTextContent("No current bid");
    expect(screen.getByTestId("selected-team")).toHaveTextContent("None");
    expect(screen.getByTestId("reveal-next")).toBeEnabled();
    expect(screen.getByTestId("unsold-pool-summary")).toHaveTextContent(
      "Unsold (Phase 2 rebid): 1"
    );
    expect(screen.getByTestId("team-tile")).toHaveTextContent("170");
    expect(screen.getByTestId("team-tile")).toHaveTextContent("0");
    expect(screen.queryByTestId("mark-unsold-error")).not.toBeInTheDocument();
  });

  it("disables Mark Unsold without a Current Player", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/state") {
          return jsonResponse(createAuctionAppState(createNoCurrentPlayerBoardState()));
        }

        if (url === "/api/setup/auction-parameters") {
          return jsonResponse(createParameterReview());
        }

        return jsonResponse({}, 404);
      })
    );

    await import("./main.js");
    await resumeSavedAuction();

    expect(await screen.findByTestId("mark-unsold")).toBeDisabled();
  });

  it("renders Phase 1 completion and non-executing transition preview for the last unsold player", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/state") {
          return jsonResponse(
            createAuctionAppState(createPhase1CompleteUnsoldBoardState())
          );
        }

        if (url === "/api/setup/auction-parameters") {
          return jsonResponse(createParameterReview());
        }

        return jsonResponse({}, 404);
      })
    );

    await import("./main.js");
    await resumeSavedAuction();

    expect(await screen.findByTestId("phase1-complete")).toHaveTextContent(
      "Phase 1 complete."
    );
    expect(screen.getByTestId("start-unsold-bidding-preview")).toBeDisabled();
    expect(screen.getByTestId("start-unsold-bidding-preview")).toHaveTextContent(
      "Start Unsold Bidding will rebid 1 unsold player."
    );
    expect(screen.getByTestId("unsold-pool-summary")).toHaveTextContent(
      "Unsold (Phase 2 rebid): 1"
    );
  });

  it("guards duplicate Mark Unsold clicks while a request is in flight", async () => {
    let resolveMarkUnsold: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/state") {
        return jsonResponse(createAuctionAppState(createEligibleBoardState()));
      }

      if (url === "/api/setup/auction-parameters") {
        return jsonResponse(createParameterReview());
      }

      if (url === "/api/auction/mark-unsold" && init?.method === "POST") {
        return new Promise<Response>((resolve) => {
          resolveMarkUnsold = resolve;
        });
      }

      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await import("./main.js");
    await resumeSavedAuction();

    const markUnsoldButton = await screen.findByTestId("mark-unsold");
    fireEvent.click(markUnsoldButton);
    expect(markUnsoldButton).toBeDisabled();
    fireEvent.click(markUnsoldButton);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(
          ([url, init]) =>
            String(url) === "/api/auction/mark-unsold" && init?.method === "POST"
        )
      ).toHaveLength(1);
    });

    resolveMarkUnsold?.(
      jsonResponse({
        state: createUnsoldBoardState(),
        result: {
          command: "MarkUnsold",
          clientCommandId: "cmd-mark-unsold-1",
          message: "Marked unsold. Aarav Menon moves to Phase 2 rebid."
        }
      })
    );
  });

  it("does not render Phase 1 completion when all players are sold and the pool is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/state") {
          return jsonResponse(
            createAuctionAppState(createPhase1CompleteAllSoldBoardState())
          );
        }

        if (url === "/api/setup/auction-parameters") {
          return jsonResponse(createParameterReview());
        }

        return jsonResponse({}, 404);
      })
    );

    await import("./main.js");
    await resumeSavedAuction();

    await screen.findByTestId("phase1-progress");
    expect(screen.queryByTestId("phase1-complete")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("start-unsold-bidding-preview")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("unsold-pool-summary")).toHaveTextContent(
      "Unsold (Phase 2 rebid): 0"
    );
  });

  it("clears the Mark Unsold success summary after Reveal Next Player", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/state") {
        return jsonResponse(createAuctionAppState(createEligibleBoardState()));
      }

      if (url === "/api/setup/auction-parameters") {
        return jsonResponse(createParameterReview());
      }

      if (url === "/api/auction/mark-unsold" && init?.method === "POST") {
        return jsonResponse({
          state: createUnsoldBoardState(),
          result: {
            command: "MarkUnsold",
            clientCommandId: "cmd-mark-unsold-clear",
            message: "Marked unsold. Aarav Menon moves to Phase 2 rebid."
          }
        });
      }

      if (url === "/api/auction/reveal-next" && init?.method === "POST") {
        return jsonResponse({
          state: createRevealedNextBoardState(),
          result: {
            command: "RevealNextPlayer",
            clientCommandId: "cmd-reveal-next-clear",
            message: "Revealed Riya Shah."
          }
        });
      }

      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await import("./main.js");
    await resumeSavedAuction();

    fireEvent.click(await screen.findByTestId("mark-unsold"));
    expect(await screen.findByTestId("mark-unsold-success")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("reveal-next"));
    await waitFor(() => {
      expect(screen.queryByTestId("mark-unsold-success")).not.toBeInTheDocument();
    });
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

async function resumeSavedAuction() {
  fireEvent.click(await screen.findByTestId("resume-auction"));
}

function createAuctionAppState(state: BoardStateDto) {
  return {
    mode: "auction" as const,
    state,
    resume: {
      phase: state.phase,
      lastSavedAction: "RevealNextPlayer",
      lastSavedAt: "2026-07-07T08:35:00.000Z",
      pendingPlayerCount: state.phase1Progress.pendingPlayerCount,
      currentPlayerName: state.currentPlayer?.name ?? null,
      persistenceFailure: state.persistenceFailure
    }
  };
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
    teamRosters: [
      {
        teamId: "team-1",
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
        roster: []
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
    persistenceFailure: null,
    phase2PoolCount: 0
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
    teamRosters: [
      {
        teamId: "team-1",
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
        roster: []
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
    persistenceFailure: null,
    phase2PoolCount: 0
  };
}

function createSoldBoardState(): BoardStateDto {
  const baseState = createEligibleBoardState();
  const basePlayer = baseState.players[0]!;
  const baseTeam = baseState.teams[0]!;

  return {
    ...baseState,
    players: [
      {
        ...basePlayer,
        status: "Sold",
        soldPrice: 10,
        winningTeamId: "team-1",
        acquisitionType: "Auction"
      },
      {
        id: "player-2",
        name: "Riya Shah",
        role: "Ace",
        phase1Category: "Ace Women",
        basePrice: 10,
        status: "Pending",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      }
    ],
    teams: [
      {
        ...baseTeam,
        remainingBudget: 160,
        squadCount: 1,
        roleCounts: {
          ...baseTeam.roleCounts,
          Ace: 1
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
        squadCount: 1,
        roleCounts: {
          ...baseTeam.roleCounts,
          Ace: 1
        },
        roster: [
          {
            playerId: "player-1",
            name: "Aarav Menon",
            role: "Ace",
            acquisitionType: "Sold",
            soldPrice: 10
          }
        ]
      }
    ],
    currentPlayer: null,
    currentBid: null,
    selectedTeamId: null,
    phase1Progress: {
      currentCategory: "Ace Women",
      orderedPlayerCount: 2,
      pendingPlayerCount: 1,
      revealedPlayerCount: 1,
      categories: [
        {
          category: "Ace Men",
          total: 1,
          pending: 0,
          completed: 1
        },
        {
          category: "Ace Women",
          total: 1,
          pending: 1,
          completed: 0
        }
      ]
    },
    canUndo: true,
    phase2PoolCount: 0
  };
}

function createUnsoldBoardState(): BoardStateDto {
  const baseState = createEligibleBoardState();
  const basePlayer = baseState.players[0]!;
  const baseTeam = baseState.teams[0]!;

  return {
    ...baseState,
    players: [
      {
        ...basePlayer,
        status: "Unsold",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      },
      {
        id: "player-2",
        name: "Riya Shah",
        role: "Ace",
        phase1Category: "Ace Women",
        basePrice: 10,
        status: "Pending",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      }
    ],
    teams: [baseTeam],
    currentPlayer: null,
    currentBid: null,
    selectedTeamId: null,
    phase1Progress: {
      currentCategory: "Ace Women",
      orderedPlayerCount: 2,
      pendingPlayerCount: 1,
      revealedPlayerCount: 1,
      categories: [
        {
          category: "Ace Men",
          total: 1,
          pending: 0,
          completed: 1
        },
        {
          category: "Ace Women",
          total: 1,
          pending: 1,
          completed: 0
        }
      ]
    },
    canUndo: true,
    phase2PoolCount: 1
  };
}

function createNoCurrentPlayerBoardState(): BoardStateDto {
  const baseState = createEligibleBoardState();

  return {
    ...baseState,
    currentPlayer: null,
    currentBid: null,
    selectedTeamId: null,
    phase1Progress: {
      ...baseState.phase1Progress,
      pendingPlayerCount: 1,
      revealedPlayerCount: 0
    }
  };
}

function createPhase1CompleteUnsoldBoardState(): BoardStateDto {
  const basePlayer = createEligibleBoardState().players[0]!;

  return {
    auctionId: "auction-1",
    phase: "InitialAuction",
    parameters: createAuctionParameters(),
    players: [
      {
        ...basePlayer,
        status: "Unsold",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      }
    ],
    teams: createEligibleBoardState().teams,
    teamRosters: createEligibleBoardState().teamRosters,
    currentPlayer: null,
    currentBid: null,
    selectedTeamId: null,
    phase1Progress: {
      currentCategory: null,
      orderedPlayerCount: 1,
      pendingPlayerCount: 0,
      revealedPlayerCount: 1,
      categories: [
        {
          category: "Ace Men",
          total: 1,
          pending: 0,
          completed: 1
        }
      ]
    },
    canUndo: true,
    persistenceFailure: null,
    phase2PoolCount: 1
  };
}

function createPhase1CompleteAllSoldBoardState(): BoardStateDto {
  const basePlayer = createEligibleBoardState().players[0]!;

  return {
    auctionId: "auction-1",
    phase: "InitialAuction",
    parameters: createAuctionParameters(),
    players: [
      {
        ...basePlayer,
        status: "Sold",
        soldPrice: 12,
        winningTeamId: "team-1",
        acquisitionType: "Auction"
      }
    ],
    teams: createEligibleBoardState().teams,
    teamRosters: [
      {
        teamId: "team-1",
        name: "Falcons",
        captain: "Priya Captain",
        budget: 170,
        remainingBudget: 158,
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
            role: "Ace",
            acquisitionType: "Sold",
            soldPrice: 12
          }
        ]
      }
    ],
    currentPlayer: null,
    currentBid: null,
    selectedTeamId: null,
    phase1Progress: {
      currentCategory: null,
      orderedPlayerCount: 1,
      pendingPlayerCount: 0,
      revealedPlayerCount: 1,
      categories: [
        {
          category: "Ace Men",
          total: 1,
          pending: 0,
          completed: 1
        }
      ]
    },
    canUndo: true,
    persistenceFailure: null,
    phase2PoolCount: 0
  };
}

function createRevealedNextBoardState(): BoardStateDto {
  const unsoldState = createUnsoldBoardState();

  return {
    ...unsoldState,
    players: [
      unsoldState.players[0]!,
      {
        id: "player-2",
        name: "Riya Shah",
        role: "Ace",
        phase1Category: "Ace Women",
        basePrice: 10,
        status: "Current",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      }
    ],
    currentPlayer: {
      id: "player-2",
      name: "Riya Shah",
      role: "Ace",
      phase1Category: "Ace Women",
      basePrice: 10,
      status: "Current",
      soldPrice: null,
      winningTeamId: null,
      acquisitionType: null
    },
    currentBid: 10,
    selectedTeamId: null,
    phase1Progress: {
      ...unsoldState.phase1Progress,
      currentCategory: "Ace Women",
      pendingPlayerCount: 0,
      revealedPlayerCount: 2
    }
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
