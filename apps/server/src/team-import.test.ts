import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createPlayerCsvRow,
  playerCsvHeaders,
  toCsv
} from "@auction-manager/test-fixtures";
import { afterEach, describe, expect, it } from "vitest";
import { createAuctionManagerServer } from "./app.js";

const validTeamCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/teams-valid.csv"
);
const invalidTeamCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/teams-invalid.csv"
);
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64"
);

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("setup Team import routes", () => {
  it("returns a reviewable privacy-safe preview for valid Team CSV", async () => {
    const app = await createTestServer();

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/team-csv/preview",
      headers: { "content-type": "text/csv" },
      payload: await readFile(validTeamCsvPath, "utf8")
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      summary: {
        totalRows: 4,
        importedTeams: 4,
        mustFixCount: 0,
        startAuctionBlocked: false
      },
      teams: [
        { sourceRowNumber: 2, name: "Falcons", captain: "Priya Captain" },
        { sourceRowNumber: 3, name: "Tigers", captain: "Rahul Captain" },
        { sourceRowNumber: 4, name: "Royals", captain: "Anita Captain" },
        { sourceRowNumber: 5, name: "Warriors", captain: "Joel Captain" }
      ]
    });

    await app.close();
  });

  it("returns must_fix Team CSV issues and clears Team staging", async () => {
    const app = await createTestServer();
    await importValidTeamCsv(app);

    const invalidResponse = await app.inject({
      method: "POST",
      url: "/api/setup/team-csv/preview",
      headers: { "content-type": "text/csv" },
      payload: await readFile(invalidTeamCsvPath, "utf8")
    });
    expect(invalidResponse.statusCode).toBe(200);
    expect(invalidResponse.json().summary).toMatchObject({
      importedTeams: 0,
      mustFixCount: 3,
      startAuctionBlocked: true
    });

    const logoResponse = await app.inject({
      method: "POST",
      url: "/api/setup/team-logos",
      ...multipartRequest([
        {
          name: "logos",
          filename: "falcons.png",
          contentType: "image/png",
          content: tinyPng
        }
      ])
    });
    expect(logoResponse.statusCode).toBe(409);

    await app.close();
  });

  it("returns 409 when logos are uploaded before a Team CSV review exists", async () => {
    const app = await createTestServer();

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/team-logos",
      ...multipartRequest([
        {
          name: "logos",
          filename: "falcons.png",
          contentType: "image/png",
          content: tinyPng
        }
      ])
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      ok: false,
      error: "team_csv_required",
      message: "Import the Team CSV before uploading Team logos."
    });

    await app.close();
  });

  it("matches uploaded logos after Team CSV preview and serves normalized assets by internal ID", async () => {
    const { app, dataDirectory } = await createTestServerWithDataDirectory();
    await importValidTeamCsv(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/team-logos",
      ...multipartRequest([
        {
          name: "logos",
          filename: "falcons.png",
          contentType: "image/png",
          content: tinyPng
        }
      ])
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.summary).toMatchObject({
      totalTeams: 4,
      matchedLogos: 1,
      placeholderLogos: 3,
      startAuctionBlocked: false
    });
    const falcons = body.teams.find((team: { team: { name: string } }) => team.team.name === "Falcons");
    expect(falcons).toMatchObject({
      status: "matched",
      logoAssetId: expect.any(String)
    });
    expect(JSON.stringify(body)).not.toContain("falcons.png");
    await expect(readFile(join(dataDirectory, "assets/teams", `${falcons.logoAssetId}.webp`))).resolves.toBeInstanceOf(Buffer);

    const assetResponse = await app.inject({
      method: "GET",
      url: `/assets/teams/${falcons.logoAssetId}.webp`
    });
    expect(assetResponse.statusCode).toBe(200);
    expect(assetResponse.headers["content-type"]).toContain("image/webp");

    await app.close();
  });

  it("rejects unsupported logo formats, traversal filenames, oversized files, and file-count overflow", async () => {
    const { app, dataDirectory } = await createTestServerWithDataDirectory();
    await importValidTeamCsv(app);

    const unsupportedResponse = await app.inject({
      method: "POST",
      url: "/api/setup/team-logos",
      ...multipartRequest([
        {
          name: "logos",
          filename: "script.svg",
          contentType: "image/svg+xml",
          content: Buffer.from("<svg />")
        }
      ])
    });
    expect(unsupportedResponse.statusCode).toBe(415);
    expect(unsupportedResponse.json()).toMatchObject({
      ok: false,
      error: "unsupported_logo_format"
    });
    await expect(readFile(join(dataDirectory, "assets/teams/script.svg"))).rejects.toThrow();

    const traversalResponse = await app.inject({
      method: "POST",
      url: "/api/setup/team-logos",
      ...multipartRequest([
        {
          name: "logos",
          filename: "../outside.png",
          contentType: "image/png",
          content: tinyPng
        }
      ])
    });
    expect(traversalResponse.statusCode).toBe(400);
    expect(traversalResponse.json()).toMatchObject({
      ok: false,
      error: "invalid_logo_filename"
    });

    const oversizedResponse = await app.inject({
      method: "POST",
      url: "/api/setup/team-logos",
      ...multipartRequest([
        {
          name: "logos",
          filename: "oversize-team-logo.jpg",
          contentType: "image/jpeg",
          content: Buffer.alloc(11 * 1024 * 1024)
        }
      ])
    });
    expect(oversizedResponse.statusCode).toBe(413);
    expect(oversizedResponse.json()).toMatchObject({
      ok: false,
      error: "upload_too_large",
      message: "A Team logo exceeds the 10 MB upload limit."
    });

    const tooManyFilesResponse = await app.inject({
      method: "POST",
      url: "/api/setup/team-logos",
      ...multipartRequest(
        Array.from({ length: 201 }, (_, index) => ({
          name: "logos",
          filename: `logo-${index}.jpg`,
          contentType: "image/jpeg",
          content: tinyPng
        }))
      )
    });
    expect(tooManyFilesResponse.statusCode).toBeGreaterThanOrEqual(400);
    expect(tooManyFilesResponse.statusCode).toBeLessThan(500);
    expect(tooManyFilesResponse.json().ok).toBe(false);

    await app.close();
  });

  it("rejects Team CSV unsupported content type and oversized uploads with Team-specific copy", async () => {
    const app = await createTestServer();

    const unsupportedResponse = await app.inject({
      method: "POST",
      url: "/api/setup/team-csv/preview",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ csv: "Team,Captain\nFalcons,Priya Captain\n" })
    });
    expect(unsupportedResponse.statusCode).toBe(415);
    expect(unsupportedResponse.json()).toEqual({
      ok: false,
      error: "unsupported_content_type",
      message: "Upload the Team CSV as text/csv."
    });

    const oversizedResponse = await app.inject({
      method: "POST",
      url: "/api/setup/team-csv/preview",
      headers: { "content-type": "text/csv" },
      payload: `Team,Captain\n${"A".repeat(300_000)},Priya Captain\n`
    });
    expect(oversizedResponse.statusCode).toBe(413);
    expect(oversizedResponse.json()).toEqual({
      ok: false,
      error: "upload_too_large",
      message: "Team CSV exceeds the 256 KB upload limit."
    });

    await app.close();
  });

  it("rejects Team logo asset traversal requests", async () => {
    const app = await createTestServer();

    const traversalResponse = await app.inject({
      method: "GET",
      url: "/assets/teams/../../private.csv"
    });
    expect([400, 404]).toContain(traversalResponse.statusCode);

    const encodedTraversalResponse = await app.inject({
      method: "GET",
      url: "/assets/teams/%252e%252e/private.csv"
    });
    expect(encodedTraversalResponse.statusCode).toBe(400);
    expect(encodedTraversalResponse.json()).toEqual({
      ok: false,
      error: "invalid_asset_path"
    });

    await app.close();
  });

  it("keeps player and Team setup staging independent", async () => {
    const app = await createTestServer();

    const playerCsvResponse = await app.inject({
      method: "POST",
      url: "/api/setup/player-csv/preview",
      headers: { "content-type": "text/csv" },
      payload: toCsv(playerCsvHeaders, [
        createPlayerCsvRow({
          "Full Name": "Aarav Menon",
          "Photo Upload": "aarav_menon.jpg"
        })
      ])
    });
    expect(playerCsvResponse.statusCode).toBe(200);

    await importValidTeamCsv(app);

    const photoResponse = await app.inject({
      method: "POST",
      url: "/api/setup/player-photos",
      ...multipartRequest([
        {
          name: "photos",
          filename: "aarav_menon.jpg",
          contentType: "image/jpeg",
          content: tinyPng
        }
      ])
    });
    expect(photoResponse.statusCode).toBe(200);
    expect(photoResponse.json().summary.matchedPhotos).toBe(1);

    await app.close();
  });
});

async function createTestServer() {
  return createAuctionManagerServer({
    webDistPath: await createWebDistFixture(),
    dataDirectory: await createTempDirectory()
  });
}

async function createTestServerWithDataDirectory() {
  const dataDirectory = await createTempDirectory();
  const app = await createAuctionManagerServer({
    webDistPath: await createWebDistFixture(),
    dataDirectory
  });

  return { app, dataDirectory };
}

async function importValidTeamCsv(app: Awaited<ReturnType<typeof createAuctionManagerServer>>) {
  const response = await app.inject({
    method: "POST",
    url: "/api/setup/team-csv/preview",
    headers: { "content-type": "text/csv" },
    payload: await readFile(validTeamCsvPath, "utf8")
  });
  expect(response.statusCode).toBe(200);
}

function multipartRequest(files: readonly MultipartFile[]) {
  const boundary = "auction-manager-team-test-boundary";
  return {
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`
    },
    payload: Buffer.concat(files.flatMap((file) => multipartFileChunks(boundary, file)).concat([
      Buffer.from(`--${boundary}--\r\n`)
    ]))
  };
}

function multipartFileChunks(boundary: string, file: MultipartFile): Buffer[] {
  return [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`
    ),
    file.content,
    Buffer.from("\r\n")
  ];
}

interface MultipartFile {
  readonly name: string;
  readonly filename: string;
  readonly contentType: string;
  readonly content: Buffer;
}

async function createWebDistFixture() {
  const webDistPath = await createTempDirectory();
  await writeFile(
    join(webDistPath, "index.html"),
    '<!doctype html><html><body><div id="root">Auction Manager</div></body></html>'
  );

  return webDistPath;
}

async function createTempDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "auction-manager-server-"));
  tempDirectories.push(directory);
  return directory;
}
