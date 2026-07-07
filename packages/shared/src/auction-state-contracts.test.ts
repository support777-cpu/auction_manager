import { describe, expect, it } from "vitest";
import {
  appStateResponseSchema,
  auctionStateSchema,
  boardStateDtoSchema,
  deriveSoldRosterRows,
  increaseBidRequestSchema,
  increaseBidResponseSchema,
  markSoldAcceptedResponseSchema,
  markSoldConflictReasonSchema,
  markSoldRejectedResponseSchema,
  markSoldRequestSchema,
  markSoldResponseSchema,
  markUnsoldAcceptedResponseSchema,
  markUnsoldRejectedResponseSchema,
  markUnsoldRequestSchema,
  markUnsoldResponseSchema,
  undoRequestSchema,
  undoResponseSchema,
  revealNextPlayerRequestSchema,
  revealNextPlayerResponseSchema,
  resumeSummarySchema,
  selectTeamRequestSchema,
  selectTeamResponseSchema,
  startAuctionRequestSchema,
  startAuctionResponseSchema,
  teamRosterDtoSchema
} from "./index.js";

describe("auction state contracts", () => {
  it("requires a clientCommandId for Start Auction", () => {
    expect(startAuctionRequestSchema.safeParse({ clientCommandId: "cmd-1" }).success)
      .toBe(true);
    expect(startAuctionRequestSchema.safeParse({}).success).toBe(false);
  });

  it("requires a strict clientCommandId request for Reveal Next Player", () => {
    expect(
      revealNextPlayerRequestSchema.safeParse({ clientCommandId: "cmd-1" }).success
    ).toBe(true);
    expect(revealNextPlayerRequestSchema.safeParse({}).success).toBe(false);
    expect(
      revealNextPlayerRequestSchema.safeParse({
        clientCommandId: "cmd-1",
        sourceRowNumber: 2
      }).success
    ).toBe(false);
  });

  it("requires strict Select Team requests with nullable teamId", () => {
    expect(
      selectTeamRequestSchema.safeParse({
        clientCommandId: "cmd-select-1",
        teamId: "team-1"
      }).success
    ).toBe(true);
    expect(
      selectTeamRequestSchema.safeParse({
        clientCommandId: "cmd-clear-1",
        teamId: null
      }).success
    ).toBe(true);
    expect(selectTeamRequestSchema.safeParse({ clientCommandId: "cmd-1" }).success)
      .toBe(false);
    expect(
      selectTeamRequestSchema.safeParse({
        clientCommandId: "cmd-1",
        teamId: "team-1",
        sourceFilename: "private.csv"
      }).success
    ).toBe(false);
  });

  it("requires a strict clientCommandId request for Increase Bid", () => {
    expect(increaseBidRequestSchema.safeParse({ clientCommandId: "cmd-1" }).success)
      .toBe(true);
    expect(increaseBidRequestSchema.safeParse({}).success).toBe(false);
    expect(
      increaseBidRequestSchema.safeParse({
        clientCommandId: "cmd-1",
        sourceFilename: "private.csv"
      }).success
    ).toBe(false);
  });

  it("requires a strict clientCommandId request for Mark Sold", () => {
    expect(markSoldRequestSchema.safeParse({ clientCommandId: "cmd-1" }).success)
      .toBe(true);
    expect(markSoldRequestSchema.safeParse({}).success).toBe(false);
    expect(
      markSoldRequestSchema.safeParse({
        clientCommandId: "cmd-1",
        sourceRowNumber: 2
      }).success
    ).toBe(false);
  });

  it("validates strict Mark Sold conflict reasons and rejected responses", () => {
    expect(
      markSoldConflictReasonSchema.safeParse({
        code: "budget_exceeded",
        message: "Blocked: Falcons have 8 remaining; current bid is 10."
      }).success
    ).toBe(true);
    expect(
      markSoldConflictReasonSchema.safeParse({
        code: "unknown_private_reason",
        message: "Blocked.",
        sourceFilename: "private.csv"
      }).success
    ).toBe(false);

    expect(
      markSoldRejectedResponseSchema.safeParse({
        ok: false,
        error: "sale_blocked",
        message: "Blocked: Falcons have 8 remaining; current bid is 10.",
        reasons: [
          {
            code: "budget_exceeded",
            message: "Blocked: Falcons have 8 remaining; current bid is 10."
          }
        ]
      }).success
    ).toBe(true);

    expect(
      markSoldRejectedResponseSchema.safeParse({
        ok: false,
        error: "sale_blocked",
        message: "Blocked: Falcons have 8 remaining; current bid is 10.",
        reasons: [
          {
            code: "budget_exceeded",
            message: "Blocked: Falcons have 8 remaining; current bid is 10.",
            actionLogPayload: { private: true }
          }
        ],
        sourceRowNumber: 2
      }).success
    ).toBe(false);
  });

  it("validates accepted and union Mark Sold responses without private fields", () => {
    const boardState = {
      ...createBoardState(),
      players: [
        {
          ...createBoardState().players[0],
          status: "Sold" as const,
          soldPrice: 10,
          winningTeamId: "team-1",
          acquisitionType: "Auction" as const
        }
      ],
      teams: [
        {
          ...createBoardState().teams[0],
          remainingBudget: 160,
          squadCount: 1,
          roleCounts: {
            ...createBoardState().teams[0].roleCounts,
            Ace: 1
          }
        }
      ],
      currentPlayer: null,
      currentBid: null,
      selectedTeamId: null,
      phase1Progress: {
        ...createBoardState().phase1Progress,
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
      }
    };

    const accepted = {
      state: boardState,
      result: {
        command: "MarkSold",
        clientCommandId: "cmd-mark-sold-1",
        message: "Sold Aarav Menon to Falcons for 10."
      }
    };

    expect(markSoldAcceptedResponseSchema.safeParse(accepted).success).toBe(true);
    expect(markSoldResponseSchema.safeParse(accepted).success).toBe(true);
    expect(
      markSoldResponseSchema.safeParse({
        ok: false,
        error: "sale_blocked",
        message: "Blocked.",
        reasons: [{ code: "sale_blocked", message: "Blocked." }]
      }).success
    ).toBe(true);
    expect(
      markSoldAcceptedResponseSchema.safeParse({
        ...accepted,
        state: {
          ...accepted.state,
          players: [
            {
              ...accepted.state.players[0],
              sourceFilename: "private.csv"
            }
          ]
        }
      }).success
    ).toBe(false);
  });

  it("requires a strict clientCommandId request for Mark Unsold", () => {
    expect(markUnsoldRequestSchema.safeParse({ clientCommandId: "cmd-1" }).success)
      .toBe(true);
    expect(markUnsoldRequestSchema.safeParse({}).success).toBe(false);
    expect(
      markUnsoldRequestSchema.safeParse({
        clientCommandId: "cmd-1",
        sourceRowNumber: 2
      }).success
    ).toBe(false);
  });

  it("requires a strict clientCommandId request for Undo", () => {
    expect(undoRequestSchema.safeParse({ clientCommandId: "cmd-undo-1" }).success)
      .toBe(true);
    expect(undoRequestSchema.safeParse({}).success).toBe(false);
    expect(
      undoRequestSchema.safeParse({
        clientCommandId: "cmd-undo-1",
        sourceFilename: "private.csv"
      }).success
    ).toBe(false);
  });

  it("validates strict Mark Unsold rejected responses", () => {
    expect(
      markUnsoldRejectedResponseSchema.safeParse({
        ok: false,
        error: "current_player_required",
        message: "Reveal a Current Player before marking unsold."
      }).success
    ).toBe(true);
    expect(
      markUnsoldRejectedResponseSchema.safeParse({
        ok: false,
        error: "unknown_private_reason",
        message: "Blocked."
      }).success
    ).toBe(false);
    expect(
      markUnsoldRejectedResponseSchema.safeParse({
        ok: false,
        error: "current_player_required",
        message: "Reveal a Current Player before marking unsold.",
        sourceRowNumber: 2
      }).success
    ).toBe(false);
  });

  it("validates accepted and union Mark Unsold responses without private fields", () => {
    const boardState = {
      ...createBoardState(),
      players: [
        {
          ...createBoardState().players[0],
          status: "Unsold" as const
        }
      ],
      phase2PoolCount: 1,
      phase1Progress: {
        ...createBoardState().phase1Progress,
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
      }
    };

    const accepted = {
      state: boardState,
      result: {
        command: "MarkUnsold",
        clientCommandId: "cmd-mark-unsold-1",
        message: "Marked unsold. Aarav Menon moves to Phase 2 rebid."
      }
    };

    expect(markUnsoldAcceptedResponseSchema.safeParse(accepted).success).toBe(true);
    expect(markUnsoldResponseSchema.safeParse(accepted).success).toBe(true);
    expect(
      markUnsoldResponseSchema.safeParse({
        ok: false,
        error: "auction_not_active",
        message: "Start an auction before marking a Player unsold."
      }).success
    ).toBe(true);
    expect(
      markUnsoldAcceptedResponseSchema.safeParse({
        ...accepted,
        state: {
          ...accepted.state,
          players: [
            {
              ...accepted.state.players[0],
              sourceFilename: "private.csv"
            }
          ]
        }
      }).success
    ).toBe(false);
  });

  it("parses phase2Pool when present and defaults it when absent", () => {
    const boardState = createBoardState();
    const baseState = {
      auctionId: boardState.auctionId,
      phase: boardState.phase,
      parameters: boardState.parameters,
      players: [
        {
          ...boardState.players[0],
          gender: "Male" as const,
          status: "Unsold" as const
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
      updatedAt: "2026-07-07T08:35:00.000Z",
      persistenceFailure: null
    };

    const withPool = auctionStateSchema.safeParse({
      ...baseState,
      phase2Pool: ["player-1"]
    });
    expect(withPool.success).toBe(true);
    expect(withPool.success && withPool.data.phase2Pool).toEqual(["player-1"]);

    const withoutPool = auctionStateSchema.safeParse(baseState);
    expect(withoutPool.success).toBe(true);
    expect(withoutPool.success && withoutPool.data.phase2Pool).toEqual([]);
  });

  it("validates Mark Unsold undo-history entries in auction state", () => {
    const boardState = createBoardState();
    const auctionState = {
      auctionId: boardState.auctionId,
      phase: boardState.phase,
      parameters: boardState.parameters,
      players: [
        {
          ...boardState.players[0],
          gender: "Male" as const,
          status: "Unsold" as const
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
      phase2Pool: ["player-1"],
      undoHistory: [
        {
          command: "MarkUnsold",
          playerId: "player-1",
          previousPlayerStatus: "Current",
          previousCurrentPlayerId: "player-1",
          previousCurrentBid: 12,
          previousSelectedTeamId: "team-1",
          timestamp: "2026-07-07T08:35:00.000Z"
        }
      ],
      createdAt: "2026-07-07T08:30:00.000Z",
      updatedAt: "2026-07-07T08:35:00.000Z",
      persistenceFailure: null
    };

    expect(auctionStateSchema.safeParse(auctionState).success).toBe(true);
    expect(
      auctionStateSchema.safeParse({
        ...auctionState,
        undoHistory: [
          {
            ...auctionState.undoHistory[0],
            sourceRowNumber: 2
          }
        ]
      }).success
    ).toBe(false);
  });

  it("rejects private setup source fields in board DTOs", () => {
    const state = createBoardState();

    expect(boardStateDtoSchema.safeParse(state).success).toBe(true);
    expect(
      boardStateDtoSchema.safeParse({
        ...state,
        canUndo: true,
        lastUndoAction: {
          command: "MarkSold",
          summary: "Undo Mark Sold: Aarav Menon."
        }
      }).success
    ).toBe(true);
    expect(
      boardStateDtoSchema.safeParse({
        ...state,
        lastUndoAction: {
          command: "MarkSold",
          summary: "Undo Mark Sold: Aarav Menon.",
          sourceRowNumber: 2
        }
      }).success
    ).toBe(false);
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

  it("validates strict resume summaries and app-state resume modes", () => {
    const boardState = createBoardState();
    const resume = {
      phase: "InitialAuction" as const,
      lastSavedAction: "RevealNextPlayer",
      lastSavedAt: "2026-07-07T08:40:00.000Z",
      pendingPlayerCount: 1,
      currentPlayerName: "Aarav Menon",
      persistenceFailure: null
    };

    expect(resumeSummarySchema.safeParse(resume).success).toBe(true);
    expect(
      resumeSummarySchema.safeParse({
        ...resume,
        actionLogRows: [{ command: "RevealNextPlayer" }]
      }).success
    ).toBe(false);
    expect(
      appStateResponseSchema.safeParse({
        mode: "setup",
        state: null,
        resume: null
      }).success
    ).toBe(true);
    expect(
      appStateResponseSchema.safeParse({
        mode: "auction",
        state: boardState,
        resume
      }).success
    ).toBe(true);
    expect(
      appStateResponseSchema.safeParse({
        mode: "auction",
        state: boardState,
        resume: null
      }).success
    ).toBe(false);
    expect(
      appStateResponseSchema.safeParse({
        mode: "setup",
        state: boardState,
        resume
      }).success
    ).toBe(false);
  });

  it("validates strict team roster projections and rejects private fields", () => {
    const boardState = createBoardState();
    const roster = {
      teamId: "team-1",
      name: "Falcons",
      captain: "Riya Shah",
      logoAssetId: "logo-1",
      budget: 200,
      remainingBudget: 160,
      squadCount: 2,
      roleCounts: {
        Ace: 1,
        Batting: 1,
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
          soldPrice: 40
        }
      ]
    };

    expect(teamRosterDtoSchema.safeParse(roster).success).toBe(true);
    expect(
      teamRosterDtoSchema.safeParse({
        ...roster,
        paymentStatus: "paid"
      }).success
    ).toBe(false);
    expect(
      boardStateDtoSchema.safeParse({
        ...boardState,
        teamRosters: [roster]
      }).success
    ).toBe(true);
    expect(
      boardStateDtoSchema.safeParse({
        ...boardState,
        teamRosters: [
          {
            ...roster,
            roster: [
              {
                ...roster.roster[0],
                sourceFilename: "players.csv"
              }
            ]
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

  it("validates Undo response shape", () => {
    expect(
      undoResponseSchema.safeParse({
        state: {
          ...createBoardState(),
          canUndo: true,
          lastUndoAction: {
            command: "IncreaseBid",
            summary: "Undo Increase Bid: Aarav Menon back to 10."
          }
        },
        result: {
          command: "Undo",
          clientCommandId: "cmd-undo-1",
          message: "Undid Increase Bid: Aarav Menon."
        }
      }).success
    ).toBe(true);
    expect(
      undoResponseSchema.safeParse({
        state: {
          ...createBoardState(),
          lastUndoAction: {
            command: "IncreaseBid",
            summary: "Undo Increase Bid: Aarav Menon back to 10.",
            paymentTransactionId: "UPI-PRIVATE"
          }
        },
        result: {
          command: "Undo",
          clientCommandId: "cmd-undo-1",
          message: "Undid Increase Bid: Aarav Menon."
        }
      }).success
    ).toBe(false);
  });

  it("validates Select Team response shape with capacity and rejects private fields", () => {
    const boardState = {
      ...createBoardState(),
      players: [
        {
          ...createBoardState().players[0],
          status: "Current" as const
        }
      ],
      teams: [
        {
          ...createBoardState().teams[0],
          currentPlayerCapacity: {
            teamId: "team-1",
            canBuy: true,
            reasons: []
          }
        }
      ],
      currentPlayer: {
        ...createBoardState().players[0],
        status: "Current" as const
      },
      currentBid: 10,
      selectedTeamId: "team-1"
    };

    expect(
      selectTeamResponseSchema.safeParse({
        state: boardState,
        result: {
          command: "SelectTeam",
          clientCommandId: "cmd-select-1",
          message: "Selected Falcons for Aarav Menon."
        }
      }).success
    ).toBe(true);

    expect(
      selectTeamResponseSchema.safeParse({
        state: {
          ...boardState,
          teams: [
            {
              ...boardState.teams[0],
              currentPlayerCapacity: {
                teamId: "team-1",
                canBuy: false,
                reasons: ["Falcons has 0 remaining; current bid is 10."],
                actionLogPayload: { private: true }
              }
            }
          ]
        },
        result: {
          command: "SelectTeam",
          clientCommandId: "cmd-select-1",
          message: "Selected Falcons for Aarav Menon."
        }
      }).success
    ).toBe(false);
  });

  it("validates Reveal Next Player response shape and rejects private fields", () => {
    const boardState = {
      ...createBoardState(),
      players: [
        {
          ...createBoardState().players[0],
          status: "Current" as const
        }
      ],
      currentPlayer: {
        ...createBoardState().players[0],
        status: "Current" as const
      },
      currentBid: 10,
      phase1Progress: {
        ...createBoardState().phase1Progress,
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
      }
    };

    expect(
      revealNextPlayerResponseSchema.safeParse({
        state: boardState,
        result: {
          command: "RevealNextPlayer",
          clientCommandId: "cmd-reveal-1",
          message: "Revealed Aarav Menon at base price 10."
        }
      }).success
    ).toBe(true);

    expect(
      revealNextPlayerResponseSchema.safeParse({
        state: {
          ...boardState,
          currentPlayer: {
            ...boardState.currentPlayer,
            email: "private-player@example.com"
          }
        },
        result: {
          command: "RevealNextPlayer",
          clientCommandId: "cmd-reveal-1",
          message: "Revealed Aarav Menon at base price 10."
        }
      }).success
    ).toBe(false);
  });

  it("validates Increase Bid response shape and rejects private fields", () => {
    const boardState = {
      ...createBoardState(),
      players: [
        {
          ...createBoardState().players[0],
          status: "Current" as const
        }
      ],
      currentPlayer: {
        ...createBoardState().players[0],
        status: "Current" as const
      },
      currentBid: 12
    };

    expect(
      increaseBidResponseSchema.safeParse({
        state: boardState,
        result: {
          command: "IncreaseBid",
          clientCommandId: "cmd-increase-1",
          message: "Increased bid for Aarav Menon to 12."
        }
      }).success
    ).toBe(true);

    expect(
      increaseBidResponseSchema.safeParse({
        state: {
          ...boardState,
          currentPlayer: {
            ...boardState.currentPlayer,
            sourceFilename: "private.csv"
          }
        },
        result: {
          command: "IncreaseBid",
          clientCommandId: "cmd-increase-1",
          message: "Increased bid for Aarav Menon to 12."
        }
      }).success
    ).toBe(false);
  });

  it("validates Mark Sold undo-history entries and derived sold roster rows", () => {
    const boardState = createBoardState();
    const auctionState = {
      auctionId: boardState.auctionId,
      phase: boardState.phase,
      parameters: boardState.parameters,
      players: [
        {
          ...boardState.players[0],
          gender: "Male" as const,
          status: "Sold" as const,
          soldPrice: 10,
          winningTeamId: "team-1",
          acquisitionType: "Auction" as const
        },
        {
          ...boardState.players[0],
          id: "player-2",
          name: "Nisha Rao",
          role: "Batting" as const,
          gender: "Female" as const,
          status: "Sold" as const,
          soldPrice: 12,
          winningTeamId: "team-1",
          acquisitionType: "Auction" as const
        },
        {
          ...boardState.players[0],
          id: "player-3",
          name: "Kabir Sethi",
          gender: "Male" as const,
          status: "Unsold" as const,
          soldPrice: null,
          winningTeamId: null,
          acquisitionType: null
        }
      ],
      teams: [
        {
          ...boardState.teams[0],
          remainingBudget: 160,
          squadCount: 1,
          roleCounts: {
            ...boardState.teams[0].roleCounts,
            Ace: 1
          }
        }
      ],
      phase1Order: {
        categories: [
          { category: "Ace Men", playerIds: ["player-1", "player-2", "player-3"] },
          { category: "Ace Women", playerIds: [] },
          { category: "Women All Rounders", playerIds: [] },
          { category: "Men Bowlers", playerIds: [] },
          { category: "Men Batsmen", playerIds: [] },
          { category: "Men All Rounders", playerIds: [] }
        ],
        playerIds: ["player-1", "player-2", "player-3"],
        generatedAt: "2026-07-07T08:30:00.000Z"
      },
      currentPlayerId: null,
      currentBid: null,
      selectedTeamId: null,
      undoHistory: [
        {
          command: "MarkSold",
          playerId: "player-1",
          previousPlayerStatus: "Current",
          previousSoldPrice: null,
          previousWinningTeamId: null,
          previousAcquisitionType: null,
          previousCurrentPlayerId: "player-1",
          previousCurrentBid: 10,
          previousSelectedTeamId: "team-1",
          winningTeamId: "team-1",
          previousTeamRemainingBudget: 170,
          nextTeamRemainingBudget: 160,
          previousTeamSquadCount: 0,
          nextTeamSquadCount: 1,
          role: "Ace",
          previousTeamRoleCount: 0,
          nextTeamRoleCount: 1,
          soldPrice: 10,
          timestamp: "2026-07-07T08:35:00.000Z"
        }
      ],
      createdAt: "2026-07-07T08:30:00.000Z",
      updatedAt: "2026-07-07T08:35:00.000Z",
      persistenceFailure: null
    };

    expect(auctionStateSchema.safeParse(auctionState).success).toBe(true);
    expect(deriveSoldRosterRows(auctionState, "team-1")).toEqual([
      {
        playerId: "player-1",
        name: "Aarav Menon",
        role: "Ace",
        acquisitionType: "Sold",
        soldPrice: 10
      },
      {
        playerId: "player-2",
        name: "Nisha Rao",
        role: "Batting",
        acquisitionType: "Sold",
        soldPrice: 12
      }
    ]);
    expect(
      deriveSoldRosterRows(
        {
          players: [
            {
              ...auctionState.players[0]!,
              soldPrice: null
            }
          ]
        },
        "team-1"
      )
    ).toEqual([]);
    expect(
      auctionStateSchema.safeParse({
        ...auctionState,
        undoHistory: [
          {
            ...auctionState.undoHistory[0],
            sourceRowNumber: 2
          }
        ]
      }).success
    ).toBe(false);
  });

  it("validates Reveal Next Player undo-history entries in auction state", () => {
    const boardState = createBoardState();

    expect(
      auctionStateSchema.safeParse({
        auctionId: boardState.auctionId,
        phase: boardState.phase,
        parameters: boardState.parameters,
        players: [
          {
            ...boardState.players[0],
            gender: "Male",
            status: "Current"
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
        currentPlayerId: "player-1",
        currentBid: 10,
        selectedTeamId: null,
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
        ],
        createdAt: "2026-07-07T08:30:00.000Z",
        updatedAt: "2026-07-07T08:31:00.000Z",
        persistenceFailure: null
      }).success
    ).toBe(true);

    expect(
      auctionStateSchema.safeParse({
        auctionId: boardState.auctionId,
        phase: boardState.phase,
        parameters: boardState.parameters,
        players: [
          {
            ...boardState.players[0],
            gender: "Male",
            status: "Current"
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
        currentPlayerId: "player-1",
        currentBid: 10,
        selectedTeamId: null,
        undoHistory: [
          {
            command: "RevealNextPlayer",
            playerId: "player-1",
            previousCurrentPlayerId: null,
            previousCurrentBid: null,
            previousSelectedTeamId: null,
            previousPlayerStatus: "Pending",
            timestamp: "2026-07-07T08:31:00.000Z",
            sourceRowNumber: 2
          }
        ],
        createdAt: "2026-07-07T08:30:00.000Z",
        updatedAt: "2026-07-07T08:31:00.000Z",
        persistenceFailure: null
      }).success
    ).toBe(false);
  });

  it("validates Select Team undo-history entries in auction state", () => {
    const boardState = createBoardState();

    expect(
      auctionStateSchema.safeParse({
        auctionId: boardState.auctionId,
        phase: boardState.phase,
        parameters: boardState.parameters,
        players: [
          {
            ...boardState.players[0],
            gender: "Male",
            status: "Current"
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
        currentPlayerId: "player-1",
        currentBid: 10,
        selectedTeamId: "team-1",
        undoHistory: [
          {
            command: "SelectTeam",
            previousSelectedTeamId: null,
            nextSelectedTeamId: "team-1",
            currentPlayerId: "player-1",
            currentBid: 10,
            timestamp: "2026-07-07T08:31:00.000Z"
          }
        ],
        createdAt: "2026-07-07T08:30:00.000Z",
        updatedAt: "2026-07-07T08:31:00.000Z",
        persistenceFailure: null
      }).success
    ).toBe(true);

    expect(
      auctionStateSchema.safeParse({
        auctionId: boardState.auctionId,
        phase: boardState.phase,
        parameters: boardState.parameters,
        players: [
          {
            ...boardState.players[0],
            gender: "Male",
            status: "Current"
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
        currentPlayerId: "player-1",
        currentBid: 10,
        selectedTeamId: "team-1",
        undoHistory: [
          {
            command: "SelectTeam",
            previousSelectedTeamId: null,
            nextSelectedTeamId: "team-1",
            currentPlayerId: "player-1",
            currentBid: 10,
            timestamp: "2026-07-07T08:31:00.000Z",
            sourceRowNumber: 2
          }
        ],
        createdAt: "2026-07-07T08:30:00.000Z",
        updatedAt: "2026-07-07T08:31:00.000Z",
        persistenceFailure: null
      }).success
    ).toBe(false);
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

  it("validates Increase Bid undo-history entries in auction state", () => {
    const boardState = createBoardState();

    expect(
      auctionStateSchema.safeParse({
        auctionId: boardState.auctionId,
        phase: boardState.phase,
        parameters: boardState.parameters,
        players: [
          {
            ...boardState.players[0],
            gender: "Male",
            status: "Current"
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
        currentPlayerId: "player-1",
        currentBid: 12,
        selectedTeamId: null,
        undoHistory: [
          {
            command: "IncreaseBid",
            currentPlayerId: "player-1",
            previousCurrentBid: 10,
            nextCurrentBid: 12,
            bidIncrement: 2,
            timestamp: "2026-07-07T08:31:00.000Z"
          }
        ],
        createdAt: "2026-07-07T08:30:00.000Z",
        updatedAt: "2026-07-07T08:31:00.000Z",
        persistenceFailure: null
      }).success
    ).toBe(true);

    expect(
      auctionStateSchema.safeParse({
        auctionId: boardState.auctionId,
        phase: boardState.phase,
        parameters: boardState.parameters,
        players: [
          {
            ...boardState.players[0],
            gender: "Male",
            status: "Current"
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
        currentPlayerId: "player-1",
        currentBid: 12,
        selectedTeamId: null,
        undoHistory: [
          {
            command: "IncreaseBid",
            currentPlayerId: "player-1",
            previousCurrentBid: 10,
            nextCurrentBid: 12,
            bidIncrement: 2,
            timestamp: "2026-07-07T08:31:00.000Z",
            actionLogPayload: { private: true }
          }
        ],
        createdAt: "2026-07-07T08:30:00.000Z",
        updatedAt: "2026-07-07T08:31:00.000Z",
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
    teamRosters: [],
    currentPlayer: null,
    currentBid: null,
    selectedTeamId: null,
    phase2PoolCount: 0,
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
    lastUndoAction: null,
    persistenceFailure: null
  } as const;
}
