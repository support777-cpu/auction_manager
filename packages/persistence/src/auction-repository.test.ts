import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAuctionRepository, PersistenceSnapshotWriteError } from "./index.js";
import type { AuctionState } from "@auction-manager/shared";

describe("auction repository", () => {
  it("commits current state, action log, and latest snapshot", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const state = createState();

    await repository.commitStartAuction({
      state,
      clientCommandId: "cmd-1"
    });

    expect(repository.loadCurrentState()).toEqual(state);
    expect(repository.listActionLog()).toMatchObject([
      {
        auctionId: "auction-1",
        command: "StartAuction",
        clientCommandId: "cmd-1",
        undoable: false
      }
    ]);
    expect(JSON.parse(await readFile(join(directory, "snapshots/latest.json"), "utf8")))
      .toEqual(state);

    repository.close();
  });

  it("reopens and reconstructs setup-started state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const snapshotPath = join(directory, "snapshots/latest.json");
    const firstRepository = createAuctionRepository({ databasePath, snapshotPath });
    const state = createState();

    await firstRepository.commitStartAuction({
      state,
      clientCommandId: "cmd-1"
    });
    firstRepository.close();

    const reopenedRepository = createAuctionRepository({ databasePath, snapshotPath });
    expect(reopenedRepository.loadCurrentState()).toEqual(state);
    reopenedRepository.close();
  });

  it("rejects duplicate clientCommandId without overwriting current auction", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const state = createState();

    await repository.commitStartAuction({
      state,
      clientCommandId: "cmd-1"
    });
    await expect(
      repository.commitStartAuction({
        state: { ...state, auctionId: "auction-2" },
        clientCommandId: "cmd-1"
      })
    ).rejects.toThrow("Duplicate clientCommandId");

    expect(repository.loadCurrentState()?.auctionId).toBe("auction-1");
    expect(repository.listActionLog()).toHaveLength(1);
    repository.close();
  });

  it("rejects starting a second auction after one is already active", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const state = createState();

    await repository.commitStartAuction({
      state,
      clientCommandId: "cmd-1"
    });
    await expect(
      repository.commitStartAuction({
        state: { ...state, auctionId: "auction-2" },
        clientCommandId: "cmd-2"
      })
    ).rejects.toThrow("already been started");

    expect(repository.loadCurrentState()?.auctionId).toBe("auction-1");
    expect(repository.listActionLog()).toHaveLength(1);
    repository.close();
  });

  it("marks persistence failure and rejects further mutations when snapshot write fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: directory
    });

    await expect(
      repository.commitStartAuction({
        state: createState(),
        clientCommandId: "cmd-1"
      })
    ).rejects.toBeInstanceOf(PersistenceSnapshotWriteError);

    expect(repository.loadCurrentState()?.persistenceFailure).toContain("snapshot");
    await expect(
      repository.commitStartAuction({
        state: { ...createState(), auctionId: "auction-2" },
        clientCommandId: "cmd-2"
      })
    ).rejects.toThrow("persistence failure");
    repository.close();
  });
});

function createState(): AuctionState {
  return {
    auctionId: "auction-1",
    phase: "InitialAuction",
    parameters: {
      roleBasePrices: {
        Ace: 10,
        Batting: 8,
        Bowling: 6,
        AllRounder: 6,
        Girls: 6
      },
      bidIncrement: 2,
      teamBudget: 170,
      maxSquadSize: 13,
      roleTargets: {
        Ace: 2,
        Batting: 3,
        Bowling: 2,
        AllRounder: 2,
        Girls: 2
      },
      phase1CategoryOrder: [
        "Ace Men",
        "Ace Women",
        "Women All Rounders",
        "Men Bowlers",
        "Men Batsmen",
        "Men All Rounders"
      ],
      manualAssignmentBudgetBehavior: "NoBudgetImpact"
    },
    players: [
      {
        id: "player-1",
        name: "Aarav Menon",
        gender: "Male",
        role: "Ace",
        phase1Category: "Ace Men",
        basePrice: 10,
        status: "Pending",
        photoAssetId: "asset-player-aarav",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      }
    ],
    teams: [
      {
        id: "team-1",
        name: "Falcons",
        captain: "Priya Captain",
        logoAssetId: "asset-team-falcons",
        budget: 170,
        remainingBudget: 170,
        squadCount: 0,
        roleCounts: {
          Ace: 0,
          Batting: 0,
          Bowling: 0,
          AllRounder: 0,
          Girls: 0
        }
      }
    ],
    currentPlayerId: null,
    currentBid: null,
    selectedTeamId: null,
    undoHistory: [],
    createdAt: "2026-07-07T08:30:00.000Z",
    updatedAt: "2026-07-07T08:30:00.000Z",
    persistenceFailure: null
  };
}
