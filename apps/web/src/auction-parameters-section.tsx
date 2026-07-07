import { CheckCircle2, FileWarning, ListChecks } from "lucide-react";
import {
  auctionRoleValues,
  phase1CategoryValues,
  type AuctionParameterReviewParameters,
  type AuctionParameterValidationIssue
} from "@auction-manager/shared";
import {
  formatRoleMap,
  getParameterIssuesForField,
  type ParameterNumberFields
} from "./auction-parameters-helpers.js";

export type AuctionParametersSectionProps = {
  readonly parameterDraft: AuctionParameterReviewParameters | null;
  readonly numberFields: ParameterNumberFields;
  readonly phase1OrderText: string;
  readonly parameterBlockingReasons: readonly AuctionParameterValidationIssue[];
  readonly parameterLoadState: "loading" | "ready" | "error";
  readonly parameterSaveState: "idle" | "loading" | "ready" | "error";
  readonly parameterSaveError: string | null;
  readonly phase1OrderError: string | null;
  readonly onRoleBasePriceChange: (role: (typeof auctionRoleValues)[number], value: string) => void;
  readonly onRoleTargetChange: (role: (typeof auctionRoleValues)[number], value: string) => void;
  readonly onBidIncrementChange: (value: string) => void;
  readonly onTeamBudgetChange: (value: string) => void;
  readonly onMaxSquadSizeChange: (value: string) => void;
  readonly onPhase1OrderChange: (value: string) => void;
  readonly onManualAssignmentBehaviorChange: (value: string) => void;
  readonly onSave: () => void;
};

export function AuctionParametersSection({
  parameterDraft,
  numberFields,
  phase1OrderText,
  parameterBlockingReasons,
  parameterLoadState,
  parameterSaveState,
  parameterSaveError,
  phase1OrderError,
  onRoleBasePriceChange,
  onRoleTargetChange,
  onBidIncrementChange,
  onTeamBudgetChange,
  onMaxSquadSizeChange,
  onPhase1OrderChange,
  onManualAssignmentBehaviorChange,
  onSave
}: AuctionParametersSectionProps) {
  const parametersValid =
    parameterLoadState === "ready" && parameterBlockingReasons.length === 0;

  return (
    <section
      className="setup-auction-parameters"
      data-testid="setup-auction-parameters"
      aria-labelledby="auction-parameters-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Setup checklist</p>
          <h2 id="auction-parameters-title">Auction Parameters</h2>
        </div>
        <span
          className={
            parametersValid
              ? "review-state review-state-ready"
              : "review-state review-state-warning"
          }
        >
          <ListChecks aria-hidden="true" size={18} />
          {parameterLoadState === "loading"
            ? "Loading parameters"
            : parameterLoadState === "error"
              ? "Parameters unavailable"
              : parametersValid
                ? "Parameters valid"
                : "Parameters need fixes"}
        </span>
      </div>

      {parameterLoadState === "error" ? (
        <div className="csv-error parameter-errors" role="alert">
          <FileWarning aria-hidden="true" size={18} />
          <div>
            <strong>Auction Parameters could not be loaded from the server.</strong>
          </div>
        </div>
      ) : null}

      {parameterDraft ? (
        <>
          <div className="parameter-editor">
            <section aria-labelledby="role-base-prices-title">
              <div className="subsection-heading">
                <h3 id="role-base-prices-title">Role Base Prices</h3>
                <span>{auctionRoleValues.length}</span>
              </div>
              <div className="parameter-grid">
                {auctionRoleValues.map((role) => {
                  const fieldIssues = getParameterIssuesForField(
                    parameterBlockingReasons,
                    `roleBasePrices.${role}`
                  );
                  return (
                    <label className="parameter-field" key={`base-${role}`}>
                      <span>{role}</span>
                      <input
                        aria-invalid={fieldIssues.length > 0}
                        data-testid={`role-base-price-${role}`}
                        min="0"
                        onChange={(event) => onRoleBasePriceChange(role, event.target.value)}
                        type="number"
                        value={numberFields.roleBasePrices[role]}
                      />
                      {fieldIssues[0] ? (
                        <span className="field-error" role="alert">
                          {fieldIssues[0].message}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="auction-values-title">
              <div className="subsection-heading">
                <h3 id="auction-values-title">Auction Values</h3>
                <span>3</span>
              </div>
              <div className="parameter-grid">
                {(
                  [
                    ["bidIncrement", "Bid Increment", "bid-increment-input", onBidIncrementChange],
                    ["teamBudget", "Team Budget", "team-budget-input", onTeamBudgetChange],
                    ["maxSquadSize", "Max Squad Size", "max-squad-size-input", onMaxSquadSizeChange]
                  ] as const
                ).map(([field, label, testId, onChange]) => {
                  const fieldIssues = getParameterIssuesForField(
                    parameterBlockingReasons,
                    field
                  );
                  return (
                    <label className="parameter-field" key={field}>
                      <span>{label}</span>
                      <input
                        aria-invalid={fieldIssues.length > 0}
                        data-testid={testId}
                        min="0"
                        onChange={(event) => onChange(event.target.value)}
                        type="number"
                        value={numberFields[field]}
                      />
                      {fieldIssues[0] ? (
                        <span className="field-error" role="alert">
                          {fieldIssues[0].message}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="role-targets-title">
              <div className="subsection-heading">
                <h3 id="role-targets-title">Role Targets</h3>
                <span>{auctionRoleValues.length}</span>
              </div>
              <div className="parameter-grid">
                {auctionRoleValues.map((role) => {
                  const fieldIssues = getParameterIssuesForField(
                    parameterBlockingReasons,
                    `roleTargets.${role}`
                  ).concat(getParameterIssuesForField(parameterBlockingReasons, "roleTargets"));
                  return (
                    <label className="parameter-field" key={`target-${role}`}>
                      <span>{role}</span>
                      <input
                        aria-invalid={fieldIssues.length > 0}
                        data-testid={`role-target-${role}`}
                        min="0"
                        onChange={(event) => onRoleTargetChange(role, event.target.value)}
                        type="number"
                        value={numberFields.roleTargets[role]}
                      />
                      {fieldIssues[0] ? (
                        <span className="field-error" role="alert">
                          {fieldIssues[0].message}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="phase-order-title">
              <div className="subsection-heading">
                <h3 id="phase-order-title">Phase 1 Category Order</h3>
                <span>{phase1CategoryValues.length}</span>
              </div>
              <label className="parameter-field parameter-field-wide">
                <span>Order</span>
                <input
                  aria-invalid={Boolean(phase1OrderError)}
                  data-testid="phase1-category-order"
                  onChange={(event) => onPhase1OrderChange(event.target.value)}
                  type="text"
                  value={phase1OrderText}
                />
                {phase1OrderError ? (
                  <span className="field-error" role="alert">
                    {phase1OrderError}
                  </span>
                ) : null}
              </label>
            </section>

            <section aria-labelledby="manual-assignment-title">
              <div className="subsection-heading">
                <h3 id="manual-assignment-title">Manual Assignment</h3>
                <span>1</span>
              </div>
              <label className="parameter-field parameter-field-wide">
                <span>Budget Behavior</span>
                <select
                  data-testid="manual-assignment-budget-behavior"
                  onChange={(event) => onManualAssignmentBehaviorChange(event.target.value)}
                  value={parameterDraft.manualAssignmentBudgetBehavior}
                >
                  <option value="NoBudgetImpact">NoBudgetImpact</option>
                </select>
              </label>
            </section>
          </div>

          {parameterSaveError ? (
            <div className="csv-error parameter-errors" role="alert">
              <FileWarning aria-hidden="true" size={18} />
              <div>
                <strong>{parameterSaveError}</strong>
                {parameterBlockingReasons.length ? (
                  <ul>
                    {parameterBlockingReasons.map((issue) => (
                      <li key={issue.id}>{issue.message}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ) : null}

          <div
            className="auction-parameters-summary"
            data-testid="auction-parameters-summary"
          >
            <article>
              <span className="status-label">Role prices</span>
              <strong>{formatRoleMap(parameterDraft.roleBasePrices)}</strong>
            </article>
            <article>
              <span className="status-label">Bid and budget</span>
              <strong>
                Increment {parameterDraft.bidIncrement}; Team budget {parameterDraft.teamBudget}
              </strong>
            </article>
            <article>
              <span className="status-label">Squad and roles</span>
              <strong>
                Cap {parameterDraft.maxSquadSize}; {formatRoleMap(parameterDraft.roleTargets)}
              </strong>
            </article>
            <article>
              <span className="status-label">Phase 1 order</span>
              <strong>{phase1OrderText}</strong>
            </article>
            <article>
              <span className="status-label">Manual assignment</span>
              <strong>{parameterDraft.manualAssignmentBudgetBehavior}</strong>
            </article>
          </div>

          <div className="parameter-actions">
            <button
              className="primary-action"
              data-testid="auction-parameters-save"
              disabled={parameterSaveState === "loading" || parameterLoadState !== "ready"}
              onClick={onSave}
              type="button"
            >
              <CheckCircle2 aria-hidden="true" size={20} />
              <span>{parameterSaveState === "loading" ? "Saving" : "Save Parameters"}</span>
            </button>
            <p aria-live="polite">
              {parameterSaveState === "ready"
                ? "Auction Parameters saved."
                : parameterBlockingReasons[0]?.message ??
                  "Defaults are prefilled and may be saved as-is."}
            </p>
          </div>
        </>
      ) : null}
    </section>
  );
}
