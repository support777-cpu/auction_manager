import {
  auctionRoleValues,
  phase1CategoryValues,
  type AuctionParameterReviewParameters,
  type AuctionParameterReviewResponse,
  type AuctionParameterValidationIssue,
  type AuctionParameters,
  type AuctionRole,
  type Phase1Category
} from "@auction-manager/shared";

export interface AuctionParameterSetupContext {
  readonly importedPlayerRoles: readonly AuctionRole[];
  readonly importedTeamCount: number;
}

export type AuctionParameterDraft = Partial<{
  readonly roleBasePrices: Partial<Record<AuctionRole, unknown>>;
  readonly bidIncrement: unknown;
  readonly teamBudget: unknown;
  readonly maxSquadSize: unknown;
  readonly roleTargets: Partial<Record<AuctionRole, unknown>>;
  readonly phase1CategoryOrder: readonly unknown[];
  readonly manualAssignmentBudgetBehavior: unknown;
}>;

const defaultAuctionParameters: AuctionParameters = {
  roleBasePrices: {
    Ace: 10,
    Batting: 8,
    Bowling: 6,
    AllRounder: 6,
    Girls: 6
  },
  bidIncrement: 2,
  teamBudget: 170,
  maxSquadSize: 13,
  roleTargets: {
    Ace: 2,
    Batting: 3,
    Bowling: 2,
    AllRounder: 2,
    Girls: 2
  },
  phase1CategoryOrder: [
    "Ace Men",
    "Ace Women",
    "Women All Rounders",
    "Men Bowlers",
    "Men Batsmen",
    "Men All Rounders"
  ],
  manualAssignmentBudgetBehavior: "NoBudgetImpact"
};

export function getDefaultAuctionParameters(): AuctionParameters {
  return cloneParameters(defaultAuctionParameters);
}

export function validateAuctionParametersForSetup(
  parameters: AuctionParameterDraft,
  context: AuctionParameterSetupContext
): AuctionParameterReviewResponse {
  const issues: AuctionParameterValidationIssue[] = [];

  if (context.importedTeamCount === 0) {
    issues.push(
      issue(
        "no-imported-teams",
        "no_imported_teams",
        "teamBudget",
        "Team CSV must be imported before Auction Parameters can be validated."
      )
    );
  }

  for (const role of auctionRoleValues) {
    const value = parameters.roleBasePrices?.[role];
    if (
      (value === undefined || value === null) &&
      context.importedPlayerRoles.includes(role)
    ) {
      issues.push(
        issue(
          `missing-role-price-${role.toLowerCase()}`,
          "missing_role_base_price",
          `roleBasePrices.${role}`,
          `Base price is missing for ${role}.`
        )
      );
      continue;
    }

    if (value !== undefined && !isPositiveInteger(value)) {
      issues.push(
        issue(
          `invalid-role-price-${role.toLowerCase()}`,
          "invalid_role_base_price",
          `roleBasePrices.${role}`,
          `Base price for ${role} must be a positive integer.`
        )
      );
    }
  }

  if (!isPositiveInteger(parameters.bidIncrement)) {
    issues.push(
      issue(
        "invalid-bid-increment",
        "invalid_bid_increment",
        "bidIncrement",
        "Bid increment must be a positive integer."
      )
    );
  }

  if (!isPositiveInteger(parameters.teamBudget)) {
    issues.push(
      issue(
        "invalid-team-budget",
        "invalid_team_budget",
        "teamBudget",
        "Team budget must be a positive integer."
      )
    );
  }

  if (!isPositiveInteger(parameters.maxSquadSize)) {
    issues.push(
      issue(
        "invalid-max-squad-size",
        "invalid_max_squad_size",
        "maxSquadSize",
        "Maximum squad size must be a positive integer."
      )
    );
  }

  for (const role of auctionRoleValues) {
    const value = parameters.roleTargets?.[role];
    if (value !== undefined && !isNonnegativeInteger(value)) {
      issues.push(
        issue(
          `invalid-role-target-${role.toLowerCase()}`,
          "invalid_role_target",
          `roleTargets.${role}`,
          `Role target for ${role} must be a nonnegative integer.`
        )
      );
    }
  }

  const targetTotal = auctionRoleValues.reduce((total, role) => {
    const value = parameters.roleTargets?.[role];
    return total + (typeof value === "number" && Number.isInteger(value) ? value : 0);
  }, 0);
  const maxSquadSize = parameters.maxSquadSize;
  if (
    isNonnegativeInteger(targetTotal) &&
    isPositiveInteger(maxSquadSize) &&
    targetTotal > maxSquadSize
  ) {
    issues.push(
      issue(
        "role-targets-exceed-max-squad-size",
        "role_targets_exceed_max_squad_size",
        "roleTargets",
        `Role targets total ${targetTotal}, which exceeds max squad size ${maxSquadSize}.`
      )
    );
  }

  if (!isExactPhase1Permutation(parameters.phase1CategoryOrder)) {
    issues.push(
      issue(
        "invalid-phase1-category-order",
        "invalid_phase1_category_order",
        "phase1CategoryOrder",
        "Phase 1 category order must include every category exactly once."
      )
    );
  }

  if (parameters.manualAssignmentBudgetBehavior !== "NoBudgetImpact") {
    issues.push(
      issue(
        "unsupported-manual-assignment-budget-behavior",
        "unsupported_manual_assignment_budget_behavior",
        "manualAssignmentBudgetBehavior",
        "Manual assignment budget behavior must be NoBudgetImpact."
      )
    );
  }

  const reviewParameters = buildReviewParameters(parameters);
  const responseParameters = issues.length > 0
    ? reviewParameters
    : normalizeParameters(parameters);

  return {
    parameters: responseParameters,
    blockingReasons: issues,
    reasonsByField: groupIssuesByField(issues),
    startAuctionBlocked: issues.length > 0
  };
}

export function applyAuctionParameterDraft(
  previous: AuctionParameters,
  patch: AuctionParameterDraft,
  context: AuctionParameterSetupContext
): AuctionParameterReviewResponse {
  const next: AuctionParameterDraft = {
    ...cloneParameters(previous),
    ...patch,
    roleBasePrices: {
      ...previous.roleBasePrices,
      ...patch.roleBasePrices
    },
    roleTargets: {
      ...previous.roleTargets,
      ...patch.roleTargets
    },
    phase1CategoryOrder: patch.phase1CategoryOrder ?? previous.phase1CategoryOrder
  };

  return validateAuctionParametersForSetup(next, context);
}

function buildReviewParameters(
  parameters: AuctionParameterDraft
): AuctionParameterReviewParameters {
  const defaults = getDefaultAuctionParameters();

  return {
    roleBasePrices: buildRoleNumberMap(parameters.roleBasePrices, defaults.roleBasePrices),
    bidIncrement: coerceReviewNumber(parameters.bidIncrement, defaults.bidIncrement),
    teamBudget: coerceReviewNumber(parameters.teamBudget, defaults.teamBudget),
    maxSquadSize: coerceReviewNumber(parameters.maxSquadSize, defaults.maxSquadSize),
    roleTargets: buildRoleNumberMap(parameters.roleTargets, defaults.roleTargets),
    phase1CategoryOrder: Array.isArray(parameters.phase1CategoryOrder)
      ? parameters.phase1CategoryOrder.map(String)
      : [...defaults.phase1CategoryOrder],
    manualAssignmentBudgetBehavior:
      typeof parameters.manualAssignmentBudgetBehavior === "string"
        ? parameters.manualAssignmentBudgetBehavior
        : defaults.manualAssignmentBudgetBehavior
  };
}

function buildRoleNumberMap(
  draft: Partial<Record<AuctionRole, unknown>> | undefined,
  defaults: Record<AuctionRole, number>
): Record<AuctionRole, number> {
  const normalized = {} as Record<AuctionRole, number>;
  for (const role of auctionRoleValues) {
    const value = draft?.[role];
    if (value === null) {
      normalized[role] = 0;
      continue;
    }
    if (value === undefined) {
      normalized[role] = defaults[role];
      continue;
    }
    normalized[role] = coerceReviewNumber(value, defaults[role]);
  }
  return normalized;
}

function coerceReviewNumber(value: unknown, fallback: number): number {
  if (value === null || value === undefined) {
    return fallback;
  }

  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeParameters(parameters: AuctionParameterDraft): AuctionParameters {
  const defaults = getDefaultAuctionParameters();

  return {
    roleBasePrices: normalizeRoleNumberMap(
      parameters.roleBasePrices,
      defaults.roleBasePrices,
      isPositiveInteger
    ),
    bidIncrement: isPositiveInteger(parameters.bidIncrement)
      ? parameters.bidIncrement
      : defaults.bidIncrement,
    teamBudget: isPositiveInteger(parameters.teamBudget)
      ? parameters.teamBudget
      : defaults.teamBudget,
    maxSquadSize: isPositiveInteger(parameters.maxSquadSize)
      ? parameters.maxSquadSize
      : defaults.maxSquadSize,
    roleTargets: normalizeRoleNumberMap(
      parameters.roleTargets,
      defaults.roleTargets,
      isNonnegativeInteger
    ),
    phase1CategoryOrder: isExactPhase1Permutation(parameters.phase1CategoryOrder)
      ? [...parameters.phase1CategoryOrder]
      : defaults.phase1CategoryOrder,
    manualAssignmentBudgetBehavior:
      parameters.manualAssignmentBudgetBehavior === "NoBudgetImpact"
        ? "NoBudgetImpact"
        : defaults.manualAssignmentBudgetBehavior
  };
}

function normalizeRoleNumberMap(
  draft: Partial<Record<AuctionRole, unknown>> | undefined,
  defaults: Record<AuctionRole, number>,
  predicate: (value: unknown) => value is number
): Record<AuctionRole, number> {
  const normalized = {} as Record<AuctionRole, number>;
  for (const role of auctionRoleValues) {
    const value = draft?.[role];
    normalized[role] = predicate(value) ? value : defaults[role];
  }
  return normalized;
}

function issue(
  id: string,
  code: AuctionParameterValidationIssue["code"],
  field: string,
  message: string
): AuctionParameterValidationIssue {
  return { id, code, field, message };
}

function groupIssuesByField(
  issues: readonly AuctionParameterValidationIssue[]
): Record<string, AuctionParameterValidationIssue[]> {
  return issues.reduce<Record<string, AuctionParameterValidationIssue[]>>(
    (groups, validationIssue) => {
      const fieldIssues = groups[validationIssue.field] ?? [];
      fieldIssues.push(validationIssue);
      groups[validationIssue.field] = fieldIssues;
      return groups;
    },
    {}
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isExactPhase1Permutation(
  order: readonly unknown[] | undefined
): order is readonly Phase1Category[] {
  if (!order || order.length !== phase1CategoryValues.length) {
    return false;
  }
  return phase1CategoryValues.every(
    (category) => order.filter((candidate) => candidate === category).length === 1
  );
}

function cloneParameters(parameters: AuctionParameters): AuctionParameters {
  return {
    ...parameters,
    roleBasePrices: { ...parameters.roleBasePrices },
    roleTargets: { ...parameters.roleTargets },
    phase1CategoryOrder: [...parameters.phase1CategoryOrder]
  };
}
