---
baseline_commit: 5c960b2
created: 2026-07-07T19:09:53+0530
---

# Story 2.4: Increase Current Bid

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want to increase the Current Bid by the configured increment,
so that verbal bidding can be tracked quickly and consistently.

## Acceptance Criteria

1. Given a Current Player is revealed during Initial Auction, when the live board displays Current Bid, then the bid starts at the Player's configured Role Base Price, and the bid value is the largest number on the live surface.
2. Given the operator selects Increase Bid, when the command succeeds, then the Current Bid increases by exactly the configured Bid Increment, and the board reconciles to the authoritative server response.
3. Given the operator uses the `+` keyboard shortcut while a Current Player is active and focus is not inside a text input, when the shortcut is handled, then it performs the same Increase Bid command as the visible control, and it does not bypass server validation or duplicate-command protection.
4. Given the Current Bid changes, when the live board updates, then bid, budget, squad, and role-count values remain visually stable without layout shift, and Live Gold is reserved for the Current Bid and bid increment moment.
5. Given the bid is increased, when Undo History is inspected, then the bid change is recorded as a reversible live action.
6. Given a developer finishes this story, when they run the story's Dev Gate, then increase-bid domain tests, route/schema tests, keyboard/component tests, visual/state update tests, and typecheck pass, and an E2E or acceptance test proves each increment adds exactly the configured value.
7. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks domain-owned increment behavior, keyboard safety, layout stability, unit/API tests, and the bid-increment E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Tasks / Subtasks

- [x] Add shared command and undo contracts for bid increment. (AC: 2, 3, 5, 6)
  - [x] Extend `packages/shared/src/index.ts` with `increaseBidRequestSchema` requiring `clientCommandId`.
  - [x] Add `increaseBidResponseSchema` returning `{ state: BoardStateDto, result: CommandResultSummary & { command: "IncreaseBid" } }`.
  - [x] Add an `IncreaseBid` undo-history entry and widen `liveActionUndoHistoryEntrySchema` to include `RevealNextPlayer`, `SelectTeam`, and `IncreaseBid`.
  - [x] Suggested undo entry fields: `command`, `currentPlayerId`, `previousCurrentBid`, `nextCurrentBid`, `bidIncrement`, and `timestamp`.
  - [x] Keep DTOs allowlisted. Do not add raw `AuctionState`, action-log payloads, source filenames, source row numbers, registration fields, payment fields, or private setup diagnostics to board responses.
  - [x] Update `packages/shared/src/auction-state-contracts.test.ts` for request/response contracts, undo entry shape, strict DTO parsing, and private-field rejection.

- [x] Implement domain-owned Increase Bid behavior. (AC: 2, 5, 6)
  - [x] Add a pure command such as `increaseBid` in `packages/domain/src/increase-bid.ts` and export it from `packages/domain/src/index.ts`.
  - [x] Accept authoritative `AuctionState` and `now()` timestamp. Return typed success or typed conflict/error. No DB, fetch, React state, or filesystem access.
  - [x] Require `state.phase === "InitialAuction"` for this story. Do not implement Phase 2 increment behavior yet, even though the same rule will later apply to Unsold Bidding.
  - [x] Require a revealed Current Player and non-null positive Current Bid.
  - [x] Add exactly `state.parameters.bidIncrement` to `state.currentBid`. Use integer money units only.
  - [x] On success, mutate only `currentBid`, `undoHistory`, and `updatedAt`.
  - [x] Preserve `currentPlayerId`, all Player statuses, sold fields, selected Team, Teams, budgets, squad counts, role counts, phase, Phase 1 order, persistence failure state, and auction parameters.
  - [x] Add a reversible `IncreaseBid` undo-history entry for every successful increment. Do not collapse repeated increments; each verbal bid step must be independently undoable for Story 2.9.
  - [x] Summary copy should be operational and specific, for example `Increased bid for Aarav Menon to 12.` Avoid vague or celebratory copy.

- [x] Persist Increase Bid as one atomic live mutation. (AC: 2, 5, 6)
  - [x] Extend `packages/persistence/src/index.ts` with `CommitIncreaseBidInput` and `commitIncreaseBid`, or generalize the current live-mutation transaction pattern without weakening tests.
  - [x] Widen `ActionLogEntry.command` to include `"IncreaseBid"`.
  - [x] In one SQLite transaction: assert mutations are allowed, reject duplicate `clientCommandId`, assert active matching auction, update `auction_state.state_json`, `phase`, `updated_at`, and `persistence_failure`, and insert an `action_log` row with command `IncreaseBid`, `undoable = 1`, timestamp, summary, and payload JSON.
  - [x] `action_log.payload_json` must include at least command, current Player id, previous Current Bid, next Current Bid, bid increment, and compact undo payload.
  - [x] Write `data/snapshots/latest.json` only after DB commit.
  - [x] If snapshot writing fails, preserve the committed bid state, mark `persistenceFailure`, return authoritative state with warning behavior consistent with Stories 2.2 and 2.3, and block later mutations until recovery is addressed.
  - [x] Do not create a separate bids table or UI-local bid truth in this story. Authoritative state remains `auction_state.state_json`.

- [x] Add `POST /api/auction/increase-bid` in the Fastify app. (AC: 2, 3, 6)
  - [x] In `apps/server/src/app.ts`, add an intent-named same-origin route using `application/json` only and the shared `increaseBidRequestSchema`.
  - [x] Return `400` for invalid request shape, `415` for unsupported content type, and `409` for inactive auction, uncleared persistence failure, duplicate `clientCommandId`, wrong phase, missing Current Player, or missing Current Bid.
  - [x] Route handlers may adapt errors and DTOs only. They must not decide increment semantics or compute undo payloads directly.
  - [x] Return `IncreaseBid` result summaries and authoritative `toBoardStateDto(result.state)`.
  - [x] Keep logs and responses free of private setup/source fields.

- [x] Add the live board Increase Bid UI and keyboard shortcut. (AC: 1, 2, 3, 4, 6)
  - [x] In `apps/web/src/main.tsx`, add an increase-bid command handler mirroring `handleRevealNext` and `handleSelectTeam`: fresh `clientCommandId`, in-flight ref, generation guard, pending affordance, strict shared response parsing, authoritative `boardState` replacement, and `refreshBoardState()` on command error.
  - [x] Add a visible `Increase Bid` live button near Current Bid, using the existing live-board hierarchy and the Live Gold button treatment.
  - [x] Enable Increase Bid only when `boardState.phase === "InitialAuction"`, `boardState.currentPlayer !== null`, `boardState.currentBid !== null`, no increase command is in flight, and `boardState.persistenceFailure === null`.
  - [x] Add or extend `apps/web/src/auction-board-helpers.ts` with `canIncreaseBid(boardState)` so enablement is centralized in UI helpers, not duplicated inline.
  - [x] Add `+` keyboard shortcut handling in React. It must call the same `handleIncreaseBid` path as the visible button, ignore events when focus is inside `input`, `textarea`, `select`, or editable content, and respect in-flight/disabled guards.
  - [x] Do not use `+` to mutate client state directly; the server response remains authoritative.
  - [x] Keep the Current Bid as the largest value on the board and use stable/tabular numeric rendering. Button pending/error text must not resize the board or push Team tiles.
  - [x] Preserve existing selectors from Stories 2.1-2.3: `auction-board`, `phase-indicator`, `current-player-panel`, `current-bid`, `reveal-next`, `phase1-progress`, `phase1-current-category`, `phase1-ordered-count`, `team-tile`, `team-tile-selected`, `selected-team`, `clear-selected-team`, and `team-capacity-reason`.
  - [x] Add stable selectors for this story: `increase-bid`, `increase-bid-error` or a shared command-error region, and any visual pulse/state selector needed by tests.

- [x] Add focused tests and preserve regressions. (AC: 1-7)
  - [x] Domain tests: increases by configured `bidIncrement`; rejects wrong phase, missing Current Player, and missing Current Bid; appends undo entry; preserves selected Team, Players, Teams, budgets, squad counts, role counts, phase, and Phase 1 order; repeated increments produce repeated undoable entries.
  - [x] Shared contract tests: Increase Bid request/response schemas, `IncreaseBid` undo-history entry, strict DTO parsing, and privacy rejection.
  - [x] Persistence tests: increment commit updates state/action log/undoable flag/snapshot, duplicate command handling, reopen/resume state, repeated increments, and snapshot-failure mutation blocking.
  - [x] API tests in `apps/server/src/app.test.ts`: valid setup -> Start Auction -> Reveal Next -> Increase Bid returns Current Bid plus increment; repeated increments accumulate; invalid content type/body return `415`/`400`; duplicate command id returns `409`; no current player/wrong phase return `409`; response JSON excludes private fixture values.
  - [x] UI/helper/component tests: `canIncreaseBid` enablement, button disabled states, pending guard, error recovery path, keyboard shortcut ignores form fields, keyboard shortcut uses the same command handler, and Current Bid remains displayed with stable live styling.
  - [x] Playwright event-mode test: complete valid setup, start auction, reveal current player, assert base Current Bid, click Increase Bid, assert bid increased by configured increment, press `+`, assert one more increment, refresh and verify authoritative Current Bid persists, and confirm private sample values are absent.
  - [x] Regression tests from Stories 1.1-2.3 must still pass, especially setup import privacy, placeholder non-blocking behavior, parameter locking, Start Auction duplicate handling, Phase 1 order persistence/no-reshuffle, Reveal Next duplicate handling, and Team selection selected-state persistence.

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Epic 2 `in-progress`, Stories 2.1, 2.2, and 2.3 `done`, and Story 2.4 `backlog` at story creation time. This story updates Story 2.4 to `ready-for-dev`.
- Current `HEAD` at story creation is `5c960b2` (`Story 2.3: Select Bidding Team From Team Tiles`).
- Worktree was clean at story creation time.
- No `project-context.md` file was found for the persistent-facts glob during story creation.

### Existing Files That This Story Will Touch

Read these before editing and update them in place:

- `packages/shared/src/index.ts`: owns strict Zod schemas/types for auction state, Board DTOs, command requests/responses, and undo history. Add Increase Bid request/response and undo entry here unless extracting adjacent shared files and re-exporting.
- `packages/shared/src/auction-state-contracts.test.ts`: extend shared schema/privacy coverage for Increase Bid.
- `packages/domain/src/increase-bid.ts` (new): place bid increment domain command here. Do not put increment rules in Fastify, React, or persistence.
- `packages/domain/src/index.ts`: re-export the new command and types.
- `packages/domain/src/reveal-next-player.ts`: read for command result, timestamp, undo-history, immutability, and Current Bid initialization style.
- `packages/domain/src/select-team.ts`: read for Story 2.3 command result, conflict pattern, and preservation of unrelated auction state.
- `packages/domain/src/reveal-next-player.test.ts` and `packages/domain/src/select-team.test.ts`: use as patterns for command tests and state builders.
- `packages/persistence/src/index.ts`: currently supports `StartAuction`, `RevealNextPlayer`, and `SelectTeam`. Extend live mutation persistence/action-log/snapshot behavior for `IncreaseBid` without breaking existing failure handling.
- `packages/persistence/src/auction-repository.test.ts`: extend for increment commit/action-log/snapshot/resume/repeated-increment/failure coverage.
- `apps/server/src/app.ts`: add the increase route and response handling; reuse `toBoardStateDto`.
- `apps/server/src/app.test.ts`: add Fastify inject coverage for increase route, repeated increments, duplicate command id, conflict status, and privacy.
- `apps/web/src/main.tsx`: wire Increase Bid command state, visible live button, keyboard shortcut, response parsing, pending state, and authoritative reconciliation.
- `apps/web/src/auction-board-helpers.ts`: add UI enablement helper only. Do not put domain increment rules here.
- `apps/web/src/auction-board-helpers.test.ts`: extend helper coverage for Increase Bid enablement.
- `apps/web/src/styles.css`: update live button/current bid styles only as needed for stable dimensions, focus state, and no layout shift.
- `apps/web/e2e/event-mode.spec.ts`: extend current event-mode flow from Start Auction, Reveal Next, and Team selection into bid increment and keyboard increment.
- `packages/test-fixtures/src/index.ts` and `_bmad-output/test-artifacts/sample-test-data/*`: use existing fixtures when possible; runtime code must not import `@auction-manager/test-fixtures`.

Do not hand-edit `dist/` outputs. They are build artifacts.

### Current Behavior Of Key UPDATE Files

- `revealNextPlayer` requires `InitialAuction`, requires no unresolved Current Player, selects the first `Pending` player from persisted `phase1Order.playerIds`, sets that Player to `Current`, sets `currentBid` from `player.basePrice`, clears `selectedTeamId`, appends a `RevealNextPlayer` undo entry, and leaves Teams/order unchanged.
- `selectTeam` requires `InitialAuction`, a revealed Current Player, and positive Current Bid. It mutates only `selectedTeamId`, `undoHistory`, and `updatedAt` when selection changes; same-selection is a no-op success with `undoRecorded: false`.
- `AuctionState` already has `currentBid: number | null` and `parameters.bidIncrement`, so Story 2.4 should use those existing fields instead of adding a separate bid model.
- `auctionParametersSchema` already validates `bidIncrement` as a positive integer and parameters are locked after Start Auction.
- `liveActionUndoHistoryEntrySchema` currently allows `RevealNextPlayer` and `SelectTeam`; it must be widened for `IncreaseBid`.
- `ActionLogEntry.command` currently allows `"StartAuction" | "RevealNextPlayer" | "SelectTeam"`; it must be widened for `IncreaseBid`.
- `commitRevealNextPlayer` and `commitSelectTeam` show the expected persistence shape: validate state, assert mutations allowed, reject duplicate command id, update `auction_state`, insert action log, then write snapshot after commit and mark `persistenceFailure` on snapshot failure.
- `POST /api/auction/reveal-next` and `POST /api/auction/select-team` show the expected route shape: content-type check, strict shared request parsing, current-state load, persistence-failure guard, duplicate command guard, domain command call, persistence commit, authoritative DTO response, and snapshot-failure warning response.
- `toBoardStateDto` already returns allowlisted Player/Team fields, `currentBid`, `selectedTeamId`, phase progress, and current player capacity. Increase Bid should not require DTO shape changes beyond adding response schemas.
- `AuctionBoard` currently displays Current Bid in `.bid-panel .current-bid-live`, renders Reveal Next and selected-team controls, and renders Team tiles as buttons from Story 2.3.
- `handleRevealNext` and `handleSelectTeam` demonstrate the React command pattern to reuse: generation ref, in-flight ref, `clientCommandId`, shared response schema `safeParse`, authoritative `boardState` replacement, and state refresh on error.
- There is no global keyboard shortcut handler yet for live commands. Add one carefully and clean it up in `useEffect`.

### IncreaseBid Command Contract Guidance

Preferred domain result shape, adjust only to match local style:

```ts
type IncreaseBidErrorCode =
  | "auction_not_in_initial_phase"
  | "current_player_required"
  | "current_bid_required";

type IncreaseBidResult =
  | {
      ok: true;
      state: AuctionState;
      previousCurrentBid: number;
      nextCurrentBid: number;
      bidIncrement: number;
      summary: string;
    }
  | {
      ok: false;
      error: IncreaseBidErrorCode;
      message: string;
    };
```

On success:

- `previousCurrentBid` is the current authoritative bid before mutation.
- `nextCurrentBid = previousCurrentBid + state.parameters.bidIncrement`.
- `currentBid` becomes `nextCurrentBid`.
- `updatedAt` uses the command timestamp.
- one `IncreaseBid` undo-history entry is appended.
- no Player, Team, selected Team, phase, order, parameter, or persistence-failure field changes.

Suggested undo entry:

```ts
{
  command: "IncreaseBid",
  currentPlayerId,
  previousCurrentBid,
  nextCurrentBid,
  bidIncrement: state.parameters.bidIncrement,
  timestamp
}
```

Suggested route path and test id:

- API: `POST /api/auction/increase-bid`
- UI button: `data-testid="increase-bid"`

### Persistence Ownership

This story owns durable Current Bid increments for Phase 1 live bidding.

Minimum durable concepts:

- `auction_state.state_json`: update `currentBid`, `undoHistory`, `updatedAt`, and `persistenceFailure` if needed.
- `action_log`: insert command `IncreaseBid`, `client_command_id`, timestamp, summary, payload JSON, and `undoable = 1`.
- `action_log.payload_json`: include command, current Player id, previous Current Bid, next Current Bid, bid increment, and compact undo payload.
- `snapshots/latest.json`: write the updated authoritative state after DB commit.

Constraints:

- Do not mutate `selectedTeamId`.
- Do not mutate Player status, sold price, winning Team, acquisition type, Team budget, remaining budget, squad count, or role counts.
- Do not implement invalid sale blocking, Mark Sold, Mark Unsold, Undo execution, Team rosters, Phase 2, or Manual Assignment in this story.
- Do not allow mutation while `persistenceFailure` is set.
- Do not write snapshot before DB commit.
- Do not expose action-log payloads to the room-facing board.

### Architecture Guardrails

- AD-2: `packages/domain` owns bid increment semantics. React and Fastify may request and display results only.
- AD-3: React reconciles to authoritative server state after increment; React may not keep an independent Current Bid.
- AD-4: `POST /api/auction/increase-bid` must require `clientCommandId`, validate request/response schemas, and return authoritative state plus summary.
- AD-5: Current Bid state and action-log write must be atomic, with snapshot after commit.
- AD-6: Increase Bid must be undoable for Story 2.9. Each increment is an action-log-backed undo step.
- AD-8: board DTOs, route responses, command logs, snapshots, and rendered UI must exclude private setup/source fields.
- AD-11: domain command changes need Vitest domain tests; persistence changes need transaction/resume/action-log/snapshot tests; route changes need Fastify `inject()` tests; UI flow changes need Playwright/event-mode coverage.
- AD-12: keep this slice correctness-first. Do not build later sale, unsold, or undo execution controls before bid increment state is reliable.
- AD-13: use locked `AuctionParameters.bidIncrement`; do not hard-code `2` except in fixture expectations where the fixture explicitly configures it.
- AD-14: this story is Phase 1 `InitialAuction` only. Do not implement Phase 2 increment behavior yet.

### UX Requirements For This Story

- Current Bid remains the largest number on the live board and uses Live Gold.
- Increase Bid is a routine live action near the Current Bid and uses the Live button treatment, not primary green or danger red.
- Live Gold is reserved for Current Bid and the bid increment moment; do not use gold as a generic accent elsewhere.
- Bid, budget, squad, and role-count values must use visually stable numeric rendering and stable container dimensions so changing the bid does not move controls or Team tiles.
- The `+` shortcut must be keyboard-accessible but safe: ignore form/editable focus, respect disabled/in-flight guards, and call the same server command as the button.
- Pending state disables repeated click/shortcut submissions until authoritative response returns.
- Keep operational copy calm and specific: `Increased bid for Aarav Menon to 12.` Avoid hype, jokes, and vague errors.
- Preserve responsive acceptance profiles: 1440x900, 1366x768, 1920x1080 projected display, and 390x844 fallback without text overlap.
- Maintain WCAG-oriented basics: visible focus, real button semantics, accessible name, text error state, standard keyboard behavior, and live controls at least 44 CSS px.

### Previous Story Intelligence

- Story 2.3 added `SelectTeam` shared contracts, pure domain command, capacity projection, persistence commit, `POST /api/auction/select-team`, Team tile buttons, selected-state rendering, duplicate-command protection, and event-mode E2E coverage.
- Story 2.3 established no-op success behavior for selecting the already-selected Team. Do not copy that for Increase Bid; every successful Increase Bid changes Current Bid and must be undoable.
- Story 2.3 capacity reasons depend on `currentBid`. After Increase Bid succeeds, the returned DTO should automatically recompute capacity in `toBoardStateDto`; React should not recompute sale validity.
- Story 2.2 intentionally initializes `currentBid` from Player base price and clears `selectedTeamId` on reveal. Story 2.4 should rely on that initialization and only increment after a Current Player exists.
- Story 2.1 added persisted `phase1Order` and `phase1Progress`; do not reshuffle or recalculate order while increasing a bid.
- Existing event-mode test data has 8 Players and 4 Teams; use it for E2E and privacy assertions.

### Git Intelligence Summary

- Recent commits:
  - `5c960b2 Story 2.3: Select Bidding Team From Team Tiles`
  - `4801c58 Story 2.2: Reveal Current Player on the Live Board`
  - `d7bfe7b Story 2.1: Create Persisted Phase 1 Player Order`
  - `70a0446 Update Readme`
  - `4ffbc6d refactor(web): remove verbose helper copy from setup UI`
- Story 2.3 touched `packages/shared/src/index.ts`, `packages/domain/src/select-team.ts`, `packages/domain/src/index.ts`, `packages/persistence/src/index.ts`, `apps/server/src/app.ts`, `apps/web/src/main.tsx`, `apps/web/src/styles.css`, helper tests, API tests, persistence tests, and event-mode tests. Story 2.4 should extend the same command slice.
- The repo pattern is strict shared contracts, pure domain commands, transaction-backed persistence, thin Fastify adapters, React `safeParse` of server JSON, Vitest coverage, and Playwright event-mode coverage.
- Package dependency direction to preserve: `shared` has no workspace dependencies; `domain` depends on `shared`; `persistence` depends on `domain` and `shared`; `imports` depends on `shared`; `server` depends on runtime packages; `web` depends on `shared`.

### Latest Tech Information

Checked on 2026-07-07:

- npm latest versions: React `19.2.7`, Fastify `5.10.0`, Zod `4.4.3`, better-sqlite3 `12.11.1`, Playwright `1.61.1`, Vitest `4.1.10`, Vite `8.1.3`, TypeScript `6.0.3`, Lucide React `1.23.0`.
- Architecture pins React `19.2.7`, Fastify `5.9.0`, Zod `4.4.3`, better-sqlite3 `12.11.1`, Playwright `1.61.1`, Vitest `4.1.9`, Vite `8.1.3`, TypeScript `6.0.3`, and Lucide React `1.23.0`.
- `package.json` ranges currently allow compatible installed versions. Do not upgrade dependencies in this story just to chase Fastify/Vitest patch releases.
- Use the installed lockfile/API unless implementation hits a concrete bug requiring an explicit upgrade and full regression run.
- Fastify route discipline remains: content-type checks plus schema/body validation. Keep `application/json` only for Increase Bid.
- Zod 4 remains the runtime schema library. Use strict schemas for external DTOs and `safeParse` at React/server boundaries.
- better-sqlite3 transaction wrappers remain the local pattern for atomic DB mutations. Keep state update and action-log insert in one transaction.

### Project Context Reference

- Persistent fact glob `**/project-context.md` found no files during story creation.
- Primary source artifacts used:
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md`
  - `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md`
  - `_bmad-output/implementation-artifacts/2-3-select-bidding-team-from-team-tiles.md`
  - Current source files listed above.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npx vitest run packages/shared/src/auction-state-contracts.test.ts packages/domain/src/increase-bid.test.ts` - passed.
- `npx vitest run packages/persistence/src/auction-repository.test.ts` - passed.
- `npx vitest run apps/server/src/app.test.ts` - passed.
- `npx vitest run apps/web/src/auction-board-helpers.test.ts` - passed.
- `npm run typecheck` - passed.
- `npm test` - passed, 29 files and 188 tests.
- `npm run test:e2e:event` - passed, 8 Playwright tests.

### Completion Notes List

- Story context created by BMad create-story workflow on 2026-07-07.
- Added strict shared Increase Bid request/response schemas and a strict `IncreaseBid` undo-history entry.
- Implemented domain-owned Phase 1 bid increment behavior that mutates only `currentBid`, `undoHistory`, and `updatedAt`.
- Persisted Increase Bid as an atomic SQLite live mutation with duplicate command protection, undoable action-log payload, snapshot write after commit, and snapshot-failure blocking.
- Added `POST /api/auction/increase-bid` returning authoritative board DTOs and route-level conflict/status handling.
- Added live board Increase Bid UI, centralized `canIncreaseBid` helper, in-flight protection, authoritative reconciliation, and safe `+` keyboard shortcut handling.
- Extended unit, API, persistence, helper, and event-mode E2E coverage for click and keyboard increments, repeated increments, privacy, duplicate commands, and regression flows.

### File List

- `packages/shared/src/index.ts`
- `packages/shared/src/auction-state-contracts.test.ts`
- `packages/domain/src/increase-bid.ts`
- `packages/domain/src/increase-bid.test.ts`
- `packages/domain/src/index.ts`
- `packages/persistence/src/index.ts`
- `packages/persistence/src/auction-repository.test.ts`
- `apps/server/src/app.ts`
- `apps/server/src/app.test.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/auction-board-helpers.ts`
- `apps/web/src/auction-board-helpers.test.ts`
- `apps/web/src/styles.css`
- `apps/web/e2e/event-mode.spec.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-4-increase-current-bid.md`

### Change Log

- 2026-07-07: Implemented Story 2.4 Increase Current Bid and moved story to review.
- 2026-07-07: Code review completed; patch findings applied and story marked done.

### Review Findings

- [x] [Review][Patch] Remove dead route-layer `currentPlayerId` check after domain `increaseBid` [`apps/server/src/app.ts`]
- [x] [Review][Patch] Stabilize global `+` shortcut listener with empty-deps effect and handler ref [`apps/web/src/main.tsx`]
- [x] [Review][Patch] Ignore key-repeat and modifier `+` shortcuts (Ctrl/Cmd/Alt) [`apps/web/src/main.tsx`]
- [x] [Review][Patch] Fix `isEditableShortcutTarget` returning `undefined` for non-editable elements [`apps/web/src/auction-board-helpers.ts`]
- [x] [Review][Patch] Add keyboard shortcut target tests and `aria-busy` on Increase Bid button [`apps/web/src/auction-board-helpers.test.ts`, `apps/web/src/main.tsx`]
- [x] [Review][Patch] Fix duplicate Increase Bid persistence test setup to use start → reveal → bid flow [`packages/persistence/src/auction-repository.test.ts`]
- [x] [Review][Defer] Bid increment has no budget/team cap guard — Story 2.5 owns invalid-sale blocking [`packages/domain/src/increase-bid.ts`] — deferred, pre-existing scope boundary
- [x] [Review][Defer] Concurrent stale-state / optimistic concurrency — matches existing Start Auction / Reveal Next / Select Team pattern [`apps/server/src/app.ts`] — deferred, pre-existing
- [x] [Review][Defer] Route-level `listActionLog()` duplicate pre-check — consistent with Stories 2.2–2.3 idempotency pattern [`apps/server/src/app.ts`] — deferred, pre-existing
