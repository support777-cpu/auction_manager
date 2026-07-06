import { parse } from "csv-parse/sync";
import {
  importIssueSeverityValues,
  playerCsvImportReviewResponseSchema,
  type AuctionRole,
  type Gender,
  type ImportIssue,
  type ImportIssueCode,
  type ImportIssueSeverity,
  type Phase1Category,
  type PlayerCsvImportReviewResponse,
  type SetupPlayerPreview
} from "@auction-manager/shared";

export const playerCsvRequiredHeaders = [
  "Timestamp",
  "Email address",
  "Score",
  "Place and Pastor Name",
  "Full Name",
  "Gender",
  "Mobile Number",
  "Email",
  "Skill",
  "TShirt Size",
  "Jersey Number",
  "Meal Preference (only applicable for Registrants Outside of Bangalore)",
  "Photo Upload",
  "Payment Confirmation",
  "Payment Transaction Id",
  "Validated"
] as const;

type PlayerCsvRequiredHeader = (typeof playerCsvRequiredHeaders)[number];
type CsvRecord = Record<string, string | undefined>;
type NormalizedSkill = "Ace" | "Batting" | "Bowling" | "AllRounder";

const auctionSourceColumns = new Set<PlayerCsvRequiredHeader>([
  "Full Name",
  "Gender",
  "Skill"
]);

const maxPlayerCsvRecordSizeBytes = 32 * 1024;

export function parsePlayerCsvForSetup(csvText: string): PlayerCsvImportReviewResponse {
  const parsedCsv = parseCsv(csvText);

  if (!parsedCsv.ok) {
    return buildReview({
      players: [],
      issues: [
        createIssue({
          id: "parse-error",
          severity: "must_fix",
          code: "parse_error",
          message: "Player CSV could not be parsed. Export the source sheet as CSV and reimport."
        })
      ],
      totalRows: 0
    });
  }

  const { headers, rows } = parsedCsv;
  const issues: ImportIssue[] = [];
  const players: SetupPlayerPreview[] = [];
  const headerSet = new Set(headers);

  issues.push(...createIgnoredSourceFieldIssues(headers));

  for (const missingHeader of playerCsvRequiredHeaders.filter((header) => !headerSet.has(header))) {
    issues.push(
      createIssue({
        id: `header-${slugify(missingHeader)}-missing`,
        severity: "must_fix",
        code: "missing_required_header",
        message: `${missingHeader} is missing from the Player CSV export.`,
        sourceColumn: missingHeader
      })
    );
  }

  if (hasMustFixHeaderIssues(issues)) {
    return buildReview({
      players,
      issues,
      totalRows: rows.length
    });
  }

  if (rows.length === 0) {
    issues.push(
      createIssue({
        id: "no-player-rows",
        severity: "must_fix",
        code: "missing_required_value",
        message: "Player CSV contains headers but no Player rows."
      })
    );

    return buildReview({
      players,
      issues,
      totalRows: 0
    });
  }

  rows.forEach((row, rowIndex) => {
    const sourceRowNumber = rowIndex + 2;
    const rowIssues: ImportIssue[] = [];
    const name = getCell(row, "Full Name");
    const rawGender = getCell(row, "Gender");
    const rawSkill = getCell(row, "Skill");

    if (!name) {
      rowIssues.push(
        createIssue({
          id: `row-${sourceRowNumber}-full-name-missing`,
          severity: "must_fix",
          code: "missing_required_value",
          message: `Row ${sourceRowNumber} is missing Full Name.`,
          sourceColumn: "Full Name",
          sourceRowNumber
        })
      );
    }

    const gender = normalizeGender(rawGender);
    if (!rawGender) {
      rowIssues.push(
        createIssue({
          id: `row-${sourceRowNumber}-gender-missing`,
          severity: "must_fix",
          code: "missing_required_value",
          message: `Row ${sourceRowNumber} is missing Gender.`,
          sourceColumn: "Gender",
          sourceRowNumber,
          ...safePlayerName(name)
        })
      );
    } else if (!gender) {
      rowIssues.push(
        createIssue({
          id: `row-${sourceRowNumber}-gender-unknown`,
          severity: "must_fix",
          code: "unknown_gender",
          message: `Row ${sourceRowNumber} has an unknown Gender.`,
          sourceColumn: "Gender",
          sourceRowNumber,
          ...safePlayerName(name)
        })
      );
    }

    const skill = normalizeSkill(rawSkill);
    if (!rawSkill) {
      rowIssues.push(
        createIssue({
          id: `row-${sourceRowNumber}-skill-missing`,
          severity: "must_fix",
          code: "missing_required_value",
          message: `Row ${sourceRowNumber} is missing Skill.`,
          sourceColumn: "Skill",
          sourceRowNumber,
          ...safePlayerName(name)
        })
      );
    } else if (!skill) {
      rowIssues.push(
        createIssue({
          id: `row-${sourceRowNumber}-skill-unknown`,
          severity: "must_fix",
          code: "unknown_skill",
          message: `Row ${sourceRowNumber} has an unrecognized Skill value.`,
          sourceColumn: "Skill",
          sourceRowNumber,
          ...safePlayerName(name)
        })
      );
    }

    const mapping = gender && skill ? mapRoleAndCategory(gender, skill) : null;
    if (gender && skill && !mapping) {
      rowIssues.push(
        createIssue({
          id: `row-${sourceRowNumber}-phase1-category-unmapped`,
          severity: "must_fix",
          code: "unmapped_phase1_category",
          message: `Row ${sourceRowNumber} cannot be mapped to a configured Phase 1 Category.`,
          sourceColumn: "Skill",
          sourceRowNumber,
          ...safePlayerName(name)
        })
      );
    }

    if (rowIssues.length > 0) {
      issues.push(...rowIssues);
      return;
    }

    if (name && gender && mapping) {
      players.push({
        sourceRowNumber,
        name,
        gender,
        role: mapping.role,
        phase1Category: mapping.phase1Category
      });
    }
  });

  return buildReview({
    players,
    issues,
    totalRows: rows.length
  });
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
      max_record_size: maxPlayerCsvRecordSizeBytes,
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
    .filter((header) => !auctionSourceColumns.has(header as PlayerCsvRequiredHeader))
    .map((header) =>
      createIssue({
        id: `ignored-${slugify(header)}`,
        severity: "ignored_source_field",
        code: "ignored_source_field",
        message: `${header} is accepted from registration exports but ignored for auction setup.`,
        sourceColumn: header
      })
    );
}

function hasMustFixHeaderIssues(issues: readonly ImportIssue[]): boolean {
  return issues.some((issue) => issue.code === "missing_required_header");
}

function getCell(row: CsvRecord, header: PlayerCsvRequiredHeader): string {
  return (row[header] ?? "").trim();
}

function normalizeGender(rawGender: string): Gender | null {
  const normalized = rawGender.trim().toLowerCase();

  if (normalized === "male") {
    return "Male";
  }

  if (normalized === "female") {
    return "Female";
  }

  return null;
}

function normalizeSkill(rawSkill: string): NormalizedSkill | null {
  const normalized = rawSkill.trim().toLowerCase().replace(/[\s-]/g, "");

  if (normalized === "ace") {
    return "Ace";
  }

  if (normalized === "batting") {
    return "Batting";
  }

  if (normalized === "bowling") {
    return "Bowling";
  }

  if (normalized === "allrounder") {
    return "AllRounder";
  }

  return null;
}

function mapRoleAndCategory(
  gender: Gender,
  skill: NormalizedSkill
): { role: AuctionRole; phase1Category: Phase1Category } | null {
  const mapping: Partial<
    Record<Gender, Partial<Record<NormalizedSkill, { role: AuctionRole; phase1Category: Phase1Category }>>>
  > = {
    Male: {
      Ace: { role: "Ace", phase1Category: "Ace Men" },
      Batting: { role: "Batting", phase1Category: "Men Batsmen" },
      Bowling: { role: "Bowling", phase1Category: "Men Bowlers" },
      AllRounder: { role: "AllRounder", phase1Category: "Men All Rounders" }
    },
    Female: {
      Ace: { role: "Ace", phase1Category: "Ace Women" },
      AllRounder: { role: "Girls", phase1Category: "Women All Rounders" }
    }
  };

  return mapping[gender]?.[skill] ?? null;
}

function buildReview({
  players,
  issues,
  totalRows
}: {
  players: readonly SetupPlayerPreview[];
  issues: readonly ImportIssue[];
  totalRows: number;
}): PlayerCsvImportReviewResponse {
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

  return playerCsvImportReviewResponseSchema.parse({
    players,
    issueGroups,
    summary: {
      totalRows,
      importedPlayers: players.length,
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
  playerName
}: {
  id: string;
  severity: ImportIssueSeverity;
  code: ImportIssueCode;
  message: string;
  sourceColumn?: string;
  sourceRowNumber?: number;
  playerName?: string;
}): ImportIssue {
  return {
    id,
    severity,
    code,
    message,
    ...(sourceColumn ? { sourceColumn } : {}),
    ...(sourceRowNumber ? { sourceRowNumber } : {}),
    ...(playerName ? { playerName } : {})
  };
}

function safePlayerName(name: string): { playerName: string } | Record<string, never> {
  return name ? { playerName: name } : {};
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
