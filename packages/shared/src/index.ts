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
export const auctionPhaseValues = [
  "Setup",
  "InitialAuction",
  "UnsoldBidding",
  "ManualAssignment",
  "Closed"
] as const;
export const playerStatusValues = [
  "Pending",
  "Current",
  "Sold",
  "Unsold",
  "Assigned"
] as const;
export const acquisitionTypeValues = ["Auction", "ManualAssignment"] as const;

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
export const auctionPhaseSchema = z.enum(auctionPhaseValues);
export const playerStatusSchema = z.enum(playerStatusValues);
export const acquisitionTypeSchema = z.enum(acquisitionTypeValues);

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
    primaryBlockerMessage: z.string().trim(),
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

    if (readiness.startAuctionBlocked && readiness.primaryBlockerMessage.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["primaryBlockerMessage"],
        message: "primaryBlockerMessage is required when startAuctionBlocked is true."
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

const opaqueIdSchema = z.string().trim().min(1);
const nullableOpaqueIdSchema = opaqueIdSchema.nullable();
const nullableMoneySchema = z.number().int().positive().nullable();

const roleCountsSchema = z
  .object(
    Object.fromEntries(
      auctionRoleValues.map((role) => [role, nonnegativeIntegerSchema])
    ) as Record<
      (typeof auctionRoleValues)[number],
      typeof nonnegativeIntegerSchema
    >
  )
  .strict();

export const auctionPlayerSchema = z
  .object({
    id: opaqueIdSchema,
    name: z.string().trim().min(1),
    gender: genderSchema,
    role: auctionRoleSchema,
    phase1Category: phase1CategorySchema,
    basePrice: positiveIntegerSchema,
    status: playerStatusSchema,
    photoAssetId: opaqueIdSchema.optional(),
    soldPrice: nullableMoneySchema,
    winningTeamId: nullableOpaqueIdSchema,
    acquisitionType: acquisitionTypeSchema.nullable()
  })
  .strict();

export const auctionTeamSchema = z
  .object({
    id: opaqueIdSchema,
    name: z.string().trim().min(1),
    captain: z.string().trim().min(1),
    logoAssetId: opaqueIdSchema.optional(),
    budget: positiveIntegerSchema,
    remainingBudget: nonnegativeIntegerSchema,
    squadCount: nonnegativeIntegerSchema,
    roleCounts: roleCountsSchema
  })
  .strict();

export const phase1OrderCategorySchema = z
  .object({
    category: phase1CategorySchema,
    playerIds: z.array(opaqueIdSchema)
  })
  .strict();

export const phase1OrderStateSchema = z
  .object({
    categories: z.array(phase1OrderCategorySchema),
    playerIds: z.array(opaqueIdSchema),
    generatedAt: z.string().trim().min(1)
  })
  .strict();

export const revealNextPlayerUndoHistoryEntrySchema = z
  .object({
    command: z.literal("RevealNextPlayer"),
    playerId: opaqueIdSchema,
    previousCurrentPlayerId: nullableOpaqueIdSchema,
    previousCurrentBid: nullableMoneySchema,
    previousSelectedTeamId: nullableOpaqueIdSchema,
    previousPlayerStatus: playerStatusSchema,
    timestamp: z.string().trim().min(1)
  })
  .strict();

export const selectTeamUndoHistoryEntrySchema = z
  .object({
    command: z.literal("SelectTeam"),
    previousSelectedTeamId: nullableOpaqueIdSchema,
    nextSelectedTeamId: nullableOpaqueIdSchema,
    currentPlayerId: opaqueIdSchema,
    currentBid: positiveIntegerSchema,
    timestamp: z.string().trim().min(1)
  })
  .strict();

export const increaseBidUndoHistoryEntrySchema = z
  .object({
    command: z.literal("IncreaseBid"),
    currentPlayerId: opaqueIdSchema,
    previousCurrentBid: positiveIntegerSchema,
    nextCurrentBid: positiveIntegerSchema,
    bidIncrement: positiveIntegerSchema,
    timestamp: z.string().trim().min(1)
  })
  .strict();

export const markSoldUndoHistoryEntrySchema = z
  .object({
    command: z.literal("MarkSold"),
    playerId: opaqueIdSchema,
    previousPlayerStatus: playerStatusSchema,
    previousSoldPrice: nullableMoneySchema,
    previousWinningTeamId: nullableOpaqueIdSchema,
    previousAcquisitionType: acquisitionTypeSchema.nullable(),
    previousCurrentPlayerId: nullableOpaqueIdSchema,
    previousCurrentBid: nullableMoneySchema,
    previousSelectedTeamId: nullableOpaqueIdSchema,
    winningTeamId: opaqueIdSchema,
    previousTeamRemainingBudget: nonnegativeIntegerSchema,
    nextTeamRemainingBudget: nonnegativeIntegerSchema,
    previousTeamSquadCount: nonnegativeIntegerSchema,
    nextTeamSquadCount: nonnegativeIntegerSchema,
    role: auctionRoleSchema,
    previousTeamRoleCount: nonnegativeIntegerSchema,
    nextTeamRoleCount: nonnegativeIntegerSchema,
    soldPrice: positiveIntegerSchema,
    timestamp: z.string().trim().min(1)
  })
  .strict();

export const markUnsoldUndoHistoryEntrySchema = z
  .object({
    command: z.literal("MarkUnsold"),
    playerId: opaqueIdSchema,
    previousPlayerStatus: playerStatusSchema,
    previousCurrentPlayerId: nullableOpaqueIdSchema,
    previousCurrentBid: nullableMoneySchema,
    previousSelectedTeamId: nullableOpaqueIdSchema,
    timestamp: z.string().trim().min(1)
  })
  .strict();

export const liveActionUndoHistoryEntrySchema = z.discriminatedUnion("command", [
  revealNextPlayerUndoHistoryEntrySchema,
  selectTeamUndoHistoryEntrySchema,
  increaseBidUndoHistoryEntrySchema,
  markSoldUndoHistoryEntrySchema,
  markUnsoldUndoHistoryEntrySchema
]);

export const undoActionSummarySchema = z
  .object({
    command: z.enum([
      "RevealNextPlayer",
      "SelectTeam",
      "IncreaseBid",
      "MarkSold",
      "MarkUnsold"
    ]),
    summary: z.string().trim().min(1)
  })
  .strict();

function validatePhase1OrderInAuctionState(
  state: {
    players: z.infer<typeof auctionPlayerSchema>[];
    parameters: z.infer<typeof auctionParametersSchema>;
    phase1Order: z.infer<typeof phase1OrderStateSchema>;
  },
  context: z.RefinementCtx
): void {
  const configuredCategories = state.parameters.phase1CategoryOrder;
  const { phase1Order } = state;

  if (phase1Order.categories.length !== configuredCategories.length) {
    context.addIssue({
      code: "custom",
      message: "phase1Order.categories must include every configured category",
      path: ["phase1Order", "categories"]
    });
    return;
  }

  const seenCategories = new Set<string>();
  for (let index = 0; index < configuredCategories.length; index += 1) {
    const expectedCategory = configuredCategories[index];
    const entry = phase1Order.categories[index];
    if (!entry || entry.category !== expectedCategory) {
      context.addIssue({
        code: "custom",
        message: `phase1Order.categories[${index}] must be ${expectedCategory}`,
        path: ["phase1Order", "categories", index, "category"]
      });
    }
    if (entry && seenCategories.has(entry.category)) {
      context.addIssue({
        code: "custom",
        message: `duplicate phase1Order category ${entry.category}`,
        path: ["phase1Order", "categories", index, "category"]
      });
    }
    if (entry) {
      seenCategories.add(entry.category);
    }
  }

  const flattenedPlayerIds = phase1Order.categories.flatMap(
    (entry) => entry.playerIds
  );
  if (
    flattenedPlayerIds.length !== phase1Order.playerIds.length ||
    flattenedPlayerIds.some(
      (playerId, index) => playerId !== phase1Order.playerIds[index]
    )
  ) {
    context.addIssue({
      code: "custom",
      message: "phase1Order.playerIds must match flattened category playerIds",
      path: ["phase1Order", "playerIds"]
    });
  }

  const rosterPlayerIds = new Set(state.players.map((player) => player.id));
  const orderedPlayerIds = new Set(phase1Order.playerIds);
  if (rosterPlayerIds.size !== orderedPlayerIds.size) {
    context.addIssue({
      code: "custom",
      message: "phase1Order must include each roster player exactly once",
      path: ["phase1Order", "playerIds"]
    });
    return;
  }

  for (const playerId of rosterPlayerIds) {
    if (!orderedPlayerIds.has(playerId)) {
      context.addIssue({
        code: "custom",
        message: `phase1Order missing roster player ${playerId}`,
        path: ["phase1Order", "playerIds"]
      });
    }
  }
}

export const auctionStateBaseSchema = z
  .object({
    auctionId: opaqueIdSchema,
    phase: auctionPhaseSchema,
    parameters: auctionParametersSchema,
    players: z.array(auctionPlayerSchema),
    teams: z.array(auctionTeamSchema),
    phase1Order: phase1OrderStateSchema,
    currentPlayerId: nullableOpaqueIdSchema,
    currentBid: nullableMoneySchema,
    selectedTeamId: nullableOpaqueIdSchema,
    // Defaulted so pre-2.7 persisted states and snapshots without the field still parse.
    phase2Pool: z.array(opaqueIdSchema).default([]),
    undoHistory: z.array(liveActionUndoHistoryEntrySchema),
    createdAt: z.string().trim().min(1),
    updatedAt: z.string().trim().min(1),
    persistenceFailure: z.string().trim().min(1).nullable()
  })
  .strict();

export const auctionStateSchema = auctionStateBaseSchema.superRefine(
  validatePhase1OrderInAuctionState
);

export const boardPlayerDtoSchema = auctionPlayerSchema.pick({
  id: true,
  name: true,
  role: true,
  phase1Category: true,
  basePrice: true,
  status: true,
  photoAssetId: true,
  soldPrice: true,
  winningTeamId: true,
  acquisitionType: true
});

export const teamCurrentPlayerCapacityDtoSchema = z
  .object({
    teamId: opaqueIdSchema,
    canBuy: z.boolean(),
    reasons: z.array(z.string().trim().min(1))
  })
  .strict();

export const boardTeamDtoSchema = auctionTeamSchema.pick({
  id: true,
  name: true,
  captain: true,
  logoAssetId: true,
  budget: true,
  remainingBudget: true,
  squadCount: true,
  roleCounts: true
}).extend({
  currentPlayerCapacity: teamCurrentPlayerCapacityDtoSchema.optional()
});

export const phase1ProgressCategoryDtoSchema = z
  .object({
    category: phase1CategorySchema,
    total: nonnegativeIntegerSchema,
    pending: nonnegativeIntegerSchema,
    completed: nonnegativeIntegerSchema
  })
  .strict();

export const phase1ProgressDtoSchema = z
  .object({
    currentCategory: phase1CategorySchema.nullable(),
    orderedPlayerCount: nonnegativeIntegerSchema,
    pendingPlayerCount: nonnegativeIntegerSchema,
    revealedPlayerCount: nonnegativeIntegerSchema,
    categories: z.array(phase1ProgressCategoryDtoSchema)
  })
  .strict();

export const soldRosterRowSchema = z
  .object({
    playerId: opaqueIdSchema,
    name: z.string().trim().min(1),
    role: auctionRoleSchema,
    acquisitionType: z.literal("Sold"),
    soldPrice: positiveIntegerSchema
  })
  .strict();

export const assignedRosterRowSchema = z
  .object({
    playerId: opaqueIdSchema,
    name: z.string().trim().min(1),
    role: auctionRoleSchema,
    acquisitionType: z.literal("ManualAssignment"),
    soldPrice: z.null()
  })
  .strict();

export const rosterRowSchema = z.union([
  soldRosterRowSchema,
  assignedRosterRowSchema
]);

export const teamRosterDtoSchema = z
  .object({
    teamId: opaqueIdSchema,
    name: z.string().trim().min(1),
    captain: z.string().trim().min(1),
    logoAssetId: z.string().trim().min(1).optional(),
    budget: positiveIntegerSchema,
    remainingBudget: nonnegativeIntegerSchema,
    squadCount: nonnegativeIntegerSchema,
    roleCounts: roleTargetsSchema,
    roster: z.array(rosterRowSchema)
  })
  .strict();

export const boardStateDtoSchema = z
  .object({
    auctionId: opaqueIdSchema,
    phase: auctionPhaseSchema,
    parameters: auctionParametersSchema,
    players: z.array(boardPlayerDtoSchema),
    teams: z.array(boardTeamDtoSchema),
    teamRosters: z.array(teamRosterDtoSchema),
    currentPlayer: boardPlayerDtoSchema.nullable(),
    currentBid: nullableMoneySchema,
    selectedTeamId: nullableOpaqueIdSchema,
    phase2PoolCount: nonnegativeIntegerSchema,
    phase1Progress: phase1ProgressDtoSchema,
    canUndo: z.boolean(),
    lastUndoAction: undoActionSummarySchema.nullable(),
    persistenceFailure: z.string().trim().min(1).nullable()
  })
  .strict();

export const startAuctionRequestSchema = z
  .object({
    clientCommandId: z.string().trim().min(1)
  })
  .strict();

export const revealNextPlayerRequestSchema = z
  .object({
    clientCommandId: z.string().trim().min(1)
  })
  .strict();

export const selectTeamRequestSchema = z
  .object({
    clientCommandId: z.string().trim().min(1),
    teamId: opaqueIdSchema.nullable()
  })
  .strict();

export const increaseBidRequestSchema = z
  .object({
    clientCommandId: z.string().trim().min(1)
  })
  .strict();

export const markSoldRequestSchema = z
  .object({
    clientCommandId: z.string().trim().min(1)
  })
  .strict();

export const markUnsoldRequestSchema = z
  .object({
    clientCommandId: z.string().trim().min(1)
  })
  .strict();

export const undoRequestSchema = z
  .object({
    clientCommandId: z.string().trim().min(1)
  })
  .strict();

export const markSoldConflictReasonCodeSchema = z.enum([
  "budget_exceeded",
  "squad_full",
  "role_target_full",
  "role_capacity_incomplete",
  "auction_not_in_initial_phase",
  "current_player_required",
  "selected_team_required",
  "current_bid_required",
  "selected_team_not_found",
  "current_player_not_found",
  "sale_blocked",
  "auction_not_active",
  "persistence_failure_uncleared",
  "duplicate_client_command_id"
]);

export const markSoldConflictReasonSchema = z
  .object({
    code: markSoldConflictReasonCodeSchema,
    message: z.string().trim().min(1)
  })
  .strict();

export const markSoldRejectedResponseSchema = z
  .object({
    ok: z.literal(false),
    error: markSoldConflictReasonCodeSchema,
    message: z.string().trim().min(1),
    reasons: z.array(markSoldConflictReasonSchema)
  })
  .strict();

export const commandResultSummarySchema = z
  .object({
    command: z.string().trim().min(1),
    clientCommandId: z.string().trim().min(1),
    message: z.string().trim().min(1)
  })
  .strict();

export const startAuctionResponseSchema = z
  .object({
    state: boardStateDtoSchema,
    result: commandResultSummarySchema.extend({
      command: z.literal("StartAuction")
    })
  })
  .strict();

export const revealNextPlayerResponseSchema = z
  .object({
    state: boardStateDtoSchema,
    result: commandResultSummarySchema.extend({
      command: z.literal("RevealNextPlayer")
    })
  })
  .strict();

export const selectTeamResponseSchema = z
  .object({
    state: boardStateDtoSchema,
    result: commandResultSummarySchema.extend({
      command: z.literal("SelectTeam")
    })
  })
  .strict();

export const increaseBidResponseSchema = z
  .object({
    state: boardStateDtoSchema,
    result: commandResultSummarySchema.extend({
      command: z.literal("IncreaseBid")
    })
  })
  .strict();

export const markSoldAcceptedResponseSchema = z
  .object({
    state: boardStateDtoSchema,
    result: commandResultSummarySchema.extend({
      command: z.literal("MarkSold")
    })
  })
  .strict();

export const markSoldResponseSchema = z.union([
  markSoldAcceptedResponseSchema,
  markSoldRejectedResponseSchema
]);

export const markUnsoldConflictReasonCodeSchema = z.enum([
  "auction_not_in_initial_phase",
  "current_player_required",
  "current_player_not_found",
  "player_already_in_phase2_pool",
  "auction_not_active",
  "persistence_failure_uncleared",
  "duplicate_client_command_id",
  "invalid_request"
]);

export const markUnsoldRejectedResponseSchema = z
  .object({
    ok: z.literal(false),
    error: markUnsoldConflictReasonCodeSchema,
    message: z.string().trim().min(1)
  })
  .strict();

export const markUnsoldAcceptedResponseSchema = z
  .object({
    state: boardStateDtoSchema,
    result: commandResultSummarySchema.extend({
      command: z.literal("MarkUnsold")
    })
  })
  .strict();

export const markUnsoldResponseSchema = z.union([
  markUnsoldAcceptedResponseSchema,
  markUnsoldRejectedResponseSchema
]);

export const undoResponseSchema = z
  .object({
    state: boardStateDtoSchema,
    result: commandResultSummarySchema.extend({
      command: z.literal("Undo")
    })
  })
  .strict();

export function deriveSoldRosterRows(
  state: Pick<z.infer<typeof auctionStateSchema>, "players">,
  teamId: string
): z.infer<typeof soldRosterRowSchema>[] {
  return state.players
    .filter(
      (player) =>
        player.winningTeamId === teamId &&
        player.acquisitionType === "Auction" &&
        player.soldPrice !== null
    )
    .map((player) =>
      soldRosterRowSchema.parse({
        playerId: player.id,
        name: player.name,
        role: player.role,
        acquisitionType: "Sold",
        soldPrice: player.soldPrice
      })
    );
}

export const resumeSummarySchema = z
  .object({
    phase: auctionPhaseSchema,
    lastSavedAction: z.string().trim().min(1).nullable(),
    lastSavedAt: z.string().trim().min(1).nullable(),
    pendingPlayerCount: nonnegativeIntegerSchema,
    currentPlayerName: z.string().trim().min(1).nullable(),
    persistenceFailure: z.string().trim().min(1).nullable()
  })
  .strict();

export const appStateResponseSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("setup"),
      state: z.null(),
      resume: z.null()
    })
    .strict(),
  z
    .object({
      mode: z.literal("auction"),
      state: boardStateDtoSchema,
      resume: resumeSummarySchema
    })
    .strict()
]);

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
export type AuctionPhase = z.infer<typeof auctionPhaseSchema>;
export type PlayerStatus = z.infer<typeof playerStatusSchema>;
export type AcquisitionType = z.infer<typeof acquisitionTypeSchema>;
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
export type AuctionPlayer = z.infer<typeof auctionPlayerSchema>;
export type AuctionTeam = z.infer<typeof auctionTeamSchema>;
export type Phase1OrderCategory = z.infer<typeof phase1OrderCategorySchema>;
export type Phase1OrderState = z.infer<typeof phase1OrderStateSchema>;
export type RevealNextPlayerUndoHistoryEntry = z.infer<
  typeof revealNextPlayerUndoHistoryEntrySchema
>;
export type SelectTeamUndoHistoryEntry = z.infer<
  typeof selectTeamUndoHistoryEntrySchema
>;
export type IncreaseBidUndoHistoryEntry = z.infer<
  typeof increaseBidUndoHistoryEntrySchema
>;
export type MarkUnsoldUndoHistoryEntry = z.infer<
  typeof markUnsoldUndoHistoryEntrySchema
>;
export type MarkSoldUndoHistoryEntry = z.infer<
  typeof markSoldUndoHistoryEntrySchema
>;
export type LiveActionUndoHistoryEntry = z.infer<
  typeof liveActionUndoHistoryEntrySchema
>;
export type UndoActionSummary = z.infer<typeof undoActionSummarySchema>;
export type AuctionState = z.infer<typeof auctionStateSchema>;
export type Phase1ProgressCategoryDto = z.infer<
  typeof phase1ProgressCategoryDtoSchema
>;
export type Phase1ProgressDto = z.infer<typeof phase1ProgressDtoSchema>;
export type TeamCurrentPlayerCapacityDto = z.infer<
  typeof teamCurrentPlayerCapacityDtoSchema
>;
export type BoardStateDto = z.infer<typeof boardStateDtoSchema>;
export type TeamRosterDto = z.infer<typeof teamRosterDtoSchema>;
export type StartAuctionRequest = z.infer<typeof startAuctionRequestSchema>;
export type RevealNextPlayerRequest = z.infer<
  typeof revealNextPlayerRequestSchema
>;
export type SelectTeamRequest = z.infer<typeof selectTeamRequestSchema>;
export type IncreaseBidRequest = z.infer<typeof increaseBidRequestSchema>;
export type MarkSoldRequest = z.infer<typeof markSoldRequestSchema>;
export type MarkSoldConflictReasonCode = z.infer<
  typeof markSoldConflictReasonCodeSchema
>;
export type MarkSoldConflictReason = z.infer<typeof markSoldConflictReasonSchema>;
export type CommandResultSummary = z.infer<typeof commandResultSummarySchema>;
export type StartAuctionResponse = z.infer<typeof startAuctionResponseSchema>;
export type RevealNextPlayerResponse = z.infer<
  typeof revealNextPlayerResponseSchema
>;
export type SelectTeamResponse = z.infer<typeof selectTeamResponseSchema>;
export type IncreaseBidResponse = z.infer<typeof increaseBidResponseSchema>;
export type MarkSoldAcceptedResponse = z.infer<
  typeof markSoldAcceptedResponseSchema
>;
export type MarkSoldRejectedResponse = z.infer<
  typeof markSoldRejectedResponseSchema
>;
export type MarkSoldResponse = z.infer<typeof markSoldResponseSchema>;
export type MarkUnsoldRequest = z.infer<typeof markUnsoldRequestSchema>;
export type UndoRequest = z.infer<typeof undoRequestSchema>;
export type MarkUnsoldConflictReasonCode = z.infer<
  typeof markUnsoldConflictReasonCodeSchema
>;
export type MarkUnsoldAcceptedResponse = z.infer<
  typeof markUnsoldAcceptedResponseSchema
>;
export type MarkUnsoldRejectedResponse = z.infer<
  typeof markUnsoldRejectedResponseSchema
>;
export type MarkUnsoldResponse = z.infer<typeof markUnsoldResponseSchema>;
export type UndoResponse = z.infer<typeof undoResponseSchema>;
export type SoldRosterRow = z.infer<typeof soldRosterRowSchema>;
export type AssignedRosterRow = z.infer<typeof assignedRosterRowSchema>;
export type RosterRow = z.infer<typeof rosterRowSchema>;
export type ResumeSummary = z.infer<typeof resumeSummarySchema>;
export type AppStateResponse = z.infer<typeof appStateResponseSchema>;

export {
  getSetupReadiness,
  type SetupReadinessInput
} from "./setup-readiness.js";
