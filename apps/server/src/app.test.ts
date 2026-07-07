import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAuctionManagerServer } from "./app.js";

describe("auction manager event server", () => {
  it("responds to the required API health route", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      service: "auction-manager",
      mode: "event"
    });

    await app.close();
  });

  it("serves the built React app from the Fastify process", async () => {
    const webDistPath = await createWebDistFixture();
    const app = await createAuctionManagerServer({ webDistPath });

    const response = await app.inject({ method: "GET", url: "/" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain('<div id="root">Auction Manager</div>');

    await app.close();
  });

  it("starts an auction from valid setup and resumes board-ready state", async () => {
    const dataDirectory = await mkdtemp(join(tmpdir(), "auction-manager-data-"));
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory
    });

    await stageValidSetup(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/auction/start",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-start-1" }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.result).toMatchObject({
      command: "StartAuction",
      clientCommandId: "cmd-start-1"
    });
    expect(body.state).toMatchObject({
      phase: "InitialAuction",
      currentPlayer: null,
      currentBid: null,
      canUndo: false
    });
    expect(body.state.players).toHaveLength(8);
    expect(body.state.teams).toHaveLength(4);
    expect(JSON.stringify(body.state)).not.toContain("private-player@example.com");
    expect(JSON.stringify(body.state)).not.toContain("UPI-PRIVATE");

    const stateResponse = await app.inject({ method: "GET", url: "/api/state" });
    expect(stateResponse.statusCode).toBe(200);
    expect(stateResponse.json()).toMatchObject({
      mode: "auction",
      state: {
        auctionId: body.state.auctionId,
        phase: "InitialAuction"
      }
    });

    await app.close();
  });

  it("blocks Start Auction when setup is invalid", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory: await mkdtemp(join(tmpdir(), "auction-manager-data-"))
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/auction/start",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-start-1" }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: "setup_blocked",
      primaryBlockerMessage: "Blocked: Player CSV must be imported before Start Auction."
    });

    await app.close();
  });

  it("validates Start Auction content type and clientCommandId", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory: await mkdtemp(join(tmpdir(), "auction-manager-data-"))
    });

    const unsupported = await app.inject({
      method: "POST",
      url: "/api/auction/start",
      headers: { "content-type": "text/plain" },
      payload: "start"
    });
    expect(unsupported.statusCode).toBe(415);

    const malformed = await app.inject({
      method: "POST",
      url: "/api/auction/start",
      headers: { "content-type": "application/json" },
      payload: {}
    });
    expect(malformed.statusCode).toBe(400);

    await app.close();
  });

  it("rejects duplicate clientCommandId and locks setup mutations after start", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory: await mkdtemp(join(tmpdir(), "auction-manager-data-"))
    });
    await stageValidSetup(app);

    const first = await app.inject({
      method: "POST",
      url: "/api/auction/start",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-start-1" }
    });
    expect(first.statusCode).toBe(200);

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/auction/start",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-start-1" }
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({
      error: "duplicate_client_command_id"
    });

    const secondStart = await app.inject({
      method: "POST",
      url: "/api/auction/start",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-start-2" }
    });
    expect(secondStart.statusCode).toBe(409);
    expect(secondStart.json()).toMatchObject({
      error: "auction_already_started"
    });

    const lockedParameters = await app.inject({
      method: "POST",
      url: "/api/setup/auction-parameters",
      headers: { "content-type": "application/json" },
      payload: { teamBudget: 999 }
    });
    expect(lockedParameters.statusCode).toBe(409);
    expect(lockedParameters.json()).toMatchObject({ error: "auction_started" });

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

async function stageValidSetup(app: Awaited<ReturnType<typeof createAuctionManagerServer>>) {
  const validCsvPath = join(
    process.cwd(),
    "_bmad-output/test-artifacts/sample-test-data/players-valid.csv"
  );
  const validTeamCsvPath = join(
    process.cwd(),
    "_bmad-output/test-artifacts/sample-test-data/teams-valid.csv"
  );

  const playerResponse = await app.inject({
    method: "POST",
    url: "/api/setup/player-csv/preview",
    headers: { "content-type": "text/csv" },
    payload: await readFile(validCsvPath, "utf8")
  });
  expect(playerResponse.statusCode).toBe(200);

  const teamResponse = await app.inject({
    method: "POST",
    url: "/api/setup/team-csv/preview",
    headers: { "content-type": "text/csv" },
    payload: await readFile(validTeamCsvPath, "utf8")
  });
  expect(teamResponse.statusCode).toBe(200);

  const parameterResponse = await app.inject({
    method: "POST",
    url: "/api/setup/auction-parameters",
    headers: { "content-type": "application/json" },
    payload: {
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
    }
  });
  expect(parameterResponse.statusCode).toBe(200);
}
