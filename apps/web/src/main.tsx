import { createRoot } from "react-dom/client";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  CheckCircle2,
  Circle,
  FileWarning,
  ListChecks,
  MonitorDot,
  PlayCircle,
  Upload
} from "lucide-react";
import {
  playerCsvImportReviewResponseSchema,
  playerPhotoReviewResponseSchema,
  teamCsvImportReviewResponseSchema,
  teamLogoReviewResponseSchema,
  type ImportIssueSeverity,
  type PlayerCsvImportReviewResponse,
  type PlayerPhotoReviewResponse,
  type TeamCsvImportReviewResponse,
  type TeamLogoReviewResponse
} from "@auction-manager/shared";
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

function App() {
  const uploadGenerationRef = useRef(0);
  const photoUploadGenerationRef = useRef(0);
  const teamUploadGenerationRef = useRef(0);
  const logoUploadGenerationRef = useRef(0);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedPhotoFileNames, setSelectedPhotoFileNames] = useState<string[]>([]);
  const [selectedTeamFileName, setSelectedTeamFileName] = useState<string | null>(null);
  const [selectedLogoFileNames, setSelectedLogoFileNames] = useState<string[]>([]);
  const [review, setReview] = useState<PlayerCsvImportReviewResponse | null>(null);
  const [photoReview, setPhotoReview] = useState<PlayerPhotoReviewResponse | null>(null);
  const [teamReview, setTeamReview] = useState<TeamCsvImportReviewResponse | null>(null);
  const [logoReview, setLogoReview] = useState<TeamLogoReviewResponse | null>(null);
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
  const blockerText = useMemo(() => {
    if (!review) {
      return "Blocked: Player CSV must be imported before Start Auction.";
    }

    if (review.summary.startAuctionBlocked) {
      if (review.summary.mustFixCount > 0) {
        const issueLabel = review.summary.mustFixCount === 1 ? "issue" : "issues";
        return `Blocked: ${review.summary.mustFixCount} Player CSV ${issueLabel} must be fixed in the source CSV and reimported.`;
      }

      return "Blocked: Player CSV must include at least one valid Player row.";
    }

    if (!teamReview) {
      return "Blocked: Team CSV must be imported before Start Auction.";
    }

    if (teamReview.summary.startAuctionBlocked) {
      if (teamReview.summary.mustFixCount > 0) {
        const issueLabel = teamReview.summary.mustFixCount === 1 ? "issue" : "issues";
        return `Blocked: ${teamReview.summary.mustFixCount} Team CSV ${issueLabel} must be fixed in the source CSV and reimported.`;
      }

      return "Blocked: Team CSV must include at least one valid Team row.";
    }

    return "Start Auction stays disabled until auction parameters are added in the next setup step.";
  }, [review, teamReview]);

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
      setUploadState("ready");
    } catch {
      if (uploadGeneration !== uploadGenerationRef.current) {
        return;
      }

      setReview(previousReview);
      setPhotoReview(previousPhotoReview);
      setUploadState("error");
      setUploadError("Player CSV could not be reviewed. Check the file and try again.");
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
      setTeamUploadState("ready");
    } catch {
      if (uploadGeneration !== teamUploadGenerationRef.current) {
        return;
      }

      setTeamReview(previousTeamReview);
      setLogoReview(previousLogoReview);
      setTeamUploadState("error");
      setTeamUploadError("Team CSV could not be reviewed. Check the file and try again.");
    } finally {
      event.currentTarget.value = "";
    }
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

  return (
    <main className="app-shell" data-testid="app-shell">
      <header className="app-header" aria-labelledby="app-title">
        <div>
          <p className="eyebrow">Local event console</p>
          <h1 id="app-title">Auction Manager</h1>
        </div>
        <div className="runtime-pill" aria-label="Runtime mode">
          <MonitorDot aria-hidden="true" size={18} />
          <span>Runs locally on this event PC</span>
        </div>
      </header>

      <section className="status-grid" aria-label="Setup status">
        <article>
          <span className="status-label">Current phase</span>
          <strong>Setup</strong>
          <span>Ready to prepare event inputs.</span>
        </article>
        <article>
          <span className="status-label">Auction state</span>
          <strong>No active auction</strong>
          <span>Nothing is started, sold, assigned, or persisted yet.</span>
        </article>
        <article>
          <span className="status-label">Server target</span>
          <strong>127.0.0.1</strong>
          <span>Same-machine operation with no cloud service required.</span>
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
          <p className="eyebrow">Setup empty state</p>
          <h2>No auction is loaded</h2>
          <p>
            Start setup when the event PC is ready. This shell is prepared for
            local files and future resume checks without creating auction state
            in the browser.
          </p>
        </div>
        <div className="setup-actions" aria-label="Setup actions">
          <button className="primary-action" data-testid="setup-start" type="button">
            <PlayCircle aria-hidden="true" size={20} />
            <span>Start setup</span>
          </button>
          <p>Resume-ready framing is visible before any import, bidding, or persistence work.</p>
        </div>
      </section>

      <section
        className="setup-player-csv"
        data-testid="setup-player-csv"
        aria-labelledby="player-csv-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Setup checklist</p>
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
            <span>
              {uploadState === "loading"
                ? "Reviewing Player CSV..."
                : uploadState === "error"
                  ? "Upload failed. Fix the file or try again."
                  : "Source fixes stay in the CSV, then reimport."}
            </span>
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
            <p className="eyebrow">Setup checklist</p>
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
            <span>
              {photoUploadDisabled
                ? "Import a valid Player CSV before adding photos."
                : photoUploadState === "loading"
                  ? "Reviewing Player photos..."
                  : photoUploadState === "error"
                    ? "Photo upload failed. Fix the files or try again."
                    : "JPEG, PNG, WebP, and HEIC files are accepted where this event PC can decode them."}
            </span>
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
          <article className="neutral-summary">
            <span className="status-label">Auction readiness</span>
            <strong>Photos are non-blocking</strong>
            <span>Start Auction is not blocked by missing photos.</span>
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
            <p className="eyebrow">Setup checklist</p>
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
            <span>
              {teamUploadState === "loading"
                ? "Reviewing Team CSV..."
                : teamUploadState === "error"
                  ? "Upload failed. Fix the file or try again."
                  : "Team and Captain fixes stay in the CSV, then reimport."}
            </span>
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
            <p className="eyebrow">Setup checklist</p>
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
            <span>
              {logoUploadDisabled
                ? "Import a valid Team CSV before adding logos."
                : logoUploadState === "loading"
                  ? "Reviewing Team logos..."
                  : logoUploadState === "error"
                    ? "Logo upload failed. Fix the files or try again."
                    : "JPEG, PNG, WebP, and HEIC files are accepted where this event PC can decode them."}
            </span>
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
          <article className="neutral-summary">
            <span className="status-label">Auction readiness</span>
            <strong>Logos are non-blocking</strong>
            <span>Start Auction is not blocked by missing logos.</span>
          </article>
        </div>
      </section>

      <div className="start-auction-row">
        <p data-testid="start-auction-blocker">{blockerText}</p>
        <button
          className="primary-action primary-action-disabled"
          data-testid="setup-start-auction"
          disabled
          type="button"
        >
          <PlayCircle aria-hidden="true" size={20} />
          <span>Start Auction</span>
        </button>
      </div>
    </main>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root was not found.");
}

createRoot(root).render(<App />);

async function readUploadErrorMessage(response: Response): Promise<string> {
  if (response.status === 413) {
    return "Player CSV exceeds the 256 KB upload limit.";
  }

  if (response.status === 415) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    return body?.message ?? "Upload the Player CSV as text/csv.";
  }

  return "Player CSV could not be reviewed. Check the file and try again.";
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
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    return body?.message ?? "Upload the Team CSV as text/csv.";
  }

  return "Team CSV could not be reviewed. Check the file and try again.";
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
