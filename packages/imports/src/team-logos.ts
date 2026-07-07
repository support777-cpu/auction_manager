import { randomUUID } from "node:crypto";
import {
  importIssueSeverityValues,
  teamLogoReviewResponseSchema,
  type ImportIssue,
  type ImportIssueSeverity,
  type SetupTeamPreview,
  type TeamLogoMatchRecord,
  type TeamLogoReviewResponse
} from "@auction-manager/shared";
import {
  normalizeAndStoreMedia,
  normalizeMatchText,
  stripExtension
} from "./media-matching.js";

export const supportedTeamLogoFormatValues = ["jpeg", "png", "webp", "heic"] as const;

export type SupportedTeamLogoFormat = (typeof supportedTeamLogoFormatValues)[number];

export interface UploadedTeamLogoDescriptor {
  readonly filename: string;
  readonly detectedFormat: SupportedTeamLogoFormat;
  readonly content: Buffer;
}

export interface MatchTeamLogosForSetupInput {
  readonly teams: readonly SetupTeamPreview[];
  readonly uploadedFiles: readonly UploadedTeamLogoDescriptor[];
  readonly assetDirectory: string;
  readonly generateAssetId?: (team: SetupTeamPreview) => string;
}

interface Candidate {
  readonly file: UploadedTeamLogoDescriptor;
  readonly normalizedFilename: string;
}

export async function matchTeamLogosForSetup({
  teams,
  uploadedFiles,
  assetDirectory,
  generateAssetId = () => randomUUID()
}: MatchTeamLogosForSetupInput): Promise<TeamLogoReviewResponse> {
  const uploadedCandidates = uploadedFiles.map((file) => ({
    file,
    normalizedFilename: normalizeMatchText(stripExtension(file.filename))
  }));
  const candidatesByTeam = new Map<number, Candidate[]>();
  const teamIndexesByFile = new Map<UploadedTeamLogoDescriptor, number[]>();

  teams.forEach((team, teamIndex) => {
    const candidates = findCandidates(team, uploadedCandidates);
    candidatesByTeam.set(teamIndex, candidates);

    for (const candidate of candidates) {
      const existing = teamIndexesByFile.get(candidate.file) ?? [];
      existing.push(teamIndex);
      teamIndexesByFile.set(candidate.file, existing);
    }
  });

  const records: TeamLogoMatchRecord[] = [];
  const issues: ImportIssue[] = [];
  const filesWithAnyCandidate = new Set<UploadedTeamLogoDescriptor>();

  for (const [teamIndex, team] of teams.entries()) {
    const candidates = candidatesByTeam.get(teamIndex) ?? [];
    candidates.forEach((candidate) => filesWithAnyCandidate.add(candidate.file));

    if (candidates.length === 0) {
      records.push({
        team,
        status: "missing_uses_placeholder"
      });
      issues.push(createLogoIssue({
        id: `logo-missing-${team.sourceRowNumber}`,
        code: "missing_team_logo",
        message: `${team.name} has no matched logo; team placeholder will be used.`,
        teamName: team.name
      }));
      continue;
    }

    const ambiguous = candidates.length > 1 || candidates.some((candidate) => {
      const matchedTeams = teamIndexesByFile.get(candidate.file) ?? [];
      return matchedTeams.length > 1;
    });

    if (ambiguous) {
      records.push({
        team,
        status: "ambiguous_uses_placeholder"
      });
      const candidateFilenames = candidates.map((candidate) => candidate.file.filename).join(", ");
      issues.push(createLogoIssue({
        id: `logo-ambiguous-${team.sourceRowNumber}`,
        code: "ambiguous_logo_match",
        message: `${team.name} has multiple possible logo matches (${candidateFilenames}); team placeholder will be used.`,
        teamName: team.name
      }));
      continue;
    }

    const matchedFile = candidates[0]?.file;
    if (!matchedFile) {
      continue;
    }

    const assetId = generateAssetId(team);
    const stored = await normalizeAndStoreMedia({
      file: matchedFile,
      assetDirectory,
      assetId,
      decodeFailureCode: "logo_not_decodable",
      storageFailureCode: "logo_storage_failed"
    });

    if (stored.ok) {
      records.push({
        team,
        status: "matched",
        logoAssetId: assetId
      });
      continue;
    }

    records.push({
      team,
      status: stored.code === "logo_not_decodable" ? "undecodable_uses_placeholder" : "missing_uses_placeholder"
    });
    issues.push(createLogoIssue({
      id: `${stored.code}-${team.sourceRowNumber}`,
      code: stored.code,
      message:
        stored.code === "logo_not_decodable"
          ? `${team.name}'s logo could not be decoded; convert the logo to JPEG and reimport.`
          : `${team.name}'s matched logo could not be stored; team placeholder will be used.`,
      teamName: team.name
    }));
  }

  for (const [uploadIndex, uploadedFile] of uploadedFiles.entries()) {
    if (filesWithAnyCandidate.has(uploadedFile)) {
      continue;
    }

    issues.push(createLogoIssue({
      id: `logo-unmatched-${uploadIndex}-${slugify(uploadedFile.filename)}`,
      code: "unmatched_logo_file",
      message: `${uploadedFile.filename} did not match any imported Team; no logo was stored.`
    }));
  }

  return buildLogoReview({ records, issues });
}

function findCandidates(
  team: SetupTeamPreview,
  uploadedCandidates: readonly Candidate[]
): Candidate[] {
  const normalizedTeamName = normalizeMatchText(team.name);
  if (!normalizedTeamName) {
    return [];
  }

  return uploadedCandidates.filter((candidate) =>
    candidate.normalizedFilename === normalizedTeamName ||
    candidate.normalizedFilename.includes(normalizedTeamName)
  );
}

function buildLogoReview({
  records,
  issues
}: {
  records: readonly TeamLogoMatchRecord[];
  issues: readonly ImportIssue[];
}): TeamLogoReviewResponse {
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

  return teamLogoReviewResponseSchema.parse({
    teams: records,
    issueGroups,
    summary: {
      totalTeams: records.length,
      matchedLogos: records.filter((record) => record.status === "matched").length,
      placeholderLogos: records.filter((record) => record.status !== "matched").length,
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

function createLogoIssue({
  id,
  code,
  message,
  teamName
}: {
  id: string;
  code: ImportIssue["code"];
  message: string;
  teamName?: string;
}): ImportIssue {
  return {
    id,
    severity: "can_proceed_with_placeholder",
    code,
    message,
    ...(teamName ? { teamName } : {})
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
