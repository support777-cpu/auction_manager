import {
  auctionRoleValues,
  type AuctionParameters,
  type AuctionPlayer,
  type AuctionState,
  type AuctionTeam,
  type PlayerPhotoReviewResponse,
  type SetupPlayerPreview,
  type SetupReadinessResponse,
  type SetupTeamPreview,
  type TeamLogoReviewResponse
} from "@auction-manager/shared";
import { formatCreatePhase1OrderError } from "./format-phase1-order-error.js";
import { createPhase1Order } from "./phase1-order.js";

export interface StartAuctionFromSetupInput {
  readonly players: readonly SetupPlayerPreview[];
  readonly playerPhotoReview: PlayerPhotoReviewResponse | null;
  readonly teams: readonly SetupTeamPreview[];
  readonly teamLogoReview: TeamLogoReviewResponse | null;
  readonly parameters: AuctionParameters;
  readonly setupReadiness: SetupReadinessResponse;
  readonly clientCommandId: string;
  readonly ids: {
    readonly auctionId: () => string;
    readonly playerId: (player: SetupPlayerPreview, index: number) => string;
    readonly teamId: (team: SetupTeamPreview, index: number) => string;
  };
  readonly now: () => string;
}

export type StartAuctionFromSetupResult =
  | { readonly ok: true; readonly state: AuctionState }
  | { readonly ok: false; readonly blockers: readonly string[] };

export function startAuctionFromSetup(
  input: StartAuctionFromSetupInput
): StartAuctionFromSetupResult {
  if (input.setupReadiness.startAuctionBlocked) {
    return {
      ok: false,
      blockers: input.setupReadiness.blockerMessages
    };
  }

  const auctionId = input.ids.auctionId();
  const timestamp = input.now();
  const players = input.players.map<AuctionPlayer>((player, index) => ({
    id: input.ids.playerId(player, index),
    name: player.name,
    gender: player.gender,
    role: player.role,
    phase1Category: player.phase1Category,
    basePrice: input.parameters.roleBasePrices[player.role],
    status: "Pending",
    ...getMatchedPlayerPhoto(player, input.playerPhotoReview),
    soldPrice: null,
    winningTeamId: null,
    acquisitionType: null
  }));

  const teams = input.teams.map<AuctionTeam>((team, index) => ({
    id: input.ids.teamId(team, index),
    name: team.name,
    captain: team.captain,
    ...getMatchedTeamLogo(team, input.teamLogoReview),
    budget: input.parameters.teamBudget,
    remainingBudget: input.parameters.teamBudget,
    squadCount: 0,
    roleCounts: Object.fromEntries(
      auctionRoleValues.map((role) => [role, 0])
    ) as AuctionTeam["roleCounts"]
  }));
  const phase1Order = createPhase1Order({
    players,
    parameters: input.parameters,
    generatedAt: timestamp
  });

  if (!phase1Order.ok) {
    return {
      ok: false,
      blockers: [formatCreatePhase1OrderError(phase1Order.error)]
    };
  }

  return {
    ok: true,
    state: {
      auctionId,
      phase: "InitialAuction",
      parameters: cloneParameters(input.parameters),
      players,
      teams,
      phase1Order: phase1Order.order,
      currentPlayerId: null,
      currentBid: null,
      selectedTeamId: null,
      undoHistory: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      persistenceFailure: null
    }
  };
}

function getMatchedPlayerPhoto(
  player: SetupPlayerPreview,
  review: PlayerPhotoReviewResponse | null
): { readonly photoAssetId?: string } {
  const match = review?.players.find(
    (record) =>
      record.player.sourceRowNumber === player.sourceRowNumber &&
      record.player.name === player.name &&
      record.status === "matched"
  );

  return match?.photoAssetId ? { photoAssetId: match.photoAssetId } : {};
}

function getMatchedTeamLogo(
  team: SetupTeamPreview,
  review: TeamLogoReviewResponse | null
): { readonly logoAssetId?: string } {
  const match = review?.teams.find(
    (record) =>
      record.team.sourceRowNumber === team.sourceRowNumber &&
      record.team.name === team.name &&
      record.status === "matched"
  );

  return match?.logoAssetId ? { logoAssetId: match.logoAssetId } : {};
}

function cloneParameters(parameters: AuctionParameters): AuctionParameters {
  return {
    roleBasePrices: { ...parameters.roleBasePrices },
    bidIncrement: parameters.bidIncrement,
    teamBudget: parameters.teamBudget,
    maxSquadSize: parameters.maxSquadSize,
    roleTargets: { ...parameters.roleTargets },
    phase1CategoryOrder: [...parameters.phase1CategoryOrder],
    manualAssignmentBudgetBehavior: parameters.manualAssignmentBudgetBehavior
  };
}
