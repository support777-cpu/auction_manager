import type {
  AuctionPlayer,
  AuctionState,
  AuctionTeam,
  LiveActionUndoHistoryEntry
} from "@auction-manager/shared";

export type UndoLastActionErrorCode =
  | "auction_not_in_initial_phase"
  | "no_actions_to_undo"
  | "unsupported_undo_action"
  | "affected_player_not_found"
  | "winning_team_not_found";

export type UndoLastActionResult =
  | {
      readonly ok: true;
      readonly state: AuctionState;
      readonly message: string;
      readonly undoneAction: LiveActionUndoHistoryEntry;
    }
  | {
      readonly ok: false;
      readonly error: UndoLastActionErrorCode;
      readonly message: string;
    };

export interface UndoLastActionInput {
  readonly state: AuctionState;
  readonly now: () => string;
}

export function undoLastAction(input: UndoLastActionInput): UndoLastActionResult {
  if (input.state.phase !== "InitialAuction") {
    return {
      ok: false,
      error: "auction_not_in_initial_phase",
      message: "Undo is not available in this phase."
    };
  }

  const undoneAction = input.state.undoHistory.at(-1);
  if (!undoneAction) {
    return {
      ok: false,
      error: "no_actions_to_undo",
      message: "No actions to undo."
    };
  }

  const timestamp = input.now();
  const remainingUndoHistory = input.state.undoHistory.slice(0, -1);
  const playersById = new Map(input.state.players.map((player) => [player.id, player]));
  const affectedPlayerId =
    "playerId" in undoneAction
      ? undoneAction.playerId
      : "currentPlayerId" in undoneAction
        ? undoneAction.currentPlayerId
        : null;
  const player =
    affectedPlayerId === null ? null : playersById.get(affectedPlayerId) ?? null;

  if (affectedPlayerId !== null && !player) {
    return {
      ok: false,
      error: "affected_player_not_found",
      message: "Undo target player is missing."
    };
  }

  if (
    undoneAction.command === "MarkSold" &&
    !input.state.teams.some((team) => team.id === undoneAction.winningTeamId)
  ) {
    return {
      ok: false,
      error: "winning_team_not_found",
      message: "Undo target team is missing."
    };
  }

  switch (undoneAction.command) {
    case "RevealNextPlayer": {
      const players = input.state.players.map((candidate) =>
        candidate.id === undoneAction.playerId
          ? {
              ...candidate,
              status: undoneAction.previousPlayerStatus
            }
          : candidate
      );

      return success(input.state, {
        players,
        currentPlayerId: undoneAction.previousCurrentPlayerId,
        currentBid: undoneAction.previousCurrentBid,
        selectedTeamId: undoneAction.previousSelectedTeamId,
        undoHistory: remainingUndoHistory,
        updatedAt: timestamp
      }, undoneAction, `Undid Reveal Next Player: ${playerName(player)}.`);
    }

    case "SelectTeam":
      return success(input.state, {
        selectedTeamId: undoneAction.previousSelectedTeamId,
        undoHistory: remainingUndoHistory,
        updatedAt: timestamp
      }, undoneAction, `Undid Select Team: ${playerName(player)}.`);

    case "IncreaseBid":
      return success(input.state, {
        currentBid: undoneAction.previousCurrentBid,
        undoHistory: remainingUndoHistory,
        updatedAt: timestamp
      }, undoneAction, `Undid Increase Bid: ${playerName(player)}.`);

    case "MarkSold": {
      const players = input.state.players.map((candidate) =>
        candidate.id === undoneAction.playerId
          ? {
              ...candidate,
              status: undoneAction.previousPlayerStatus,
              soldPrice: undoneAction.previousSoldPrice,
              winningTeamId: undoneAction.previousWinningTeamId,
              acquisitionType: undoneAction.previousAcquisitionType
            }
          : candidate
      );
      const teams = input.state.teams.map((team) =>
        team.id === undoneAction.winningTeamId
          ? restoreSoldTeam(team, undoneAction)
          : team
      );

      return success(input.state, {
        players,
        teams,
        currentPlayerId: undoneAction.previousCurrentPlayerId,
        currentBid: undoneAction.previousCurrentBid,
        selectedTeamId: undoneAction.previousSelectedTeamId,
        undoHistory: remainingUndoHistory,
        updatedAt: timestamp
      }, undoneAction, `Undid Mark Sold: ${playerName(player)}.`);
    }

    case "MarkUnsold": {
      const players = input.state.players.map((candidate) =>
        candidate.id === undoneAction.playerId
          ? {
              ...candidate,
              status: undoneAction.previousPlayerStatus
            }
          : candidate
      );

      return success(input.state, {
        players,
        phase2Pool: input.state.phase2Pool.filter(
          (playerId) => playerId !== undoneAction.playerId
        ),
        currentPlayerId: undoneAction.previousCurrentPlayerId,
        currentBid: undoneAction.previousCurrentBid,
        selectedTeamId: undoneAction.previousSelectedTeamId,
        undoHistory: remainingUndoHistory,
        updatedAt: timestamp
      }, undoneAction, `Undid Mark Unsold: ${playerName(player)}.`);
    }

    default:
      return {
        ok: false,
        error: "unsupported_undo_action",
        message: "The last action cannot be undone."
      };
  }
}

function success(
  state: AuctionState,
  patch: Partial<AuctionState>,
  undoneAction: LiveActionUndoHistoryEntry,
  message: string
): UndoLastActionResult {
  return {
    ok: true,
    state: {
      ...state,
      ...patch
    },
    undoneAction,
    message
  };
}

function restoreSoldTeam(
  team: AuctionTeam,
  action: Extract<LiveActionUndoHistoryEntry, { command: "MarkSold" }>
): AuctionTeam {
  return {
    ...team,
    remainingBudget: action.previousTeamRemainingBudget,
    squadCount: action.previousTeamSquadCount,
    roleCounts: {
      ...team.roleCounts,
      [action.role]: action.previousTeamRoleCount
    }
  };
}

function playerName(player: AuctionPlayer | null | undefined): string {
  return player?.name ?? "Player";
}
