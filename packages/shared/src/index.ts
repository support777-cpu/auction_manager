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
  "photo_storage_failed"
] as const;

export const photoMatchStatusValues = [
  "matched",
  "missing_uses_placeholder",
  "ambiguous_uses_placeholder",
  "undecodable_uses_placeholder"
] as const;

export const genderSchema = z.enum(genderValues);
export const auctionRoleSchema = z.enum(auctionRoleValues);
export const phase1CategorySchema = z.enum(phase1CategoryValues);
export const importIssueSeveritySchema = z.enum(importIssueSeverityValues);
export const importIssueCodeSchema = z.enum(importIssueCodeValues);
export const photoMatchStatusSchema = z.enum(photoMatchStatusValues);

export const setupPlayerPreviewSchema = z
  .object({
    sourceRowNumber: z.number().int().positive(),
    name: z.string().trim().min(1),
    gender: genderSchema,
    role: auctionRoleSchema,
    phase1Category: phase1CategorySchema
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
    playerName: z.string().trim().min(1).optional()
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

export type Gender = z.infer<typeof genderSchema>;
export type AuctionRole = z.infer<typeof auctionRoleSchema>;
export type Phase1Category = z.infer<typeof phase1CategorySchema>;
export type ImportIssueSeverity = z.infer<typeof importIssueSeveritySchema>;
export type ImportIssueCode = z.infer<typeof importIssueCodeSchema>;
export type PhotoMatchStatus = z.infer<typeof photoMatchStatusSchema>;
export type SetupPlayerPreview = z.infer<typeof setupPlayerPreviewSchema>;
export type ImportIssue = z.infer<typeof importIssueSchema>;
export type ImportIssueGroup = z.infer<typeof importIssueGroupSchema>;
export type PlayerCsvImportReviewSummary = z.infer<
  typeof playerCsvImportReviewSummarySchema
>;
export type PlayerCsvImportReviewResponse = z.infer<
  typeof playerCsvImportReviewResponseSchema
>;
export type PlayerPhotoMatchRecord = z.infer<typeof playerPhotoMatchRecordSchema>;
export type PlayerPhotoReviewSummary = z.infer<typeof playerPhotoReviewSummarySchema>;
export type PlayerPhotoReviewResponse = z.infer<
  typeof playerPhotoReviewResponseSchema
>;
