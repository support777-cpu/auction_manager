/**
 * @vitest-environment jsdom
 */
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
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
    expect(screen.getByTestId("app-shell")).toHaveClass("live-app-shell");
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
    expect(screen.getByTestId("selected-team")).toHaveTextContent("Falcons");
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

describe("AuctionBoard Undo", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("shows empty Undo state and disables under persistence failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/state") {
          return jsonResponse(
            createAuctionAppState({
              ...createEligibleBoardState(),
              persistenceFailure: "snapshot_write_failed"
            })
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

    expect(await screen.findByTestId("undo-summary")).toHaveTextContent(
      "No actions to undo."
    );
    expect(screen.getByTestId("undo-action")).toBeDisabled();
  });

  it("displays last Undo summary and reconciles successful Undo response", async () => {
    const soldState = createSoldBoardState();
    const undoneState = {
      ...createEligibleBoardState(),
      canUndo: true,
      lastUndoAction: {
        command: "SelectTeam" as const,
        summary: "Undo Select Team: Aarav Menon -> Falcons."
      }
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/state") {
        return jsonResponse(createAuctionAppState(soldState));
      }

      if (url === "/api/setup/auction-parameters") {
        return jsonResponse(createParameterReview());
      }

      if (url === "/api/auction/undo" && init?.method === "POST") {
        return jsonResponse({
          state: undoneState,
          result: {
            command: "Undo",
            clientCommandId: "cmd-undo-1",
            message: "Undid Mark Sold: Aarav Menon."
          }
        });
      }

      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await import("./main.js");
    await resumeSavedAuction();

    expect(await screen.findByTestId("undo-summary")).toHaveTextContent(
      "Undo Mark Sold: Aarav Menon -> Falcons, 10."
    );
    fireEvent.click(screen.getByTestId("undo-action"));

    expect(await screen.findByTestId("undo-success")).toHaveTextContent(
      "Undid Mark Sold: Aarav Menon."
    );
    expect(screen.getByTestId("current-player-name")).toHaveTextContent(
      "Aarav Menon"
    );
    expect(screen.getByTestId("undo-summary")).toHaveTextContent("Undo Select Team");
    expect(screen.queryByTestId("mark-sold-success")).not.toBeInTheDocument();
  });

  it("shows Undo errors, refreshes board state, and supports keyboard u", async () => {
    const soldState = createSoldBoardState();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/state") {
        return jsonResponse(createAuctionAppState(soldState));
      }

      if (url === "/api/setup/auction-parameters") {
        return jsonResponse(createParameterReview());
      }

      if (url === "/api/auction/undo" && init?.method === "POST") {
        return jsonResponse(
          {
            ok: false,
            error: "no_actions_to_undo",
            message: "No actions to undo."
          },
          409
        );
      }

      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await import("./main.js");
    await resumeSavedAuction();
    await waitFor(() => {
      expect(screen.getByTestId("undo-action")).toBeEnabled();
    });
    fireEvent.keyDown(document, { key: "u" });

    expect(await screen.findByTestId("undo-error")).toHaveTextContent(
      "No actions to undo."
    );
    expect(
      fetchMock.mock.calls.some(([url, init]) => {
        return String(url) === "/api/auction/undo" && init?.method === "POST";
      })
    ).toBe(true);
  });

  it("disables Undo and ignores keyboard u while another live command is loading", async () => {
    let resolveIncrease: (value: Response) => void = () => {};
    const increasePromise = new Promise<Response>((resolve) => {
      resolveIncrease = resolve;
    });
    const boardState = {
      ...createEligibleBoardState(),
      canUndo: true,
      lastUndoAction: {
        command: "SelectTeam" as const,
        summary: "Undo Select Team: Aarav Menon -> Falcons."
      }
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/state") {
        return jsonResponse(createAuctionAppState(boardState));
      }

      if (url === "/api/setup/auction-parameters") {
        return jsonResponse(createParameterReview());
      }

      if (url === "/api/auction/increase-bid" && init?.method === "POST") {
        return increasePromise;
      }

      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await import("./main.js");
    await resumeSavedAuction();
    await screen.findByTestId("increase-bid");

    fireEvent.click(screen.getByTestId("increase-bid"));

    await waitFor(() => {
      expect(screen.getByTestId("undo-action")).toBeDisabled();
    });
    expect(screen.getByTestId("increase-bid")).toHaveAttribute("aria-busy", "true");

    resolveIncrease(
      jsonResponse({
        state: boardState,
        result: {
          command: "IncreaseBid",
          clientCommandId: "cmd-increase-1",
          message: "Increased bid to 15."
        }
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId("undo-action")).toBeEnabled();
    });
  });
});

describe("Board and roster view switching", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="root"></div>';
  });

  async function loadEligibleBoard(fetchMock?: ReturnType<typeof vi.fn>) {
    const mock =
      fetchMock ??
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/state") {
          return jsonResponse(createAuctionAppState(createEligibleBoardState()));
        }

        if (url === "/api/setup/auction-parameters") {
          return jsonResponse(createParameterReview());
        }

        return jsonResponse({}, 404);
      });
    vi.stubGlobal("fetch", mock);
    await import("./main.js");
    await resumeSavedAuction();
    await screen.findByTestId("board-rosters-switch");
    return mock;
  }

  it("shows the Board/Rosters switch and activates Rosters with keyboard navigation", async () => {
    await loadEligibleBoard();

    const switchRoot = await screen.findByTestId("board-rosters-switch");
    expect(switchRoot).toBeInTheDocument();
    const tabs = switchRoot.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(tabs[0]!, { key: "ArrowRight" });
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByTestId("team-rosters-view")).toBeInTheDocument();
  });

  it("renders redesigned live-board structural anchors with existing command controls", async () => {
    await loadEligibleBoard();

    expect(await screen.findByTestId("app-shell")).toHaveClass("live-app-shell");

    const counters = await screen.findByTestId("live-status-counters");
    expect(counters).toHaveTextContent("Ordered");
    expect(counters).toHaveTextContent("Revealed");
    expect(counters).toHaveTextContent("Pending");
    expect(counters).toHaveTextContent("Unsold");
    expect(counters).toHaveTextContent("Category");
    expect(counters).toHaveTextContent("Teams");
    expect(screen.getByTestId("phase1-ordered-count")).toHaveTextContent("1");
    expect(screen.getByTestId("phase1-revealed-count")).toHaveTextContent("1");
    expect(screen.getByTestId("phase1-pending-count")).toHaveTextContent("0");
    expect(screen.getByTestId("live-unsold-count")).toHaveTextContent("0");
    expect(screen.getByTestId("live-teams-counter")).toHaveTextContent("1");

    const stage = screen.getByTestId("live-board-stage");
    expect(within(stage).getByTestId("current-player-panel")).toHaveTextContent(
      "Aarav Menon"
    );
    expect(within(stage).getByTestId("current-bid")).toHaveTextContent("10");

    const commandStrip = within(stage).getByTestId("live-command-strip");
    expect(
      within(commandStrip).getByRole("button", { name: /Increase Bid/ })
    ).toBeEnabled();
    expect(
      within(commandStrip).getByRole("button", { name: /Reveal Next Player/ })
    ).toBeDisabled();
    expect(within(commandStrip).getByRole("button", { name: /Undo/ })).toBeDisabled();
    expect(within(commandStrip).getByTestId("reveal-next")).toBeDisabled();
    expect(within(commandStrip).getByTestId("increase-bid")).toBeEnabled();
    expect(within(commandStrip).getByTestId("mark-sold")).toBeEnabled();
    expect(within(commandStrip).getByTestId("mark-unsold")).toBeEnabled();
    expect(within(commandStrip).getByTestId("undo-action")).toBeDisabled();
    expect(screen.getByTestId("undo-summary")).toHaveTextContent(
      "No actions to undo."
    );

    const teamMatrix = screen.getByTestId("team-matrix");
    expect(within(teamMatrix).getByTestId("team-tile-selected")).toHaveTextContent(
      "Falcons"
    );
    expect(
      within(teamMatrix).getByRole("button", { name: /View Falcons details/ })
    ).toBeInTheDocument();
  });

  it("renders eight team tiles with operational counters from authoritative board state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/state") {
          return jsonResponse(createAuctionAppState(createEightTeamBoardState()));
        }

        if (url === "/api/setup/auction-parameters") {
          return jsonResponse(createParameterReview());
        }

        return jsonResponse({}, 404);
      })
    );
    await import("./main.js");
    await resumeSavedAuction();
    await screen.findByTestId("board-rosters-switch");

    expect(screen.getAllByTestId("team-tile")).toHaveLength(7);
    expect(screen.getByTestId("team-tile-selected")).toBeInTheDocument();
    expect(
      screen.getAllByTestId("team-tile").length +
        screen.queryAllByTestId("team-tile-selected").length
    ).toBe(8);
    expect(screen.getByTestId("phase1-ordered-count")).toHaveTextContent("8");
    expect(screen.getByTestId("phase1-pending-count")).toHaveTextContent("7");
    expect(screen.getByTestId("phase1-revealed-count")).toHaveTextContent("1");
    expect(screen.getByTestId("live-unsold-count")).toHaveTextContent("2");
    expect(screen.getByTestId("live-category-counter")).toHaveTextContent("Ace Men");
    expect(screen.getByTestId("live-teams-counter")).toHaveTextContent("8");
    expect(screen.getByTestId("auction-board")).not.toHaveTextContent(
      "private-player@example.com"
    );
    expect(screen.getByTestId("auction-board")).not.toHaveTextContent("UPI-PRIVATE");
  });

  it("keeps command strip controls visible across disabled and blocked states", async () => {
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
    await screen.findByTestId("live-command-strip");

    const commandStrip = screen.getByTestId("live-command-strip");
    expect(within(commandStrip).getByTestId("mark-sold")).toBeDisabled();
    expect(within(commandStrip).getByRole("button", { name: /Mark Sold/ })).toBeInTheDocument();
    expect(within(commandStrip).getByRole("button", { name: /Increase Bid/ })).toBeEnabled();
    expect(screen.getByTestId("mark-sold-blocked-reason")).toHaveTextContent(
      "Blocked: Falcons have 8 remaining; current bid is 10."
    );
    expect(screen.getByTestId("team-tile-selected")).toHaveAttribute("aria-pressed", "true");
    expect(
      within(screen.getByTestId("team-tile-selected")).getByTestId(
        "team-tile-capacity-reason"
      )
    ).toHaveTextContent("Falcons have 8 remaining; current bid is 10.");
  });

  it("shows persistence warning without breaking live board layout anchors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/state") {
          const board = createEightTeamBoardState();
          board.persistenceFailure = "snapshot_write_failed";
          return jsonResponse(createAuctionAppState(board));
        }

        if (url === "/api/setup/auction-parameters") {
          return jsonResponse(createParameterReview());
        }

        return jsonResponse({}, 404);
      })
    );
    await import("./main.js");
    await resumeSavedAuction();
    await screen.findByTestId("persistence-warning");

    expect(screen.getByTestId("persistence-warning")).toHaveTextContent(
      "Local recovery snapshot could not be written"
    );
    expect(screen.getByTestId("live-command-strip")).toBeInTheDocument();
    expect(screen.getByTestId("team-matrix")).toBeInTheDocument();
  });

  it("updates operational counters when authoritative board state changes", async () => {
    let stateFetchCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/state") {
          stateFetchCount += 1;
          if (stateFetchCount === 1) {
            return jsonResponse(createAuctionAppState(createEightTeamBoardState()));
          }

          const updatedBoard = createEightTeamBoardState();
          updatedBoard.phase1Progress = {
            ...updatedBoard.phase1Progress,
            pendingPlayerCount: 5,
            revealedPlayerCount: 3
          };
          updatedBoard.phase2PoolCount = 4;
          return jsonResponse(createAuctionAppState(updatedBoard));
        }

        if (url === "/api/setup/auction-parameters") {
          return jsonResponse(createParameterReview());
        }

        return jsonResponse({}, 404);
      })
    );
    await import("./main.js");
    await resumeSavedAuction();
    await screen.findByTestId("phase1-pending-count");

    expect(screen.getByTestId("phase1-pending-count")).toHaveTextContent("5");
    expect(screen.getByTestId("phase1-revealed-count")).toHaveTextContent("3");
    expect(screen.getByTestId("live-unsold-count")).toHaveTextContent("4");
    expect(screen.getByTestId("live-command-strip")).toBeInTheDocument();
    expect(screen.getByTestId("team-matrix")).toBeInTheDocument();
  });

  it("renders empty roster copy for teams without sold players", async () => {
    await loadEligibleBoard();
    fireEvent.click(screen.getByRole("tab", { name: "Rosters" }));
    expect(await screen.findByTestId("team-rosters-view")).toBeInTheDocument();
    expect(screen.getAllByTestId("roster-team-section")).toHaveLength(1);
    expect(screen.getByText("No players bought yet.")).toBeInTheDocument();
  });

  it("renders sold player rows from authoritative teamRosters", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/state") {
        return jsonResponse(createAuctionAppState(createSoldBoardState()));
      }

      if (url === "/api/setup/auction-parameters") {
        return jsonResponse(createParameterReview());
      }

      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
    await import("./main.js");
    await resumeSavedAuction();
    await screen.findByTestId("board-rosters-switch");

    fireEvent.click(screen.getByRole("tab", { name: "Rosters" }));

    expect(await screen.findByTestId("team-rosters-view")).toBeInTheDocument();
    expect(screen.getAllByTestId("roster-team-section")).toHaveLength(1);
    expect(screen.getByTestId("team-rosters-view")).toHaveTextContent("Aarav Menon");
    expect(screen.getByTestId("team-rosters-view")).toHaveTextContent("Sold");
    expect(screen.getByTestId("team-rosters-view")).toHaveTextContent("10");
    expect(screen.getAllByTestId("roster-player-row")).toHaveLength(1);
  });

  it("preserves board bidding state when switching back from Rosters without POSTs", async () => {
    const fetchMock = await loadEligibleBoard();

    expect(screen.getByTestId("current-player-name")).toHaveTextContent("Aarav Menon");
    expect(screen.getByTestId("current-bid")).toHaveTextContent("10");
    expect(screen.getByTestId("selected-team")).toHaveTextContent("Falcons");

    const postCountBefore = fetchMock.mock.calls.filter((call) => {
      const [, init] = call as unknown as [RequestInfo | URL, RequestInit | undefined];
      return init?.method === "POST";
    }).length;

    fireEvent.click(screen.getByRole("tab", { name: "Rosters" }));
    expect(await screen.findByTestId("team-rosters-view")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Board" }));
    expect(await screen.findByTestId("auction-board")).toBeInTheDocument();
    expect(screen.getByTestId("current-player-name")).toHaveTextContent("Aarav Menon");
    expect(screen.getByTestId("current-bid")).toHaveTextContent("10");
    expect(screen.getByTestId("selected-team")).toHaveTextContent("Falcons");

    const postCountAfter = fetchMock.mock.calls.filter((call) => {
      const [, init] = call as unknown as [RequestInfo | URL, RequestInit | undefined];
      return init?.method === "POST";
    }).length;
    expect(postCountAfter).toBe(postCountBefore);
  });

  it("opens a read-only team detail drawer with capacity reasons and closes on Escape", async () => {
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
    await screen.findByTestId("board-rosters-switch");

    const detailTrigger = await screen.findByTestId("team-detail-trigger");
    fireEvent.click(detailTrigger);

    const drawer = await screen.findByTestId("team-detail-drawer");
    expect(drawer).toHaveAttribute("role", "dialog");
    expect(drawer).toHaveAttribute("aria-modal", "true");
    expect(drawer).toHaveTextContent("Falcons");
    expect(drawer).toHaveTextContent("Falcons have 8 remaining; current bid is 10.");
    expect(screen.getByTestId("mark-sold-blocked-reason")).toHaveTextContent(
      "Blocked: Falcons have 8 remaining; current bid is 10."
    );

    fireEvent.keyDown(drawer, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("team-detail-drawer")).not.toBeInTheDocument();
    });
    expect(detailTrigger).toHaveFocus();
  });

  it("opens the roster-view drawer and restores focus to the roster details trigger", async () => {
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
    await screen.findByTestId("board-rosters-switch");

    fireEvent.click(screen.getByRole("tab", { name: "Rosters" }));
    const rosterView = await screen.findByTestId("team-rosters-view");
    const rosterDetailTrigger = within(rosterView).getByTestId("team-detail-trigger");
    fireEvent.click(rosterDetailTrigger);

    const drawer = await screen.findByTestId("team-detail-drawer");
    expect(drawer).toHaveTextContent("Falcons");

    fireEvent.keyDown(drawer, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("team-detail-drawer")).not.toBeInTheDocument();
    });
    expect(rosterDetailTrigger).toHaveFocus();
  });

  it("closes the drawer when switching back to Board", async () => {
    await loadEligibleBoard();

    const detailTrigger = await screen.findByTestId("team-detail-trigger");
    fireEvent.click(detailTrigger);
    expect(await screen.findByTestId("team-detail-drawer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Rosters" }));
    await waitFor(() => {
      expect(screen.queryByTestId("team-detail-drawer")).not.toBeInTheDocument();
    });
    expect(await screen.findByTestId("team-rosters-view")).toBeInTheDocument();
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
    lastUndoAction: null,
    persistenceFailure: null,
    phase2PoolCount: 0
  };
}

function createEightTeamBoardState(): BoardStateDto {
  const teamNames = [
    "Falcons",
    "Tigers",
    "Royals",
    "Warriors",
    "Lions",
    "Sharks",
    "Eagles",
    "Hurricanes"
  ] as const;
  const teams = teamNames.map((name, index) => ({
    id: `team-${index + 1}`,
    name,
    captain: `${name} Captain`,
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
      teamId: `team-${index + 1}`,
      canBuy: true,
      reasons: [] as string[]
    }
  }));
  teams[0]!.currentPlayerCapacity = {
    teamId: "team-1",
    canBuy: true,
    reasons: []
  };

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
    teams,
    teamRosters: teams.map((team) => ({
      teamId: team.id,
      name: team.name,
      captain: team.captain,
      budget: team.budget,
      remainingBudget: team.remainingBudget,
      squadCount: team.squadCount,
      roleCounts: { ...team.roleCounts },
      roster: []
    })),
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
      orderedPlayerCount: 8,
      pendingPlayerCount: 7,
      revealedPlayerCount: 1,
      categories: [
        {
          category: "Ace Men",
          total: 8,
          pending: 7,
          completed: 0
        }
      ]
    },
    canUndo: false,
    lastUndoAction: null,
    persistenceFailure: null,
    phase2PoolCount: 2
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
    lastUndoAction: null,
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
    lastUndoAction: {
      command: "MarkSold",
      summary: "Undo Mark Sold: Aarav Menon -> Falcons, 10."
    },
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
    lastUndoAction: {
      command: "MarkUnsold",
      summary: "Undo Mark Unsold: Aarav Menon."
    },
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
    lastUndoAction: {
      command: "MarkUnsold",
      summary: "Undo Mark Unsold: Aarav Menon."
    },
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
    lastUndoAction: {
      command: "MarkSold",
      summary: "Undo Mark Sold: Aarav Menon -> Falcons, 12."
    },
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
