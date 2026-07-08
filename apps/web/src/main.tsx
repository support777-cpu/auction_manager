import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import {
  Check,
  CheckCircle2,
  Circle,
  AlertCircle,
  FileWarning,
  Info,
  ListChecks,
  PlayCircle,
  RotateCcw,
  Upload
} from "lucide-react";
import {
  playerCsvImportReviewResponseSchema,
  playerPhotoReviewResponseSchema,
  getSetupReadiness,
  teamCsvImportReviewResponseSchema,
  teamLogoReviewResponseSchema,
  auctionParameterReviewResponseSchema,
  appStateResponseSchema,
  auctionRoleValues,
  increaseBidResponseSchema,
  markSoldResponseSchema,
  markSoldAcceptedResponseSchema,
  markUnsoldResponseSchema,
  markUnsoldAcceptedResponseSchema,
  revealNextPlayerResponseSchema,
  selectTeamResponseSchema,
  startAuctionResponseSchema,
  undoResponseSchema,
  type ImportIssueSeverity,
  type PlayerCsvImportReviewResponse,
  type PlayerPhotoReviewResponse,
  type TeamCsvImportReviewResponse,
  type TeamLogoReviewResponse,
  type AuctionParameterReviewResponse,
  type AuctionParameterReviewParameters,
  type AuctionRole,
  type BoardStateDto,
  type ResumeSummary
} from "@auction-manager/shared";
import { AuctionParametersSection } from "./auction-parameters-section.js";
import {
  buildSubmittedParameters,
  createParameterNumberFields,
  parsePhase1CategoryOrderTextStrict,
  type ParameterNumberFields
} from "./auction-parameters-helpers.js";
import {
  canAttemptMarkSold,
  canAttemptMarkUnsold,
  canRevealNextPlayer,
  canIncreaseBid,
  canSelectTeam,
  canSwitchLiveView,
  canUndo,
  formatAuctionRoleLabel,
  formatRoleCountsSummary,
  getManualAssignmentBlockedReasons,
  getManualAssignmentCounters,
  getManualAssignmentPoolPlayers,
  getPhase1OrderStatusLabel,
  getSoldRosterRowsForTeam,
  getTeamCapacityCopy,
  getTeamRoster,
  isEditableShortcutTarget
} from "./auction-board-helpers.js";
import "./styles.css";

const phases = [
  "Setup",
  "Initial Auction",
  "Unsold Bidding",
  "Manual Assignment",
  "Closed"
];

const issueGroupLabels: Record<ImportIssueSeverity, string> = {
  must_fix: "Must fix",
  can_proceed_with_placeholder: "Can proceed with placeholder",
  ignored_source_field: "Ignored source field"
};

const emptyIssueGroups: PlayerCsvImportReviewResponse["issueGroups"] = [
  {
    severity: "must_fix",
    count: 0,
    issues: []
  },
  {
    severity: "can_proceed_with_placeholder",
    count: 0,
    issues: []
  },
  {
    severity: "ignored_source_field",
    count: 0,
    issues: []
  }
];

function createEmptyNumberFields(): ParameterNumberFields {
  const emptyRoleValues = Object.fromEntries(
    auctionRoleValues.map((role) => [role, ""])
  ) as Record<AuctionRole, string>;

  return {
    bidIncrement: "",
    teamBudget: "",
    maxSquadSize: "",
    roleBasePrices: { ...emptyRoleValues },
    roleTargets: { ...emptyRoleValues }
  };
}

function App() {
  const uploadGenerationRef = useRef(0);
  const photoUploadGenerationRef = useRef(0);
  const teamUploadGenerationRef = useRef(0);
  const logoUploadGenerationRef = useRef(0);
  const parameterSaveGenerationRef = useRef(0);
  const parameterLoadGenerationRef = useRef(0);
  const parameterPreviewGenerationRef = useRef(0);
  const stateLoadGenerationRef = useRef(0);
  const startAuctionGenerationRef = useRef(0);
  const revealNextGenerationRef = useRef(0);
  const revealNextInFlightRef = useRef(false);
  const selectTeamGenerationRef = useRef(0);
  const selectTeamInFlightRef = useRef(false);
  const increaseBidGenerationRef = useRef(0);
  const increaseBidInFlightRef = useRef(false);
  const markSoldGenerationRef = useRef(0);
  const markSoldInFlightRef = useRef(false);
  const markUnsoldGenerationRef = useRef(0);
  const markUnsoldInFlightRef = useRef(false);
  const undoGenerationRef = useRef(0);
  const undoInFlightRef = useRef(false);
  const handleIncreaseBidRef = useRef<() => Promise<void>>(async () => {});
  const handleUndoRef = useRef<() => Promise<void>>(async () => {});
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedPhotoFileNames, setSelectedPhotoFileNames] = useState<string[]>([]);
  const [selectedTeamFileName, setSelectedTeamFileName] = useState<string | null>(null);
  const [selectedLogoFileNames, setSelectedLogoFileNames] = useState<string[]>([]);
  const [review, setReview] = useState<PlayerCsvImportReviewResponse | null>(null);
  const [photoReview, setPhotoReview] = useState<PlayerPhotoReviewResponse | null>(null);
  const [teamReview, setTeamReview] = useState<TeamCsvImportReviewResponse | null>(null);
  const [logoReview, setLogoReview] = useState<TeamLogoReviewResponse | null>(null);
  const [parameterReview, setParameterReview] =
    useState<AuctionParameterReviewResponse | null>(null);
  const [parameterDraft, setParameterDraft] =
    useState<AuctionParameterReviewParameters | null>(null);
  const [numberFields, setNumberFields] = useState<ParameterNumberFields>(
    createEmptyNumberFields()
  );
  const [phase1OrderText, setPhase1OrderText] = useState("");
  const [phase1OrderError, setPhase1OrderError] = useState<string | null>(null);
  const [parameterLoadState, setParameterLoadState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [uploadState, setUploadState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [photoUploadState, setPhotoUploadState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [teamUploadState, setTeamUploadState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [logoUploadState, setLogoUploadState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [teamUploadError, setTeamUploadError] = useState<string | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [parameterSaveState, setParameterSaveState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [parameterErrors, setParameterErrors] = useState<
    AuctionParameterReviewResponse["blockingReasons"]
  >([]);
  const [draftPreviewReasons, setDraftPreviewReasons] = useState<
    AuctionParameterReviewResponse["blockingReasons"]
  >([]);
  const [parameterSaveError, setParameterSaveError] = useState<string | null>(null);
  const [boardState, setBoardState] = useState<BoardStateDto | null>(null);
  const [savedAuction, setSavedAuction] = useState<{
    state: BoardStateDto;
    resume: ResumeSummary;
  } | null>(null);
  const [stateLoadState, setStateLoadState] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [startAuctionState, setStartAuctionState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [startAuctionError, setStartAuctionError] = useState<string | null>(null);
  const [revealNextState, setRevealNextState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [revealNextError, setRevealNextError] = useState<string | null>(null);
  const [selectTeamState, setSelectTeamState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [selectTeamError, setSelectTeamError] = useState<string | null>(null);
  const [increaseBidState, setIncreaseBidState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [increaseBidError, setIncreaseBidError] = useState<string | null>(null);
  const [markSoldState, setMarkSoldState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [markSoldError, setMarkSoldError] = useState<string | null>(null);
  const [markSoldSummary, setMarkSoldSummary] = useState<string | null>(null);
  const [markUnsoldState, setMarkUnsoldState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [markUnsoldError, setMarkUnsoldError] = useState<string | null>(null);
  const [markUnsoldSummary, setMarkUnsoldSummary] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [undoError, setUndoError] = useState<string | null>(null);
  const [undoSummary, setUndoSummary] = useState<string | null>(null);

  function clearMarkSoldOutcome() {
    setMarkSoldError(null);
    setMarkSoldSummary(null);
    setMarkSoldState("idle");
  }

  function clearMarkUnsoldOutcome() {
    setMarkUnsoldError(null);
    setMarkUnsoldSummary(null);
    setMarkUnsoldState("idle");
  }

  function clearUndoOutcome() {
    setUndoError(null);
    setUndoSummary(null);
    setUndoState("idle");
  }

  const applyParameterReviewToForm = useCallback(
    (review: AuctionParameterReviewResponse) => {
      setParameterReview(review);
      setParameterDraft(review.parameters);
      setNumberFields(createParameterNumberFields(review.parameters));
      setPhase1OrderText(review.parameters.phase1CategoryOrder.join(", "));
      setPhase1OrderError(null);
      setDraftPreviewReasons(review.blockingReasons);
      setParameterErrors([]);
    },
    []
  );

  const loadAuctionParameters = useCallback(async (options?: { force?: boolean }) => {
    const loadGeneration = ++parameterLoadGenerationRef.current;
    setParameterLoadState("loading");

    try {
      const response = await fetch("/api/setup/auction-parameters");
      const parsedReview = auctionParameterReviewResponseSchema.safeParse(
        await response.json()
      );

      if (!options?.force && loadGeneration !== parameterLoadGenerationRef.current) {
        return;
      }

      if (!response.ok || !parsedReview.success) {
        setParameterLoadState("error");
        return;
      }

      applyParameterReviewToForm(parsedReview.data);
      setParameterLoadState("ready");
    } catch {
      if (!options?.force && loadGeneration !== parameterLoadGenerationRef.current) {
        return;
      }

      setParameterLoadState("error");
    }
  }, [applyParameterReviewToForm]);

  const markParameterDraftEdited = useCallback(() => {
    parameterLoadGenerationRef.current += 1;
    setParameterSaveState("idle");
    setParameterReview(null);
  }, []);

  const refreshBoardState = useCallback(async () => {
    try {
      const response = await fetch("/api/state");
      const parsedState = appStateResponseSchema.safeParse(await response.json());

      if (!response.ok || !parsedState.success) {
        return;
      }

      if (parsedState.data.mode === "auction") {
        setBoardState(parsedState.data.state);
      }
    } catch {
      // Keep the current board state when resync fails.
    }
  }, []);

  useEffect(() => {
    void loadAuctionParameters();
  }, [loadAuctionParameters]);

  useEffect(() => {
    const loadGeneration = ++stateLoadGenerationRef.current;
    async function loadAppState() {
      try {
        const response = await fetch("/api/state");
        const parsedState = appStateResponseSchema.safeParse(await response.json());

        if (loadGeneration !== stateLoadGenerationRef.current) {
          return;
        }

        if (!response.ok || !parsedState.success) {
          setStateLoadState("error");
          return;
        }

        if (parsedState.data.mode === "auction") {
          setSavedAuction({
            state: parsedState.data.state,
            resume: parsedState.data.resume
          });
        } else {
          setSavedAuction(null);
        }
        setStateLoadState("ready");
      } catch {
        if (loadGeneration === stateLoadGenerationRef.current) {
          setStateLoadState("error");
        }
      }
    }

    void loadAppState();
  }, []);
  const issueGroups = mergeIssueGroups(
    review?.issueGroups,
    photoReview?.issueGroups,
    teamReview?.issueGroups,
    logoReview?.issueGroups
  );
  const photoUploadDisabled =
    !review || review.summary.startAuctionBlocked || review.summary.importedPlayers === 0;
  const logoUploadDisabled =
    !teamReview || teamReview.summary.startAuctionBlocked || teamReview.summary.importedTeams === 0;
  const parameterBlockingReasons =
    parameterErrors.length > 0 ? parameterErrors : draftPreviewReasons;

  const parameterReviewForReadiness = useMemo(() => {
    if (parameterLoadState !== "ready") {
      return null;
    }

    if (parameterBlockingReasons.length > 0) {
      return {
        parameters: parameterDraft ?? parameterReview?.parameters ?? {
          roleBasePrices: Object.fromEntries(
            auctionRoleValues.map((role) => [role, 0])
          ) as AuctionParameterReviewParameters["roleBasePrices"],
          bidIncrement: 0,
          teamBudget: 0,
          maxSquadSize: 0,
          roleTargets: Object.fromEntries(
            auctionRoleValues.map((role) => [role, 0])
          ) as AuctionParameterReviewParameters["roleTargets"],
          phase1CategoryOrder: [],
          manualAssignmentBudgetBehavior: "NoBudgetImpact"
        },
        blockingReasons: parameterBlockingReasons,
        reasonsByField: {},
        startAuctionBlocked: true
      } satisfies AuctionParameterReviewResponse;
    }

    if (parameterSaveState !== "ready" || !parameterReview) {
      return null;
    }

    return parameterReview;
  }, [
    parameterBlockingReasons,
    parameterDraft,
    parameterLoadState,
    parameterReview,
    parameterSaveState
  ]);

  const setupReadiness = useMemo(
    () =>
      getSetupReadiness({
        playerCsvReview: review,
        teamCsvReview: teamReview,
        parameterReview: parameterReviewForReadiness
      }),
    [parameterReviewForReadiness, review, teamReview]
  );

  const blockerText = setupReadiness.primaryBlockerMessage;
  const startAuctionDisabled =
    setupReadiness.startAuctionBlocked ||
    startAuctionState === "loading" ||
    stateLoadState !== "ready";

  useEffect(() => {
    if (parameterLoadState !== "ready" || !parameterDraft) {
      return;
    }

    const phase1Parse = parsePhase1CategoryOrderTextStrict(phase1OrderText);
    if (phase1Parse.invalidTokens.length > 0) {
      setPhase1OrderError(
        `Unknown Phase 1 categories: ${phase1Parse.invalidTokens.join(", ")}.`
      );
      setDraftPreviewReasons([
        {
          id: "invalid-phase1-category-order-client",
          code: "invalid_phase1_category_order",
          field: "phase1CategoryOrder",
          message: "Phase 1 category order must include every category exactly once."
        }
      ]);
      return;
    }

    setPhase1OrderError(null);
    const previewGeneration = ++parameterPreviewGenerationRef.current;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/setup/auction-parameters/preview", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(
            buildSubmittedParameters(
              numberFields,
              phase1OrderText,
              parameterDraft.manualAssignmentBudgetBehavior
            )
          )
        });

        const parsedReview = auctionParameterReviewResponseSchema.safeParse(
          await response.json()
        );

        if (
          previewGeneration !== parameterPreviewGenerationRef.current ||
          !parsedReview.success
        ) {
          return;
        }

        setDraftPreviewReasons(parsedReview.data.blockingReasons);
        setParameterDraft(parsedReview.data.parameters);
      } catch {
        // Preview failures keep the last known validation state.
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [numberFields, parameterDraft, parameterLoadState, phase1OrderText]);

  const reviewStatus = useMemo(() => {
    if (!review) {
      return {
        className: "review-state",
        label: "Awaiting CSV"
      };
    }

    if (review.summary.startAuctionBlocked) {
      return {
        className: "review-state review-state-warning",
        label: "Review complete — fixes required"
      };
    }

    return {
      className: "review-state review-state-ready",
      label: "CSV reviewed"
    };
  }, [review]);
  const teamReviewStatus = useMemo(() => {
    if (!teamReview) {
      return {
        className: "review-state",
        label: "Awaiting Team CSV"
      };
    }

    if (teamReview.summary.startAuctionBlocked) {
      return {
        className: "review-state review-state-warning",
        label: "Review complete — fixes required"
      };
    }

    return {
      className: "review-state review-state-ready",
      label: "Team CSV reviewed"
    };
  }, [teamReview]);

  async function handlePlayerCsvChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    const previousReview = review;
    const previousPhotoReview = photoReview;
    const uploadGeneration = ++uploadGenerationRef.current;

    setSelectedFileName(file.name);
    setReview(null);
    setPhotoReview(null);
    setSelectedPhotoFileNames([]);
    setUploadError(null);
    setPhotoUploadError(null);
    setPhotoUploadState("idle");
    setUploadState("loading");

    try {
      const csvText = await file.text();
      const response = await fetch("/api/setup/player-csv/preview", {
        method: "POST",
        headers: {
          "content-type": "text/csv"
        },
        body: csvText
      });

      if (uploadGeneration !== uploadGenerationRef.current) {
        return;
      }

      if (!response.ok) {
        setReview(previousReview);
        setPhotoReview(previousPhotoReview);
        setUploadState("error");
        setUploadError(await readUploadErrorMessage(response));
        return;
      }

      const parsedReview = playerCsvImportReviewResponseSchema.safeParse(
        await response.json()
      );

      if (!parsedReview.success) {
        setReview(previousReview);
        setPhotoReview(previousPhotoReview);
        setUploadState("error");
        setUploadError("Player CSV preview returned an unexpected response. Try again.");
        return;
      }

      setReview(parsedReview.data);
      setPhotoReview(null);
      setParameterSaveState("idle");
      setParameterReview(null);
      setUploadState("ready");
      await loadAuctionParameters({ force: true });
    } catch {
      if (uploadGeneration !== uploadGenerationRef.current) {
        return;
      }

      setReview(previousReview);
      setPhotoReview(previousPhotoReview);
      setUploadState("error");
      setUploadError(
        "Could not reach the auction server. Start it with `npm run dev:server`, then try again."
      );
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function handlePlayerPhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);

    if (files.length === 0 || photoUploadDisabled) {
      event.currentTarget.value = "";
      return;
    }

    const previousPhotoReview = photoReview;
    const uploadGeneration = ++photoUploadGenerationRef.current;

    setSelectedPhotoFileNames(files.map((file) => file.name));
    setPhotoReview(null);
    setPhotoUploadError(null);
    setPhotoUploadState("loading");

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("photos", file);
      }

      const response = await fetch("/api/setup/player-photos", {
        method: "POST",
        body: formData
      });

      if (uploadGeneration !== photoUploadGenerationRef.current) {
        return;
      }

      if (!response.ok) {
        setPhotoReview(previousPhotoReview);
        setPhotoUploadState("error");
        setPhotoUploadError(await readPhotoUploadErrorMessage(response));
        return;
      }

      const parsedReview = playerPhotoReviewResponseSchema.safeParse(await response.json());

      if (!parsedReview.success) {
        setPhotoReview(previousPhotoReview);
        setPhotoUploadState("error");
        setPhotoUploadError("Player photo review returned an unexpected response. Try again.");
        return;
      }

      setPhotoReview(parsedReview.data);
      setPhotoUploadState("ready");
    } catch {
      if (uploadGeneration !== photoUploadGenerationRef.current) {
        return;
      }

      setPhotoReview(previousPhotoReview);
      setPhotoUploadState("error");
      setPhotoUploadError("Player photos could not be reviewed. Check the files and try again.");
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function handleTeamCsvChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    const previousTeamReview = teamReview;
    const previousLogoReview = logoReview;
    const uploadGeneration = ++teamUploadGenerationRef.current;
    logoUploadGenerationRef.current++;

    setSelectedTeamFileName(file.name);
    setTeamReview(null);
    setLogoReview(null);
    setSelectedLogoFileNames([]);
    setTeamUploadError(null);
    setLogoUploadError(null);
    setLogoUploadState("idle");
    setTeamUploadState("loading");

    try {
      const csvText = await file.text();
      const response = await fetch("/api/setup/team-csv/preview", {
        method: "POST",
        headers: {
          "content-type": "text/csv"
        },
        body: csvText
      });

      if (uploadGeneration !== teamUploadGenerationRef.current) {
        return;
      }

      if (!response.ok) {
        setTeamReview(previousTeamReview);
        setLogoReview(previousLogoReview);
        setTeamUploadState("error");
        setTeamUploadError(await readTeamUploadErrorMessage(response));
        return;
      }

      const parsedReview = teamCsvImportReviewResponseSchema.safeParse(
        await response.json()
      );

      if (!parsedReview.success) {
        setTeamReview(previousTeamReview);
        setLogoReview(previousLogoReview);
        setTeamUploadState("error");
        setTeamUploadError("Team CSV preview returned an unexpected response. Try again.");
        return;
      }

      setTeamReview(parsedReview.data);
      setLogoReview(null);
      setParameterSaveState("idle");
      setParameterReview(null);
      setTeamUploadState("ready");
      await loadAuctionParameters({ force: true });
    } catch {
      if (uploadGeneration !== teamUploadGenerationRef.current) {
        return;
      }

      setTeamReview(previousTeamReview);
      setLogoReview(previousLogoReview);
      setTeamUploadState("error");
      setTeamUploadError(
        "Could not reach the auction server. Start it with `npm run dev:server`, then try again."
      );
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function handleAuctionParametersSave() {
    if (!parameterDraft) {
      return;
    }

    const previousReview = parameterReview;
    const saveGeneration = ++parameterSaveGenerationRef.current;
    const phase1Parse = parsePhase1CategoryOrderTextStrict(phase1OrderText);
    if (phase1Parse.invalidTokens.length > 0) {
      setPhase1OrderError(
        `Unknown Phase 1 categories: ${phase1Parse.invalidTokens.join(", ")}.`
      );
      setParameterSaveState("error");
      setParameterSaveError("Auction Parameters could not be saved.");
      return;
    }

    const submittedParameters = buildSubmittedParameters(
      numberFields,
      phase1OrderText,
      parameterDraft.manualAssignmentBudgetBehavior
    );

    setParameterSaveState("loading");
    setParameterSaveError(null);
    setParameterErrors([]);

    try {
      const response = await fetch("/api/setup/auction-parameters", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(submittedParameters)
      });

      if (saveGeneration !== parameterSaveGenerationRef.current) {
        return;
      }

      const parsedReview = auctionParameterReviewResponseSchema.safeParse(
        await response.json()
      );

      if (!parsedReview.success) {
        setParameterReview(previousReview);
        setParameterSaveState("error");
        setParameterSaveError("Auction Parameters returned an unexpected response. Try again.");
        return;
      }

      if (!response.ok || parsedReview.data.startAuctionBlocked) {
        setParameterReview(previousReview);
        setParameterErrors(parsedReview.data.blockingReasons);
        setDraftPreviewReasons(parsedReview.data.blockingReasons);
        setParameterSaveState("error");
        setParameterSaveError("Auction Parameters could not be saved.");
        return;
      }

      applyParameterReviewToForm(parsedReview.data);
      setParameterSaveState("ready");
    } catch {
      if (saveGeneration !== parameterSaveGenerationRef.current) {
        return;
      }

      setParameterReview(previousReview);
      setParameterSaveState("error");
      setParameterSaveError("Auction Parameters could not be saved. Try again.");
    }
  }

  async function handleStartAuction() {
    if (startAuctionDisabled) {
      return;
    }

    const commandGeneration = ++startAuctionGenerationRef.current;
    setStartAuctionState("loading");
    setStartAuctionError(null);

    try {
      const response = await fetch("/api/auction/start", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          clientCommandId: createClientCommandId("start")
        })
      });
      const responseBody = (await response.json().catch(() => null)) as unknown;
      const parsedResponse = startAuctionResponseSchema.safeParse(responseBody);

      if (commandGeneration !== startAuctionGenerationRef.current) {
        return;
      }

      if (!response.ok || !parsedResponse.success) {
        setStartAuctionState("error");
        setStartAuctionError(readStartAuctionErrorMessage(response, responseBody));
        return;
      }

      setBoardState(parsedResponse.data.state);
      setSavedAuction(null);
      clearMarkSoldOutcome();
      clearMarkUnsoldOutcome();
      clearUndoOutcome();
      setStartAuctionState("ready");
    } catch {
      if (commandGeneration !== startAuctionGenerationRef.current) {
        return;
      }
      setStartAuctionState("error");
      setStartAuctionError("Start Auction could not be completed. Try again.");
    }
  }

  async function handleRevealNext() {
    if (
      !boardState ||
      !canRevealNextPlayer(boardState) ||
      revealNextState === "loading" ||
      revealNextInFlightRef.current ||
      undoState === "loading" ||
      undoInFlightRef.current
    ) {
      return;
    }

    const commandGeneration = ++revealNextGenerationRef.current;
    revealNextInFlightRef.current = true;
    setRevealNextState("loading");
    setRevealNextError(null);

    try {
      const response = await fetch("/api/auction/reveal-next", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          clientCommandId: createClientCommandId("reveal")
        })
      });
      const responseBody = (await response.json().catch(() => null)) as unknown;
      const parsedResponse = revealNextPlayerResponseSchema.safeParse(responseBody);

      if (commandGeneration !== revealNextGenerationRef.current) {
        return;
      }

      if (!response.ok || !parsedResponse.success) {
        setRevealNextState("error");
        setRevealNextError(readRevealNextErrorMessage(response, responseBody));
        await refreshBoardState();
        return;
      }

      setBoardState(parsedResponse.data.state);
      clearMarkSoldOutcome();
      clearMarkUnsoldOutcome();
      clearUndoOutcome();
      setRevealNextState("ready");
    } catch {
      if (commandGeneration !== revealNextGenerationRef.current) {
        return;
      }
      setRevealNextState("error");
      setRevealNextError("Reveal Next Player could not be completed. Try again.");
      await refreshBoardState();
    } finally {
      if (commandGeneration === revealNextGenerationRef.current) {
        revealNextInFlightRef.current = false;
      }
    }
  }

  async function handleSelectTeam(teamId: string | null) {
    if (
      !boardState ||
      !canSelectTeam(boardState) ||
      selectTeamState === "loading" ||
      selectTeamInFlightRef.current ||
      undoState === "loading" ||
      undoInFlightRef.current
    ) {
      return;
    }

    const commandGeneration = ++selectTeamGenerationRef.current;
    selectTeamInFlightRef.current = true;
    setSelectTeamState("loading");
    setSelectTeamError(null);

    try {
      const response = await fetch("/api/auction/select-team", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          clientCommandId: createClientCommandId("select"),
          teamId
        })
      });
      const responseBody = (await response.json().catch(() => null)) as unknown;
      const parsedResponse = selectTeamResponseSchema.safeParse(responseBody);

      if (commandGeneration !== selectTeamGenerationRef.current) {
        return;
      }

      if (!response.ok || !parsedResponse.success) {
        setSelectTeamState("error");
        setSelectTeamError(readSelectTeamErrorMessage(response, responseBody));
        await refreshBoardState();
        return;
      }

      setBoardState(parsedResponse.data.state);
      clearMarkSoldOutcome();
      clearMarkUnsoldOutcome();
      clearUndoOutcome();
      setSelectTeamState("ready");
    } catch {
      if (commandGeneration !== selectTeamGenerationRef.current) {
        return;
      }
      setSelectTeamState("error");
      setSelectTeamError("Select Team could not be completed. Try again.");
      await refreshBoardState();
    } finally {
      if (commandGeneration === selectTeamGenerationRef.current) {
        selectTeamInFlightRef.current = false;
      }
    }
  }

  handleIncreaseBidRef.current = async function handleIncreaseBid() {
    if (
      !boardState ||
      !canIncreaseBid(boardState) ||
      increaseBidState === "loading" ||
      increaseBidInFlightRef.current ||
      undoState === "loading" ||
      undoInFlightRef.current
    ) {
      return;
    }

    const commandGeneration = ++increaseBidGenerationRef.current;
    increaseBidInFlightRef.current = true;
    setIncreaseBidState("loading");
    setIncreaseBidError(null);

    try {
      const response = await fetch("/api/auction/increase-bid", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          clientCommandId: createClientCommandId("increase")
        })
      });
      const responseBody = (await response.json().catch(() => null)) as unknown;
      const parsedResponse = increaseBidResponseSchema.safeParse(responseBody);

      if (commandGeneration !== increaseBidGenerationRef.current) {
        return;
      }

      if (!response.ok || !parsedResponse.success) {
        setIncreaseBidState("error");
        setIncreaseBidError(readIncreaseBidErrorMessage(response, responseBody));
        await refreshBoardState();
        return;
      }

      setBoardState(parsedResponse.data.state);
      clearMarkSoldOutcome();
      clearMarkUnsoldOutcome();
      clearUndoOutcome();
      setIncreaseBidState("ready");
    } catch {
      if (commandGeneration !== increaseBidGenerationRef.current) {
        return;
      }
      setIncreaseBidState("error");
      setIncreaseBidError("Increase Bid could not be completed. Try again.");
      await refreshBoardState();
    } finally {
      if (commandGeneration === increaseBidGenerationRef.current) {
        increaseBidInFlightRef.current = false;
      }
    }
  };

  async function handleMarkSold() {
    if (
      !boardState ||
      !canAttemptMarkSold(boardState) ||
      markSoldState === "loading" ||
      markSoldInFlightRef.current ||
      undoState === "loading" ||
      undoInFlightRef.current
    ) {
      return;
    }

    const selectedTeamForSale =
      boardState.selectedTeamId === null
        ? null
        : boardState.teams.find((team) => team.id === boardState.selectedTeamId) ??
          null;
    if (
      selectedTeamForSale?.currentPlayerCapacity &&
      !selectedTeamForSale.currentPlayerCapacity.canBuy
    ) {
      return;
    }

    const commandGeneration = ++markSoldGenerationRef.current;
    markSoldInFlightRef.current = true;
    setMarkSoldState("loading");
    setMarkSoldError(null);

    try {
      const response = await fetch("/api/auction/mark-sold", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          clientCommandId: createClientCommandId("mark-sold")
        })
      });
      const responseBody = (await response.json().catch(() => null)) as unknown;
      const parsedResponse = markSoldResponseSchema.safeParse(responseBody);

      if (commandGeneration !== markSoldGenerationRef.current) {
        return;
      }

      if (!response.ok && parsedResponse.success && "ok" in parsedResponse.data) {
        const capacityBlockCodes = new Set([
          "budget_exceeded",
          "squad_full",
          "role_target_full",
          "role_capacity_incomplete"
        ]);
        const isCapacityBlock =
          parsedResponse.data.error === "sale_blocked" &&
          parsedResponse.data.reasons.length > 0 &&
          parsedResponse.data.reasons.every((reason) =>
            capacityBlockCodes.has(reason.code)
          );

        if (isCapacityBlock) {
          setMarkSoldState("idle");
          setMarkSoldSummary(null);
          await refreshBoardState();
          return;
        }

        setMarkSoldState("error");
        setMarkSoldSummary(null);
        setMarkSoldError(
          parsedResponse.data.reasons.length > 0
            ? parsedResponse.data.reasons.map((reason) => reason.message).join(" ")
            : parsedResponse.data.message
        );
        await refreshBoardState();
        return;
      }

      if (
        !response.ok &&
        typeof responseBody === "object" &&
        responseBody !== null &&
        "error" in responseBody &&
        responseBody.error === "snapshot_write_failed"
      ) {
        const snapshotFailureMessage =
          "message" in responseBody &&
          typeof responseBody.message === "string"
            ? responseBody.message
            : "Mark Sold was saved, but the latest snapshot could not be written.";
        await refreshBoardState();
        setMarkSoldError(snapshotFailureMessage);
        setMarkSoldState("ready");
        return;
      }

      if (response.ok && parsedResponse.success) {
        const acceptedResponse = markSoldAcceptedResponseSchema.safeParse(
          parsedResponse.data
        );
        if (acceptedResponse.success) {
          setBoardState(acceptedResponse.data.state);
          clearMarkUnsoldOutcome();
          clearUndoOutcome();
          setMarkSoldError(null);
          setMarkSoldSummary(acceptedResponse.data.result.message);
          setMarkSoldState("ready");
          return;
        }
      }

      setMarkSoldState("error");
      setMarkSoldSummary(null);
      setMarkSoldError(readMarkSoldErrorMessage(response, responseBody));
      await refreshBoardState();
    } catch {
      if (commandGeneration !== markSoldGenerationRef.current) {
        return;
      }
      setMarkSoldState("error");
      setMarkSoldError("Mark Sold could not be completed. Try again.");
      await refreshBoardState();
    } finally {
      if (commandGeneration === markSoldGenerationRef.current) {
        markSoldInFlightRef.current = false;
      }
    }
  }

  async function handleMarkUnsold() {
    if (
      !boardState ||
      !canAttemptMarkUnsold(boardState) ||
      markUnsoldState === "loading" ||
      markUnsoldInFlightRef.current ||
      undoState === "loading" ||
      undoInFlightRef.current
    ) {
      return;
    }

    const commandGeneration = ++markUnsoldGenerationRef.current;
    markUnsoldInFlightRef.current = true;
    setMarkUnsoldState("loading");
    setMarkUnsoldError(null);

    try {
      const response = await fetch("/api/auction/mark-unsold", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          clientCommandId: createClientCommandId("mark-unsold")
        })
      });
      const responseBody = (await response.json().catch(() => null)) as unknown;
      const parsedResponse = markUnsoldResponseSchema.safeParse(responseBody);

      if (commandGeneration !== markUnsoldGenerationRef.current) {
        return;
      }

      if (
        !response.ok &&
        typeof responseBody === "object" &&
        responseBody !== null &&
        "error" in responseBody &&
        responseBody.error === "snapshot_write_failed"
      ) {
        const snapshotFailureMessage =
          "message" in responseBody &&
          typeof responseBody.message === "string"
            ? responseBody.message
            : "Mark Unsold was saved, but the latest snapshot could not be written.";
        await refreshBoardState();
        setMarkUnsoldError(snapshotFailureMessage);
        setMarkUnsoldState("ready");
        return;
      }

      if (!response.ok && parsedResponse.success && "ok" in parsedResponse.data) {
        setMarkUnsoldState("error");
        setMarkUnsoldSummary(null);
        setMarkUnsoldError(parsedResponse.data.message);
        await refreshBoardState();
        return;
      }

      if (response.ok && parsedResponse.success) {
        const acceptedResponse = markUnsoldAcceptedResponseSchema.safeParse(
          parsedResponse.data
        );
        if (acceptedResponse.success) {
          setBoardState(acceptedResponse.data.state);
          clearMarkSoldOutcome();
          clearUndoOutcome();
          setMarkUnsoldError(null);
          setMarkUnsoldSummary(acceptedResponse.data.result.message);
          setMarkUnsoldState("ready");
          return;
        }
      }

      setMarkUnsoldState("error");
      setMarkUnsoldSummary(null);
      setMarkUnsoldError(readMarkUnsoldErrorMessage(response, responseBody));
      await refreshBoardState();
    } catch {
      if (commandGeneration !== markUnsoldGenerationRef.current) {
        return;
      }
      setMarkUnsoldState("error");
      setMarkUnsoldError("Mark Unsold could not be completed. Try again.");
      await refreshBoardState();
    } finally {
      if (commandGeneration === markUnsoldGenerationRef.current) {
        markUnsoldInFlightRef.current = false;
      }
    }
  }

  handleUndoRef.current = async function handleUndo() {
    if (
      !boardState ||
      !canUndo(boardState) ||
      undoState === "loading" ||
      undoInFlightRef.current ||
      revealNextState === "loading" ||
      selectTeamState === "loading" ||
      increaseBidState === "loading" ||
      markSoldState === "loading" ||
      markUnsoldState === "loading"
    ) {
      return;
    }

    const commandGeneration = ++undoGenerationRef.current;
    undoInFlightRef.current = true;
    setUndoState("loading");
    setUndoError(null);
    setUndoSummary(null);

    try {
      const response = await fetch("/api/auction/undo", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          clientCommandId: createClientCommandId("undo")
        })
      });
      const responseBody = await response.json();
      const parsedResponse = undoResponseSchema.safeParse(responseBody);

      if (commandGeneration !== undoGenerationRef.current) {
        return;
      }

      if (response.ok && parsedResponse.success) {
        setBoardState(parsedResponse.data.state);
        clearMarkSoldOutcome();
        clearMarkUnsoldOutcome();
        setUndoError(null);
        setUndoSummary(parsedResponse.data.result.message);
        setUndoState("ready");
        return;
      }

      setUndoState("error");
      setUndoError(readUndoErrorMessage(response, responseBody));
      await refreshBoardState();
    } catch {
      if (commandGeneration !== undoGenerationRef.current) {
        return;
      }
      setUndoState("error");
      setUndoError("Undo could not be completed. Try again.");
      await refreshBoardState();
    } finally {
      if (commandGeneration === undoGenerationRef.current) {
        undoInFlightRef.current = false;
      }
    }
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const shortcut = event.key.toLowerCase();
      if (event.key !== "+" && shortcut !== "u") {
        return;
      }

      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (isEditableShortcutTarget(target)) {
        return;
      }

      event.preventDefault();
      if (event.key === "+") {
        void handleIncreaseBidRef.current();
        return;
      }
      void handleUndoRef.current();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function updateRoleNumberField(
    group: "roleBasePrices" | "roleTargets",
    role: AuctionRole,
    value: string
  ) {
    setNumberFields((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [role]: value
      }
    }));
  }

  async function handleTeamLogosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);

    if (files.length === 0 || logoUploadDisabled) {
      event.currentTarget.value = "";
      return;
    }

    const previousLogoReview = logoReview;
    const uploadGeneration = ++logoUploadGenerationRef.current;

    setSelectedLogoFileNames(files.map((file) => file.name));
    setLogoReview(null);
    setLogoUploadError(null);
    setLogoUploadState("loading");

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("logos", file);
      }

      const response = await fetch("/api/setup/team-logos", {
        method: "POST",
        body: formData
      });

      if (uploadGeneration !== logoUploadGenerationRef.current) {
        return;
      }

      if (!response.ok) {
        setLogoReview(previousLogoReview);
        setLogoUploadState("error");
        setLogoUploadError(await readLogoUploadErrorMessage(response));
        return;
      }

      const parsedReview = teamLogoReviewResponseSchema.safeParse(await response.json());

      if (!parsedReview.success) {
        setLogoReview(previousLogoReview);
        setLogoUploadState("error");
        setLogoUploadError("Team logo review returned an unexpected response. Try again.");
        return;
      }

      setLogoReview(parsedReview.data);
      setLogoUploadState("ready");
    } catch {
      if (uploadGeneration !== logoUploadGenerationRef.current) {
        return;
      }

      setLogoReview(previousLogoReview);
      setLogoUploadState("error");
      setLogoUploadError("Team logos could not be reviewed. Check the files and try again.");
    } finally {
      event.currentTarget.value = "";
    }
  }

  if (boardState) {
    return (
      <AuctionBoard
        boardState={boardState}
        onRevealNext={() => {
          void handleRevealNext();
        }}
        onSelectTeam={(teamId) => {
          void handleSelectTeam(teamId);
        }}
        onIncreaseBid={() => {
          void handleIncreaseBidRef.current();
        }}
        onMarkSold={() => {
          void handleMarkSold();
        }}
        onMarkUnsold={() => {
          void handleMarkUnsold();
        }}
        onUndo={() => {
          void handleUndoRef.current();
        }}
        increaseBidError={increaseBidError}
        increaseBidState={increaseBidState}
        markSoldError={markSoldError}
        markSoldState={markSoldState}
        markSoldSummary={markSoldSummary}
        markUnsoldError={markUnsoldError}
        markUnsoldState={markUnsoldState}
        markUnsoldSummary={markUnsoldSummary}
        undoError={undoError}
        undoState={undoState}
        undoSummary={undoSummary}
        revealNextError={revealNextError}
        revealNextState={revealNextState}
        selectTeamError={selectTeamError}
        selectTeamState={selectTeamState}
      />
    );
  }

  if (savedAuction && stateLoadState === "ready") {
    return (
      <ResumeStartSurface
        resume={savedAuction.resume}
        onResume={async () => {
          try {
            const response = await fetch("/api/state");
            const parsedState = appStateResponseSchema.safeParse(await response.json());

            if (
              !response.ok ||
              !parsedState.success ||
              parsedState.data.mode !== "auction"
            ) {
              setStateLoadState("error");
              setSavedAuction(null);
              return;
            }

            setBoardState(parsedState.data.state);
            setSavedAuction(null);
          } catch {
            setStateLoadState("error");
            setSavedAuction(null);
          }
        }}
      />
    );
  }

  if (stateLoadState === "loading") {
    return (
      <main className="app-shell" data-testid="app-shell">
        <header className="app-header" aria-labelledby="app-title">
          <h1 id="app-title">Auction Manager</h1>
        </header>
        <section className="setup-panel" data-testid="state-loading">
          <div className="setup-copy">
            <h2>Loading auction state</h2>
          </div>
        </section>
      </main>
    );
  }

  if (stateLoadState === "error") {
    return (
      <main className="app-shell" data-testid="app-shell">
        <header className="app-header" aria-labelledby="app-title">
          <h1 id="app-title">Auction Manager</h1>
        </header>
        <section className="setup-panel" data-testid="state-load-error">
          <div className="setup-copy">
            <h2>Auction state could not be loaded</h2>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell" data-testid="app-shell">
      <header className="app-header" aria-labelledby="app-title">
        <h1 id="app-title">Auction Manager</h1>
      </header>

      <section className="status-grid" aria-label="Setup status">
        <article>
          <span className="status-label">Current phase</span>
          <strong>Setup</strong>
        </article>
        <article>
          <span className="status-label">Auction state</span>
          <strong>No active auction</strong>
        </article>
        <article>
          <span className="status-label">Server target</span>
          <strong>127.0.0.1</strong>
        </article>
      </section>

      <section
        className="phase-strip"
        data-testid="phase-indicator"
        aria-label="Auction phases"
      >
        {phases.map((phase, index) => {
          const isActive = index === 0;
          return (
            <div
              className={isActive ? "phase-step phase-step-active" : "phase-step"}
              key={phase}
              aria-current={isActive ? "step" : undefined}
            >
              {isActive ? (
                <CheckCircle2 aria-hidden="true" size={18} />
              ) : (
                <Circle aria-hidden="true" size={18} />
              )}
              <span>{phase}</span>
            </div>
          );
        })}
      </section>

      <section className="setup-panel" data-testid="setup-empty-state">
        <div className="setup-copy">
          <h2>No auction is loaded</h2>
        </div>
        <div className="setup-actions" aria-label="Setup actions">
          <button className="primary-action" data-testid="setup-start" type="button">
            <PlayCircle aria-hidden="true" size={20} />
            <span>Start setup</span>
          </button>
        </div>
      </section>

      <section
        className="setup-player-csv"
        data-testid="setup-player-csv"
        aria-labelledby="player-csv-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="player-csv-title">Player CSV review</h2>
          </div>
          <span className={reviewStatus.className}>
            <ListChecks aria-hidden="true" size={18} />
            {reviewStatus.label}
          </span>
        </div>

        <div className="csv-upload-row">
          <label className="csv-upload-control" htmlFor="player-csv-input">
            <Upload aria-hidden="true" size={20} />
            <span>Choose Player CSV</span>
            <input
              accept=".csv,text/csv"
              data-testid="player-csv-input"
              id="player-csv-input"
              onChange={handlePlayerCsvChange}
              type="file"
            />
          </label>
          <div className="csv-upload-status" aria-live="polite">
            <strong>{selectedFileName ?? "No file selected"}</strong>
            {uploadState === "loading" ? (
              <span>Reviewing Player CSV...</span>
            ) : uploadState === "error" ? (
              <span>{uploadError ?? "Upload failed. Fix the file or try again."}</span>
            ) : null}
          </div>
        </div>

        {uploadError ? (
          <p className="csv-error" role="alert">
            <FileWarning aria-hidden="true" size={18} />
            <span>{uploadError}</span>
          </p>
        ) : null}

        <div className="csv-summary-grid" data-testid="player-csv-summary">
          <article>
            <span className="status-label">Imported Players</span>
            <strong>{review?.summary.importedPlayers ?? 0} imported</strong>
          </article>
          <article>
            <span className="status-label">Required fixes</span>
            <strong>{review?.summary.mustFixCount ?? 0} must fix</strong>
          </article>
          <article>
            <span className="status-label">Ignored fields</span>
            <strong>{review?.summary.ignoredSourceFieldCount ?? 0} ignored</strong>
          </article>
        </div>

        <div className="review-layout">
          <section aria-label="Imported Player preview">
            <div className="subsection-heading">
              <h3>Imported Players</h3>
              <span>{review?.players.length ?? 0}</span>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Row</th>
                    <th scope="col">Name</th>
                    <th scope="col">Gender</th>
                    <th scope="col">Role</th>
                    <th scope="col">Phase 1 Category</th>
                  </tr>
                </thead>
                <tbody>
                  {review?.players.length ? (
                    review.players.map((player) => (
                      <tr
                        data-testid={`player-preview-row-${player.sourceRowNumber}`}
                        key={`${player.sourceRowNumber}-${player.name}`}
                      >
                        <td>{player.sourceRowNumber}</td>
                        <td>{player.name}</td>
                        <td>{player.gender}</td>
                        <td>{player.role}</td>
                        <td>{player.phase1Category}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>No Player CSV has been reviewed yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-label="Import issues">
            <div className="subsection-heading">
              <h3>Import Issues</h3>
              <span>{issueGroups.reduce((total, group) => total + group.count, 0)}</span>
            </div>
            <div className="table-scroll">
              <table className="data-table issues-table" data-testid="import-issues-table">
                <thead>
                  <tr>
                    <th scope="col">Group</th>
                    <th scope="col">Count</th>
                    <th scope="col">Details</th>
                  </tr>
                </thead>
                {issueGroups.map((group) => (
                  <tbody
                    data-testid={`import-issue-group-${group.severity}`}
                    key={group.severity}
                  >
                    <tr>
                      <th scope="row">{issueGroupLabels[group.severity]}</th>
                      <td>{group.count}</td>
                      <td>
                        {group.issues.length ? (
                          <ul>
                            {group.issues.map((issue) => (
                              <li key={issue.id}>
                                {issue.sourceRowNumber ? `Row ${issue.sourceRowNumber}: ` : ""}
                                {issue.message}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "None"
                        )}
                      </td>
                    </tr>
                  </tbody>
                ))}
              </table>
            </div>
          </section>
        </div>

      </section>

      <section
        className="setup-player-photos"
        data-testid="setup-player-photos"
        aria-labelledby="player-photos-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="player-photos-title">Player photos</h2>
          </div>
          <span className={photoReview ? "review-state review-state-ready" : "review-state"}>
            <Upload aria-hidden="true" size={18} />
            {photoReview ? "Photos reviewed" : "Awaiting photos"}
          </span>
        </div>

        <div className="csv-upload-row">
          <label
            className={
              photoUploadDisabled
                ? "csv-upload-control csv-upload-control-disabled"
                : "csv-upload-control"
            }
            htmlFor="player-photos-input"
          >
            <Upload aria-hidden="true" size={20} />
            <span>Choose Player photos</span>
            <input
              accept=".jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp,image/heic,image/heif"
              data-testid="player-photos-input"
              disabled={photoUploadDisabled}
              id="player-photos-input"
              multiple
              onChange={handlePlayerPhotosChange}
              type="file"
            />
          </label>
          <div className="csv-upload-status" aria-live="polite">
            <strong>
              {selectedPhotoFileNames.length
                ? `${selectedPhotoFileNames.length} photo file${selectedPhotoFileNames.length === 1 ? "" : "s"} selected`
                : "No photo files selected"}
            </strong>
            {photoUploadState === "loading" ? (
              <span>Reviewing Player photos...</span>
            ) : photoUploadState === "error" ? (
              <span>Photo upload failed. Fix the files or try again.</span>
            ) : null}
          </div>
        </div>

        {photoUploadError ? (
          <p className="csv-error" role="alert">
            <FileWarning aria-hidden="true" size={18} />
            <span>{photoUploadError}</span>
          </p>
        ) : null}

        <div className="csv-summary-grid photo-summary-grid" data-testid="player-photos-summary">
          <article>
            <span className="status-label">Matched photos</span>
            <strong>{photoReview?.summary.matchedPhotos ?? 0} matched</strong>
          </article>
          <article>
            <span className="status-label">Placeholders</span>
            <strong>
              {photoReview?.summary.placeholderPhotos ?? 0}{" "}
              {(photoReview?.summary.placeholderPhotos ?? 0) === 1 ? "placeholder" : "placeholders"}
            </strong>
          </article>
        </div>
      </section>

      <section
        className="setup-team-csv"
        data-testid="setup-team-csv"
        aria-labelledby="team-csv-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="team-csv-title">Team CSV review</h2>
          </div>
          <span className={teamReviewStatus.className}>
            <ListChecks aria-hidden="true" size={18} />
            {teamReviewStatus.label}
          </span>
        </div>

        <div className="csv-upload-row">
          <label className="csv-upload-control" htmlFor="team-csv-input">
            <Upload aria-hidden="true" size={20} />
            <span>Choose Team CSV</span>
            <input
              accept=".csv,text/csv"
              data-testid="team-csv-input"
              id="team-csv-input"
              onChange={handleTeamCsvChange}
              type="file"
            />
          </label>
          <div className="csv-upload-status" aria-live="polite">
            <strong>{selectedTeamFileName ?? "No file selected"}</strong>
            {teamUploadState === "loading" ? (
              <span>Reviewing Team CSV...</span>
            ) : teamUploadState === "error" ? (
              <span>{teamUploadError ?? "Upload failed. Fix the file or try again."}</span>
            ) : null}
          </div>
        </div>

        {teamUploadError ? (
          <p className="csv-error" role="alert">
            <FileWarning aria-hidden="true" size={18} />
            <span>{teamUploadError}</span>
          </p>
        ) : null}

        <div className="csv-summary-grid" data-testid="team-csv-summary">
          <article>
            <span className="status-label">Imported Teams</span>
            <strong>{teamReview?.summary.importedTeams ?? 0} imported</strong>
          </article>
          <article>
            <span className="status-label">Required fixes</span>
            <strong>{teamReview?.summary.mustFixCount ?? 0} must fix</strong>
          </article>
          <article>
            <span className="status-label">Ignored fields</span>
            <strong>{teamReview?.summary.ignoredSourceFieldCount ?? 0} ignored</strong>
          </article>
        </div>

        <section aria-label="Imported Team preview">
          <div className="subsection-heading">
            <h3>Imported Teams</h3>
            <span>{teamReview?.teams.length ?? 0}</span>
          </div>
          <div className="table-scroll">
            <table className="data-table team-data-table">
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Team</th>
                  <th scope="col">Captain</th>
                </tr>
              </thead>
              <tbody>
                {teamReview?.teams.length ? (
                  teamReview.teams.map((team) => (
                    <tr
                      data-testid={`team-preview-row-${team.sourceRowNumber}`}
                      key={`${team.sourceRowNumber}-${team.name}`}
                    >
                      <td>{team.sourceRowNumber}</td>
                      <td>{team.name}</td>
                      <td>{team.captain}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>No Team CSV has been reviewed yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section
        className="setup-team-logos"
        data-testid="setup-team-logos"
        aria-labelledby="team-logos-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="team-logos-title">Team logos</h2>
          </div>
          <span className={logoReview ? "review-state review-state-ready" : "review-state"}>
            <Upload aria-hidden="true" size={18} />
            {logoReview ? "Logos reviewed" : "Awaiting logos"}
          </span>
        </div>

        <div className="csv-upload-row">
          <label
            className={
              logoUploadDisabled
                ? "csv-upload-control csv-upload-control-disabled"
                : "csv-upload-control"
            }
            htmlFor="team-logos-input"
          >
            <Upload aria-hidden="true" size={20} />
            <span>Choose Team logos</span>
            <input
              accept=".jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp,image/heic,image/heif"
              data-testid="team-logos-input"
              disabled={logoUploadDisabled}
              id="team-logos-input"
              multiple
              onChange={handleTeamLogosChange}
              type="file"
            />
          </label>
          <div className="csv-upload-status" aria-live="polite">
            <strong>
              {selectedLogoFileNames.length
                ? `${selectedLogoFileNames.length} logo file${selectedLogoFileNames.length === 1 ? "" : "s"} selected`
                : "No logo files selected"}
            </strong>
            {logoUploadState === "loading" ? (
              <span>Reviewing Team logos...</span>
            ) : logoUploadState === "error" ? (
              <span>Logo upload failed. Fix the files or try again.</span>
            ) : null}
          </div>
        </div>

        {logoUploadError ? (
          <p className="csv-error" role="alert">
            <FileWarning aria-hidden="true" size={18} />
            <span>{logoUploadError}</span>
          </p>
        ) : null}

        <div className="csv-summary-grid photo-summary-grid" data-testid="team-logos-summary">
          <article>
            <span className="status-label">Matched logos</span>
            <strong>{logoReview?.summary.matchedLogos ?? 0} matched</strong>
          </article>
          <article>
            <span className="status-label">Placeholders</span>
            <strong>
              {logoReview?.summary.placeholderLogos ?? 0}{" "}
              {(logoReview?.summary.placeholderLogos ?? 0) === 1 ? "placeholder" : "placeholders"}
            </strong>
          </article>
        </div>
      </section>

      <AuctionParametersSection
        numberFields={numberFields}
        onBidIncrementChange={(value) => {
          markParameterDraftEdited();
          setNumberFields((current) => ({ ...current, bidIncrement: value }));
        }}
        onManualAssignmentBehaviorChange={(value) => {
          markParameterDraftEdited();
          setParameterDraft((current) =>
            current
              ? {
                  ...current,
                  manualAssignmentBudgetBehavior: value
                }
              : current
          );
        }}
        onMaxSquadSizeChange={(value) => {
          markParameterDraftEdited();
          setNumberFields((current) => ({ ...current, maxSquadSize: value }));
        }}
        onPhase1OrderChange={(value) => {
          markParameterDraftEdited();
          setPhase1OrderText(value);
        }}
        onRoleBasePriceChange={(role, value) => {
          markParameterDraftEdited();
          updateRoleNumberField("roleBasePrices", role, value);
        }}
        onRoleTargetChange={(role, value) => {
          markParameterDraftEdited();
          updateRoleNumberField("roleTargets", role, value);
        }}
        onSave={() => {
          void handleAuctionParametersSave();
        }}
        onTeamBudgetChange={(value) => {
          markParameterDraftEdited();
          setNumberFields((current) => ({ ...current, teamBudget: value }));
        }}
        parameterBlockingReasons={parameterBlockingReasons}
        parameterDraft={parameterDraft}
        parameterLoadState={parameterLoadState}
        parameterSaveError={parameterSaveError}
        parameterSaveState={parameterSaveState}
        phase1OrderError={phase1OrderError}
        phase1OrderText={phase1OrderText}
      />

      <div className="start-auction-row">
        <div>
          {blockerText ? (
            <p data-testid="start-auction-blocker">{blockerText}</p>
          ) : null}
          {startAuctionError ? (
            <p className="csv-error" role="alert">
              <FileWarning aria-hidden="true" size={18} />
              <span>{startAuctionError}</span>
            </p>
          ) : null}
        </div>
        <button
          className={
            startAuctionDisabled
              ? "primary-action primary-action-disabled"
              : "primary-action"
          }
          data-testid="setup-start-auction"
          disabled={startAuctionDisabled}
          onClick={() => {
            void handleStartAuction();
          }}
          type="button"
        >
          <PlayCircle aria-hidden="true" size={20} />
          <span>
            {startAuctionState === "loading" ? "Starting Auction..." : "Start Auction"}
          </span>
        </button>
      </div>
    </main>
  );
}

function ResumeStartSurface({
  resume,
  onResume
}: {
  readonly resume: ResumeSummary;
  readonly onResume: () => void | Promise<void>;
}) {
  return (
    <main className="app-shell live-app-shell" data-testid="app-shell">
      <header className="app-header" aria-labelledby="app-title">
        <h1 id="app-title">Auction Manager</h1>
      </header>

      <section className="resume-start-panel" data-testid="resume-start-surface">
        <div className="setup-copy">
          <h2>Saved auction found</h2>
        </div>
        <div className="resume-summary-grid" aria-label="Saved auction summary">
          <article>
            <span className="status-label">Saved phase</span>
            <strong data-testid="resume-phase">{formatPhaseLabel(resume.phase)}</strong>
          </article>
          <article>
            <span className="status-label">Last saved action</span>
            <strong data-testid="resume-last-action">
              {formatCommandLabel(resume.lastSavedAction)}
            </strong>
          </article>
          <article>
            <span className="status-label">Last saved</span>
            <strong data-testid="resume-last-saved-at">
              {resume.lastSavedAt ?? "Unknown"}
            </strong>
          </article>
          <article>
            <span className="status-label">Current player</span>
            <strong data-testid="resume-current-player">
              {resume.currentPlayerName ?? "No Current Player"}
            </strong>
          </article>
          <article>
            <span className="status-label">Pending</span>
            <strong>{resume.pendingPlayerCount} pending</strong>
          </article>
        </div>
        {resume.persistenceFailure ? (
          <p className="persistence-warning" role="alert">
            Local recovery snapshot could not be written. Resolve persistence before the
            next command.
          </p>
        ) : null}
        <div className="setup-actions" aria-label="Resume actions">
          <button
            className="primary-action"
            data-testid="resume-auction"
            onClick={onResume}
            type="button"
          >
            <PlayCircle aria-hidden="true" size={20} />
            <span>Resume {formatPhaseLabel(resume.phase)}</span>
          </button>
        </div>
      </section>
    </main>
  );
}

type LiveView = "board" | "rosters";

function getPhaseDisplayLabel(phase: BoardStateDto["phase"]): string {
  if (phase === "InitialAuction") {
    return "Initial Auction";
  }

  if (phase === "UnsoldBidding") {
    return "Unsold Bidding";
  }

  if (phase === "ManualAssignment") {
    return "Manual Assignment";
  }

  return phase;
}

function getPrimaryRoleMetric(
  roleCounts: BoardStateDto["teamRosters"][number]["roleCounts"],
  parameters: BoardStateDto["parameters"]
): { label: string; value: string } {
  const firstActiveRole = auctionRoleValues.find((role) => roleCounts[role] > 0);

  if (firstActiveRole === undefined) {
    return { label: "Roles", value: "—" };
  }

  return {
    label: formatAuctionRoleLabel(firstActiveRole),
    value: `${roleCounts[firstActiveRole]} / ${parameters.roleTargets[firstActiveRole]}`
  };
}

function formatRosterRowPrice(
  player: BoardStateDto["teamRosters"][number]["roster"][number]
): string {
  return typeof player.soldPrice === "number" ? String(player.soldPrice) : "No price";
}

function formatRosterAcquisitionType(
  player: BoardStateDto["teamRosters"][number]["roster"][number]
): string {
  return player.acquisitionType === "ManualAssignment" ? "Assigned" : player.acquisitionType;
}

function BoardRostersSwitch({
  liveView,
  onChange,
  disabled
}: {
  readonly liveView: LiveView;
  readonly onChange: (view: LiveView) => void;
  readonly disabled: boolean;
}) {
  const options: { id: LiveView; label: string }[] = [
    { id: "board", label: "Board" },
    { id: "rosters", label: "Rosters" }
  ];

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (disabled) {
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % options.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = options.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    onChange(options[nextIndex]!.id);
    const switchRoot = event.currentTarget.closest('[data-testid="board-rosters-switch"]');
    const nextTab = switchRoot?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex];
    nextTab?.focus();
  }

  return (
    <nav
      aria-label="Board and rosters"
      className="board-rosters-switch"
      data-testid="board-rosters-switch"
    >
      <div className="board-rosters-switch-tabs" role="tablist">
        {options.map((option, index) => {
          const isSelected = liveView === option.id;
          return (
            <button
              aria-controls={`live-view-panel-${option.id}`}
              aria-selected={isSelected}
              className={
                isSelected
                  ? "board-rosters-switch-tab board-rosters-switch-tab-active"
                  : "board-rosters-switch-tab"
              }
              disabled={disabled}
              id={`live-view-tab-${option.id}`}
              key={option.id}
              onClick={() => onChange(option.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              role="tab"
              type="button"
              {...(disabled ? { "aria-describedby": "live-view-switch-disabled-reason" } : {})}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {disabled ? (
        <p className="board-rosters-switch-disabled-copy" id="live-view-switch-disabled-reason">
          View switching is unavailable while persistence recovery is required.
        </p>
      ) : null}
    </nav>
  );
}

function TeamLogo({
  logoAssetId,
  teamName
}: {
  readonly logoAssetId?: string | undefined;
  readonly teamName: string;
}) {
  if (logoAssetId) {
    return (
      <>
        <img
          alt={`${teamName} logo`}
          className="team-logo"
          onError={(event) => {
            event.currentTarget.hidden = true;
            const fallback = event.currentTarget.parentElement?.querySelector(
              ".team-logo-fallback"
            );
            if (fallback instanceof HTMLElement) {
              fallback.hidden = false;
            }
          }}
          src={`/assets/teams/${logoAssetId}.webp`}
        />
        <span
          aria-label="Team logo placeholder"
          className="team-logo-placeholder team-logo-fallback"
          data-testid="team-logo-placeholder"
          hidden
          role="img"
        >
          Team logo placeholder
        </span>
      </>
    );
  }

  return (
    <span
      aria-label="Team logo placeholder"
      className="team-logo-placeholder"
      data-testid="team-logo-placeholder"
      role="img"
    >
      Team logo placeholder
    </span>
  );
}

function TeamRostersView({
  boardState,
  onOpenTeamDetail
}: {
  readonly boardState: BoardStateDto;
  readonly onOpenTeamDetail: (teamId: string, trigger: HTMLButtonElement) => void;
}) {
  const isClosed = boardState.phase === "Closed";
  const phaseLabel = isClosed ? "Auction Closed" : "Live Rosters";
  const title = isClosed ? "Final Rosters" : "Team Rosters";

  return (
    <section
      aria-labelledby="live-view-tab-rosters team-rosters-title"
      className="team-rosters-view"
      data-testid="team-rosters-view"
      id="live-view-panel-rosters"
      role="tabpanel"
    >
      <div
        className={isClosed ? "roster-board roster-board-closed" : "roster-board"}
        data-testid="roster-board"
      >
      {isClosed ? <span data-testid="closed-rosters-view" hidden /> : null}
      <div className="roster-board-header" data-testid="roster-board-header">
        <div>
          <span className="eyebrow">{phaseLabel}</span>
          <h2 data-testid="roster-board-title" id="team-rosters-title">
            {title}
          </h2>
        </div>
        <div className="roster-board-count" aria-label={`${boardState.teamRosters.length} teams`}>
          <span className="status-label">Teams</span>
          <strong>{boardState.teamRosters.length}</strong>
        </div>
      </div>
      <div className="team-rosters-grid" data-testid="roster-team-grid">
        {boardState.teamRosters.map((teamRoster) => {
          const team = boardState.teams.find((entry) => entry.id === teamRoster.teamId);
          const logoAssetId = teamRoster.logoAssetId ?? team?.logoAssetId;
          const roleMetric = getPrimaryRoleMetric(
            teamRoster.roleCounts,
            boardState.parameters
          );
          return (
            <article
              aria-label={`${teamRoster.name} roster`}
              className="roster-team-section"
              data-testid="roster-team-section"
              key={teamRoster.teamId}
              role="region"
            >
              <div className="roster-team-section-header">
                <div className="roster-team-section-heading">
                  <TeamLogo
                    teamName={teamRoster.name}
                    {...(logoAssetId ? { logoAssetId } : {})}
                  />
                  <div>
                    <h3>{teamRoster.name}</h3>
                    <p>{teamRoster.captain}</p>
                  </div>
                </div>
                <button
                  aria-label={`View ${teamRoster.name} details`}
                  className="team-detail-trigger"
                  data-testid="team-detail-trigger"
                  onClick={(event) => onOpenTeamDetail(teamRoster.teamId, event.currentTarget)}
                  type="button"
                >
                  <Info aria-hidden="true" size={18} />
                  <span>Details</span>
                </button>
              </div>
              <dl className="roster-team-summary" data-testid="roster-team-summary">
                <div>
                  <dt>Budget</dt>
                  <dd>{teamRoster.remainingBudget}</dd>
                </div>
                <div>
                  <dt>Squad</dt>
                  <dd>{teamRoster.squadCount}</dd>
                </div>
                <div>
                  <dt>{roleMetric.label}</dt>
                  <dd>{roleMetric.value}</dd>
                </div>
              </dl>
              <p className="roster-role-counts">{formatRoleCountsSummary(teamRoster.roleCounts)}</p>
              {teamRoster.roster.length === 0 ? (
                <p className="roster-empty-copy" data-testid="roster-empty-team">
                  No players bought yet.
                </p>
              ) : (
                <ul className="roster-player-list">
                  {teamRoster.roster.map((player) => (
                    <li
                      className="roster-player-row"
                      data-testid="roster-player-row"
                      key={player.playerId}
                    >
                      <span className="roster-player-name">{player.name}</span>
                      <span>{formatAuctionRoleLabel(player.role)}</span>
                      <span>{formatRosterAcquisitionType(player)}</span>
                      <span>{formatRosterRowPrice(player)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
      </div>
    </section>
  );
}

function TeamDetailDrawer({
  boardState,
  teamId,
  onClose,
  triggerRef
}: {
  readonly boardState: BoardStateDto;
  readonly teamId: string;
  readonly onClose: () => void;
  readonly triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const team = boardState.teams.find((entry) => entry.id === teamId);
  const teamRoster = getTeamRoster(boardState, teamId);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
    focusable[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || focusable.length === 0) {
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, teamId]);

  useEffect(() => {
    return () => {
      triggerRef.current?.focus();
    };
  }, [triggerRef]);

  useEffect(() => {
    if (!team || !teamRoster) {
      onClose();
    }
  }, [onClose, team, teamRoster]);

  if (!team || !teamRoster) {
    return null;
  }

  const capacityCopy = getTeamCapacityCopy(boardState, teamId);
  const logoAssetId = teamRoster.logoAssetId ?? team.logoAssetId;

  return (
    <div className="team-detail-drawer-overlay">
      <section
        aria-labelledby="team-detail-drawer-title"
        aria-modal="true"
        className="team-detail-drawer"
        data-testid="team-detail-drawer"
        ref={panelRef}
        role="dialog"
      >
        <header className="team-detail-drawer-header">
          <div className="team-detail-drawer-heading">
            <TeamLogo teamName={team.name} {...(logoAssetId ? { logoAssetId } : {})} />
            <div>
              <h2 id="team-detail-drawer-title">{team.name}</h2>
              <p>{team.captain}</p>
            </div>
          </div>
          <button
            aria-label="Close team details"
            className="team-detail-drawer-close"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </header>
        <dl className="team-detail-drawer-summary">
          <div>
            <dt>Budget</dt>
            <dd>{team.budget}</dd>
          </div>
          <div>
            <dt>Remaining</dt>
            <dd>{team.remainingBudget}</dd>
          </div>
          <div>
            <dt>Squad</dt>
            <dd>{team.squadCount}</dd>
          </div>
        </dl>
        <p className="roster-role-counts">{formatRoleCountsSummary(teamRoster.roleCounts)}</p>
        <p
          className="team-detail-capacity"
          data-testid={
            team.currentPlayerCapacity && !team.currentPlayerCapacity.canBuy
              ? "team-capacity-reason"
              : undefined
          }
        >
          {capacityCopy}
        </p>
        {teamRoster.roster.length === 0 ? (
          <p className="roster-empty-copy">No players bought yet.</p>
        ) : (
          <ul className="roster-player-list">
            {teamRoster.roster.map((player) => (
              <li
                className="roster-player-row"
                data-testid="roster-player-row"
                key={player.playerId}
              >
                <span className="roster-player-name">{player.name}</span>
                <span>{formatAuctionRoleLabel(player.role)}</span>
                <span>{player.acquisitionType}</span>
                <span>{player.soldPrice}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ManualAssignmentSurface({
  boardState,
  detailTeamId,
  detailTriggerRef,
  liveView,
  onCloseTeamDetail,
  onLiveViewChange,
  onOpenTeamDetail,
  onUndo,
  undoDisabled,
  undoError,
  undoState,
  undoSummary
}: {
  readonly boardState: BoardStateDto;
  readonly detailTeamId: string | null;
  readonly detailTriggerRef: RefObject<HTMLButtonElement | null>;
  readonly liveView: LiveView;
  readonly onCloseTeamDetail: () => void;
  readonly onLiveViewChange: (view: LiveView) => void;
  readonly onOpenTeamDetail: (teamId: string, trigger: HTMLButtonElement) => void;
  readonly onUndo: () => void;
  readonly undoDisabled: boolean;
  readonly undoError: string | null;
  readonly undoState: "idle" | "loading" | "ready" | "error";
  readonly undoSummary: string | null;
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    boardState.selectedTeamId
  );

  useEffect(() => {
    setSelectedTeamId(boardState.selectedTeamId);
  }, [boardState.selectedTeamId]);

  useEffect(() => {
    if (selectedTeamId === null) {
      return;
    }

    const team = boardState.teams.find((entry) => entry.id === selectedTeamId);
    if (team === undefined) {
      setSelectedTeamId(boardState.selectedTeamId);
      return;
    }

    const capacity = team.currentPlayerCapacity;
    if (capacity !== undefined && !capacity.canBuy) {
      const fallbackTeam = boardState.teams.find(
        (entry) => entry.currentPlayerCapacity?.canBuy === true
      );
      setSelectedTeamId(fallbackTeam?.id ?? boardState.selectedTeamId);
    }
  }, [boardState.selectedTeamId, boardState.teams, selectedTeamId]);

  const assignmentPlayer = boardState.currentPlayer;
  const poolPlayers = getManualAssignmentPoolPlayers(boardState);
  const counters = getManualAssignmentCounters(boardState);
  const blockedReasons = getManualAssignmentBlockedReasons(boardState);
  const selectedTeam =
    selectedTeamId === null
      ? null
      : boardState.teams.find((team) => team.id === selectedTeamId) ?? null;
  const teamSelectionEnabled = boardState.persistenceFailure === null;

  return (
    <main className="app-shell live-app-shell manual-app-shell" data-testid="app-shell">
      <header className="app-header" aria-labelledby="app-title">
        <h1 id="app-title">Auction Manager</h1>
      </header>

      <section
        aria-label="Manual assignment status"
        className="manual-assignment-topbar"
        data-testid="manual-assignment-counters"
      >
        <div className="manual-brand-block">
          <span className="eyebrow">Auction Manager</span>
          <strong>Manual Assignment</strong>
        </div>
        <div className="manual-counter-band">
          <article>
            <span className="status-label">Pool</span>
            <strong data-testid="manual-pool-count">{counters.pool}</strong>
          </article>
          <article>
            <span className="status-label">Assigned</span>
            <strong data-testid="manual-assigned-count">{counters.assigned}</strong>
          </article>
          <article>
            <span className="status-label">Remaining</span>
            <strong data-testid="manual-remaining-count">{counters.remaining}</strong>
          </article>
          <article>
            <span className="status-label">Valid</span>
            <strong data-testid="manual-valid-count">{counters.valid}</strong>
          </article>
          <article>
            <span className="status-label">Blocked</span>
            <strong data-testid="manual-blocked-count">{counters.blocked}</strong>
          </article>
          <article>
            <span className="status-label">Teams</span>
            <strong data-testid="manual-teams-count">{counters.teams}</strong>
          </article>
        </div>
      </section>

      {boardState.persistenceFailure ? (
        <div
          className="persistence-warning"
          data-testid="persistence-warning"
          role="alert"
        >
          <AlertCircle aria-hidden="true" size={18} />
          <span>
            Local recovery snapshot could not be written. Resolve persistence before
            the next command.
          </span>
        </div>
      ) : null}

      <section
        aria-label="Auction phases"
        className="phase-strip"
        data-testid="phase-indicator"
      >
        {phases.map((phase) => {
          const isActive = phase === "Manual Assignment";
          return (
            <div
              aria-current={isActive ? "step" : undefined}
              className={isActive ? "phase-step phase-step-active" : "phase-step"}
              key={phase}
            >
              {isActive ? (
                <CheckCircle2 aria-hidden="true" size={18} />
              ) : (
                <Circle aria-hidden="true" size={18} />
              )}
              <span>{phase}</span>
            </div>
          );
        })}
      </section>

      <BoardRostersSwitch
        disabled={!canSwitchLiveView(boardState)}
        liveView={liveView}
        onChange={onLiveViewChange}
      />

      {liveView === "rosters" ? (
        <TeamRostersView
          boardState={boardState}
          onOpenTeamDetail={onOpenTeamDetail}
        />
      ) : (
        <section
          aria-labelledby="live-view-tab-board"
          className="manual-assignment-surface"
          data-testid="manual-assignment-surface"
          id="live-view-panel-board"
          role="tabpanel"
        >
          <div className="manual-layout">
            <aside className="manual-column" aria-label="Assignment player and pool">
              <section
                aria-labelledby="manual-assignment-player-title"
                className="manual-assignment-player-card"
                data-testid="manual-assignment-player-card"
              >
                {assignmentPlayer ? (
                  <div className="manual-assignment-player-layout">
                    <div className="manual-assignment-player-media">
                      {assignmentPlayer.photoAssetId ? (
                        <>
                          <img
                            alt={`${assignmentPlayer.name} player photo`}
                            data-testid="manual-assignment-player-photo"
                            onError={(event) => {
                              event.currentTarget.hidden = true;
                              const fallback = event.currentTarget.parentElement?.querySelector(
                                ".player-photo-fallback"
                              );
                              if (fallback instanceof HTMLElement) {
                                fallback.hidden = false;
                              }
                            }}
                            src={`/assets/players/${assignmentPlayer.photoAssetId}.webp`}
                          />
                          <div
                            aria-label="Player photo placeholder"
                            className="player-photo-placeholder player-photo-fallback"
                            hidden
                            role="img"
                          >
                            Player photo placeholder
                          </div>
                        </>
                      ) : (
                        <div
                          aria-label="Player photo placeholder"
                          className="player-photo-placeholder"
                          role="img"
                        >
                          Player photo placeholder
                        </div>
                      )}
                    </div>
                    <div className="manual-assignment-player-details">
                      <span className="eyebrow">Assign Player</span>
                      <h2
                        data-testid="manual-assignment-player-name"
                        id="manual-assignment-player-title"
                      >
                        {assignmentPlayer.name}
                      </h2>
                      <dl className="manual-assignment-player-facts">
                        <div>
                          <dt>Role</dt>
                          <dd data-testid="manual-assignment-player-role">
                            {formatAuctionRoleLabel(assignmentPlayer.role)}
                          </dd>
                        </div>
                        <div>
                          <dt>Base price</dt>
                          <dd data-testid="manual-assignment-player-base-price">
                            {assignmentPlayer.basePrice}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                ) : (
                  <h2 id="manual-assignment-player-title">No assignment player</h2>
                )}
              </section>

              <section
                aria-label="Manual assignment pool"
                className="manual-assignment-pool"
                data-testid="manual-assignment-pool"
              >
                {poolPlayers.length === 0 ? (
                  <p className="roster-empty-copy">No players in assignment pool.</p>
                ) : null}
                {poolPlayers.map((player, index) => {
                  const isActive = assignmentPlayer?.id === player.id;
                  return (
                    <article
                      aria-current={isActive ? "true" : undefined}
                      className={
                        isActive
                          ? "manual-assignment-pool-row manual-assignment-pool-row-active"
                          : "manual-assignment-pool-row"
                      }
                      data-testid="manual-assignment-pool-row"
                      key={player.id}
                    >
                      <span className="manual-assignment-pool-order">{index + 1}</span>
                      <strong>{player.name}</strong>
                      <span>{formatAuctionRoleLabel(player.role)}</span>
                    </article>
                  );
                })}
              </section>

              <div className="manual-assignment-command-region">
                <button
                  className="primary-action primary-action-disabled manual-assignment-command"
                  data-testid="manual-assignment-command"
                  disabled
                  type="button"
                >
                  <Check aria-hidden="true" size={20} />
                  <span>
                    {selectedTeam
                      ? `Assign to ${selectedTeam.name}`
                      : "Assign Player"}
                  </span>
                </button>
                {canUndo(boardState) ? (
                  <button
                    aria-busy={undoState === "loading"}
                    aria-label={
                      boardState.lastUndoAction
                        ? boardState.lastUndoAction.summary.startsWith("Undo")
                          ? boardState.lastUndoAction.summary
                          : `Undo: ${boardState.lastUndoAction.summary}`
                        : "Undo: No actions to undo."
                    }
                    className={
                      undoDisabled
                        ? "secondary-action secondary-action-disabled"
                        : "secondary-action"
                    }
                    data-testid="undo-action"
                    disabled={undoDisabled}
                    onClick={onUndo}
                    type="button"
                  >
                    <RotateCcw aria-hidden="true" size={18} />
                    <span>{undoState === "loading" ? "Undoing..." : "Undo"}</span>
                  </button>
                ) : null}
              </div>
            </aside>

            <section
              aria-label="Eligible teams"
              className="manual-assignment-team-matrix"
              data-testid="manual-assignment-team-matrix"
            >
              <div className="matrix-header">
                <div className="subsection-heading">
                  <h3>Eligible Teams</h3>
                  <span>{boardState.teams.length}</span>
                </div>
                {selectedTeam ? (
                  <span className="selected-team-tag">
                    Selected: {selectedTeam.name}
                  </span>
                ) : null}
              </div>
              <div className="manual-assignment-team-grid">
                {boardState.teams.map((team) => {
                  const isSelected = team.id === selectedTeamId;
                  const capacity = team.currentPlayerCapacity;
                  const isBlocked = capacity !== undefined && !capacity.canBuy;
                  const displayRole = assignmentPlayer?.role;
                  const roleCount =
                    displayRole === undefined ? undefined : team.roleCounts[displayRole];
                  const roleTarget =
                    displayRole === undefined
                      ? undefined
                      : boardState.parameters.roleTargets[displayRole];
                  const roleCapacityLabel =
                    roleCount === undefined || roleTarget === undefined
                      ? "—"
                      : `${roleCount} / ${roleTarget}`;

                  return (
                    <article className="manual-assignment-team-option-shell" key={team.id}>
                      <button
                        aria-label={`${team.name}, captain ${team.captain}, remaining budget ${team.remainingBudget}, squad ${team.squadCount}, ${displayRole ? formatAuctionRoleLabel(displayRole) : "Role"} ${roleCapacityLabel}`}
                        aria-pressed={isSelected}
                        className={[
                          "manual-assignment-team-option",
                          isSelected ? "manual-assignment-team-selected" : null,
                          isBlocked ? "manual-assignment-team-blocked" : null
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        data-testid={
                          isSelected
                            ? "manual-assignment-team-selected"
                            : isBlocked
                              ? "manual-assignment-team-blocked"
                              : "manual-assignment-team-option"
                        }
                        disabled={!teamSelectionEnabled || isBlocked}
                        onClick={() => {
                          if (!isBlocked) {
                            setSelectedTeamId(team.id);
                          }
                        }}
                        type="button"
                      >
                        <div className="team-tile-heading">
                          <TeamLogo
                            teamName={team.name}
                            {...(team.logoAssetId ? { logoAssetId: team.logoAssetId } : {})}
                          />
                          <span>
                            <strong>{team.name}</strong>
                            <span>{team.captain}</span>
                          </span>
                        </div>
                        <dl>
                          <div>
                            <dt>Remaining</dt>
                            <dd>{team.remainingBudget}</dd>
                          </div>
                          <div>
                            <dt>Squad</dt>
                            <dd>{team.squadCount}</dd>
                          </div>
                          <div>
                            <dt>
                              {displayRole ? formatAuctionRoleLabel(displayRole) : "Role"}
                            </dt>
                            <dd>{roleCapacityLabel}</dd>
                          </div>
                        </dl>
                      </button>
                      <button
                        aria-label={`View ${team.name} details`}
                        className="team-detail-trigger"
                        data-testid="team-detail-trigger"
                        onClick={(event) => onOpenTeamDetail(team.id, event.currentTarget)}
                        type="button"
                      >
                        <Info aria-hidden="true" size={18} />
                        <span>Details</span>
                      </button>
                    </article>
                  );
                })}
              </div>

              {blockedReasons.length > 0 ? (
                <div
                  aria-live="polite"
                  className="manual-assignment-blocked-reason"
                  data-testid="manual-assignment-blocked-reason"
                  role="status"
                >
                  {blockedReasons.map((reason, index) => (
                    <p key={`${reason}-${index}`}>{reason}</p>
                  ))}
                </div>
              ) : null}
            </section>
          </div>

          {undoError ? (
            <p className="command-error" data-testid="undo-error" role="alert">
              <AlertCircle aria-hidden="true" size={18} />
              <span>{undoError}</span>
            </p>
          ) : null}
          {undoSummary ? (
            <p className="undo-success" data-testid="undo-success" role="status">
              {undoSummary}
            </p>
          ) : null}
        </section>
      )}

      {detailTeamId ? (
        <TeamDetailDrawer
          boardState={boardState}
          onClose={onCloseTeamDetail}
          teamId={detailTeamId}
          triggerRef={detailTriggerRef}
        />
      ) : null}
    </main>
  );
}

function AuctionBoard({
  boardState,
  onRevealNext,
  onSelectTeam,
  onIncreaseBid,
  onMarkSold,
  onMarkUnsold,
  onUndo,
  increaseBidError,
  increaseBidState,
  markSoldError,
  markSoldState,
  markSoldSummary,
  markUnsoldError,
  markUnsoldState,
  markUnsoldSummary,
  undoError,
  undoState,
  undoSummary,
  revealNextError,
  revealNextState,
  selectTeamError,
  selectTeamState
}: {
  readonly boardState: BoardStateDto;
  readonly onRevealNext: () => void;
  readonly onSelectTeam: (teamId: string | null) => void;
  readonly onIncreaseBid: () => void;
  readonly onMarkSold: () => void;
  readonly onMarkUnsold: () => void;
  readonly onUndo: () => void;
  readonly increaseBidError: string | null;
  readonly increaseBidState: "idle" | "loading" | "ready" | "error";
  readonly markSoldError: string | null;
  readonly markSoldState: "idle" | "loading" | "ready" | "error";
  readonly markSoldSummary: string | null;
  readonly markUnsoldError: string | null;
  readonly markUnsoldState: "idle" | "loading" | "ready" | "error";
  readonly markUnsoldSummary: string | null;
  readonly undoError: string | null;
  readonly undoState: "idle" | "loading" | "ready" | "error";
  readonly undoSummary: string | null;
  readonly revealNextError: string | null;
  readonly revealNextState: "idle" | "loading" | "ready" | "error";
  readonly selectTeamError: string | null;
  readonly selectTeamState: "idle" | "loading" | "ready" | "error";
}) {
  const [liveView, setLiveView] = useState<LiveView>(() =>
    boardState.phase === "Closed" ? "rosters" : "board"
  );
  const [detailTeamId, setDetailTeamId] = useState<string | null>(null);
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previousPhaseRef = useRef(boardState.phase);
  const phaseDisplayLabel = getPhaseDisplayLabel(boardState.phase);
  const isClosedPhase = boardState.phase === "Closed";

  useEffect(() => {
    if (!canSwitchLiveView(boardState) && liveView === "rosters") {
      setLiveView("board");
      setDetailTeamId(null);
    }
  }, [boardState.persistenceFailure, liveView]);

  useEffect(() => {
    if (boardState.phase === "ManualAssignment" && liveView === "rosters") {
      setLiveView("board");
      setDetailTeamId(null);
    }
  }, [boardState.phase, liveView]);

  useEffect(() => {
    if (previousPhaseRef.current !== "Closed" && boardState.phase === "Closed") {
      setLiveView("rosters");
      setDetailTeamId(null);
    }
    previousPhaseRef.current = boardState.phase;
  }, [boardState.phase]);

  function handleLiveViewChange(view: LiveView) {
    setDetailTeamId(null);
    setLiveView(view);
  }

  function handleOpenTeamDetail(teamId: string, trigger: HTMLButtonElement) {
    detailTriggerRef.current = trigger;
    setDetailTeamId(teamId);
  }
  const currentPlayer = boardState.currentPlayer;
  const undoInFlight = undoState === "loading";
  const revealDisabled =
    !canRevealNextPlayer(boardState) || revealNextState === "loading" || undoInFlight;
  const selectionEnabled =
    canSelectTeam(boardState) &&
    selectTeamState !== "loading" &&
    !undoInFlight;
  const increaseBidDisabled =
    !canIncreaseBid(boardState) || increaseBidState === "loading" || undoInFlight;
  const selectedTeam =
    boardState.selectedTeamId === null
      ? null
      : boardState.teams.find((team) => team.id === boardState.selectedTeamId) ??
        null;
  const selectedTeamCapacity = selectedTeam?.currentPlayerCapacity ?? null;
  const markSoldBlockedReasons =
    selectedTeamCapacity && !selectedTeamCapacity.canBuy
      ? selectedTeamCapacity.reasons.map((reason) => `Blocked: ${reason}`)
      : [];
  const markSoldDisabled =
    !canAttemptMarkSold(boardState) ||
    markSoldState === "loading" ||
    markSoldBlockedReasons.length > 0 ||
    undoInFlight;
  const markUnsoldDisabled =
    !canAttemptMarkUnsold(boardState) || markUnsoldState === "loading" || undoInFlight;
  const undoDisabled =
    !canUndo(boardState) ||
    undoState === "loading" ||
    revealNextState === "loading" ||
    selectTeamState === "loading" ||
    increaseBidState === "loading" ||
    markSoldState === "loading" ||
    markUnsoldState === "loading";
  const showPhase1Complete =
    boardState.phase === "InitialAuction" &&
    boardState.currentPlayer === null &&
    boardState.phase1Progress.pendingPlayerCount === 0 &&
    boardState.phase2PoolCount > 0;

  if (boardState.phase === "ManualAssignment") {
    return (
      <ManualAssignmentSurface
        boardState={boardState}
        detailTeamId={detailTeamId}
        detailTriggerRef={detailTriggerRef}
        liveView={liveView}
        onCloseTeamDetail={() => setDetailTeamId(null)}
        onLiveViewChange={handleLiveViewChange}
        onOpenTeamDetail={handleOpenTeamDetail}
        onUndo={onUndo}
        undoDisabled={undoDisabled}
        undoError={undoError}
        undoState={undoState}
        undoSummary={undoSummary}
      />
    );
  }

  return (
    <main className="app-shell live-app-shell" data-testid="app-shell">
      <header className="app-header" aria-labelledby="app-title">
        <h1 id="app-title">Auction Manager</h1>
      </header>

      <section
        className="live-topbar"
        aria-label="Auction status"
        data-testid="live-status-counters"
      >
        <div className="live-brand-block">
          <span className="eyebrow">
            {isClosedPhase ? "Auction Closed" : phaseDisplayLabel}
          </span>
          <strong>Auction Manager</strong>
          <p
            className="phase1-progress-compact"
            data-testid="phase1-progress"
          >
            {isClosedPhase
              ? "Final room-facing roster state"
              : getPhase1OrderStatusLabel(boardState.phase1Progress)}
          </p>
        </div>
        <div className="live-counter-band">
          <article>
            <span className="status-label">Ordered</span>
            <strong data-testid="phase1-ordered-count">
              {boardState.phase1Progress.orderedPlayerCount}
            </strong>
          </article>
          <article>
            <span className="status-label">Revealed</span>
            <strong data-testid="phase1-revealed-count">
              {boardState.phase1Progress.revealedPlayerCount}
            </strong>
          </article>
          <article>
            <span className="status-label">Pending</span>
            <strong data-testid="phase1-pending-count">
              {boardState.phase1Progress.pendingPlayerCount}
            </strong>
          </article>
          <article>
            <span className="status-label">Unsold</span>
            <strong data-testid="live-unsold-count">{boardState.phase2PoolCount}</strong>
          </article>
          <article>
            <span className="status-label">Category</span>
            <strong data-testid="live-category-counter">
              {boardState.phase1Progress.currentCategory ?? "None"}
            </strong>
          </article>
          <article>
            <span className="status-label">Teams</span>
            <strong data-testid="live-teams-counter">{boardState.teams.length}</strong>
          </article>
        </div>
      </section>

      {boardState.persistenceFailure ? (
        <div
          className="persistence-warning"
          data-testid="persistence-warning"
          role="alert"
        >
          <AlertCircle aria-hidden="true" size={18} />
          <span>
            Local recovery snapshot could not be written. Resolve persistence before
            the next command.
          </span>
        </div>
      ) : null}

      <section
        className="phase-strip"
        data-testid="phase-indicator"
        aria-label="Auction phases"
      >
        {phases.map((phase) => {
          const isActive = phase === phaseDisplayLabel;
          return (
            <div
              className={isActive ? "phase-step phase-step-active" : "phase-step"}
              key={phase}
              aria-current={isActive ? "step" : undefined}
            >
              {isActive ? (
                <CheckCircle2 aria-hidden="true" size={18} />
              ) : (
                <Circle aria-hidden="true" size={18} />
              )}
              <span>{phase}</span>
            </div>
          );
        })}
      </section>

      <BoardRostersSwitch
        disabled={!canSwitchLiveView(boardState)}
        liveView={liveView}
        onChange={handleLiveViewChange}
      />

      {liveView === "rosters" ? (
        <TeamRostersView
          boardState={boardState}
          onOpenTeamDetail={handleOpenTeamDetail}
        />
      ) : isClosedPhase ? (
        <section
          aria-labelledby="live-view-tab-board"
          className="auction-board auction-board-closed"
          data-testid="auction-board"
          id="live-view-panel-board"
          role="tabpanel"
        >
          <div className="closed-board-panel">
            <span className="eyebrow">Auction Closed</span>
            <h2>Final Rosters are the active display</h2>
            <p>
              Routine bidding controls are unavailable after the auction is closed.
            </p>
          </div>
        </section>
      ) : (
      <section
        aria-labelledby="live-view-tab-board"
        className="auction-board"
        data-testid="auction-board"
        aria-live="polite"
        id="live-view-panel-board"
        role="tabpanel"
      >
        <div className="live-layout">
          <div className="board-column">
            <section
              className="live-board-stage"
              data-testid="live-board-stage"
              aria-label="Current player, bid, and commands"
            >
              <section className="player-stage" aria-label="Current player and bid">
              <section
                className="current-player-panel"
                data-testid="current-player-panel"
                aria-labelledby="current-player-title"
              >
                {currentPlayer ? (
                  <div className="current-player-layout">
                    <div className="current-player-media">
                      {currentPlayer.photoAssetId ? (
                        <>
                          <img
                            alt={`${currentPlayer.name} player photo`}
                            data-testid="current-player-photo"
                            onError={(event) => {
                              event.currentTarget.hidden = true;
                              const fallback = event.currentTarget.parentElement?.querySelector(
                                ".player-photo-fallback"
                              );
                              if (fallback instanceof HTMLElement) {
                                fallback.hidden = false;
                              }
                            }}
                            src={`/assets/players/${currentPlayer.photoAssetId}.webp`}
                          />
                          <div
                            aria-label="Player photo placeholder"
                            className="player-photo-placeholder player-photo-fallback"
                            data-testid="current-player-photo-placeholder"
                            hidden
                            role="img"
                          >
                            Player photo placeholder
                          </div>
                        </>
                      ) : (
                        <div
                          aria-label="Player photo placeholder"
                          className="player-photo-placeholder"
                          data-testid="current-player-photo-placeholder"
                          role="img"
                        >
                          Player photo placeholder
                        </div>
                      )}
                    </div>
                    <div className="current-player-details">
                      <h2 id="current-player-title" data-testid="current-player-name">
                        {currentPlayer.name}
                      </h2>
                      <dl className="current-player-facts">
                        <div>
                          <dt>Role</dt>
                          <dd data-testid="current-player-role">{currentPlayer.role}</dd>
                        </div>
                        <div>
                          <dt>Base price</dt>
                          <dd data-testid="current-player-base-price">
                            {currentPlayer.basePrice}
                          </dd>
                        </div>
                        <div>
                          <dt>Category</dt>
                          <dd data-testid="phase1-current-category">
                            Current category:{" "}
                            {boardState.phase1Progress.currentCategory ?? "None"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 id="current-player-title">No Current Player</h2>
                    <p data-testid="phase1-current-category">
                      Current category:{" "}
                      {boardState.phase1Progress.currentCategory ?? "None"}
                    </p>
                  </>
                )}
              </section>

              <div className="current-bid-hero">
                <span className="status-label">Current bid</span>
                <strong
                  className={
                    currentPlayer && boardState.currentBid !== null
                      ? "current-bid-live"
                      : undefined
                  }
                  data-testid="current-bid"
                >
                  {currentPlayer && boardState.currentBid !== null
                    ? boardState.currentBid
                    : "No current bid"}
                </strong>
              </div>
            </section>

            <section
              className="live-command-strip"
              aria-label="Live auction commands"
              data-testid="live-command-strip"
            >
              <button
                aria-busy={revealNextState === "loading"}
                className={
                  revealDisabled
                    ? "primary-action primary-action-disabled"
                    : "primary-action"
                }
                data-testid="reveal-next"
                disabled={revealDisabled}
                onClick={onRevealNext}
                type="button"
              >
                <PlayCircle aria-hidden="true" size={20} />
                <span>
                  {revealNextState === "loading"
                    ? "Revealing..."
                    : "Reveal Next Player"}
                </span>
              </button>
              <button
                aria-busy={increaseBidState === "loading"}
                className={
                  increaseBidDisabled
                    ? "live-action live-action-disabled"
                    : "live-action"
                }
                data-testid="increase-bid"
                disabled={increaseBidDisabled}
                onClick={onIncreaseBid}
                type="button"
              >
                <span>
                  {increaseBidState === "loading" ? "Increasing..." : "Increase Bid"}
                </span>
                <span className="bid-increment-chip">
                  +{boardState.parameters.bidIncrement}
                </span>
              </button>
              <button
                aria-busy={markSoldState === "loading"}
                className={
                  markSoldDisabled
                    ? "secondary-action secondary-action-disabled"
                    : "secondary-action"
                }
                data-testid="mark-sold"
                disabled={markSoldDisabled}
                onClick={onMarkSold}
                type="button"
              >
                <span>{markSoldState === "loading" ? "Marking Sold..." : "Mark Sold"}</span>
              </button>
              <button
                aria-busy={markUnsoldState === "loading"}
                aria-label="Mark Unsold"
                className={
                  markUnsoldDisabled
                    ? "secondary-action secondary-action-disabled"
                    : "secondary-action"
                }
                data-testid="mark-unsold"
                disabled={markUnsoldDisabled}
                onClick={onMarkUnsold}
                type="button"
              >
                <span>
                  {markUnsoldState === "loading" ? "Marking Unsold..." : "Mark Unsold"}
                </span>
              </button>
              <button
                aria-busy={undoState === "loading"}
                aria-label={
                  boardState.lastUndoAction
                    ? boardState.lastUndoAction.summary.startsWith("Undo")
                      ? boardState.lastUndoAction.summary
                      : `Undo: ${boardState.lastUndoAction.summary}`
                    : "Undo: No actions to undo."
                }
                className={
                  undoDisabled
                    ? "secondary-action secondary-action-disabled"
                    : "secondary-action"
                }
                data-testid="undo-action"
                disabled={undoDisabled}
                onClick={onUndo}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={18} />
                <span>{undoState === "loading" ? "Undoing..." : "Undo"}</span>
              </button>
            </section>
            </section>

            <div className="live-outcome-region" data-testid="live-outcome-region">
              <div className="selected-team-panel" data-testid="selected-team">
                <span className="status-label">Selected Team</span>
                <strong>
                  {selectTeamState === "loading"
                    ? "Selecting Team..."
                    : (selectedTeam?.name ??
                      (boardState.selectedTeamId !== null ? "Unknown Team" : "None"))}
                </strong>
                {selectedTeamCapacity &&
                !selectedTeamCapacity.canBuy &&
                markSoldBlockedReasons.length === 0 ? (
                  <ul>
                    {selectedTeamCapacity.reasons.map((reason, index) => (
                      <li data-testid="team-capacity-reason" key={`${reason}-${index}`}>
                        Blocked: {reason}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {boardState.selectedTeamId !== null ? (
                  <button
                    className="secondary-action"
                    data-testid="clear-selected-team"
                    disabled={!selectionEnabled}
                    onClick={() => onSelectTeam(null)}
                    type="button"
                  >
                    Clear selected Team
                  </button>
                ) : null}
              </div>

              {markSoldBlockedReasons.length > 0 ? (
                <div
                  aria-live="assertive"
                  className="blocked-reason-panel"
                  data-testid="mark-sold-blocked-reason"
                  role="alert"
                >
                  {markSoldBlockedReasons.map((reason, index) => (
                    <p key={`${reason}-${index}`}>{reason}</p>
                  ))}
                </div>
              ) : null}

              <p className="undo-summary" data-testid="undo-summary">
                {boardState.lastUndoAction?.summary ?? "No actions to undo."}
              </p>

              {revealNextError ? (
                <p className="command-error" role="alert">
                  <AlertCircle aria-hidden="true" size={18} />
                  <span>{revealNextError}</span>
                </p>
              ) : null}
              {selectTeamError ? (
                <p className="command-error" role="alert">
                  <AlertCircle aria-hidden="true" size={18} />
                  <span>{selectTeamError}</span>
                </p>
              ) : null}
              {increaseBidError ? (
                <p
                  className="command-error"
                  data-testid="increase-bid-error"
                  role="alert"
                >
                  <AlertCircle aria-hidden="true" size={18} />
                  <span>{increaseBidError}</span>
                </p>
              ) : null}
              {undoError ? (
                <p className="command-error" data-testid="undo-error" role="alert">
                  <AlertCircle aria-hidden="true" size={18} />
                  <span>{undoError}</span>
                </p>
              ) : null}
              {undoSummary ? (
                <p className="undo-success" data-testid="undo-success" role="status">
                  {undoSummary}
                </p>
              ) : null}
              {markSoldError ? (
                <p
                  className="command-error"
                  data-testid="mark-sold-error"
                  role="alert"
                >
                  <AlertCircle aria-hidden="true" size={18} />
                  <span>{markSoldError}</span>
                </p>
              ) : null}
              {markSoldSummary ? (
                <p
                  className="sale-summary"
                  data-testid="mark-sold-success"
                  role="status"
                >
                  {markSoldSummary}
                </p>
              ) : null}
              {markUnsoldError ? (
                <p
                  className="command-error"
                  data-testid="mark-unsold-error"
                  role="alert"
                >
                  <AlertCircle aria-hidden="true" size={18} />
                  <span>{markUnsoldError}</span>
                </p>
              ) : null}
              {markUnsoldSummary ? (
                <p
                  className="unsold-summary"
                  data-testid="mark-unsold-success"
                  role="status"
                >
                  {markUnsoldSummary}
                </p>
              ) : null}

              <p className="unsold-pool-summary" data-testid="unsold-pool-summary">
                Unsold (Phase 2 rebid): {boardState.phase2PoolCount}
              </p>

              {showPhase1Complete ? (
                <div className="phase1-complete-panel" data-testid="phase1-complete">
                  <p>Phase 1 complete.</p>
                  <button
                    className="secondary-action secondary-action-disabled start-unsold-bidding-preview"
                    data-testid="start-unsold-bidding-preview"
                    disabled
                    type="button"
                  >
                    Start Unsold Bidding will rebid {boardState.phase2PoolCount} unsold
                    {boardState.phase2PoolCount === 1 ? " player" : " players"}.
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <section
            aria-busy={selectTeamState === "loading"}
            className="team-board"
            aria-label="Initialized Teams"
            data-testid="team-matrix"
          >
            <div className="matrix-header">
              <div className="subsection-heading">
                <h3>Teams</h3>
                <span>{boardState.teams.length}</span>
              </div>
              {selectedTeam ? (
                <span className="selected-team-tag" title={`${selectedTeam.name} selected`}>
                  {selectedTeam.name} selected
                </span>
              ) : null}
            </div>
            <div className="team-board-grid">
            {boardState.teams.map((team) => {
              const isSelected = team.id === boardState.selectedTeamId;
              const capacity = team.currentPlayerCapacity;
              const soldRosterRows = getSoldRosterRowsForTeam(boardState, team.id);
              const displayRole =
                currentPlayer?.role ?? soldRosterRows.at(-1)?.role;
              const roleCount =
                displayRole === undefined
                  ? undefined
                  : team.roleCounts[displayRole];
              const roleTarget =
                displayRole === undefined
                  ? undefined
                  : boardState.parameters.roleTargets[displayRole];
              const roleCapacityLabel =
                roleCount === undefined || roleTarget === undefined
                  ? currentPlayer === null
                    ? "—"
                    : "Unknown"
                  : currentPlayer !== null && capacity && !capacity.canBuy
                    ? "Blocked"
                    : `${roleCount} of ${roleTarget}`;
              const capacityText =
                currentPlayer === null
                  ? soldRosterRows.length > 0
                    ? `${soldRosterRows.length} sold player(s) on squad`
                    : "Capacity pending Current Player"
                  : capacity
                    ? capacity.canBuy
                      ? `${roleCount ?? 0} of ${roleTarget ?? "?"} ${formatAuctionRoleLabel(currentPlayer.role)} slots available`
                      : capacity.reasons.join(" ")
                    : "Capacity pending Current Player";
              return (
                <article className="team-tile-shell" key={team.id}>
                <button
                  aria-label={`${team.name}, captain ${team.captain}, remaining budget ${team.remainingBudget}, squad ${team.squadCount}, ${capacityText}`}
                  aria-pressed={isSelected}
                  className={isSelected ? "team-tile team-tile-selected" : "team-tile"}
                  data-testid={isSelected ? "team-tile-selected" : "team-tile"}
                  disabled={!selectionEnabled}
                  onClick={() => onSelectTeam(team.id)}
                  type="button"
                >
                  <div className="team-tile-heading">
                    <TeamLogo
                      teamName={team.name}
                      {...(team.logoAssetId ? { logoAssetId: team.logoAssetId } : {})}
                    />
                    <span>
                      <strong>{team.name}</strong>
                      <span>{team.captain}</span>
                    </span>
                  </div>
                  <dl>
                    <div>
                      <dt>Remaining</dt>
                      <dd>{team.remainingBudget}</dd>
                    </div>
                    <div>
                      <dt>Squad</dt>
                      <dd>{team.squadCount}</dd>
                    </div>
                    <div>
                      <dt>{displayRole ? formatAuctionRoleLabel(displayRole) : "Role"}</dt>
                      <dd>{roleCapacityLabel}</dd>
                    </div>
                  </dl>
                  <span
                    className="team-capacity-text"
                    data-testid={
                      capacity && !capacity.canBuy
                        ? "team-tile-capacity-reason"
                        : undefined
                    }
                  >
                    {capacityText}
                  </span>
                </button>
                <button
                  aria-label={`View ${team.name} details`}
                  className="team-detail-trigger"
                  data-testid="team-detail-trigger"
                  onClick={(event) => handleOpenTeamDetail(team.id, event.currentTarget)}
                  type="button"
                >
                  <Info aria-hidden="true" size={18} />
                  <span>Details</span>
                </button>
                </article>
              );
            })}
          </div>
        </section>
        </div>
      </section>
      )}

      {detailTeamId ? (
        <TeamDetailDrawer
          boardState={boardState}
          onClose={() => setDetailTeamId(null)}
          teamId={detailTeamId}
          triggerRef={detailTriggerRef}
        />
      ) : null}
    </main>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root was not found.");
}

type RootElement = HTMLElement & {
  __auctionManagerRoot?: ReturnType<typeof createRoot>;
};

const rootElement = root as RootElement;
const reactRoot = rootElement.__auctionManagerRoot ?? createRoot(root);
rootElement.__auctionManagerRoot = reactRoot;
reactRoot.render(<App />);

async function readApiErrorMessage(
  response: Response,
  options: {
    fallback: string;
    serverUnavailable?: string;
  }
): Promise<string> {
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    return (
      options.serverUnavailable ??
      "Could not reach the auction server. Start it with `npm run dev:server`, then try again."
    );
  }

  const body = (await response.json().catch(() => null)) as { message?: string } | null;

  if (body?.message) {
    return body.message;
  }

  return options.fallback;
}

async function readUploadErrorMessage(response: Response): Promise<string> {
  if (response.status === 413) {
    return "Player CSV exceeds the 256 KB upload limit.";
  }

  if (response.status === 415) {
    return readApiErrorMessage(response, {
      fallback: "Upload the Player CSV as text/csv."
    });
  }

  if (response.status === 409) {
    return readApiErrorMessage(response, {
      fallback: "Setup is locked because the auction has started."
    });
  }

  return readApiErrorMessage(response, {
    fallback: "Player CSV could not be reviewed. Check the file and try again.",
    serverUnavailable:
      "Could not reach the auction server. Start it with `npm run dev:server`, then try again."
  });
}

async function readPhotoUploadErrorMessage(response: Response): Promise<string> {
  if (response.status === 409) {
    return "Import the Player CSV before uploading Player photos.";
  }

  if (response.status === 413) {
    return "A Player photo exceeds the 10 MB upload limit.";
  }

  if (response.status === 400 || response.status === 415) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    return body?.message ?? "Upload Player photos as JPEG, PNG, WebP, or HEIC files.";
  }

  return "Player photos could not be reviewed. Check the files and try again.";
}

async function readTeamUploadErrorMessage(response: Response): Promise<string> {
  if (response.status === 413) {
    return "Team CSV exceeds the 256 KB upload limit.";
  }

  if (response.status === 415) {
    return readApiErrorMessage(response, {
      fallback: "Upload the Team CSV as text/csv."
    });
  }

  if (response.status === 409) {
    return readApiErrorMessage(response, {
      fallback: "Setup is locked because the auction has started."
    });
  }

  return readApiErrorMessage(response, {
    fallback: "Team CSV could not be reviewed. Check the file and try again.",
    serverUnavailable:
      "Could not reach the auction server. Start it with `npm run dev:server`, then try again."
  });
}

async function readLogoUploadErrorMessage(response: Response): Promise<string> {
  if (response.status === 409) {
    return "Import the Team CSV before uploading Team logos.";
  }

  if (response.status === 413) {
    return "A Team logo exceeds the 10 MB upload limit.";
  }

  if (response.status === 400 || response.status === 415) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    return body?.message ?? "Upload Team logos as JPEG, PNG, WebP, or HEIC files.";
  }

  return "Team logos could not be reviewed. Check the files and try again.";
}

function readStartAuctionErrorMessage(
  response: Response,
  body: unknown
): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "primaryBlockerMessage" in body &&
    typeof body.primaryBlockerMessage === "string"
  ) {
    return body.primaryBlockerMessage;
  }

  if (response.status === 409) {
    return "Start Auction is blocked until setup is valid.";
  }

  return "Start Auction could not be completed. Try again.";
}

function readRevealNextErrorMessage(
  response: Response,
  body: unknown
): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  if (response.status === 409) {
    return "Reveal Next Player is blocked by the current auction state.";
  }

  return "Reveal Next Player could not be completed. Try again.";
}

function readSelectTeamErrorMessage(
  response: Response,
  body: unknown
): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  if (response.status === 409) {
    return "Select Team is blocked by the current auction state.";
  }

  return "Select Team could not be completed. Try again.";
}

function readIncreaseBidErrorMessage(
  response: Response,
  body: unknown
): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  if (response.status === 409) {
    return "Increase Bid is blocked by the current auction state.";
  }

  return "Increase Bid could not be completed. Try again.";
}

function readMarkSoldErrorMessage(response: Response, body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  if (response.status === 409) {
    return "Mark Sold is blocked by the current auction state.";
  }

  return "Mark Sold could not be completed. Try again.";
}

function readMarkUnsoldErrorMessage(response: Response, body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  if (response.status === 409) {
    return "Mark Unsold is blocked by the current auction state.";
  }

  return "Mark Unsold could not be completed. Try again.";
}

function readUndoErrorMessage(response: Response, body: unknown): string {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  if (response.status === 409) {
    return "Undo is blocked by the current auction state.";
  }

  return "Undo could not be completed. Try again.";
}

function formatPhaseLabel(phase: string): string {
  return phase.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatCommandLabel(command: string | null): string {
  if (!command) {
    return "Unknown";
  }

  return command.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function createClientCommandId(
  command:
    | "start"
    | "reveal"
    | "select"
    | "increase"
    | "mark-sold"
    | "mark-unsold"
    | "undo"
): string {
  if ("crypto" in window && "randomUUID" in window.crypto) {
    return `${command}_${window.crypto.randomUUID()}`;
  }

  return `${command}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function mergeIssueGroups(
  csvGroups: PlayerCsvImportReviewResponse["issueGroups"] | undefined,
  photoGroups: PlayerPhotoReviewResponse["issueGroups"] | undefined,
  teamCsvGroups: TeamCsvImportReviewResponse["issueGroups"] | undefined,
  logoGroups: TeamLogoReviewResponse["issueGroups"] | undefined
): PlayerCsvImportReviewResponse["issueGroups"] {
  const sourceCsvGroups = csvGroups ?? emptyIssueGroups;
  const sourcePhotoGroups = photoGroups ?? emptyIssueGroups;
  const sourceTeamCsvGroups = teamCsvGroups ?? emptyIssueGroups;
  const sourceLogoGroups = logoGroups ?? emptyIssueGroups;

  return emptyIssueGroups.map((emptyGroup) => {
    const csvGroup = sourceCsvGroups.find((group) => group.severity === emptyGroup.severity) ?? emptyGroup;
    const photoGroup =
      sourcePhotoGroups.find((group) => group.severity === emptyGroup.severity) ?? emptyGroup;
    const teamCsvGroup =
      sourceTeamCsvGroups.find((group) => group.severity === emptyGroup.severity) ?? emptyGroup;
    const logoGroup =
      sourceLogoGroups.find((group) => group.severity === emptyGroup.severity) ?? emptyGroup;
    const issues = [
      ...csvGroup.issues,
      ...photoGroup.issues,
      ...teamCsvGroup.issues,
      ...logoGroup.issues
    ];

    return {
      severity: emptyGroup.severity,
      count: issues.length,
      issues
    };
  });
}
