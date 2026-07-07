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
