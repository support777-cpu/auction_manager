import type { AuctionState } from "@auction-manager/shared";

export type RevealNextPlayerErrorCode =
  | "auction_not_in_initial_phase"
  | "current_player_requires_outcome"
  | "no_pending_phase1_players";

export type RevealNextPlayerResult =
  | {
      readonly ok: true;
      readonly state: AuctionState;
      readonly revealedPlayerId: string;
      readonly summary: string;
    }
  | {
      readonly ok: false;
      readonly error: RevealNextPlayerErrorCode;
      readonly message: string;
    };

export interface RevealNextPlayerInput {
  readonly state: AuctionState;
  readonly now: () => string;
}

export function revealNextPlayer(
  input: RevealNextPlayerInput
): RevealNextPlayerResult {
  if (input.state.phase !== "InitialAuction") {
    return {
      ok: false,
      error: "auction_not_in_initial_phase",
      message: "Reveal Next Player is only available during Initial Auction."
    };
  }

  if (input.state.currentPlayerId !== null) {
    return {
      ok: false,
      error: "current_player_requires_outcome",
      message: "Resolve the current Player before revealing the next Player."
    };
  }

  const playerById = new Map(
    input.state.players.map((player) => [player.id, player])
  );
  const nextPlayerId = input.state.phase1Order.playerIds.find((playerId) => {
    const player = playerById.get(playerId);
    return player?.status === "Pending";
  });

  if (!nextPlayerId) {
    return {
      ok: false,
      error: "no_pending_phase1_players",
      message: "There are no pending Phase 1 Players to reveal."
    };
  }

  const timestamp = input.now();
  const nextPlayer = playerById.get(nextPlayerId)!;

  const players = input.state.players.map((player) =>
    player.id === nextPlayerId
      ? {
          ...player,
          status: "Current" as const
        }
      : player
  );

  return {
    ok: true,
    revealedPlayerId: nextPlayerId,
    summary: `Revealed ${nextPlayer.name} at base price ${nextPlayer.basePrice}.`,
    state: {
      ...input.state,
      players,
      currentPlayerId: nextPlayerId,
      currentBid: nextPlayer.basePrice,
      selectedTeamId: null,
      undoHistory: [
        ...input.state.undoHistory,
        {
          command: "RevealNextPlayer",
          playerId: nextPlayerId,
          previousCurrentPlayerId: input.state.currentPlayerId,
          previousCurrentBid: input.state.currentBid,
          previousSelectedTeamId: input.state.selectedTeamId,
          previousPlayerStatus: nextPlayer.status,
          timestamp
        }
      ],
      updatedAt: timestamp
    }
  };
}
