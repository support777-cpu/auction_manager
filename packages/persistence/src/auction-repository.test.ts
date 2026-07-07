import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createAuctionRepository, PersistenceSnapshotWriteError, PersistenceStateLoadError } from "./index.js";
import type { AuctionState } from "@auction-manager/shared";
import {
  increaseBid,
  markSold,
  markUnsold,
  revealNextPlayer,
  selectTeam,
  undoLastAction
} from "@auction-manager/domain";

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
    expect(repository.getLatestActionSummary()).toMatchObject({
      command: "StartAuction",
      clientCommandId: "cmd-1",
      summary: "Auction started from validated setup."
    });
    expect(repository.getLatestActionSummary()).not.toHaveProperty("payloadJson");
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

  it("commits Reveal Next Player state, undoable action log, and latest snapshot", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const state = createMultiPlayerState();
    await repository.commitStartAuction({
      state,
      clientCommandId: "cmd-start-1"
    });
    const reveal = revealNextPlayer({
      state,
      now: () => "2026-07-07T09:00:00.000Z"
    });
    expect(reveal.ok).toBe(true);
    if (!reveal.ok) {
      repository.close();
      return;
    }

    await repository.commitRevealNextPlayer({
      previousState: state,
      state: reveal.state,
      clientCommandId: "cmd-reveal-1",
      revealedPlayerId: reveal.revealedPlayerId,
      summary: reveal.summary
    });

    expect(repository.loadCurrentState()).toEqual(reveal.state);
    expect(JSON.parse(await readFile(join(directory, "snapshots/latest.json"), "utf8")))
      .toEqual(reveal.state);
    expect(repository.listActionLog()).toMatchObject([
      {
        command: "StartAuction",
        clientCommandId: "cmd-start-1",
        undoable: false
      },
      {
        command: "RevealNextPlayer",
        clientCommandId: "cmd-reveal-1",
        summary: "Revealed Aarav Menon at base price 10.",
        undoable: true
      }
    ]);
    expect(JSON.parse(repository.listActionLog()[1]?.payloadJson ?? "{}")).toEqual({
      command: "RevealNextPlayer",
      playerId: "player-1",
      previous: {
        currentPlayerId: null,
        currentBid: null,
        selectedTeamId: null,
        playerStatus: "Pending"
      },
      next: {
        currentPlayerId: "player-1",
        currentBid: 10,
        selectedTeamId: null
      },
      undo: {
        command: "RevealNextPlayer",
        playerId: "player-1",
        previousCurrentPlayerId: null,
        previousCurrentBid: null,
        previousSelectedTeamId: null,
        previousPlayerStatus: "Pending",
        timestamp: "2026-07-07T09:00:00.000Z"
      }
    });

    repository.close();
  });

  it("reopens and resumes revealed current player state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const snapshotPath = join(directory, "snapshots/latest.json");
    const firstRepository = createAuctionRepository({ databasePath, snapshotPath });
    const state = createMultiPlayerState();
    await firstRepository.commitStartAuction({
      state,
      clientCommandId: "cmd-start-1"
    });
    const reveal = revealNextPlayer({
      state,
      now: () => "2026-07-07T09:00:00.000Z"
    });
    expect(reveal.ok).toBe(true);
    if (!reveal.ok) {
      firstRepository.close();
      return;
    }
    await firstRepository.commitRevealNextPlayer({
      previousState: state,
      state: reveal.state,
      clientCommandId: "cmd-reveal-1",
      revealedPlayerId: reveal.revealedPlayerId,
      summary: reveal.summary
    });
    firstRepository.close();

    const reopenedRepository = createAuctionRepository({ databasePath, snapshotPath });
    expect(reopenedRepository.loadCurrentState()).toEqual(reveal.state);
    reopenedRepository.close();
  });

  it("rejects duplicate reveal clientCommandId without a second reveal action", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const state = createMultiPlayerState();
    await repository.commitStartAuction({
      state,
      clientCommandId: "cmd-start-1"
    });
    const reveal = revealNextPlayer({
      state,
      now: () => "2026-07-07T09:00:00.000Z"
    });
    expect(reveal.ok).toBe(true);
    if (!reveal.ok) {
      repository.close();
      return;
    }

    await repository.commitRevealNextPlayer({
      previousState: state,
      state: reveal.state,
      clientCommandId: "cmd-reveal-1",
      revealedPlayerId: reveal.revealedPlayerId,
      summary: reveal.summary
    });
    await expect(
      repository.commitRevealNextPlayer({
        previousState: state,
        state: reveal.state,
        clientCommandId: "cmd-reveal-1",
        revealedPlayerId: reveal.revealedPlayerId,
        summary: reveal.summary
      })
    ).rejects.toThrow("Duplicate clientCommandId");

    expect(repository.listActionLog().filter((entry) => entry.command === "RevealNextPlayer"))
      .toHaveLength(1);
    repository.close();
  });

  it("marks snapshot failure after reveal and blocks later live mutations", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const validSnapshotPath = join(directory, "snapshots/latest.json");
    const firstRepository = createAuctionRepository({
      databasePath,
      snapshotPath: validSnapshotPath
    });
    const state = createMultiPlayerState();
    await firstRepository.commitStartAuction({
      state,
      clientCommandId: "cmd-start-1"
    });
    firstRepository.close();

    const repository = createAuctionRepository({
      databasePath,
      snapshotPath: directory
    });
    const reveal = revealNextPlayer({
      state,
      now: () => "2026-07-07T09:00:00.000Z"
    });
    expect(reveal.ok).toBe(true);
    if (!reveal.ok) {
      repository.close();
      return;
    }

    await expect(
      repository.commitRevealNextPlayer({
        previousState: state,
        state: reveal.state,
        clientCommandId: "cmd-reveal-1",
        revealedPlayerId: reveal.revealedPlayerId,
        summary: reveal.summary
      })
    ).rejects.toBeInstanceOf(PersistenceSnapshotWriteError);

    expect(repository.loadCurrentState()?.persistenceFailure).toContain("snapshot");
    await expect(
      repository.commitRevealNextPlayer({
        previousState: state,
        state: reveal.state,
        clientCommandId: "cmd-reveal-2",
        revealedPlayerId: reveal.revealedPlayerId,
        summary: reveal.summary
      })
    ).rejects.toThrow("persistence failure");
    repository.close();
  });

  it("commits Select Team state, undoable action log, and latest snapshot", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const startedState = createMultiPlayerState();
    await repository.commitStartAuction({
      state: startedState,
      clientCommandId: "cmd-start-1"
    });
    const revealedState = createRevealedState(startedState);
    await repository.commitRevealNextPlayer({
      previousState: startedState,
      state: revealedState,
      clientCommandId: "cmd-reveal-1",
      revealedPlayerId: "player-1",
      summary: "Revealed Aarav Menon at base price 10."
    });
    const selection = selectTeam({
      state: revealedState,
      teamId: "team-1",
      now: () => "2026-07-07T09:10:00.000Z"
    });
    expect(selection.ok).toBe(true);
    if (!selection.ok) {
      repository.close();
      return;
    }

    await repository.commitSelectTeam({
      previousState: revealedState,
      state: selection.state,
      clientCommandId: "cmd-select-1",
      summary: selection.summary,
      undoRecorded: selection.undoRecorded
    });

    expect(repository.loadCurrentState()).toEqual(selection.state);
    expect(JSON.parse(await readFile(join(directory, "snapshots/latest.json"), "utf8")))
      .toEqual(selection.state);
    expect(repository.listActionLog()).toMatchObject([
      { command: "StartAuction", clientCommandId: "cmd-start-1" },
      { command: "RevealNextPlayer", clientCommandId: "cmd-reveal-1" },
      {
        command: "SelectTeam",
        clientCommandId: "cmd-select-1",
        summary: "Selected Falcons for Aarav Menon.",
        undoable: true
      }
    ]);
    expect(JSON.parse(repository.listActionLog()[2]?.payloadJson ?? "{}")).toEqual({
      command: "SelectTeam",
      currentPlayerId: "player-1",
      currentBid: 10,
      previous: {
        selectedTeamId: null
      },
      next: {
        selectedTeamId: "team-1"
      },
      undo: {
        command: "SelectTeam",
        previousSelectedTeamId: null,
        nextSelectedTeamId: "team-1",
        currentPlayerId: "player-1",
        currentBid: 10,
        timestamp: "2026-07-07T09:10:00.000Z"
      }
    });

    repository.close();
  });

  it("commits cleared selection and resumes it after reopen", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const snapshotPath = join(directory, "snapshots/latest.json");
    const firstRepository = createAuctionRepository({ databasePath, snapshotPath });
    const revealedState = createRevealedState(createMultiPlayerState());
    const selectedState = {
      ...revealedState,
      selectedTeamId: "team-1",
      undoHistory: [
        ...revealedState.undoHistory,
        {
          command: "SelectTeam" as const,
          previousSelectedTeamId: null,
          nextSelectedTeamId: "team-1",
          currentPlayerId: "player-1",
          currentBid: 10,
          timestamp: "2026-07-07T09:10:00.000Z"
        }
      ],
      updatedAt: "2026-07-07T09:10:00.000Z"
    };
    await firstRepository.commitStartAuction({
      state: createMultiPlayerState(),
      clientCommandId: "cmd-start-1"
    });
    await firstRepository.commitSelectTeam({
      previousState: revealedState,
      state: selectedState,
      clientCommandId: "cmd-select-1",
      summary: "Selected Falcons for Aarav Menon.",
      undoRecorded: true
    });
    const cleared = selectTeam({
      state: selectedState,
      teamId: null,
      now: () => "2026-07-07T09:12:00.000Z"
    });
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) {
      firstRepository.close();
      return;
    }
    await firstRepository.commitSelectTeam({
      previousState: selectedState,
      state: cleared.state,
      clientCommandId: "cmd-clear-1",
      summary: cleared.summary,
      undoRecorded: cleared.undoRecorded
    });
    firstRepository.close();

    const reopenedRepository = createAuctionRepository({ databasePath, snapshotPath });
    expect(reopenedRepository.loadCurrentState()?.selectedTeamId).toBeNull();
    expect(reopenedRepository.loadCurrentState()?.undoHistory.at(-1)).toMatchObject({
      command: "SelectTeam",
      previousSelectedTeamId: "team-1",
      nextSelectedTeamId: null
    });
    reopenedRepository.close();
  });

  it("rejects duplicate Select Team command id without a second selection action", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const state = createRevealedState(createMultiPlayerState());
    const selection = selectTeam({
      state,
      teamId: "team-1",
      now: () => "2026-07-07T09:10:00.000Z"
    });
    expect(selection.ok).toBe(true);
    if (!selection.ok) {
      repository.close();
      return;
    }
    await repository.commitStartAuction({
      state: createMultiPlayerState(),
      clientCommandId: "cmd-start-1"
    });
    await repository.commitSelectTeam({
      previousState: state,
      state: selection.state,
      clientCommandId: "cmd-select-1",
      summary: selection.summary,
      undoRecorded: selection.undoRecorded
    });
    await expect(
      repository.commitSelectTeam({
        previousState: state,
        state: selection.state,
        clientCommandId: "cmd-select-1",
        summary: selection.summary,
        undoRecorded: selection.undoRecorded
      })
    ).rejects.toThrow("Duplicate clientCommandId");

    expect(repository.listActionLog().filter((entry) => entry.command === "SelectTeam"))
      .toHaveLength(1);
    repository.close();
  });

  it("marks snapshot failure after Select Team and blocks later live mutations", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const validSnapshotPath = join(directory, "snapshots/latest.json");
    const firstRepository = createAuctionRepository({
      databasePath,
      snapshotPath: validSnapshotPath
    });
    const state = createRevealedState(createMultiPlayerState());
    await firstRepository.commitStartAuction({
      state: createMultiPlayerState(),
      clientCommandId: "cmd-start-1"
    });
    firstRepository.close();

    const repository = createAuctionRepository({
      databasePath,
      snapshotPath: directory
    });
    const selection = selectTeam({
      state,
      teamId: "team-1",
      now: () => "2026-07-07T09:10:00.000Z"
    });
    expect(selection.ok).toBe(true);
    if (!selection.ok) {
      repository.close();
      return;
    }

    await expect(
      repository.commitSelectTeam({
        previousState: state,
        state: selection.state,
        clientCommandId: "cmd-select-1",
        summary: selection.summary,
        undoRecorded: selection.undoRecorded
      })
    ).rejects.toBeInstanceOf(PersistenceSnapshotWriteError);

    expect(repository.loadCurrentState()?.persistenceFailure).toContain("snapshot");
    await expect(
      repository.commitSelectTeam({
        previousState: state,
        state: selection.state,
        clientCommandId: "cmd-select-2",
        summary: selection.summary,
        undoRecorded: selection.undoRecorded
      })
    ).rejects.toThrow("persistence failure");
    repository.close();
  });

  it("commits Increase Bid state, undoable action log, and latest snapshot", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const startedState = createMultiPlayerState();
    await repository.commitStartAuction({
      state: startedState,
      clientCommandId: "cmd-start-1"
    });
    const revealedState = createRevealedState(startedState);
    await repository.commitRevealNextPlayer({
      previousState: startedState,
      state: revealedState,
      clientCommandId: "cmd-reveal-1",
      revealedPlayerId: "player-1",
      summary: "Revealed Aarav Menon at base price 10."
    });
    const bid = increaseBid({
      state: revealedState,
      now: () => "2026-07-07T09:15:00.000Z"
    });
    expect(bid.ok).toBe(true);
    if (!bid.ok) {
      repository.close();
      return;
    }

    await repository.commitIncreaseBid({
      previousState: revealedState,
      state: bid.state,
      clientCommandId: "cmd-increase-1",
      summary: bid.summary,
      currentPlayerId: "player-1",
      previousCurrentBid: bid.previousCurrentBid,
      nextCurrentBid: bid.nextCurrentBid,
      bidIncrement: bid.bidIncrement
    });

    expect(repository.loadCurrentState()).toEqual(bid.state);
    expect(JSON.parse(await readFile(join(directory, "snapshots/latest.json"), "utf8")))
      .toEqual(bid.state);
    expect(repository.listActionLog()).toMatchObject([
      { command: "StartAuction", clientCommandId: "cmd-start-1" },
      { command: "RevealNextPlayer", clientCommandId: "cmd-reveal-1" },
      {
        command: "IncreaseBid",
        clientCommandId: "cmd-increase-1",
        summary: "Increased bid for Aarav Menon to 12.",
        undoable: true
      }
    ]);
    expect(JSON.parse(repository.listActionLog()[2]?.payloadJson ?? "{}")).toEqual({
      command: "IncreaseBid",
      currentPlayerId: "player-1",
      previousCurrentBid: 10,
      nextCurrentBid: 12,
      bidIncrement: 2,
      previous: {
        currentBid: 10
      },
      next: {
        currentBid: 12
      },
      undo: {
        command: "IncreaseBid",
        currentPlayerId: "player-1",
        previousCurrentBid: 10,
        nextCurrentBid: 12,
        bidIncrement: 2,
        timestamp: "2026-07-07T09:15:00.000Z"
      }
    });

    repository.close();
  });

  it("commits repeated Increase Bid steps and resumes bid after reopen", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const snapshotPath = join(directory, "snapshots/latest.json");
    const firstRepository = createAuctionRepository({ databasePath, snapshotPath });
    const startedState = createMultiPlayerState();
    const revealedState = createRevealedState(startedState);
    await firstRepository.commitStartAuction({
      state: startedState,
      clientCommandId: "cmd-start-1"
    });

    const firstBid = increaseBid({
      state: revealedState,
      now: () => "2026-07-07T09:15:00.000Z"
    });
    expect(firstBid.ok).toBe(true);
    if (!firstBid.ok) {
      firstRepository.close();
      return;
    }
    await firstRepository.commitIncreaseBid({
      previousState: revealedState,
      state: firstBid.state,
      clientCommandId: "cmd-increase-1",
      summary: firstBid.summary,
      currentPlayerId: "player-1",
      previousCurrentBid: firstBid.previousCurrentBid,
      nextCurrentBid: firstBid.nextCurrentBid,
      bidIncrement: firstBid.bidIncrement
    });

    const secondBid = increaseBid({
      state: firstBid.state,
      now: () => "2026-07-07T09:16:00.000Z"
    });
    expect(secondBid.ok).toBe(true);
    if (!secondBid.ok) {
      firstRepository.close();
      return;
    }
    await firstRepository.commitIncreaseBid({
      previousState: firstBid.state,
      state: secondBid.state,
      clientCommandId: "cmd-increase-2",
      summary: secondBid.summary,
      currentPlayerId: "player-1",
      previousCurrentBid: secondBid.previousCurrentBid,
      nextCurrentBid: secondBid.nextCurrentBid,
      bidIncrement: secondBid.bidIncrement
    });
    firstRepository.close();

    const reopenedRepository = createAuctionRepository({ databasePath, snapshotPath });
    expect(reopenedRepository.loadCurrentState()?.currentBid).toBe(14);
    expect(
      reopenedRepository
        .listActionLog()
        .filter((entry) => entry.command === "IncreaseBid")
    ).toHaveLength(2);
    reopenedRepository.close();
  });

  it("rejects duplicate Increase Bid command id without a second bid action", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const startedState = createMultiPlayerState();
    await repository.commitStartAuction({
      state: startedState,
      clientCommandId: "cmd-start-1"
    });
    const revealedState = createRevealedState(startedState);
    await repository.commitRevealNextPlayer({
      previousState: startedState,
      state: revealedState,
      clientCommandId: "cmd-reveal-1",
      revealedPlayerId: "player-1",
      summary: "Revealed Aarav Menon at base price 10."
    });
    const bid = increaseBid({
      state: revealedState,
      now: () => "2026-07-07T09:15:00.000Z"
    });
    expect(bid.ok).toBe(true);
    if (!bid.ok) {
      repository.close();
      return;
    }
    await repository.commitIncreaseBid({
      previousState: revealedState,
      state: bid.state,
      clientCommandId: "cmd-increase-1",
      summary: bid.summary,
      currentPlayerId: "player-1",
      previousCurrentBid: bid.previousCurrentBid,
      nextCurrentBid: bid.nextCurrentBid,
      bidIncrement: bid.bidIncrement
    });
    await expect(
      repository.commitIncreaseBid({
        previousState: revealedState,
        state: bid.state,
        clientCommandId: "cmd-increase-1",
        summary: bid.summary,
        currentPlayerId: "player-1",
        previousCurrentBid: bid.previousCurrentBid,
        nextCurrentBid: bid.nextCurrentBid,
        bidIncrement: bid.bidIncrement
      })
    ).rejects.toThrow("Duplicate clientCommandId");

    expect(repository.listActionLog().filter((entry) => entry.command === "IncreaseBid"))
      .toHaveLength(1);
    repository.close();
  });

  it("marks snapshot failure after Increase Bid and blocks later live mutations", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const validSnapshotPath = join(directory, "snapshots/latest.json");
    const firstRepository = createAuctionRepository({
      databasePath,
      snapshotPath: validSnapshotPath
    });
    const state = createRevealedState(createMultiPlayerState());
    await firstRepository.commitStartAuction({
      state: createMultiPlayerState(),
      clientCommandId: "cmd-start-1"
    });
    firstRepository.close();

    const repository = createAuctionRepository({
      databasePath,
      snapshotPath: directory
    });
    const bid = increaseBid({
      state,
      now: () => "2026-07-07T09:15:00.000Z"
    });
    expect(bid.ok).toBe(true);
    if (!bid.ok) {
      repository.close();
      return;
    }

    await expect(
      repository.commitIncreaseBid({
        previousState: state,
        state: bid.state,
        clientCommandId: "cmd-increase-1",
        summary: bid.summary,
        currentPlayerId: "player-1",
        previousCurrentBid: bid.previousCurrentBid,
        nextCurrentBid: bid.nextCurrentBid,
        bidIncrement: bid.bidIncrement
      })
    ).rejects.toBeInstanceOf(PersistenceSnapshotWriteError);

    expect(repository.loadCurrentState()?.persistenceFailure).toContain("snapshot");
    await expect(
      repository.commitIncreaseBid({
        previousState: state,
        state: bid.state,
        clientCommandId: "cmd-increase-2",
        summary: bid.summary,
        currentPlayerId: "player-1",
        previousCurrentBid: bid.previousCurrentBid,
        nextCurrentBid: bid.nextCurrentBid,
        bidIncrement: bid.bidIncrement
      })
    ).rejects.toThrow("persistence failure");
    repository.close();
  });

  it("commits Mark Sold state, action log payload, and latest snapshot", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const previousState = createSelectedState(createMultiPlayerState());
    await repository.commitStartAuction({
      state: previousState,
      clientCommandId: "cmd-start-1"
    });
    const sale = markSold({
      state: previousState,
      now: () => "2026-07-07T09:20:00.000Z"
    });
    expect(sale.ok).toBe(true);
    if (!sale.ok) {
      repository.close();
      return;
    }

    await repository.commitMarkSold({
      previousState,
      state: sale.state,
      clientCommandId: "cmd-mark-sold-1",
      summary: sale.message,
      playerId: "player-1",
      winningTeamId: "team-1",
      soldPrice: 10
    });

    expect(repository.loadCurrentState()).toEqual(sale.state);
    expect(JSON.parse(await readFile(join(directory, "snapshots/latest.json"), "utf8")))
      .toEqual(sale.state);
    expect(repository.listActionLog()).toMatchObject([
      { command: "StartAuction", clientCommandId: "cmd-start-1" },
      {
        command: "MarkSold",
        clientCommandId: "cmd-mark-sold-1",
        summary: "Sold Aarav Menon to Falcons for 10.",
        undoable: true
      }
    ]);
    expect(JSON.parse(repository.listActionLog()[1]?.payloadJson ?? "{}"))
      .toMatchObject({
        command: "MarkSold",
        playerId: "player-1",
        winningTeamId: "team-1",
        soldPrice: 10,
        previous: {
          player: {
            status: "Current",
            soldPrice: null,
            winningTeamId: null,
            acquisitionType: null
          },
          currentPlayerId: "player-1",
          currentBid: 10,
          selectedTeamId: "team-1",
          team: {
            remainingBudget: 170,
            squadCount: 0,
            role: "Ace",
            roleCount: 0
          }
        },
        next: {
          player: {
            status: "Sold",
            soldPrice: 10,
            winningTeamId: "team-1",
            acquisitionType: "Auction"
          },
          currentPlayerId: null,
          currentBid: null,
          selectedTeamId: null,
          team: {
            remainingBudget: 160,
            squadCount: 1,
            role: "Ace",
            roleCount: 1
          }
        },
        undo: {
          command: "MarkSold",
          playerId: "player-1",
          winningTeamId: "team-1",
          soldPrice: 10
        }
      });
    repository.close();
  });

  it("reopens and resumes sold player state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const snapshotPath = join(directory, "snapshots/latest.json");
    const firstRepository = createAuctionRepository({ databasePath, snapshotPath });
    const previousState = createSelectedState(createMultiPlayerState());
    await firstRepository.commitStartAuction({
      state: previousState,
      clientCommandId: "cmd-start-1"
    });
    const sale = markSold({
      state: previousState,
      now: () => "2026-07-07T09:20:00.000Z"
    });
    expect(sale.ok).toBe(true);
    if (!sale.ok) {
      firstRepository.close();
      return;
    }
    await firstRepository.commitMarkSold({
      previousState,
      state: sale.state,
      clientCommandId: "cmd-mark-sold-1",
      summary: sale.message,
      playerId: "player-1",
      winningTeamId: "team-1",
      soldPrice: 10
    });
    firstRepository.close();

    const reopenedRepository = createAuctionRepository({ databasePath, snapshotPath });
    expect(reopenedRepository.loadCurrentState()).toEqual(sale.state);
    reopenedRepository.close();
  });

  it("rejects duplicate Mark Sold command id without a second sale action", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const previousState = createSelectedState(createMultiPlayerState());
    await repository.commitStartAuction({
      state: previousState,
      clientCommandId: "cmd-start-1"
    });
    const sale = markSold({
      state: previousState,
      now: () => "2026-07-07T09:20:00.000Z"
    });
    expect(sale.ok).toBe(true);
    if (!sale.ok) {
      repository.close();
      return;
    }
    const input = {
      previousState,
      state: sale.state,
      clientCommandId: "cmd-mark-sold-1",
      summary: sale.message,
      playerId: "player-1",
      winningTeamId: "team-1",
      soldPrice: 10
    };
    await repository.commitMarkSold(input);
    await expect(repository.commitMarkSold(input)).rejects.toThrow(
      "Duplicate clientCommandId"
    );

    expect(repository.listActionLog().filter((entry) => entry.command === "MarkSold"))
      .toHaveLength(1);
    repository.close();
  });

  it("marks snapshot failure after Mark Sold and blocks later live mutations", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const validSnapshotPath = join(directory, "snapshots/latest.json");
    const firstRepository = createAuctionRepository({
      databasePath,
      snapshotPath: validSnapshotPath
    });
    const previousState = createSelectedState(createMultiPlayerState());
    await firstRepository.commitStartAuction({
      state: previousState,
      clientCommandId: "cmd-start-1"
    });
    firstRepository.close();

    const repository = createAuctionRepository({
      databasePath,
      snapshotPath: directory
    });
    const sale = markSold({
      state: previousState,
      now: () => "2026-07-07T09:20:00.000Z"
    });
    expect(sale.ok).toBe(true);
    if (!sale.ok) {
      repository.close();
      return;
    }

    await expect(
      repository.commitMarkSold({
        previousState,
        state: sale.state,
        clientCommandId: "cmd-mark-sold-1",
        summary: sale.message,
        playerId: "player-1",
        winningTeamId: "team-1",
        soldPrice: 10
      })
    ).rejects.toBeInstanceOf(PersistenceSnapshotWriteError);

    expect(repository.loadCurrentState()?.persistenceFailure).toContain("snapshot");
    await expect(
      repository.commitMarkSold({
        previousState,
        state: sale.state,
        clientCommandId: "cmd-mark-sold-2",
        summary: sale.message,
        playerId: "player-1",
        winningTeamId: "team-1",
        soldPrice: 10
      })
    ).rejects.toThrow("persistence failure");
    repository.close();
  });

  it("commits Mark Unsold state, pool entry, action log payload, and latest snapshot with teams unchanged", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const previousState = createSelectedState(createMultiPlayerState());
    await repository.commitStartAuction({
      state: previousState,
      clientCommandId: "cmd-start-1"
    });
    const unsold = markUnsold({
      state: previousState,
      now: () => "2026-07-07T09:25:00.000Z"
    });
    expect(unsold.ok).toBe(true);
    if (!unsold.ok) {
      repository.close();
      return;
    }

    await repository.commitMarkUnsold({
      previousState,
      state: unsold.state,
      clientCommandId: "cmd-mark-unsold-1",
      summary: unsold.message,
      playerId: "player-1"
    });

    const committedState = repository.loadCurrentState();
    expect(committedState).toEqual(unsold.state);
    expect(
      committedState?.players.find((player) => player.id === "player-1")
    ).toMatchObject({
      status: "Unsold",
      soldPrice: null,
      winningTeamId: null,
      acquisitionType: null
    });
    expect(committedState?.phase2Pool).toEqual(["player-1"]);
    expect(committedState?.teams).toEqual(previousState.teams);
    expect(committedState?.phase).toBe("InitialAuction");
    expect(JSON.parse(await readFile(join(directory, "snapshots/latest.json"), "utf8")))
      .toEqual(unsold.state);
    expect(repository.listActionLog()).toMatchObject([
      { command: "StartAuction", clientCommandId: "cmd-start-1" },
      {
        command: "MarkUnsold",
        clientCommandId: "cmd-mark-unsold-1",
        summary: "Marked unsold. Aarav Menon moves to Phase 2 rebid.",
        undoable: true
      }
    ]);
    expect(JSON.parse(repository.listActionLog()[1]?.payloadJson ?? "{}")).toEqual({
      command: "MarkUnsold",
      playerId: "player-1",
      previous: {
        playerStatus: "Current",
        currentPlayerId: "player-1",
        currentBid: 10,
        selectedTeamId: "team-1",
        phase2Pool: []
      },
      next: {
        playerStatus: "Unsold",
        currentPlayerId: null,
        currentBid: null,
        selectedTeamId: null,
        phase2Pool: ["player-1"]
      },
      undo: {
        command: "MarkUnsold",
        playerId: "player-1",
        previousPlayerStatus: "Current",
        previousCurrentPlayerId: "player-1",
        previousCurrentBid: 10,
        previousSelectedTeamId: "team-1",
        timestamp: "2026-07-07T09:25:00.000Z"
      }
    });
    repository.close();
  });

  it("reopens and resumes unsold player and pool state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const snapshotPath = join(directory, "snapshots/latest.json");
    const firstRepository = createAuctionRepository({ databasePath, snapshotPath });
    const previousState = createSelectedState(createMultiPlayerState());
    await firstRepository.commitStartAuction({
      state: previousState,
      clientCommandId: "cmd-start-1"
    });
    const unsold = markUnsold({
      state: previousState,
      now: () => "2026-07-07T09:25:00.000Z"
    });
    expect(unsold.ok).toBe(true);
    if (!unsold.ok) {
      firstRepository.close();
      return;
    }
    await firstRepository.commitMarkUnsold({
      previousState,
      state: unsold.state,
      clientCommandId: "cmd-mark-unsold-1",
      summary: unsold.message,
      playerId: "player-1"
    });
    firstRepository.close();

    const reopenedRepository = createAuctionRepository({ databasePath, snapshotPath });
    const resumedState = reopenedRepository.loadCurrentState();
    expect(resumedState).toEqual(unsold.state);
    expect(resumedState?.phase2Pool).toEqual(["player-1"]);
    expect(resumedState?.teams).toEqual(previousState.teams);
    reopenedRepository.close();
  });

  it("rejects duplicate Mark Unsold command id without a second pool append", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const previousState = createSelectedState(createMultiPlayerState());
    await repository.commitStartAuction({
      state: previousState,
      clientCommandId: "cmd-start-1"
    });
    const unsold = markUnsold({
      state: previousState,
      now: () => "2026-07-07T09:25:00.000Z"
    });
    expect(unsold.ok).toBe(true);
    if (!unsold.ok) {
      repository.close();
      return;
    }
    const input = {
      previousState,
      state: unsold.state,
      clientCommandId: "cmd-mark-unsold-1",
      summary: unsold.message,
      playerId: "player-1"
    };
    await repository.commitMarkUnsold(input);
    await expect(repository.commitMarkUnsold(input)).rejects.toThrow(
      "Duplicate clientCommandId"
    );

    expect(
      repository.listActionLog().filter((entry) => entry.command === "MarkUnsold")
    ).toHaveLength(1);
    expect(repository.loadCurrentState()?.phase2Pool).toEqual(["player-1"]);
    repository.close();
  });

  it("rejects Mark Unsold commit metadata that does not match committed state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const previousState = createSelectedState(createMultiPlayerState());
    await repository.commitStartAuction({
      state: previousState,
      clientCommandId: "cmd-start-1"
    });
    const unsold = markUnsold({
      state: previousState,
      now: () => "2026-07-07T09:25:00.000Z"
    });
    expect(unsold.ok).toBe(true);
    if (!unsold.ok) {
      repository.close();
      return;
    }

    await expect(
      repository.commitMarkUnsold({
        previousState,
        state: unsold.state,
        clientCommandId: "cmd-mark-unsold-1",
        summary: unsold.message,
        playerId: "player-2"
      })
    ).rejects.toThrow("does not match the previous current player");

    expect(
      repository.listActionLog().filter((entry) => entry.command === "MarkUnsold")
    ).toHaveLength(0);
    expect(repository.loadCurrentState()?.phase2Pool).toEqual([]);
    repository.close();
  });

  it("marks snapshot failure after Mark Unsold and blocks later live mutations", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const validSnapshotPath = join(directory, "snapshots/latest.json");
    const firstRepository = createAuctionRepository({
      databasePath,
      snapshotPath: validSnapshotPath
    });
    const previousState = createSelectedState(createMultiPlayerState());
    await firstRepository.commitStartAuction({
      state: previousState,
      clientCommandId: "cmd-start-1"
    });
    firstRepository.close();

    const repository = createAuctionRepository({
      databasePath,
      snapshotPath: directory
    });
    const unsold = markUnsold({
      state: previousState,
      now: () => "2026-07-07T09:25:00.000Z"
    });
    expect(unsold.ok).toBe(true);
    if (!unsold.ok) {
      repository.close();
      return;
    }

    await expect(
      repository.commitMarkUnsold({
        previousState,
        state: unsold.state,
        clientCommandId: "cmd-mark-unsold-1",
        summary: unsold.message,
        playerId: "player-1"
      })
    ).rejects.toBeInstanceOf(PersistenceSnapshotWriteError);

    expect(repository.loadCurrentState()?.persistenceFailure).toContain("snapshot");
    await expect(
      repository.commitMarkUnsold({
        previousState,
        state: unsold.state,
        clientCommandId: "cmd-mark-unsold-2",
        summary: unsold.message,
        playerId: "player-1"
      })
    ).rejects.toThrow("persistence failure");
    repository.close();
  });

  it("commits Undo after sale with restored state, non-undoable log row, snapshot, and reopen", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const snapshotPath = join(directory, "snapshots/latest.json");
    const repository = createAuctionRepository({ databasePath, snapshotPath });
    const previousState = createSelectedState(createMultiPlayerState());
    await repository.commitStartAuction({
      state: previousState,
      clientCommandId: "cmd-start-1"
    });
    const sale = markSold({
      state: previousState,
      now: () => "2026-07-07T09:20:00.000Z"
    });
    expect(sale.ok).toBe(true);
    if (!sale.ok) {
      repository.close();
      return;
    }
    await repository.commitMarkSold({
      previousState,
      state: sale.state,
      clientCommandId: "cmd-mark-sold-1",
      summary: sale.message,
      playerId: "player-1",
      winningTeamId: "team-1",
      soldPrice: 10
    });
    const undo = undoLastAction({
      state: sale.state,
      now: () => "2026-07-07T09:21:00.000Z"
    });
    expect(undo.ok).toBe(true);
    if (!undo.ok) {
      repository.close();
      return;
    }

    await repository.commitUndo({
      previousState: sale.state,
      state: undo.state,
      clientCommandId: "cmd-undo-1",
      summary: undo.message,
      undoneAction: undo.undoneAction
    });

    expect(repository.loadCurrentState()).toEqual(undo.state);
    expect(repository.loadCurrentState()?.players[0]).toMatchObject({
      status: "Current",
      soldPrice: null,
      winningTeamId: null,
      acquisitionType: null
    });
    expect(repository.loadCurrentState()?.teams[0]).toMatchObject({
      remainingBudget: 170,
      squadCount: 0,
      roleCounts: { Ace: 0 }
    });
    expect(repository.loadCurrentState()?.currentPlayerId).toBe("player-1");
    expect(repository.loadCurrentState()?.currentBid).toBe(10);
    expect(repository.loadCurrentState()?.selectedTeamId).toBe("team-1");
    expect(JSON.parse(await readFile(snapshotPath, "utf8"))).toEqual(undo.state);
    expect(repository.listActionLog()).toMatchObject([
      { command: "StartAuction", clientCommandId: "cmd-start-1" },
      { command: "MarkSold", clientCommandId: "cmd-mark-sold-1", undoable: true },
      {
        command: "Undo",
        clientCommandId: "cmd-undo-1",
        summary: "Undid Mark Sold: Aarav Menon.",
        undoable: false
      }
    ]);
    expect(JSON.parse(repository.listActionLog()[2]?.payloadJson ?? "{}"))
      .toMatchObject({
        command: "Undo",
        undoneCommand: "MarkSold",
        previousLastUndoEntry: {
          command: "MarkSold",
          playerId: "player-1",
          winningTeamId: "team-1"
        },
        nextUndoSummary: {
          command: "SelectTeam",
          playerId: "player-1"
        },
        before: {
          currentPlayerId: null,
          currentBid: null,
          selectedTeamId: null,
          affectedPlayer: {
            id: "player-1",
            status: "Sold",
            soldPrice: 10,
            winningTeamId: "team-1",
            acquisitionType: "Auction"
          },
          affectedTeam: {
            id: "team-1",
            remainingBudget: 160,
            squadCount: 1
          }
        },
        after: {
          currentPlayerId: "player-1",
          currentBid: 10,
          selectedTeamId: "team-1",
          affectedPlayer: {
            id: "player-1",
            status: "Current",
            soldPrice: null,
            winningTeamId: null,
            acquisitionType: null
          },
          affectedTeam: {
            id: "team-1",
            remainingBudget: 170,
            squadCount: 0
          }
        }
      });
    await expect(
      repository.commitUndo({
        previousState: sale.state,
        state: undo.state,
        clientCommandId: "cmd-undo-1",
        summary: undo.message,
        undoneAction: undo.undoneAction
      })
    ).rejects.toThrow("Duplicate clientCommandId");
    repository.close();

    const reopenedRepository = createAuctionRepository({ databasePath, snapshotPath });
    expect(reopenedRepository.loadCurrentState()).toEqual(undo.state);
    reopenedRepository.close();
  });

  it("commits Undo after Mark Unsold by removing only the affected phase 2 pool player", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const repository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    const previousState = {
      ...createSelectedState(createMultiPlayerState()),
      phase2Pool: ["player-2"]
    };
    await repository.commitStartAuction({
      state: previousState,
      clientCommandId: "cmd-start-1"
    });
    const unsold = markUnsold({
      state: previousState,
      now: () => "2026-07-07T09:25:00.000Z"
    });
    expect(unsold.ok).toBe(true);
    if (!unsold.ok) {
      repository.close();
      return;
    }
    await repository.commitMarkUnsold({
      previousState,
      state: unsold.state,
      clientCommandId: "cmd-mark-unsold-1",
      summary: unsold.message,
      playerId: "player-1"
    });
    const undo = undoLastAction({
      state: unsold.state,
      now: () => "2026-07-07T09:26:00.000Z"
    });
    expect(undo.ok).toBe(true);
    if (!undo.ok) {
      repository.close();
      return;
    }

    await repository.commitUndo({
      previousState: unsold.state,
      state: undo.state,
      clientCommandId: "cmd-undo-unsold-1",
      summary: undo.message,
      undoneAction: undo.undoneAction
    });

    expect(repository.loadCurrentState()?.phase2Pool).toEqual(["player-2"]);
    expect(repository.loadCurrentState()?.players[0]).toMatchObject({
      status: "Current"
    });
    expect(repository.loadCurrentState()?.teams).toEqual(previousState.teams);
    expect(repository.listActionLog().at(-1)).toMatchObject({
      command: "Undo",
      undoable: false
    });
    repository.close();

    const reopenedRepository = createAuctionRepository({
      databasePath: join(directory, "auction.db"),
      snapshotPath: join(directory, "snapshots/latest.json")
    });
    expect(reopenedRepository.loadCurrentState()?.phase2Pool).toEqual(["player-2"]);
    reopenedRepository.close();
  });

  it("commits Undo after reveal with restored pending player and reopen", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const snapshotPath = join(directory, "snapshots/latest.json");
    const repository = createAuctionRepository({ databasePath, snapshotPath });
    const previousState = createMultiPlayerState();
    await repository.commitStartAuction({
      state: previousState,
      clientCommandId: "cmd-start-1"
    });
    const reveal = revealNextPlayer({
      state: previousState,
      now: () => "2026-07-07T09:00:00.000Z"
    });
    expect(reveal.ok).toBe(true);
    if (!reveal.ok) {
      repository.close();
      return;
    }
    await repository.commitRevealNextPlayer({
      previousState,
      state: reveal.state,
      clientCommandId: "cmd-reveal-1",
      revealedPlayerId: reveal.revealedPlayerId,
      summary: reveal.summary
    });
    const undo = undoLastAction({
      state: reveal.state,
      now: () => "2026-07-07T09:01:00.000Z"
    });
    expect(undo.ok).toBe(true);
    if (!undo.ok) {
      repository.close();
      return;
    }

    await repository.commitUndo({
      previousState: reveal.state,
      state: undo.state,
      clientCommandId: "cmd-undo-reveal-1",
      summary: undo.message,
      undoneAction: undo.undoneAction
    });

    expect(repository.loadCurrentState()).toEqual(undo.state);
    expect(repository.loadCurrentState()?.players[0]).toMatchObject({
      status: "Pending"
    });
    expect(repository.loadCurrentState()?.currentPlayerId).toBeNull();
    expect(JSON.parse(await readFile(snapshotPath, "utf8"))).toEqual(undo.state);
    repository.close();

    const reopenedRepository = createAuctionRepository({ databasePath, snapshotPath });
    expect(reopenedRepository.loadCurrentState()).toEqual(undo.state);
    reopenedRepository.close();
  });

  it("marks snapshot failure after Undo and blocks later live mutations", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const validSnapshotPath = join(directory, "snapshots/latest.json");
    const firstRepository = createAuctionRepository({
      databasePath,
      snapshotPath: validSnapshotPath
    });
    const previousState = createSelectedState(createMultiPlayerState());
    await firstRepository.commitStartAuction({
      state: previousState,
      clientCommandId: "cmd-start-1"
    });
    const sale = markSold({
      state: previousState,
      now: () => "2026-07-07T09:20:00.000Z"
    });
    expect(sale.ok).toBe(true);
    if (!sale.ok) {
      firstRepository.close();
      return;
    }
    await firstRepository.commitMarkSold({
      previousState,
      state: sale.state,
      clientCommandId: "cmd-mark-sold-1",
      summary: sale.message,
      playerId: "player-1",
      winningTeamId: "team-1",
      soldPrice: 10
    });
    firstRepository.close();

    const repository = createAuctionRepository({
      databasePath,
      snapshotPath: directory
    });
    const undo = undoLastAction({
      state: sale.state,
      now: () => "2026-07-07T09:21:00.000Z"
    });
    expect(undo.ok).toBe(true);
    if (!undo.ok) {
      repository.close();
      return;
    }
    await expect(
      repository.commitUndo({
        previousState: sale.state,
        state: undo.state,
        clientCommandId: "cmd-undo-1",
        summary: undo.message,
        undoneAction: undo.undoneAction
      })
    ).rejects.toBeInstanceOf(PersistenceSnapshotWriteError);

    expect(repository.loadCurrentState()?.persistenceFailure).toContain("snapshot");
    await expect(
      repository.commitUndo({
        previousState: sale.state,
        state: undo.state,
        clientCommandId: "cmd-undo-2",
        summary: undo.message,
        undoneAction: undo.undoneAction
      })
    ).rejects.toThrow("persistence failure");
    repository.close();
  });

  it("loads pre-2.7 persisted state without phase2Pool by defaulting it to empty", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const snapshotPath = join(directory, "snapshots/latest.json");
    const initializedRepository = createAuctionRepository({ databasePath, snapshotPath });
    initializedRepository.close();
    const state = createState();
    const { phase2Pool: _phase2Pool, ...legacyState } = state;
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
    const loadedState = reopenedRepository.loadCurrentState();
    expect(loadedState?.phase2Pool).toEqual([]);
    expect(loadedState?.players).toEqual(state.players);
    reopenedRepository.close();
  });

  it("reopens a full Phase 1 sold and unsold command sequence without reshuffle or state loss", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const snapshotPath = join(directory, "snapshots/latest.json");
    const repository = createAuctionRepository({ databasePath, snapshotPath });
    const started = createMultiPlayerState();

    await repository.commitStartAuction({ state: started, clientCommandId: "cmd-start" });

    const firstReveal = requireOk(
      revealNextPlayer({ state: started, now: () => "2026-07-07T09:00:00.000Z" })
    );
    await repository.commitRevealNextPlayer({
      previousState: started,
      state: firstReveal.state,
      clientCommandId: "cmd-reveal-1",
      revealedPlayerId: firstReveal.revealedPlayerId,
      summary: firstReveal.summary
    });

    const firstSelect = requireOk(
      selectTeam({
        state: firstReveal.state,
        teamId: "team-1",
        now: () => "2026-07-07T09:01:00.000Z"
      })
    );
    await repository.commitSelectTeam({
      previousState: firstReveal.state,
      state: firstSelect.state,
      clientCommandId: "cmd-select-1",
      summary: firstSelect.summary,
      undoRecorded: firstSelect.undoRecorded
    });

    const firstBid = requireOk(
      increaseBid({
        state: firstSelect.state,
        now: () => "2026-07-07T09:02:00.000Z"
      })
    );
    await repository.commitIncreaseBid({
      previousState: firstSelect.state,
      state: firstBid.state,
      clientCommandId: "cmd-increase-1",
      summary: firstBid.summary,
      currentPlayerId: firstBid.currentPlayerId,
      previousCurrentBid: firstBid.previousCurrentBid,
      nextCurrentBid: firstBid.nextCurrentBid,
      bidIncrement: firstBid.bidIncrement
    });

    const sold = requireOk(
      markSold({ state: firstBid.state, now: () => "2026-07-07T09:03:00.000Z" })
    );
    await repository.commitMarkSold({
      previousState: firstBid.state,
      state: sold.state,
      clientCommandId: "cmd-sold-1",
      summary: sold.message,
      playerId: "player-1",
      winningTeamId: "team-1",
      soldPrice: firstBid.nextCurrentBid
    });

    const secondReveal = requireOk(
      revealNextPlayer({ state: sold.state, now: () => "2026-07-07T09:04:00.000Z" })
    );
    await repository.commitRevealNextPlayer({
      previousState: sold.state,
      state: secondReveal.state,
      clientCommandId: "cmd-reveal-2",
      revealedPlayerId: secondReveal.revealedPlayerId,
      summary: secondReveal.summary
    });

    const secondSelect = requireOk(
      selectTeam({
        state: secondReveal.state,
        teamId: "team-1",
        now: () => "2026-07-07T09:05:00.000Z"
      })
    );
    await repository.commitSelectTeam({
      previousState: secondReveal.state,
      state: secondSelect.state,
      clientCommandId: "cmd-select-2",
      summary: secondSelect.summary,
      undoRecorded: secondSelect.undoRecorded
    });

    const clearedSelect = requireOk(
      selectTeam({
        state: secondSelect.state,
        teamId: null,
        now: () => "2026-07-07T09:06:00.000Z"
      })
    );
    await repository.commitSelectTeam({
      previousState: secondSelect.state,
      state: clearedSelect.state,
      clientCommandId: "cmd-clear-2",
      summary: clearedSelect.summary,
      undoRecorded: clearedSelect.undoRecorded
    });

    const changedSelect = requireOk(
      selectTeam({
        state: clearedSelect.state,
        teamId: "team-1",
        now: () => "2026-07-07T09:07:00.000Z"
      })
    );
    await repository.commitSelectTeam({
      previousState: clearedSelect.state,
      state: changedSelect.state,
      clientCommandId: "cmd-reselect-2",
      summary: changedSelect.summary,
      undoRecorded: changedSelect.undoRecorded
    });

    const secondBid = requireOk(
      increaseBid({
        state: changedSelect.state,
        now: () => "2026-07-07T09:08:00.000Z"
      })
    );
    await repository.commitIncreaseBid({
      previousState: changedSelect.state,
      state: secondBid.state,
      clientCommandId: "cmd-increase-2",
      summary: secondBid.summary,
      currentPlayerId: secondBid.currentPlayerId,
      previousCurrentBid: secondBid.previousCurrentBid,
      nextCurrentBid: secondBid.nextCurrentBid,
      bidIncrement: secondBid.bidIncrement
    });

    const unsold = requireOk(
      markUnsold({ state: secondBid.state, now: () => "2026-07-07T09:09:00.000Z" })
    );
    await repository.commitMarkUnsold({
      previousState: secondBid.state,
      state: unsold.state,
      clientCommandId: "cmd-unsold-2",
      summary: unsold.message,
      playerId: secondReveal.revealedPlayerId
    });

    repository.close();

    const reopenedRepository = createAuctionRepository({ databasePath, snapshotPath });
    const reopenedState = reopenedRepository.loadCurrentState();
    expect(reopenedState).toEqual(unsold.state);
    expect(reopenedState?.phase1Order).toEqual(started.phase1Order);
    expect(reopenedState?.players.find((player) => player.id === "player-1"))
      .toMatchObject({
        status: "Sold",
        winningTeamId: "team-1",
        soldPrice: firstBid.nextCurrentBid,
        acquisitionType: "Auction"
      });
    expect(
      reopenedState?.players.find((player) => player.id === secondReveal.revealedPlayerId)
    ).toMatchObject({
      status: "Unsold",
      winningTeamId: null,
      soldPrice: null,
      acquisitionType: null
    });
    expect(reopenedState?.phase2Pool).toEqual([secondReveal.revealedPlayerId]);
    expect(reopenedState?.currentPlayerId).toBeNull();
    expect(reopenedState?.currentBid).toBeNull();
    expect(reopenedState?.selectedTeamId).toBeNull();
    expect(reopenedState?.undoHistory.map((entry) => entry.command)).toEqual([
      "RevealNextPlayer",
      "SelectTeam",
      "IncreaseBid",
      "MarkSold",
      "RevealNextPlayer",
      "SelectTeam",
      "SelectTeam",
      "SelectTeam",
      "IncreaseBid",
      "MarkUnsold"
    ]);
    expect(reopenedRepository.listActionLog().map((entry) => entry.command)).toEqual([
      "StartAuction",
      "RevealNextPlayer",
      "SelectTeam",
      "IncreaseBid",
      "MarkSold",
      "RevealNextPlayer",
      "SelectTeam",
      "SelectTeam",
      "SelectTeam",
      "IncreaseBid",
      "MarkUnsold"
    ]);
    expect(
      reopenedRepository.listActionLog().slice(1).every((entry) => entry.undoable)
    ).toBe(true);
    expect(reopenedRepository.getLatestActionSummary()).toMatchObject({
      command: "MarkUnsold",
      clientCommandId: "cmd-unsold-2"
    });
    const actionLog = reopenedRepository.listActionLog();
    expect(JSON.parse(actionLog[0]?.payloadJson ?? "{}")).toMatchObject({
      command: "StartAuction",
      auctionId: "auction-1"
    });
    expect(JSON.parse(actionLog[1]?.payloadJson ?? "{}")).toMatchObject({
      command: "RevealNextPlayer",
      playerId: "player-1"
    });
    expect(JSON.parse(actionLog[4]?.payloadJson ?? "{}")).toMatchObject({
      command: "MarkSold",
      playerId: "player-1",
      winningTeamId: "team-1",
      soldPrice: firstBid.nextCurrentBid
    });
    expect(JSON.parse(actionLog[actionLog.length - 1]?.payloadJson ?? "{}")).toMatchObject({
      command: "MarkUnsold",
      playerId: secondReveal.revealedPlayerId
    });
    expect(JSON.parse(await readFile(snapshotPath, "utf8"))).toEqual(unsold.state);
    reopenedRepository.close();
  });

  it("fails closed when state_json is corrupted instead of returning setup mode", async () => {
    const directory = await mkdtemp(join(tmpdir(), "auction-repository-"));
    const databasePath = join(directory, "auction.db");
    const snapshotPath = join(directory, "snapshots/latest.json");
    const repository = createAuctionRepository({ databasePath, snapshotPath });

    await repository.commitStartAuction({
      state: createState(),
      clientCommandId: "cmd-1"
    });
    repository.close();

    const database = new Database(databasePath);
    database
      .prepare("UPDATE auction_state SET state_json = ? WHERE auction_id = ?")
      .run("{invalid-json", "auction-1");
    database.close();

    const reopenedRepository = createAuctionRepository({ databasePath, snapshotPath });
    expect(() => reopenedRepository.loadCurrentState()).toThrow(PersistenceStateLoadError);
    reopenedRepository.close();
  });
});

function requireOk<T extends { ok: boolean }>(
  result: T
): Extract<T, { ok: true }> {
  if (!result.ok) {
    throw new Error("Expected command result to be ok.");
  }

  return result as Extract<T, { ok: true }>;
}

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
    phase2Pool: [],
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

function createRevealedState(state: AuctionState): AuctionState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === "player-1" ? { ...player, status: "Current" } : player
    ),
    currentPlayerId: "player-1",
    currentBid: 10,
    updatedAt: "2026-07-07T09:00:00.000Z",
    undoHistory: [
      ...state.undoHistory,
      {
        command: "RevealNextPlayer",
        playerId: "player-1",
        previousCurrentPlayerId: null,
        previousCurrentBid: null,
        previousSelectedTeamId: null,
        previousPlayerStatus: "Pending",
        timestamp: "2026-07-07T09:00:00.000Z"
      }
    ]
  };
}

function createSelectedState(state: AuctionState): AuctionState {
  const revealedState = createRevealedState(state);
  return {
    ...revealedState,
    selectedTeamId: "team-1",
    updatedAt: "2026-07-07T09:10:00.000Z",
    undoHistory: [
      ...revealedState.undoHistory,
      {
        command: "SelectTeam",
        previousSelectedTeamId: null,
        nextSelectedTeamId: "team-1",
        currentPlayerId: "player-1",
        currentBid: 10,
        timestamp: "2026-07-07T09:10:00.000Z"
      }
    ]
  };
}
