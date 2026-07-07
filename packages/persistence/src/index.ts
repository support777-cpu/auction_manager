import Database from "better-sqlite3";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { auctionStateSchema, type AuctionState } from "@auction-manager/shared";

export const persistencePackageReady = true;

export interface AuctionRepositoryOptions {
  readonly databasePath: string;
  readonly snapshotPath: string;
}

export interface CommitStartAuctionInput {
  readonly state: AuctionState;
  readonly clientCommandId: string;
}

export interface ActionLogEntry {
  readonly actionId: number;
  readonly auctionId: string;
  readonly command: "StartAuction";
  readonly clientCommandId: string;
  readonly timestamp: string;
  readonly summary: string;
  readonly payloadJson: string;
  readonly undoable: boolean;
}

export interface AuctionRepository {
  readonly commitStartAuction: (input: CommitStartAuctionInput) => Promise<void>;
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
      if (loadCurrentState(database)) {
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
            auctionId: input.state.auctionId
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
          "snapshot_write_failed"
        );
        throw new PersistenceSnapshotWriteError(
          "Start Auction committed, but latest snapshot could not be written.",
          { cause: error }
        );
      }
    },
    loadCurrentState: () => loadCurrentState(database),
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

function loadCurrentState(database: Database.Database): AuctionState | null {
  const row = database
    .prepare(
      `SELECT s.state_json AS stateJson, s.persistence_failure AS persistenceFailure
         FROM current_auction c
         JOIN auction_state s ON s.auction_id = c.auction_id
        WHERE c.singleton = 1`
    )
    .get() as { stateJson: string; persistenceFailure: string | null } | undefined;

  if (!row) {
    return null;
  }

  const parsed = auctionStateSchema.parse(JSON.parse(row.stateJson));
  return {
    ...parsed,
    persistenceFailure: row.persistenceFailure
  };
}

function markPersistenceFailure(
  database: Database.Database,
  auctionId: string,
  failure: string
): void {
  const state = loadCurrentState(database);
  const nextState = state
    ? {
        ...state,
        persistenceFailure: failure
      }
    : null;
  database
    .prepare(
      "UPDATE auction_state SET persistence_failure = ?, state_json = ? WHERE auction_id = ?"
    )
    .run(failure, JSON.stringify(nextState), auctionId);
}

function assertMutationsAllowed(database: Database.Database): void {
  const state = loadCurrentState(database);
  if (state?.persistenceFailure) {
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
