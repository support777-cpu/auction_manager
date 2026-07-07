import { parse } from "csv-parse/sync";
import {
  importIssueSeverityValues,
  teamCsvImportReviewResponseSchema,
  type ImportIssue,
  type ImportIssueCode,
  type ImportIssueSeverity,
  type SetupTeamPreview,
  type TeamCsvImportReviewResponse
} from "@auction-manager/shared";

export const teamCsvCanonicalRequiredHeaders = ["Team Name", "Captain Name"] as const;
export const teamCsvAliasHeaders = {
  "Team Name": "Team",
  "Captain Name": "Captain"
} as const;

type TeamCsvCanonicalRequiredHeader = (typeof teamCsvCanonicalRequiredHeaders)[number];
type CsvRecord = Record<string, string | undefined>;

export interface TeamCsvSetupStaging {
  readonly review: TeamCsvImportReviewResponse;
  readonly teams: readonly SetupTeamPreview[];
}

const acceptedTeamCsvHeaders = new Set<string>([
  ...teamCsvCanonicalRequiredHeaders,
  ...Object.values(teamCsvAliasHeaders)
]);
const maxTeamCsvRecordSizeBytes = 32 * 1024;

export function parseTeamCsvForSetup(csvText: string): TeamCsvImportReviewResponse {
  return parseTeamCsvForSetupStaging(csvText).review;
}

export function parseTeamCsvForSetupStaging(csvText: string): TeamCsvSetupStaging {
  const parsedCsv = parseCsv(csvText);

  if (!parsedCsv.ok) {
    return {
      review: buildReview({
        teams: [],
        issues: [
          createIssue({
            id: "team-parse-error",
            severity: "must_fix",
            code: "parse_error",
            message: "Team CSV could not be parsed. Export the source sheet as CSV and reimport."
          })
        ],
        totalRows: 0
      }),
      teams: []
    };
  }

  const { headers, rows } = parsedCsv;
  const issues: ImportIssue[] = [];
  const teams: SetupTeamPreview[] = [];
  const headerSet = new Set(headers);

  issues.push(...createIgnoredSourceFieldIssues(headers));

  for (const requiredHeader of teamCsvCanonicalRequiredHeaders) {
    const aliasHeader = teamCsvAliasHeaders[requiredHeader];
    if (!headerSet.has(requiredHeader) && !headerSet.has(aliasHeader)) {
      issues.push(
        createIssue({
          id: `team-header-${slugify(requiredHeader)}-missing`,
          severity: "must_fix",
          code: "missing_required_header",
          message: `${requiredHeader} is missing from the Team CSV export.`,
          sourceColumn: requiredHeader
        })
      );
    }
  }

  if (hasMustFixHeaderIssues(issues)) {
    return {
      review: buildReview({
        teams,
        issues,
        totalRows: rows.length
      }),
      teams
    };
  }

  if (rows.length === 0) {
    issues.push(
      createIssue({
        id: "no-team-rows",
        severity: "must_fix",
        code: "missing_required_value",
        message: "Team CSV contains headers but no Team rows."
      })
    );

    return {
      review: buildReview({
        teams,
        issues,
        totalRows: 0
      }),
      teams
    };
  }

  const normalizedNameCounts = countNormalizedTeamNames(rows);

  rows.forEach((row, rowIndex) => {
    const sourceRowNumber = rowIndex + 2;
    const rowIssues: ImportIssue[] = [];
    const name = getCell(row, "Team Name");
    const captain = getCell(row, "Captain Name");
    const normalizedName = normalizeTeamName(name);

    if (!name) {
      rowIssues.push(
        createIssue({
          id: `row-${sourceRowNumber}-team-name-missing`,
          severity: "must_fix",
          code: "missing_team_name",
          message: `Row ${sourceRowNumber} is missing Team Name.`,
          sourceColumn: "Team Name",
          sourceRowNumber
        })
      );
    } else if ((normalizedNameCounts.get(normalizedName) ?? 0) > 1) {
      rowIssues.push(
        createIssue({
          id: `row-${sourceRowNumber}-team-name-duplicate`,
          severity: "must_fix",
          code: "duplicate_team_name",
          message: `${name} appears more than once in the Team CSV.`,
          sourceColumn: "Team Name",
          sourceRowNumber,
          teamName: name
        })
      );
    }

    if (!captain) {
      rowIssues.push(
        createIssue({
          id: `row-${sourceRowNumber}-captain-name-missing`,
          severity: "must_fix",
          code: "missing_captain_name",
          message: `Row ${sourceRowNumber} is missing Captain Name.`,
          sourceColumn: "Captain Name",
          sourceRowNumber,
          ...safeTeamName(name)
        })
      );
    }

    if (rowIssues.length > 0) {
      issues.push(...rowIssues);
      return;
    }

    teams.push({
      sourceRowNumber,
      name,
      captain
    });
  });

  if (teams.length === 0) {
    issues.push(
      createIssue({
        id: "no-valid-team-rows",
        severity: "must_fix",
        code: "missing_required_value",
        message: "Team CSV contains no valid Team rows."
      })
    );
  }

  return {
    review: buildReview({
      teams,
      issues,
      totalRows: rows.length
    }),
    teams
  };
}

function parseCsv(csvText: string):
  | { ok: true; headers: readonly string[]; rows: readonly CsvRecord[] }
  | { ok: false } {
  let headers: string[] = [];

  try {
    const parsed = parse(csvText, {
      bom: true,
      columns: (sourceHeaders: string[]) => {
        headers = sourceHeaders.map((header) => header.trim());
        return headers;
      },
      max_record_size: maxTeamCsvRecordSizeBytes,
      skip_empty_lines: true,
      trim: true
    }) as unknown;

    const rows = toCsvRecords(parsed);
    return rows ? { ok: true, headers, rows } : { ok: false };
  } catch {
    return { ok: false };
  }
}

function toCsvRecords(parsed: unknown): CsvRecord[] | null {
  if (!Array.isArray(parsed)) {
    return null;
  }

  const rows: CsvRecord[] = [];
  for (const item of parsed) {
    if (!isRecord(item)) {
      return null;
    }

    const row: CsvRecord = {};
    for (const [key, value] of Object.entries(item)) {
      row[key] = typeof value === "string" ? value : String(value ?? "");
    }
    rows.push(row);
  }

  return rows;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createIgnoredSourceFieldIssues(headers: readonly string[]): ImportIssue[] {
  return headers
    .filter((header) => !acceptedTeamCsvHeaders.has(header))
    .map((header) =>
      createIssue({
        id: `team-ignored-${slugify(header)}`,
        severity: "ignored_source_field",
        code: "ignored_source_field",
        message: `${header} is ignored for Team CSV setup.`,
        sourceColumn: header
      })
    );
}

function hasMustFixHeaderIssues(issues: readonly ImportIssue[]): boolean {
  return issues.some((issue) => issue.code === "missing_required_header");
}

function countNormalizedTeamNames(rows: readonly CsvRecord[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const name = getCell(row, "Team Name");
    const normalized = normalizeTeamName(name);
    if (!normalized) {
      continue;
    }

    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return counts;
}

function getCell(row: CsvRecord, canonicalHeader: TeamCsvCanonicalRequiredHeader): string {
  return (
    row[canonicalHeader]?.trim() ||
    row[teamCsvAliasHeaders[canonicalHeader]]?.trim() ||
    ""
  );
}

function normalizeTeamName(value: string): string {
  return value.trim().toLowerCase();
}

function buildReview({
  teams,
  issues,
  totalRows
}: {
  teams: readonly SetupTeamPreview[];
  issues: readonly ImportIssue[];
  totalRows: number;
}): TeamCsvImportReviewResponse {
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

  return teamCsvImportReviewResponseSchema.parse({
    teams,
    issueGroups,
    summary: {
      totalRows,
      importedTeams: teams.length,
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

function createIssue({
  id,
  severity,
  code,
  message,
  sourceColumn,
  sourceRowNumber,
  teamName
}: {
  id: string;
  severity: ImportIssueSeverity;
  code: ImportIssueCode;
  message: string;
  sourceColumn?: string;
  sourceRowNumber?: number;
  teamName?: string;
}): ImportIssue {
  return {
    id,
    severity,
    code,
    message,
    ...(sourceColumn ? { sourceColumn } : {}),
    ...(sourceRowNumber ? { sourceRowNumber } : {}),
    ...(teamName ? { teamName } : {})
  };
}

function safeTeamName(name: string): { teamName: string } | Record<string, never> {
  return name ? { teamName: name } : {};
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
