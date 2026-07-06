---
title: Sprint Change Proposal
project: auction_manager
date: 2026-07-06
status: approved-applied
source_report: _bmad-output/planning-artifacts/implementation-readiness-report-2026-07-06.md
related_prior_proposal: _bmad-output/planning-artifacts/sprint-change-proposal-2026-07-06.md
mode: batch
approved_by: Udeet
approved_date: 2026-07-06
applied_artifacts:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/implementation-artifacts/release-gate-evidence-checklist-2026-07-06.md
---

# Sprint Change Proposal - Readiness Follow-Up

## 1. Issue Summary

The latest implementation readiness report dated 2026-07-06 rates the planning set as **NEEDS WORK** before Phase 4 implementation. The report found no critical blockers, full PRD Functional Requirement coverage, and strong PRD/UX/architecture alignment. The change trigger is story-planning ambiguity, not product scope failure.

Immediate remediation is needed in two areas:

1. Story 2.5 requires invalid `Mark Sold` behavior before Story 2.6 introduces the successful `Mark Sold` behavior.
2. Story 4.5 combines event-mode runtime implementation, representative rehearsal, privacy inspection, final release evidence, and second-agent audit into one oversized story.

The report also identifies minor cleanup:

- Story 4.1 should explicitly own only dangerous-operation placement, modal shells, cancellation, accessibility, and non-mutation; Stories 4.2 and 4.3 should own Reset/Close command execution.
- Persistence-bearing stories should name their table, field, index, snapshot, action-log, and migration ownership.
- Story Dev Gates and Review/Test Gates should stay, but implementation story files should tailor them to the exact commands, routes, schemas, UI states, privacy projections, and E2E risks in scope.
- Product-owner acceptance should be explicit for UX-driven scope that is stronger than the PRD wording, including Board/Rosters, Team detail drawer, final roster display, keyboard behavior, accessibility floor, responsive profiles, and local command response behavior.

## 2. Impact Analysis

### Epic Impact

Epic 1 remains valid. No direct epic-level changes are needed.

Epic 2 remains valid, but Story 2.5 and Story 2.6 need a clearer implementation boundary. No epic resequencing is required if Story 2.5 explicitly owns the rejected `Mark Sold` path and Story 2.6 owns the accepted path using the same command contract.

Epic 3 remains valid. No direct change is needed.

Epic 4 remains valid, but Story 4.1 and Story 4.5 need refinement. Story 4.1 should be scoped to non-mutating dangerous-control UX. Story 4.5 should become a focused event-mode runtime story, with final rehearsal and release evidence moved to a separate release-gate artifact.

### Story Impact

Affected stories:

- Story 2.5: add explicit rejected-path ownership for `MarkSold`.
- Story 2.6: add explicit accepted-path ownership for `MarkSold`.
- Story 4.1: clarify non-mutating dangerous-control boundary.
- Story 4.5: rewrite as focused event-mode runtime startup verification.
- Persistence-bearing implementation stories: add exact persistence ownership in story files as they are created or updated.

### PRD Impact

No PRD change is required. MVP scope remains achievable and FR-1 through FR-22 remain covered.

### Architecture Impact

No architecture spine change is required. Existing architecture decisions already support the correction:

- AD-4 covers command-oriented HTTP.
- AD-5 covers atomic SQLite persistence.
- AD-6 covers action-log based Undo and Reset/Close exclusion.
- AD-10 covers event-mode operations.
- AD-11 covers architectural test invariants.
- AD-12 covers correctness-first delivery order.

### UX Impact

No UX redesign is required. The UX additions are aligned with architecture and epics. Product-owner acceptance should be recorded so the stronger UX scope is treated as intentional implementation scope rather than accidental expansion.

## 3. Recommended Approach

Recommended path: **Direct Adjustment**.

Rationale:

- Requirements coverage is complete.
- There is no architecture conflict.
- There is no implementation rollback because implementation has not depended on these stories yet.
- The ambiguity can be removed through focused story text changes.
- Keeping story IDs stable avoids unnecessary backlog churn.

Effort estimate: Low.

Risk level: Low.

Timeline impact: Small, but the changes should be made before creating Phase 4 implementation story files.

Scope classification: Moderate, because backlog coordination is needed, but product scope and architecture remain stable.

## 4. Checklist Results

| Checklist Item | Status | Finding |
| --- | --- | --- |
| 1.1 Triggering story | N/A | Trigger came from readiness assessment, not an implementation story failure. |
| 1.2 Core problem | Done | Story boundary ambiguity and release-gate sizing issue. |
| 1.3 Evidence | Done | Evidence confirmed in the readiness report and current `epics.md`. |
| 2.1 Current epic impact | Done | Epic 2 can still proceed after Story 2.5/2.6 boundary cleanup. |
| 2.2 Epic-level changes | Done | No epic scope change needed. |
| 2.3 Remaining epics | Done | Epic 4 needs Story 4.1/4.5 cleanup; Epic 3 unaffected. |
| 2.4 New or obsolete epics | Done | No new or obsolete epics. |
| 2.5 Epic order | Done | No resequencing required if ownership boundaries are made explicit. |
| 3.1 PRD conflict | Done | No PRD conflict. |
| 3.2 Architecture conflict | Done | No architecture conflict. |
| 3.3 UX conflict | Done | No UX contradiction; PO acceptance of stronger UX scope should be recorded. |
| 3.4 Other artifacts | Done | Updated `epics.md`; updated the existing release-gate evidence checklist artifact. |
| 4.1 Direct adjustment | Viable | Best path. |
| 4.2 Rollback | Not viable | No completed implementation needs rollback. |
| 4.3 MVP review | Not viable | MVP remains valid. |
| 4.4 Path selected | Done | Direct Adjustment. |
| 5.1 Issue summary | Done | Included here. |
| 5.2 Artifact adjustment needs | Done | Included here. |
| 5.3 Recommendation | Done | Included here. |
| 5.4 MVP impact | Done | No MVP scope reduction. |
| 5.5 Handoff plan | Done | PO/Developer backlog cleanup, then Developer implementation. |
| 6.1 Checklist review | Done | Applicable items addressed. |
| 6.2 Proposal accuracy | Done | Grounded in latest readiness report and current planning artifacts. |
| 6.3 User approval | Done | Approved by Udeet on 2026-07-06 by selecting Continue. |
| 6.4 sprint-status update | N/A | No sprint-status YAML found. |
| 6.5 Handoff confirmation | Done | Routed to Product Owner / Developer backlog cleanup, then Developer implementation. |

## 5. Detailed Change Proposals

### Proposal A - Clarify Story 2.5 rejected MarkSold ownership

Story: 2.5 Block Invalid Sales With Clear Reasons

Section: Acceptance Criteria / implementation boundary

OLD:

```text
### Story 2.5: Block Invalid Sales With Clear Reasons
```

NEW:

```text
### Story 2.5: Block Invalid Sales With Clear Reasons

Implementation boundary: this story introduces the sale-validity rules and the rejected
`MarkSold` command path only. It may define the shared `MarkSold` command contract,
request schema, conflict response shape, and UI blocked-state behavior, but it must not
complete successful sale mutation. Story 2.6 implements the accepted `MarkSold` path
using this same contract.
```

Rationale:

This preserves story order while removing the forward-dependency ambiguity. Story 2.5 can prove invalid-sale non-mutation without pretending the successful sale path is already complete.

### Proposal B - Clarify Story 2.6 accepted MarkSold ownership

Story: 2.6 Mark Player Sold and Update Team State

Section: Acceptance Criteria

OLD:

```text
Given a Current Player is revealed, a Team is selected, and no hard-block rule is violated
When the operator selects Mark Sold
Then the Player status becomes Sold
And the Player records Sold Price and winning Team.
```

NEW:

```text
Given the `MarkSold` command contract and invalid-sale rejection rules from Story 2.5 exist
And a Current Player is revealed, a Team is selected, and no hard-block rule is violated
When the operator selects Mark Sold
Then the accepted `MarkSold` path records the Player as Sold
And the Player records Sold Price and winning Team using the same command, schema, and route contract introduced for rejected sales.
```

Rationale:

This makes Story 2.6 the completion of the same command slice rather than a separate competing interpretation of sale behavior.

### Proposal C - Clarify Story 4.1 non-mutating dangerous-control scope

Story: 4.1 Separate Dangerous Operations From Live Controls

Section: Acceptance Criteria / implementation boundary

OLD:

```text
### Story 4.1: Separate Dangerous Operations From Live Controls
```

NEW:

```text
### Story 4.1: Separate Dangerous Operations From Live Controls

Implementation boundary: this story owns separated dangerous-operation navigation,
confirmation modal shells, cancellation behavior, accessibility, focus management,
and proof that opening or cancelling these controls does not mutate auction state.
Stories 4.2 and 4.3 own Reset Auction and Close Auction command execution,
persistence, Undo exclusion, and committed authoritative state changes.
```

Rationale:

This prevents Story 4.1 from being read as an early Reset/Close implementation story.

### Proposal D - Rewrite Story 4.5 as focused event-mode runtime story

Story: 4.5 Verify Event-Mode Runtime and Rehearsal Flow

Section: Entire story

OLD:

```text
### Story 4.5: Verify Event-Mode Runtime and Rehearsal Flow

As an event organizer,
I want the event-mode runtime and representative rehearsal flow verified on local event-style data,
So that the app can run from one local process and exercise the critical auction flow before final release approval.
```

NEW:

```text
### Story 4.5: Run Event Mode Locally

As an event organizer,
I want the built app to run from one local event-mode process,
So that the event PC can serve the auction UI, API, assets, SQLite state, health endpoint, and snapshots without internet or extra runtime services.

Acceptance Criteria:

Given the app is built for event mode
When the event-mode process starts
Then one Fastify process serves the built React app, `/api/*`, `/assets/*`, `/api/health`, SQLite state, normalized assets, and snapshots from `127.0.0.1` by default
And no cloud service, hosted database, Docker runtime, account system, public deployment, or manual asset hosting is required.

Given event-mode startup runs
When startup checks execute
Then Node version, data directory writability, database open status, configured asset paths, host binding, and required runtime config are validated before live commands are enabled
And failures produce a clear local startup error instead of enabling partial live operation.

Given event mode is running
When the operator opens the local URL
Then the app loads the Resume / Start surface or current authoritative auction state
And same-origin API requests, static app assets, uploaded/normalized assets, and the health endpoint are reachable from that process.

Given a developer finishes this story
When they run the story's Dev Gate
Then build, typecheck, event-mode startup tests, health/static/API smoke tests, local SQLite/data-directory startup checks, and a Playwright event-mode smoke test pass.

Given the dev agent marks the story complete
When a second agent reviews it
Then the reviewer reruns or audits event-mode startup, local-only operation, startup failure behavior, smoke evidence, and relevant tests, raises findings, and sends blocking issues back for iteration.
```

Rationale:

This makes Story 4.5 a normal implementable runtime story. Full rehearsal, privacy audit, P0/P1 evidence, and final release approval remain important, but they should be tracked as a release-gate artifact, not hidden inside a product implementation story.

### Proposal E - Add separate release-gate evidence artifact

Artifact: implementation artifacts, release-gate checklist

ADD:

```text
Create a release-gate evidence artifact before final event approval.

The artifact should record:
- representative Player CSV, Player photos, Team CSV, Team logos, and auction parameters used for rehearsal;
- setup import results and placeholder-compatible media behavior;
- Phase 1 sale, invalid sale block, undo after sale, Phase 2 unsold bidding, Phase 3 manual assignment, Team rosters, Close Auction, and restart/resume evidence;
- privacy inspection of board DTOs, roster DTOs, rendered UI, logs, and snapshots;
- viewport evidence for 1440x900, 1366x768, 1920x1080, and 390x844;
- local command-response observations under event-machine conditions;
- P0/P1 pass rates and accepted triage;
- second-agent review/test evidence.
```

Rationale:

Release evidence should remain visible and auditable without making Story 4.5 a catch-all for the entire product's completion.

### Proposal F - Add persistence ownership requirement to story files

Artifact: implementation story files generated from `epics.md`

ADD:

```text
For every story that introduces or changes persistence, include a Persistence Ownership note naming:
- tables introduced or changed;
- fields introduced or changed;
- indexes or constraints introduced or changed;
- action-log payload fields introduced or changed;
- snapshot fields introduced or changed;
- migration or schema-version behavior;
- resume/reconstruction tests required for that change.
```

Rationale:

This prevents early stories from overbuilding the full database and prevents later stories from adding persistence semantics without explicit testable ownership.

### Proposal G - Record acceptance of stronger UX scope

Artifact: `epics.md` or implementation handoff note

ADD:

```text
Product-owner acceptance note: the following UX-driven scope is intentional for v1 implementation because it is adopted by UX, architecture, and epics even where the PRD states the need more lightly: Board/Rosters switch, all-Team roster surface, final closed-auction roster display, Team detail drawer, keyboard behavior, WCAG 2.2 AA accessibility target, responsive acceptance profiles, and local command-response rehearsal evidence.
```

Rationale:

This avoids later treating aligned UX scope as accidental scope creep.

## 6. Implementation Handoff

Scope classification: **Moderate**.

Route to:

- Product Owner / backlog steward: approve the story-boundary decisions and UX acceptance note.
- Developer agent: update `epics.md` after approval, then use the corrected story text when creating implementation story files.
- Test/review agent: verify that implementation story files include tailored Dev Gates, Review/Test Gates, persistence ownership notes where relevant, and release-gate evidence separation.

Success criteria:

- Story 2.5 clearly owns rejected `MarkSold` behavior only.
- Story 2.6 clearly owns accepted `MarkSold` behavior using the same command contract.
- Story 4.1 clearly owns only non-mutating dangerous-control UX.
- Story 4.5 is a focused event-mode runtime story.
- Release rehearsal and final evidence are tracked outside the normal story sequence.
- Persistence-bearing story files name concrete schema, action-log, snapshot, migration, and resume ownership.
- UX-driven scope acceptance is recorded before implementation story execution.

## 7. Approval And Application

Approved by Udeet on 2026-07-06 by selecting Continue.

Applied artifacts:

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/release-gate-evidence-checklist-2026-07-06.md`
