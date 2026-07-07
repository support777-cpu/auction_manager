import type { AuctionPlayer, AuctionState, Phase1ProgressDto } from "@auction-manager/shared";

const completedPhase1Statuses = new Set<AuctionPlayer["status"]>([
  "Sold",
  "Unsold",
  "Assigned"
]);

export function toPhase1ProgressDto(state: AuctionState): Phase1ProgressDto {
  const playerById = new Map(state.players.map((player) => [player.id, player]));
  const currentPlayerCategory =
    state.currentPlayerId !== null
      ? (playerById.get(state.currentPlayerId)?.phase1Category ?? null)
      : null;

  const categories = state.phase1Order.categories.map((entry) => {
    let pending = 0;
    let completed = 0;

    for (const playerId of entry.playerIds) {
      const player = playerById.get(playerId);
      if (!player) {
        continue;
      }

      if (player.status === "Pending") {
        pending += 1;
      } else if (completedPhase1Statuses.has(player.status)) {
        completed += 1;
      }
    }

    return {
      category: entry.category,
      total: entry.playerIds.length,
      pending,
      completed
    };
  });

  const pendingPlayerCount = categories.reduce(
    (total, category) => total + category.pending,
    0
  );
  const revealedPlayerCount = state.phase1Order.playerIds.filter((playerId) => {
    const status = playerById.get(playerId)?.status;
    return status !== undefined && status !== "Pending";
  }).length;

  return {
    currentCategory:
      currentPlayerCategory ??
      categories.find((category) => category.pending > 0)?.category ??
      null,
    orderedPlayerCount: state.phase1Order.playerIds.length,
    pendingPlayerCount,
    revealedPlayerCount,
    categories
  };
}
