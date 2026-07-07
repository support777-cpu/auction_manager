import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAuctionRepository } from "@auction-manager/persistence";
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

  it("rejects invalid Mark Sold attempts with clear reasons and no state mutation", async () => {
    const dataDirectory = await mkdtemp(join(tmpdir(), "auction-manager-data-"));
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory
    });
    await stageValidSetup(app);
    const revealed = await startAndReveal(app);
    const teamId = revealed.state.teams[0].id;

    const selected = await app.inject({
      method: "POST",
      url: "/api/auction/select-team",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-select-for-mark-sold", teamId }
    });
    expect(selected.statusCode).toBe(200);

    let latestState = selected.json().state;
    const selectedTeam =
      latestState.teams.find((team: { id: string }) => team.id === teamId) ??
      latestState.teams[0];
    let commandIndex = 0;
    while (latestState.currentBid <= selectedTeam.remainingBudget) {
      commandIndex += 1;
      const increased = await app.inject({
        method: "POST",
        url: "/api/auction/increase-bid",
        headers: { "content-type": "application/json" },
        payload: { clientCommandId: `cmd-increase-for-mark-sold-${commandIndex}` }
      });
      expect(increased.statusCode).toBe(200);
      latestState = increased.json().state;
    }

    const beforeState = (await app.inject({ method: "GET", url: "/api/state" }))
      .json().state;
    const beforeSnapshot = await readFile(
      join(dataDirectory, "snapshots/latest.json"),
      "utf8"
    );
    const repository = createAuctionRepository({
      databasePath: join(dataDirectory, "auction.db"),
      snapshotPath: join(dataDirectory, "snapshots/latest.json")
    });
    const beforeActionLog = repository.listActionLog();

    const rejected = await app.inject({
      method: "POST",
      url: "/api/auction/mark-sold",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-mark-sold-blocked" }
    });

    expect(rejected.statusCode).toBe(409);
    expect(rejected.json()).toEqual({
      ok: false,
      error: "sale_blocked",
      message: `Blocked: ${beforeState.teams[0].name} have ${beforeState.teams[0].remainingBudget} remaining; current bid is ${beforeState.currentBid}.`,
      reasons: [
        {
          code: "budget_exceeded",
          message: `Blocked: ${beforeState.teams[0].name} have ${beforeState.teams[0].remainingBudget} remaining; current bid is ${beforeState.currentBid}.`
        }
      ]
    });
    expect(JSON.stringify(rejected.json())).not.toContain("private-player@example.com");
    expect(JSON.stringify(rejected.json())).not.toContain("UPI-PRIVATE");

    const afterState = (await app.inject({ method: "GET", url: "/api/state" }))
      .json().state;
    const afterSnapshot = await readFile(
      join(dataDirectory, "snapshots/latest.json"),
      "utf8"
    );
    expect(afterState).toEqual(beforeState);
    expect(afterSnapshot).toBe(beforeSnapshot);
    expect(repository.listActionLog()).toEqual(beforeActionLog);
    expect(
      repository.listActionLog().some((entry) => entry.command === "MarkSold")
    ).toBe(false);

    const repeated = await app.inject({
      method: "POST",
      url: "/api/auction/mark-sold",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-mark-sold-blocked" }
    });
    expect(repeated.statusCode).toBe(409);
    expect(repeated.json()).toMatchObject({
      error: "sale_blocked"
    });

    const afterRepeatState = (await app.inject({ method: "GET", url: "/api/state" }))
      .json().state;
    const afterRepeatSnapshot = await readFile(
      join(dataDirectory, "snapshots/latest.json"),
      "utf8"
    );
    expect(afterRepeatState).toEqual(beforeState);
    expect(afterRepeatSnapshot).toBe(beforeSnapshot);
    expect(repository.listActionLog()).toEqual(beforeActionLog);

    await app.close();
  });

  it("marks a selected current player sold and persists board-ready state", async () => {
    const dataDirectory = await mkdtemp(join(tmpdir(), "auction-manager-data-"));
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory
    });
    await stageValidSetup(app);
    const revealed = await startAndReveal(app);
    const playerId = revealed.state.currentPlayer.id;
    const team = revealed.state.teams[0];

    const selected = await app.inject({
      method: "POST",
      url: "/api/auction/select-team",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-select-for-sale", teamId: team.id }
    });
    expect(selected.statusCode).toBe(200);

    const sold = await app.inject({
      method: "POST",
      url: "/api/auction/mark-sold",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-mark-sold-accepted" }
    });

    expect(sold.statusCode).toBe(200);
    const body = sold.json();
    expect(body.result).toEqual({
      command: "MarkSold",
      clientCommandId: "cmd-mark-sold-accepted",
      message: expect.stringMatching(/^Sold .+ to .+ for \d+\.$/)
    });
    expect(body.state).toMatchObject({
      currentPlayer: null,
      currentBid: null,
      selectedTeamId: null,
      canUndo: true
    });
    expect(body.state.players.find((player: { id: string }) => player.id === playerId))
      .toMatchObject({
        status: "Sold",
        soldPrice: revealed.state.currentBid,
        winningTeamId: team.id,
        acquisitionType: "Auction"
      });
    expect(body.state.teams.find((candidate: { id: string }) => candidate.id === team.id))
      .toMatchObject({
        remainingBudget: team.remainingBudget - revealed.state.currentBid,
        squadCount: team.squadCount + 1,
        roleCounts: {
          ...team.roleCounts,
          [revealed.state.currentPlayer.role]:
            (team.roleCounts[revealed.state.currentPlayer.role] ?? 0) + 1
        }
      });
    expect(JSON.stringify(body)).not.toContain("private-player@example.com");
    expect(JSON.stringify(body)).not.toContain("UPI-PRIVATE");

    const repository = createAuctionRepository({
      databasePath: join(dataDirectory, "auction.db"),
      snapshotPath: join(dataDirectory, "snapshots/latest.json")
    });
    const markSoldEntries = repository
      .listActionLog()
      .filter((entry) => entry.command === "MarkSold");
    expect(markSoldEntries).toHaveLength(1);
    expect(markSoldEntries[0]).toMatchObject({
      clientCommandId: "cmd-mark-sold-accepted",
      summary: body.result.message,
      undoable: true
    });
    expect(JSON.parse(markSoldEntries[0]?.payloadJson ?? "{}")).toMatchObject({
      command: "MarkSold",
      playerId,
      winningTeamId: team.id,
      soldPrice: revealed.state.currentBid,
      undo: {
        command: "MarkSold",
        playerId,
        winningTeamId: team.id,
        soldPrice: revealed.state.currentBid
      }
    });
    expect(JSON.parse(await readFile(join(dataDirectory, "snapshots/latest.json"), "utf8")))
      .toMatchObject({
        currentPlayerId: null,
        currentBid: null,
        selectedTeamId: null
      });

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/auction/mark-sold",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-mark-sold-accepted" }
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({
      error: "duplicate_client_command_id"
    });

    repository.close();
    await app.close();
  });

  it("rejects Mark Sold when clientCommandId already exists in the action log", async () => {
    const dataDirectory = await mkdtemp(join(tmpdir(), "auction-manager-data-"));
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory
    });
    await stageValidSetup(app);
    const revealed = await startAndReveal(app);
    const teamId = revealed.state.teams[0].id;

    const selected = await app.inject({
      method: "POST",
      url: "/api/auction/select-team",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-select-for-duplicate-mark-sold", teamId }
    });
    expect(selected.statusCode).toBe(200);

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/auction/mark-sold",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-select-for-duplicate-mark-sold" }
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({
      ok: false,
      error: "duplicate_client_command_id"
    });

    await app.close();
  });

  it("validates Mark Sold content type, request body, and prerequisite conflicts", async () => {
    const dataDirectory = await mkdtemp(join(tmpdir(), "auction-manager-data-"));
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory
    });

    const unsupported = await app.inject({
      method: "POST",
      url: "/api/auction/mark-sold",
      headers: { "content-type": "text/plain" },
      payload: "mark sold"
    });
    expect(unsupported.statusCode).toBe(415);

    const malformed = await app.inject({
      method: "POST",
      url: "/api/auction/mark-sold",
      headers: { "content-type": "application/json" },
      payload: {}
    });
    expect(malformed.statusCode).toBe(400);

    const inactive = await app.inject({
      method: "POST",
      url: "/api/auction/mark-sold",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-mark-sold-inactive" }
    });
    expect(inactive.statusCode).toBe(409);
    expect(inactive.json()).toMatchObject({
      error: "auction_not_active"
    });

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
      url: "/api/auction/mark-sold",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-mark-sold-no-player" }
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

    const beforeState = (await app.inject({ method: "GET", url: "/api/state" }))
      .json().state;
    const beforeSnapshot = await readFile(
      join(dataDirectory, "snapshots/latest.json"),
      "utf8"
    );
    const repository = createAuctionRepository({
      databasePath: join(dataDirectory, "auction.db"),
      snapshotPath: join(dataDirectory, "snapshots/latest.json")
    });
    const beforeActionLog = repository.listActionLog();

    const noSelectedTeam = await app.inject({
      method: "POST",
      url: "/api/auction/mark-sold",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-mark-sold-no-team" }
    });
    expect(noSelectedTeam.statusCode).toBe(409);
    expect(noSelectedTeam.json()).toMatchObject({
      error: "selected_team_required"
    });

    const afterState = (await app.inject({ method: "GET", url: "/api/state" }))
      .json().state;
    const afterSnapshot = await readFile(
      join(dataDirectory, "snapshots/latest.json"),
      "utf8"
    );
    expect(afterState).toEqual(beforeState);
    expect(afterSnapshot).toBe(beforeSnapshot);
    expect(repository.listActionLog()).toEqual(beforeActionLog);
    expect(
      repository.listActionLog().some((entry) => entry.command === "MarkSold")
    ).toBe(false);

    await app.close();
  });

  it("marks the current player unsold into the Phase 2 pool and persists board-ready state", async () => {
    const dataDirectory = await mkdtemp(join(tmpdir(), "auction-manager-data-"));
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory
    });
    await stageValidSetup(app);
    const revealed = await startAndReveal(app);
    const playerId = revealed.state.currentPlayer.id;
    const teamsBefore = revealed.state.teams;
    expect(revealed.state.phase2PoolCount).toBe(0);

    const unsold = await app.inject({
      method: "POST",
      url: "/api/auction/mark-unsold",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-mark-unsold-accepted" }
    });

    expect(unsold.statusCode).toBe(200);
    const body = unsold.json();
    expect(body.result).toEqual({
      command: "MarkUnsold",
      clientCommandId: "cmd-mark-unsold-accepted",
      message: `Marked unsold. ${revealed.state.currentPlayer.name} moves to Phase 2 rebid.`
    });
    expect(body.state).toMatchObject({
      phase: "InitialAuction",
      currentPlayer: null,
      currentBid: null,
      selectedTeamId: null,
      phase2PoolCount: 1,
      canUndo: true
    });
    expect(body.state.players.find((player: { id: string }) => player.id === playerId))
      .toMatchObject({
        status: "Unsold",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      });
    expect(
      body.state.teams.map(
        (team: {
          id: string;
          remainingBudget: number;
          squadCount: number;
          roleCounts: Record<string, number>;
        }) => ({
          id: team.id,
          remainingBudget: team.remainingBudget,
          squadCount: team.squadCount,
          roleCounts: team.roleCounts
        })
      )
    ).toEqual(
      teamsBefore.map(
        (team: {
          id: string;
          remainingBudget: number;
          squadCount: number;
          roleCounts: Record<string, number>;
        }) => ({
          id: team.id,
          remainingBudget: team.remainingBudget,
          squadCount: team.squadCount,
          roleCounts: team.roleCounts
        })
      )
    );
    expect(JSON.stringify(body)).not.toContain("private-player@example.com");
    expect(JSON.stringify(body)).not.toContain("UPI-PRIVATE");

    const repository = createAuctionRepository({
      databasePath: join(dataDirectory, "auction.db"),
      snapshotPath: join(dataDirectory, "snapshots/latest.json")
    });
    const markUnsoldEntries = repository
      .listActionLog()
      .filter((entry) => entry.command === "MarkUnsold");
    expect(markUnsoldEntries).toHaveLength(1);
    expect(markUnsoldEntries[0]).toMatchObject({
      clientCommandId: "cmd-mark-unsold-accepted",
      summary: body.result.message,
      undoable: true
    });
    expect(JSON.parse(markUnsoldEntries[0]?.payloadJson ?? "{}")).toMatchObject({
      command: "MarkUnsold",
      playerId,
      previous: {
        playerStatus: "Current",
        currentPlayerId: playerId,
        phase2Pool: []
      },
      next: {
        playerStatus: "Unsold",
        currentPlayerId: null,
        currentBid: null,
        selectedTeamId: null,
        phase2Pool: [playerId]
      },
      undo: {
        command: "MarkUnsold",
        playerId,
        previousPlayerStatus: "Current"
      }
    });
    expect(JSON.parse(await readFile(join(dataDirectory, "snapshots/latest.json"), "utf8")))
      .toMatchObject({
        currentPlayerId: null,
        currentBid: null,
        selectedTeamId: null,
        phase2Pool: [playerId]
      });

    const nextReveal = await app.inject({
      method: "POST",
      url: "/api/auction/reveal-next",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-reveal-after-unsold" }
    });
    expect(nextReveal.statusCode).toBe(200);
    expect(nextReveal.json().state.currentPlayer).toMatchObject({
      status: "Current"
    });

    repository.close();
    await app.close();
  });

  it("marks unsold with a selected team and raised bid, discarding both without team mutation", async () => {
    const dataDirectory = await mkdtemp(join(tmpdir(), "auction-manager-data-"));
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory
    });
    await stageValidSetup(app);
    const revealed = await startAndReveal(app);
    const playerId = revealed.state.currentPlayer.id;
    const team = revealed.state.teams[0];

    const selected = await app.inject({
      method: "POST",
      url: "/api/auction/select-team",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-select-before-unsold", teamId: team.id }
    });
    expect(selected.statusCode).toBe(200);

    const increased = await app.inject({
      method: "POST",
      url: "/api/auction/increase-bid",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-increase-before-unsold" }
    });
    expect(increased.statusCode).toBe(200);
    const raisedBid = increased.json().state.currentBid;

    const unsold = await app.inject({
      method: "POST",
      url: "/api/auction/mark-unsold",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-mark-unsold-discard" }
    });

    expect(unsold.statusCode).toBe(200);
    const body = unsold.json();
    expect(body.state).toMatchObject({
      currentPlayer: null,
      currentBid: null,
      selectedTeamId: null,
      phase2PoolCount: 1
    });
    expect(body.state.players.find((player: { id: string }) => player.id === playerId))
      .toMatchObject({
        status: "Unsold",
        soldPrice: null,
        winningTeamId: null,
        acquisitionType: null
      });
    expect(body.state.teams.find((candidate: { id: string }) => candidate.id === team.id))
      .toMatchObject({
        remainingBudget: team.remainingBudget,
        squadCount: team.squadCount,
        roleCounts: team.roleCounts
      });

    const repository = createAuctionRepository({
      databasePath: join(dataDirectory, "auction.db"),
      snapshotPath: join(dataDirectory, "snapshots/latest.json")
    });
    const entry = repository
      .listActionLog()
      .find((candidate) => candidate.command === "MarkUnsold");
    expect(JSON.parse(entry?.payloadJson ?? "{}")).toMatchObject({
      previous: {
        currentBid: raisedBid,
        selectedTeamId: team.id
      },
      undo: {
        previousCurrentBid: raisedBid,
        previousSelectedTeamId: team.id
      }
    });

    repository.close();
    await app.close();
  });

  it("rejects duplicate Mark Unsold command id with exactly one action-log row", async () => {
    const dataDirectory = await mkdtemp(join(tmpdir(), "auction-manager-data-"));
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory
    });
    await stageValidSetup(app);
    await startAndReveal(app);

    const first = await app.inject({
      method: "POST",
      url: "/api/auction/mark-unsold",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-mark-unsold-dup" }
    });
    expect(first.statusCode).toBe(200);

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/auction/mark-unsold",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-mark-unsold-dup" }
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({
      ok: false,
      error: "duplicate_client_command_id",
      message: "Mark Unsold was already submitted with this command id."
    });

    const repository = createAuctionRepository({
      databasePath: join(dataDirectory, "auction.db"),
      snapshotPath: join(dataDirectory, "snapshots/latest.json")
    });
    expect(
      repository.listActionLog().filter((entry) => entry.command === "MarkUnsold")
    ).toHaveLength(1);
    expect(repository.loadCurrentState()?.phase2Pool).toHaveLength(1);

    repository.close();
    await app.close();
  });

  it("validates Mark Unsold content type, request body, and prerequisite conflicts without mutation", async () => {
    const dataDirectory = await mkdtemp(join(tmpdir(), "auction-manager-data-"));
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory
    });

    const unsupported = await app.inject({
      method: "POST",
      url: "/api/auction/mark-unsold",
      headers: { "content-type": "text/plain" },
      payload: "mark unsold"
    });
    expect(unsupported.statusCode).toBe(415);

    const malformed = await app.inject({
      method: "POST",
      url: "/api/auction/mark-unsold",
      headers: { "content-type": "application/json" },
      payload: {}
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toMatchObject({ error: "invalid_request" });

    const inactive = await app.inject({
      method: "POST",
      url: "/api/auction/mark-unsold",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-mark-unsold-inactive" }
    });
    expect(inactive.statusCode).toBe(409);
    expect(inactive.json()).toMatchObject({
      error: "auction_not_active"
    });

    await stageValidSetup(app);
    const start = await app.inject({
      method: "POST",
      url: "/api/auction/start",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-start-1" }
    });
    expect(start.statusCode).toBe(200);

    const beforeState = (await app.inject({ method: "GET", url: "/api/state" }))
      .json().state;
    const beforeSnapshot = await readFile(
      join(dataDirectory, "snapshots/latest.json"),
      "utf8"
    );
    const repository = createAuctionRepository({
      databasePath: join(dataDirectory, "auction.db"),
      snapshotPath: join(dataDirectory, "snapshots/latest.json")
    });
    const beforeActionLog = repository.listActionLog();

    const noCurrentPlayer = await app.inject({
      method: "POST",
      url: "/api/auction/mark-unsold",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-mark-unsold-no-player" }
    });
    expect(noCurrentPlayer.statusCode).toBe(409);
    expect(noCurrentPlayer.json()).toEqual({
      ok: false,
      error: "current_player_required",
      message: "Reveal a Current Player before marking unsold."
    });

    const afterState = (await app.inject({ method: "GET", url: "/api/state" }))
      .json().state;
    const afterSnapshot = await readFile(
      join(dataDirectory, "snapshots/latest.json"),
      "utf8"
    );
    expect(afterState).toEqual(beforeState);
    expect(afterSnapshot).toBe(beforeSnapshot);
    expect(repository.listActionLog()).toEqual(beforeActionLog);
    expect(
      repository.listActionLog().some((entry) => entry.command === "MarkUnsold")
    ).toBe(false);

    repository.close();
    await app.close();
  });

  it("keeps InitialAuction phase with zero pending players after the last player is marked unsold", async () => {
    const dataDirectory = await mkdtemp(join(tmpdir(), "auction-manager-data-"));
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture(),
      dataDirectory
    });
    await stageValidSetup(app);
    const revealed = await startAndReveal(app);
    const orderedPlayerCount = revealed.state.phase1Progress.orderedPlayerCount;

    let latestState = revealed.state;
    for (let index = 0; index < orderedPlayerCount; index += 1) {
      if (latestState.currentPlayer === null) {
        const reveal = await app.inject({
          method: "POST",
          url: "/api/auction/reveal-next",
          headers: { "content-type": "application/json" },
          payload: { clientCommandId: `cmd-reveal-last-${index}` }
        });
        expect(reveal.statusCode).toBe(200);
        latestState = reveal.json().state;
      }

      const unsold = await app.inject({
        method: "POST",
        url: "/api/auction/mark-unsold",
        headers: { "content-type": "application/json" },
        payload: { clientCommandId: `cmd-mark-unsold-last-${index}` }
      });
      expect(unsold.statusCode).toBe(200);
      latestState = unsold.json().state;
    }

    expect(latestState).toMatchObject({
      phase: "InitialAuction",
      currentPlayer: null,
      phase2PoolCount: orderedPlayerCount,
      phase1Progress: {
        pendingPlayerCount: 0
      }
    });

    const blockedReveal = await app.inject({
      method: "POST",
      url: "/api/auction/reveal-next",
      headers: { "content-type": "application/json" },
      payload: { clientCommandId: "cmd-reveal-after-complete" }
    });
    expect(blockedReveal.statusCode).toBe(409);
    expect(blockedReveal.json()).toMatchObject({
      error: "no_pending_phase1_players"
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
