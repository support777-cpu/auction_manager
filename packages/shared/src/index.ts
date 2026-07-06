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
  "upload_too_large"
] as const;

export const genderSchema = z.enum(genderValues);
export const auctionRoleSchema = z.enum(auctionRoleValues);
export const phase1CategorySchema = z.enum(phase1CategoryValues);
export const importIssueSeveritySchema = z.enum(importIssueSeverityValues);
export const importIssueCodeSchema = z.enum(importIssueCodeValues);

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

export type Gender = z.infer<typeof genderSchema>;
export type AuctionRole = z.infer<typeof auctionRoleSchema>;
export type Phase1Category = z.infer<typeof phase1CategorySchema>;
export type ImportIssueSeverity = z.infer<typeof importIssueSeveritySchema>;
export type ImportIssueCode = z.infer<typeof importIssueCodeSchema>;
export type SetupPlayerPreview = z.infer<typeof setupPlayerPreviewSchema>;
export type ImportIssue = z.infer<typeof importIssueSchema>;
export type ImportIssueGroup = z.infer<typeof importIssueGroupSchema>;
export type PlayerCsvImportReviewSummary = z.infer<
  typeof playerCsvImportReviewSummarySchema
>;
export type PlayerCsvImportReviewResponse = z.infer<
  typeof playerCsvImportReviewResponseSchema
>;
