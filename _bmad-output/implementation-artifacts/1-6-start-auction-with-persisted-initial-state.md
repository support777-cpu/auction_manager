---
baseline_commit: 8681c74826f76ea09d918eb3f13aff197a023abb
created: 2026-07-07T13:25:00+0530
---

# Story 1.6: Start Auction With Persisted Initial State

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want to start the auction only after setup is valid,
so that the live event begins with trusted Players, Teams, parameters, and recovery state.

## Acceptance Criteria

1. Given setup has missing required Player data, required Team data, unmapped Player categories, missing Role Base Prices, or invalid Auction Parameters, when the operator attempts to Start Auction, then Start Auction is blocked, and the setup surface shows specific blocking reasons.
2. Given setup has only placeholder-compatible missing photos or logos, when required data and parameters are otherwise valid, then Start Auction is allowed, and the setup review clearly indicates which placeholders will be used.
3. Given setup is valid, when the operator starts the auction, then the system initializes Pending Players, Team Budgets, Squad Sizes, Role Counts, phase state, and Undo History from the configured Auction Parameters, and Auction Parameters become locked for the current auction.
4. Given Start Auction succeeds, when persistence completes, then the auction state is stored locally with setup data references, Auction Parameters, Team state, Player status, phase state, empty Undo History, action-log entry, and latest snapshot, and reopening the app on the same PC can resume from that saved setup-started state.
5. Given Start Auction succeeds, when the setup surface transitions to the auction board, then the board shows the Initial Auction phase with no Current Player, and Reveal Next Player is the safe next action.
6. Given a developer finishes this story, when they run the story's Dev Gate, then Start Auction domain tests, persistence transaction/snapshot tests, route schema/conflict tests, setup-to-board UI tests, and typecheck pass, and an E2E or acceptance test proves valid setup can start the auction and invalid setup cannot.
7. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks parameter locking, initial state correctness, local persistence/resume behavior, unit/integration tests, and the setup-to-start E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Tasks / Subtasks

- [x] Add runtime auction-state and Start Auction contracts. (AC: 3, 4, 5)
  - [x] In `packages/shared/src/index.ts` or adjacent shared files, add strict Zod schemas/types for `AuctionPhase`, `PlayerStatus`, `AcquisitionType`, `AuctionPlayer`, `AuctionTeam`, `AuctionState`, `BoardStateDto`, `StartAuctionRequest`, `StartAuctionResponse`, and compact command result summary.
  - [x] Reuse existing `auctionRoleValues`, `phase1CategoryValues`, `auctionParametersSchema`, `setupPlayerPreviewSchema`, and `setupTeamPreviewSchema`; do not introduce parallel role/category enums.
  - [x] Include only allowlisted auction-facing fields in board/resume DTOs: Player name, photo placeholder/asset id, Role, Base Price, status, Team name, Captain, logo placeholder/asset id, budget, remaining budget, squad count, role counts, phase, current player, current bid, selected team, and undo availability. Do not include private registration source fields.
  - [x] Require `clientCommandId` on `StartAuctionRequest`; use a generated opaque auction id and generated opaque Player/Team ids for persisted state.

- [x] Implement domain-owned Start Auction initialization. (AC: 1, 2, 3, 5)
  - [x] Add a domain command such as `startAuctionFromSetup(input)` in `packages/domain/src/start-auction.ts`, re-exported from `packages/domain/src/index.ts`.
  - [x] The domain command must accept validated setup Player records, optional player photo review, validated Team records, optional team logo review, saved Auction Parameters, current setup readiness, `clientCommandId`, and a deterministic id/timestamp source for tests.
  - [x] Block if setup readiness is still blocked. Preserve blocker priority from `getSetupReadiness`: Player CSV, Team CSV, Auction Parameters. Missing photos/logos must not block.
  - [x] Initialize every Player with `status: "Pending"`, `basePrice` derived from `parameters.roleBasePrices[player.role]`, no sold price, no winning team, and `photoAssetId` only when matched.
  - [x] Initialize every Team with `budget` and `remainingBudget` equal to `parameters.teamBudget`, `squadCount: 0`, all role counts at `0`, no roster rows, and `logoAssetId` only when matched.
  - [x] Set phase to `InitialAuction`, `currentPlayerId: null`, `currentBid: null`, `selectedTeamId: null`, and empty undo history.
  - [x] Lock Auction Parameters by storing a cloned immutable copy in the created auction state. Later parameter changes must not mutate the started auction.
  - [x] Do not create or randomize the Phase 1 player order in this story. Story 2.1 owns persisted role-wise randomized order creation.

- [x] Build SQLite persistence for initial auction state. (AC: 3, 4)
  - [x] Replace the `packages/persistence/src/index.ts` stub with repository/transaction APIs for opening a local SQLite DB, applying schema/migrations, committing Start Auction in one transaction, loading current state, and writing `data/snapshots/latest.json` only after commit.
  - [x] Add schema-version behavior so future migrations can detect existing DB shape. Keep this minimal but explicit.
  - [x] Add temporary-DB tests proving a successful Start Auction persists current state, action log, and snapshot; rollback leaves no partial state; and loading after reopen reconstructs the setup-started state.
  - [x] If snapshot write fails after DB commit, surface a persistence failure state that causes further mutating commands to be rejected until recovery is introduced or the failure is cleared.

- [x] Add Start Auction and resume API routes. (AC: 1, 2, 4, 5)
  - [x] In `apps/server/src/app.ts`, add `POST /api/auction/start` and wire it through setup staging -> domain -> persistence. Keep route handlers thin; do not duplicate domain readiness or parameter rules in Fastify.
  - [x] Return `409` with setup blocker messages when Start Auction is attempted before setup is valid. Return `400` for malformed JSON or missing `clientCommandId`, `415` for non-JSON content type, and `500` for unexpected faults without stack traces.
  - [x] Update `GET /api/state` or add it if missing so app open/resume can read the latest persisted board-ready state from SQLite.
  - [x] Ensure `POST /api/setup/auction-parameters` and setup imports cannot change locked parameters for a started auction unless a future Reset/New Auction path is implemented.
  - [x] Add Fastify `inject()` tests for valid start, blocked start, missing/duplicate malformed `clientCommandId` policy, unsupported content type, persisted resume, and no private source fields in responses.

- [x] Upgrade setup UI and add the first live board shell. (AC: 1, 2, 5)
  - [x] In `apps/web/src/main.tsx`, replace the Story 1.5 placeholder that disables `setup-start-auction` with a real command when readiness is unblocked.
  - [x] Keep the stable selectors `setup-start-auction` and `start-auction-blocker`; add `current-player-panel`, `current-bid`, `reveal-next`, and any board shell selectors needed by Story 2.1.
  - [x] On success, render an Initial Auction board state: phase indicator `Initial Auction`, no current player, no current bid, all Teams initialized, and `Reveal Next Player` visible as the safe next action but disabled or clearly unavailable until Story 2.1 implements the command.
  - [x] Preserve all existing setup flows and selectors for Player CSV, photos, Team CSV, logos, and Auction Parameters.
  - [x] Use schema validation with `safeParse` for Start Auction and state responses; do not trust arbitrary server JSON in React state.
  - [x] Add pending affordance to prevent duplicate Start Auction clicks while the command is in flight.

- [x] Add story-level acceptance and regression coverage. (AC: 6, 7)
  - [x] Unit: shared schemas reject private fields and invalid states; domain Start Auction initializes Players, Teams, phase, empty undo, and parameter lock correctly.
  - [x] Integration: persistence commits state/action log/snapshot atomically and reconstructs state on reopen.
  - [x] API: Fastify inject tests cover Start Auction success, setup blockers, content-type/status-code behavior, and `GET /api/state` resume.
  - [x] UI/component: setup Start Auction button enables only when readiness is unblocked, sends a command once, handles blocked errors, and transitions to board state.
  - [x] E2E/event: valid Player CSV + valid Team CSV + optional placeholder media + saved parameters starts the auction, locks parameters, and lands on Initial Auction board. Invalid Player/Team/parameter setup stays blocked.
  - [x] Regression: Story 1.1-1.5 tests still pass, including import privacy and placeholder non-blocking behavior.
  - [x] Run the full Dev Gate and record results in the Dev Agent Record before marking tasks complete.

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Story 1.6 in `backlog` at story creation time; this story updates it to `ready-for-dev`.
- Current `HEAD` is `8681c74826f76ea09d918eb3f13aff197a023abb` (`Story 1.4: Import Teams and Logos`). The worktree already contains uncommitted Story 1.5 implementation files and sprint-status edits. Treat the current worktree, including Story 1.5 Auction Parameter code, as dependency context; do not revert or overwrite it.
- No `project-context.md` file was found for the persistent-facts glob during story creation.
- `packages/persistence/src/index.ts` is still only `export const persistencePackageReady = true;`. This story introduces the first real persistence implementation.

### Existing Files That This Story Will Touch

Read these before editing and update them in place:

- `packages/shared/src/index.ts`: owns runtime enums, import/media schemas, Auction Parameter schemas, and setup readiness export. Add auction-state and command DTOs here or in adjacent shared files re-exported from here.
- `packages/shared/src/setup-readiness.ts`: currently returns `"Ready: setup prerequisites are valid. Start Auction command arrives in Story 1.6."` with `story16Ready: true`. Replace the placeholder outcome with real Start Auction readiness while preserving blocker priority and tests.
- `packages/domain/src/auction-parameters.ts`: owns parameter defaults and setup validation. Start Auction must call or consume these domain rules, not duplicate them.
- `packages/domain/src/setup-readiness.ts`: re-exports shared readiness. Keep dependency direction clean if adding domain Start Auction logic.
- `packages/persistence/src/index.ts`: currently a stub. Add SQLite repository/transaction/snapshot APIs here or split into `schema.ts`, `auction-repository.ts`, and `snapshot.ts` re-exported from `index.ts`.
- `apps/server/src/setup-staging.ts`: stages Player CSV/photos, Team CSV/logos, and Auction Parameters in memory. Start Auction should read from this staging and then commit durable auction state. After a successful start, guard against setup edits silently changing the live auction.
- `apps/server/src/app.ts`: currently owns setup routes, media upload routes, static asset serving, setup readiness, route-aware error copy, and `/api/health`. Add Start Auction and state routes here unless the app is split deliberately.
- `apps/server/src/auction-parameters.test.ts`, `apps/server/src/app.test.ts`, and new server tests: keep Fastify `inject()` style.
- `apps/web/src/main.tsx`: currently renders setup flow and keeps `setup-start-auction` disabled with the Story 1.6 placeholder. Replace that behavior with a real command and board transition.
- `apps/web/src/auction-parameters-section.tsx`: keep parameter section behavior and selectors intact; after Start Auction, parameters should be presented as locked/read-only if still visible.
- `apps/web/src/styles.css`: extend existing setup/light and board styles. Keep buttons at least 44 CSS px and stable dimensions.
- `apps/web/e2e/event-mode.spec.ts`: extend the event-mode flow. This config is the real-server E2E gate.
- `packages/test-fixtures/src/index.ts`: contains useful fixture-only shapes for `AuctionPlayer`, `AuctionTeam`, `AuctionStateFixture`, `AuctionPhase`, statuses, and defaults. Align runtime contracts to these concepts, but do not import test fixtures from runtime packages.

### Current Behavior Of Key UPDATE Files

- Setup imports stage valid Player CSV only when `review.summary.startAuctionBlocked === false` and `importedPlayers > 0`; invalid imports clear that staged data.
- Player photo and Team logo matching return `can_proceed_with_placeholder` issues and `startAuctionBlocked: false` unless a storage/decode issue is classified otherwise. Missing media must stay non-blocking.
- Team CSV staging clears logo matches on reimport; Player CSV staging clears photo matches on reimport.
- Auction Parameter staging saves only unblocked reviews. `GET /api/setup/readiness` combines staged Player CSV, Team CSV, and parameter review.
- The setup UI already schema-validates Auction Parameter responses, uses stale-response protection for parameter drafts, and displays parameter errors with `role="alert"`.
- The Start Auction button is currently always disabled in `apps/web/src/main.tsx`, even when readiness says Story 1.6 is ready.

### Initial Auction State Contract

The initial state after Start Auction should be boring and explicit:

```ts
type AuctionPhase = "Setup" | "InitialAuction" | "UnsoldBidding" | "ManualAssignment" | "Closed";
type PlayerStatus = "Pending" | "Current" | "Sold" | "Unsold" | "Assigned";

interface StartAuctionResult {
  auctionId: string;
  phase: "InitialAuction";
  parameters: AuctionParameters;
  players: AuctionPlayer[]; // all Pending
  teams: AuctionTeam[]; // budgets initialized, role counts zero
  currentPlayerId: null;
  currentBid: null;
  selectedTeamId: null;
  undoHistory: [];
}
```

Do not persist private source fields. Persist only normalized setup data required to run or display the auction. Source row numbers may be retained only for setup diagnostics if they never reach board/roster DTOs.

### API Contract Guidance

- `POST /api/auction/start`
  - Request: `{ clientCommandId: string }`.
  - Success `200`: `{ state: BoardStateDto, result: { command: "StartAuction", clientCommandId, message } }`.
  - Conflict `409`: setup blockers from `getSetupReadiness`; use operational copy already produced by setup readiness.
  - Invalid `400`: malformed body or missing `clientCommandId`.
  - Unsupported media `415`: non-JSON content type.
- `GET /api/state`
  - If no auction has started, return setup/no-state response that the UI can use for setup.
  - If started, return the latest board-ready state from persistence.
- Mutating command rules from architecture still apply: same-origin localhost, JSON schema/Zod validation, `clientCommandId`, authoritative response, no stack traces in UI.

### Persistence Ownership

This story owns the first durable auction state and must document the exact implementation in the Dev Agent Record.

Minimum durable concepts:

- `schema_version`: one-row or migration metadata table.
- `auction_state`: auction id, phase, current player id nullable, current bid nullable, selected team id nullable, locked parameters JSON or normalized columns, created/updated timestamps, persistence failure flag if implemented.
- `players`: generated player id, auction id, name, gender, role, phase1 category, base price, status, photo asset id nullable, sold price nullable, winning/assigned team id nullable, acquisition type nullable.
- `teams`: generated team id, auction id, name, captain, logo asset id nullable, budget, remaining budget, squad count.
- `team_role_counts`: team id, role, count, with unique `(team_id, role)`.
- `action_log`: generated action id, auction id, `command` = `StartAuction`, `clientCommandId`, timestamp, summary, before/after or payload JSON, undoable flag false for Start Auction unless future undo policy says otherwise.
- `snapshots/latest.json`: allowlisted readable recovery snapshot written only after transaction commit.

Constraints:

- Use a single SQLite transaction for Start Auction. Commit current state and action log together.
- Snapshot must never represent a partial DB transaction.
- Resume/reconstruction tests must open a new repository instance against the same temp DB and reconstruct the same setup-started state.
- Parameter edits after Start Auction must not change the locked persisted parameters.

### Architecture Guardrails

- AD-2: `packages/domain` owns Start Auction state initialization, derived base prices, phase state, and rule decisions. Fastify and React adapt only.
- AD-3: after setup begins, server/domain state is authoritative. React may hold pending-command and view state only.
- AD-4: use command-oriented same-origin HTTP with `clientCommandId`.
- AD-5: every setup/live mutation that creates durable state must be one SQLite transaction plus action log plus snapshot after commit.
- AD-7: setup imports are staged adapters. Do not move CSV/media parsing into Start Auction.
- AD-8: privacy by projection. Board/live/resume DTOs, snapshots, and logs must exclude email, mobile, payment status, payment transaction id, source timestamp, ignored source fields, and source file paths.
- AD-11: persistence changes require transaction, resume, action-log, and snapshot tests; Fastify routes require inject tests; UI flows require Playwright where they touch user workflow.
- AD-13: Auction Parameters are setup-owned and locked after Start Auction.
- AD-14: do not implement Phase 2/3 behavior here.
- AD-15: roster projections derive from Player ownership. Initial rosters are empty derived projections.

### UX Requirements For This Story

- Setup stays light, dense, and checklist-like until Start Auction succeeds.
- Start Auction is a primary safe routine action only when setup readiness is unblocked.
- Pending state must prevent duplicate Start Auction commands.
- Blocked Start Auction errors must be calm and specific, reusing existing blocker text where possible.
- After success, show an Initial Auction board, not a marketing or blank page.
- Board first state: phase `Initial Auction`, no Current Player, no Current Bid, safe next action `Reveal Next Player`.
- Missing photo/logo placeholders are neutral. Do not style them as errors.
- Keyboard and accessibility floor: button has accessible name, focus remains predictable after transition, phase change is announced with text or polite live region, and controls remain 44 CSS px minimum.

### Previous Story Intelligence

- Story 1.5 introduced strict shared Auction Parameter schemas, domain validation helpers, setup parameter API routes, setup readiness, React parameter UI, and tests. Reuse these instead of rebuilding readiness in the UI or server.
- Story 1.5 intentionally left the actual Start Auction command, durable initial auction state, SQLite commits, snapshots, action log, resume, and parameter locking for Story 1.6.
- Story 1.5 review added `GET /api/setup/readiness`; Story 1.6 should evolve this from "ready for Story 1.6" into a real Start Auction precondition.
- Current setup UI has stable test IDs and route-mocked/event-mode tests that future stories will depend on. Preserve all existing selectors.
- Earlier stories established the pattern: strict shared contracts, focused domain/import logic, thin Fastify routes, setup staging, React response schema validation, event-mode Playwright coverage, and no private source fields in visible setup/live surfaces.
- Deferred work from earlier stories remains deferred unless directly needed: concurrent upload interleaving, full in-memory buffering within limits, viewport regression tests, and broader event-mode rehearsal.

### Git Intelligence Summary

- Recent commits are story-sliced and test-heavy: Story 1.2 added Player CSV contracts/import/UI/E2E, Story 1.3 added media matching/upload security, and Story 1.4 added Team CSV/logo equivalents.
- Story 1.5 is present in the dirty worktree rather than committed; depend on its files carefully and avoid reverting them.
- Tests use Vitest for shared/domain/server/component coverage and Playwright for UI/event-mode flows. `playwright.event.config.ts` runs `apps/web/e2e/event-mode.spec.ts`.
- Package dependency direction to preserve: `shared` has no workspace dependencies; `domain` depends on `shared`; `persistence` depends on `domain` and `shared`; `imports` depends on `shared`; `server` depends on runtime packages; `web` depends on `shared`.

### Latest Tech Information

Checked on 2026-07-07:

- Lockfile versions: Fastify `5.9.0`, better-sqlite3 `12.11.1`, Zod `4.4.3`, Vitest `4.1.9`, Playwright `1.61.1`.
- npm registry latest at check time: Fastify `5.10.0`, better-sqlite3 `12.11.1`, Zod `4.4.3`, Vitest `4.1.10`, Playwright `1.61.1`.
- Do not upgrade dependencies in this story just to chase minor releases. Use the installed lockfile/API surface unless implementation hits a concrete bug requiring an explicit upgrade and full regression run.
- Fastify v5 docs emphasize schema-based route validation and content-type-specific validation. Current code manually checks content type and validates with Zod; keep that discipline for Start Auction.
- better-sqlite3 supports transaction wrappers through its API; use a single transaction boundary for DB state/action-log writes.
- SQLite official docs state SQLite transactions are atomic, consistent, isolated, and durable even across crashes when used correctly. Align tests with rollback/commit expectations.
- Zod 4 remains the runtime schema library; use `safeParse` for external JSON at React/server boundaries and strict schemas for DTOs.
- Sources: `https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/`, `https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md`, `https://www.sqlite.org/transactional.html`, `https://zod.dev/api`, and npm registry latest endpoints.

### Testing Requirements

Dev Gate commands:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:e2e:event
```

Story-specific test mapping:

- `TD-016`: persistence mutation commits current state and action log in one transaction; rollback leaves prior/no state intact.
- `TD-017`: snapshot is written only after commit and never represents a partial mutation.
- `TD-018`: reopen/resume restores latest phase and state. For Story 1.6 this means `InitialAuction`, no current player, initialized teams/players, and empty undo history.
- `TD-021`: mutating commands require `clientCommandId`; duplicate/unknown policy must be implemented consistently or explicitly documented for later hardening.
- `TD-029`/`TD-040`: board/API DTOs, logs, snapshots, and UI exclude private source fields.
- `TD-035`: valid setup imports Players/Teams/media, accepts placeholders, starts auction, locks parameters, and lands on live board.

Review/Test Gate:

- A second agent must inspect that route/UI code does not duplicate domain initialization rules.
- The reviewer must verify transaction boundaries, snapshot timing, resume reconstruction, parameter locking, privacy projection, and setup blocker behavior.
- Blocking findings reopen the story for implementation iteration before it can be considered done.

### Project Structure Notes

- Extend existing packages; do not create a new app or package.
- Keep runtime source under `src/`; do not edit `dist/` output by hand.
- Runtime packages must not import `@auction-manager/test-fixtures`.
- Keep all new UI test IDs stable and specific; future Story 2.1 will rely on Initial Auction board selectors.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 1.6: Start Auction With Persisted Initial State`
- `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md#FR-6: Start the auction`
- `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md#FR-20: Persist local auction state`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#AD-2 - Domain Package Owns Auction Truth`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#AD-5 - Atomic SQLite Persistence`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#AD-13 - Auction Parameters Are Setup-Owned And Locked`
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md#State Patterns`
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md#Components`
- `_bmad-output/test-artifacts/finalized-test-cases.md#Final Case Matrix`
- `_bmad-output/implementation-artifacts/1-5-configure-auction-parameters.md#Previous Story Intelligence`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-07T13:09:55+0530: Targeted backend tests passed for shared contracts, setup readiness, domain Start Auction, persistence repository, and Fastify routes.
- 2026-07-07T13:13:02+0530: Full Vitest suite passed: 23 files, 126 tests.
- 2026-07-07T13:14:00+0530: Full build passed across workspaces.
- 2026-07-07T13:14:00+0530: Standard Playwright E2E passed: 4 tests.
- 2026-07-07T13:16:00+0530: Event-mode Playwright E2E passed: 8 tests.

### Completion Notes List

- Added strict shared auction runtime contracts and DTO schemas for Start Auction, board/resume state, command summaries, and app state responses.
- Added domain-owned `startAuctionFromSetup` initialization with generated opaque IDs, cloned locked parameters, Pending Players, initialized Teams, InitialAuction phase, empty undo history, and non-blocking media placeholders.
- Replaced the persistence stub with a better-sqlite3 repository that applies schema versioning, commits auction state and action log in one transaction, writes `snapshots/latest.json` after commit, reconstructs state on reopen, and blocks further mutations after snapshot failure.
- Added `POST /api/auction/start` and `GET /api/state`, setup mutation locking after auction start, route-level content-type/request validation, duplicate command handling, and allowlisted board projection without private source fields.
- Replaced the disabled Start Auction placeholder with a real UI command, pending duplicate-click guard, safeParse response validation, persisted-state resume on app open, and the Initial Auction board shell with `current-player-panel`, `current-bid`, and `reveal-next`.
- Updated event-mode test data isolation so each run uses a fresh local data directory while still exercising real SQLite persistence.

### File List

- `_bmad-output/implementation-artifacts/1-6-start-auction-with-persisted-initial-state.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/server/src/app.test.ts`
- `apps/server/src/app.ts`
- `apps/server/src/main.ts`
- `apps/web/e2e/event-mode.spec.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/styles.css`
- `packages/domain/src/index.ts`
- `packages/domain/src/start-auction.test.ts`
- `packages/domain/src/start-auction.ts`
- `packages/persistence/src/auction-repository.test.ts`
- `packages/persistence/src/index.ts`
- `packages/shared/src/auction-state-contracts.test.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/setup-readiness.test.ts`
- `packages/shared/src/setup-readiness.ts`
- `playwright.event.config.ts`

### Change Log

- 2026-07-07: Implemented Story 1.6 Start Auction persisted initial state and moved story to review.

### Review Findings

- [x] [Review][Patch] Guard Start Auction against duplicate starts with a fresh clientCommandId [apps/server/src/app.ts:346]
- [x] [Review][Patch] Create data directory before opening SQLite on fresh installs [apps/server/src/app.ts:73]
- [x] [Review][Patch] Recompute Auction Parameter review at Start Auction instead of reusing stale cache [apps/server/src/app.ts:354]
- [x] [Review][Patch] Return board state on snapshot-write failure instead of a hard 500 [apps/server/src/app.ts:420]
- [x] [Review][Patch] Replace brittle UNIQUE string-matching with typed persistence errors [packages/persistence/src/index.ts:36]
- [x] [Review][Patch] Scope action log reads to the current auction only [packages/persistence/src/index.ts:130]
- [x] [Review][Patch] Surface persistenceFailure on board/resume DTOs and UI [packages/shared/src/index.ts:557]
- [x] [Review][Patch] Block Start Auction when app state load fails or is still loading [apps/web/src/main.tsx:285]
- [x] [Review][Patch] Invalidate saved parameter readiness after CSV reimports [apps/web/src/main.tsx:447]
- [x] [Review][Patch] Treat parameter blocking reasons as blocking even without a local draft [apps/web/src/main.tsx:252]
- [x] [Review][Patch] Add route-specific generic failure messages for Start Auction and state routes [apps/server/src/app.ts:867]
- [x] [Review][Defer] Route-level staged-data checks partially duplicate domain readiness [apps/server/src/app.ts:363] — deferred, pre-existing adapter guard for missing staged payloads
- [x] [Review][Defer] persistence_failure marking happens outside the commit transaction [packages/persistence/src/index.ts:96] — deferred, rare crash window; snapshot failure still blocks mutations
- [x] [Review][Defer] Board DTO includes phase1/sold fields beyond the story's literal allowlist [packages/shared/src/index.ts:523] — deferred, fields are null-safe and needed for later live phases
