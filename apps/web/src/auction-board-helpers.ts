import type { BoardStateDto, Phase1ProgressDto } from "@auction-manager/shared";

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
