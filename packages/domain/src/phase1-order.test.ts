import { describe, expect, it } from "vitest";
import type { AuctionPlayer, AuctionParameters } from "@auction-manager/shared";
import { getDefaultAuctionParameters } from "./auction-parameters.js";
import { createPhase1Order } from "./phase1-order.js";

const parameters = getDefaultAuctionParameters();

describe("createPhase1Order", () => {
  it("follows the locked category sequence and includes each player once", () => {
    const result = createPhase1Order({
      players: [
        createPlayer({ id: "bowler-1", phase1Category: "Men Bowlers" }),
        createPlayer({ id: "ace-1", phase1Category: "Ace Men" }),
        createPlayer({ id: "women-allrounder-1", phase1Category: "Women All Rounders" })
      ],
      parameters,
      generatedAt: "2026-07-07T08:30:00.000Z",
      shuffle: (playerIds) => [...playerIds].reverse()
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.order.categories.map((entry) => entry.category)).toEqual(
      parameters.phase1CategoryOrder
    );
    expect(result.order.playerIds).toEqual([
      "ace-1",
      "women-allrounder-1",
      "bowler-1"
    ]);
    expect(new Set(result.order.playerIds).size).toBe(3);
  });

  it("randomizes only within categories through injected shuffle", () => {
    const result = createPhase1Order({
      players: [
        createPlayer({ id: "ace-1", phase1Category: "Ace Men" }),
        createPlayer({ id: "ace-2", phase1Category: "Ace Men" }),
        createPlayer({ id: "batter-1", phase1Category: "Men Batsmen" }),
        createPlayer({ id: "batter-2", phase1Category: "Men Batsmen" })
      ],
      parameters,
      generatedAt: "2026-07-07T08:30:00.000Z",
      shuffle: (playerIds) => [...playerIds].reverse()
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order.playerIds).toEqual([
        "ace-2",
        "ace-1",
        "batter-2",
        "batter-1"
      ]);
    }
  });

  it("rejects players whose category is not configured", () => {
    const result = createPhase1Order({
      players: [createPlayer({ id: "ace-1", phase1Category: "Ace Men" })],
      parameters: {
        ...parameters,
        phase1CategoryOrder: parameters.phase1CategoryOrder.filter(
          (category) => category !== "Ace Men"
        ) as AuctionParameters["phase1CategoryOrder"]
      },
      generatedAt: "2026-07-07T08:30:00.000Z",
      shuffle: (playerIds) => [...playerIds]
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "phase1_category_not_configured",
        playerId: "ace-1",
        category: "Ace Men"
      }
    });
  });

  it("rejects duplicate player ids", () => {
    const result = createPhase1Order({
      players: [
        createPlayer({ id: "ace-1", phase1Category: "Ace Men" }),
        createPlayer({ id: "ace-1", phase1Category: "Ace Women" })
      ],
      parameters,
      generatedAt: "2026-07-07T08:30:00.000Z",
      shuffle: (playerIds) => [...playerIds]
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "duplicate_phase1_player_id",
        playerId: "ace-1"
      }
    });
  });

  it("rejects invalid shuffle output", () => {
    const result = createPhase1Order({
      players: [
        createPlayer({ id: "ace-1", phase1Category: "Ace Men" }),
        createPlayer({ id: "ace-2", phase1Category: "Ace Men" })
      ],
      parameters,
      generatedAt: "2026-07-07T08:30:00.000Z",
      shuffle: () => ["ace-2"]
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "invalid_phase1_shuffle_output",
        category: "Ace Men"
      }
    });
  });

  it("uses the default shuffle path without dropping players", () => {
    const result = createPhase1Order({
      players: [
        createPlayer({ id: "ace-1", phase1Category: "Ace Men" }),
        createPlayer({ id: "ace-2", phase1Category: "Ace Men" }),
        createPlayer({ id: "batter-1", phase1Category: "Men Batsmen" })
      ],
      parameters,
      generatedAt: "2026-07-07T08:30:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(new Set(result.order.playerIds)).toEqual(
        new Set(["ace-1", "ace-2", "batter-1"])
      );
      expect(result.order.categories[0]?.playerIds.sort()).toEqual(["ace-1", "ace-2"]);
    }
  });
});

function createPlayer(overrides: Partial<AuctionPlayer>): AuctionPlayer {
  return {
    id: "player-1",
    name: "Aarav Menon",
    gender: "Male",
    role: "Ace",
    phase1Category: "Ace Men",
    basePrice: 10,
    status: "Pending",
    soldPrice: null,
    winningTeamId: null,
    acquisitionType: null,
    ...overrides
  };
}
