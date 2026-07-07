import type {
  AuctionState,
  TeamCurrentPlayerCapacityDto
} from "@auction-manager/shared";

export type SelectTeamErrorCode =
  | "auction_not_in_initial_phase"
  | "current_player_required"
  | "current_bid_required"
  | "team_not_found";

export type SelectTeamResult =
  | {
      readonly ok: true;
      readonly state: AuctionState;
      readonly selectedTeamId: string | null;
      readonly summary: string;
      readonly undoRecorded: boolean;
    }
  | {
      readonly ok: false;
      readonly error: SelectTeamErrorCode;
      readonly message: string;
    };

export interface SelectTeamInput {
  readonly state: AuctionState;
  readonly teamId: string | null;
  readonly now: () => string;
}

export function selectTeam(input: SelectTeamInput): SelectTeamResult {
  if (input.state.phase !== "InitialAuction") {
    return {
      ok: false,
      error: "auction_not_in_initial_phase",
      message: "Team selection is only available during Initial Auction."
    };
  }

  const currentPlayer = input.state.players.find(
    (player) => player.id === input.state.currentPlayerId
  );
  if (!currentPlayer) {
    return {
      ok: false,
      error: "current_player_required",
      message: "Reveal a Current Player before selecting a Team."
    };
  }

  if (input.state.currentBid === null || input.state.currentBid <= 0) {
    return {
      ok: false,
      error: "current_bid_required",
      message: "Current Bid is required before selecting a Team."
    };
  }

  const selectedTeam =
    input.teamId === null
      ? null
      : input.state.teams.find((team) => team.id === input.teamId);
  if (input.teamId !== null && !selectedTeam) {
    return {
      ok: false,
      error: "team_not_found",
      message: "Select a Team that exists in this auction."
    };
  }
  const selectedTeamName = selectedTeam?.name ?? null;

  if (input.teamId === input.state.selectedTeamId) {
    return {
      ok: true,
      state: input.state,
      selectedTeamId: input.teamId,
      summary:
        selectedTeamName === null
          ? "Selected Team is already clear."
          : `${selectedTeamName} is already selected for ${currentPlayer.name}.`,
      undoRecorded: false
    };
  }

  const timestamp = input.now();
  const summary =
    selectedTeamName === null
      ? "Cleared selected Team."
      : `Selected ${selectedTeamName} for ${currentPlayer.name}.`;

  return {
    ok: true,
    selectedTeamId: input.teamId,
    summary,
    undoRecorded: true,
    state: {
      ...input.state,
      selectedTeamId: input.teamId,
      undoHistory: [
        ...input.state.undoHistory,
        {
          command: "SelectTeam",
          previousSelectedTeamId: input.state.selectedTeamId,
          nextSelectedTeamId: input.teamId,
          currentPlayerId: currentPlayer.id,
          currentBid: input.state.currentBid,
          timestamp
        }
      ],
      updatedAt: timestamp
    }
  };
}

export function getCurrentPlayerTeamCapacity(
  state: AuctionState,
  teamId: string
): TeamCurrentPlayerCapacityDto | null {
  const currentPlayer = state.players.find(
    (player) => player.id === state.currentPlayerId
  );
  if (!currentPlayer || state.currentBid === null) {
    return null;
  }

  const team = state.teams.find((candidate) => candidate.id === teamId);
  if (!team) {
    return null;
  }

  const reasons: string[] = [];
  if (team.remainingBudget < state.currentBid) {
    reasons.push(
      `${team.name} has ${team.remainingBudget} remaining; current bid is ${state.currentBid}.`
    );
  }

  if (team.squadCount >= state.parameters.maxSquadSize) {
    reasons.push(
      `${team.name} already has ${team.squadCount} of ${state.parameters.maxSquadSize} players.`
    );
  }

  const roleCount = team.roleCounts[currentPlayer.role];
  const roleTarget = state.parameters.roleTargets[currentPlayer.role];
  if (roleCount === undefined || roleTarget === undefined) {
    reasons.push(`${team.name} role capacity data is incomplete for ${currentPlayer.role}.`);
  } else if (roleCount >= roleTarget) {
    reasons.push(
      `${team.name} has ${roleCount} of ${roleTarget} ${currentPlayer.role} slots filled.`
    );
  }

  return {
    teamId,
    canBuy: reasons.length === 0,
    reasons
  };
}
