import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

describe("persistence dependencies", () => {
  it("opens an in-memory SQLite database", () => {
    const db = new Database(":memory:");

    try {
      const row = db.prepare("select 1 as ready").get() as { ready: number };
      expect(row.ready).toBe(1);
    } finally {
      db.close();
    }
  });
});
