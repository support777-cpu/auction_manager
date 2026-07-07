import type {
  AuctionRole,
  AuctionState,
  MarkSoldConflictReason,
  MarkSoldConflictReasonCode
} from "@auction-manager/shared";
import { getCurrentPlayerTeamCapacityDetails } from "./select-team.js";

export type MarkSoldErrorCode =
  | "auction_not_in_initial_phase"
  | "current_player_required"
  | "selected_team_required"
  | "current_bid_required"
  | "selected_team_not_found"
  | "current_player_not_found"
  | "sale_blocked";

export type MarkSoldResult =
  | {
      readonly ok: true;
      readonly accepted: true;
      readonly state: AuctionState;
      readonly message: string;
    }
  | {
      readonly ok: false;
      readonly error: MarkSoldErrorCode;
      readonly state: AuctionState;
      readonly message: string;
      readonly reasons: readonly MarkSoldConflictReason[];
    };

export interface MarkSoldInput {
  readonly state: AuctionState;
  readonly now: () => string;
}

export function markSold(input: MarkSoldInput): MarkSoldResult {
  if (input.state.phase !== "InitialAuction") {
    return prerequisiteConflict(
      input.state,
      "auction_not_in_initial_phase",
      "Mark Sold is only available during Initial Auction."
    );
  }

  if (input.state.currentPlayerId === null) {
    return prerequisiteConflict(
      input.state,
      "current_player_required",
      "Reveal a Current Player before marking sold."
    );
  }

  const currentPlayer = input.state.players.find(
    (player) => player.id === input.state.currentPlayerId
  );
  if (!currentPlayer) {
    return prerequisiteConflict(
      input.state,
      "current_player_not_found",
      "Current Player could not be found in this auction."
    );
  }

  if (currentPlayer.status !== "Current") {
    return prerequisiteConflict(
      input.state,
      "current_player_required",
      "Current Player must be active before marking sold."
    );
  }

  if (input.state.selectedTeamId === null) {
    return prerequisiteConflict(
      input.state,
      "selected_team_required",
      "Select a Team before marking sold."
    );
  }

  if (input.state.currentBid === null || input.state.currentBid <= 0) {
    return prerequisiteConflict(
      input.state,
      "current_bid_required",
      "Current Bid is required before marking sold."
    );
  }

  const selectedTeam = input.state.teams.find(
    (team) => team.id === input.state.selectedTeamId
  );
  if (!selectedTeam) {
    return prerequisiteConflict(
      input.state,
      "selected_team_not_found",
      "Selected Team could not be found in this auction."
    );
  }

  const capacity = getCurrentPlayerTeamCapacityDetails(input.state, selectedTeam.id);
  if (!capacity) {
    return prerequisiteConflict(
      input.state,
      "current_player_required",
      "Current Player capacity could not be evaluated."
    );
  }

  const reasons: MarkSoldConflictReason[] = capacity.reasons.map((capacityReason) =>
    reason(capacityReason.code, `Blocked: ${capacityReason.message}`)
  );

  if (reasons.length > 0) {
    return {
      ok: false,
      error: "sale_blocked",
      state: input.state,
      message: reasons[0]!.message,
      reasons
    };
  }

  const timestamp = input.now();
  const soldPrice = input.state.currentBid;
  const nextRoleCount = (selectedTeam.roleCounts[currentPlayer.role] ?? 0) + 1;
  const nextTeam = {
    ...selectedTeam,
    remainingBudget: selectedTeam.remainingBudget - soldPrice,
    squadCount: selectedTeam.squadCount + 1,
    roleCounts: {
      ...selectedTeam.roleCounts,
      [currentPlayer.role]: nextRoleCount
    } satisfies Record<AuctionRole, number>
  };
  const nextPlayer = {
    ...currentPlayer,
    status: "Sold" as const,
    soldPrice,
    winningTeamId: selectedTeam.id,
    acquisitionType: "Auction" as const
  };
  const message = `Sold ${currentPlayer.name} to ${selectedTeam.name} for ${soldPrice}.`;

  return {
    ok: true,
    accepted: true,
    state: {
      ...input.state,
      players: input.state.players.map((player) =>
        player.id === currentPlayer.id ? nextPlayer : player
      ),
      teams: input.state.teams.map((team) =>
        team.id === selectedTeam.id ? nextTeam : team
      ),
      currentPlayerId: null,
      currentBid: null,
      selectedTeamId: null,
      undoHistory: [
        ...input.state.undoHistory,
        {
          command: "MarkSold",
          playerId: currentPlayer.id,
          previousPlayerStatus: currentPlayer.status,
          previousSoldPrice: currentPlayer.soldPrice,
          previousWinningTeamId: currentPlayer.winningTeamId,
          previousAcquisitionType: currentPlayer.acquisitionType,
          previousCurrentPlayerId: input.state.currentPlayerId,
          previousCurrentBid: input.state.currentBid,
          previousSelectedTeamId: input.state.selectedTeamId,
          winningTeamId: selectedTeam.id,
          previousTeamRemainingBudget: selectedTeam.remainingBudget,
          nextTeamRemainingBudget: nextTeam.remainingBudget,
          previousTeamSquadCount: selectedTeam.squadCount,
          nextTeamSquadCount: nextTeam.squadCount,
          role: currentPlayer.role,
          previousTeamRoleCount: selectedTeam.roleCounts[currentPlayer.role] ?? 0,
          nextTeamRoleCount: nextRoleCount,
          soldPrice,
          timestamp
        }
      ],
      updatedAt: timestamp
    },
    message
  };
}

function prerequisiteConflict(
  state: AuctionState,
  code: Exclude<MarkSoldErrorCode, "sale_blocked">,
  message: string
): MarkSoldResult {
  return {
    ok: false,
    error: code,
    state,
    message,
    reasons: [reason(code, message)]
  };
}

function reason(
  code: MarkSoldConflictReasonCode,
  message: string
): MarkSoldConflictReason {
  return {
    code,
    message
  };
}
