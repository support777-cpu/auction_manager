import type {
  AuctionRole,
  BoardStateDto,
  Phase1ProgressDto,
  SoldRosterRow,
  TeamRosterDto
} from "@auction-manager/shared";

export function formatAuctionRoleLabel(role: AuctionRole): string {
  return role === "AllRounder" ? "All Rounder" : role;
}

export function getTeamRoster(
  boardState: BoardStateDto,
  teamId: string
): TeamRosterDto | undefined {
  return boardState.teamRosters.find((roster) => roster.teamId === teamId);
}

export function canSwitchLiveView(boardState: BoardStateDto): boolean {
  return boardState.persistenceFailure === null;
}

export function formatRoleCountsSummary(
  roleCounts: TeamRosterDto["roleCounts"]
): string {
  const roles: AuctionRole[] = ["Ace", "Batting", "Bowling", "AllRounder", "Girls"];
  return roles
    .map((role) => `${formatAuctionRoleLabel(role)} ${roleCounts[role]}`)
    .join(" · ");
}

export function getTeamCapacityCopy(
  boardState: BoardStateDto,
  teamId: string
): string {
  const team = boardState.teams.find((entry) => entry.id === teamId);
  const roster = getTeamRoster(boardState, teamId);
  const soldCount = roster?.roster.length ?? 0;
  const currentPlayer = boardState.currentPlayer;

  if (currentPlayer === null) {
    return soldCount > 0
      ? `${soldCount} sold player(s) on squad`
      : "Capacity pending Current Player";
  }

  const capacity = team?.currentPlayerCapacity;
  if (!capacity) {
    return "Capacity pending Current Player";
  }

  if (!capacity.canBuy) {
    return capacity.reasons.join(" ") || "Cannot buy current player";
  }

  const roleCount = team?.roleCounts[currentPlayer.role];
  const roleTarget = boardState.parameters.roleTargets[currentPlayer.role];
  return `${roleCount ?? 0} of ${roleTarget ?? "?"} ${formatAuctionRoleLabel(currentPlayer.role)} slots available`;
}

export function getSoldRosterRowsForTeam(
  boardState: BoardStateDto,
  teamId: string
): SoldRosterRow[] {
  return getTeamRoster(boardState, teamId)?.roster ?? [];
}

export function getPhase1OrderStatusLabel(progress: Phase1ProgressDto): string {
  if (progress.orderedPlayerCount === 0) {
    return "No Phase 1 players ordered";
  }
  if (progress.pendingPlayerCount === progress.orderedPlayerCount) {
    return "Phase 1 order ready";
  }
  if (progress.pendingPlayerCount === 0) {
    return "Phase 1 order complete";
  }
  return "Phase 1 in progress";
}

export function canRevealNextPlayer(boardState: BoardStateDto): boolean {
  return (
    boardState.phase === "InitialAuction" &&
    boardState.currentPlayer === null &&
    boardState.phase1Progress.pendingPlayerCount > 0 &&
    boardState.persistenceFailure === null
  );
}

export function canSelectTeam(boardState: BoardStateDto): boolean {
  return (
    boardState.phase === "InitialAuction" &&
    boardState.currentPlayer !== null &&
    boardState.currentBid !== null &&
    boardState.persistenceFailure === null
  );
}

export function canIncreaseBid(boardState: BoardStateDto): boolean {
  return (
    boardState.phase === "InitialAuction" &&
    boardState.currentPlayer !== null &&
    boardState.currentBid !== null &&
    boardState.persistenceFailure === null
  );
}

export function canAttemptMarkSold(boardState: BoardStateDto): boolean {
  return (
    boardState.phase === "InitialAuction" &&
    boardState.currentPlayer !== null &&
    boardState.currentBid !== null &&
    boardState.currentBid > 0 &&
    boardState.selectedTeamId !== null &&
    boardState.teams.some((team) => team.id === boardState.selectedTeamId) &&
    boardState.persistenceFailure === null
  );
}

export function canAttemptMarkUnsold(boardState: BoardStateDto): boolean {
  return (
    boardState.phase === "InitialAuction" &&
    boardState.currentPlayer !== null &&
    boardState.persistenceFailure === null
  );
}

export function canUndo(boardState: BoardStateDto): boolean {
  return boardState.canUndo && boardState.persistenceFailure === null;
}

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable === true
  );
}
