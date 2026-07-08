---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md
  - _bmad-output/test-artifacts/test-design/auction_manager-handoff.md
---

# auction_manager - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for auction_manager, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Load the current registration Player CSV, derive auction-relevant Player name, gender, Role, and Phase 1 Category, ignore non-auction source fields, identify unmappable Players before Start Auction, and require source CSV correction plus reimport for Player data fixes.

FR2: Configure role-based Base Prices during Auction Creation, allow operator edits before Start Auction, require a configured Base Price for every imported Role, show Base Price when a Player is revealed, and block Start Auction until all Player Roles have prices.

FR3: Match local Player photo files to imported Players using supported image formats and useful source metadata or filenames containing Player names, surface missing matches before Start Auction, and allow placeholder use for missing photos.

FR4: Load Team names and Captain names from a local Team CSV, match Team logos from a local folder, surface missing logo matches before Start Auction, allow placeholder logos, and require source Team CSV correction plus reimport for Team data fixes.

FR5: Configure Auction Parameters during Auction Creation, including role base prices, bid increment, Team budgets, maximum squad size, role targets, Phase 1 category order, and manual-assignment budget behavior; block Start Auction until parameters are complete and internally valid; lock parameters after Start Auction.

FR6: Start the Auction only after setup is complete, initializing Pending Players, Team Budgets, Squad Sizes, Role Counts, Undo History, and local recovery state.

FR7: Create and persist the Phase 1 role-wise player order by grouping Pending Players into the configured category sequence, randomizing within each category, revealing all Players in one category before the next, and ensuring each Player appears once.

FR8: Reveal the next Pending Player as Current Player, show the Player's name, photo or placeholder, Role, and Base Price, initialize Current Bid from Base Price, and include reveal in Undo History.

FR9: Display live auction state and Team roster state for the operator, Captains, and attendees, including Current Player, Current Bid, selected Team, outcome state, Team Budget, remaining budget, Squad Size, Role Counts, and current/final Team rosters in large-display-readable mirrored views.

FR10: Keep routine operator controls obvious and visually easier to reach than destructive or rare actions, with Dangerous Operations separated from normal live flow.

FR11: Select, change, or clear the Team bidding at the Current Bid, record that Team's bid at that value, show the leading Team on the Auction Board, and include bid-leader changes in Undo History and the event timeline.

FR12: Increase the Current Bid by the configured Bid Increment, immediately reflect the updated Current Bid on the Auction Board, and include bid changes in Undo History.

FR13: Hard-block invalid sales that exceed remaining Team Budget, maximum squad size, or Role Target, and explain the exact blocked reason clearly enough for live-event recovery.

FR14: Mark the Current Player as sold to the selected Team at the Current Bid, require a selected Team, record Sold Price and winning Team, update Team budget, Squad Size, Role Count, and Team roster projection, and include the sale in Undo History.

FR15: Mark the Current Player as unsold during a bidding phase, move Phase 1 unsold Players to the Phase 2 pool, move Phase 2 unsold Players to the Phase 3 pool, avoid budget/count mutation, and include the action in Undo History.

FR16: Start the second-phase Unsold Bidding only after Phase 1 is complete unless an explicit skip path is used, create and persist one randomized order of Phase 1 Unsold Players, and make each unsold Player appear once in Phase 2.

FR17: Run second-phase bidding for unsold Players with the same reveal, team selection, bid increment, Mark Sold, Mark Unsold, hard-block validation, persistence, and Undo behavior as Phase 1, with Current Bid starting from Base Price.

FR18: Run third-phase Manual Assignment only after Phase 2 is complete unless an explicit skip path is used, allow operator-selected assignment of remaining unsold Players to valid Teams under squad, role, and configured budget behavior rules, update Team counts and roster projection, preserve Undo History, and identify unresolved Players when no valid Team exists.

FR19: Support multi-step Undo for bid changes, selected Team changes, reveals, sold and unsold outcomes, second-phase actions, phase transitions, and Manual Assignment, restoring all affected Player, bid, selected-Team, Team budget, count, role, and phase state while excluding Reset Auction and Close Auction.

FR20: Persist local auction state after every completed setup or live mutation, including parameters, setup data references, phase ordering, randomized orders, Player statuses, bids, Team state, phase state, and Undo History, so reopening on the same PC can resume from the latest saved state.

FR21: Treat Reset Auction as a Dangerous Operation that is separated from normal live flow, requires confirmation, and cannot be reversed through Undo.

FR22: Treat Close Auction as a Dangerous Operation that is separated from normal live flow, requires confirmation, cannot be reversed through Undo, and leaves Team rosters as the final room-facing surface.

### NonFunctional Requirements

NFR1: The app must run one live event from one local PC without relying on Excel during the event.

NFR2: Local State Files must update after every completed state-changing action so an app close or browser refresh does not require restarting the auction.

NFR3: Auction Parameters must persist with the auction and remain consistent after Start Auction.

NFR4: Phase 1 ordering and Phase 2 randomized order must remain stable after each phase starts unless Reset Auction is deliberately executed.

NFR5: Live controls must be fast and obvious for an operator under public pressure.

NFR6: Routine controls must remain visible for the current phase, while Dangerous Operations are visually and interaction-wise separated.

NFR7: The Auction Board and Team roster surface must remain readable on a large display when mirrored from the operator PC.

NFR8: Live surfaces and board DTOs must display only auction-relevant Player and Team data.

NFR9: Email addresses, mobile numbers, payment transaction IDs, payment status, source timestamps, and other non-auction registration fields must not appear on the Auction Board or Team roster surface.

NFR10: v1 stores state locally and must not transmit auction data to a public service.

NFR11: Player photo handling must support JPEG, PNG, HEIC, and WebP where practical on the event machine.

NFR12: Photo matching must tolerate uncontrolled local filename patterns when the Player name appears in the filename.

NFR13: Setup must surface missing, ambiguous, or incomplete data and incomplete Auction Parameters before Start Auction.

NFR14: Each implementation story must include explicit unit-level and E2E or acceptance-level gates appropriate to its scope; no story is complete until those gates pass or any exception is explicitly triaged and accepted.

NFR15: Each completed implementation story must go through an independent review/test loop by a second agent that reviews the code, runs or adds relevant unit tests, runs or adds relevant E2E/Playwright coverage where the story touches a user flow, raises findings, and sends blocking issues back for implementation iteration.

### Additional Requirements

- No starter template was specified. Epic 1 Story 1 should scaffold the architecture-defined workspace instead of importing an unrelated starter: `apps/web`, `apps/server`, `packages/domain`, `packages/persistence`, `packages/imports`, `packages/shared`, and `packages/test-fixtures`.

- v1 is a local modular monolith. Event mode is one local Node.js process serving the built React app, local API, normalized assets, health endpoint, SQLite persistence, and snapshots; no v1 story may require cloud infrastructure, hosted databases, Docker at runtime, separate services, public deployment, accounts, login, RBAC, OAuth, JWT, or API keys.

- `packages/domain` is the only module allowed to decide auction phase transitions, sale validity, bid increments, role capacity, derived base prices, randomized orders, unsold bidding behavior, manual-assignment eligibility, assignment budget effects, Undo semantics, Reset eligibility, and Close eligibility.

- Server/domain state is authoritative after setup begins. React may hold only view state, form state, focus state, and pending-command affordances; every successful mutating command returns the new authoritative board-ready state DTO.

- The API is same-origin HTTP on localhost. Reads use `GET /api/state`; mutations use intent-named `POST` commands such as `/api/auction/reveal-next`, `/api/auction/mark-sold`, and `/api/auction/undo`.

- Every mutating command accepts `clientCommandId`, validates request and response schemas, and returns authoritative state plus a compact result summary.

- SQLite current-state tables plus `action_log` are the durable authority. Every setup or live mutation executes in one SQLite transaction, appends required action-log data, updates current-state tables, and writes or schedules `data/snapshots/latest.json` only after commit.

- Every persistence-bearing implementation story must include a Persistence Ownership note naming tables, fields, indexes or constraints, action-log payload fields, snapshot fields, migration or schema-version behavior, and resume/reconstruction tests introduced or changed by that story.

- If persistence fails, the server rejects further mutating commands until the failure is cleared or the operator chooses an explicit recovery path.

- Undo is action-log based and must restore all affected player, team, bid, selected-team, role-count, budget, assignment-budget effect, phase, pending-pool, skipped-player, and randomized-order fields. Reset Auction and Close Auction are never part of the undo stack.

- Setup imports are staged adapters. Player CSV, Player photos, Team CSV, and logos are parsed, validated, matched, normalized, and copied into managed app storage before Start Auction.

- Import adapters emit structured `import_issues` with severities `must_fix`, `can_proceed_with_placeholder`, and `ignored_source_field`; Start Auction is blocked while any `must_fix` issue remains.

- Board, Team roster, and live API DTOs are allowlisted projections containing only Player name, photo or placeholder, Role, Base Price, Current Bid, status, Sold Price, winning Team, acquisition type, Team name, Captain, logo or placeholder, budget, squad count, role counts, and roster rows needed to display current/final Team rosters.

- Team rosters are read projections from Players assigned to Teams through Mark Sold or Manual Assignment. The UI may display roster projections, but must not create roster truth separate from domain state.

- Event mode binds to `127.0.0.1` by default, disables CORS, rejects unexpected `Origin`, `Host`, and `Content-Type` on mutating routes, accepts multipart only on setup upload routes, enforces upload extension/content/size/count limits, uses generated internal asset IDs, and never serves user-provided filesystem paths directly.

- Startup checks Node version, data directory writability, database open status, and configured asset paths before live commands are enabled.

- Tests protect architectural invariants: domain command changes require Vitest domain tests; persistence changes require temporary SQLite transaction, resume, action-log, and snapshot tests; Fastify routes require `inject()` schema and conflict tests; Playwright covers setup import, parameter locking, happy-path sale, invalid sale block, undo after sale, Phase 2 unsold bidding, Phase 3 manual assignment, restart/resume across unsold phases, and live-board privacy.

- Correctness-first delivery order is scaffold, domain, persistence, API, imports/assets, operator/display UI, then event-mode rehearsal. A slice is complete only when relevant build, typecheck, unit/integration tests, and current event-flow smoke tests pass.

- Auction Parameters are setup-owned and locked after Start Auction. Manual-assignment budget behavior is a persisted domain enum with v1 default `NoBudgetImpact`; additional values require domain validation, persistence, API schema, and tests in the same slice.

- The auction state machine has separate live phases for `InitialAuction`, `UnsoldBidding`, and `ManualAssignment`; Phase 2 uses normal bidding, Phase 3 is operator-selected manual assignment, and explicit skip paths must record skipped Players and be undoable.

- Canonical package names, entity names, command names, and role enum values must follow the architecture conventions. Source labels such as `All Rounder` and `Women` are normalized at import/setup.

- Money and counts are integer units only. Setup defaults are editable before Start Auction and locked afterward: role base prices `Ace 10`, `Batting 8`, `Bowling 6`, `Girls/Women 6`, bid increment `2`, team budget `170`, squad max `13`, and role targets `Ace 2`, `Batting 3`, `Bowling 2`, `AllRounder 2`, `Girls 2`.

- API errors use `400` for invalid input, `409` for phase/rule conflict, `413` for upload too large, `415` for unsupported media, and `500` for unexpected server faults without stack traces in UI.

- Logs include command summary, `clientCommandId`, timestamp, outcome, and undo payload where applicable, and never log private source fields unless needed for local setup diagnostics.

- Every story should include a `Dev Gate` specifying required implementation checks and a `Review/Test Gate` specifying independent second-agent checks. Blocking review findings reopen the story for iteration before the story can be considered done.

- TEA quality gates must be represented through story acceptance criteria and the final release-gate evidence checklist: P0 tests pass at 100%, P1 pass rate is at least 95% with accepted triage for any remaining failure, every risk score >=6 has mitigation/owner/verification evidence, no private source fields appear in board DTOs/live UI/logs/snapshots, and event-PC rehearsal covers representative media plus restart/resume before live use.

- Story-level test planning must include the TEA P0/P1 scenarios: setup Start Auction blocking, placeholder-compatible missing media, persisted randomized order, bid increment correctness, Mark Sold validation, invalid sale non-mutation, sale state updates, Mark Unsold pool movement, valid-only manual assignment, roster projection updates after sale/manual assignment/undo, final roster display after Close Auction, multi-step Undo restoration, Reset/Close confirmation and Undo exclusion, resume with Undo History, private-field exclusion, upload/static traversal rejection, keyboard operation, and text blocked reasons.

- UI stories must use stable test IDs for E2E/component testability, including setup import controls, live board state, Board/Rosters switch, team roster sections, roster player rows, team tiles, command buttons, unsold progress, no-valid-team reason, and dangerous-operation confirmation controls.

- Product-owner acceptance note: the following UX-driven scope is intentional for v1 implementation because it is adopted by UX, architecture, and epics even where the PRD states the need more lightly: Board/Rosters switch, all-Team roster surface, final closed-auction roster display, Team detail drawer, keyboard behavior, WCAG 2.2 AA accessibility target, responsive acceptance profiles, and local command-response rehearsal evidence.

### UX Design Requirements

UX-DR1: Implement the visual token system from `DESIGN.md`, including color tokens, typography tokens, radius tokens, spacing tokens, component tokens, and the restrained sports-control palette.

UX-DR2: Build the Live Board as the dark full-width anchor surface, with Current Player and Current Bid as the first read, selected Team and phase/category or unsold progress as the second read, and routine controls as the third read.

UX-DR3: Reserve Live Gold for the Current Bid and the live bid increment moment; do not use gold as a generic accent.

UX-DR4: Make Current Bid the largest number on the live surface, using stable tabular or visually stable numeric rendering so bid, budget, squad, and role-count changes do not shift layout.

UX-DR5: Build setup surfaces with light backgrounds, dense checklist/table layouts, and clear readiness states rather than live-board styling.

UX-DR6: Build a Player Panel that shows photo or neutral placeholder, name, Role, Base Price, and status without treating missing media as an error.

UX-DR7: Build Team Tiles that show logo or placeholder, Team name, Captain name, remaining budget, squad count, and Current Player role capacity; selected Team tiles must expose active visual state.

UX-DR8: Build Role Capacity indicators for Ace, Batting, Bowling, All Rounder, and Girls counts, using danger styling only when the blocked capacity affects the Current Player.

UX-DR9: Build an Auction Parameter editor/row for role base prices, bid increment, Team budgets, squad cap, role targets, and manual-assignment budget behavior; values are editable only before Start Auction and become readable locked values afterward.

UX-DR10: Build a global Phase Progress Strip for `Setup`, `Initial Auction`, `Unsold Bidding`, `Manual Assignment`, and `Closed`, visible on every surface where allowed actions vary by phase.

UX-DR11: Build an Unsold Pool Summary that distinguishes Phase 1 unsold count, Phase 2 remaining count, and Phase 3 manual-assignment count without using danger red for ordinary unsold volume.

UX-DR12: Build Phase Transition review controls for Start Unsold Bidding and Start Manual Assignment that show counts, next phase, randomized/persisted order messaging where relevant, and explicit skip consequences when prior-phase Pending Players remain.

UX-DR13: Build routine action controls with clear hierarchy: Primary button for safe routine actions, Live button for bid increment, secondary Undo with last-action summary, inline Blocked Status near attempted actions, deliberate Manual Assignment controls, and separated Dangerous Operation controls.

UX-DR14: Build a Resume/Start surface that shows no-state start, saved-state resume, phase, last saved action, and timestamp when available, without using a marketing or landing page.

UX-DR15: Build an Import Review Table that groups issues by `must_fix`, `can_proceed_with_placeholder`, and `ignored_source_field`, supports source diagnosis, and avoids exposing private fields on live surfaces.

UX-DR16: Build a read-only Team Detail Drawer for inspecting a team's budget, squad, role counts, roster, and capacity reasons without leaving the live board.

UX-DR17: Build Manual Assignment as an assignment-only surface where bidding controls are hidden or disabled, the operator selects a receiving Team, and invalid Team reasons are recalculated immediately.

UX-DR18: Build a separated Dangerous Menu containing only Reset Auction and Close Auction, with confirmation modals that state Undo cannot reverse the action.

UX-DR19: Implement command-in-flight states that disable triggering controls or show pending affordances until authoritative state returns, preventing duplicate-click mutations.

UX-DR20: Implement local write failure UX that blocks further state-changing actions until retry or a safe recovery path is clear.

UX-DR21: Use operational, calm, specific microcopy for blocked reasons, undo summaries, resume notices, unsold outcomes, phase transitions, and dangerous confirmations; avoid hype, jokes, vague errors, and celebratory language.

UX-DR22: Meet the accessibility floor: WCAG 2.2 AA target, visible focus states, accessible names, selected-state exposure, text blocked reasons, text unsold counts, phase-change announcements, keyboard-only operation across setup/live/unsold/manual/danger flows, minimal motion, Reduce Motion support, and live controls at least 44 CSS px.

UX-DR23: Implement keyboard behavior for live operation: Enter activates only the focused primary control, Space activates buttons/team tiles with standard behavior, `+` increases Current Bid when safe, `u` focuses or opens Undo, `n` focuses Reveal Next Player when no Current Player requires outcome, and Escape closes the topmost drawer/popover/modal except destructive confirmations that require explicit choice.

UX-DR24: Implement responsive behavior for the concrete acceptance profiles: 1440x900 laptop operator viewport, 1366x768 compact laptop viewport, 1920x1080 projected display viewport with safe margins, and 390x844 narrow fallback viewport, preserving workflow order without making v1 mobile-first.

UX-DR25: Enforce privacy visibility rules in the UI: Player name/photo/Role/prices/status/winning Team, roster row Player name/Role/acquisition type/Sold Price when applicable, and Team name/Captain/logo/budget/squad/role counts are visible; email, mobile, payment status, transaction ID, source timestamp, and ignored source fields are never visible on the live board or Team rosters.

UX-DR26: Use Lucide icons where icons are used, but ensure icon-only controls have accessible names and visible labels on the live board unless rehearsal proves space constraints.

UX-DR27: Build a Board/Rosters switch as a compact two-option navigation control for moving between the live Auction Board and all-Team roster surface; it must be visible during live phases and closed state, keyboard reachable before main surface content, preserve auction state, and never trigger a state mutation by itself.

UX-DR28: Build a read-only Team roster screen that shows every Team at once with logo or placeholder, Team name, Captain, remaining budget, squad count, role counts, and current roster; empty Teams remain visible with `No players bought yet.`

UX-DR29: Build roster Team sections and roster Player rows using the updated design tokens; each Player row shows name, Role, acquisition type (`Sold` or `Assigned`), and price when applicable, dense enough for scanning but never below readable body text.

UX-DR30: After Close Auction succeeds, automatically make Team rosters the default final room-facing surface with phase shown as `Closed`, routine live controls disabled, and final roster state readable on the mirrored display.

UX-DR31: Adopt the Epic 2 redesign review mockup at `ux-designs/ux-auction_manager-2026-07-05/mockups/epic-2-redesign-review.html` as the implementation reference for live board, manual assignment, roster, and closed-state structure before Epic 3 begins.

UX-DR32: Build the redesigned red/black event-console live board with compact top counters, a stable Current Player/Bid stage, fixed command strip, and right-side Team matrix that keeps eight Teams visible in the first viewport at 1440x900 and 1366x768.

UX-DR33: Replace instructional live-board clutter with repeated operational metrics and concise blocked/outcome copy; the UI should communicate through hierarchy, counters, commands, and state labels rather than explanatory paragraphs.

UX-DR34: Build Manual Assignment as its own focused surface using the redesign pattern: assignment player and pool list on the left, eligible Team matrix on the right, bottom blocked-reason panel, and no routine bidding controls.

UX-DR35: Build the roster and Closed surfaces with dense dark roster cards, Board/Rosters switch, final roster title treatment, and all-Team visibility matching the redesign hierarchy while preserving privacy allowlists.

UX-DR36: Add full redesign QA gates for the redesigned surfaces, combining unit/component tests, E2E functional regression tests, accessibility checks, and visual QA screenshots at 1440x900, 1366x768, 1920x1080, and 390x844. The gate must prove command controls, counters, player stage, Team matrix, blocked reasons, roster cards, and core auction actions work correctly and do not overlap or push critical content out of workflow order.

### FR Coverage Map

FR1: Epic 1 - Player CSV import and auction-relevant Player data derivation.

FR2: Epic 1 - Role-based Base Price configuration and Start Auction validation.

FR3: Epic 1 - Local Player photo matching and placeholder-compatible missing media handling.

FR4: Epic 1 - Team CSV import, Captain names, Team logo matching, and placeholder-compatible missing logos.

FR5: Epic 1 - Auction Parameter configuration, validation, and post-start locking.

FR6: Epic 1 - Start Auction initialization for Pending Players, Team state, Undo History, and local recovery state.

FR7: Epic 2 - Persisted Phase 1 role-wise randomized Player order.

FR8: Epic 2 - Reveal Next Player behavior and initial Current Bid display.

FR9: Epic 2 - Large-display-readable live Auction Board and Team roster state.

FR10: Epic 2 - Obvious routine operator controls and separated dangerous actions.

FR11: Epic 2 - Select, change, or clear bidding Team with Undo support.

FR12: Epic 2 - Bid increment behavior with Undo support.

FR13: Epic 2 - Hard-block invalid sales with clear reasons.

FR14: Epic 2 - Mark Sold outcome, Team updates, roster projection updates, and Undo support.

FR15: Epic 2 - Mark Unsold outcome, unsold pool movement, and Undo support.

FR16: Epic 3 - Start Unsold Bidding with persisted randomized Phase 2 order.

FR17: Epic 3 - Phase 2 unsold bidding using normal bidding controls and validation.

FR18: Epic 3 - Phase 3 Manual Assignment to valid Teams with roster projection updates and unresolved-player reasons.

FR19: Epic 2 primary, Epic 3 extension, Epic 4 validation - Multi-step Undo across live actions, roster projection changes, phase transitions, and manual assignment while excluding Reset and Close.

FR20: Epic 1 foundation, Epic 2 and Epic 3 expansion, Epic 4 validation - Local persistence, snapshots, action log, and resume across setup, live bidding, unsold phases, and final state.

FR21: Epic 4 - Reset Auction as separated, confirmed, non-undoable Dangerous Operation.

FR22: Epic 4 - Close Auction as separated, confirmed, non-undoable Dangerous Operation that displays final Team rosters.

## Epic List

### Epic 1: Prepare and Start a Valid Auction

The operator can import Players, photos, Teams, logos, configure auction parameters, review setup issues, and start a persisted auction only when required data is valid.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6

### Epic 2: Run the Initial Live Auction Safely

The operator can run Phase 1 from the projected board: reveal randomized role-wise Players, select teams, increase bids, block invalid sales, mark sold/unsold, see team state and current rosters, and recover from ordinary mistakes.

**FRs covered:** FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR19, FR20

### Epic 2.5: Implement the Epic 2 UI Redesign Before Unsold Resolution

The operator gets the approved red/black event-console UI from the Epic 2 redesign review applied across the current live board and future-facing Phase 3/closed roster surfaces before Epic 3 adds unsold bidding and manual-assignment behavior.

**FRs covered:** FR9, FR10, FR18 UI preparation, FR22 UI preparation, plus UX-DR31 through UX-DR36.

### Epic 3: Resolve Unsold Players

The operator can start Phase 2 unsold rebidding, use normal bidding controls for randomized unsold Players, then manually assign remaining unsold Players to valid Teams in Phase 3 with roster projections kept current.

**FRs covered:** FR16, FR17, FR18, plus Phase 2/3 extensions of FR8-FR15, FR19, FR20

### Epic 4: Finish, Reset, and Rehearse Event Safety

The operator can safely reset or close the auction through separated dangerous controls, resume trusted local state, display final Team rosters, and rely on final quality gates before live use.

**FRs covered:** FR21, FR22, with final validation of FR9, FR10, FR19, FR20

## Epic 1: Prepare and Start a Valid Auction

The operator can import Players, photos, Teams, logos, configure auction parameters, review setup issues, and start a persisted auction only when required data is valid.

### Story 1.1: Open Local Auction Manager App Shell

As an auction operator,
I want to open Auction Manager locally on the event PC,
So that setup can begin from a reliable single-machine app.

**Acceptance Criteria:**

**Given** the project is checked out on the event PC
**When** the app is installed and started in development mode
**Then** the operator can open a local Auction Manager web surface
**And** the app shows a setup-ready empty state, not a marketing page.

**Given** the app is started in event mode
**When** the server boots
**Then** one local Fastify process serves the built React app, `/api/health`, and static app assets from `127.0.0.1` by default
**And** no cloud service, hosted database, Docker runtime, account system, or public deployment is required.

**Given** the architecture spine defines package boundaries
**When** the workspace is scaffolded
**Then** it contains `apps/web`, `apps/server`, `packages/domain`, `packages/persistence`, `packages/imports`, `packages/shared`, and `packages/test-fixtures`
**And** shared types/schemas can be imported without circular ownership between app layers.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** the workspace exposes standard local verification scripts for build, typecheck, unit tests, integration tests, and Playwright smoke coverage
**And** the Story 1.1 Dev Gate runs the applicable commands successfully, including opening the local app in development mode and event mode.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks architecture boundaries, runs or adds relevant unit tests, runs the app-opening E2E smoke test, raises findings, and sends blocking issues back for iteration.

### Story 1.2: Import and Review Player CSV

As an auction operator,
I want to load the Player CSV and see import issues before the auction starts,
So that source data problems are fixed before the live event.

**Acceptance Criteria:**

**Given** the setup surface is open
**When** the operator uploads the Player CSV exported from the registration sheet
**Then** the system parses the required PRD columns
**And** derives each Player's name from `Full Name`, gender from `Gender`, Role from `Skill`, and Phase 1 Category from `Gender` plus `Skill`.

**Given** the CSV contains registration fields that are not needed for auction logic
**When** import completes
**Then** those fields are classified or ignored according to the import adapter contract
**And** the normalized Player records used by setup and auction logic exclude email, mobile, payment status, payment transaction ID, source timestamp, and other non-auction registration fields from auction-facing state.

**Given** a Player row cannot be mapped into one configured Phase 1 Category
**When** import review is shown
**Then** the issue appears as `must_fix`
**And** Start Auction remains blocked until the source CSV is corrected and reimported.

**Given** the CSV contains required headers and valid Player rows
**When** import review is shown
**Then** the operator sees a privacy-safe list of imported Players and grouped import issues
**And** issue groups use `must_fix`, `can_proceed_with_placeholder`, and `ignored_source_field`.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** Player CSV parser unit tests, import issue classification tests, schema/typecheck, and setup import UI/component tests pass
**And** an E2E or acceptance test proves Start Auction is blocked for required Player data errors.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks privacy projection, runs or adds relevant import unit tests, runs the setup import E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

### Story 1.3: Match Player Photos With Placeholders

As an auction operator,
I want to load local Player photos and match them to imported Players,
So that the live board can show Player photos where available and safe placeholders where not.

**Acceptance Criteria:**

**Given** Player CSV import has completed
**When** the operator uploads or selects local Player photo files
**Then** the system accepts supported image formats including JPEG, PNG, HEIC, and WebP where practical on the event machine
**And** rejects unsupported files with a clear setup issue.

**Given** local photo filenames or source metadata contain Player-identifying text
**When** the matching process runs
**Then** the system associates photos to Players using normalized Player names and useful `Photo Upload` metadata
**And** matched photos are copied or normalized into managed app storage using internal asset IDs, not source file paths.

**Given** a Player photo cannot be matched
**When** import review is shown
**Then** the missing photo appears as `can_proceed_with_placeholder`
**And** Start Auction is not blocked solely because a Player photo is missing.

**Given** a Player has no matched photo
**When** setup review is shown
**Then** the Player is associated with a placeholder-compatible media state
**And** the setup review makes clear that Start Auction can proceed without styling the missing photo as a blocking failure.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** photo matching unit tests, placeholder issue classification tests, asset storage/path-safety tests, and setup UI tests pass
**And** an E2E or acceptance test proves missing photos are surfaced but do not block Start Auction.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks file boundary safety, placeholder behavior, supported-format handling, unit tests, and the missing-photo E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

### Story 1.4: Import Teams and Logos

As an auction operator,
I want to load Teams, Captains, and Team logos before the auction,
So that captains and attendees can follow team state during live bidding.

**Acceptance Criteria:**

**Given** the setup surface is open
**When** the operator uploads the Team CSV
**Then** the system imports each Team name and Captain name
**And** every Team has a Team name before Start Auction can proceed.

**Given** the Team CSV is missing required Team data
**When** import review is shown
**Then** the issue appears as `must_fix`
**And** Start Auction remains blocked until the Team CSV is corrected and reimported.

**Given** the operator uploads or selects Team logo files
**When** the logo matching process runs
**Then** the system associates logos to Teams where possible
**And** matched logos are copied or normalized into managed app storage using internal asset IDs, not source file paths.

**Given** a Team logo cannot be matched
**When** import review is shown
**Then** the missing logo appears as `can_proceed_with_placeholder`
**And** Start Auction is not blocked solely because a Team logo is missing.

**Given** a Team has no matched logo
**When** setup review is shown
**Then** the Team is associated with a placeholder-compatible logo state
**And** the setup review makes clear that Start Auction can proceed without styling the missing logo as a blocking failure.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** Team CSV parser tests, required-field validation tests, logo matching tests, asset path-safety tests, and setup UI/component tests pass
**And** an E2E or acceptance test proves missing required Team data blocks Start Auction while missing logos do not.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks Team import correctness, logo placeholder behavior, file boundary safety, unit tests, and the Team import E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

### Story 1.5: Configure Auction Parameters

As an auction operator,
I want to confirm or edit auction parameters before the auction starts,
So that bidding, budgets, squad limits, role limits, and manual assignment use the agreed event rules.

**Acceptance Criteria:**

**Given** Player and Team import data is available
**When** the operator opens auction parameter setup
**Then** the app shows editable values for Role Base Prices, Bid Increment, Team Budgets, Maximum Squad Size, Role Targets, Phase 1 Category order, and Manual Assignment budget behavior
**And** current league defaults may be prefilled.

**Given** imported Players include a Role
**When** the operator reviews Role Base Prices
**Then** every imported Role must have a configured Base Price
**And** Start Auction is blocked until every Player Role has a price.

**Given** the operator edits Bid Increment, Team Budgets, Maximum Squad Size, Role Targets, or Manual Assignment budget behavior
**When** the values are saved
**Then** the system validates the parameters as structured Auction Parameters
**And** invalid or incomplete parameters block Start Auction with specific reasons.

**Given** the setup review is displayed
**When** all required source data and Auction Parameters are valid
**Then** the operator sees a parameter summary including role prices, bid increment, budgets, squad cap, role targets, and manual-assignment budget behavior
**And** Start Auction becomes available.

**Given** Start Auction has not yet happened
**When** the operator changes parameters
**Then** changes are allowed and reflected in setup review
**And** no historical auction state exists that could be invalidated.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** domain validation tests, shared schema tests, setup UI/component tests, and typecheck pass
**And** an E2E or acceptance test proves Start Auction remains blocked until required parameters are complete and valid.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks parameter ownership in domain/shared schemas, validation coverage, setup UX, unit tests, and the parameter-blocking E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

### Story 1.6: Start Auction With Persisted Initial State

As an auction operator,
I want to start the auction only after setup is valid,
So that the live event begins with trusted Players, Teams, parameters, and recovery state.

**Acceptance Criteria:**

**Given** setup has missing required Player data, required Team data, unmapped Player categories, missing Role Base Prices, or invalid Auction Parameters
**When** the operator attempts to Start Auction
**Then** Start Auction is blocked
**And** the setup surface shows specific blocking reasons.

**Given** setup has only placeholder-compatible missing photos or logos
**When** required data and parameters are otherwise valid
**Then** Start Auction is allowed
**And** the setup review clearly indicates which placeholders will be used.

**Given** setup is valid
**When** the operator starts the auction
**Then** the system initializes Pending Players, Team Budgets, Squad Sizes, Role Counts, phase state, and Undo History from the configured Auction Parameters
**And** Auction Parameters become locked for the current auction.

**Given** Start Auction succeeds
**When** persistence completes
**Then** the auction state is stored locally with setup data references, Auction Parameters, Team state, Player status, phase state, empty Undo History, action-log entry, and latest snapshot
**And** reopening the app on the same PC can resume from that saved setup-started state.

**Given** Start Auction succeeds
**When** the setup surface transitions to the auction board
**Then** the board shows the Initial Auction phase with no Current Player
**And** Reveal Next Player is the safe next action.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** Start Auction domain tests, persistence transaction/snapshot tests, route schema/conflict tests, setup-to-board UI tests, and typecheck pass
**And** an E2E or acceptance test proves valid setup can start the auction and invalid setup cannot.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks parameter locking, initial state correctness, local persistence/resume behavior, unit/integration tests, and the setup-to-start E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Epic 2: Run the Initial Live Auction Safely

The operator can run Phase 1 from the projected board: reveal randomized role-wise Players, select teams, increase bids, block invalid sales, mark sold/unsold, see team state and current rosters, and recover from ordinary mistakes.

### Story 2.1: Create Persisted Phase 1 Player Order

As an auction operator,
I want the app to prepare the Phase 1 reveal order automatically,
So that Players are revealed in the required role/gender sequence without spreadsheet work.

**Acceptance Criteria:**

**Given** the auction has been started from valid setup data
**When** Initial Auction phase is initialized
**Then** the system groups Pending Players into the configured Phase 1 category order: Ace Men, Ace Women, Women All Rounders, Men Bowlers, Men Batsmen, Men All Rounders
**And** every Player belongs to exactly one Phase 1 category.

**Given** Players exist within a Phase 1 category
**When** the Phase 1 order is generated
**Then** the system randomizes Player order within that category
**And** every Player appears exactly once in the overall Phase 1 order.

**Given** the Phase 1 order has been generated
**When** the app persists auction state
**Then** the full Phase 1 order is stored locally with the auction state
**And** app restart or resume does not reshuffle the order.

**Given** the UI requests auction state
**When** the server returns the board-ready DTO
**Then** the UI can display the active phase and current category/progress without receiving private registration fields.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** domain tests for category grouping, one-time inclusion, randomization boundaries, and unmapped-player rejection pass
**And** persistence tests prove the generated order survives reload without reshuffle.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks that ordering logic lives in `packages/domain`, runs or adds unit and persistence tests, verifies privacy-safe DTO shape, raises findings, and sends blocking issues back for iteration.

### Story 2.2: Reveal Current Player on the Live Board

As an auction operator,
I want to reveal the next pending Player on the live board,
So that the room can see who is currently up for bidding.

**Acceptance Criteria:**

**Given** the Initial Auction phase has pending Players and no Current Player requiring an outcome
**When** the operator selects Reveal Next Player
**Then** the next Player from the persisted Phase 1 order becomes the Current Player
**And** the reveal command is recorded as a reversible live action.

**Given** a Player is revealed
**When** the live board renders
**Then** it shows the Player name, photo or neutral placeholder, Role, Base Price, active phase/category, and phase progress
**And** the Current Bid is initialized from the Player's configured Base Price.

**Given** the revealed Player has no matched photo
**When** the live board renders the Player panel
**Then** the board uses the neutral Player placeholder from the setup media contract
**And** missing media is not styled as a live-event failure.

**Given** the live board renders Current Player state
**When** board DTOs, route responses, rendered UI, logs emitted by the live command, and snapshots produced by the command are inspected
**Then** they contain only allowlisted auction fields needed for the board and roster projections
**And** email, mobile, payment status, payment transaction ID, source timestamp, and ignored source fields are absent outside allowed setup diagnostics.

**Given** there is no Current Player and pending Players remain
**When** the live board renders
**Then** Reveal Next Player is the safe primary action
**And** routine controls are visible without exposing Reset or Close beside live bidding actions.

**Given** a command is in flight
**When** the operator clicks Reveal Next Player repeatedly
**Then** duplicate clicks do not create duplicate reveal mutations
**And** the UI reconciles to the authoritative state returned by the server.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** reveal command domain tests, route/schema tests, board DTO privacy tests, live-board component tests, and typecheck pass
**And** an E2E or acceptance test proves Reveal Next initializes the board and Current Bid correctly.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks command ownership, board privacy, duplicate-command behavior, unit/API tests, and the reveal E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

### Story 2.3: Select Bidding Team From Team Tiles

As an auction operator,
I want to select the Team currently bidding for the revealed Player,
So that the board shows the active bidder and the sale can later be recorded accurately.

**Acceptance Criteria:**

**Given** a Current Player is revealed during Initial Auction
**When** the live board renders Team tiles
**Then** each Team tile shows logo or placeholder, Team name, Captain name, remaining budget, squad count, and Current Player role capacity
**And** the grid remains readable on the mirrored display.

**Given** a Team has no matched logo
**When** the live board renders Team tiles
**Then** that Team tile uses the neutral Team logo placeholder from the setup media contract
**And** missing logo state is not styled as a live-event failure.

**Given** the operator selects a Team tile
**When** the selection command succeeds
**Then** the selected Team is visible on the Auction Board
**And** the state is reconciled from the authoritative server response.

**Given** a Team is already selected
**When** the operator selects a different Team or clears selection
**Then** the selected Team changes or clears
**And** the change is recorded as a reversible live action.

**Given** a selected Team cannot currently buy the Current Player due to budget, squad, or role capacity
**When** Team tiles and capacity indicators render
**Then** the app shows specific capacity state in text near the relevant Team/Mark Sold context
**And** the blocked state is not communicated by color alone.

**Given** keyboard-only operation is used
**When** focus moves through Team tiles
**Then** each tile exposes accessible name, selected state, budget, squad count, and Current Player role capacity
**And** Space activates the focused tile using standard button behavior.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** select-team domain tests, route/schema tests, Team tile component/accessibility tests, and typecheck pass
**And** an E2E or acceptance test proves selecting and changing a Team updates the live board.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks accessibility, board readability, selected-state persistence, unit/API tests, and the Team selection E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

### Story 2.4: Increase Current Bid

As an auction operator,
I want to increase the Current Bid by the configured increment,
So that verbal bidding can be tracked quickly and consistently.

**Acceptance Criteria:**

**Given** a Current Player is revealed during Initial Auction
**When** the live board displays Current Bid
**Then** the bid starts at the Player's configured Role Base Price
**And** the bid value is the largest number on the live surface.

**Given** the operator selects Increase Bid
**When** the command succeeds
**Then** the Current Bid increases by exactly the configured Bid Increment
**And** the board reconciles to the authoritative server response.

**Given** the operator uses the `+` keyboard shortcut while a Current Player is active and focus is not inside a text input
**When** the shortcut is handled
**Then** it performs the same Increase Bid command as the visible control
**And** it does not bypass server validation or duplicate-command protection.

**Given** the Current Bid changes
**When** the live board updates
**Then** bid, budget, squad, and role-count values remain visually stable without layout shift
**And** Live Gold is reserved for the Current Bid and bid increment moment.

**Given** the bid is increased
**When** Undo History is inspected
**Then** the bid change is recorded as a reversible live action.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** increase-bid domain tests, route/schema tests, keyboard/component tests, visual/state update tests, and typecheck pass
**And** an E2E or acceptance test proves each increment adds exactly the configured value.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks domain-owned increment behavior, keyboard safety, layout stability, unit/API tests, and the bid-increment E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

### Story 2.5: Block Invalid Sales With Clear Reasons

As an auction operator,
I want invalid sales to be blocked before they change auction state,
So that budgets, squad size, and role limits stay accurate during the live event.

Implementation boundary: this story introduces the sale-validity rules and the rejected `MarkSold` command path only. It may define the shared `MarkSold` command contract, request schema, conflict response shape, and UI blocked-state behavior, but it must not complete successful sale mutation. Story 2.6 implements the accepted `MarkSold` path using this same contract.

**Acceptance Criteria:**

**Given** a Current Player, selected Team, and Current Bid exist
**When** the selected Team's remaining budget is lower than the Current Bid
**Then** Mark Sold is blocked
**And** the blocked reason clearly states the budget constraint.

**Given** a Current Player and selected Team exist
**When** the selected Team is already at the configured maximum squad size
**Then** Mark Sold is blocked
**And** the blocked reason clearly states the squad capacity constraint.

**Given** a Current Player and selected Team exist
**When** the selected Team is already at the Role Target for the Current Player's Role
**Then** Mark Sold is blocked
**And** the blocked reason clearly states the role capacity constraint.

**Given** Mark Sold is blocked
**When** the operator views the live board
**Then** the reason appears near the selected Team and Mark Sold context
**And** the reason is text, not color alone.

**Given** the operator attempts a blocked sale through API or repeated UI clicks
**When** the command is rejected
**Then** no Player status, Sold Price, winning Team, Team budget, squad count, role count, action log, snapshot, or Undo History mutation occurs
**And** the API returns a conflict-style result that the UI can display calmly.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** domain validation tests for budget, squad, and role limits pass, route conflict tests pass, non-mutation tests pass, component tests for blocked reasons pass, and typecheck passes
**And** an E2E or acceptance test proves invalid sales are blocked with exact reasons and no state mutation.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks that sale validity lives in `packages/domain`, verifies non-mutation behavior, runs or adds unit/API/E2E tests, raises findings, and sends blocking issues back for iteration.

### Story 2.6: Mark Player Sold and Update Team State

As an auction operator,
I want to mark the Current Player sold to the selected Team,
So that the auction board immediately reflects the sale and updated Team state.

**Acceptance Criteria:**

**Given** the `MarkSold` command contract and invalid-sale rejection rules from Story 2.5 exist
**And** a Current Player is revealed, a Team is selected, and no hard-block rule is violated
**When** the operator selects Mark Sold
**Then** the accepted `MarkSold` path records the Player as Sold
**And** the Player records Sold Price and winning Team using the same command, schema, and route contract introduced for rejected sales.

**Given** Mark Sold succeeds
**When** the Team state updates
**Then** the winning Team's remaining budget decreases by Sold Price
**And** the winning Team's Squad Size and Role Count for the Player's Role increase
**And** the Team roster projection includes the sold Player with acquisition type `Sold` and Sold Price.

**Given** Mark Sold succeeds
**When** persistence completes
**Then** the sale is committed atomically with current-state updates, an action-log entry, Undo payload, and latest snapshot
**And** the response returns the new authoritative board-ready state.

**Given** no Team is selected
**When** the operator attempts Mark Sold
**Then** the sale is blocked
**And** no Player, Team, action-log, snapshot, or Undo History mutation occurs.

**Given** a sale succeeds
**When** the live board renders
**Then** it shows a calm sale summary such as "Sold to [Team] for [Price]"
**And** Reveal Next Player becomes the safe next action when pending Players remain
**And** Team rosters immediately show the sold Player under the winning Team.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** Mark Sold domain tests, roster projection tests, atomic persistence/action-log/snapshot tests, route/schema tests, live-board component tests, and typecheck pass
**And** an E2E or acceptance test proves a happy-path sale updates Player, Team, roster projection, board, action log, snapshot, and next-action state.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks atomicity, domain-owned sale behavior, roster projection correctness, action-log/Undo payload correctness, unit/integration/API tests, and the happy-path sale E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

### Story 2.7: Mark Player Unsold Into Phase 2 Pool

As an auction operator,
I want to mark the Current Player unsold during Phase 1,
So that the Player can be rebid later without changing Team budgets or counts.

**Acceptance Criteria:**

**Given** a Current Player is revealed during Initial Auction
**When** the operator selects Mark Unsold
**Then** the Player status becomes Unsold
**And** the Player is added to the Phase 2 Unsold Bidding pool.

**Given** Mark Unsold succeeds in Phase 1
**When** Team state is inspected
**Then** Team Budget, remaining budget, Squad Size, and Role Counts do not change
**And** no winning Team or Sold Price is recorded for the Player.

**Given** Mark Unsold succeeds
**When** persistence completes
**Then** the unsold outcome is committed atomically with current-state updates, an action-log entry, Undo payload, and latest snapshot
**And** the response returns the new authoritative board-ready state.

**Given** Mark Unsold succeeds and pending Phase 1 Players remain
**When** the live board renders
**Then** the board shows a calm unsold summary
**And** Reveal Next Player becomes the safe next action.

**Given** Mark Unsold succeeds and no Phase 1 pending Players remain
**When** the live board renders
**Then** the board shows Phase 1 completion state
**And** exposes the future transition path to Unsold Bidding without starting it automatically.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** Mark Unsold domain tests, no-budget/count-mutation tests, persistence/action-log/snapshot tests, route/schema tests, live-board component tests, and typecheck pass
**And** an E2E or acceptance test proves a Phase 1 unsold Player moves to the Phase 2 pool without mutating Team state.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks unsold pool movement, non-mutation of Team state, action-log/Undo payload correctness, unit/integration/API tests, and the Mark Unsold E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

### Story 2.8: Persist and Resume Phase 1 Live State

As an auction operator,
I want Phase 1 live auction state to survive app refresh or restart,
So that the event can recover without returning to Excel or restarting the auction.

**Acceptance Criteria:**

**Given** any Phase 1 state-changing command succeeds
**When** persistence completes
**Then** local state stores Auction Parameters, Phase 1 order, current phase/category, Current Player if any, Current Bid, selected Team, Player statuses, winning Team assignments, Sold Prices, Team budgets, Squad Sizes, Role Counts, Undo History, action log, and latest snapshot
**And** current Team rosters can be reconstructed from authoritative Player assignment state.

**Given** the app is closed or browser refreshes during Phase 1
**When** the operator reopens Auction Manager on the same PC
**Then** the Resume/Start surface shows saved phase, last saved action, and resume path
**And** resume restores the latest authoritative Phase 1 state.

**Given** Phase 1 order was generated before restart
**When** the auction is resumed
**Then** Player order is not reshuffled
**And** already sold or unsold Players are not returned to the pending pool.

**Given** a Current Player was revealed before restart
**When** the auction is resumed
**Then** the board restores the same Current Player, Current Bid, selected Team if any, and valid next actions
**And** no duplicate reveal or outcome action is inferred by resume.

**Given** sold Players existed before restart
**When** the auction is resumed and the operator opens Team rosters
**Then** each sold Player appears under the correct Team with Role, acquisition type, and price when applicable.

**Given** a local write failure occurs after a mutating command attempt
**When** the UI receives the failure state
**Then** further state-changing actions are blocked until retry or a safe recovery path is clear
**And** the operator sees calm, specific recovery copy.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** persistence transaction tests, resume reconstruction tests, roster reconstruction tests, snapshot tests, write-failure tests, Resume/Start UI tests, and typecheck pass
**And** an E2E or acceptance test proves refresh/reopen resumes Phase 1 state and Team rosters without reshuffle or data loss.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks persisted fields, action-log/snapshot consistency, write-failure behavior, unit/integration tests, and the Phase 1 resume E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

### Story 2.9: Undo Phase 1 Live Actions

As an auction operator,
I want to undo recent Phase 1 live actions,
So that ordinary bidding mistakes can be corrected while the room is watching.

**Acceptance Criteria:**

**Given** the operator has performed reversible Phase 1 actions
**When** the live board renders Undo
**Then** Undo shows the last reversible action summary
**And** Undo is disabled with `No actions to undo.` when history is empty.

**Given** the last action was Reveal Next Player
**When** the operator performs Undo
**Then** the Current Player is returned to the correct pending state
**And** Current Bid and selected Team return to the previous state.

**Given** the last action was Select Team or Increase Bid
**When** the operator performs Undo
**Then** selected Team or Current Bid is restored to the prior value
**And** other Player and Team state remains unchanged.

**Given** the last action was Mark Sold
**When** the operator performs Undo
**Then** the Player is no longer sold, Sold Price and winning Team are cleared, Team budget is restored, Squad Size and Role Count are decremented, roster projection removes the Player from the Team, phase/pending state is restored, and the board returns to the correct prior state.

**Given** the last action was Mark Unsold
**When** the operator performs Undo
**Then** the Player is removed from the Phase 2 Unsold Bidding pool
**And** Current Player, pending state, and Team state are restored correctly.

**Given** Undo succeeds
**When** persistence completes
**Then** undo is committed atomically with current-state updates, action-log entry, updated Undo History, and latest snapshot
**And** the response returns authoritative board-ready and roster-ready state.

**Given** keyboard-only operation is used
**When** the operator uses `u` or focuses Undo
**Then** Undo is reachable and operable without a pointer
**And** it never affects Reset Auction or Close Auction.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** domain undo tests for reveal, select team, increase bid, sold, and unsold pass; persistence/action-log/snapshot tests pass; route/schema tests pass; Undo UI/accessibility tests pass; and typecheck passes
**And** an E2E or acceptance test proves undo after sale restores Player, Team, roster projection, bid, phase, board, action log, and snapshot state.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks action-log inverse/before-after behavior, full state restoration including roster projection, Undo scope exclusions, unit/integration/API tests, and the undo-after-sale E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

### Story 2.10: View Team Rosters During the Auction

As an auction operator,
I want to switch between the live board and current Team rosters,
So that captains and attendees can inspect bought Players without leaving Auction Manager.

**Acceptance Criteria:**

**Given** the auction is in a live phase
**When** the live surface renders
**Then** a compact Board/Rosters switch is visible and keyboard reachable before the main surface content
**And** changing the switch never creates an auction state mutation.

**Given** the operator switches to Team rosters
**When** roster state renders
**Then** every Team appears with logo or placeholder, Team name, Captain, remaining budget, squad count, role counts, and current roster
**And** empty Teams remain visible with `No players bought yet.`

**Given** a Team has bought Players
**When** roster rows render
**Then** each row shows Player name, Role, acquisition type `Sold`, and Sold Price
**And** no private registration fields appear in roster DTOs or UI.

**Given** the operator opens a Team detail drawer from a Team tile
**When** the drawer renders
**Then** it shows that Team's budget, squad, role counts, roster, and current capacity reasons
**And** the drawer is read-only during live flow.

**Given** the operator switches from Rosters back to Board
**When** the board renders
**Then** the previous authoritative Current Player, Current Bid, selected Team, and next safe action are preserved
**And** no reveal, bid, sale, unsold, or undo command is triggered by the view switch.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** roster projection tests, roster DTO privacy tests, Board/Rosters switch component tests, Team roster accessibility tests, and typecheck pass
**And** an E2E or acceptance test proves sold Players appear in current Team rosters and switching views does not mutate auction state.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks roster projection source-of-truth, privacy allowlist, accessibility, view-switch non-mutation behavior, unit/component/API tests, and the roster-view E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Epic 2.5: Implement the Epic 2 UI Redesign Before Unsold Resolution

The operator gets the approved red/black event-console UI from the Epic 2 redesign review applied across the current live board and future-facing Phase 3/closed roster surfaces before Epic 3 adds unsold bidding and manual-assignment behavior.

Implementation boundary: Epic 2.5 is a UI/UX implementation bridge. It may reshape components, view composition, styling tokens, interaction layout, visual QA, and E2E selectors for the redesigned surfaces. It must not change domain rules, persistence semantics, auction command contracts, randomized order behavior, undo semantics, or privacy allowlists except where tests expose an existing mismatch.

### Story 2.5.1: Apply Red/Black Event Console Tokens and App Frame

As an auction operator,
I want the live app to use the approved event-console visual system,
So that the board feels purpose-built for the room before unsold-player workflows are added.

**Acceptance Criteria:**

**Given** the app renders any post-setup live surface
**When** the visual shell loads
**Then** it uses the red/black event-console tokens from `DESIGN.md`
**And** it no longer presents the earlier green/gold live-board palette as the primary Epic 2+ experience.

**Given** common live surfaces render
**When** colors, borders, radii, typography, and spacing are inspected
**Then** they match the structural hierarchy of `mockups/epic-2-redesign-review.html`
**And** command red, live red, off-white text, dark raised panels, and compact metric cells are used consistently.

**Given** controls use icons
**When** buttons render
**Then** Lucide icons are used where available
**And** icon-only affordances have accessible names or adjacent visible labels according to the UX accessibility floor.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** build, typecheck, component tests for tokenized shell/components, and at least one Playwright screenshot capture of the live frame pass.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks design-token consistency, accessibility names, visual drift from the redesign mockup, and regression risk to existing Epic 2 behavior.

### Story 2.5.2: Redesign the Live Auction Board Layout

As an auction operator,
I want the live auction board to match the approved compact event-console layout,
So that Current Player, Current Bid, commands, and all Teams remain visible under live pressure.

**Acceptance Criteria:**

**Given** the auction is in Initial Auction with a Current Player
**When** the live board renders at 1440x900 and 1366x768
**Then** the first viewport shows the top status counters, Current Player stage, dominant Current Bid, fixed command strip, selected Team state, Team matrix, and blocked reason area
**And** eight Team cards remain visible without pushing routine commands below the first viewport.

**Given** the live board renders top counters
**When** auction state changes
**Then** ordered, revealed, pending, unsold, category, and team-count metrics update from authoritative state
**And** numeric changes use stable dimensions without shifting the command strip or Team matrix.

**Given** routine commands render
**When** commands are enabled, disabled, pending, or recently completed
**Then** Next/Reveal, Bid Increment, Sold, Unsold, and Undo stay in a stable fixed-height command strip
**And** disabled controls do not disappear in a way that changes muscle memory.

**Given** Team cards render
**When** a Team is selected or blocked for the Current Player
**Then** selected state uses the approved red treatment
**And** blocked Team reasons remain visible as text near the Team matrix and Mark Sold context.

**Given** the board renders private imported data
**When** DTOs, UI, logs, and snapshots are inspected
**Then** the existing privacy allowlist remains enforced
**And** no redesign element introduces email, mobile, payment, transaction, source timestamp, or ignored source fields.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** live-board component tests, accessibility tests, existing Epic 2 command E2E tests, and Playwright screenshots at 1440x900 and 1366x768 pass.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks first-viewport fit, command stability, selected/blocked Team readability, privacy, keyboard operation, and regression risk to reveal, bid, sold, unsold, and undo flows.

### Story 2.5.3: Prepare the Focused Manual Assignment Surface

As an auction operator,
I want the manual-assignment UI shell ready before Epic 3 implements assignment behavior,
So that Epic 3 can add domain commands into an approved, uncluttered surface.

**Acceptance Criteria:**

**Given** the app can render a Manual Assignment phase fixture or mocked authoritative state
**When** the Manual Assignment surface appears
**Then** it follows the redesign structure: top assignment counters, assignment player card, assignment pool list, eligible Team matrix, bottom blocked-reason panel, and one primary assignment command
**And** routine bidding controls are hidden from this surface.

**Given** the assignment pool list renders
**When** unresolved Players are present
**Then** each row shows order, Player name, and Role only
**And** no private imported fields are exposed.

**Given** eligible and blocked Teams render
**When** the operator selects a Team or a Team is invalid
**Then** selected and blocked states match the redesigned Team matrix
**And** exact blocked reasons are visible as text outside hover-only UI.

**Given** Epic 3 domain behavior is not implemented yet
**When** this story is completed
**Then** any fixture/demo state is isolated to tests, story fixtures, or development-only rendering paths
**And** no fake assignment mutation is added to production command behavior.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** component tests, accessibility tests, privacy checks, and Playwright screenshot coverage for the Manual Assignment surface pass.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks that this is UI preparation only, no domain/persistence shortcuts were introduced, bidding controls are absent, and Epic 3 can wire real assignment state into the surface.

### Story 2.5.4: Redesign Rosters and Closed-State Display

As an auction operator,
I want roster and final closed-auction screens to match the approved dense room-facing design,
So that the room can inspect Teams without returning to Excel.

**Acceptance Criteria:**

**Given** the operator switches to Rosters during a live phase
**When** the roster surface renders
**Then** it uses the redesigned dark roster board with compact Team cards
**And** every Team remains visible with logo or placeholder, Team name, Captain, budget, squad, relevant role count, and roster rows.

**Given** roster rows render
**When** Players have been sold or assigned
**Then** rows show Player name, Role where space requires it, acquisition type, and price when applicable
**And** row density stays readable without turning each Player into a large decorative card.

**Given** Close Auction succeeds in later Epic 4 behavior
**When** the phase is `Closed`
**Then** the redesigned roster surface is the default room-facing final surface
**And** routine live controls remain disabled or absent.

**Given** the Board/Rosters switch renders
**When** the operator changes views
**Then** the switch is keyboard reachable, non-mutating, and styled consistently with the redesigned event-console frame.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** roster component tests, Board/Rosters switch non-mutation tests, privacy checks, accessibility checks, and Playwright screenshots for live roster and Closed fixtures pass.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks all-Team visibility, row readability, closed-state readiness, privacy, non-mutation behavior, and consistency with the redesign mockup.

### Story 2.5.5: Clarify Bid Leader and Event Timeline

As an auction operator,
I want selecting a Team to record that Team's bid at the current value and make the leading Team obvious,
So that I can run verbal bidding without reading the log or interpreting redundant selection chrome.

**Acceptance Criteria:**

**Given** a Current Player is revealed and the Current Bid is 6
**When** the operator selects `Warriors`
**Then** the system records a bid event that `Warriors bid 6`
**And** `Warriors` becomes the current leading Team for the Current Player.

**Given** a different Team is already leading at the Current Bid
**When** the operator selects another valid Team
**Then** the leading Team changes to the newly selected Team at the same Current Bid
**And** the event timeline records the new Team bid value without requiring a bid increment first.

**Given** the operator increases the Current Bid
**When** no Team has been selected at the increased value yet
**Then** the board makes clear that the Current Bid needs a Team bid record
**And** the previous leading Team is not visually presented as having bid the new value unless that is the intended domain behavior and tests explicitly preserve it.

**Given** Team cards render during bidding
**When** one Team is the current leader
**Then** that Team is visually highlighted with a strong border, glow, badge, or accent background
**And** the auctioneer can identify the leader without reading the event timeline.

**Given** the Team matrix header renders
**When** the board is in a live bidding phase
**Then** the header no longer shows a selected-Team icon or selected-Team label beside the Teams title
**And** the Teams title no longer shows the count of Teams.

**Given** the live board section headers render
**When** Current Player, Teams, event timeline, roster, or command sections appear
**Then** section headers are noticeably larger and more scannable than the surrounding body text
**And** the change does not cause truncation, overlap, or loss of first-viewport fit at 1440x900 and 1366x768.

**Given** live actions occur
**When** the event timeline renders
**Then** it shows timestamped events such as `10:42 PM - Sold Stuti Jude to Warriors for 6`, `10:41 PM - Warriors bid 6`, `10:41 PM - Tigers bid 4`, and `10:40 PM - Revealed Stuti Jude`
**And** the latest event is visually emphasized compared with earlier entries.

**Given** timeline events render
**When** event types are displayed
**Then** sold events use green/positive treatment, reveal events use gray/neutral treatment, unsold events use red or orange treatment, and bid-change or Team-bid events use blue treatment
**And** color is not the only cue for event type.

**Given** the operator marks the Current Player sold
**When** the sale succeeds
**Then** the timeline records the sold event using the current leading Team and Current Bid
**And** prior Team bid events remain visible in reverse chronological order.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** typecheck, unit/component tests for bid-leader display and timeline rendering, relevant domain/API tests for bid-leader action log semantics, accessibility checks, and focused E2E coverage for reveal, select-Team-as-bid, increase bid, leader highlight, mark sold, undo, and timeline ordering pass.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks bid-leader semantics, undo restoration, timeline ordering and colors, leader highlight readability, removed Teams-header clutter, larger section headers, accessibility, privacy, and regression risk to reveal, bid, sold, unsold, roster switching, and resume flows.

## Epic 3: Resolve Unsold Players

The operator can start Phase 2 unsold rebidding, use normal bidding controls for randomized unsold Players, then manually assign remaining unsold Players to valid Teams in Phase 3 with roster projections kept current.

### Story 3.1: Start Unsold Bidding With Persisted Random Order

As an auction operator,
I want to start a randomized second bidding phase for Phase 1 unsold Players,
So that unsold Players get a fair rebid pass before manual assignment.

**Acceptance Criteria:**

**Given** Initial Auction has no pending Phase 1 Players and at least one Phase 1 unsold Player
**When** the operator opens the phase transition review
**Then** the app shows the unsold Player count
**And** explains that Phase 2 order will be randomized and persisted.

**Given** Phase 1 pending Players still remain
**When** the operator attempts to start Unsold Bidding
**Then** the app blocks the normal transition
**And** requires an explicit skip confirmation that lists skipped Players and records the skip as undoable state.

**Given** the operator confirms Start Unsold Bidding
**When** the command succeeds
**Then** the auction phase becomes `UnsoldBidding`
**And** the system creates one randomized Phase 2 order containing each Phase 1 unsold Player exactly once.

**Given** the Phase 2 order is created
**When** persistence completes
**Then** the randomized order, phase state, skipped-player state if any, action-log entry, Undo payload, and latest snapshot are stored locally
**And** restart/resume does not reshuffle Phase 2 order.

**Given** Unsold Bidding starts successfully
**When** the live board renders
**Then** it shows `Unsold Bidding`, the Phase 2 unsold progress, no Current Player, and Reveal Next Player as the safe next action.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** phase-transition domain tests, random-order tests, skip-path tests, persistence/snapshot tests, route/schema tests, UI transition-review tests, and typecheck pass
**And** an E2E or acceptance test proves Unsold Bidding starts only through valid transition or explicit skip and preserves order after restart.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks domain-owned phase transition logic, persisted random order, skip undo payload, unit/integration/API tests, and the Unsold Bidding transition E2E gate, raises findings, and sends blocking issues back for iteration.

### Story 3.2: Run Phase 2 Reveal and Bidding Controls

As an auction operator,
I want Phase 2 to use the same reveal and bidding controls as Phase 1,
So that unsold rebidding stays fast and familiar during the live event.

**Acceptance Criteria:**

**Given** the auction is in `UnsoldBidding` with pending Phase 2 Players and no Current Player requiring an outcome
**When** the operator selects Reveal Next Player
**Then** the next Player from the persisted Phase 2 order becomes the Current Player
**And** the reveal is recorded as a reversible live action.

**Given** a Phase 2 Player is revealed
**When** the live board renders
**Then** it shows the Player name, photo or placeholder, Role, Base Price, `Unsold Bidding` phase label, and unsold progress
**And** the Current Bid starts from the Player's configured Base Price.

**Given** a Phase 2 Player is revealed
**When** the operator selects a Team, increases the bid, or uses the `+` shortcut
**Then** the same Team selection, capacity indicators, bid increment, duplicate-command protection, keyboard behavior, and authoritative-state reconciliation from Phase 1 apply.

**Given** the operator switches to Team rosters during Phase 2
**When** roster state renders
**Then** all current sold Players remain visible under their Teams
**And** view switching does not mutate Phase 2 reveal, bid, selected Team, or pending order state.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** Phase 2 reveal domain tests, bid/team command reuse tests, route/schema tests, component/accessibility tests, roster-view non-mutation tests, and typecheck pass
**And** an E2E or acceptance test proves Phase 2 reveal and bid controls behave like Phase 1 while preserving the Phase 2 order.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks Phase 2 uses domain-owned command behavior, verifies no duplicate Phase 1 logic drift, runs or adds unit/API/E2E tests, raises findings, and sends blocking issues back for iteration.

### Story 3.3: Record Phase 2 Sold or Unsold Outcomes

As an auction operator,
I want to record sold or unsold outcomes during Phase 2,
So that rebid Players either join a Team roster or move to manual assignment.

**Acceptance Criteria:**

**Given** a Phase 2 Current Player is revealed, a Team is selected, and no hard-block rule is violated
**When** the operator selects Mark Sold
**Then** the Player status becomes Sold
**And** the Player records Sold Price, winning Team, and acquisition type `Sold`.

**Given** a Phase 2 sale succeeds
**When** Team state updates
**Then** the winning Team's remaining budget decreases by Sold Price
**And** the winning Team's Squad Size, Role Count, and roster projection update exactly as they do for a Phase 1 sale.

**Given** a Phase 2 sale would violate budget, squad, or role limits
**When** the operator attempts Mark Sold
**Then** the sale is hard-blocked with the exact reason
**And** no Player, Team, roster, action-log, snapshot, or Undo History mutation occurs.

**Given** a Phase 2 Current Player is revealed
**When** the operator selects Mark Unsold
**Then** the Player moves to the Phase 3 Manual Assignment pool
**And** Team Budget, Squad Size, Role Counts, and Team rosters do not change.

**Given** a Phase 2 outcome succeeds
**When** persistence completes
**Then** state updates, action-log entry, Undo payload, latest snapshot, and authoritative board/roster DTOs are committed atomically
**And** the board shows the next safe action.

**Given** Phase 2 pending Players are exhausted
**When** the live board renders
**Then** it shows Phase 2 completion state
**And** exposes the future transition path to Manual Assignment without starting it automatically.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** Phase 2 Mark Sold tests, Phase 2 Mark Unsold tests, hard-block non-mutation tests, roster projection tests, persistence/action-log/snapshot tests, route/schema tests, UI tests, and typecheck pass
**And** an E2E or acceptance test proves a Phase 2 sale updates Team roster while a Phase 2 unsold Player moves to Phase 3 pool without Team mutation.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks outcome transitions, roster projection updates, non-mutation on blocked or unsold outcomes, unit/integration/API tests, and the Phase 2 outcome E2E gate, raises findings, and sends blocking issues back for iteration.

### Story 3.4: Undo and Resume Unsold Bidding

As an auction operator,
I want Undo and resume to work during Phase 2,
So that second-phase bidding mistakes or restarts do not corrupt unsold resolution.

**Acceptance Criteria:**

**Given** the auction is in `UnsoldBidding`
**When** the operator performs reversible Phase 2 actions
**Then** reveal, select Team, increase bid, Mark Sold, Mark Unsold, Start Unsold Bidding, and explicit skip actions appear in Undo History with clear action summaries.

**Given** the last Phase 2 action was Mark Sold
**When** the operator performs Undo
**Then** the Player is no longer sold, Sold Price and winning Team are cleared, Team budget is restored, Squad Size and Role Count are decremented, roster projection removes the Player, Phase 2 pending/current state is restored, and the board returns to the prior state.

**Given** the last Phase 2 action was Mark Unsold
**When** the operator performs Undo
**Then** the Player is removed from the Phase 3 Manual Assignment pool
**And** Phase 2 current/pending state and Team state are restored correctly.

**Given** the last action was Start Unsold Bidding or an explicit skip transition
**When** the operator performs Undo
**Then** phase state, skipped-player state, Phase 2 order, pending pools, and board state are restored to the prior Initial Auction state.

**Given** the app is closed or browser refreshes during Phase 2
**When** the operator resumes on the same PC
**Then** the same Phase 2 order, Current Player, Current Bid, selected Team, pending Players, Phase 3 pool, Undo History, and Team rosters are restored
**And** the Phase 2 order is not reshuffled.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** Phase 2 undo domain tests, transition undo tests, roster restoration tests, resume reconstruction tests, persistence/action-log/snapshot tests, route/schema tests, UI/accessibility tests, and typecheck pass
**And** an E2E or acceptance test proves undo after Phase 2 sale and restart during Phase 2 restore board and roster state.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks action-log inverse/before-after behavior for Phase 2, persisted random order stability, roster restoration, unit/integration/API tests, and the Phase 2 undo/resume E2E gate, raises findings, and sends blocking issues back for iteration.

### Story 3.5: Start Manual Assignment Phase

As an auction operator,
I want to start Manual Assignment after Phase 2 is complete,
So that Players still unsold after rebidding can be resolved deliberately.

**Acceptance Criteria:**

**Given** `UnsoldBidding` has no pending Phase 2 Players and at least one Phase 3 Manual Assignment Player
**When** the operator opens the phase transition review
**Then** the app shows the Phase 3 assignment count
**And** explains that Manual Assignment is operator-selected, not random.

**Given** Phase 2 pending Players still remain
**When** the operator attempts to start Manual Assignment
**Then** the app blocks the normal transition
**And** requires an explicit skip confirmation that lists skipped Players and records the skip as undoable state.

**Given** the operator confirms Start Manual Assignment
**When** the command succeeds
**Then** the auction phase becomes `ManualAssignment`
**And** the board/manual-assignment surface shows the first unresolved Phase 3 Player with bidding controls hidden or disabled.

**Given** Manual Assignment starts successfully
**When** persistence completes
**Then** phase state, unresolved assignment pool, skipped-player state if any, action-log entry, Undo payload, latest snapshot, and authoritative board/roster DTOs are stored locally.

**Given** the Manual Assignment surface renders
**When** the operator reviews available actions
**Then** it shows assignment-specific Team selection and Assign controls
**And** it does not show bid increment or Mark Sold as routine actions.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** phase-transition domain tests, skip-path tests, assignment-pool tests, persistence/snapshot tests, route/schema tests, manual-assignment UI tests, and typecheck pass
**And** an E2E or acceptance test proves Manual Assignment starts only through valid transition or explicit skip and hides bidding controls.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks domain-owned phase transition logic, skip undo payload, assignment-only UI behavior, unit/integration/API tests, and the Manual Assignment transition E2E gate, raises findings, and sends blocking issues back for iteration.

### Story 3.6: Assign Unsold Player to a Valid Team

As an auction operator,
I want to manually assign an unresolved Player to a valid Team,
So that all remaining Players can be placed without breaking squad or role rules.

**Acceptance Criteria:**

**Given** the auction is in `ManualAssignment` with an unresolved Player
**When** the surface renders
**Then** the Player appears with name, photo or placeholder, Role, and assignment status
**And** bidding controls are hidden or disabled.

**Given** the operator selects a Team for assignment
**When** eligibility is calculated
**Then** the system permits assignment only if the Team can accept the Player under maximum squad size, Role Target, and configured manual-assignment budget behavior
**And** invalid Team reasons are shown as text, not color alone.

**Given** a valid Team is selected
**When** the operator confirms Assign
**Then** the Player leaves the Phase 3 Manual Assignment pool
**And** the receiving Team's Squad Size, Role Count, and roster projection update.

**Given** the v1 default manual-assignment budget behavior is `NoBudgetImpact`
**When** the assignment succeeds
**Then** the receiving Team's budget does not change
**And** the roster row shows acquisition type `Assigned` with no price unless a configured budget behavior records one.

**Given** assignment succeeds
**When** persistence completes
**Then** current-state updates, action-log entry, Undo payload, latest snapshot, and authoritative board/roster DTOs are committed atomically.

**Given** the operator opens Team rosters after assignment
**When** roster state renders
**Then** the assigned Player appears under the receiving Team with Role and acquisition type `Assigned`
**And** no private registration fields appear.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** assignment eligibility domain tests, `NoBudgetImpact` tests, roster projection tests, persistence/action-log/snapshot tests, route/schema tests, manual-assignment UI tests, and typecheck pass
**And** an E2E or acceptance test proves assigning a valid Player updates Team counts and roster without changing budget by default.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks domain-owned eligibility, budget behavior, roster projection, atomic persistence, unit/integration/API tests, and the valid assignment E2E gate, raises findings, and sends blocking issues back for iteration.

### Story 3.7: Handle Unassignable Players and Manual Assignment Completion

As an auction operator,
I want the app to identify unresolved Players and completion state during Manual Assignment,
So that I know when the auction can safely move toward closing.

**Acceptance Criteria:**

**Given** an unresolved Player has no valid receiving Team
**When** the Manual Assignment surface renders
**Then** assignment is blocked for that Player
**And** the app shows exact reasons grouped by budget behavior if relevant, squad capacity, and role capacity.

**Given** some Teams are valid and some are invalid for the unresolved Player
**When** the operator reviews Team options
**Then** valid Teams remain selectable
**And** invalid Teams expose their reason without hiding the Team.

**Given** the operator assigns a Player successfully
**When** more unresolved Players remain
**Then** the next unresolved Player becomes available for assignment
**And** the Phase 3 remaining count updates from authoritative state.

**Given** no unresolved Players remain
**When** the Manual Assignment surface renders
**Then** it shows Manual Assignment completion state
**And** exposes the future Close Auction path without closing automatically.

**Given** unresolved Players remain but none have a valid Team
**When** the operator reviews Manual Assignment state
**Then** the app lists unresolved Players and reasons
**And** the operator can stop before Close Auction without silently assigning or dropping Players.

**Given** Team rosters are visible during or after Manual Assignment
**When** assignment state changes
**Then** roster projections reflect assigned Players and unresolved Players remain absent from Team rosters
**And** empty Team roster sections remain visible.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** no-valid-team domain tests, completion-state tests, unresolved-player reason tests, roster projection tests, manual-assignment UI/component tests, and typecheck pass
**And** an E2E or acceptance test proves unassignable Players are explained and completion state appears only when all resolvable assignment work is done.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks unresolved-player handling, completion gating, roster projection behavior, unit/component/API tests, and the manual-assignment completion E2E gate, raises findings, and sends blocking issues back for iteration.

### Story 3.8: Undo and Resume Manual Assignment

As an auction operator,
I want Undo and resume to work during Manual Assignment,
So that assignment mistakes or restarts do not corrupt final Team rosters.

**Acceptance Criteria:**

**Given** the auction is in `ManualAssignment`
**When** the operator performs reversible Manual Assignment actions
**Then** Start Manual Assignment, explicit skip, Team selection, and Assign Player actions appear in Undo History with clear action summaries.

**Given** the last action was Assign Player
**When** the operator performs Undo
**Then** the Player is removed from the receiving Team roster projection
**And** Squad Size, Role Count, budget effect if configured, unresolved assignment pool, Current Player, phase state, action log, and snapshot return to the prior state.

**Given** the last action was selecting a Team for assignment
**When** the operator performs Undo
**Then** the selected Team returns to the prior selection state
**And** no Player, Team roster, count, budget, or assignment pool mutation occurs.

**Given** the last action was Start Manual Assignment or an explicit skip transition
**When** the operator performs Undo
**Then** phase state, skipped-player state, Phase 3 pool, Phase 2 completion state, and board/manual-assignment surface return to the prior state.

**Given** the app is closed or browser refreshes during Manual Assignment
**When** the operator resumes on the same PC
**Then** the same phase, unresolved assignment pool, Current Player, selected Team if any, Team budgets, Squad Sizes, Role Counts, Team rosters, Undo History, and last saved action are restored
**And** Players are not sent back to Phase 2.

**Given** a local write failure occurs during assignment
**When** the UI receives the failure state
**Then** further state-changing actions are blocked until retry or a safe recovery path is clear
**And** roster projections do not display uncommitted assignments as final state.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** Manual Assignment undo tests, transition undo tests, roster restoration tests, resume reconstruction tests, write-failure tests, persistence/action-log/snapshot tests, route/schema tests, UI/accessibility tests, and typecheck pass
**And** an E2E or acceptance test proves undo after assignment and restart during Manual Assignment restore board and roster state.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks action-log inverse/before-after behavior for Manual Assignment, full roster restoration, resume correctness, unit/integration/API tests, and the Manual Assignment undo/resume E2E gate, raises findings, and sends blocking issues back for iteration.

## Epic 4: Finish, Reset, and Rehearse Event Safety

The operator can safely reset or close the auction through separated dangerous controls, resume trusted local state, display final Team rosters, and rely on final quality gates before live use.

### Story 4.1: Separate Dangerous Operations From Live Controls

As an auction operator,
I want Reset Auction and Close Auction kept away from routine live controls,
So that I do not accidentally end or reset the auction while people are watching.

Implementation boundary: this story owns separated dangerous-operation navigation, confirmation modal shells, cancellation behavior, accessibility, focus management, and proof that opening or cancelling these controls does not mutate auction state. Stories 4.2 and 4.3 own Reset Auction and Close Auction command execution, persistence, Undo exclusion, and committed authoritative state changes.

**Acceptance Criteria:**

**Given** the auction is in any post-setup phase
**When** the live board, Team rosters, Unsold Bidding, or Manual Assignment surface renders
**Then** Reset Auction and Close Auction are not shown beside routine actions like Reveal Next, Increase Bid, Mark Sold, Mark Unsold, Assign, or Undo
**And** routine controls remain visually easier to reach than dangerous actions.

**Given** the operator opens the separated Dangerous Operations area
**When** the menu or management surface renders
**Then** it contains Reset Auction and Close Auction only
**And** opening the area does not mutate auction state.

**Given** keyboard-only operation is used
**When** focus reaches the Dangerous Operations area
**Then** the controls have accessible names and visible labels
**And** Enter or Space opens the relevant confirmation flow without executing the dangerous operation immediately.

**Given** a confirmation modal is opened for Reset or Close
**When** the modal renders
**Then** it states that Undo cannot reverse the operation
**And** Escape or Cancel returns to the prior board or roster view with no state change.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** dangerous-menu component tests, accessibility tests, non-mutation tests, routing/state tests, and typecheck pass
**And** an E2E or acceptance test proves Reset and Close are separated from routine controls and cannot execute without confirmation.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks control separation, keyboard/accessibility behavior, non-mutation behavior, unit/component tests, and the dangerous-controls E2E gate, raises findings, and sends blocking issues back for iteration.

### Story 4.2: Reset Auction With Explicit Confirmation

As an auction operator,
I want Reset Auction to require deliberate confirmation,
So that accidental clicks cannot erase or restart live auction progress.

**Acceptance Criteria:**

**Given** the operator opens Reset Auction confirmation
**When** the modal renders
**Then** it states that Reset Auction is a dangerous operation
**And** it states that Undo cannot reverse Reset Auction.

**Given** the Reset Auction confirmation is open
**When** the operator cancels, presses Escape, or dismisses the modal safely
**Then** the auction state remains unchanged
**And** the operator returns to the previous board or roster view.

**Given** the operator explicitly confirms Reset Auction
**When** the reset command succeeds
**Then** the auction progress is cleared or restarted according to the configured reset behavior
**And** Reset Auction does not appear in Undo History.

**Given** Reset Auction succeeds
**When** persistence completes
**Then** the reset state, action-log entry, latest snapshot, and authoritative response are committed atomically
**And** stale Current Player, bid, selected Team, pending pools, assignment pools, and live roster projections from the prior auction are not shown as active state.

**Given** a reset command fails during persistence
**When** the UI receives the failure
**Then** the prior auction state remains recoverable
**And** further state-changing actions are blocked until retry or a safe recovery path is clear.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** reset domain tests, Undo exclusion tests, persistence/action-log/snapshot tests, route/schema tests, confirmation UI tests, and typecheck pass
**And** an E2E or acceptance test proves Reset requires confirmation, is excluded from Undo, and clears active live state only after successful commit.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks reset semantics, non-reversibility, persistence failure behavior, unit/integration/API tests, and the Reset confirmation E2E gate, raises findings, and sends blocking issues back for iteration.

### Story 4.3: Close Auction and Display Final Rosters

As an auction operator,
I want to close the auction deliberately and show final Team rosters,
So that the room ends on a useful final state instead of a disabled live board.

**Acceptance Criteria:**

**Given** the operator opens Close Auction confirmation
**When** the modal renders
**Then** it states that Close Auction is a dangerous operation
**And** it states that Undo cannot reverse Close Auction.

**Given** the Close Auction confirmation is open
**When** the operator cancels, presses Escape, or dismisses the modal safely
**Then** the auction phase remains unchanged
**And** the operator returns to the previous board or roster view.

**Given** the operator explicitly confirms Close Auction
**When** the close command succeeds
**Then** the auction phase becomes `Closed`
**And** Close Auction does not appear in Undo History.

**Given** Close Auction succeeds
**When** the UI reconciles to authoritative state
**Then** Team rosters becomes the default final room-facing surface
**And** routine live controls are disabled while final roster state remains readable.

**Given** final Team rosters render after Close Auction
**When** the room inspects the screen
**Then** every Team appears with logo or placeholder, Team name, Captain, remaining budget, squad count, role counts, and final roster
**And** roster rows show Player name, Role, acquisition type `Sold` or `Assigned`, and price when applicable.

**Given** final Team rosters render
**When** DTOs and UI are inspected
**Then** no email, mobile, payment status, transaction ID, source timestamp, or ignored source fields appear
**And** empty Teams remain visible with `No players bought yet.`

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** close domain tests, Undo exclusion tests, final roster projection tests, DTO privacy tests, persistence/action-log/snapshot tests, route/schema tests, UI/accessibility tests, and typecheck pass
**And** an E2E or acceptance test proves Close requires confirmation and switches to final rosters after successful commit.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks close semantics, final roster correctness, privacy allowlist, non-reversibility, unit/integration/API tests, and the Close/final-rosters E2E gate, raises findings, and sends blocking issues back for iteration.

### Story 4.4: Resume Closed or Final Auction State

As an auction operator,
I want a closed auction to reopen in final-read mode,
So that final rosters remain available after the app or browser restarts.

**Acceptance Criteria:**

**Given** the auction has been closed
**When** the app is reopened on the same PC
**Then** the Resume/Start surface shows phase `Closed`, last saved action, and a primary path to view final rosters
**And** it does not offer routine live bidding controls as the primary action.

**Given** the operator resumes a closed auction
**When** final roster state renders
**Then** the same Team rosters, budgets, squad counts, role counts, Sold Players, Assigned Players, acquisition types, and prices are restored from local authoritative state
**And** no Player is returned to pending, unsold bidding, or manual assignment pools.

**Given** the closed auction is resumed
**When** the operator opens Board/Rosters navigation
**Then** Team rosters remains the default final surface
**And** any board view clearly indicates `Closed` and keeps routine live controls disabled.

**Given** the closed auction is resumed
**When** Undo History is inspected
**Then** Reset Auction and Close Auction remain excluded from Undo
**And** no undo action can reopen the closed auction.

**Given** local state is missing, unreadable, or partially inconsistent
**When** the app attempts to resume
**Then** the app shows a clear recovery state
**And** does not display stale or partial final roster data as authoritative.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** closed-state resume tests, final roster reconstruction tests, disabled-control tests, corrupted-state recovery tests, persistence/snapshot tests, UI tests, and typecheck pass
**And** an E2E or acceptance test proves reopening a closed auction displays final rosters without re-enabling live actions.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer checks closed-state persistence, final roster reconstruction, disabled live controls, recovery behavior, unit/integration/component tests, and the closed-resume E2E gate, raises findings, and sends blocking issues back for iteration.

### Story 4.5: Run Event Mode Locally

As an event organizer,
I want the built app to run from one local event-mode process,
So that the event PC can serve the auction UI, API, assets, SQLite state, health endpoint, and snapshots without internet or extra runtime services.

**Acceptance Criteria:**

**Given** the app is built for event mode
**When** the event-mode process starts
**Then** one Fastify process serves the built React app, `/api/*`, `/assets/*`, `/api/health`, SQLite state, normalized assets, and snapshots from `127.0.0.1` by default
**And** no cloud service, hosted database, Docker runtime, account system, public deployment, or manual asset hosting is required.

**Given** event-mode startup runs
**When** startup checks execute
**Then** Node version, data directory writability, database open status, configured asset paths, host binding, and required runtime config are validated before live commands are enabled
**And** failures produce a clear local startup error instead of enabling partial live operation.

**Given** event mode is running
**When** the operator opens the local URL
**Then** the app loads the Resume / Start surface or current authoritative auction state
**And** same-origin API requests, static app assets, uploaded/normalized assets, and the health endpoint are reachable from that process.

**Given** a developer finishes this story
**When** they run the story's Dev Gate
**Then** build, typecheck, event-mode startup tests, health/static/API smoke tests, local SQLite/data-directory startup checks, and a Playwright event-mode smoke test pass.

**Given** the dev agent marks the story complete
**When** a second agent reviews it
**Then** the reviewer reruns or audits event-mode startup, local-only operation, startup failure behavior, smoke evidence, and relevant tests, raises findings, and sends blocking issues back for iteration.
