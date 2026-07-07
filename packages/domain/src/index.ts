export const domainPackageReady = true;

export {
  applyAuctionParameterDraft,
  getDefaultAuctionParameters,
  validateAuctionParametersForSetup,
  type AuctionParameterDraft,
  type AuctionParameterSetupContext
} from "./auction-parameters.js";

export {
  getSetupReadiness,
  type SetupReadinessInput
} from "./setup-readiness.js";

export {
  startAuctionFromSetup,
  type StartAuctionFromSetupInput,
  type StartAuctionFromSetupResult
} from "./start-auction.js";
export {
  revealNextPlayer,
  type RevealNextPlayerErrorCode,
  type RevealNextPlayerInput,
  type RevealNextPlayerResult
} from "./reveal-next-player.js";
export {
  getCurrentPlayerTeamCapacityDetails,
  getCurrentPlayerTeamCapacity,
  selectTeam,
  type CurrentPlayerTeamCapacityDetails,
  type SelectTeamErrorCode,
  type SelectTeamInput,
  type SelectTeamResult,
  type TeamCapacityReason,
  type TeamCapacityReasonCode
} from "./select-team.js";
export {
  increaseBid,
  type IncreaseBidErrorCode,
  type IncreaseBidInput,
  type IncreaseBidResult
} from "./increase-bid.js";
export {
  markSold,
  type MarkSoldErrorCode,
  type MarkSoldInput,
  type MarkSoldResult
} from "./mark-sold.js";
export {
  createPhase1Order,
  type CreatePhase1OrderError,
  type CreatePhase1OrderInput,
  type CreatePhase1OrderResult
} from "./phase1-order.js";
export { formatCreatePhase1OrderError } from "./format-phase1-order-error.js";
