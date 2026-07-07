---
baseline_commit: 199c57b0f49c9a09c1e33868d61eac8af3579440
---

# Story 2.7: Mark Player Unsold Into Phase 2 Pool

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want to mark the Current Player unsold during Phase 1,
so that the Player can be rebid later without changing Team budgets or counts.

## Acceptance Criteria

1. Given a Current Player is revealed during Initial Auction, when the operator selects Mark Unsold, then the Player status becomes Unsold, and the Player is added to the Phase 2 Unsold Bidding pool.
2. Given Mark Unsold succeeds in Phase 1, when Team state is inspected, then Team Budget, remaining budget, Squad Size, and Role Counts do not change, and no winning Team or Sold Price is recorded for the Player.
3. Given Mark Unsold succeeds, when persistence completes, then the unsold outcome is committed atomically with current-state updates, an action-log entry, Undo payload, and latest snapshot, and the response returns the new authoritative board-ready state.
4. Given Mark Unsold succeeds and pending Phase 1 Players remain, when the live board renders, then the board shows a calm unsold summary, and Reveal Next Player becomes the safe next action.
5. Given Mark Unsold succeeds and no Phase 1 pending Players remain, when the live board renders, then the board shows Phase 1 completion state, and exposes the future transition path to Unsold Bidding without starting it automatically.
6. Given a developer finishes this story, when they run the story's Dev Gate, then Mark Unsold domain tests, no-budget/count-mutation tests, persistence/action-log/snapshot tests, route/schema tests, live-board component tests, and typecheck pass, and an E2E or acceptance test proves a Phase 1 unsold Player moves to the Phase 2 pool without mutating Team state.
7. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks unsold pool movement, non-mutation of Team state, action-log/Undo payload correctness, unit/integration/API tests, and the Mark Unsold E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Implementation Boundary

This story implements the Phase 1 `InitialAuction` Mark Unsold outcome only.

- Do NOT implement the `StartUnsoldBidding` phase transition, the Phase 2 randomized order, or any `UnsoldBidding`-phase commands. Those belong to Stories 3.1-3.4. AC 5 requires only that the board *exposes* the future transition path (a visible, non-executing affordance or clear completion text) when Phase 1 pending Players reach zero and the Phase 2 pool is non-empty.
- Do NOT implement Undo execution (Story 2.9), resume/restart UX (Story 2.8), the Board/Rosters surface or Team detail drawer (Story 2.10), Reset, or Close. This story only appends the `MarkUnsold` undo-history entry and action-log undo payload that Story 2.9 will consume.
- Do NOT create a second outcome route or client-side outcome calculation. `MarkUnsold` is a new domain command + new `POST /api/auction/mark-unsold` route following the exact `MarkSold` spine from Stories 2.5/2.6.
- `Unsold` already exists in `playerStatusValues` and `UnsoldBidding` already exists in `auctionPhaseValues` in `packages/shared/src/index.ts`. Reuse them; do not add new enum values.
- There is currently NO Phase 2 pool field anywhere in source code (grep for `phase2Pool`/`unsoldPool` returns zero TS/TSX hits). This story introduces it on `AuctionState`.

## Tasks / Subtasks

- [x] Extend shared contracts for the Phase 2 pool and Mark Unsold command. (AC: 1, 3, 4, 5, 6)
  - [x] In `packages/shared/src/index.ts`, add `phase2Pool` to `auctionStateBaseSchema` as an array of opaque player IDs. Use `.default([])` (or equivalent) so previously persisted `state_json` and `latest.json` snapshots without the field still parse; do not break resume of pre-2.7 saved auctions.
  - [x] Add `markUnsoldRequestSchema` (`{ clientCommandId }`), `markUnsoldAcceptedResponseSchema` (`{ state: boardStateDto, result: { command: "MarkUnsold", clientCommandId, message } }`), `markUnsoldRejectedResponseSchema`, and a `markUnsoldResponseSchema` union, mirroring the Mark Sold contract names exactly.
  - [x] Rejected conflict codes should cover: not in `InitialAuction`, no Current Player, current Player record missing or status not `Current`, `auction_not_active`, `persistence_failure_uncleared`, `duplicate_client_command_id`, and `invalid_request`. A `reasons[]` array like Mark Sold's capacity list is NOT needed; the simpler single-reason rejected shape used by `reveal-next` is acceptable if kept schema-validated.
  - [x] Add `markUnsoldUndoHistoryEntrySchema` and extend `liveActionUndoHistoryEntrySchema` (discriminated union on `command`, currently `RevealNextPlayer | SelectTeam | IncreaseBid | MarkSold`). The entry must capture enough to fully undo later: `playerId`, `previousPlayerStatus`, `previousCurrentPlayerId`, `previousCurrentBid`, `previousSelectedTeamId`, and `timestamp`. The pool append is restorable by removing `playerId` from `phase2Pool`; capturing the previous pool contents explicitly is acceptable but not required.
  - [x] Expose the Phase 2 pool on `boardStateDtoSchema` so the UI renders counts from authoritative state only — add a minimal allowlisted field such as `phase2PoolCount` (number) or `phase2PoolPlayerIds`. Do not add private/source/setup fields to board, roster, route, log, or snapshot DTOs.
  - [x] Update `packages/shared/src/auction-state-contracts.test.ts`: `phase2Pool` parsing (present, defaulted-when-absent), Mark Unsold request/accepted/rejected/union parsing, Mark Unsold undo entry parsing, board DTO privacy rejection.

- [x] Initialize the Phase 2 pool at auction start. (AC: 1, 6)
  - [x] In `packages/domain/src/start-auction.ts`, initialize `phase2Pool: []` in the state produced by `startAuctionFromSetup`.
  - [x] Update `start-auction.test.ts` to assert the empty pool.

- [x] Create the `markUnsold` domain command. (AC: 1, 2, 4, 6, 7)
  - [x] New file `packages/domain/src/mark-unsold.ts` following the `markSold` shape: `export function markUnsold(input: MarkUnsoldInput): MarkUnsoldResult` with `MarkUnsoldInput = { state: AuctionState; now: () => string }` and an `ok: true / ok: false` discriminated result. Export from `packages/domain/src/index.ts`.
  - [x] Rejections (return the input state object unchanged — existing command tests assert identity preservation for rejected results; keep that invariant): phase is not `InitialAuction`; `currentPlayerId` is null; the current Player record is missing; the current Player status is not `Current` (Story 2.6 review added this guard to `markSold` — replicate it).
  - [x] Mark Unsold does NOT require a selected Team or a Current Bid. A raised bid or selected Team is simply discarded (captured in the undo entry first).
  - [x] On accepted outcome, build new arrays/objects (no in-place mutation of input state):
    - Current Player: `status: "Unsold"`; `soldPrice`, `winningTeamId`, and `acquisitionType` remain/are set to null. Never write a winning Team or price.
    - `phase2Pool`: append the Player id (`[...state.phase2Pool, currentPlayer.id]`). The Player must appear exactly once; do not re-append.
    - Teams: the `teams` array must be passed through untouched — no budget, squad count, or role count change. Preserving the same array reference is the strongest form of this guarantee and is testable.
    - Board state: clear `currentPlayerId`, `currentBid`, and `selectedTeamId` so Reveal Next Player becomes the safe next action (mirrors accepted Mark Sold).
    - Undo History: append the `MarkUnsold` entry.
    - `updatedAt`: set from the injected `now()`.
  - [x] Return a calm accepted message used by both API result and board summary. Follow UX voice exactly: `Marked unsold. [Player name] moves to Phase 2 rebid.` (UX table copy is "Marked unsold. Moves to Phase 2 rebid." — including the Player name is fine; no exclamation marks, no hype.)
  - [x] Preserve all other Players, Teams, `phase1Order`, parameters, `createdAt`, and `persistenceFailure`.
  - [x] New `packages/domain/src/mark-unsold.test.ts`: accepted outcome mutates Player status/pool/current-state/undo/updatedAt; teams array is unchanged (assert reference identity or deep equality); every rejection branch is non-mutating and preserves state identity; input state is never mutated; player appears exactly once in pool; works when a Team is selected and bid was raised (both discarded and captured in undo entry).

- [x] Add `commitMarkUnsold` persistence in `packages/persistence/src/index.ts`. (AC: 2, 3, 6, 7)
  - [x] Add `CommitMarkUnsoldInput` with `previousState`, `state`, `clientCommandId`, `summary`, `playerId`, and any fields needed for a clear action-log payload. Validate metadata against the committed state like `commitMarkSold` does (Story 2.6 review finding — validate `playerId` matches the newly unsold Player).
  - [x] Extend `ActionLogEntry.command` union (`StartAuction | RevealNextPlayer | SelectTeam | IncreaseBid | MarkSold`) with `"MarkUnsold"`.
  - [x] Implement `commitMarkUnsold` as one SQLite transaction following the `commitMarkSold` pattern exactly: `assertMutationsAllowed`; reject duplicate `clientCommandId` with `DuplicateClientCommandError`; verify active auction id matches; update `auction_state.state_json`, `phase` (stays `InitialAuction`), `updated_at`, clear `persistence_failure`; insert one `action_log` row with command `MarkUnsold`, `undoable = 1`, the summary, and a payload containing `playerId`, `previous` (player status, currentPlayerId, currentBid, selectedTeamId) and `next` values, the pool append, and the `undo` entry (`state.undoHistory.at(-1)`).
  - [x] Write `data/snapshots/latest.json` only after the transaction commits; on snapshot write failure throw `PersistenceSnapshotWriteError` and mark `persistenceFailure` so later mutations are rejected, exactly like the other commits.
  - [x] Extend `packages/persistence/src/auction-repository.test.ts`: committed state contains Unsold player + `phase2Pool` entry + unchanged team state; action-log row shape, `undoable = 1`, payload before/after/undo; snapshot file contents; duplicate `clientCommandId` rejection; repository reopen (`loadCurrentState()`) returns the unsold Player and pool intact; snapshot failure blocks later mutations; loading a pre-2.7 state without `phase2Pool` still parses (default applies).

- [x] Add `POST /api/auction/mark-unsold` in `apps/server/src/app.ts`. (AC: 1, 3, 4, 5, 6)
  - [x] Follow the established mutating-route spine (copy the `mark-sold` block, simplified where no `reasons[]` is needed): `415` non-JSON content type; `400` invalid `markUnsoldRequestSchema` body; `409` no active auction; `409` uncleared persistence failure; `409` duplicate `clientCommandId`; call `markUnsold({ state, now })`; `409` with the rejected schema on domain rejection; `commitMarkUnsold(...)`; handle `DuplicateClientCommandError` (`409`) and `PersistenceSnapshotWriteError`/generic persistence failures (`500`, no stack traces) with copy adjusted for Mark Unsold; `200` with `markUnsoldAcceptedResponseSchema` and `toBoardStateDto(result.state)` (use `safeParse` for the accepted response like the Story 2.6 review patch did).
  - [x] Update `toBoardStateDto` to populate the new pool field (`phase2PoolCount` or ids) from `state.phase2Pool`.
  - [x] Do not compute outcome validity or pool movement in the route; adapt the domain result and persistence errors only.
  - [x] Extend `apps/server/src/app.test.ts` using the existing `stageValidSetup`/`startAndReveal` helpers: accepted Mark Unsold returns `200` with Player `Unsold`, pool populated, teams unchanged, action-log row, snapshot updated, `reveal-next` viable next; Mark Unsold with a selected Team + raised bid still succeeds and discards both; no Current Player returns `409` with no state/action-log/snapshot mutation; duplicate `clientCommandId` returns `409` with exactly one action-log row; `415`/`400` request validation; privacy — response contains no fixture private fields; marking the LAST pending Player unsold yields `phase1Progress.pendingPlayerCount === 0` with phase still `InitialAuction`.

- [x] Update the live board UI for Mark Unsold. (AC: 1, 2, 4, 5, 6)
  - [x] `apps/web/src/auction-board-helpers.ts`: add `canAttemptMarkUnsold(boardState)` — `phase === "InitialAuction" && currentPlayer !== null && persistenceFailure === null`. No selected-Team or bid requirement. Add helper tests beside the existing ones.
  - [x] `apps/web/src/main.tsx`: extend `createClientCommandId` prefixes with `"mark-unsold"`. Add `handleMarkUnsold` following the `handleMarkSold` pattern exactly: generation ref + in-flight ref duplicate-click guard, fresh `clientCommandId`, strict `safeParse` of the response union, on success `setBoardState(response.state)` (authoritative reconcile — never optimistic), show the result message, clear stale Mark Sold/Mark Unsold summaries and errors, handle `snapshot_write_failed`/persistence-failure responses like Mark Sold does.
  - [x] Render a Mark Unsold button in the live outcome controls near Mark Sold. Mark Unsold is a routine action; per DESIGN.md do not style it as danger — unsold is an ordinary outcome, not a failure. Keep 44 CSS px minimum size, visible focus, accessible name.
  - [x] Show the calm unsold summary (result message) with a stable test id, e.g. `mark-unsold-success`, following the `mark-sold-success` lifecycle: cleared on subsequent select-team/increase-bid/reveal actions (Story 2.6 review patch pattern).
  - [x] Render the Unsold Pool Summary from authoritative board state (UX-DR11): a text count such as `Unsold (Phase 2 rebid): 3` with a stable test id, e.g. `unsold-pool-summary`. Counts are text, not color alone; neutral surfaces, never danger red.
  - [x] Phase 1 completion state (AC 5): when `phase1Progress.pendingPlayerCount === 0`, `currentPlayer === null`, and phase is `InitialAuction`, show a completion message plus the future transition path to Unsold Bidding without executing anything — e.g. text/disabled affordance `Phase 1 complete. Start Unsold Bidding will rebid N unsold players.` with a stable test id such as `phase1-complete` / `start-unsold-bidding-preview`. It must not call any API. (The actual transition is Story 3.1.)
  - [x] After a successful Mark Unsold with pending Players remaining, the board must render no Current Player, no selected Team, `No current bid`, and an enabled Reveal Next Player (this falls out of the authoritative state + existing `canRevealNextPlayer`, but assert it).
  - [x] Preserve existing selectors: `mark-sold`, `mark-sold-blocked-reason`, `mark-sold-error`, `mark-sold-success`, `current-player-panel`, `current-bid`, `selected-team`, `reveal-next`, team tile selectors, `phase1-progress` selectors.
  - [x] `apps/web/src/main.test.tsx`: accepted Mark Unsold response updates board from server state, shows unsold summary, clears Current Player/Selected Team/bid, enables Reveal Next, leaves team tiles (budget/squad/role counts) unchanged, renders the pool count; last-player case renders Phase 1 completion + non-executing transition preview; Mark Unsold button disabled without a Current Player; in-flight duplicate-click guard.
  - [x] `apps/web/src/styles.css`: add styles only as needed; preserve stable live-board dimensions across 1440x900, 1366x768, 1920x1080, and 390x844 profiles.

- [x] Preserve previous live-command regressions. (AC: 2, 6, 7)
  - [x] All Story 2.5/2.6 Mark Sold tests (rejected non-mutation and accepted sale) must still pass unchanged.
  - [x] Reveal Next, Select Team, Increase Bid, Phase 1 order/progress, privacy, and setup-locking behavior must remain intact. Note `apps/server/src/phase1-progress.ts` already counts `Unsold` as a completed Phase 1 status — verify progress math with a mixed Sold/Unsold sequence rather than changing it.
  - [x] A second accepted Mark Unsold request with the same `clientCommandId` must return duplicate conflict and must not create a second action-log row or double-append the pool.

- [x] Add event-mode E2E coverage. (AC: 1, 2, 4, 5, 6)
  - [x] Extend `apps/web/e2e/event-mode.spec.ts` (runs via `playwright.event.config.ts`, port 4174, isolated `DATA_DIRECTORY`): complete valid setup, start auction, reveal, optionally select a Team and raise the bid, Mark Unsold; assert the unsold summary, no Current Player, cleared selected Team, Reveal Next enabled, team tile budget/squad/role counts unchanged, unsold pool count = 1; refresh the page and verify the unsold Player and pool count persist (resume path); continue revealing/selling remaining players if practical to assert the Phase 1 completion + transition preview appears without starting Phase 2.

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Epic 2 `in-progress`, Stories 2.1-2.6 `done`, Story 2.7 `backlog` at story creation time. This story creation updates 2.7 to `ready-for-dev`.
- Current `HEAD` at story creation is `199c57b` (`Story 2.6: Mark Player Sold and Update Team State`). Working tree is clean.
- No `project-context.md` exists for the persistent-facts glob.
- Repo uses **npm workspaces** (npm 11.16.0), not pnpm. Run scripts from the root.

### Files To CREATE

- `packages/domain/src/mark-unsold.ts` — the domain command.
- `packages/domain/src/mark-unsold.test.ts` — domain tests.

### Files To UPDATE (read each fully before editing)

- `packages/shared/src/index.ts` — `phase2Pool` on `auctionStateBaseSchema`, Mark Unsold request/response schemas, `markUnsoldUndoHistoryEntrySchema` added to the `liveActionUndoHistoryEntrySchema` discriminated union, board DTO pool field.
- `packages/shared/src/auction-state-contracts.test.ts` — contract and privacy tests.
- `packages/domain/src/index.ts` — export `markUnsold` and its types.
- `packages/domain/src/start-auction.ts` (+ test) — initialize `phase2Pool: []`.
- `packages/persistence/src/index.ts` — `CommitMarkUnsoldInput`, `commitMarkUnsold`, `ActionLogEntry.command` union.
- `packages/persistence/src/auction-repository.test.ts` — commit/reopen/duplicate/snapshot-failure/back-compat tests.
- `apps/server/src/app.ts` — new route + `toBoardStateDto` pool field.
- `apps/server/src/app.test.ts` — route tests.
- `apps/web/src/auction-board-helpers.ts` (+ its test file) — `canAttemptMarkUnsold`.
- `apps/web/src/main.tsx` — handler, button, unsold summary, pool summary, Phase 1 completion state.
- `apps/web/src/main.test.tsx` — component tests.
- `apps/web/src/styles.css` — minimal styles.
- `apps/web/e2e/event-mode.spec.ts` — event-mode flow.
- `packages/test-fixtures/src/index.ts` — only if a fixture needs the new field; note `createManualAssignmentAuctionState` already sets players to `Unsold`. Runtime code must not import `@auction-manager/test-fixtures`.

Do not hand-edit `dist/` outputs.

### Current Behavior Of Key UPDATE Files

- `packages/shared/src/index.ts`: strict Zod schemas. `playerStatusValues` already includes `"Unsold"`; `auctionPhaseValues` already includes `"UnsoldBidding"`. `auctionStateBaseSchema` fields today: `auctionId`, `phase`, `parameters`, `players`, `teams`, `phase1Order`, `currentPlayerId`, `currentBid`, `selectedTeamId`, `undoHistory`, `createdAt`, `updatedAt`, `persistenceFailure` — **no pool field**. `boardStateDtoSchema` is `.strict()` with `auctionId`, `phase`, `parameters`, `players`, `teams`, `currentPlayer`, `currentBid`, `selectedTeamId`, `phase1Progress`, `canUndo`, `persistenceFailure`.
- `packages/domain/src/mark-sold.ts`: the template for this command. `markSold({ state, now })` returns a discriminated union; every rejection returns the input state by reference; the accepted branch builds a fully new state (player, team, cleared board fields, appended undo entry, `updatedAt`). Includes a guard rejecting when the current Player status is not `Current`. Mirror this structure minus all Team/capacity logic.
- `packages/domain/src/reveal-next-player.ts`: reveals the first `Pending` player from persisted `phase1Order.playerIds`; blocks with `current_player_requires_outcome` while a Current Player exists and `no_pending_phase1_players` when none remain. Accepted Mark Unsold must clear Current Player state so reveal proceeds; when the last pending Player is resolved, reveal correctly reports no pending players — that is the AC 5 completion condition, not an error to "fix".
- `packages/persistence/src/index.ts`: `commitMarkSold` (~lines 370-496) is the exact transaction template — duplicate `client_command_id` check, active-auction match, metadata validation against committed state, `UPDATE auction_state`, `INSERT INTO action_log` with `payload_json` `{ command, ..., previous: {...}, next: {...}, undo }` and `undoable = 1`, then post-commit snapshot write with `PersistenceSnapshotWriteError` + `markPersistenceFailure` on failure. Tables: `auction_state` (`auction_id`, `state_json`, `phase`, `created_at`, `updated_at`, `persistence_failure`), `current_auction`, `action_log` (`action_id`, `auction_id`, `command`, `client_command_id` UNIQUE, `timestamp`, `summary`, `payload_json`, `undoable`), `schema_version`. Player status lives inside `state_json`, not a column.
- `apps/server/src/app.ts`: `/api/auction/mark-sold` (~lines 833-1011) is the route template: content-type check, request `safeParse`, active-state guard, persistence-failure guard, duplicate-id guard, domain call, 409 on rejection, commit, error mapping, 200 accepted response via `safeParse`. `toBoardStateDto()` builds the DTO and attaches `phase1Progress` (from `apps/server/src/phase1-progress.ts`, which already counts `Unsold` as completed) and per-team `currentPlayerCapacity`.
- `apps/web/src/main.tsx`: single-file app; `AuctionBoard` (~line 1752) renders the live surface. `handleMarkSold` (~line 970) is the handler template: guards via helper + loading + `markSoldInFlightRef`, `markSoldGenerationRef` stale-response protection, `createClientCommandId("mark-sold")` (~line 2459 — extend its prefix union), strict response parsing, `setBoardState` from accepted response. Existing test ids: `mark-sold`, `mark-sold-blocked-reason`, `mark-sold-error`, `mark-sold-success`, `reveal-next`, `increase-bid`, `current-player-panel`, `current-bid`, `selected-team`, `team-tile`, `phase1-progress`, `phase1-pending-count`.
- `apps/web/src/auction-board-helpers.ts`: `canAttemptMarkSold` requires phase/currentPlayer/currentBid/selectedTeam/persistence-ok; `canRevealNextPlayer` requires `currentPlayer === null && phase1Progress.pendingPlayerCount > 0`. `getPhase1OrderStatusLabel` already returns `"Phase 1 order complete"` at zero pending.

### Domain Mutation Requirements

Accepted `MarkUnsold` must produce exactly this state change (new objects, no input mutation):

```ts
player.status = "Unsold";
// soldPrice, winningTeamId, acquisitionType stay null — never set

state.phase2Pool = [...state.phase2Pool, player.id]; // exactly once

// teams: UNTOUCHED — pass the same array through; no budget/squad/roleCounts change

state.currentPlayerId = null;
state.currentBid = null;
state.selectedTeamId = null;
state.updatedAt = now();
// undoHistory: append MarkUnsold entry (see shared contract task)
```

Preserve all other Players, `phase1Order`, parameters, `createdAt`, and `persistenceFailure`. A selected Team or raised bid at the moment of Mark Unsold is valid input — it is discarded, and the previous `currentBid`/`selectedTeamId` values must be captured in the undo entry so Story 2.9 can restore them.

### Persistence Ownership

This story owns Mark Unsold persistence:

- `auction_state.state_json`: updated authoritative state including `phase2Pool` after accepted Mark Unsold.
- `auction_state.phase`: remains `InitialAuction` (even when the last pending Player is marked unsold — the transition is Story 3.1).
- `auction_state.updated_at`: Mark Unsold timestamp.
- `action_log`: exactly one `MarkUnsold` row per accepted outcome; `client_command_id` unique/duplicate-protected; `undoable = 1`; `payload_json` includes command, player id, previous/next player status, previous current player/bid/selected team, pool append, and `undo` entry.
- `undoHistory`: appended domain `MarkUnsold` entry.
- `snapshots/latest.json`: written after commit; failure marks `persistenceFailure` and blocks later mutations.
- Schema/version behavior: `phase2Pool` is added to `state_json` via Zod default — pre-2.7 persisted states and snapshots without the field must still load (`loadCurrentState()` defaults it to `[]`). Add an explicit back-compat parse test. No SQLite column/migration change is required because player status and the pool live inside `state_json`.
- Resume/reopen: `loadCurrentState()` returns the Unsold Player, populated pool, and unchanged Teams exactly.
- Rejected Mark Unsold: no state update, no action-log row, no undo entry, no snapshot write, unchanged `updatedAt`.

### Architecture Guardrails

- AD-2: `packages/domain` alone decides the unsold outcome and pool movement. React and Fastify request commands and display results only.
- AD-3: the UI reconciles from the authoritative state in the command response. No optimistic pool/status updates.
- AD-4: `POST /api/auction/mark-unsold`, requires `clientCommandId`, validates request and response schemas, returns authoritative state plus compact result summary.
- AD-5: accepted Mark Unsold is one SQLite transaction with action-log append plus post-commit snapshot behavior.
- AD-6: the undo payload must let Story 2.9 restore player status, pending/pool state, current player, current bid, and selected Team. Undo is action-log based.
- AD-8: board DTOs, route responses, logs, snapshots, and UI exclude private source/setup fields. The new pool field carries player IDs/counts only.
- AD-11: domain change → Vitest domain tests; persistence change → transaction/resume/action-log/snapshot tests with temp SQLite; route → `inject()` schema/conflict/success tests; user flow → component + Playwright event-mode coverage.
- AD-14: Phase 1 unsold Players enter the Phase 2 pool; the `UnsoldBidding` phase itself is not entered in this story. Do not collapse pool membership into "status is Unsold" alone — the explicit pool field is required because Story 3.1 builds the randomized Phase 2 order from it and Phase 2 unsold players will later feed a distinct Phase 3 pool.
- AD-12: correctness-first — do not build Phase 2 features beyond the non-executing transition preview.
- AD-15: no roster impact; an unsold Player must never appear in any roster projection (`deriveSoldRosterRows` filters on `winningTeamId` + `acquisitionType`, which stay null — leave it alone).

### UX Requirements For This Story

- Mark Unsold is a routine live action, enabled whenever a Current Player exists during Initial Auction. It requires no selected Team.
- Success copy is operational and calm: `Marked unsold. [Name] moves to Phase 2 rebid.` No exclamation marks, jokes, or celebratory/failure framing.
- Danger red must NOT be used for ordinary unsold state or unsold counts (DESIGN.md rule). The Unsold Pool Summary uses neutral surfaces and small count chips.
- Unsold pool counts are text, not color alone, and identify that the count belongs to Phase 2 rebidding.
- Post-outcome board state: no Current Player, no selected Team, `No current bid`, unsold summary visible, Reveal Next Player as safe next action when pending Players remain.
- Phase 1 completion (last pending Player resolved): show completion state and the future Start Unsold Bidding path without starting it. Per UX state patterns: "Show transition action to start Unsold Bidding if Phase 1 unsold pool has players." In this story the affordance must be non-executing (disabled control or informational preview) since the transition command is Story 3.1.
- Command-in-flight: disable the triggering control / guard duplicate clicks until authoritative state returns.
- Keep live-board readability and stable dimensions across 1440x900, 1366x768, 1920x1080, 390x844. WCAG basics: visible focus, button semantics, accessible names, text status exposure, keyboard operation, 44 CSS px live controls.
- Stable test ids required by the epics/UX for E2E: the Mark Unsold command button, unsold summary, and unsold pool progress (suggested: `mark-unsold`, `mark-unsold-error`, `mark-unsold-success`, `unsold-pool-summary`, `phase1-complete`/`start-unsold-bidding-preview`).

### Previous Story Intelligence

- Story 2.6 completed the accepted `MarkSold` spine this story mirrors: domain mutation with undo entry → `commitMarkSold` transaction + snapshot → route accepted branch → UI authoritative reconcile with calm summary. Copy that spine; strip all Team/capacity logic.
- Story 2.6 review patches to replicate in the new code, not re-learn: guard current Player status is `Current` in the domain command; validate commit metadata against committed state in persistence; `safeParse` the accepted response in the route; strictly parse the accepted response in the web client; clear stale outcome summaries on subsequent select-team/increase-bid actions; handle `snapshot_write_failed` after a persisted command in the UI.
- Story 2.6 established `mark-sold-success` summary lifecycle and post-sale board reconciliation — Mark Unsold success handling should be symmetric, and each outcome's summary should clear the other's stale summary.
- Story 2.5 established the conflict-response pattern and non-mutation testing discipline (state, action log, snapshot, `updatedAt` all unchanged on rejection).
- Story 2.4 established the client command pattern: fresh `clientCommandId` per attempt, generation + in-flight refs, strict response parsing.
- Story 2.2 established that Reveal Next is blocked until the Current Player is resolved; Mark Unsold is the second resolution path after Mark Sold.
- Story 2.1 established persisted `phase1Order`; Mark Unsold must not reorder or reshuffle it — progress reflects completion through Player status (`phase1-progress.ts` already counts `Unsold` as completed).
- Dev Gate evidence from 2.6: `npm run typecheck`, `npm run test` (31 files, 212 tests), `npm run test:e2e:event` (8 tests) all passed at baseline.

### Git Intelligence Summary

Recent commits:

- `199c57b Story 2.6: Mark Player Sold and Update Team State`
- `f5b7951 Story 2.5: Block Invalid Sales With Clear Reasons`
- `0ecae5d Story 2.4: Increase Current Bid`
- `5c960b2 Story 2.3: Select Bidding Team From Team Tiles`
- `4801c58 Story 2.2: Reveal Current Player on the Live Board`

Story 2.6 touched exactly the files this story extends (shared contracts, domain command + tests, persistence + tests, server route + tests, web board + tests, styles, event-mode spec) — use its diff (`git show 199c57b`) as the concrete worked example of the full command spine.

Repo patterns to preserve: strict shared Zod contracts, pure domain commands returning discriminated unions, transaction-backed persistence for successful state changes, thin Fastify adapters, React `safeParse` of server JSON, Vitest unit/integration coverage, Playwright event-mode smoke coverage.

Package dependency direction: `shared` has no workspace deps; `domain` depends on `shared`; `persistence` depends on `domain` and `shared`; `imports` depends on `shared`; `server` adapts domain/persistence/imports/shared; `web` depends on `shared`.

### Latest Tech Information

Checked on 2026-07-07:

- Architecture pins Node.js `24.18.0`, npm `11.16.0`, TypeScript `6.0.3`, React `19.2.7`, Fastify `5.9.0`, Zod `4.4.3`, better-sqlite3 `12.11.1`, Vitest `4.1.9`, Playwright `1.61.1`.
- `package-lock.json` currently resolves React `19.2.7`, Fastify `5.9.0`, Zod `4.4.3`, better-sqlite3 `12.11.1`, Vitest `4.1.9`, Playwright `1.61.1`, TypeScript `6.0.3`. npm registry confirms React latest is `19.2.7` (2026-07-07), matching the pin.
- Do not upgrade dependencies in this story. Zod 4 note: `.default()` on an array field inside a `.strict()` object applies when the key is absent — this is the intended back-compat mechanism for `phase2Pool`.

### Dev Gate

Run at minimum:

```sh
npm run typecheck
npm run test
npm run test:e2e:event
```

If runtime or package-boundary changes affect the full built app, also run:

```sh
npm run build
npm run test:e2e
```

The story is not complete unless any skipped or failing gate is explicitly documented with owner-approved triage.

### Review/Test Gate

A second agent must review this story after implementation and verify:

- the unsold outcome and pool movement are domain-owned, not calculated in React/Fastify/persistence;
- accepted Mark Unsold never mutates any Team field (budget, squad count, role counts) and never records a winning Team or Sold Price;
- accepted Mark Unsold is one atomic persistence commit with action log, undo payload, snapshot, duplicate-id behavior, and resume correctness, including pre-2.7 state back-compat;
- rejected Mark Unsold is fully non-mutating;
- board DTO, logs, snapshots, and UI remain privacy-safe;
- unsold summary copy, neutral (non-danger) unsold styling, pool count text, and Phase 1 completion/transition-preview UX match the UX spine;
- unit, integration, and event-mode tests cover the unsold path, non-mutation, last-player completion, and Mark Sold regressions.

### Project Context Reference

- Source story and Epic 2 context: `_bmad-output/planning-artifacts/epics.md`, Story 2.7 and neighboring Stories 2.1-2.10; FR15 (Mark Unsold pool movement) and the three-phase state machine notes.
- Architecture source: `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md`, AD-2 through AD-6, AD-8, AD-11, AD-12, AD-14, AD-15; Consistency Conventions (command name `MarkUnsold`, phase names, integer money).
- UX source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md` — Mark Unsold component rules, "Marked unsold. Moves to Phase 2 rebid." voice, State Patterns ("Marked unsold in Phase 1", "Initial pending complete"), Unsold pool summary, accessibility floor.
- Visual design source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` — Unsold pool summary component, phase transition control, danger-red prohibition for ordinary unsold state.
- Prior story source: `_bmad-output/implementation-artifacts/2-6-mark-player-sold-and-update-team-state.md` (including its Review Findings list).
- External version check: `https://registry.npmjs.org/react/latest`.

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Fixed `main.test.tsx` Mark Sold regressions caused by missing `phase2PoolCount` on board DTO fixtures after shared contract extension.
- Integrated Mark Unsold E2E into the existing event-mode auction flow because tests share one persisted `DATA_DIRECTORY`.

### Completion Notes List

- Added `phase2Pool` to auction state with Zod default `[]` for pre-2.7 back-compat; Mark Unsold request/response/undo schemas; `phase2PoolCount` on board DTO.
- Implemented `markUnsold` domain command (teams untouched by reference, pool append, undo entry, calm message).
- Added `commitMarkUnsold` persistence mirroring `commitMarkSold` (transaction, action log, snapshot, duplicate-id guard).
- Added `POST /api/auction/mark-unsold` route with full conflict mapping and `safeParse` accepted response.
- Built live board UI: Mark Unsold button, unsold summary, pool count, Phase 1 completion preview (non-executing Start Unsold Bidding affordance).
- Dev Gate: `npm run typecheck`, `npm run test` (32 files, 238 tests), `npm run test:e2e:event` (8 tests) all pass.

### File List

- `_bmad-output/implementation-artifacts/2-7-mark-player-unsold-into-phase-2-pool.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/shared/src/index.ts`
- `packages/shared/src/auction-state-contracts.test.ts`
- `packages/domain/src/mark-unsold.ts`
- `packages/domain/src/mark-unsold.test.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/start-auction.ts`
- `packages/domain/src/start-auction.test.ts`
- `packages/persistence/src/index.ts`
- `packages/persistence/src/auction-repository.test.ts`
- `apps/server/src/app.ts`
- `apps/server/src/app.test.ts`
- `apps/web/src/auction-board-helpers.ts`
- `apps/web/src/auction-board-helpers.test.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/main.test.tsx`
- `apps/web/src/styles.css`
- `apps/web/e2e/event-mode.spec.ts`

### Change Log

- 2026-07-07: Story 2.7 — Mark Player Unsold into Phase 2 pool (domain, persistence, API, UI, tests).
- 2026-07-07: Code review — patched duplicate-pool guard, Phase 1 completion gate, persistence validation, route safeParse, tests; story marked done.

### Review Findings

- [x] [Review][Patch] Reject Mark Unsold when Current Player is already in `phase2Pool` [`packages/domain/src/mark-unsold.ts:63`]
- [x] [Review][Patch] Gate Phase 1 completion preview on `phase2PoolCount > 0` [`apps/web/src/main.tsx:1929`]
- [x] [Review][Patch] Require exactly-once pool append in `commitMarkUnsold` metadata validation [`packages/persistence/src/index.ts:539`]
- [x] [Review][Patch] Use `safeParse` for domain-rejected Mark Unsold responses [`apps/server/src/app.ts:1079`]
- [x] [Review][Patch] Count distinct unsold players in `phase2PoolCount` [`apps/server/src/app.ts:1570`]
- [x] [Review][Patch] Add tests for duplicate-pool rejection, all-sold completion UX, and summary lifecycle clearing [`packages/domain/src/mark-unsold.test.ts`, `apps/web/src/main.test.tsx`]
- [x] [Review][Defer] Stale concurrent mutating commands can overwrite newer state (no optimistic locking on any live command) [`apps/server/src/app.ts`] — deferred, pre-existing pattern across Mark Sold / Reveal Next spine
- [x] [Review][Defer] Cross-command stale Mark Unsold response can overwrite fresher board state [`apps/web/src/main.tsx:1114`] — deferred, pre-existing per-command generation ref pattern
- [x] [Review][Defer] Additional route tests for `persistence_failure_uncleared`, wrong phase, snapshot write failure [`apps/server/src/app.test.ts`] — deferred, same coverage gap as Mark Sold route tests
