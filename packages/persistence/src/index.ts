import Database from "better-sqlite3";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  auctionStateBaseSchema,
  auctionStateSchema,
  type AuctionState
} from "@auction-manager/shared";
import { createPhase1Order } from "@auction-manager/domain";

export const persistencePackageReady = true;

export interface AuctionRepositoryOptions {
  readonly databasePath: string;
  readonly snapshotPath: string;
}

export interface CommitStartAuctionInput {
  readonly state: AuctionState;
  readonly clientCommandId: string;
}

export interface CommitRevealNextPlayerInput {
  readonly previousState: AuctionState;
  readonly state: AuctionState;
  readonly clientCommandId: string;
  readonly revealedPlayerId: string;
  readonly summary: string;
}

export interface CommitSelectTeamInput {
  readonly previousState: AuctionState;
  readonly state: AuctionState;
  readonly clientCommandId: string;
  readonly summary: string;
  readonly undoRecorded: boolean;
}

export interface CommitIncreaseBidInput {
  readonly previousState: AuctionState;
  readonly state: AuctionState;
  readonly clientCommandId: string;
  readonly summary: string;
  readonly currentPlayerId: string;
  readonly previousCurrentBid: number;
  readonly nextCurrentBid: number;
  readonly bidIncrement: number;
}

export interface CommitMarkSoldInput {
  readonly previousState: AuctionState;
  readonly state: AuctionState;
  readonly clientCommandId: string;
  readonly summary: string;
  readonly playerId: string;
  readonly winningTeamId: string;
  readonly soldPrice: number;
}

export interface CommitMarkUnsoldInput {
  readonly previousState: AuctionState;
  readonly state: AuctionState;
  readonly clientCommandId: string;
  readonly summary: string;
  readonly playerId: string;
}

export interface ActionLogEntry {
  readonly actionId: number;
  readonly auctionId: string;
  readonly command:
    | "StartAuction"
    | "RevealNextPlayer"
    | "SelectTeam"
    | "IncreaseBid"
    | "MarkSold"
    | "MarkUnsold";
  readonly clientCommandId: string;
  readonly timestamp: string;
  readonly summary: string;
  readonly payloadJson: string;
  readonly undoable: boolean;
}

export interface AuctionRepository {
  readonly commitStartAuction: (input: CommitStartAuctionInput) => Promise<void>;
  readonly commitRevealNextPlayer: (
    input: CommitRevealNextPlayerInput
  ) => Promise<void>;
  readonly commitSelectTeam: (input: CommitSelectTeamInput) => Promise<void>;
  readonly commitIncreaseBid: (input: CommitIncreaseBidInput) => Promise<void>;
  readonly commitMarkSold: (input: CommitMarkSoldInput) => Promise<void>;
  readonly commitMarkUnsold: (input: CommitMarkUnsoldInput) => Promise<void>;
  readonly loadCurrentState: () => AuctionState | null;
  readonly listActionLog: () => readonly ActionLogEntry[];
  readonly close: () => void;
}

export class PersistenceSnapshotWriteError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PersistenceSnapshotWriteError";
  }
}

export class DuplicateClientCommandError extends Error {
  readonly clientCommandId: string;

  constructor(clientCommandId: string) {
    super(`Duplicate clientCommandId: ${clientCommandId}`);
    this.name = "DuplicateClientCommandError";
    this.clientCommandId = clientCommandId;
  }
}

export class AuctionAlreadyStartedError extends Error {
  constructor() {
    super("An auction has already been started.");
    this.name = "AuctionAlreadyStartedError";
  }
}

export class PersistenceStateLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersistenceStateLoadError";
  }
}

export function createAuctionRepository(
  options: AuctionRepositoryOptions
): AuctionRepository {
  const database = new Database(options.databasePath);
  applySchema(database);

  const insertTransaction = database.transaction(
    (input: CommitStartAuctionInput) => {
      assertMutationsAllowed(database);
      const duplicateCommand = database
        .prepare("SELECT 1 AS found FROM action_log WHERE client_command_id = ?")
        .get(input.clientCommandId) as { found: 1 } | undefined;
      if (duplicateCommand) {
        throw new DuplicateClientCommandError(input.clientCommandId);
      }
      if (loadCurrentState(database, options.snapshotPath)) {
        throw new AuctionAlreadyStartedError();
      }
      database.prepare("DELETE FROM current_auction").run();
      database
        .prepare(
          `INSERT OR REPLACE INTO auction_state
            (auction_id, state_json, phase, created_at, updated_at, persistence_failure)
            VALUES (@auctionId, @stateJson, @phase, @createdAt, @updatedAt, NULL)`
        )
        .run({
          auctionId: input.state.auctionId,
          stateJson: JSON.stringify(input.state),
          phase: input.state.phase,
          createdAt: input.state.createdAt,
          updatedAt: input.state.updatedAt
        });
      database
        .prepare("INSERT INTO current_auction (singleton, auction_id) VALUES (1, ?)")
        .run(input.state.auctionId);
      database
        .prepare(
          `INSERT INTO action_log
            (auction_id, command, client_command_id, timestamp, summary, payload_json, undoable)
            VALUES (?, 'StartAuction', ?, ?, ?, ?, 0)`
        )
        .run(
          input.state.auctionId,
          input.clientCommandId,
          input.state.updatedAt,
          "Auction started from validated setup.",
          JSON.stringify({
            command: "StartAuction",
            auctionId: input.state.auctionId,
            phase1Order: {
              playerIds: input.state.phase1Order.playerIds,
              categoryCounts: Object.fromEntries(
                input.state.phase1Order.categories.map((entry) => [
                  entry.category,
                  entry.playerIds.length
                ])
              )
            }
          })
        );
    }
  );

  const revealTransaction = database.transaction(
    (input: CommitRevealNextPlayerInput) => {
      assertMutationsAllowed(database);
      const duplicateCommand = database
        .prepare("SELECT 1 AS found FROM action_log WHERE client_command_id = ?")
        .get(input.clientCommandId) as { found: 1 } | undefined;
      if (duplicateCommand) {
        throw new DuplicateClientCommandError(input.clientCommandId);
      }

      const currentAuction = database
        .prepare("SELECT auction_id AS auctionId FROM current_auction WHERE singleton = 1")
        .get() as { auctionId: string } | undefined;
      if (!currentAuction || currentAuction.auctionId !== input.state.auctionId) {
        throw new Error("Cannot commit reveal without an active matching auction.");
      }

      database
        .prepare(
          `UPDATE auction_state
              SET state_json = @stateJson,
                  phase = @phase,
                  updated_at = @updatedAt,
                  persistence_failure = NULL
            WHERE auction_id = @auctionId`
        )
        .run({
          auctionId: input.state.auctionId,
          stateJson: JSON.stringify(input.state),
          phase: input.state.phase,
          updatedAt: input.state.updatedAt
        });
      database
        .prepare(
          `INSERT INTO action_log
            (auction_id, command, client_command_id, timestamp, summary, payload_json, undoable)
            VALUES (?, 'RevealNextPlayer', ?, ?, ?, ?, 1)`
        )
        .run(
          input.state.auctionId,
          input.clientCommandId,
          input.state.updatedAt,
          input.summary,
          JSON.stringify({
            command: "RevealNextPlayer",
            playerId: input.revealedPlayerId,
            previous: {
              currentPlayerId: input.previousState.currentPlayerId,
              currentBid: input.previousState.currentBid,
              selectedTeamId: input.previousState.selectedTeamId,
              playerStatus:
                input.previousState.players.find(
                  (player) => player.id === input.revealedPlayerId
                )?.status ?? null
            },
            next: {
              currentPlayerId: input.state.currentPlayerId,
              currentBid: input.state.currentBid,
              selectedTeamId: input.state.selectedTeamId
            },
            undo: input.state.undoHistory.at(-1) ?? null
          })
        );
    }
  );

  const selectTeamTransaction = database.transaction(
    (input: CommitSelectTeamInput) => {
      assertMutationsAllowed(database);
      const duplicateCommand = database
        .prepare("SELECT 1 AS found FROM action_log WHERE client_command_id = ?")
        .get(input.clientCommandId) as { found: 1 } | undefined;
      if (duplicateCommand) {
        throw new DuplicateClientCommandError(input.clientCommandId);
      }

      const currentAuction = database
        .prepare("SELECT auction_id AS auctionId FROM current_auction WHERE singleton = 1")
        .get() as { auctionId: string } | undefined;
      if (!currentAuction || currentAuction.auctionId !== input.state.auctionId) {
        throw new Error("Cannot commit Team selection without an active matching auction.");
      }

      database
        .prepare(
          `UPDATE auction_state
              SET state_json = @stateJson,
                  phase = @phase,
                  updated_at = @updatedAt,
                  persistence_failure = NULL
            WHERE auction_id = @auctionId`
        )
        .run({
          auctionId: input.state.auctionId,
          stateJson: JSON.stringify(input.state),
          phase: input.state.phase,
          updatedAt: input.state.updatedAt
        });
      database
        .prepare(
          `INSERT INTO action_log
            (auction_id, command, client_command_id, timestamp, summary, payload_json, undoable)
            VALUES (?, 'SelectTeam', ?, ?, ?, ?, ?)`
        )
        .run(
          input.state.auctionId,
          input.clientCommandId,
          input.state.updatedAt,
          input.summary,
          JSON.stringify({
            command: "SelectTeam",
            currentPlayerId: input.state.currentPlayerId,
            currentBid: input.state.currentBid,
            previous: {
              selectedTeamId: input.previousState.selectedTeamId
            },
            next: {
              selectedTeamId: input.state.selectedTeamId
            },
            undo: input.undoRecorded ? input.state.undoHistory.at(-1) ?? null : null
          }),
          input.undoRecorded ? 1 : 0
        );
    }
  );

  const increaseBidTransaction = database.transaction(
    (input: CommitIncreaseBidInput) => {
      assertMutationsAllowed(database);
      const duplicateCommand = database
        .prepare("SELECT 1 AS found FROM action_log WHERE client_command_id = ?")
        .get(input.clientCommandId) as { found: 1 } | undefined;
      if (duplicateCommand) {
        throw new DuplicateClientCommandError(input.clientCommandId);
      }

      const currentAuction = database
        .prepare("SELECT auction_id AS auctionId FROM current_auction WHERE singleton = 1")
        .get() as { auctionId: string } | undefined;
      if (!currentAuction || currentAuction.auctionId !== input.state.auctionId) {
        throw new Error("Cannot commit bid increase without an active matching auction.");
      }

      database
        .prepare(
          `UPDATE auction_state
              SET state_json = @stateJson,
                  phase = @phase,
                  updated_at = @updatedAt,
                  persistence_failure = NULL
            WHERE auction_id = @auctionId`
        )
        .run({
          auctionId: input.state.auctionId,
          stateJson: JSON.stringify(input.state),
          phase: input.state.phase,
          updatedAt: input.state.updatedAt
        });
      database
        .prepare(
          `INSERT INTO action_log
            (auction_id, command, client_command_id, timestamp, summary, payload_json, undoable)
            VALUES (?, 'IncreaseBid', ?, ?, ?, ?, 1)`
        )
        .run(
          input.state.auctionId,
          input.clientCommandId,
          input.state.updatedAt,
          input.summary,
          JSON.stringify({
            command: "IncreaseBid",
            currentPlayerId: input.currentPlayerId,
            previousCurrentBid: input.previousCurrentBid,
            nextCurrentBid: input.nextCurrentBid,
            bidIncrement: input.bidIncrement,
            previous: {
              currentBid: input.previousState.currentBid
            },
            next: {
              currentBid: input.state.currentBid
            },
            undo: input.state.undoHistory.at(-1) ?? null
          })
        );
    }
  );

  const markSoldTransaction = database.transaction((input: CommitMarkSoldInput) => {
    assertMutationsAllowed(database);
    const duplicateCommand = database
      .prepare("SELECT 1 AS found FROM action_log WHERE client_command_id = ?")
      .get(input.clientCommandId) as { found: 1 } | undefined;
    if (duplicateCommand) {
      throw new DuplicateClientCommandError(input.clientCommandId);
    }

    const currentAuction = database
      .prepare("SELECT auction_id AS auctionId FROM current_auction WHERE singleton = 1")
      .get() as { auctionId: string } | undefined;
    if (!currentAuction || currentAuction.auctionId !== input.state.auctionId) {
      throw new Error("Cannot commit Mark Sold without an active matching auction.");
    }

    if (input.previousState.currentPlayerId !== input.playerId) {
      throw new Error("Mark Sold player id does not match the previous current player.");
    }

    if (input.previousState.selectedTeamId !== input.winningTeamId) {
      throw new Error("Mark Sold winning team does not match the previous selected team.");
    }

    if (input.previousState.currentBid !== input.soldPrice) {
      throw new Error("Mark Sold price does not match the previous current bid.");
    }

    const nextPlayer =
      input.state.players.find((player) => player.id === input.playerId) ?? null;
    if (
      !nextPlayer ||
      nextPlayer.status !== "Sold" ||
      nextPlayer.winningTeamId !== input.winningTeamId ||
      nextPlayer.soldPrice !== input.soldPrice
    ) {
      throw new Error("Mark Sold commit metadata does not match committed state.");
    }

    database
      .prepare(
        `UPDATE auction_state
            SET state_json = @stateJson,
                phase = @phase,
                updated_at = @updatedAt,
                persistence_failure = NULL
          WHERE auction_id = @auctionId`
      )
      .run({
        auctionId: input.state.auctionId,
        stateJson: JSON.stringify(input.state),
        phase: input.state.phase,
        updatedAt: input.state.updatedAt
      });

    const previousPlayer =
      input.previousState.players.find((player) => player.id === input.playerId) ??
      null;
    const previousTeam =
      input.previousState.teams.find((team) => team.id === input.winningTeamId) ??
      null;
    const nextTeam =
      input.state.teams.find((team) => team.id === input.winningTeamId) ?? null;
    const role = previousPlayer?.role ?? nextPlayer?.role ?? null;

    database
      .prepare(
        `INSERT INTO action_log
          (auction_id, command, client_command_id, timestamp, summary, payload_json, undoable)
          VALUES (?, 'MarkSold', ?, ?, ?, ?, 1)`
      )
      .run(
        input.state.auctionId,
        input.clientCommandId,
        input.state.updatedAt,
        input.summary,
        JSON.stringify({
          command: "MarkSold",
          playerId: input.playerId,
          winningTeamId: input.winningTeamId,
          soldPrice: input.soldPrice,
          previous: {
            player: previousPlayer
              ? {
                  status: previousPlayer.status,
                  soldPrice: previousPlayer.soldPrice,
                  winningTeamId: previousPlayer.winningTeamId,
                  acquisitionType: previousPlayer.acquisitionType
                }
              : null,
            currentPlayerId: input.previousState.currentPlayerId,
            currentBid: input.previousState.currentBid,
            selectedTeamId: input.previousState.selectedTeamId,
            team: previousTeam
              ? {
                  remainingBudget: previousTeam.remainingBudget,
                  squadCount: previousTeam.squadCount,
                  role,
                  roleCount: role ? previousTeam.roleCounts[role] : null
                }
              : null
          },
          next: {
            player: nextPlayer
              ? {
                  status: nextPlayer.status,
                  soldPrice: nextPlayer.soldPrice,
                  winningTeamId: nextPlayer.winningTeamId,
                  acquisitionType: nextPlayer.acquisitionType
                }
              : null,
            currentPlayerId: input.state.currentPlayerId,
            currentBid: input.state.currentBid,
            selectedTeamId: input.state.selectedTeamId,
            team: nextTeam
              ? {
                  remainingBudget: nextTeam.remainingBudget,
                  squadCount: nextTeam.squadCount,
                  role,
                  roleCount: role ? nextTeam.roleCounts[role] : null
                }
              : null
          },
          undo: input.state.undoHistory.at(-1) ?? null
        })
      );
  });

  const markUnsoldTransaction = database.transaction(
    (input: CommitMarkUnsoldInput) => {
      assertMutationsAllowed(database);
      const duplicateCommand = database
        .prepare("SELECT 1 AS found FROM action_log WHERE client_command_id = ?")
        .get(input.clientCommandId) as { found: 1 } | undefined;
      if (duplicateCommand) {
        throw new DuplicateClientCommandError(input.clientCommandId);
      }

      const currentAuction = database
        .prepare("SELECT auction_id AS auctionId FROM current_auction WHERE singleton = 1")
        .get() as { auctionId: string } | undefined;
      if (!currentAuction || currentAuction.auctionId !== input.state.auctionId) {
        throw new Error("Cannot commit Mark Unsold without an active matching auction.");
      }

      if (input.previousState.currentPlayerId !== input.playerId) {
        throw new Error(
          "Mark Unsold player id does not match the previous current player."
        );
      }

      const nextPlayer =
        input.state.players.find((player) => player.id === input.playerId) ?? null;
      if (
        !nextPlayer ||
        nextPlayer.status !== "Unsold" ||
        nextPlayer.winningTeamId !== null ||
        nextPlayer.soldPrice !== null ||
        nextPlayer.acquisitionType !== null ||
        input.state.phase2Pool.filter((playerId) => playerId === input.playerId)
          .length !== 1
      ) {
        throw new Error("Mark Unsold commit metadata does not match committed state.");
      }

      database
        .prepare(
          `UPDATE auction_state
              SET state_json = @stateJson,
                  phase = @phase,
                  updated_at = @updatedAt,
                  persistence_failure = NULL
            WHERE auction_id = @auctionId`
        )
        .run({
          auctionId: input.state.auctionId,
          stateJson: JSON.stringify(input.state),
          phase: input.state.phase,
          updatedAt: input.state.updatedAt
        });

      const previousPlayer =
        input.previousState.players.find(
          (player) => player.id === input.playerId
        ) ?? null;

      database
        .prepare(
          `INSERT INTO action_log
            (auction_id, command, client_command_id, timestamp, summary, payload_json, undoable)
            VALUES (?, 'MarkUnsold', ?, ?, ?, ?, 1)`
        )
        .run(
          input.state.auctionId,
          input.clientCommandId,
          input.state.updatedAt,
          input.summary,
          JSON.stringify({
            command: "MarkUnsold",
            playerId: input.playerId,
            previous: {
              playerStatus: previousPlayer?.status ?? null,
              currentPlayerId: input.previousState.currentPlayerId,
              currentBid: input.previousState.currentBid,
              selectedTeamId: input.previousState.selectedTeamId,
              phase2Pool: input.previousState.phase2Pool
            },
            next: {
              playerStatus: nextPlayer.status,
              currentPlayerId: input.state.currentPlayerId,
              currentBid: input.state.currentBid,
              selectedTeamId: input.state.selectedTeamId,
              phase2Pool: input.state.phase2Pool
            },
            undo: input.state.undoHistory.at(-1) ?? null
          })
        );
    }
  );

  return {
    commitStartAuction: async (input) => {
      const parsed = auctionStateSchema.parse(input.state);
      try {
        insertTransaction({ ...input, state: parsed });
      } catch (error) {
        if (isDuplicateClientCommandError(error, input.clientCommandId)) {
          throw new DuplicateClientCommandError(input.clientCommandId);
        }
        throw error;
      }
      try {
        await mkdir(dirname(options.snapshotPath), { recursive: true });
        await writeFile(options.snapshotPath, JSON.stringify(parsed, null, 2), "utf8");
      } catch (error) {
        markPersistenceFailure(
          database,
          parsed.auctionId,
          "snapshot_write_failed",
          options.snapshotPath
        );
        throw new PersistenceSnapshotWriteError(
          "Start Auction committed, but latest snapshot could not be written.",
          { cause: error }
        );
      }
    },
    commitRevealNextPlayer: async (input) => {
      const parsed = auctionStateSchema.parse(input.state);
      try {
        revealTransaction({ ...input, state: parsed });
      } catch (error) {
        if (isDuplicateClientCommandError(error, input.clientCommandId)) {
          throw new DuplicateClientCommandError(input.clientCommandId);
        }
        throw error;
      }
      try {
        await mkdir(dirname(options.snapshotPath), { recursive: true });
        await writeFile(options.snapshotPath, JSON.stringify(parsed, null, 2), "utf8");
      } catch (error) {
        markPersistenceFailure(
          database,
          parsed.auctionId,
          "snapshot_write_failed",
          options.snapshotPath
        );
        throw new PersistenceSnapshotWriteError(
          "Reveal Next Player committed, but latest snapshot could not be written.",
          { cause: error }
        );
      }
    },
    commitSelectTeam: async (input) => {
      const parsed = auctionStateSchema.parse(input.state);
      try {
        selectTeamTransaction({ ...input, state: parsed });
      } catch (error) {
        if (isDuplicateClientCommandError(error, input.clientCommandId)) {
          throw new DuplicateClientCommandError(input.clientCommandId);
        }
        throw error;
      }
      try {
        await mkdir(dirname(options.snapshotPath), { recursive: true });
        await writeFile(options.snapshotPath, JSON.stringify(parsed, null, 2), "utf8");
      } catch (error) {
        markPersistenceFailure(
          database,
          parsed.auctionId,
          "snapshot_write_failed",
          options.snapshotPath
        );
        throw new PersistenceSnapshotWriteError(
          "Select Team committed, but latest snapshot could not be written.",
          { cause: error }
        );
      }
    },
    commitIncreaseBid: async (input) => {
      const parsed = auctionStateSchema.parse(input.state);
      try {
        increaseBidTransaction({ ...input, state: parsed });
      } catch (error) {
        if (isDuplicateClientCommandError(error, input.clientCommandId)) {
          throw new DuplicateClientCommandError(input.clientCommandId);
        }
        throw error;
      }
      try {
        await mkdir(dirname(options.snapshotPath), { recursive: true });
        await writeFile(options.snapshotPath, JSON.stringify(parsed, null, 2), "utf8");
      } catch (error) {
        markPersistenceFailure(
          database,
          parsed.auctionId,
          "snapshot_write_failed",
          options.snapshotPath
        );
        throw new PersistenceSnapshotWriteError(
          "Increase Bid committed, but latest snapshot could not be written.",
          { cause: error }
        );
      }
    },
    commitMarkSold: async (input) => {
      const parsed = auctionStateSchema.parse(input.state);
      try {
        markSoldTransaction({ ...input, state: parsed });
      } catch (error) {
        if (isDuplicateClientCommandError(error, input.clientCommandId)) {
          throw new DuplicateClientCommandError(input.clientCommandId);
        }
        throw error;
      }
      try {
        await mkdir(dirname(options.snapshotPath), { recursive: true });
        await writeFile(options.snapshotPath, JSON.stringify(parsed, null, 2), "utf8");
      } catch (error) {
        markPersistenceFailure(
          database,
          parsed.auctionId,
          "snapshot_write_failed",
          options.snapshotPath
        );
        throw new PersistenceSnapshotWriteError(
          "Mark Sold committed, but latest snapshot could not be written.",
          { cause: error }
        );
      }
    },
    commitMarkUnsold: async (input) => {
      const parsed = auctionStateSchema.parse(input.state);
      try {
        markUnsoldTransaction({ ...input, state: parsed });
      } catch (error) {
        if (isDuplicateClientCommandError(error, input.clientCommandId)) {
          throw new DuplicateClientCommandError(input.clientCommandId);
        }
        throw error;
      }
      try {
        await mkdir(dirname(options.snapshotPath), { recursive: true });
        await writeFile(options.snapshotPath, JSON.stringify(parsed, null, 2), "utf8");
      } catch (error) {
        markPersistenceFailure(
          database,
          parsed.auctionId,
          "snapshot_write_failed",
          options.snapshotPath
        );
        throw new PersistenceSnapshotWriteError(
          "Mark Unsold committed, but latest snapshot could not be written.",
          { cause: error }
        );
      }
    },
    loadCurrentState: () => loadCurrentState(database, options.snapshotPath),
    listActionLog: () => {
      const currentAuctionId = database
        .prepare("SELECT auction_id AS auctionId FROM current_auction WHERE singleton = 1")
        .get() as { auctionId: string } | undefined;

      if (!currentAuctionId) {
        return [];
      }

      return database
        .prepare(
          `SELECT action_id AS actionId,
                  auction_id AS auctionId,
                  command,
                  client_command_id AS clientCommandId,
                  timestamp,
                  summary,
                  payload_json AS payloadJson,
                  undoable
             FROM action_log
            WHERE auction_id = ?
            ORDER BY action_id`
        )
        .all(currentAuctionId.auctionId)
        .map((row) => ({
          ...(row as Omit<ActionLogEntry, "undoable"> & { undoable: 0 | 1 }),
          undoable: Boolean(
            (row as Omit<ActionLogEntry, "undoable"> & { undoable: 0 | 1 })
              .undoable
          )
        }));
    },
    close: () => database.close()
  };
}

function applySchema(database: Database.Database): void {
  database.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS schema_version (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      version INTEGER NOT NULL
    );

    INSERT OR IGNORE INTO schema_version (singleton, version) VALUES (1, 1);

    CREATE TABLE IF NOT EXISTS auction_state (
      auction_id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      phase TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      persistence_failure TEXT
    );

    CREATE TABLE IF NOT EXISTS current_auction (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      auction_id TEXT NOT NULL REFERENCES auction_state(auction_id)
    );

    CREATE TABLE IF NOT EXISTS action_log (
      action_id INTEGER PRIMARY KEY AUTOINCREMENT,
      auction_id TEXT NOT NULL REFERENCES auction_state(auction_id),
      command TEXT NOT NULL,
      client_command_id TEXT NOT NULL UNIQUE,
      timestamp TEXT NOT NULL,
      summary TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      undoable INTEGER NOT NULL CHECK (undoable IN (0, 1))
    );
  `);
}

function loadCurrentState(
  database: Database.Database,
  snapshotPath: string
): AuctionState | null {
  const row = database
    .prepare(
      `SELECT s.auction_id AS auctionId,
              s.state_json AS stateJson,
              s.persistence_failure AS persistenceFailure
         FROM current_auction c
         JOIN auction_state s ON s.auction_id = c.auction_id
        WHERE c.singleton = 1`
    )
    .get() as
    | { auctionId: string; stateJson: string; persistenceFailure: string | null }
    | undefined;

  if (!row) {
    return null;
  }

  const migration = migrateLegacyPhase1OrderIfMissing(JSON.parse(row.stateJson));
  if (!migration.ok) {
    throw new PersistenceStateLoadError(migration.message);
  }

  const parsed = auctionStateSchema.parse(migration.state);
  if (migration.didMigrate) {
    persistAuthoritativeState(database, snapshotPath, parsed);
  }

  return {
    ...parsed,
    persistenceFailure: row.persistenceFailure
  };
}

interface LegacyPhase1MigrationResult {
  readonly ok: true;
  readonly state: unknown;
  readonly didMigrate: boolean;
}

interface LegacyPhase1MigrationFailure {
  readonly ok: false;
  readonly message: string;
}

function migrateLegacyPhase1OrderIfMissing(
  rawState: unknown
): LegacyPhase1MigrationResult | LegacyPhase1MigrationFailure {
  if (!isRecord(rawState) || "phase1Order" in rawState) {
    return { ok: true, state: rawState, didMigrate: false };
  }

  const legacyState = rawState as Partial<AuctionState>;
  const legacyParse = auctionStateBaseSchema
    .omit({ phase1Order: true })
    .safeParse(legacyState);
  if (!legacyParse.success) {
    return {
      ok: false,
      message: "Legacy auction state is missing Phase 1 order and could not be parsed."
    };
  }

  const phase1Order = createPhase1Order({
    players: legacyParse.data.players,
    parameters: legacyParse.data.parameters,
    generatedAt: legacyParse.data.updatedAt,
    shuffle: (playerIds) => [...playerIds]
  });

  if (!phase1Order.ok) {
    return {
      ok: false,
      message: `Legacy auction state could not derive Phase 1 order: ${phase1Order.error.code}.`
    };
  }

  return {
    ok: true,
    didMigrate: true,
    state: {
      ...legacyParse.data,
      phase1Order: phase1Order.order
    }
  };
}

function persistAuthoritativeState(
  database: Database.Database,
  snapshotPath: string,
  state: AuctionState
): void {
  database
    .prepare(
      `UPDATE auction_state
          SET state_json = ?, phase = ?, updated_at = ?
        WHERE auction_id = ?`
    )
    .run(
      JSON.stringify(state),
      state.phase,
      state.updatedAt,
      state.auctionId
    );

  void writeFile(snapshotPath, JSON.stringify(state, null, 2), "utf8").catch(() => {
    // Snapshot refresh is best-effort during legacy migration.
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function markPersistenceFailure(
  database: Database.Database,
  auctionId: string,
  failure: string,
  snapshotPath: string
): void {
  const state = loadCurrentState(database, snapshotPath);
  if (!state) {
    database
      .prepare("UPDATE auction_state SET persistence_failure = ? WHERE auction_id = ?")
      .run(failure, auctionId);
    return;
  }

  const nextState = {
    ...state,
    persistenceFailure: failure
  };
  database
    .prepare(
      "UPDATE auction_state SET persistence_failure = ?, state_json = ? WHERE auction_id = ?"
    )
    .run(failure, JSON.stringify(nextState), auctionId);
}

function assertMutationsAllowed(database: Database.Database): void {
  const row = database
    .prepare(
      `SELECT s.persistence_failure AS persistenceFailure
         FROM current_auction c
         JOIN auction_state s ON s.auction_id = c.auction_id
        WHERE c.singleton = 1`
    )
    .get() as { persistenceFailure: string | null } | undefined;

  if (row?.persistenceFailure) {
    throw new Error(
      "Cannot run mutating commands while persistence failure is uncleared."
    );
  }
}

function isDuplicateClientCommandError(
  error: unknown,
  clientCommandId: string
): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const sqliteError = error as Error & { code?: string };
  return (
    sqliteError.code === "SQLITE_CONSTRAINT_UNIQUE" &&
    error.message.includes("client_command_id") &&
    error.message.includes(clientCommandId)
  );
}
