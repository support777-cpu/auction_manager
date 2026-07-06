import type { PlayerCsvSetupStaging } from "@auction-manager/imports";
import type { PlayerPhotoReviewResponse } from "@auction-manager/shared";

export interface SetupStaging {
  readonly getPlayerCsv: () => PlayerCsvSetupStaging | null;
  readonly setPlayerCsv: (staging: PlayerCsvSetupStaging) => void;
  readonly clearPlayerCsv: () => void;
  readonly getPlayerPhotos: () => PlayerPhotoReviewResponse | null;
  readonly setPlayerPhotos: (review: PlayerPhotoReviewResponse) => void;
}

export function createSetupStaging(): SetupStaging {
  let playerCsv: PlayerCsvSetupStaging | null = null;
  let playerPhotos: PlayerPhotoReviewResponse | null = null;

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
    }
  };
}
