import {
  phase1CategoryValues,
  type AuctionParameterReviewParameters,
  type AuctionParameterValidationIssue,
  type AuctionRole
} from "@auction-manager/shared";

export type ParameterNumberFields = {
  readonly bidIncrement: string;
  readonly teamBudget: string;
  readonly maxSquadSize: string;
  readonly roleBasePrices: Record<AuctionRole, string>;
  readonly roleTargets: Record<AuctionRole, string>;
};

export function createParameterNumberFields(
  parameters: AuctionParameterReviewParameters
): ParameterNumberFields {
  return {
    bidIncrement: formatParameterNumber(parameters.bidIncrement),
    teamBudget: formatParameterNumber(parameters.teamBudget),
    maxSquadSize: formatParameterNumber(parameters.maxSquadSize),
    roleBasePrices: mapRoleNumbers(parameters.roleBasePrices),
    roleTargets: mapRoleNumbers(parameters.roleTargets)
  };
}

export function buildSubmittedParameters(
  numberFields: ParameterNumberFields,
  phase1OrderText: string,
  manualAssignmentBudgetBehavior: AuctionParameterReviewParameters["manualAssignmentBudgetBehavior"]
): Record<string, unknown> {
  const phase1CategoryOrder = parsePhase1CategoryOrderText(phase1OrderText);
  const roleBasePrices = parseRoleNumberMap(numberFields.roleBasePrices);
  const roleTargets = parseRoleNumberMap(numberFields.roleTargets);

  return {
    roleBasePrices,
    bidIncrement: parseParameterNumberInput(numberFields.bidIncrement),
    teamBudget: parseParameterNumberInput(numberFields.teamBudget),
    maxSquadSize: parseParameterNumberInput(numberFields.maxSquadSize),
    roleTargets,
    phase1CategoryOrder,
    manualAssignmentBudgetBehavior
  };
}

export function parsePhase1CategoryOrderText(text: string): string[] {
  return text
    .split(/[,;\n]+/)
    .map((category) => category.trim())
    .filter(Boolean);
}

export function parsePhase1CategoryOrderTextStrict(text: string): {
  readonly order: string[];
  readonly invalidTokens: string[];
} {
  const order = parsePhase1CategoryOrderText(text);
  const invalidTokens = order.filter(
    (category) => !phase1CategoryValues.includes(category as (typeof phase1CategoryValues)[number])
  );
  return { order, invalidTokens };
}

export function parseParameterNumberInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return parsed;
}

export function formatParameterNumber(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

export function formatRoleMap(values: Record<AuctionRole, number>): string {
  return Object.entries(values)
    .map(([role, value]) => `${role} ${value}`)
    .join(", ");
}

export function getParameterIssuesForField(
  issues: readonly AuctionParameterValidationIssue[],
  field: string
) {
  return issues.filter((issue) => issue.field === field);
}

function mapRoleNumbers(values: Record<AuctionRole, number>): Record<AuctionRole, string> {
  return Object.fromEntries(
    Object.entries(values).map(([role, value]) => [role, formatParameterNumber(value)])
  ) as Record<AuctionRole, string>;
}

function parseRoleNumberMap(values: Record<AuctionRole, string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).map(([role, value]) => {
      if (value.trim() === "") {
        return [role, null];
      }

      return [role, parseParameterNumberInput(value)];
    })
  );
}
