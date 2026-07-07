import type { AuctionState } from "@auction-manager/shared";

export type MarkUnsoldErrorCode =
  | "auction_not_in_initial_phase"
  | "current_player_required"
  | "current_player_not_found"
  | "player_already_in_phase2_pool";

export type MarkUnsoldResult =
  | {
      readonly ok: true;
      readonly accepted: true;
      readonly state: AuctionState;
      readonly message: string;
    }
  | {
      readonly ok: false;
      readonly error: MarkUnsoldErrorCode;
      readonly state: AuctionState;
      readonly message: string;
    };

export interface MarkUnsoldInput {
  readonly state: AuctionState;
  readonly now: () => string;
}

export function markUnsold(input: MarkUnsoldInput): MarkUnsoldResult {
  if (input.state.phase !== "InitialAuction") {
    return rejected(
      input.state,
      "auction_not_in_initial_phase",
      "Mark Unsold is only available during Initial Auction."
    );
  }

  if (input.state.currentPlayerId === null) {
    return rejected(
      input.state,
      "current_player_required",
      "Reveal a Current Player before marking unsold."
    );
  }

  const currentPlayer = input.state.players.find(
    (player) => player.id === input.state.currentPlayerId
  );
  if (!currentPlayer) {
    return rejected(
      input.state,
      "current_player_not_found",
      "Current Player could not be found in this auction."
    );
  }

  if (currentPlayer.status !== "Current") {
    return rejected(
      input.state,
      "current_player_required",
      "Current Player must be active before marking unsold."
    );
  }

  if (input.state.phase2Pool.includes(currentPlayer.id)) {
    return rejected(
      input.state,
      "player_already_in_phase2_pool",
      "Current Player is already in the Phase 2 pool."
    );
  }

  const timestamp = input.now();
  const nextPlayer = {
    ...currentPlayer,
    status: "Unsold" as const,
    soldPrice: null,
    winningTeamId: null,
    acquisitionType: null
  };
  const message = `Marked unsold. ${currentPlayer.name} moves to Phase 2 rebid.`;

  return {
    ok: true,
    accepted: true,
    state: {
      ...input.state,
      players: input.state.players.map((player) =>
        player.id === currentPlayer.id ? nextPlayer : player
      ),
      phase2Pool: [...input.state.phase2Pool, currentPlayer.id],
      currentPlayerId: null,
      currentBid: null,
      selectedTeamId: null,
      undoHistory: [
        ...input.state.undoHistory,
        {
          command: "MarkUnsold",
          playerId: currentPlayer.id,
          previousPlayerStatus: currentPlayer.status,
          previousCurrentPlayerId: input.state.currentPlayerId,
          previousCurrentBid: input.state.currentBid,
          previousSelectedTeamId: input.state.selectedTeamId,
          timestamp
        }
      ],
      updatedAt: timestamp
    },
    message
  };
}

function rejected(
  state: AuctionState,
  code: MarkUnsoldErrorCode,
  message: string
): MarkUnsoldResult {
  return {
    ok: false,
    error: code,
    state,
    message
  };
}
