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

export const manualAssignmentBudgetBehaviorValues = ["NoBudgetImpact"] as const;

export const auctionParameterValidationIssueCodeValues = [
  "missing_role_base_price",
  "invalid_role_base_price",
  "invalid_bid_increment",
  "invalid_team_budget",
  "invalid_max_squad_size",
  "invalid_role_target",
  "role_targets_exceed_max_squad_size",
  "invalid_phase1_category_order",
  "unsupported_manual_assignment_budget_behavior",
  "no_imported_teams"
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
export const manualAssignmentBudgetBehaviorSchema = z.enum(
  manualAssignmentBudgetBehaviorValues
);
export const auctionParameterValidationIssueCodeSchema = z.enum(
  auctionParameterValidationIssueCodeValues
);
export const importIssueSeveritySchema = z.enum(importIssueSeverityValues);
export const importIssueCodeSchema = z.enum(importIssueCodeValues);
export const photoMatchStatusSchema = z.enum(photoMatchStatusValues);
export const mediaMatchStatusSchema = photoMatchStatusSchema;

const positiveIntegerSchema = z.number().int().positive();
const nonnegativeIntegerSchema = z.number().int().nonnegative();

const roleBasePricesSchema = z
  .object(
    Object.fromEntries(
      auctionRoleValues.map((role) => [role, positiveIntegerSchema])
    ) as Record<(typeof auctionRoleValues)[number], typeof positiveIntegerSchema>
  )
  .strict();

const roleTargetsSchema = z
  .object(
    Object.fromEntries(
      auctionRoleValues.map((role) => [role, nonnegativeIntegerSchema])
    ) as Record<
      (typeof auctionRoleValues)[number],
      typeof nonnegativeIntegerSchema
    >
  )
  .strict();

export const auctionParametersSchema = z
  .object({
    roleBasePrices: roleBasePricesSchema,
    bidIncrement: positiveIntegerSchema,
    teamBudget: positiveIntegerSchema,
    maxSquadSize: positiveIntegerSchema,
    roleTargets: roleTargetsSchema,
    phase1CategoryOrder: z.array(phase1CategorySchema),
    manualAssignmentBudgetBehavior: manualAssignmentBudgetBehaviorSchema
  })
  .strict()
  .superRefine((parameters, context) => {
    if (parameters.phase1CategoryOrder.length !== phase1CategoryValues.length) {
      context.addIssue({
        code: "custom",
        path: ["phase1CategoryOrder"],
        message: "Phase 1 category order must include every category exactly once."
      });
    }

    for (const category of phase1CategoryValues) {
      const occurrences = parameters.phase1CategoryOrder.filter(
        (candidate) => candidate === category
      ).length;
      if (occurrences !== 1) {
        context.addIssue({
          code: "custom",
          path: ["phase1CategoryOrder"],
          message: "Phase 1 category order must include every category exactly once."
        });
        break;
      }
    }

    const targetTotal = Object.values(parameters.roleTargets).reduce(
      (total, target) => total + target,
      0
    );
    if (targetTotal > parameters.maxSquadSize) {
      context.addIssue({
        code: "custom",
        path: ["roleTargets"],
        message: "Role targets total must not exceed max squad size."
      });
    }
  });

export const auctionParameterValidationIssueSchema = z
  .object({
    id: z.string().trim().min(1),
    code: auctionParameterValidationIssueCodeSchema,
    field: z.string().trim().min(1),
    message: z.string().trim().min(1)
  })
  .strict();

const reviewIntegerSchema = z.number();
const reviewRoleNumberMapSchema = z
  .object(
    Object.fromEntries(
      auctionRoleValues.map((role) => [role, reviewIntegerSchema])
    ) as Record<(typeof auctionRoleValues)[number], typeof reviewIntegerSchema>
  )
  .strict();

export const auctionParameterReviewParametersSchema = z
  .object({
    roleBasePrices: reviewRoleNumberMapSchema,
    bidIncrement: reviewIntegerSchema,
    teamBudget: reviewIntegerSchema,
    maxSquadSize: reviewIntegerSchema,
    roleTargets: reviewRoleNumberMapSchema,
    phase1CategoryOrder: z.array(z.string()),
    manualAssignmentBudgetBehavior: z.string()
  })
  .strict();

export const auctionParameterReviewResponseSchema = z
  .object({
    parameters: auctionParameterReviewParametersSchema,
    blockingReasons: z.array(auctionParameterValidationIssueSchema),
    reasonsByField: z.record(
      z.string().trim().min(1),
      z.array(auctionParameterValidationIssueSchema)
    ),
    startAuctionBlocked: z.boolean()
  })
  .strict()
  .superRefine((review, context) => {
    if (review.startAuctionBlocked !== review.blockingReasons.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["startAuctionBlocked"],
        message: "startAuctionBlocked must be driven only by blocking reasons."
      });
    }

    if (!review.startAuctionBlocked) {
      const strictParse = auctionParametersSchema.safeParse(review.parameters);
      if (!strictParse.success) {
        context.addIssue({
          code: "custom",
          path: ["parameters"],
          message: "Unblocked parameter reviews must satisfy strict Auction Parameters."
        });
      }
    }
  });

export const setupReadinessResponseSchema = z
  .object({
    startAuctionBlocked: z.boolean(),
    primaryBlockerMessage: z.string().trim().min(1),
    blockerMessages: z.array(z.string().trim().min(1)),
    story16Ready: z.boolean()
  })
  .strict()
  .superRefine((readiness, context) => {
    if (readiness.startAuctionBlocked !== readiness.blockerMessages.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["startAuctionBlocked"],
        message: "startAuctionBlocked must match blockerMessages."
      });
    }

    if (readiness.story16Ready && readiness.startAuctionBlocked) {
      context.addIssue({
        code: "custom",
        path: ["story16Ready"],
        message: "story16Ready requires an unblocked setup state."
      });
    }
  });

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
export type ManualAssignmentBudgetBehavior = z.infer<
  typeof manualAssignmentBudgetBehaviorSchema
>;
export type AuctionParameterValidationIssueCode = z.infer<
  typeof auctionParameterValidationIssueCodeSchema
>;
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
export type AuctionParameters = z.infer<typeof auctionParametersSchema>;
export type AuctionParameterValidationIssue = z.infer<
  typeof auctionParameterValidationIssueSchema
>;
export type AuctionParameterReviewResponse = z.infer<
  typeof auctionParameterReviewResponseSchema
>;
export type AuctionParameterReviewParameters = z.infer<
  typeof auctionParameterReviewParametersSchema
>;
export type SetupReadinessResponse = z.infer<typeof setupReadinessResponseSchema>;

export {
  getSetupReadiness,
  type SetupReadinessInput
} from "./setup-readiness.js";
