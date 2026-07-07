import { z } from "zod";

export const sharedPackageReady = true;

export const genderValues = ["Male", "Female"] as const;

export const auctionRoleValues = [
  "Ace",
  "Batting",
  "Bowling",
  "AllRounder",
  "Girls"
] as const;

export const phase1CategoryValues = [
  "Ace Men",
  "Ace Women",
  "Women All Rounders",
  "Men Bowlers",
  "Men Batsmen",
  "Men All Rounders"
] as const;

export const importIssueSeverityValues = [
  "must_fix",
  "can_proceed_with_placeholder",
  "ignored_source_field"
] as const;

export const importIssueCodeValues = [
  "missing_required_header",
  "missing_required_value",
  "unknown_gender",
  "unknown_skill",
  "unmapped_phase1_category",
  "ignored_source_field",
  "parse_error",
  "unsupported_content_type",
  "upload_too_large",
  "missing_player_photo",
  "unsupported_photo_format",
  "ambiguous_photo_match",
  "unmatched_photo_file",
  "photo_not_decodable",
  "photo_storage_failed",
  "missing_team_name",
  "missing_captain_name",
  "duplicate_team_name",
  "missing_team_logo",
  "ambiguous_logo_match",
  "unmatched_logo_file",
  "logo_not_decodable",
  "logo_storage_failed"
] as const;

export const photoMatchStatusValues = [
  "matched",
  "missing_uses_placeholder",
  "ambiguous_uses_placeholder",
  "undecodable_uses_placeholder"
] as const;
export const mediaMatchStatusValues = photoMatchStatusValues;

export const genderSchema = z.enum(genderValues);
export const auctionRoleSchema = z.enum(auctionRoleValues);
export const phase1CategorySchema = z.enum(phase1CategoryValues);
export const importIssueSeveritySchema = z.enum(importIssueSeverityValues);
export const importIssueCodeSchema = z.enum(importIssueCodeValues);
export const photoMatchStatusSchema = z.enum(photoMatchStatusValues);
export const mediaMatchStatusSchema = photoMatchStatusSchema;

export const setupPlayerPreviewSchema = z
  .object({
    sourceRowNumber: z.number().int().positive(),
    name: z.string().trim().min(1),
    gender: genderSchema,
    role: auctionRoleSchema,
    phase1Category: phase1CategorySchema
  })
  .strict();

export const setupTeamPreviewSchema = z
  .object({
    sourceRowNumber: z.number().int().positive(),
    name: z.string().trim().min(1),
    captain: z.string().trim().min(1)
  })
  .strict();

export const importIssueSchema = z
  .object({
    id: z.string().trim().min(1),
    severity: importIssueSeveritySchema,
    code: importIssueCodeSchema,
    message: z.string().trim().min(1),
    sourceColumn: z.string().trim().min(1).optional(),
    sourceRowNumber: z.number().int().positive().optional(),
    playerName: z.string().trim().min(1).optional(),
    teamName: z.string().trim().min(1).optional()
  })
  .strict();

export const importIssueGroupSchema = z
  .object({
    severity: importIssueSeveritySchema,
    count: z.number().int().nonnegative(),
    issues: z.array(importIssueSchema)
  })
  .strict();

export const playerCsvImportReviewSummarySchema = z
  .object({
    totalRows: z.number().int().nonnegative(),
    importedPlayers: z.number().int().nonnegative(),
    mustFixCount: z.number().int().nonnegative(),
    canProceedWithPlaceholderCount: z.number().int().nonnegative(),
    ignoredSourceFieldCount: z.number().int().nonnegative(),
    startAuctionBlocked: z.boolean()
  })
  .strict();

export const playerCsvImportReviewResponseSchema = z
  .object({
    players: z.array(setupPlayerPreviewSchema),
    issueGroups: z.array(importIssueGroupSchema),
    summary: playerCsvImportReviewSummarySchema
  })
  .strict();

export const teamCsvImportReviewSummarySchema = z
  .object({
    totalRows: z.number().int().nonnegative(),
    importedTeams: z.number().int().nonnegative(),
    mustFixCount: z.number().int().nonnegative(),
    canProceedWithPlaceholderCount: z.number().int().nonnegative(),
    ignoredSourceFieldCount: z.number().int().nonnegative(),
    startAuctionBlocked: z.boolean()
  })
  .strict()
  .superRefine((summary, context) => {
    if (summary.startAuctionBlocked !== summary.mustFixCount > 0) {
      context.addIssue({
        code: "custom",
        path: ["startAuctionBlocked"],
        message: "startAuctionBlocked must be driven only by mustFixCount."
      });
    }
  });

export const teamCsvImportReviewResponseSchema = z
  .object({
    teams: z.array(setupTeamPreviewSchema),
    issueGroups: z.array(importIssueGroupSchema),
    summary: teamCsvImportReviewSummarySchema
  })
  .strict();

export const playerPhotoMatchRecordSchema = z
  .object({
    player: setupPlayerPreviewSchema,
    status: photoMatchStatusSchema,
    photoAssetId: z.string().trim().min(1).optional()
  })
  .strict()
  .superRefine((record, context) => {
    if (record.status === "matched" && !record.photoAssetId) {
      context.addIssue({
        code: "custom",
        path: ["photoAssetId"],
        message: "Matched photos must include photoAssetId."
      });
    }

    if (record.status !== "matched" && record.photoAssetId) {
      context.addIssue({
        code: "custom",
        path: ["photoAssetId"],
        message: "photoAssetId is only allowed when status is matched."
      });
    }
  });

export const teamLogoMatchRecordSchema = z
  .object({
    team: setupTeamPreviewSchema,
    status: mediaMatchStatusSchema,
    logoAssetId: z.string().trim().min(1).optional()
  })
  .strict()
  .superRefine((record, context) => {
    if (record.status === "matched" && !record.logoAssetId) {
      context.addIssue({
        code: "custom",
        path: ["logoAssetId"],
        message: "Matched logos must include logoAssetId."
      });
    }

    if (record.status !== "matched" && record.logoAssetId) {
      context.addIssue({
        code: "custom",
        path: ["logoAssetId"],
        message: "logoAssetId is only allowed when status is matched."
      });
    }
  });

export const playerPhotoReviewSummarySchema = z
  .object({
    totalPlayers: z.number().int().nonnegative(),
    matchedPhotos: z.number().int().nonnegative(),
    placeholderPhotos: z.number().int().nonnegative(),
    mustFixCount: z.number().int().nonnegative(),
    canProceedWithPlaceholderCount: z.number().int().nonnegative(),
    ignoredSourceFieldCount: z.number().int().nonnegative(),
    startAuctionBlocked: z.boolean()
  })
  .strict()
  .superRefine((summary, context) => {
    if (summary.startAuctionBlocked !== summary.mustFixCount > 0) {
      context.addIssue({
        code: "custom",
        path: ["startAuctionBlocked"],
        message: "startAuctionBlocked must be driven only by mustFixCount."
      });
    }
  });

export const playerPhotoReviewResponseSchema = z
  .object({
    players: z.array(playerPhotoMatchRecordSchema),
    issueGroups: z.array(importIssueGroupSchema),
    summary: playerPhotoReviewSummarySchema
  })
  .strict();

export const teamLogoReviewSummarySchema = z
  .object({
    totalTeams: z.number().int().nonnegative(),
    matchedLogos: z.number().int().nonnegative(),
    placeholderLogos: z.number().int().nonnegative(),
    mustFixCount: z.number().int().nonnegative(),
    canProceedWithPlaceholderCount: z.number().int().nonnegative(),
    ignoredSourceFieldCount: z.number().int().nonnegative(),
    startAuctionBlocked: z.boolean()
  })
  .strict()
  .superRefine((summary, context) => {
    if (summary.startAuctionBlocked !== summary.mustFixCount > 0) {
      context.addIssue({
        code: "custom",
        path: ["startAuctionBlocked"],
        message: "startAuctionBlocked must be driven only by mustFixCount."
      });
    }
  });

export const teamLogoReviewResponseSchema = z
  .object({
    teams: z.array(teamLogoMatchRecordSchema),
    issueGroups: z.array(importIssueGroupSchema),
    summary: teamLogoReviewSummarySchema
  })
  .strict();

export type Gender = z.infer<typeof genderSchema>;
export type AuctionRole = z.infer<typeof auctionRoleSchema>;
export type Phase1Category = z.infer<typeof phase1CategorySchema>;
export type ImportIssueSeverity = z.infer<typeof importIssueSeveritySchema>;
export type ImportIssueCode = z.infer<typeof importIssueCodeSchema>;
export type PhotoMatchStatus = z.infer<typeof photoMatchStatusSchema>;
export type MediaMatchStatus = z.infer<typeof mediaMatchStatusSchema>;
export type SetupPlayerPreview = z.infer<typeof setupPlayerPreviewSchema>;
export type SetupTeamPreview = z.infer<typeof setupTeamPreviewSchema>;
export type ImportIssue = z.infer<typeof importIssueSchema>;
export type ImportIssueGroup = z.infer<typeof importIssueGroupSchema>;
export type PlayerCsvImportReviewSummary = z.infer<
  typeof playerCsvImportReviewSummarySchema
>;
export type PlayerCsvImportReviewResponse = z.infer<
  typeof playerCsvImportReviewResponseSchema
>;
export type TeamCsvImportReviewSummary = z.infer<
  typeof teamCsvImportReviewSummarySchema
>;
export type TeamCsvImportReviewResponse = z.infer<
  typeof teamCsvImportReviewResponseSchema
>;
export type PlayerPhotoMatchRecord = z.infer<typeof playerPhotoMatchRecordSchema>;
export type TeamLogoMatchRecord = z.infer<typeof teamLogoMatchRecordSchema>;
export type PlayerPhotoReviewSummary = z.infer<typeof playerPhotoReviewSummarySchema>;
export type PlayerPhotoReviewResponse = z.infer<
  typeof playerPhotoReviewResponseSchema
>;
export type TeamLogoReviewSummary = z.infer<typeof teamLogoReviewSummarySchema>;
export type TeamLogoReviewResponse = z.infer<
  typeof teamLogoReviewResponseSchema
>;
