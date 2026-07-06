import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  privateSourceFieldNames,
  privateSourceFieldSampleValues
} from "@auction-manager/test-fixtures";
import { describe, expect, it } from "vitest";
import { createAuctionManagerServer } from "./app.js";

const validCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/players-valid.csv"
);
const invalidCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/players-invalid.csv"
);
const privateCellValues = privateSourceFieldSampleValues.filter(
  (value) => !privateSourceFieldNames.some((fieldName) => fieldName === value)
);

describe("setup Player CSV preview route", () => {
  it("returns a reviewable privacy-safe preview for valid CSV", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/player-csv/preview",
      headers: { "content-type": "text/csv" },
      payload: await readFile(validCsvPath, "utf8")
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.summary).toMatchObject({
      totalRows: 8,
      importedPlayers: 8,
      mustFixCount: 0,
      startAuctionBlocked: false
    });
    expect(body.players[0]).toEqual({
      sourceRowNumber: 2,
      name: "Aarav Menon",
      gender: "Male",
      role: "Ace",
      phase1Category: "Ace Men"
    });

    for (const player of body.players) {
      for (const privateField of privateSourceFieldNames) {
        expect(player).not.toHaveProperty(privateField);
      }
    }

    await app.close();
  });

  it("returns must_fix review issues for invalid Player rows", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/player-csv/preview",
      headers: { "content-type": "text/csv" },
      payload: await readFile(invalidCsvPath, "utf8")
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    const mustFixGroup = body.issueGroups.find(
      (group: { severity: string }) => group.severity === "must_fix"
    );

    expect(body.summary).toMatchObject({
      importedPlayers: 0,
      mustFixCount: 4,
      startAuctionBlocked: true
    });
    expect(mustFixGroup.issues).toEqual([
      expect.objectContaining({ code: "missing_required_value", sourceRowNumber: 2 }),
      expect.objectContaining({ code: "unknown_skill", sourceRowNumber: 3 }),
      expect.objectContaining({ code: "missing_required_value", sourceRowNumber: 4 }),
      expect.objectContaining({ code: "unknown_skill", sourceRowNumber: 5 })
    ]);

    await app.close();
  });

  it("does not include private source cell values in responses", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/player-csv/preview",
      headers: { "content-type": "text/csv" },
      payload: await readFile(validCsvPath, "utf8")
    });
    const body = response.body;

    for (const privateValue of privateCellValues) {
      expect(body).not.toContain(privateValue);
    }
    expect(body).not.toContain("UPI-PRIVATE");
    expect(body).not.toContain("987654321");

    await app.close();
  });

  it("rejects unsupported preview content types", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/player-csv/preview",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ csv: "Full Name,Gender,Skill\nAarav Menon,Male,Ace\n" })
    });

    expect(response.statusCode).toBe(415);
    expect(response.json()).toEqual({
      ok: false,
      error: "unsupported_content_type",
      message: "Upload the Player CSV as text/csv."
    });

    await app.close();
  });

  it("rejects oversized Player CSV preview uploads", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/player-csv/preview",
      headers: { "content-type": "text/csv" },
      payload: `Full Name,Gender,Skill\n${"A".repeat(300_000)},Male,Ace\n`
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({
      ok: false,
      error: "upload_too_large",
      message: "Player CSV exceeds the 256 KB upload limit."
    });

    await app.close();
  });

  it("returns parse_error review issues for malformed CSV", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/player-csv/preview",
      headers: { "content-type": "text/csv" },
      payload: 'Full Name,Gender,Skill\n"Unclosed quote,Male,Ace\n'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().summary).toMatchObject({
      importedPlayers: 0,
      mustFixCount: 1,
      startAuctionBlocked: true
    });
    expect(
      response
        .json()
        .issueGroups.find((group: { severity: string }) => group.severity === "must_fix")
        ?.issues
    ).toEqual([expect.objectContaining({ code: "parse_error" })]);

    await app.close();
  });
});

async function createWebDistFixture() {
  const webDistPath = await mkdtemp(join(tmpdir(), "auction-manager-web-dist-"));
  await writeFile(
    join(webDistPath, "index.html"),
    '<!doctype html><html><body><div id="root">Auction Manager</div></body></html>'
  );

  return webDistPath;
}
