import type { AuctionState } from "@auction-manager/shared";

export type IncreaseBidErrorCode =
  | "auction_not_in_initial_phase"
  | "current_player_required"
  | "current_bid_required";

export type IncreaseBidResult =
  | {
      readonly ok: true;
      readonly state: AuctionState;
      readonly previousCurrentBid: number;
      readonly nextCurrentBid: number;
      readonly bidIncrement: number;
      readonly summary: string;
    }
  | {
      readonly ok: false;
      readonly error: IncreaseBidErrorCode;
      readonly message: string;
    };

export interface IncreaseBidInput {
  readonly state: AuctionState;
  readonly now: () => string;
}

export function increaseBid(input: IncreaseBidInput): IncreaseBidResult {
  if (input.state.phase !== "InitialAuction") {
    return {
      ok: false,
      error: "auction_not_in_initial_phase",
      message: "Increase Bid is only available during Initial Auction."
    };
  }

  const currentPlayer = input.state.players.find(
    (player) => player.id === input.state.currentPlayerId
  );
  if (!currentPlayer) {
    return {
      ok: false,
      error: "current_player_required",
      message: "Reveal a Current Player before increasing the bid."
    };
  }

  if (input.state.currentBid === null || input.state.currentBid <= 0) {
    return {
      ok: false,
      error: "current_bid_required",
      message: "Current Bid is required before increasing the bid."
    };
  }

  const timestamp = input.now();
  const previousCurrentBid = input.state.currentBid;
  const bidIncrement = input.state.parameters.bidIncrement;
  const nextCurrentBid = previousCurrentBid + bidIncrement;

  return {
    ok: true,
    previousCurrentBid,
    nextCurrentBid,
    bidIncrement,
    summary: `Increased bid for ${currentPlayer.name} to ${nextCurrentBid}.`,
    state: {
      ...input.state,
      currentBid: nextCurrentBid,
      undoHistory: [
        ...input.state.undoHistory,
        {
          command: "IncreaseBid",
          currentPlayerId: currentPlayer.id,
          previousCurrentBid,
          nextCurrentBid,
          bidIncrement,
          timestamp
        }
      ],
      updatedAt: timestamp
    }
  };
}
