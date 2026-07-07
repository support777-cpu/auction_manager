import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
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
    expect(JSON.parse(repository.listActionLog()[0]?.payloadJson ?? "{}")).toEqual({
      command: "StartAuction",
      auctionId: "auction-1",
      phase1Order: {
        playerIds: ["player-1"],
        categoryCounts: {
          "Ace Men": 1,
          "Ace Women": 0,
          "Women All Rounders": 0,
          "Men Bowlers": 0,
          "Men Batsmen": 0,
          "Men All Rounders": 0
        }
      }
    });
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

  it("loads legacy started state, persists backfilled Phase 1 order, and reloads it", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const snapshotPath = join(directory, "snapshots/latest.json");
    const initializedRepository = createAuctionRepository({ databasePath, snapshotPath });
    initializedRepository.close();
    const state = createState();
    const { phase1Order: _phase1Order, ...legacyState } = state;
    const database = new Database(databasePath);

    database
      .prepare(
        `INSERT INTO auction_state
          (auction_id, state_json, phase, created_at, updated_at, persistence_failure)
          VALUES (?, ?, ?, ?, ?, NULL)`
      )
      .run(
        legacyState.auctionId,
        JSON.stringify(legacyState),
        legacyState.phase,
        legacyState.createdAt,
        legacyState.updatedAt
      );
    database
      .prepare("INSERT INTO current_auction (singleton, auction_id) VALUES (1, ?)")
      .run(legacyState.auctionId);
    database.close();

    const reopenedRepository = createAuctionRepository({ databasePath, snapshotPath });
    const migratedState = reopenedRepository.loadCurrentState();
    expect(migratedState?.phase1Order).toEqual(state.phase1Order);

    const persistedRow = new Database(databasePath)
      .prepare("SELECT state_json AS stateJson FROM auction_state WHERE auction_id = ?")
      .get(state.auctionId) as { stateJson: string };
    expect(JSON.parse(persistedRow.stateJson).phase1Order).toEqual(state.phase1Order);

    reopenedRepository.close();

    const secondOpenRepository = createAuctionRepository({ databasePath, snapshotPath });
    expect(secondOpenRepository.loadCurrentState()?.phase1Order).toEqual(state.phase1Order);
    secondOpenRepository.close();
  });

  it("preserves a multi-player shuffled order across repository reopen", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const snapshotPath = join(directory, "snapshots/latest.json");
    const firstRepository = createAuctionRepository({ databasePath, snapshotPath });
    const state = createMultiPlayerState();

    await firstRepository.commitStartAuction({
      state,
      clientCommandId: "cmd-1"
    });
    firstRepository.close();

    const reopenedRepository = createAuctionRepository({ databasePath, snapshotPath });
    expect(reopenedRepository.loadCurrentState()?.phase1Order).toEqual(state.phase1Order);
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
    phase1Order: {
      categories: [
        {
          category: "Ace Men",
          playerIds: ["player-1"]
        },
        {
          category: "Ace Women",
          playerIds: []
        },
        {
          category: "Women All Rounders",
          playerIds: []
        },
        {
          category: "Men Bowlers",
          playerIds: []
        },
        {
          category: "Men Batsmen",
          playerIds: []
        },
        {
          category: "Men All Rounders",
          playerIds: []
        }
      ],
      playerIds: ["player-1"],
      generatedAt: "2026-07-07T08:30:00.000Z"
    },
    currentPlayerId: null,
    currentBid: null,
    selectedTeamId: null,
    undoHistory: [],
    createdAt: "2026-07-07T08:30:00.000Z",
    updatedAt: "2026-07-07T08:30:00.000Z",
    persistenceFailure: null
  };
}

function createMultiPlayerState(): AuctionState {
  return {
    ...createState(),
    players: [
      {
        id: "player-1",
        name: "Aarav Menon",
        gender: "Male",
        role: "Ace",
        phase1Category: "Ace Men",
        basePrice: 10,
        status: "Pending",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      },
      {
        id: "player-2",
        name: "Riya Shah",
        gender: "Female",
        role: "Ace",
        phase1Category: "Ace Women",
        basePrice: 10,
        status: "Pending",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      },
      {
        id: "player-3",
        name: "Neha Allrounder",
        gender: "Female",
        role: "AllRounder",
        phase1Category: "Women All Rounders",
        basePrice: 6,
        status: "Pending",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      },
      {
        id: "player-4",
        name: "Karan Allrounder",
        gender: "Female",
        role: "AllRounder",
        phase1Category: "Women All Rounders",
        basePrice: 6,
        status: "Pending",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      }
    ],
    phase1Order: {
      categories: [
        { category: "Ace Men", playerIds: ["player-1"] },
        { category: "Ace Women", playerIds: ["player-2"] },
        { category: "Women All Rounders", playerIds: ["player-4", "player-3"] },
        { category: "Men Bowlers", playerIds: [] },
        { category: "Men Batsmen", playerIds: [] },
        { category: "Men All Rounders", playerIds: [] }
      ],
      playerIds: ["player-1", "player-2", "player-4", "player-3"],
      generatedAt: "2026-07-07T08:30:00.000Z"
    }
  };
}
