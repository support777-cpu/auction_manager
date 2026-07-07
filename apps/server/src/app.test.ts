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
      phase1Progress: {
        currentCategory: "Ace Men",
        orderedPlayerCount: 8,
        pendingPlayerCount: 8,
        revealedPlayerCount: 0
      },
      canUndo: false
    });
    expect(body.state.phase1Progress.categories).toEqual([
      { category: "Ace Men", total: 1, pending: 1, completed: 0 },
      { category: "Ace Women", total: 1, pending: 1, completed: 0 },
      { category: "Women All Rounders", total: 2, pending: 2, completed: 0 },
      { category: "Men Bowlers", total: 2, pending: 2, completed: 0 },
      { category: "Men Batsmen", total: 1, pending: 1, completed: 0 },
      { category: "Men All Rounders", total: 1, pending: 1, completed: 0 }
    ]);
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
        phase: "InitialAuction",
        phase1Progress: body.state.phase1Progress
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

  it("reveals next player from a started auction and resumes revealed board state", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory: await mkdtemp(join(tmpdir(), "auction-manager-data-"))
    });
    await stageValidSetup(app);

    const start = await app.inject({
      method: "POST",
      url: "/api/auction/start",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-start-1" }
    });
    expect(start.statusCode).toBe(200);

    const response = await app.inject({
      method: "POST",
      url: "/api/auction/reveal-next",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-reveal-1" }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.result).toMatchObject({
      command: "RevealNextPlayer",
      clientCommandId: "cmd-reveal-1"
    });
    expect(body.result.message).toMatch(/^Revealed .+ at base price \d+\.$/);
    expect(body.state.currentPlayer).toMatchObject({
      status: "Current"
    });
    expect(body.state.currentBid).toBe(body.state.currentPlayer.basePrice);
    expect(body.state.phase1Progress).toMatchObject({
      orderedPlayerCount: 8,
      pendingPlayerCount: 7,
      revealedPlayerCount: 1
    });
    expect(body.state.phase1Progress.categories).toContainEqual({
      category: body.state.currentPlayer.phase1Category,
      total: expect.any(Number),
      pending: expect.any(Number),
      completed: 0
    });
    expect(JSON.stringify(body)).not.toContain("private-player@example.com");
    expect(JSON.stringify(body)).not.toContain("UPI-PRIVATE");

    const stateResponse = await app.inject({ method: "GET", url: "/api/state" });
    expect(stateResponse.statusCode).toBe(200);
    expect(stateResponse.json()).toMatchObject({
      mode: "auction",
      state: {
        currentPlayer: {
          id: body.state.currentPlayer.id
        },
        currentBid: body.state.currentBid,
        phase1Progress: body.state.phase1Progress
      }
    });

    await app.close();
  });

  it("validates Reveal Next content type and clientCommandId", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory: await mkdtemp(join(tmpdir(), "auction-manager-data-"))
    });

    const unsupported = await app.inject({
      method: "POST",
      url: "/api/auction/reveal-next",
      headers: { "content-type": "text/plain" },
      payload: "reveal"
    });
    expect(unsupported.statusCode).toBe(415);

    const malformed = await app.inject({
      method: "POST",
      url: "/api/auction/reveal-next",
      headers: { "content-type": "application/json" },
      payload: {}
    });
    expect(malformed.statusCode).toBe(400);

    await app.close();
  });

  it("rejects duplicate Reveal Next command id and second reveal while current player is unresolved", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory: await mkdtemp(join(tmpdir(), "auction-manager-data-"))
    });
    await stageValidSetup(app);

    const start = await app.inject({
      method: "POST",
      url: "/api/auction/start",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-start-1" }
    });
    expect(start.statusCode).toBe(200);

    const firstReveal = await app.inject({
      method: "POST",
      url: "/api/auction/reveal-next",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-reveal-1" }
    });
    expect(firstReveal.statusCode).toBe(200);

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/auction/reveal-next",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-reveal-1" }
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({
      error: "duplicate_client_command_id"
    });

    const secondReveal = await app.inject({
      method: "POST",
      url: "/api/auction/reveal-next",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-reveal-2" }
    });
    expect(secondReveal.statusCode).toBe(409);
    expect(secondReveal.json()).toMatchObject({
      error: "current_player_requires_outcome"
    });

    await app.close();
  });

  it("selects, changes, clears, and resumes selected Team state", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory: await mkdtemp(join(tmpdir(), "auction-manager-data-"))
    });
    await stageValidSetup(app);
    const revealed = await startAndReveal(app);
    const teamOneId = revealed.state.teams[0].id;
    const teamTwoId = revealed.state.teams[1].id;

    const selected = await app.inject({
      method: "POST",
      url: "/api/auction/select-team",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-select-1", teamId: teamOneId }
    });
    expect(selected.statusCode).toBe(200);
    expect(selected.json()).toMatchObject({
      result: {
        command: "SelectTeam",
        clientCommandId: "cmd-select-1"
      },
      state: {
        selectedTeamId: teamOneId
      }
    });
    expect(selected.json().result.message).toMatch(/^Selected .+ for .+\.$/);
    expect(selected.json().state.teams[0].currentPlayerCapacity).toMatchObject({
      teamId: teamOneId,
      canBuy: true,
      reasons: []
    });
    expect(JSON.stringify(selected.json())).not.toContain("private-player@example.com");
    expect(JSON.stringify(selected.json())).not.toContain("UPI-PRIVATE");

    const changed = await app.inject({
      method: "POST",
      url: "/api/auction/select-team",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-select-2", teamId: teamTwoId }
    });
    expect(changed.statusCode).toBe(200);
    expect(changed.json().state.selectedTeamId).toBe(teamTwoId);

    const cleared = await app.inject({
      method: "POST",
      url: "/api/auction/select-team",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-clear-1", teamId: null }
    });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json()).toMatchObject({
      result: {
        command: "SelectTeam",
        message: "Cleared selected Team."
      },
      state: {
        selectedTeamId: null
      }
    });

    const stateResponse = await app.inject({ method: "GET", url: "/api/state" });
    expect(stateResponse.statusCode).toBe(200);
    expect(stateResponse.json().state.selectedTeamId).toBeNull();
    expect(stateResponse.json().state.currentPlayer.id).toBe(
      revealed.state.currentPlayer.id
    );
    expect(stateResponse.json().state.currentBid).toBe(revealed.state.currentBid);

    await app.close();
  });

  it("validates Select Team content type, request body, duplicate id, and conflicts", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory: await mkdtemp(join(tmpdir(), "auction-manager-data-"))
    });

    const unsupported = await app.inject({
      method: "POST",
      url: "/api/auction/select-team",
      headers: { "content-type": "text/plain" },
      payload: "select"
    });
    expect(unsupported.statusCode).toBe(415);

    const malformed = await app.inject({
      method: "POST",
      url: "/api/auction/select-team",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-select-1" }
    });
    expect(malformed.statusCode).toBe(400);

    await stageValidSetup(app);
    const start = await app.inject({
      method: "POST",
      url: "/api/auction/start",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-start-1" }
    });
    expect(start.statusCode).toBe(200);

    const noCurrentPlayer = await app.inject({
      method: "POST",
      url: "/api/auction/select-team",
      headers: { "content-type": "application/json" },
      payload: {
        clientCommandId: "cmd-select-no-player",
        teamId: start.json().state.teams[0].id
      }
    });
    expect(noCurrentPlayer.statusCode).toBe(409);
    expect(noCurrentPlayer.json()).toMatchObject({
      error: "current_player_required"
    });

    const reveal = await app.inject({
      method: "POST",
      url: "/api/auction/reveal-next",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-reveal-1" }
    });
    expect(reveal.statusCode).toBe(200);

    const unknownTeam = await app.inject({
      method: "POST",
      url: "/api/auction/select-team",
      headers: { "content-type": "application/json" },
      payload: {
        clientCommandId: "cmd-select-unknown",
        teamId: "team-unknown"
      }
    });
    expect(unknownTeam.statusCode).toBe(409);
    expect(unknownTeam.json()).toMatchObject({
      error: "team_not_found"
    });

    const selected = await app.inject({
      method: "POST",
      url: "/api/auction/select-team",
      headers: { "content-type": "application/json" },
      payload: {
        clientCommandId: "cmd-select-1",
        teamId: reveal.json().state.teams[0].id
      }
    });
    expect(selected.statusCode).toBe(200);

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/auction/select-team",
      headers: { "content-type": "application/json" },
      payload: {
        clientCommandId: "cmd-select-1",
        teamId: reveal.json().state.teams[0].id
      }
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({
      error: "duplicate_client_command_id"
    });

    const sameTeamReselect = await app.inject({
      method: "POST",
      url: "/api/auction/select-team",
      headers: { "content-type": "application/json" },
      payload: {
        clientCommandId: "cmd-select-same",
        teamId: reveal.json().state.teams[0].id
      }
    });
    expect(sameTeamReselect.statusCode).toBe(200);
    expect(sameTeamReselect.json().result.message).toContain("already selected");
    expect(
      (await app.inject({ method: "GET", url: "/api/state" })).json().state
        .selectedTeamId
    ).toBe(reveal.json().state.teams[0].id);

    await app.close();
  });

  it("increases current bid by configured increment, repeats, and resumes state", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory: await mkdtemp(join(tmpdir(), "auction-manager-data-"))
    });
    await stageValidSetup(app);
    const revealed = await startAndReveal(app);
    const baseBid = revealed.state.currentBid;
    const bidIncrement = revealed.state.parameters.bidIncrement;

    const first = await app.inject({
      method: "POST",
      url: "/api/auction/increase-bid",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-increase-1" }
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({
      result: {
        command: "IncreaseBid",
        clientCommandId: "cmd-increase-1"
      },
      state: {
        currentBid: baseBid + bidIncrement,
        selectedTeamId: null
      }
    });
    expect(first.json().result.message).toMatch(/^Increased bid for .+ to \d+\.$/);
    expect(JSON.stringify(first.json())).not.toContain("private-player@example.com");
    expect(JSON.stringify(first.json())).not.toContain("UPI-PRIVATE");

    const second = await app.inject({
      method: "POST",
      url: "/api/auction/increase-bid",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-increase-2" }
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().state.currentBid).toBe(baseBid + bidIncrement * 2);

    const stateResponse = await app.inject({ method: "GET", url: "/api/state" });
    expect(stateResponse.statusCode).toBe(200);
    expect(stateResponse.json().state.currentBid).toBe(baseBid + bidIncrement * 2);
    expect(stateResponse.json().state.currentPlayer.id).toBe(
      revealed.state.currentPlayer.id
    );

    await app.close();
  });

  it("validates Increase Bid content type, request body, duplicate id, and conflicts", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory: await mkdtemp(join(tmpdir(), "auction-manager-data-"))
    });

    const unsupported = await app.inject({
      method: "POST",
      url: "/api/auction/increase-bid",
      headers: { "content-type": "text/plain" },
      payload: "increase"
    });
    expect(unsupported.statusCode).toBe(415);

    const malformed = await app.inject({
      method: "POST",
      url: "/api/auction/increase-bid",
      headers: { "content-type": "application/json" },
      payload: {}
    });
    expect(malformed.statusCode).toBe(400);

    await stageValidSetup(app);
    const start = await app.inject({
      method: "POST",
      url: "/api/auction/start",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-start-1" }
    });
    expect(start.statusCode).toBe(200);

    const noCurrentPlayer = await app.inject({
      method: "POST",
      url: "/api/auction/increase-bid",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-increase-no-player" }
    });
    expect(noCurrentPlayer.statusCode).toBe(409);
    expect(noCurrentPlayer.json()).toMatchObject({
      error: "current_player_required"
    });

    const reveal = await app.inject({
      method: "POST",
      url: "/api/auction/reveal-next",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-reveal-1" }
    });
    expect(reveal.statusCode).toBe(200);

    const increased = await app.inject({
      method: "POST",
      url: "/api/auction/increase-bid",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-increase-1" }
    });
    expect(increased.statusCode).toBe(200);

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/auction/increase-bid",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-increase-1" }
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({
      error: "duplicate_client_command_id"
    });

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

async function startAndReveal(
  app: Awaited<ReturnType<typeof createAuctionManagerServer>>
) {
  const start = await app.inject({
    method: "POST",
    url: "/api/auction/start",
    headers: { "content-type": "application/json" },
    payload: { clientCommandId: "cmd-start-1" }
  });
  expect(start.statusCode).toBe(200);

  const reveal = await app.inject({
    method: "POST",
    url: "/api/auction/reveal-next",
    headers: { "content-type": "application/json" },
    payload: { clientCommandId: "cmd-reveal-1" }
  });
  expect(reveal.statusCode).toBe(200);

  return reveal.json();
}
