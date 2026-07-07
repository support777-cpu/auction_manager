import type { PlayerCsvSetupStaging, TeamCsvSetupStaging } from "@auction-manager/imports";
import type { PlayerPhotoReviewResponse, TeamLogoReviewResponse } from "@auction-manager/shared";

export interface SetupStaging {
  readonly getPlayerCsv: () => PlayerCsvSetupStaging | null;
  readonly setPlayerCsv: (staging: PlayerCsvSetupStaging) => void;
  readonly clearPlayerCsv: () => void;
  readonly getPlayerPhotos: () => PlayerPhotoReviewResponse | null;
  readonly setPlayerPhotos: (review: PlayerPhotoReviewResponse) => void;
  readonly getTeamCsv: () => TeamCsvSetupStaging | null;
  readonly setTeamCsv: (staging: TeamCsvSetupStaging) => void;
  readonly clearTeamCsv: () => void;
  readonly getTeamLogos: () => TeamLogoReviewResponse | null;
  readonly setTeamLogos: (review: TeamLogoReviewResponse) => void;
}

export function createSetupStaging(): SetupStaging {
  let playerCsv: PlayerCsvSetupStaging | null = null;
  let playerPhotos: PlayerPhotoReviewResponse | null = null;
  let teamCsv: TeamCsvSetupStaging | null = null;
  let teamLogos: TeamLogoReviewResponse | null = null;

  return {
    getPlayerCsv: () => playerCsv,
    setPlayerCsv: (staging) => {
      playerCsv = staging;
      // Story 1.6 replaces this non-durable setup state. Until then, a new CSV
      // import clears prior photo matches so stale assets cannot describe new rows.
      playerPhotos = null;
    },
    clearPlayerCsv: () => {
      playerCsv = null;
      playerPhotos = null;
    },
    getPlayerPhotos: () => playerPhotos,
    setPlayerPhotos: (review) => {
      playerPhotos = review;
    },
    getTeamCsv: () => teamCsv,
    setTeamCsv: (staging) => {
      teamCsv = staging;
      // Team logo matches are tied to the staged Team CSV rows and must be
      // recalculated after every valid Team CSV reimport.
      teamLogos = null;
    },
    clearTeamCsv: () => {
      teamCsv = null;
      teamLogos = null;
    },
    getTeamLogos: () => teamLogos,
    setTeamLogos: (review) => {
      teamLogos = review;
    }
  };
}
