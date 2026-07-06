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
  type ImportIssueSeverity,
  type PlayerCsvImportReviewResponse
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
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [review, setReview] = useState<PlayerCsvImportReviewResponse | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const issueGroups = review?.issueGroups ?? emptyIssueGroups;
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

    return "Start Auction stays disabled until Team CSV and auction parameters are added in later setup steps.";
  }, [review]);

  async function handlePlayerCsvChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    const previousReview = review;
    const uploadGeneration = ++uploadGenerationRef.current;

    setSelectedFileName(file.name);
    setReview(null);
    setUploadError(null);
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
        setUploadState("error");
        setUploadError(await readUploadErrorMessage(response));
        return;
      }

      const parsedReview = playerCsvImportReviewResponseSchema.safeParse(
        await response.json()
      );

      if (!parsedReview.success) {
        setReview(previousReview);
        setUploadState("error");
        setUploadError("Player CSV preview returned an unexpected response. Try again.");
        return;
      }

      setReview(parsedReview.data);
      setUploadState("ready");
    } catch {
      if (uploadGeneration !== uploadGenerationRef.current) {
        return;
      }

      setReview(previousReview);
      setUploadState("error");
      setUploadError("Player CSV could not be reviewed. Check the file and try again.");
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
      </section>
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
