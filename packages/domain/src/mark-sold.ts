import type {
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

  return {
    ok: true,
    accepted: true,
    state: input.state,
    message: `${selectedTeam.name} can buy ${currentPlayer.name} for ${input.state.currentBid}.`
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
