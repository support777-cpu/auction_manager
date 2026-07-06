import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createPlayerCsvRow,
  playerCsvHeaders,
  samplePlayerCsvRows,
  toCsv
} from "@auction-manager/test-fixtures";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { matchPlayerPhotosForSetup, parsePlayerCsvForSetupStaging } from "./index.js";

const mediaManifestPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/media-manifest.json"
);

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Player photo matching adapter", () => {
  it("matches by Photo Upload metadata first and stores normalized assets under opaque IDs", async () => {
    const manifest = JSON.parse(await readFile(mediaManifestPath, "utf8")) as {
      playerPhotos: { playerName: string; sourceFile: string; matchStatus: string }[];
    };
    const staging = parsePlayerCsvForSetupStaging(
      toCsv(playerCsvHeaders, samplePlayerCsvRows.slice(0, 3))
    );
    const assetDirectory = await createTempDirectory();
    const review = await matchPlayerPhotosForSetup({
      players: staging.players,
      uploadedFiles: [
        await createUploadedPhoto("aarav_menon.jpg", "jpeg"),
        await createUploadedPhoto("neha_rao.png", "png"),
        await createUploadedPhoto("meera_iyer.webp", "webp")
      ],
      assetDirectory,
      generateAssetId: (player) => `asset-${player.name.toLowerCase().replaceAll(" ", "-")}`
    });

    const expectedMatchedNames = manifest.playerPhotos
      .filter((photo) => photo.matchStatus === "matched")
      .map((photo) => photo.playerName);

    expect(review.players.map((player) => player.player.name)).toEqual(expectedMatchedNames);
    expect(review.players.every((player) => player.status === "matched")).toBe(true);
    for (const record of review.players) {
      expect(record.photoAssetId).toMatch(/^asset-/);
      expect(JSON.stringify(record)).not.toContain("_menon.jpg");
      expect(JSON.stringify(record)).not.toContain("Photo Upload");
      await expect(stat(join(assetDirectory, `${record.photoAssetId}.webp`))).resolves.toMatchObject({
        isFile: expect.any(Function)
      });
    }
    expect(review.summary).toMatchObject({
      totalPlayers: 3,
      matchedPhotos: 3,
      placeholderPhotos: 0,
      startAuctionBlocked: false
    });
  });

  it("matches unique uploaded filenames that contain normalized player names", async () => {
    const staging = parsePlayerCsvForSetupStaging(
      toCsv(playerCsvHeaders, [
        createPlayerCsvRow({
          "Full Name": "Aarav Menon",
          "Photo Upload": ""
        })
      ])
    );
    const assetDirectory = await createTempDirectory();
    const review = await matchPlayerPhotosForSetup({
      players: staging.players,
      uploadedFiles: [await createUploadedPhoto("aarav-menon (1).png", "png")],
      assetDirectory,
      generateAssetId: () => "asset-aarav"
    });

    expect(review.players).toEqual([
      expect.objectContaining({
        status: "matched",
        photoAssetId: "asset-aarav"
      })
    ]);
  });

  it("classifies missing, ambiguous, and unmatched photos as placeholder-compatible", async () => {
    const staging = parsePlayerCsvForSetupStaging(
      toCsv(playerCsvHeaders, [
        createPlayerCsvRow({
          "Full Name": "Dev Patel",
          Skill: "Bowling",
          "Photo Upload": ""
        }),
        createPlayerCsvRow({
          "Full Name": "Anika Sen",
          Gender: "Female",
          Skill: "All Rounder",
          "Photo Upload": "anika_sen.jpg"
        })
      ])
    );
    const review = await matchPlayerPhotosForSetup({
      players: staging.players,
      uploadedFiles: [
        await createUploadedPhoto("anika_sen.jpg", "jpeg"),
        await createUploadedPhoto("anika_sen_copy.jpg", "jpeg"),
        await createUploadedPhoto("unknown_player.jpg", "jpeg")
      ],
      assetDirectory: await createTempDirectory(),
      generateAssetId: () => "unused"
    });

    expect(review.players.map((record) => [record.player.name, record.status])).toEqual([
      ["Dev Patel", "missing_uses_placeholder"],
      ["Anika Sen", "matched"]
    ]);
    expect(review.issueGroups.find((group) => group.severity === "can_proceed_with_placeholder")?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_player_photo",
          playerName: "Dev Patel"
        }),
        expect.objectContaining({
          code: "unmatched_photo_file",
          message: expect.stringContaining("anika_sen_copy.jpg")
        }),
        expect.objectContaining({
          code: "unmatched_photo_file",
          message: expect.stringContaining("unknown_player.jpg")
        })
      ])
    );
    expect(
      review.issueGroups
        .find((group) => group.severity === "can_proceed_with_placeholder")
        ?.issues.some((issue) => issue.code === "ambiguous_photo_match")
    ).toBe(false);
    expect(review.summary).toMatchObject({
      matchedPhotos: 1,
      placeholderPhotos: 1,
      startAuctionBlocked: false
    });
  });

  it("lists candidate filenames in ambiguous match issues when metadata does not resolve uniquely", async () => {
    const staging = parsePlayerCsvForSetupStaging(
      toCsv(playerCsvHeaders, [
        createPlayerCsvRow({
          "Full Name": "Anika Sen",
          Gender: "Female",
          Skill: "All Rounder",
          "Photo Upload": ""
        })
      ])
    );
    const review = await matchPlayerPhotosForSetup({
      players: staging.players,
      uploadedFiles: [
        await createUploadedPhoto("anika_sen.jpg", "jpeg"),
        await createUploadedPhoto("anika_sen_copy.jpg", "jpeg")
      ],
      assetDirectory: await createTempDirectory()
    });

    expect(review.players[0]?.status).toBe("ambiguous_uses_placeholder");
    expect(review.issueGroups.find((group) => group.severity === "can_proceed_with_placeholder")?.issues).toEqual([
      expect.objectContaining({
        code: "ambiguous_photo_match",
        message: expect.stringMatching(/anika_sen\.jpg.*anika_sen_copy\.jpg|anika_sen_copy\.jpg.*anika_sen\.jpg/)
      })
    ]);
  });

  it("does not guess when one uploaded file matches multiple players", async () => {
    const staging = parsePlayerCsvForSetupStaging(
      toCsv(playerCsvHeaders, [
        createPlayerCsvRow({
          "Full Name": "Aarav",
          "Photo Upload": ""
        }),
        createPlayerCsvRow({
          "Full Name": "Aarav Menon",
          "Photo Upload": ""
        })
      ])
    );
    const review = await matchPlayerPhotosForSetup({
      players: staging.players,
      uploadedFiles: [await createUploadedPhoto("aarav_menon.jpg", "jpeg")],
      assetDirectory: await createTempDirectory()
    });

    expect(review.players.every((record) => record.status === "ambiguous_uses_placeholder")).toBe(true);
    expect(review.summary).toMatchObject({
      matchedPhotos: 0,
      placeholderPhotos: 2,
      startAuctionBlocked: false
    });
  });

  it("accepts HEIC filenames but falls back to placeholder when sharp cannot decode them", async () => {
    const staging = parsePlayerCsvForSetupStaging(
      toCsv(playerCsvHeaders, [
        createPlayerCsvRow({
          "Full Name": "Rohan Das",
          Skill: "Bowling",
          "Photo Upload": "rohan_das.heic"
        })
      ])
    );
    const review = await matchPlayerPhotosForSetup({
      players: staging.players,
      uploadedFiles: [
        {
          filename: "rohan_das.heic",
          detectedFormat: "heic",
          content: Buffer.from("not-decodable-heic")
        }
      ],
      assetDirectory: await createTempDirectory()
    });

    expect(review.players).toEqual([
      expect.objectContaining({
        status: "undecodable_uses_placeholder"
      })
    ]);
    expect(review.players[0]).not.toHaveProperty("photoAssetId");
    expect(review.issueGroups.find((group) => group.severity === "can_proceed_with_placeholder")?.issues).toEqual([
      expect.objectContaining({
        code: "photo_not_decodable",
        message: expect.stringContaining("convert the photo to JPEG"),
        playerName: "Rohan Das"
      })
    ]);
  });

  it("prefers a unique Photo Upload metadata match without false ambiguity from name matches", async () => {
    const staging = parsePlayerCsvForSetupStaging(
      toCsv(playerCsvHeaders, [
        createPlayerCsvRow({
          "Full Name": "Aarav Menon",
          "Photo Upload": "aarav_menon.jpg"
        })
      ])
    );
    const assetDirectory = await createTempDirectory();
    const review = await matchPlayerPhotosForSetup({
      players: staging.players,
      uploadedFiles: [
        await createUploadedPhoto("aarav_menon.jpg", "jpeg"),
        await createUploadedPhoto("aarav_menon_copy.jpg", "jpeg")
      ],
      assetDirectory,
      generateAssetId: () => "asset-aarav"
    });

    expect(review.players).toEqual([
      expect.objectContaining({
        status: "matched",
        photoAssetId: "asset-aarav"
      })
    ]);
  });

  it("does not name-match players whose normalized names are empty", async () => {
    const staging = parsePlayerCsvForSetupStaging(
      toCsv(playerCsvHeaders, [
        createPlayerCsvRow({
          "Full Name": "...",
          "Photo Upload": ""
        })
      ])
    );
    const review = await matchPlayerPhotosForSetup({
      players: staging.players,
      uploadedFiles: [await createUploadedPhoto("aarav_menon.jpg", "jpeg")],
      assetDirectory: await createTempDirectory()
    });

    expect(review.players[0]?.status).toBe("missing_uses_placeholder");
  });

  it("reports storage failures without leaking filesystem paths", async () => {
    const staging = parsePlayerCsvForSetupStaging(
      toCsv(playerCsvHeaders, [
        createPlayerCsvRow({
          "Full Name": "Aarav Menon",
          "Photo Upload": "aarav_menon.jpg"
        })
      ])
    );
    const tempRoot = await createTempDirectory();
    const assetDirectory = join(tempRoot, "not-a-directory");
    await writeFile(assetDirectory, "file");
    const review = await matchPlayerPhotosForSetup({
      players: staging.players,
      uploadedFiles: [await createUploadedPhoto("aarav_menon.jpg", "jpeg")],
      assetDirectory
    });

    const serialized = JSON.stringify(review);
    expect(review.players[0]?.status).toBe("missing_uses_placeholder");
    expect(review.issueGroups.find((group) => group.severity === "can_proceed_with_placeholder")?.issues).toEqual([
      expect.objectContaining({
        code: "photo_storage_failed",
        playerName: "Aarav Menon"
      })
    ]);
    expect(serialized).not.toContain(assetDirectory);
    expect(serialized).not.toContain("aarav_menon.jpg");
  });
});

async function createUploadedPhoto(
  filename: string,
  detectedFormat: "jpeg" | "png" | "webp"
) {
  const image = sharp({
    create: {
      width: 24,
      height: 24,
      channels: 3,
      background: "#d9e8ff"
    }
  });
  const content =
    detectedFormat === "jpeg"
      ? await image.jpeg().toBuffer()
      : detectedFormat === "png"
        ? await image.png().toBuffer()
        : await image.webp().toBuffer();

  return {
    filename,
    detectedFormat,
    content
  };
}

async function createTempDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "auction-player-photos-"));
  tempDirectories.push(directory);
  return directory;
}
