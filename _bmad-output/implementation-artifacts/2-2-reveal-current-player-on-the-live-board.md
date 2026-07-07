---
baseline_commit: d7bfe7b7ad6f0e88515bc7671739a5032ea54986
created: 2026-07-07T17:40:58+0530
---

# Story 2.2: Reveal Current Player on the Live Board

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want to reveal the next pending Player on the live board,
so that the room can see who is currently up for bidding.

## Acceptance Criteria

1. Given the Initial Auction phase has pending Players and no Current Player requiring an outcome, when the operator selects Reveal Next Player, then the next Player from the persisted Phase 1 order becomes the Current Player, and the reveal command is recorded as a reversible live action.
2. Given a Player is revealed, when the live board renders, then it shows the Player name, photo or neutral placeholder, Role, Base Price, active phase/category, and phase progress, and the Current Bid is initialized from the Player's configured Base Price.
3. Given the revealed Player has no matched photo, when the live board renders the Player panel, then the board uses the neutral Player placeholder from the setup media contract, and missing media is not styled as a live-event failure.
4. Given the live board renders Current Player state, when board DTOs, route responses, rendered UI, logs emitted by the live command, and snapshots produced by the command are inspected, then they contain only allowlisted auction fields needed for the board and roster projections, and email, mobile, payment status, payment transaction ID, source timestamp, and ignored source fields are absent outside allowed setup diagnostics.
5. Given there is no Current Player and pending Players remain, when the live board renders, then Reveal Next Player is the safe primary action, and routine controls are visible without exposing Reset or Close beside live bidding actions.
6. Given a command is in flight, when the operator clicks Reveal Next Player repeatedly, then duplicate clicks do not create duplicate reveal mutations, and the UI reconciles to the authoritative state returned by the server.
7. Given a developer finishes this story, when they run the story's Dev Gate, then reveal command domain tests, route/schema tests, board DTO privacy tests, live-board component tests, and typecheck pass, and an E2E or acceptance test proves Reveal Next initializes the board and Current Bid correctly.
8. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks command ownership, board privacy, duplicate-command behavior, unit/API tests, and the reveal E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Tasks / Subtasks

- [x] Add shared command contracts for Reveal Next Player. (AC: 1, 4, 6, 7)
  - [x] Extend `packages/shared/src/index.ts` with `revealNextPlayerRequestSchema` requiring `clientCommandId`, and `revealNextPlayerResponseSchema` returning `{ state: BoardStateDto, result: CommandResultSummary & { command: "RevealNextPlayer" } }`.
  - [x] Keep request/response schemas strict. Do not add raw setup fields, source row numbers, source filenames, full Phase 1 order details, or private registration fields to board DTOs.
  - [x] Add a typed undo-history entry shape for reveal actions if the implementation needs more than the current `z.unknown()` array. Minimum payload should identify command, player id, prior current-player/current-bid/selected-team state, timestamp, and enough data for Story 2.9 to reverse the reveal without guessing.
  - [x] Update `packages/shared/src/auction-state-contracts.test.ts` to prove reveal response schemas accept the intended DTO and reject unexpected/private fields.

- [x] Implement domain-owned reveal behavior. (AC: 1, 2, 5, 7)
  - [x] Add a domain command such as `revealNextPlayer` in `packages/domain/src/reveal-next-player.ts` and export it from `packages/domain/src/index.ts`.
  - [x] Accept the current authoritative `AuctionState` and `now()` timestamp; return a typed success or typed conflict/error result. Keep this command pure: no DB, fetch, React state, or filesystem access.
  - [x] Require `state.phase === "InitialAuction"` for this story. Do not implement Phase 2 reveal behavior here.
  - [x] Reject reveal when `state.currentPlayerId` is not `null` or the current player still requires an outcome. This protects the live flow from skipping an unresolved Current Player.
  - [x] Select the first `Pending` Player id from `state.phase1Order.playerIds`. Do not sort players by array order, category name, player name, source row number, or any UI list. The persisted order from Story 2.1 is the only reveal order.
  - [x] On success, set the selected player's status to `Current`, set `currentPlayerId` to that id, set `currentBid` to `player.basePrice`, clear `selectedTeamId`, append a reversible reveal undo-history entry, update `updatedAt`, and leave teams, budgets, squad counts, sold fields, and the Phase 1 order unchanged.
  - [x] Return a typed no-pending-players conflict if no pending player remains. Do not transition phases in this story; Phase 2 transition belongs to later stories.
  - [x] Preserve integer money/count handling. Current Bid is the Player base price from locked auction parameters as stored on the Player, not a recalculation from mutable setup UI.

- [x] Persist reveal as one atomic live mutation. (AC: 1, 4, 6, 7)
  - [x] Extend `packages/persistence/src/index.ts` with a reusable live-mutation commit path or a focused `commitRevealNextPlayer` method. Choose the smallest shape that fits current patterns and will not block Stories 2.3-2.9 from sharing the same transaction approach.
  - [x] In one SQLite transaction: assert mutations are allowed, reject duplicate `clientCommandId`, validate the new `AuctionState` with `auctionStateSchema`, update `auction_state.state_json`, `phase`, `updated_at`, and `persistence_failure`, and insert an `action_log` row with command `RevealNextPlayer`, `undoable = 1`, timestamp, summary, and before/after or inverse payload.
  - [x] Write `data/snapshots/latest.json` only after DB commit. If snapshot writing fails, preserve the committed reveal, mark `persistenceFailure`, return the authoritative state with warning behavior consistent with Story 1.6/2.1, and block later mutations until recovery is addressed.
  - [x] Do not create separate current-player truth outside `auction_state.state_json` unless a materialized table is introduced with same-transaction writes and tests. Current persisted state remains authoritative.
  - [x] Extend action-log typing beyond `"StartAuction"` without losing existing `StartAuction` tests. `listActionLog()` should still return current-auction scoped rows in order.

- [x] Add `POST /api/auction/reveal-next` in the Fastify app. (AC: 1, 2, 4, 6, 7)
  - [x] Add an intent-named same-origin route in `apps/server/src/app.ts` using `application/json` only and the shared `revealNextPlayerRequestSchema`.
  - [x] Load current state from the repository, return `409` if no auction is active, persistence failure is uncleared, phase is wrong, no pending players remain, or a Current Player requires an outcome.
  - [x] Call the domain command, then commit through persistence. Route handlers may adapt errors and DTOs only; they must not choose the next player, calculate Current Bid, or mutate state directly.
  - [x] On duplicate `clientCommandId`, return `409 duplicate_client_command_id` without applying another reveal. If the repository can return the already-committed result safely, document and test that behavior; otherwise keep the existing duplicate rejection pattern.
  - [x] Return `RevealNextPlayer` result summary with operational copy such as `Revealed Aarav Menon at base price 10.` Do not include private source fields in logs or response payloads.
  - [x] Reuse `toBoardStateDto` and `toPhase1ProgressDto`; update those projections only if current-player/progress status needs correction after a reveal.

- [x] Update the live board UI for revealed and unrevealed states. (AC: 2, 3, 5, 6, 7)
  - [x] In `apps/web/src/main.tsx`, add a reveal command handler mirroring the Start Auction generation-token pattern: create a fresh `clientCommandId`, set pending state, disable the Reveal button, parse the shared reveal response schema, and replace `boardState` with the authoritative response state.
  - [x] Enable `Reveal Next Player` only when `boardState.phase === "InitialAuction"`, `boardState.currentPlayer === null`, `boardState.phase1Progress.pendingPlayerCount > 0`, no command is in flight, and `boardState.persistenceFailure === null`.
  - [x] Render revealed player fields from `boardState.currentPlayer`: name, role, base price, photo when `photoAssetId` exists, and a neutral placeholder when it does not. Placeholder copy should be neutral, e.g. `Player photo placeholder`, not an error.
  - [x] Render `currentBid` as the largest live number when a Current Player exists. Use stable numeric styling and keep `data-testid="current-bid"`.
  - [x] Keep current selectors stable: `auction-board`, `phase-indicator`, `current-player-panel`, `current-bid`, `reveal-next`, `phase1-progress`, `phase1-current-category`, and `phase1-ordered-count`. Add stable selectors where useful, such as `current-player-name`, `current-player-role`, `current-player-base-price`, and `current-player-photo-placeholder`.
  - [x] Show active phase/category and progress after reveal. Progress should reflect one fewer pending Player and a Current Player without treating the Current Player as sold/unsold/completed.
  - [x] Keep Reset and Close out of the normal live control cluster. Do not implement Mark Sold, Mark Unsold, Team selection, bid increment, Undo, rosters, dangerous operations, or phase transition controls in this story except for nonfunctional placeholders required to keep the board coherent.

- [x] Add focused tests and preserve regressions. (AC: 3, 4, 6, 7, 8)
  - [x] Domain unit tests: reveals first pending id from persisted `phase1Order.playerIds`; sets Player `Current`; initializes bid from base price; clears selected team; appends reversible undo entry; rejects wrong phase, unresolved current player, and no pending players; leaves teams/order unchanged.
  - [x] Persistence tests: reveal commit updates current state, action log, undoable flag, snapshot, duplicate command handling, reopen/resume state, and snapshot failure mutation blocking.
  - [x] API tests in `apps/server/src/app.test.ts`: valid setup -> Start Auction -> Reveal Next returns Current Player and Current Bid; `GET /api/state` resumes the revealed state; invalid content type/body returns `415`/`400`; duplicate reveal command returns `409`; second reveal while Current Player exists returns `409`; response JSON excludes private fixture values.
  - [x] UI/component tests where feasible for current-player rendering, neutral photo placeholder, enabled/disabled Reveal button, pending affordance, and schema parse failure/error state.
  - [x] Playwright event-mode test: complete valid setup, start auction, click Reveal Next, assert current player appears, Current Bid equals the revealed player's Base Price, progress updates, duplicate rapid clicks do not reveal a second player, refresh preserves revealed state, and private sample values are absent.
  - [x] Regression tests from Stories 1.1-2.1 must still pass, especially setup import privacy, placeholder non-blocking behavior, parameter locking, Start Auction duplicate handling, Phase 1 order persistence/no-reshuffle, and board progress display before reveal.

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Epic 2 in `in-progress`, Story 2.1 `done`, and Story 2.2 `backlog` at story creation time. This story updates Story 2.2 to `ready-for-dev`.
- Current `HEAD` is `d7bfe7b` (`Story 2.1: Create Persisted Phase 1 Player Order`).
- Worktree was clean at story creation time.
- No `project-context.md` file was found for the persistent-facts glob during story creation.

### Existing Files That This Story Will Touch

Read these before editing and update them in place:

- `packages/shared/src/index.ts`: owns strict Zod schemas/types for auction state, board DTOs, command requests/responses, phases, statuses, and `undoHistory`. Add reveal request/response contracts here unless extracting adjacent shared files and re-exporting.
- `packages/shared/src/auction-state-contracts.test.ts`: extend contract/privacy coverage for reveal response and undo-history shape.
- `packages/domain/src/reveal-next-player.ts` (new): place reveal command logic here. Do not put reveal-order decisions in Fastify, React, or persistence.
- `packages/domain/src/index.ts`: re-export the new reveal command and types.
- `packages/domain/src/phase1-order.ts`: read for ordering assumptions; do not modify unless a test exposes a real gap.
- `packages/domain/src/start-auction.ts`: read for state shape and cloning patterns; reveal should consume the state this file creates.
- `packages/persistence/src/index.ts`: currently supports Start Auction only. Extend transaction/action-log/snapshot behavior for live mutations without breaking existing migration and snapshot-failure logic.
- `packages/persistence/src/auction-repository.test.ts`: extend for reveal commit/action-log/snapshot/resume/failure coverage.
- `apps/server/src/app.ts`: add the reveal route and response handling; reuse `toBoardStateDto`.
- `apps/server/src/phase1-progress.ts`: verify progress semantics after Current Player is revealed. Current Player is not completed until sold/unsold in later stories.
- `apps/server/src/app.test.ts`: add Fastify inject coverage for reveal route and privacy.
- `apps/web/src/main.tsx`: wire Reveal button, current-player rendering, pending state, response parsing, and authoritative reconciliation.
- `apps/web/src/styles.css`: update live board/player/bid/placeholder styles with stable dimensions and no layout shift.
- `apps/web/e2e/event-mode.spec.ts`: extend current event-mode flow from Start Auction into Reveal Next.
- `packages/test-fixtures/src/index.ts` and `_bmad-output/test-artifacts/sample-test-data/*`: use existing fixtures when possible; runtime code must not import `@auction-manager/test-fixtures`.

Do not hand-edit `dist/` outputs. They are build artifacts.

### Current Behavior Of Key UPDATE Files

- `startAuctionFromSetup` creates `AuctionState` in `InitialAuction` with all Players `Pending`, `currentPlayerId: null`, `currentBid: null`, `selectedTeamId: null`, `undoHistory: []`, locked cloned parameters, generated `phase1Order`, timestamps, and `persistenceFailure: null`.
- `phase1Order.playerIds` is the flattened authoritative reveal order. `phase1Order.categories` preserves configured category order including empty categories.
- `auctionStateSchema` validates that Phase 1 order categories match locked parameter order and that every roster Player appears exactly once in `phase1Order`.
- `toPhase1ProgressDto` currently counts `Pending` as pending and `Sold`/`Unsold`/`Assigned` as completed. After reveal, confirm whether `Current` should reduce pending without increasing completed; tests must lock the intended progress semantics.
- `toBoardStateDto` already projects allowlisted Player/Team fields and finds `currentPlayer` from `currentPlayerId`.
- `commitStartAuction` validates state, writes current state plus `StartAuction` action log in one transaction, writes snapshot after commit, marks `persistenceFailure` on snapshot write failure, and rejects further mutations while failure is uncleared.
- `ActionLogEntry` is currently typed only for `"StartAuction"`. Story 2.2 must widen it to include `"RevealNextPlayer"` while keeping existing tests intact.
- `AuctionBoard` currently renders Initial Auction with no Current Player, no current bid, disabled `Reveal Next Player`, progress summary, and Team tiles. This is the correct starting shell for Story 2.2.
- `handleStartAuction` already demonstrates the UI pattern to reuse: generation token, pending state, `clientCommandId`, strict shared response parsing, authoritative `boardState` replacement, and operational error copy.

### Reveal Command Contract Guidance

Preferred domain result shape, adjust only to match local style:

```ts
type RevealNextPlayerErrorCode =
  | "auction_not_in_initial_phase"
  | "current_player_requires_outcome"
  | "no_pending_phase1_players";

interface RevealNextPlayerSuccess {
  ok: true;
  state: AuctionState;
  revealedPlayerId: string;
  summary: string;
}
```

Preferred state mutation:

```ts
const nextPlayerId = state.phase1Order.playerIds.find((playerId) => {
  const player = playerById.get(playerId);
  return player?.status === "Pending";
});
```

On success:

- exactly one Player moves from `Pending` to `Current`;
- `currentPlayerId` becomes that Player id;
- `currentBid` becomes that Player's persisted `basePrice`;
- `selectedTeamId` becomes `null`;
- `phase1Order` is unchanged;
- `updatedAt` uses the command timestamp;
- one undo-history entry and one `action_log` row represent the reveal;
- no Team budget, remaining budget, squad count, role count, sold price, winning team, or acquisition type changes.

### Persistence Ownership

This story owns the first live mutation after Start Auction.

Minimum durable concepts:

- `auction_state.state_json`: update `players`, `currentPlayerId`, `currentBid`, `selectedTeamId`, `undoHistory`, `updatedAt`, and `persistenceFailure` if needed.
- `action_log`: insert command `RevealNextPlayer`, `client_command_id`, timestamp, summary, payload JSON, and `undoable = 1`.
- `action_log.payload_json`: include at least command, revealed Player id, previous current-player/current-bid/selected-team values, new current bid, and a compact undo payload. Prefer IDs and auction values over names.
- `snapshots/latest.json`: write the updated authoritative state after DB commit.

Constraints:

- Do not mutate or reshuffle `phase1Order`.
- Do not create separate roster truth.
- Do not write snapshot before DB commit.
- Do not allow any mutation while `persistenceFailure` is set.
- Do not expose `action_log` payloads to the room-facing board.

### Architecture Guardrails

- AD-2: `packages/domain` owns reveal-order selection and Current Bid initialization.
- AD-3: React reconciles to authoritative server state after reveal; React may not optimistically pick the next Player.
- AD-4: `POST /api/auction/reveal-next` must require `clientCommandId`, validate request/response schemas, and return authoritative state plus summary.
- AD-5: reveal state and action-log write must be atomic, with snapshot after commit.
- AD-6: reveal must be recorded as undoable even though full Undo is implemented later.
- AD-8: board DTOs, route responses, command logs, snapshots, and rendered UI must exclude private setup/source fields.
- AD-11: domain command changes need Vitest domain tests; persistence changes need transaction/resume/action-log/snapshot tests; route changes need Fastify `inject()` tests; UI flow changes need Playwright/event-mode coverage.
- AD-12: keep this slice correctness-first. Do not build later bidding controls before reveal state is reliable.
- AD-13: Current Bid uses locked auction parameters as already materialized on the Player during Start Auction.
- AD-14: this story is Phase 1 reveal only. Do not implement Phase 2 unsold reveal.

### UX Requirements For This Story

- Live board becomes an active Initial Auction board.
- With no Current Player and pending Players remaining, `Reveal Next Player` is the safe primary action.
- When a Player is revealed, first read is Player name/photo or placeholder plus Current Bid; second read is Role/Base Price/active category/progress; third read remains routine controls.
- Current Bid should use the live gold treatment and be the largest number on the live board.
- Missing player photo uses a neutral placeholder surface, not danger red or failure copy.
- Command-in-flight state disables Reveal Next until the server returns. Duplicate clicks must not move multiple Players to Current.
- Keep operational copy calm and specific: `Revealed Aarav Menon at base price 10.` Avoid celebratory or joke copy.
- Maintain WCAG-oriented basics: visible focus, accessible button names, accessible image/placeholder names, text progress, 44 CSS px minimum live controls, and keyboard activation through standard button behavior.
- Preserve responsive acceptance profiles: 1440x900, 1366x768, 1920x1080 projected display, and 390x844 fallback without text overlap.

### Previous Story Intelligence

- Story 2.1 added `phase1Order`, `phase1Progress`, domain order generation, persistence/reopen tests, API projection, and UI order-readiness display.
- Story 2.1 explicitly left Reveal Next disabled and out of scope. This story should enable and implement that exact button, not add a separate control.
- Story 2.1 introduced `apps/server/src/phase1-progress.ts`; reuse it and update tests if reveal semantics require a `Current` count interpretation.
- Story 2.1 widened persistence with legacy Phase 1 order migration. Do not regress loading old Story 1.6 state.
- Story 2.1 maintained privacy by projection; continue using strict DTO allowlists rather than returning raw `AuctionState` to React.
- Existing event-mode test data has 8 Players and 4 Teams; use it for reveal E2E and privacy assertions.

### Git Intelligence Summary

- Recent commits:
  - `d7bfe7b Story 2.1: Create Persisted Phase 1 Player Order`
  - `70a0446 Update Readme`
  - `4ffbc6d refactor(web): remove verbose helper copy from setup UI`
  - `e316f9a Story 1.6: Start Auction With Persisted Initial State`
  - `428ca0f Story 1.5: Configure Auction Parameters`
- Story 2.1 touched `packages/shared/src/index.ts`, `packages/domain/src/phase1-order.ts`, `packages/domain/src/start-auction.ts`, `packages/persistence/src/index.ts`, `apps/server/src/app.ts`, `apps/server/src/phase1-progress.ts`, `apps/web/src/main.tsx`, `apps/web/src/styles.css`, and event-mode tests. Story 2.2 should extend this same slice.
- The repo pattern is strict shared contracts, pure domain commands, transaction-backed persistence, thin Fastify adapters, React `safeParse` of server JSON, Vitest coverage, and Playwright event-mode coverage.
- Package dependency direction to preserve: `shared` has no workspace dependencies; `domain` depends on `shared`; `persistence` depends on `domain` and `shared`; `imports` depends on `shared`; `server` depends on runtime packages; `web` depends on `shared`.

### Latest Tech Information

Checked on 2026-07-07:

- npm latest: React `19.2.7`, Fastify `5.10.0`, Zod `4.4.3`, better-sqlite3 `12.11.1`, Playwright `1.61.1`.
- Architecture currently pins React `19.2.7`, Fastify `5.9.0`, Zod `4.4.3`, better-sqlite3 `12.11.1`, and Playwright `1.61.1`. Do not upgrade dependencies in this story just to chase Fastify `5.10.0`; use the installed lockfile/API unless implementation hits a concrete bug requiring an explicit upgrade and full regression run.
- Fastify latest docs continue to emphasize schema-based validation and exact content-type validation behavior. Keep the repo's explicit content-type checks plus Zod `safeParse` discipline for the reveal route.
- Zod 4 remains the runtime schema library. Use strict schemas for external DTOs and command contracts.
- better-sqlite3 transaction wrappers remain the right local pattern for atomic DB mutations. Keep current-state update and action-log insert in one transaction.
- Playwright auto-waits for actionability before clicks. The E2E duplicate-click check should still deliberately issue rapid clicks or concurrent command calls to prove app-level duplicate prevention, not rely only on Playwright actionability.
- Sources: `https://registry.npmjs.org/react/latest`, `https://registry.npmjs.org/fastify/latest`, `https://registry.npmjs.org/zod/latest`, `https://registry.npmjs.org/better-sqlite3/latest`, `https://registry.npmjs.org/@playwright/test/latest`, `https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/`, `https://zod.dev/api`, `https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md`, `https://playwright.dev/docs/actionability`, `https://react.dev/reference/react/useState`.

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

- `TD-016` P0: Reveal Next follows persisted Phase 1 order, initializes Current Bid from Base Price, and records undoable reveal action.
- `TD-021` P1: Reveal Next requires `clientCommandId`; duplicate command id and duplicate clicks do not reveal more than one Player.
- `TD-029` P0: board DTOs, live UI, command logs, and snapshots exclude private registration/source fields.
- `TD-035` P0 regression: valid setup still starts auction, lands on Initial Auction board, and shows Phase 1 progress before reveal.
- `TD-036` P0: refresh/reopen after reveal resumes the same Current Player and Current Bid.

Review/Test Gate:

- A second agent must inspect that route/UI code does not choose the next player or initialize Current Bid outside domain logic.
- The reviewer must verify reveal order correctness, no unresolved-current-player skip, undo/action-log payload adequacy for Story 2.9, snapshot/resume behavior, duplicate-command behavior, DTO privacy, neutral placeholder rendering, and E2E event-mode coverage.
- Blocking findings reopen the story for implementation iteration before it can be considered done.

### Project Structure Notes

- Extend existing packages; do not create a new app, service, package, database, cloud dependency, account system, or public deployment path.
- Keep runtime source under `src/`; do not edit `dist/` output by hand.
- Runtime packages must not import `@auction-manager/test-fixtures`.
- Keep stable test IDs because Stories 2.3-2.10 will build on the revealed Current Player board.
- This story should leave the system working end-to-end from valid setup -> Start Auction -> Reveal Next -> refresh/resume.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 2.2: Reveal Current Player on the Live Board`
- `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md#FR-8: Reveal next player`
- `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md#FR-9: Display live auction state`
- `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md#FR-19: Support multi-step undo`
- `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md#FR-20: Persist local auction state`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#AD-2---Domain-Package-Owns-Auction-Truth`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#AD-4---Command-Oriented-Same-Origin-HTTP`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#AD-5---Atomic-SQLite-Persistence`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#AD-6---Undo-Scope-Is-Action-Log-Based`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#AD-8---Privacy-By-Projection`
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md#Flow-2---First-live-bidding-round-Aaron-auction-operator-app-mirrored-to-large-display`
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md#Components`
- `_bmad-output/implementation-artifacts/2-1-create-persisted-phase-1-player-order.md#Previous-Story-Intelligence`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`
- `npm run test:e2e:event`

### Completion Notes List

- Added strict shared Reveal Next Player request/response contracts and typed reveal undo-history entries.
- Implemented pure domain-owned Phase 1 reveal logic using persisted `phase1Order.playerIds`, initializing Current Bid from stored base price and rejecting wrong phase/current-player/no-pending conflicts.
- Added atomic persistence for reveal mutations with duplicate command protection, undoable action-log payloads, snapshot-after-commit behavior, resume support, and snapshot-failure mutation blocking.
- Added `POST /api/auction/reveal-next` as a thin Fastify adapter over domain and persistence, returning allowlisted board DTOs and private-field-safe operational responses.
- Updated the live board to enable Reveal Next only when safe, guard duplicate same-tick clicks, render current player details/photo placeholder/current bid, and reconcile to authoritative server state.
- Extended Vitest and Playwright coverage for contracts, domain behavior, persistence, API conflicts/privacy, UI reveal flow, duplicate-click handling, and refresh/resume.

### File List

- `_bmad-output/implementation-artifacts/2-2-reveal-current-player-on-the-live-board.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/server/src/app.ts`
- `apps/server/src/app.test.ts`
- `apps/web/e2e/event-mode.spec.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/auction-board-helpers.ts`
- `apps/web/src/auction-board-helpers.test.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/reveal-next-player.ts`
- `packages/domain/src/reveal-next-player.test.ts`
- `packages/persistence/src/index.ts`
- `packages/persistence/src/auction-repository.test.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/auction-state-contracts.test.ts`

### Change Log

- 2026-07-07T17:55:25+0530: Implemented Story 2.2 Reveal Current Player on the Live Board and moved status to review.

### Review Findings

- [x] [Review][Patch] E2E progress assertions used weak substring matches on "7" and "1" [apps/web/e2e/event-mode.spec.ts:294]
- [x] [Review][Patch] Unreachable player lookup branch in reveal domain command [packages/domain/src/reveal-next-player.ts:62]
- [x] [Review][Patch] Reveal error alert reused CSV import styling and icon [apps/web/src/main.tsx:1578]
- [x] [Review][Patch] Stale board state after reveal conflict with no resync [apps/web/src/main.tsx:775]
- [x] [Review][Patch] Recovery snapshot copy referenced Start Auction only [apps/web/src/main.tsx:1459]
- [x] [Review][Patch] Current bid live styling applied without matching bid value [apps/web/src/main.tsx:1552]
- [x] [Review][Patch] Missing focused live-board helper tests for reveal affordance [apps/web/src/auction-board-helpers.test.ts]
- [x] [Review][Defer] Concurrent reveal lost-update race without optimistic concurrency [packages/persistence/src/index.ts:159] — deferred, matches existing Start Auction pattern until concurrent live commands land
- [x] [Review][Defer] Application-level duplicate clientCommandId pre-check is racy and O(n) [apps/server/src/app.ts:495] — deferred, consistent with Start Auction idempotency pattern
- [x] [Review][Defer] Strict undoHistory schema will need widening for future live commands [packages/shared/src/index.ts:1372] — deferred, intentional for Story 2.2 scope
