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
  getCurrentPlayerTeamCapacity,
  selectTeam,
  type SelectTeamErrorCode,
  type SelectTeamInput,
  type SelectTeamResult
} from "./select-team.js";
export {
  createPhase1Order,
  type CreatePhase1OrderError,
  type CreatePhase1OrderInput,
  type CreatePhase1OrderResult
} from "./phase1-order.js";
export { formatCreatePhase1OrderError } from "./format-phase1-order-error.js";
