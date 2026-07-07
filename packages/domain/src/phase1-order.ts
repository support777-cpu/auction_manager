import type {
  AuctionParameters,
  AuctionPlayer,
  Phase1Category,
  Phase1OrderState
} from "@auction-manager/shared";

export interface CreatePhase1OrderInput {
  readonly players: readonly AuctionPlayer[];
  readonly parameters: AuctionParameters;
  readonly generatedAt: string;
  readonly shuffle?: (playerIds: readonly string[]) => readonly string[];
}

export type CreatePhase1OrderError =
  | {
      readonly code: "phase1_category_not_configured";
      readonly playerId: string;
      readonly category: Phase1Category;
    }
  | {
      readonly code: "duplicate_phase1_player_id";
      readonly playerId: string;
    }
  | {
      readonly code: "invalid_phase1_shuffle_output";
      readonly category: Phase1Category;
    };

export type CreatePhase1OrderResult =
  | { readonly ok: true; readonly order: Phase1OrderState }
  | { readonly ok: false; readonly error: CreatePhase1OrderError };

export function createPhase1Order(
  input: CreatePhase1OrderInput
): CreatePhase1OrderResult {
  const configuredCategories = new Set(input.parameters.phase1CategoryOrder);
  const seenPlayerIds = new Set<string>();
  const playersByCategory = new Map<Phase1Category, string[]>(
    input.parameters.phase1CategoryOrder.map((category) => [category, []])
  );

  for (const player of input.players) {
    if (seenPlayerIds.has(player.id)) {
      return {
        ok: false,
        error: {
          code: "duplicate_phase1_player_id",
          playerId: player.id
        }
      };
    }
    seenPlayerIds.add(player.id);

    if (!configuredCategories.has(player.phase1Category)) {
      return {
        ok: false,
        error: {
          code: "phase1_category_not_configured",
          playerId: player.id,
          category: player.phase1Category
        }
      };
    }

    playersByCategory.get(player.phase1Category)?.push(player.id);
  }

  const shuffle = input.shuffle ?? shufflePlayerIds;
  const categories = input.parameters.phase1CategoryOrder.map((category) => {
    const playerIds = playersByCategory.get(category) ?? [];
    const shuffledPlayerIds = [...shuffle(playerIds)];
    if (!containsSamePlayerIds(playerIds, shuffledPlayerIds)) {
      return {
        ok: false as const,
        error: {
          code: "invalid_phase1_shuffle_output" as const,
          category
        }
      };
    }

    return {
      ok: true as const,
      category: {
        category,
        playerIds: shuffledPlayerIds
      }
    };
  });

  const invalidCategory = categories.find((entry) => !entry.ok);
  if (invalidCategory && !invalidCategory.ok) {
    return {
      ok: false,
      error: invalidCategory.error
    };
  }

  const categoryEntries = categories.map((entry) => {
    if (!entry.ok) {
      throw new Error("Unreachable invalid Phase 1 category entry.");
    }
    return entry.category;
  });

  return {
    ok: true,
    order: {
      categories: categoryEntries,
      playerIds: categoryEntries.flatMap((entry) => entry.playerIds),
      generatedAt: input.generatedAt
    }
  };
}

function shufflePlayerIds(playerIds: readonly string[]): readonly string[] {
  const shuffled = [...playerIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentPlayerId = shuffled[index];
    const swapPlayerId = shuffled[swapIndex];
    if (currentPlayerId && swapPlayerId) {
      shuffled[index] = swapPlayerId;
      shuffled[swapIndex] = currentPlayerId;
    }
  }
  return shuffled;
}

function containsSamePlayerIds(
  expectedPlayerIds: readonly string[],
  candidatePlayerIds: readonly string[]
): boolean {
  if (expectedPlayerIds.length !== candidatePlayerIds.length) {
    return false;
  }

  const expectedCounts = new Map<string, number>();
  for (const playerId of expectedPlayerIds) {
    expectedCounts.set(playerId, (expectedCounts.get(playerId) ?? 0) + 1);
  }

  for (const playerId of candidatePlayerIds) {
    const remaining = expectedCounts.get(playerId);
    if (!remaining) {
      return false;
    }
    expectedCounts.set(playerId, remaining - 1);
  }

  return [...expectedCounts.values()].every((count) => count === 0);
}
