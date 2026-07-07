import { randomUUID } from "node:crypto";
import {
  importIssueSeverityValues,
  playerPhotoReviewResponseSchema,
  type ImportIssue,
  type ImportIssueSeverity,
  type PlayerPhotoMatchRecord,
  type PlayerPhotoReviewResponse
} from "@auction-manager/shared";
import {
  normalizeAndStoreMedia,
  normalizeMatchText,
  stripExtension,
  uniqueCandidates
} from "./media-matching.js";
import type { PlayerSetupStagingRecord } from "./player-csv.js";

export const supportedPlayerPhotoFormatValues = ["jpeg", "png", "webp", "heic"] as const;

export type SupportedPlayerPhotoFormat = (typeof supportedPlayerPhotoFormatValues)[number];

export interface UploadedPlayerPhotoDescriptor {
  readonly filename: string;
  readonly detectedFormat: SupportedPlayerPhotoFormat;
  readonly content: Buffer;
}

export interface MatchPlayerPhotosForSetupInput {
  readonly players: readonly PlayerSetupStagingRecord[];
  readonly uploadedFiles: readonly UploadedPlayerPhotoDescriptor[];
  readonly assetDirectory: string;
  readonly generateAssetId?: (player: PlayerSetupStagingRecord["player"]) => string;
}

interface Candidate {
  readonly file: UploadedPlayerPhotoDescriptor;
  readonly normalizedFilename: string;
}

export async function matchPlayerPhotosForSetup({
  players,
  uploadedFiles,
  assetDirectory,
  generateAssetId = () => randomUUID()
}: MatchPlayerPhotosForSetupInput): Promise<PlayerPhotoReviewResponse> {
  const candidatesByPlayer = new Map<number, Candidate[]>();
  const playerIndexesByFile = new Map<UploadedPlayerPhotoDescriptor, number[]>();

  players.forEach((player, playerIndex) => {
    const candidates = findCandidates(player, uploadedFiles);
    candidatesByPlayer.set(playerIndex, candidates);

    for (const candidate of candidates) {
      const existing = playerIndexesByFile.get(candidate.file) ?? [];
      existing.push(playerIndex);
      playerIndexesByFile.set(candidate.file, existing);
    }
  });

  const records: PlayerPhotoMatchRecord[] = [];
  const issues: ImportIssue[] = [];
  const filesWithAnyCandidate = new Set<UploadedPlayerPhotoDescriptor>();

  for (const [playerIndex, player] of players.entries()) {
    const candidates = candidatesByPlayer.get(playerIndex) ?? [];
    candidates.forEach((candidate) => filesWithAnyCandidate.add(candidate.file));

    if (candidates.length === 0) {
      records.push({
        player: player.player,
        status: "missing_uses_placeholder"
      });
      issues.push(createPhotoIssue({
        id: `photo-missing-${player.player.sourceRowNumber}`,
        code: "missing_player_photo",
        message: `${player.player.name} has no matched photo; player placeholder will be used.`,
        playerName: player.player.name
      }));
      continue;
    }

    const ambiguous = candidates.length > 1 || candidates.some((candidate) => {
      const matchedPlayers = playerIndexesByFile.get(candidate.file) ?? [];
      return matchedPlayers.length > 1;
    });

    if (ambiguous) {
      records.push({
        player: player.player,
        status: "ambiguous_uses_placeholder"
      });
      const candidateFilenames = candidates.map((candidate) => candidate.file.filename).join(", ");
      issues.push(createPhotoIssue({
        id: `photo-ambiguous-${player.player.sourceRowNumber}`,
        code: "ambiguous_photo_match",
        message: `${player.player.name} has multiple possible photo matches (${candidateFilenames}); player placeholder will be used.`,
        playerName: player.player.name
      }));
      continue;
    }

    const matchedFile = candidates[0]?.file;
    if (!matchedFile) {
      continue;
    }

    const assetId = generateAssetId(player.player);
    const stored = await normalizeAndStoreMedia({
      file: matchedFile,
      assetDirectory,
      assetId,
      decodeFailureCode: "photo_not_decodable",
      storageFailureCode: "photo_storage_failed"
    });

    if (stored.ok) {
      records.push({
        player: player.player,
        status: "matched",
        photoAssetId: assetId
      });
      continue;
    }

    records.push({
      player: player.player,
      status: stored.code === "photo_not_decodable" ? "undecodable_uses_placeholder" : "missing_uses_placeholder"
    });
    issues.push(createPhotoIssue({
      id: `${stored.code}-${player.player.sourceRowNumber}`,
      code: stored.code,
      message:
        stored.code === "photo_not_decodable"
          ? `${player.player.name}'s photo could not be decoded; convert the photo to JPEG and reimport.`
          : `${player.player.name}'s matched photo could not be stored; player placeholder will be used.`,
      playerName: player.player.name
    }));
  }

  for (const [uploadIndex, uploadedFile] of uploadedFiles.entries()) {
    if (filesWithAnyCandidate.has(uploadedFile)) {
      continue;
    }

    issues.push(createPhotoIssue({
      id: `photo-unmatched-${uploadIndex}-${slugify(uploadedFile.filename)}`,
      code: "unmatched_photo_file",
      message: `${uploadedFile.filename} did not match any imported Player; no photo was stored.`
    }));
  }

  return buildPhotoReview({ records, issues });
}

function findCandidates(
  player: PlayerSetupStagingRecord,
  uploadedFiles: readonly UploadedPlayerPhotoDescriptor[]
): Candidate[] {
  const uploadedCandidates = uploadedFiles.map((file) => ({
    file,
    normalizedFilename: normalizeMatchText(stripExtension(file.filename))
  }));
  const normalizedPhotoUpload = player.photoUploadValue
    ? normalizeMatchText(stripExtension(player.photoUploadValue))
    : "";

  if (normalizedPhotoUpload) {
    const exactMetadataMatches = uploadedCandidates.filter(
      (candidate) => candidate.normalizedFilename === normalizedPhotoUpload
    );
    if (exactMetadataMatches.length > 0) {
      return uniqueCandidates(exactMetadataMatches);
    }
  }

  const normalizedPlayerName = normalizeMatchText(player.player.name);
  if (!normalizedPlayerName) {
    return [];
  }

  return uploadedCandidates.filter((candidate) =>
    candidate.normalizedFilename.includes(normalizedPlayerName)
  );
}

function buildPhotoReview({
  records,
  issues
}: {
  records: readonly PlayerPhotoMatchRecord[];
  issues: readonly ImportIssue[];
}): PlayerPhotoReviewResponse {
  const issueGroups = importIssueSeverityValues.map((severity) => {
    const groupIssues = issues.filter((issue) => issue.severity === severity);

    return {
      severity,
      count: groupIssues.length,
      issues: groupIssues
    };
  });
  const mustFixCount = countIssues(issues, "must_fix");
  const canProceedWithPlaceholderCount = countIssues(issues, "can_proceed_with_placeholder");
  const ignoredSourceFieldCount = countIssues(issues, "ignored_source_field");

  return playerPhotoReviewResponseSchema.parse({
    players: records,
    issueGroups,
    summary: {
      totalPlayers: records.length,
      matchedPhotos: records.filter((record) => record.status === "matched").length,
      placeholderPhotos: records.filter((record) => record.status !== "matched").length,
      mustFixCount,
      canProceedWithPlaceholderCount,
      ignoredSourceFieldCount,
      startAuctionBlocked: mustFixCount > 0
    }
  });
}

function countIssues(
  issues: readonly ImportIssue[],
  severity: ImportIssueSeverity
): number {
  return issues.filter((issue) => issue.severity === severity).length;
}

function createPhotoIssue({
  id,
  code,
  message,
  playerName
}: {
  id: string;
  code: ImportIssue["code"];
  message: string;
  playerName?: string;
}): ImportIssue {
  return {
    id,
    severity: "can_proceed_with_placeholder",
    code,
    message,
    ...(playerName ? { playerName } : {})
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
