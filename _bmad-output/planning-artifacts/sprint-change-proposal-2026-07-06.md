---
title: Sprint Change Proposal
project: auction_manager
date: 2026-07-06
status: approved-applied
source_report: _bmad-output/planning-artifacts/implementation-readiness-report-2026-07-06.md
mode: batch
approved_by: Udeet
approved_date: 2026-07-06
---

# Sprint Change Proposal - Implementation Readiness Cleanup

## 1. Issue Summary

The implementation readiness report dated 2026-07-06 found that the planning package is close to implementation-ready, with full PRD functional requirement coverage and no PRD/architecture/UX contradictions. The trigger is backlog quality, not product scope failure.

Two major issues should be corrected before Phase 4 implementation starts:

1. Early setup stories contain acceptance criteria that depend on future live-board behavior.
2. Story 4.5 combines implementation work, full rehearsal, release evidence, privacy audit, P0/P1 gates, risk evidence, and second-agent audit into one oversized release-gate story.

Supporting evidence:

- Story 1.2 asks a setup import story to prove board/live DTO privacy before the live DTO surface exists.
- Story 1.3 asks a photo matching setup story to prove future live-board placeholder rendering.
- Story 1.4 asks a team import setup story to prove future live-board placeholder logo rendering.
- Story 4.5 reads as a full release gate rather than a clean implementation slice.

The readiness report also identified smaller cleanup items:

- UX files are still marked `draft` while PRD and architecture are marked `final`.
- Local verification scripts or CI-equivalent commands should be explicit from Story 1.1.
- Large-display, desktop, narrow-width, and command-response acceptance profiles should be made concrete.
- BMAD discovery should better locate nested UX files, but that is a workflow/tooling hygiene item rather than a product backlog blocker.

## 2. Impact Analysis

### Epic Impact

Epic 1 remains valid. Its setup scope should be tightened so Stories 1.2, 1.3, and 1.4 verify import normalization, setup review, issue classification, privacy-safe setup display, and asset placeholder contracts only.

Epic 2 remains valid. It is the right place to verify board-ready DTO privacy, live Player placeholder rendering, and live Team logo placeholder rendering because it introduces the live board and Team tiles.

Epic 3 remains valid. No direct correction required.

Epic 4 remains valid at the epic level, but Story 4.5 should be reworked so implementation and release evidence are not bundled into a single catch-all story.

No epic should be removed or resequenced. No new epic is needed.

### Story Impact

Affected stories:

- Story 1.1: strengthen local verification script expectations.
- Story 1.2: remove future live DTO assertion and keep setup import privacy boundaries.
- Story 1.3: remove future live-board rendering assertion and keep setup placeholder contract.
- Story 1.4: split setup placeholder behavior from future live-board logo behavior.
- Story 2.1 or 2.2: keep board-ready DTO privacy verification in the live state/board area.
- Story 2.2: explicitly verify missing Player photo placeholder on the live board.
- Story 2.3: explicitly verify missing Team logo placeholder on live Team tiles.
- Story 4.5: rewrite as a focused event-mode rehearsal/runtime validation story, with final release-gate evidence moved to a separate release artifact outside the normal implementation story sequence.

### PRD Impact

No PRD change is required. The MVP remains achievable and still covers FR-1 through FR-22.

Optional clarification only: no PRD FR needs to be added for CI, release evidence, or viewport profiles. Those are implementation readiness and quality-gate details.

### Architecture Impact

No architecture spine change is required. Existing ADs already support the correction:

- AD-8 covers privacy by projection.
- AD-10 covers event mode operations.
- AD-11 covers tests protecting architectural invariants.
- AD-12 covers correctness-first delivery order.

### UX Impact

UX content is aligned with PRD and architecture, but artifact status should be settled before implementation:

- Either mark `DESIGN.md` and `EXPERIENCE.md` as `final`, or explicitly record that draft UX files are authoritative for implementation.
- Add concrete acceptance profiles for desktop/laptop, projected display, narrow browser width, and command response behavior.

### Technical and Process Impact

This is a moderate backlog cleanup. It does not require rollback, rearchitecture, or MVP scope reduction. It requires editing planning artifacts before implementation stories are handed to the developer agent.

## 3. Recommended Approach

Recommended path: Direct Adjustment.

Rationale:

- PRD coverage is complete.
- Architecture and UX are aligned.
- The issues are story independence, story sizing, and verification clarity.
- Direct backlog edits preserve momentum and avoid unnecessary replan.
- The changes reduce implementation risk by putting each acceptance criterion in the story that can actually verify it.

Effort estimate: Low to medium.

Risk level: Low.

Timeline impact: Small. This should be completed before implementation starts because it prevents larger story-completion ambiguity later.

Scope classification: Moderate, because backlog organization changes and release gate handling need coordination, but product scope and architecture remain stable.

## 4. Checklist Results

| Checklist Item | Status | Finding |
| --- | --- | --- |
| 1.1 Triggering story | Done | Trigger came from implementation readiness assessment, not an implementation failure. Affected stories are 1.2, 1.3, 1.4, and 4.5. |
| 1.2 Core problem | Done | Story independence and release-gate sizing issue. |
| 1.3 Evidence | Done | Evidence confirmed in `epics.md` and readiness report. |
| 2.1 Current epic impact | Done | Epic 1 can still be completed after AC cleanup. |
| 2.2 Epic-level changes | Done | No epic scope change needed. |
| 2.3 Future epic review | Done | Epic 2 absorbs live-board verification; Epic 4 reclassifies release gate. |
| 2.4 New or obsolete epics | Done | No new or obsolete epics. |
| 2.5 Epic order | Done | No resequencing needed. |
| 3.1 PRD conflict | Done | No PRD conflict. |
| 3.2 Architecture conflict | Done | No architecture conflict. |
| 3.3 UX conflict | Done | No UX contradiction; status and specificity cleanup recommended. |
| 3.4 Other artifacts | Action-needed | Update `epics.md`; optionally update UX front matter and add release-gate evidence artifact. |
| 4.1 Direct adjustment | Viable | Best option. |
| 4.2 Rollback | Not viable | No implemented stories need rollback. |
| 4.3 MVP review | Not viable | MVP remains valid. |
| 4.4 Path selected | Done | Direct Adjustment. |
| 5.1 Issue summary | Done | Included here. |
| 5.2 Artifact adjustment needs | Done | Included here. |
| 5.3 Recommendation | Done | Included here. |
| 5.4 MVP impact | Done | No MVP scope change. |
| 5.5 Handoff plan | Done | PO/DEV backlog cleanup, then Developer agent implementation. |
| 6.1 Checklist review | Done | All applicable items addressed. |
| 6.2 Proposal accuracy | Done | Proposal grounded in loaded PRD, epics, architecture, UX, and readiness report. |
| 6.3 User approval | Done | Approved by Udeet on 2026-07-06. |
| 6.4 sprint-status update | N/A | No sprint-status YAML was found in the repository, so there was no sprint-status artifact to update. |
| 6.5 Handoff confirmation | Done | Routed to Product Owner / Developer backlog cleanup, then Developer agent implementation. |

## 5. Detailed Change Proposals

### Proposal A - Story 1.1 local verification scripts

Story: 1.1 Open Local Auction Manager App Shell

Section: Acceptance Criteria, Dev Gate

OLD:

```text
Given a developer finishes this story
When they run the story's Dev Gate
Then build, typecheck, lint if configured, unit tests, and a Playwright smoke test for opening the local app pass.
```

NEW:

```text
Given a developer finishes this story
When they run the story's Dev Gate
Then the workspace exposes standard local verification scripts for build, typecheck, unit tests, integration tests, and Playwright smoke coverage
And the Story 1.1 Dev Gate runs the applicable commands successfully, including opening the local app in development mode and event mode.
```

Rationale:

The backlog repeatedly depends on local quality gates. Story 1.1 should establish those scripts early so later stories can reference known commands rather than inventing their own checks.

### Proposal B - Story 1.2 setup privacy boundary

Story: 1.2 Import and Review Player CSV

Section: Acceptance Criteria

OLD:

```text
Given the CSV contains registration fields that are not needed for auction logic
When import completes
Then those fields are ignored for live auction state
And email, mobile, payment status, payment transaction ID, source timestamp, and ignored source fields are excluded from board/live DTOs.
```

NEW:

```text
Given the CSV contains registration fields that are not needed for auction logic
When import completes
Then those fields are classified or ignored according to the import adapter contract
And the normalized Player records used by setup and auction logic exclude email, mobile, payment status, payment transaction ID, source timestamp, and other non-auction registration fields from auction-facing state.
```

Rationale:

Story 1.2 can verify import normalization and setup privacy. It should not require board/live DTOs before those DTOs exist.

### Proposal C - Move board/live DTO privacy verification to Story 2.2

Story: 2.2 Reveal Current Player on the Live Board

Section: Acceptance Criteria

CURRENT:

```text
Given the live board renders Current Player state
When board DTOs are inspected
Then they contain only allowlisted auction fields
And email, mobile, payment status, payment transaction ID, source timestamp, and ignored source fields are absent.
```

NEW:

```text
Given the live board renders Current Player state
When board DTOs, route responses, rendered UI, logs emitted by the live command, and snapshots produced by the command are inspected
Then they contain only allowlisted auction fields needed for the board and roster projections
And email, mobile, payment status, payment transaction ID, source timestamp, and ignored source fields are absent outside allowed setup diagnostics.
```

Rationale:

This keeps privacy proof in the first live-board story where board DTOs, route responses, UI rendering, and command-produced state can be tested together.

### Proposal D - Story 1.3 setup placeholder contract

Story: 1.3 Match Player Photos With Placeholders

Section: Acceptance Criteria

OLD:

```text
Given a Player has no matched photo
When that Player appears on the live board later
Then the board uses a neutral placeholder
And missing media is not styled as a live-event failure.
```

NEW:

```text
Given a Player has no matched photo
When setup review is shown
Then the Player is associated with a placeholder-compatible media state
And the setup review makes clear that Start Auction can proceed without styling the missing photo as a blocking failure.
```

Rationale:

Story 1.3 can prove setup placeholder classification and asset state. Live rendering belongs in Story 2.2.

### Proposal E - Add live Player placeholder rendering to Story 2.2

Story: 2.2 Reveal Current Player on the Live Board

Section: Acceptance Criteria

ADD:

```text
Given the revealed Player has no matched photo
When the live board renders the Player panel
Then the board uses the neutral Player placeholder from the setup media contract
And missing media is not styled as a live-event failure.
```

Rationale:

Story 2.2 introduces the Player panel on the live board and can test the actual rendered placeholder behavior.

### Proposal F - Story 1.4 setup placeholder contract

Story: 1.4 Import Teams and Logos

Section: Acceptance Criteria

OLD:

```text
Given a Team has no matched logo
When that Team appears in setup review or the later live board
Then the app uses a neutral placeholder logo
And missing logo state is not styled as a live-event failure.
```

NEW:

```text
Given a Team has no matched logo
When setup review is shown
Then the Team is associated with a placeholder-compatible logo state
And the setup review makes clear that Start Auction can proceed without styling the missing logo as a blocking failure.
```

Rationale:

Story 1.4 can prove setup placeholder classification and logo asset state. Live Team tile rendering belongs in Story 2.3.

### Proposal G - Add live Team logo placeholder rendering to Story 2.3

Story: 2.3 Select Bidding Team From Team Tiles

Section: Acceptance Criteria

ADD:

```text
Given a Team has no matched logo
When the live board renders Team tiles
Then that Team tile uses the neutral Team logo placeholder from the setup media contract
And missing logo state is not styled as a live-event failure.
```

Rationale:

Story 2.3 introduces live Team tiles and can test the actual logo placeholder behavior.

### Proposal H - Rework Story 4.5 into implementation rehearsal, not final release gate

Story: 4.5 Run Event-Mode Rehearsal and Release Gates

Section: Story title and Acceptance Criteria

OLD TITLE:

```text
Story 4.5: Run Event-Mode Rehearsal and Release Gates
```

NEW TITLE:

```text
Story 4.5: Verify Event-Mode Runtime and Rehearsal Flow
```

OLD SCOPE:

```text
As an event organizer,
I want a full event-mode rehearsal and release gate before the live auction,
So that we trust the app, data, media, recovery, rosters, and tests before the room is watching.
```

NEW SCOPE:

```text
As an event organizer,
I want the event-mode runtime and representative rehearsal flow verified on local event-style data,
So that the app can run from one local process and exercise the critical auction flow before final release approval.
```

REPLACE ACCEPTANCE CRITERIA WITH:

```text
Given the app is built for event mode
When the event-mode runtime starts
Then one Fastify process serves the built React app, /api/*, /assets/*, the health endpoint, SQLite state, normalized assets, and snapshots from 127.0.0.1 by default
And startup checks Node version, data directory writability, database open status, and configured asset paths before live commands are enabled.

Given representative event data and media are available
When the rehearsal setup runs
Then Player CSV, Player photos, Team CSV, Team logos, auction parameters, missing-media placeholders, and import issue classifications are exercised
And no internet, hosted database, Docker runtime, account system, or manual asset hosting is required.

Given the rehearsal live flow runs
When operators exercise setup, Phase 1 sale, invalid sale block, undo after sale, Phase 2 unsold bidding, Phase 3 manual assignment, Team rosters, Close Auction, and resume after restart
Then the rehearsal records pass/fail results for those flows
And any failed flow is linked back to the owning implementation story or defect follow-up instead of being hidden inside this story.

Given privacy-sensitive source fields exist in the input data
When board, Team rosters, API DTOs, logs, snapshots, and rendered UI are inspected
Then email, mobile, payment status, transaction ID, source timestamp, and ignored source fields do not appear outside allowed setup diagnostics.

Given a developer finishes this story
When they run the story's Dev Gate
Then build, typecheck, unit tests, integration tests, Playwright event-flow smoke tests, privacy checks, and event-mode smoke tests pass or have accepted triage
And the rehearsal notes are saved in the implementation artifacts.

Given the dev agent marks the story complete
When a second agent reviews it
Then the reviewer reruns or audits the event-mode smoke and rehearsal evidence, verifies privacy guarantees, raises findings, and sends blocking issues back for iteration.
```

Rationale:

This keeps Story 4.5 implementable and reviewable. Final release approval still needs a gate, but it should not be the first place where core flows are validated.

### Proposal I - Add release-gate evidence checklist outside story backlog

Artifact: new release evidence checklist under implementation artifacts, or a non-story section after Story 4.5.

ADD:

```text
## Release Gate Evidence Checklist

This checklist is completed after implementation stories are done and before live event use. It is not a feature implementation story.

- Build, typecheck, unit tests, integration tests, Playwright event-flow tests, privacy checks, and event-mode smoke tests were run.
- P0 tests pass at 100%.
- P1 pass rate is at least 95%, with explicit triage for accepted remaining failures.
- Representative Player CSV, Player photos, Team CSV, Team logos, missing-media placeholders, and auction parameters were exercised.
- Restart/resume was verified across setup-started state, Phase 1, Phase 2, Manual Assignment, and Closed state.
- Final roster display after Close Auction was verified.
- Board, Team rosters, API DTOs, logs, snapshots, and rendered UI were checked for private-field exclusion.
- Every risk score >=6 has mitigation, owner, and verification evidence.
- Event-machine notes are recorded, including OS, Node version, data directory path, startup result, and any accepted constraints.
```

Rationale:

Release gates are real and important, but they are better handled as final evidence rather than an oversized implementation story.

### Proposal J - UX artifact status

Artifacts:

- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md`

OLD:

```yaml
status: draft
```

NEW:

```yaml
status: final
```

Rationale:

The readiness report found the UX docs aligned with PRD and architecture. If implementation will treat them as authoritative, their front matter should not remain draft.

Alternative:

If stakeholders are not ready to mark UX final, add an implementation note to `epics.md` stating that the draft UX docs are authoritative for Phase 4 unless explicitly superseded.

### Proposal K - Concrete viewport and command-response acceptance profiles

Artifact: UX `EXPERIENCE.md` and relevant live-board stories.

ADD:

```text
Implementation acceptance profiles:

- Laptop operator profile: 1440x900 browser viewport.
- Compact laptop profile: 1366x768 browser viewport.
- Projected display profile: 1920x1080 browser viewport with critical content kept inside safe margins.
- Narrow fallback profile: 390x844 browser viewport, preserving workflow order without mobile-first polish.
- Local command profile: mutating controls show immediate pending affordance, reject duplicate clicks, and reconcile from the authoritative server response without layout jumps. Rehearsal records any command response that feels slow under event-machine conditions.
```

Rationale:

The current UX correctly says the app must be readable and fast, but implementation needs concrete profiles to test against.

## 6. Implementation Handoff

Recommended routing: Product Owner / Developer backlog cleanup before implementation.

Responsibilities:

- Product/backlog owner: approve this proposal and authorize edits to `epics.md`, UX status, and release-gate artifact handling.
- Developer agent: apply the approved story edits, create or update the release-gate evidence checklist, and keep PRD/architecture unchanged unless a new contradiction is discovered.
- QA/test architect role if used: review the release-gate checklist and verify P0/P1 evidence expectations remain testable outside the story backlog.

Success criteria:

- Stories 1.2, 1.3, and 1.4 are independently testable without requiring future live-board surfaces.
- Stories 2.2 and 2.3 carry the live-board privacy and placeholder rendering assertions.
- Story 4.5 is a manageable event-mode rehearsal/runtime validation story.
- Final release evidence exists outside normal implementation stories.
- UX status and viewport/performance profiles are resolved.
- A rerun of implementation readiness no longer reports the two major backlog-quality issues.

## 7. Approval and Routing

Approved by Udeet on 2026-07-06.

Applied changes:

- Updated `_bmad-output/planning-artifacts/epics.md`.
- Updated UX artifact status and acceptance profiles in `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` and `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md`.
- Created `_bmad-output/implementation-artifacts/release-gate-evidence-checklist-2026-07-06.md`.

Routing:

- Scope classification: Moderate.
- Handoff recipients: Product Owner / Developer for backlog cleanup verification, then Developer agent for implementation.
- Next success check: rerun implementation readiness and confirm the two major backlog-quality findings no longer appear.
