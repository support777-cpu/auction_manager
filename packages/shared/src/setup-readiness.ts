import type {
  AuctionParameterReviewResponse,
  PlayerCsvImportReviewResponse,
  SetupReadinessResponse,
  TeamCsvImportReviewResponse
} from "./index.js";

export interface SetupReadinessInput {
  readonly playerCsvReview: PlayerCsvImportReviewResponse | null;
  readonly teamCsvReview: TeamCsvImportReviewResponse | null;
  readonly parameterReview: AuctionParameterReviewResponse | null;
}

const story16ReadyMessage =
  "Ready: setup prerequisites are valid. Start Auction can begin.";

export function getSetupReadiness(input: SetupReadinessInput): SetupReadinessResponse {
  const blockerMessages: string[] = [];

  if (!input.playerCsvReview) {
    blockerMessages.push("Blocked: Player CSV must be imported before Start Auction.");
    return readinessFromMessages(blockerMessages);
  }

  if (input.playerCsvReview.summary.startAuctionBlocked) {
    if (input.playerCsvReview.summary.mustFixCount > 0) {
      const issueLabel =
        input.playerCsvReview.summary.mustFixCount === 1 ? "issue" : "issues";
      blockerMessages.push(
        `Blocked: ${input.playerCsvReview.summary.mustFixCount} Player CSV ${issueLabel} must be fixed in the source CSV and reimported.`
      );
    } else {
      blockerMessages.push(
        "Blocked: Player CSV must include at least one valid Player row."
      );
    }
    return readinessFromMessages(blockerMessages);
  }

  if (!input.teamCsvReview) {
    blockerMessages.push("Blocked: Team CSV must be imported before Start Auction.");
    return readinessFromMessages(blockerMessages);
  }

  if (input.teamCsvReview.summary.startAuctionBlocked) {
    if (input.teamCsvReview.summary.mustFixCount > 0) {
      const issueLabel =
        input.teamCsvReview.summary.mustFixCount === 1 ? "issue" : "issues";
      blockerMessages.push(
        `Blocked: ${input.teamCsvReview.summary.mustFixCount} Team CSV ${issueLabel} must be fixed in the source CSV and reimported.`
      );
    } else {
      blockerMessages.push(
        "Blocked: Team CSV must include at least one valid Team row."
      );
    }
    return readinessFromMessages(blockerMessages);
  }

  if (!input.parameterReview) {
    blockerMessages.push(
      "Blocked: Auction Parameters must be loaded before Start Auction."
    );
    return readinessFromMessages(blockerMessages);
  }

  if (input.parameterReview.startAuctionBlocked) {
    blockerMessages.push(
      ...input.parameterReview.blockingReasons.map(
        (issue) => `Blocked: Auction Parameters need attention. ${issue.message}`
      )
    );
    return readinessFromMessages(blockerMessages);
  }

  return {
    startAuctionBlocked: false,
    primaryBlockerMessage: story16ReadyMessage,
    blockerMessages: [],
    story16Ready: true
  };
}

function readinessFromMessages(blockerMessages: string[]): SetupReadinessResponse {
  return {
    startAuctionBlocked: blockerMessages.length > 0,
    primaryBlockerMessage: blockerMessages[0] ?? story16ReadyMessage,
    blockerMessages,
    story16Ready: false
  };
}
