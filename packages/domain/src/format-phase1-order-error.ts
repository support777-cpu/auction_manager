import type { CreatePhase1OrderError } from "./phase1-order.js";

export function formatCreatePhase1OrderError(error: CreatePhase1OrderError): string {
  switch (error.code) {
    case "duplicate_phase1_player_id":
      return `Phase 1 order could not be generated: duplicate player id ${error.playerId}.`;
    case "phase1_category_not_configured":
      return `Phase 1 order could not be generated: player ${error.playerId} has category ${error.category}, which is not configured.`;
    case "invalid_phase1_shuffle_output":
      return `Phase 1 order could not be generated: shuffle output invalid for category ${error.category}.`;
  }
}
