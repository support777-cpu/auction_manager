import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createTeamCsvRow,
  sampleTeamCsvRows,
  teamCsvHeaders,
  toCsv
} from "@auction-manager/test-fixtures";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { matchTeamLogosForSetup, parseTeamCsvForSetupStaging } from "./index.js";

const mediaManifestPath = join(
  process.cwd(),
  "_bmad-output/test-artifacts/sample-test-data/media-manifest.json"
);

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Team logo matching adapter", () => {
  it("matches fixture Team logos and stores normalized assets under opaque IDs", async () => {
    const manifest = JSON.parse(await readFile(mediaManifestPath, "utf8")) as {
      teamLogos: { teamName: string; sourceFile: string; matchStatus: string }[];
    };
    const staging = parseTeamCsvForSetupStaging(toCsv(teamCsvHeaders, sampleTeamCsvRows));
    const assetDirectory = await createTempDirectory();
    const review = await matchTeamLogosForSetup({
      teams: staging.teams,
      uploadedFiles: [
        await createUploadedLogo("falcons.png", "png"),
        await createUploadedLogo("royals.webp", "webp"),
        await createUploadedLogo("warriors.jpg", "jpeg")
      ],
      assetDirectory,
      generateAssetId: (team) => `asset-${team.name.toLowerCase()}`
    });

    const expected = manifest.teamLogos.map((logo) => [logo.teamName, logo.matchStatus]);
    expect(review.teams.map((record) => [record.team.name, record.status])).toEqual(
      expected.map(([teamName, status]) => [
        teamName,
        status === "matched" ? "matched" : "missing_uses_placeholder"
      ])
    );
    expect(review.summary).toMatchObject({
      totalTeams: 4,
      matchedLogos: 3,
      placeholderLogos: 1,
      startAuctionBlocked: false
    });
    for (const record of review.teams.filter((team) => team.status === "matched")) {
      expect(record.logoAssetId).toMatch(/^asset-/);
      expect(JSON.stringify(record)).not.toContain(".png");
      expect(JSON.stringify(record)).not.toContain(".jpg");
      await expect(stat(join(assetDirectory, `${record.logoAssetId}.webp`))).resolves.toMatchObject({
        isFile: expect.any(Function)
      });
    }
    expect(review.issueGroups.find((group) => group.severity === "can_proceed_with_placeholder")?.issues).toEqual([
      expect.objectContaining({
        code: "missing_team_logo",
        teamName: "Tigers",
        message: "Tigers has no matched logo; team placeholder will be used."
      })
    ]);
  });

  it("matches unique filenames that contain normalized Team names", async () => {
    const staging = parseTeamCsvForSetupStaging(
      toCsv(teamCsvHeaders, [createTeamCsvRow({ Team: "Falcons", Captain: "Priya Captain" })])
    );
    const assetDirectory = await createTempDirectory();
    const review = await matchTeamLogosForSetup({
      teams: staging.teams,
      uploadedFiles: [await createUploadedLogo("team-falcons (1).jpg", "jpeg")],
      assetDirectory,
      generateAssetId: () => "asset-falcons"
    });

    expect(review.teams).toEqual([
      expect.objectContaining({
        status: "matched",
        logoAssetId: "asset-falcons"
      })
    ]);
  });

  it("does not guess for ambiguous Team logo matches", async () => {
    const staging = parseTeamCsvForSetupStaging(
      toCsv(teamCsvHeaders, [
        createTeamCsvRow({ Team: "Falcons", Captain: "Priya Captain" }),
        createTeamCsvRow({ Team: "Falcons Logo", Captain: "Second Captain" })
      ])
    );
    const review = await matchTeamLogosForSetup({
      teams: staging.teams,
      uploadedFiles: [await createUploadedLogo("falcons-logo.png", "png")],
      assetDirectory: await createTempDirectory()
    });

    expect(review.teams.every((record) => record.status === "ambiguous_uses_placeholder")).toBe(true);
    expect(review.summary).toMatchObject({
      matchedLogos: 0,
      placeholderLogos: 2,
      startAuctionBlocked: false
    });
    expect(review.issueGroups.find((group) => group.severity === "can_proceed_with_placeholder")?.issues).toEqual([
      expect.objectContaining({
        code: "ambiguous_logo_match",
        teamName: "Falcons",
        message: expect.stringContaining("falcons-logo.png")
      }),
      expect.objectContaining({
        code: "ambiguous_logo_match",
        teamName: "Falcons Logo",
        message: expect.stringContaining("falcons-logo.png")
      })
    ]);
  });

  it("does not let an exact logo match hide another matching filename for the same Team", async () => {
    const staging = parseTeamCsvForSetupStaging(
      toCsv(teamCsvHeaders, [createTeamCsvRow({ Team: "Falcons", Captain: "Priya Captain" })])
    );
    const review = await matchTeamLogosForSetup({
      teams: staging.teams,
      uploadedFiles: [
        await createUploadedLogo("falcons.png", "png"),
        await createUploadedLogo("team-falcons.png", "png")
      ],
      assetDirectory: await createTempDirectory()
    });

    expect(review.teams).toEqual([
      expect.objectContaining({
        status: "ambiguous_uses_placeholder"
      })
    ]);
    expect(review.summary).toMatchObject({
      matchedLogos: 0,
      placeholderLogos: 1,
      startAuctionBlocked: false
    });
    expect(review.issueGroups.find((group) => group.severity === "can_proceed_with_placeholder")?.issues).toEqual([
      expect.objectContaining({
        code: "ambiguous_logo_match",
        teamName: "Falcons",
        message: expect.stringContaining("falcons.png")
      })
    ]);
  });

  it("classifies unmatched logo files as non-blocking diagnostics", async () => {
    const staging = parseTeamCsvForSetupStaging(
      toCsv(teamCsvHeaders, [createTeamCsvRow({ Team: "Falcons", Captain: "Priya Captain" })])
    );
    const review = await matchTeamLogosForSetup({
      teams: staging.teams,
      uploadedFiles: [
        await createUploadedLogo("falcons.png", "png"),
        await createUploadedLogo("unknown-team.png", "png")
      ],
      assetDirectory: await createTempDirectory(),
      generateAssetId: () => "asset-falcons"
    });

    expect(review.issueGroups.find((group) => group.severity === "can_proceed_with_placeholder")?.issues).toEqual([
      expect.objectContaining({
        code: "unmatched_logo_file",
        message: expect.stringContaining("unknown-team.png")
      })
    ]);
  });

  it("accepts HEIC filenames but falls back to placeholder when sharp cannot decode them", async () => {
    const staging = parseTeamCsvForSetupStaging(
      toCsv(teamCsvHeaders, [createTeamCsvRow({ Team: "Falcons", Captain: "Priya Captain" })])
    );
    const review = await matchTeamLogosForSetup({
      teams: staging.teams,
      uploadedFiles: [
        {
          filename: "falcons.heic",
          detectedFormat: "heic",
          content: Buffer.from("not-decodable-heic")
        }
      ],
      assetDirectory: await createTempDirectory()
    });

    expect(review.teams[0]?.status).toBe("undecodable_uses_placeholder");
    expect(review.teams[0]).not.toHaveProperty("logoAssetId");
    expect(review.issueGroups.find((group) => group.severity === "can_proceed_with_placeholder")?.issues).toEqual([
      expect.objectContaining({
        code: "logo_not_decodable",
        message: expect.stringContaining("convert the logo to JPEG"),
        teamName: "Falcons"
      })
    ]);
  });

  it("does not name-match Teams whose normalized names are empty", async () => {
    const review = await matchTeamLogosForSetup({
      teams: [{ sourceRowNumber: 2, name: "...", captain: "Symbols Captain" }],
      uploadedFiles: [await createUploadedLogo("falcons.png", "png")],
      assetDirectory: await createTempDirectory()
    });

    expect(review.teams[0]?.status).toBe("missing_uses_placeholder");
    expect(
      review.issueGroups
        .find((group) => group.severity === "can_proceed_with_placeholder")
        ?.issues.some((issue) => issue.code === "unmatched_logo_file")
    ).toBe(true);
  });

  it("reports storage failures without leaking filesystem paths or source filenames", async () => {
    const staging = parseTeamCsvForSetupStaging(
      toCsv(teamCsvHeaders, [createTeamCsvRow({ Team: "Falcons", Captain: "Priya Captain" })])
    );
    const tempRoot = await createTempDirectory();
    const assetDirectory = join(tempRoot, "not-a-directory");
    await writeFile(assetDirectory, "file");
    const review = await matchTeamLogosForSetup({
      teams: staging.teams,
      uploadedFiles: [await createUploadedLogo("falcons.png", "png")],
      assetDirectory
    });

    const serialized = JSON.stringify(review);
    expect(review.teams[0]?.status).toBe("missing_uses_placeholder");
    expect(review.issueGroups.find((group) => group.severity === "can_proceed_with_placeholder")?.issues).toEqual([
      expect.objectContaining({
        code: "logo_storage_failed",
        teamName: "Falcons"
      })
    ]);
    expect(serialized).not.toContain(assetDirectory);
    expect(serialized).not.toContain("falcons.png");
  });
});

async function createUploadedLogo(
  filename: string,
  detectedFormat: "jpeg" | "png" | "webp"
) {
  const image = sharp({
    create: {
      width: 24,
      height: 24,
      channels: 3,
      background: "#ffe7c8"
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
  const directory = await mkdtemp(join(tmpdir(), "auction-team-logos-"));
  tempDirectories.push(directory);
  return directory;
}
