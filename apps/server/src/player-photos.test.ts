import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPlayerCsvRow, playerCsvHeaders, toCsv } from "@auction-manager/test-fixtures";
import { afterEach, describe, expect, it } from "vitest";
import { createAuctionManagerServer } from "./app.js";

const validCsvPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/players-valid.csv"
);
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64"
);

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("setup Player photo upload route", () => {
  it("returns 409 when photos are uploaded before a Player CSV review exists", async () => {
    const app = await createTestServer();

    const response = await app.inject({
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

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      ok: false,
      error: "player_csv_required",
      message: "Import the Player CSV before uploading Player photos."
    });

    await app.close();
  });

  it("matches uploaded photos after CSV preview and serves normalized assets by internal ID", async () => {
    const { app, dataDirectory } = await createTestServerWithDataDirectory();
    await importValidPlayerCsv(app);

    const response = await app.inject({
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

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.summary).toMatchObject({
      totalPlayers: 8,
      matchedPhotos: 1,
      placeholderPhotos: 7,
      startAuctionBlocked: false
    });
    const aarav = body.players.find((player: { player: { name: string } }) => player.player.name === "Aarav Menon");
    expect(aarav).toMatchObject({
      status: "matched",
      photoAssetId: expect.any(String)
    });
    expect(JSON.stringify(body)).not.toContain("Photo Upload");
    expect(JSON.stringify(body)).not.toContain("aarav_menon.jpg");
    await expect(readFile(join(dataDirectory, "assets/players", `${aarav.photoAssetId}.webp`))).resolves.toBeInstanceOf(Buffer);

    const assetResponse = await app.inject({
      method: "GET",
      url: `/assets/players/${aarav.photoAssetId}.webp`
    });
    expect(assetResponse.statusCode).toBe(200);
    expect(assetResponse.headers["content-type"]).toContain("image/webp");

    await app.close();
  });

  it("replaces staged players and clears prior photo match state when Player CSV is reimported", async () => {
    const { app, dataDirectory } = await createTestServerWithDataDirectory();
    await importValidPlayerCsv(app);

    const firstPhotoResponse = await app.inject({
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
    const firstBody = firstPhotoResponse.json();
    expect(firstBody.summary).toMatchObject({
      matchedPhotos: 1
    });
    const firstAssetId = firstBody.players.find(
      (player: { player: { name: string } }) => player.player.name === "Aarav Menon"
    )?.photoAssetId as string;
    await expect(readFile(join(dataDirectory, "assets/players", `${firstAssetId}.webp`))).resolves.toBeInstanceOf(
      Buffer
    );

    const reimportResponse = await app.inject({
      method: "POST",
      url: "/api/setup/player-csv/preview",
      headers: { "content-type": "text/csv" },
      payload: toCsv(playerCsvHeaders, [
        createPlayerCsvRow({
          "Full Name": "Dev Patel",
          Skill: "Bowling",
          "Photo Upload": ""
        })
      ])
    });
    expect(reimportResponse.statusCode).toBe(200);

    const secondPhotoResponse = await app.inject({
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

    expect(secondPhotoResponse.statusCode).toBe(200);
    expect(secondPhotoResponse.json().players.map((record: { player: { name: string } }) => record.player.name)).toEqual([
      "Dev Patel"
    ]);
    expect(secondPhotoResponse.json().summary).toMatchObject({
      totalPlayers: 1,
      matchedPhotos: 0,
      placeholderPhotos: 1,
      startAuctionBlocked: false
    });
    await expect(readFile(join(dataDirectory, "assets/players", `${firstAssetId}.webp`))).rejects.toThrow();

    await app.close();
  });

  it("clears staged CSV when a blocked reimport arrives so photos cannot match stale players", async () => {
    const app = await createTestServer();
    await importValidPlayerCsv(app);

    const blockedReimportResponse = await app.inject({
      method: "POST",
      url: "/api/setup/player-csv/preview",
      headers: { "content-type": "text/csv" },
      payload: toCsv(playerCsvHeaders, [
        createPlayerCsvRow({
          "Full Name": "",
          Skill: "Ace"
        })
      ])
    });
    expect(blockedReimportResponse.statusCode).toBe(200);
    expect(blockedReimportResponse.json().summary.startAuctionBlocked).toBe(true);

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

    expect(photoResponse.statusCode).toBe(409);
    await app.close();
  });

  it("rejects empty multipart uploads without clearing staged CSV", async () => {
    const app = await createTestServer();
    await importValidPlayerCsv(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/player-photos",
      ...multipartRequest([])
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      error: "no_photo_files"
    });

    await app.close();
  });

  it("accepts valid photo extensions sent as application/octet-stream", async () => {
    const app = await createTestServer();
    await importValidPlayerCsv(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/player-photos",
      ...multipartRequest([
        {
          name: "photos",
          filename: "aarav_menon.jpg",
          contentType: "application/octet-stream",
          content: tinyPng
        }
      ])
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().summary.matchedPhotos).toBe(1);

    await app.close();
  });

  it("rejects unsupported photo formats without writing files", async () => {
    const { app, dataDirectory } = await createTestServerWithDataDirectory();
    await importValidPlayerCsv(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/player-photos",
      ...multipartRequest([
        {
          name: "photos",
          filename: "script.svg",
          contentType: "image/svg+xml",
          content: Buffer.from("<svg />")
        }
      ])
    });

    expect(response.statusCode).toBe(415);
    expect(response.json()).toMatchObject({
      ok: false,
      error: "unsupported_photo_format"
    });
    await expect(readFile(join(dataDirectory, "assets/players/script.svg"))).rejects.toThrow();

    await app.close();
  });

  it("rejects path traversal filenames before storage", async () => {
    const app = await createTestServer();
    await importValidPlayerCsv(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/player-photos",
      ...multipartRequest([
        {
          name: "photos",
          filename: "../outside.png",
          contentType: "image/png",
          content: tinyPng
        }
      ])
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      error: "invalid_photo_filename"
    });

    await app.close();
  });

  it("rejects oversized files and too many files with clear 4xx responses", async () => {
    const app = await createTestServer();
    await importValidPlayerCsv(app);

    const oversizedResponse = await app.inject({
      method: "POST",
      url: "/api/setup/player-photos",
      ...multipartRequest([
        {
          name: "photos",
          filename: "oversize-player-photo.jpg",
          contentType: "image/jpeg",
          content: Buffer.alloc(11 * 1024 * 1024)
        }
      ])
    });
    expect(oversizedResponse.statusCode).toBe(413);
    expect(oversizedResponse.json()).toMatchObject({
      ok: false,
      error: "upload_too_large"
    });

    const tooManyFilesResponse = await app.inject({
      method: "POST",
      url: "/api/setup/player-photos",
      ...multipartRequest(
        Array.from({ length: 201 }, (_, index) => ({
          name: "photos",
          filename: `photo-${index}.jpg`,
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

  it("rejects asset traversal and arbitrary filesystem paths", async () => {
    const app = await createTestServer();

    const traversalResponse = await app.inject({
      method: "GET",
      url: "/assets/players/../../private.csv"
    });
    expect([400, 404]).toContain(traversalResponse.statusCode);

    const encodedTraversalResponse = await app.inject({
      method: "GET",
      url: "/assets/players/%2e%2e/private.csv"
    });
    expect([400, 404]).toContain(encodedTraversalResponse.statusCode);

    const arbitraryPathResponse = await app.inject({
      method: "GET",
      url: "/assets/players/%2FUsers%2Foperator%2FDesktop%2Faarav_menon.jpg"
    });
    expect([400, 404]).toContain(arbitraryPathResponse.statusCode);

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

async function importValidPlayerCsv(app: Awaited<ReturnType<typeof createAuctionManagerServer>>) {
  const response = await app.inject({
    method: "POST",
    url: "/api/setup/player-csv/preview",
    headers: { "content-type": "text/csv" },
    payload: await readFile(validCsvPath, "utf8")
  });
  expect(response.statusCode).toBe(200);
}

function multipartRequest(files: readonly MultipartFile[]) {
  const boundary = "auction-manager-test-boundary";
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
