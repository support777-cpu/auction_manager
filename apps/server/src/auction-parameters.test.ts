import {
  createPlayerCsvRow,
  createTeamCsvRow,
  playerCsvHeaders,
  teamCsvHeaders,
  toCsv
} from "@auction-manager/test-fixtures";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAuctionManagerServer } from "./app.js";
import { auctionParameterReviewResponseSchema } from "@auction-manager/shared";

const defaultParameters = {
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
};

describe("auction parameter setup routes", () => {
  it("returns the default parameter review before any draft is saved", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/setup/auction-parameters"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      parameters: defaultParameters,
      blockingReasons: [
        expect.objectContaining({
          code: "no_imported_teams"
        })
      ],
      startAuctionBlocked: true
    });

    await app.close();
  });

  it("saves a valid parameter draft and returns the current staged review", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });
    await stageValidSourceData(app);

    const saveResponse = await app.inject({
      method: "POST",
      url: "/api/setup/auction-parameters",
      headers: { "content-type": "application/json" },
      payload: {
        ...defaultParameters,
        bidIncrement: 5,
        teamBudget: 200
      }
    });

    expect(saveResponse.statusCode).toBe(200);
    expect(saveResponse.json()).toMatchObject({
      parameters: {
        bidIncrement: 5,
        teamBudget: 200
      },
      blockingReasons: [],
      reasonsByField: {},
      startAuctionBlocked: false
    });

    const getResponse = await app.inject({
      method: "GET",
      url: "/api/setup/auction-parameters"
    });
    expect(getResponse.json().parameters.bidIncrement).toBe(5);

    await app.close();
  });

  it("rejects invalid drafts with specific parameter reasons", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });
    await stageValidSourceData(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/auction-parameters",
      headers: { "content-type": "application/json" },
      payload: {
        ...defaultParameters,
        bidIncrement: 0,
        roleTargets: {
          Ace: 3,
          Batting: 3,
          Bowling: 3,
          AllRounder: 3,
          Girls: 3
        }
      }
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toMatchObject({
      startAuctionBlocked: true,
      blockingReasons: expect.arrayContaining([
        expect.objectContaining({
          code: "invalid_bid_increment",
          field: "bidIncrement"
        }),
        expect.objectContaining({
          code: "role_targets_exceed_max_squad_size",
          field: "roleTargets"
        })
      ])
    });
    expect(auctionParameterReviewResponseSchema.safeParse(body).success).toBe(true);

    await app.close();
  });

  it("rejects non-object parameter save bodies", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/auction-parameters",
      headers: { "content-type": "application/json" },
      payload: "[]"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      ok: false,
      error: "invalid_request",
      message: "Auction Parameters must be submitted as a JSON object."
    });

    await app.close();
  });

  it("previews parameter drafts without persisting them", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });
    await stageValidSourceData(app);

    const previewResponse = await app.inject({
      method: "POST",
      url: "/api/setup/auction-parameters/preview",
      headers: { "content-type": "application/json" },
      payload: {
        ...defaultParameters,
        bidIncrement: 0
      }
    });

    expect(previewResponse.statusCode).toBe(200);
    expect(previewResponse.json().startAuctionBlocked).toBe(true);

    const getResponse = await app.inject({
      method: "GET",
      url: "/api/setup/auction-parameters"
    });
    expect(getResponse.json().parameters.bidIncrement).toBe(2);

    await app.close();
  });

  it("returns combined setup readiness from staged imports and parameters", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });

    const blockedResponse = await app.inject({
      method: "GET",
      url: "/api/setup/readiness"
    });
    expect(blockedResponse.json().startAuctionBlocked).toBe(true);
    expect(blockedResponse.json().primaryBlockerMessage).toContain("Player CSV");

    await stageValidSourceData(app);
    await app.inject({
      method: "POST",
      url: "/api/setup/auction-parameters",
      headers: { "content-type": "application/json" },
      payload: defaultParameters
    });

    const readyResponse = await app.inject({
      method: "GET",
      url: "/api/setup/readiness"
    });
    expect(readyResponse.json()).toMatchObject({
      startAuctionBlocked: false,
      story16Ready: true
    });

    await app.close();
  });

  it("rejects unsupported content types for parameter saves", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/auction-parameters",
      headers: { "content-type": "text/plain" },
      payload: JSON.stringify(defaultParameters)
    });

    expect(response.statusCode).toBe(415);
    expect(response.json()).toEqual({
      ok: false,
      error: "unsupported_content_type",
      message: "Save Auction Parameters as application/json."
    });

    await app.close();
  });

  it("checks imported player roles when validating role base prices", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });
    await stageValidSourceData(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/auction-parameters",
      headers: { "content-type": "application/json" },
      payload: {
        ...defaultParameters,
        roleBasePrices: {
          Ace: 10,
          Batting: 8,
          AllRounder: 6,
          Girls: 6,
          Bowling: null
        }
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().blockingReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_role_base_price",
          field: "roleBasePrices.Bowling",
          message: "Base price is missing for Bowling."
        })
      ])
    );

    await app.close();
  });
});

async function stageValidSourceData(app: Awaited<ReturnType<typeof createAuctionManagerServer>>) {
  await app.inject({
    method: "POST",
    url: "/api/setup/player-csv/preview",
    headers: { "content-type": "text/csv" },
    payload: toCsv(playerCsvHeaders, [
      createPlayerCsvRow({ "Full Name": "Aarav Menon", Skill: "Ace" }),
      createPlayerCsvRow({ "Full Name": "Rohan Das", Skill: "Bowling" })
    ])
  });

  await app.inject({
    method: "POST",
    url: "/api/setup/team-csv/preview",
    headers: { "content-type": "text/csv" },
    payload: toCsv(teamCsvHeaders, [
      createTeamCsvRow({ Team: "Falcons", Captain: "Priya Captain" }),
      createTeamCsvRow({ Team: "Tigers", Captain: "Rahul Captain" })
    ])
  });
}

async function createWebDistFixture() {
  const webDistPath = await mkdtemp(join(tmpdir(), "auction-manager-web-dist-"));
  await writeFile(
    join(webDistPath, "index.html"),
    '<!doctype html><html><body><div id="root">Auction Manager</div></body></html>'
  );

  return webDistPath;
}
