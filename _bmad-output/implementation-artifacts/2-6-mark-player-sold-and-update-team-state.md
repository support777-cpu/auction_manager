---
baseline_commit: f5b7951a30c109dc7b6267b6bd25ab17b276d3c3
---

# Story 2.6: Mark Player Sold and Update Team State

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want to mark the Current Player sold to the selected Team,
so that the auction board immediately reflects the sale and updated Team state.

## Acceptance Criteria

1. Given the `MarkSold` command contract and invalid-sale rejection rules from Story 2.5 exist, and a Current Player is revealed, a Team is selected, and no hard-block rule is violated, when the operator selects Mark Sold, then the accepted `MarkSold` path records the Player as Sold, and the Player records Sold Price and winning Team using the same command, schema, and route contract introduced for rejected sales.
2. Given Mark Sold succeeds, when the Team state updates, then the winning Team's remaining budget decreases by Sold Price, the winning Team's Squad Size and Role Count for the Player's Role increase, and the Team roster projection includes the sold Player with acquisition type `Sold` and Sold Price.
3. Given Mark Sold succeeds, when persistence completes, then the sale is committed atomically with current-state updates, an action-log entry, Undo payload, and latest snapshot, and the response returns the new authoritative board-ready state.
4. Given no Team is selected, when the operator attempts Mark Sold, then the sale is blocked, and no Player, Team, action-log, snapshot, or Undo History mutation occurs.
5. Given a sale succeeds, when the live board renders, then it shows a calm sale summary such as `Sold to [Team] for [Price]`, Reveal Next Player becomes the safe next action when pending Players remain, and Team rosters immediately show the sold Player under the winning Team.
6. Given a developer finishes this story, when they run the story's Dev Gate, then Mark Sold domain tests, roster projection tests, atomic persistence/action-log/snapshot tests, route/schema tests, live-board component tests, and typecheck pass, and an E2E or acceptance test proves a happy-path sale updates Player, Team, roster projection, board, action log, snapshot, and next-action state.
7. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks atomicity, domain-owned sale behavior, roster projection correctness, action-log/Undo payload correctness, unit/integration/API tests, and the happy-path sale E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Implementation Boundary

This story completes the accepted `MarkSold` path only. Story 2.5 already introduced the route, request schema, rejected response schema, invalid-sale capacity rules, blocked UI state, and non-mutation behavior for rejected attempts.

Do not introduce a second sale command, second route, or client-side sale calculation. Replace the current placeholder accepted path in `/api/auction/mark-sold`, where a valid `markSold()` result is still returned as a `409 sale_blocked`, with a persisted successful command response.

This story is Phase 1 `InitialAuction` only. Do not enable Phase 2 `UnsoldBidding` sales yet, do not implement Mark Unsold, Undo execution, Board/Rosters switch, Team detail drawer, Phase 2, Phase 3, Reset, or Close.

## Tasks / Subtasks

- [x] Extend shared contracts for accepted Mark Sold responses and undo entries. (AC: 1, 2, 3, 5, 6)
  - [x] In `packages/shared/src/index.ts`, add `markSoldAcceptedResponseSchema` or a `markSoldResponseSchema` union that accepts the successful command envelope `{ state, result: { command: "MarkSold", clientCommandId, message } }` and preserves the existing rejected response shape.
  - [x] Add a `MarkSold` undo history entry schema to `liveActionUndoHistoryEntrySchema`, including enough before/after fields to undo later: player id, previous Player status, previous sold price, previous winning Team, previous acquisition type, previous current player/bid/selected team, winning Team id, previous and next Team budget/squad/role count, sold price, and timestamp.
  - [x] Keep `AuctionPlayer.status = "Sold"`, `soldPrice`, `winningTeamId`, and `acquisitionType` inside the existing allowlisted board DTO. Do not add private/source/setup fields to board, roster, route, log, or snapshot DTOs.
  - [x] Update `packages/shared/src/auction-state-contracts.test.ts` for accepted response parsing, union parsing of accepted/rejected Mark Sold responses, Mark Sold undo entry parsing, and privacy rejection.

- [x] Convert `packages/domain/src/mark-sold.ts` from validation-only accepted path to full sale mutation. (AC: 1, 2, 4, 6, 7)
  - [x] Keep all Story 2.5 prerequisite and capacity-block behavior unchanged: wrong phase, no Current Player, no selected Team, missing Current Bid, missing selected Team, missing current Player, budget exceeded, squad full, role target full, and incomplete role capacity remain rejected and non-mutating.
  - [x] Add `now: () => string` to `MarkSoldInput`, matching `revealNextPlayer`, `selectTeam`, and `increaseBid`.
  - [x] On accepted sale, update only through domain state:
    - Current Player: `status: "Sold"`, `soldPrice: currentBid`, `winningTeamId: selectedTeam.id`, `acquisitionType: "Auction"`.
    - Winning Team: `remainingBudget -= currentBid`, `squadCount += 1`, `roleCounts[currentPlayer.role] += 1`.
    - Board state: clear `currentPlayerId`, `currentBid`, and `selectedTeamId` so `Reveal Next Player` becomes the safe next action.
    - Undo History: append a `MarkSold` entry with complete restoration data.
    - `updatedAt`: set to the injected timestamp.
  - [x] Return an accepted summary such as `Sold Aarav Menon to Falcons for 10.` or `Sold to Falcons for 10.`; use this same message in the API command result and board summary.
  - [x] Do not mutate input objects in place. Existing tests assert identity preservation for rejected results; keep that invariant for every rejected branch.
  - [x] Keep role capacity and budget logic in `packages/domain`; React and Fastify may only request/display results.

- [x] Add accepted-sale persistence ownership in `packages/persistence/src/index.ts`. (AC: 2, 3, 6, 7)
  - [x] Add `CommitMarkSoldInput` with `previousState`, `state`, `clientCommandId`, `summary`, `playerId`, `winningTeamId`, `soldPrice`, and any fields needed to write a clear action-log payload.
  - [x] Extend `ActionLogEntry.command` to include `"MarkSold"`.
  - [x] Add `commitMarkSold` to `AuctionRepository` and implement it as one SQLite transaction that:
    - calls `assertMutationsAllowed`;
    - rejects duplicate `clientCommandId`;
    - verifies the active auction id matches the committed state;
    - updates `auction_state.state_json`, `phase`, `updated_at`, and clears `persistence_failure`;
    - inserts one `action_log` row with command `MarkSold`, `undoable = 1`, the summary, and an undo/action payload.
  - [x] Write or schedule `data/snapshots/latest.json` only after the DB transaction commits, following existing commit patterns.
  - [x] On snapshot write failure, mark `persistenceFailure` and reject later mutations exactly like Reveal/Select/Increase.
  - [x] Payload must include enough audit and future-undo information: player id, winning Team id, sold price, previous Player ownership fields, previous current player/bid/selected team, previous and next Team state for budget/squad/role count, and `undo` entry.

- [x] Change `POST /api/auction/mark-sold` to commit successful sales. (AC: 1, 3, 4, 6)
  - [x] Keep the existing route path, JSON content-type check, `markSoldRequestSchema`, inactive-auction response, persistence-failure response, and duplicate-command-id response.
  - [x] Keep rejected domain results returning `409` with `markSoldRejectedResponseSchema`.
  - [x] For accepted domain results, call `auctionRepository.commitMarkSold(...)` and return `200` with the accepted Mark Sold response schema and `toBoardStateDto(result.state)`.
  - [x] Handle `DuplicateClientCommandError`, `PersistenceSnapshotWriteError`, and generic persistence failures using the existing command-route patterns and copy adjusted for Mark Sold.
  - [x] Do not compute sale validity or Team mutations in `apps/server/src/app.ts`; adapt the domain result and persistence errors only.

- [x] Update the live board UI for accepted sale responses. (AC: 2, 5, 6)
  - [x] Update `apps/web/src/main.tsx` `handleMarkSold` so accepted responses set `boardState` from the returned authoritative state, clear Mark Sold errors, set `markSoldState` to `ready`, and do not call `refreshBoardState()` as the primary success path.
  - [x] Keep rejected capacity responses calm and non-duplicated, using the existing blocked/error behavior from Story 2.5.
  - [x] Add a visible calm sale summary near the live controls or outcome state, using the command result message. It must not be celebratory copy.
  - [x] After success, the board must render no Current Player, clear Selected Team, preserve Current Bid as `No current bid`, and enable `Reveal Next Player` when pending Phase 1 Players remain.
  - [x] Do not optimistically update Player, Team, budget, role counts, or roster client-side. The UI must reconcile only from the authoritative successful response.
  - [x] Preserve existing selectors: `mark-sold`, `mark-sold-blocked-reason`, `mark-sold-error`, `current-player-panel`, `current-bid`, `selected-team`, `reveal-next`, Team tile selectors, and phase progress selectors. Add `mark-sold-success` or similar stable test id for the sale summary.

- [x] Add roster projection support needed by this story without creating separate roster truth. (AC: 2, 5, 6, 7)
  - [x] If a roster DTO/projection already exists locally by implementation time, update it to derive sold roster rows from `players` where `winningTeamId` equals the Team id and `acquisitionType === "Auction"`.
  - [x] If a full roster surface is still deferred until Story 2.10, add only the minimal domain/shared helper or test fixture needed to prove the projection rule for sold Players. Do not build the Board/Rosters UI early.
  - [x] Roster rows for this story must show Player name, Role, acquisition type `Sold`, and Sold Price when included in any DTO/test helper.
  - [x] Never store or mutate a command-addressable roster separate from Player ownership fields.

- [x] Preserve invalid-sale and previous live-command regressions. (AC: 4, 6, 7)
  - [x] All Story 2.5 rejected Mark Sold tests must still pass, including repeated rejected attempts with the same id remaining non-mutating when that id was never logged.
  - [x] Accepted Mark Sold must log `clientCommandId`; a second accepted request with the same id must return duplicate conflict and must not create a second sale/action-log row.
  - [x] Reveal Next, Select Team, Increase Bid, Phase 1 order/progress, privacy, and setup-locking behavior must remain intact.

- [x] Add focused tests and event-flow coverage. (AC: 1-7)
  - [x] Domain tests: successful sale mutates Player, Team, current state, undo history, and `updatedAt`; rejected branches remain non-mutating; input state is not mutated; capacity rules still block.
  - [x] Shared contract tests: accepted response, rejected response, union response, Mark Sold undo entry, board DTO privacy.
  - [x] Persistence tests: `commitMarkSold` writes current state, `MarkSold` action log payload, undoable flag, snapshot; rejects duplicate ids; survives repository reopen; marks snapshot failure and blocks later mutations.
  - [x] API tests: valid setup -> Start Auction -> Reveal Next -> Select Team -> Mark Sold returns `200`; Player, Team, board DTO, action log, snapshot, next-action state, and privacy are correct; no selected Team still returns `409` with no mutation.
  - [x] UI tests: successful Mark Sold response updates board from server state, shows sale summary, clears Current Player/Selected Team, enables Reveal Next, and does not show stale blocked/error text.
  - [x] Playwright event-mode test: complete valid setup, start auction, reveal, select Team, optionally increase bid, Mark Sold, assert sale summary, no Current Player, Reveal Next enabled, selected Team cleared, Team tile budget/squad/role count updated, refresh and verify persisted sale state.
  - [x] Regression tests from Stories 1.1-2.5 still pass, especially invalid sale non-mutation.

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Epic 2 `in-progress`, Stories 2.1 through 2.5 `done`, and Story 2.6 `backlog` at story creation time. This story updates Story 2.6 to `ready-for-dev`.
- Current `HEAD` at story creation is `f5b7951` (`Story 2.5: Block Invalid Sales With Clear Reasons`).
- The working tree is clean at story creation time.
- No `project-context.md` file was found for the persistent-facts glob during story creation.

### Existing Files That This Story Will Touch

Read these before editing and update them in place:

- `packages/shared/src/index.ts`: owns strict Zod schemas/types for `AuctionState`, board DTOs, command requests/responses, and `LiveActionUndoHistoryEntry`. Add accepted Mark Sold response and Mark Sold undo entry here.
- `packages/shared/src/auction-state-contracts.test.ts`: extend schema/privacy coverage for accepted Mark Sold.
- `packages/domain/src/mark-sold.ts`: currently validates accepted sales but returns the original state unchanged. This is the main domain file to change.
- `packages/domain/src/mark-sold.test.ts`: currently contains Story 2.5 rejection tests and a validation-only accepted-path test. Replace that accepted-path expectation with real sale mutation assertions while preserving rejection tests.
- `packages/domain/src/select-team.ts`: owns `getCurrentPlayerTeamCapacityDetails`; keep using it for budget/squad/role-capacity decisions.
- `packages/domain/src/index.ts`: update exports only if types change.
- `packages/persistence/src/index.ts`: add `CommitMarkSoldInput`, `commitMarkSold`, and action-log command support.
- `packages/persistence/src/auction-repository.test.ts`: add accepted sale transaction, reopen, duplicate id, snapshot failure, action-log, and snapshot assertions.
- `apps/server/src/app.ts`: change the accepted branch of `/api/auction/mark-sold` from placeholder `409 sale_blocked` to persisted success.
- `apps/server/src/app.test.ts`: add happy-path accepted Mark Sold coverage and keep invalid Mark Sold tests.
- `apps/web/src/main.tsx`: update `handleMarkSold`, accepted response parsing, sale summary state/rendering, and post-sale board behavior.
- `apps/web/src/auction-board-helpers.ts`: likely unchanged unless helper semantics need a narrow adjustment. Do not put sale mutation or sale validity here.
- `apps/web/src/main.test.tsx`: add accepted-sale UI tests next to current blocked-state tests.
- `apps/web/src/styles.css`: add sale summary styles only as needed; preserve stable live-board dimensions.
- `apps/web/e2e/event-mode.spec.ts`: extend event-mode flow with happy-path sale.
- `packages/test-fixtures/src/index.ts` and `_bmad-output/test-artifacts/sample-test-data/*`: use existing fixtures when possible. Runtime code must not import `@auction-manager/test-fixtures`.

Do not hand-edit `dist/` outputs. They are build artifacts.

### Current Behavior Of Key UPDATE Files

- `packages/domain/src/mark-sold.ts`:
  - Requires `InitialAuction`.
  - Requires a Current Player, selected Team, positive Current Bid, existing selected Team, and existing current Player.
  - Reuses `getCurrentPlayerTeamCapacityDetails` from `select-team.ts`.
  - Returns typed `409`-style conflicts for budget, squad, role target, incomplete role capacity, and prerequisites.
  - Current accepted branch returns `{ ok: true, accepted: true, state: input.state, message: "Falcons can buy Aarav Menon for 10." }` without mutating sale state. Story 2.6 must replace this with real accepted sale state.
- `packages/domain/src/select-team.ts`:
  - Capacity reasons are generated in domain, not UI.
  - Budget copy currently uses `have`, e.g. `Falcons have 8 remaining; current bid is 10.`
  - `selectTeam` mutates only selected Team, undo history, and `updatedAt`.
- `packages/domain/src/reveal-next-player.ts`:
  - Reveals the first pending Player in persisted `phase1Order`.
  - Sets Player status to `Current`, `currentPlayerId`, `currentBid` to base price, clears selected Team, appends undo, and updates timestamp.
  - Blocks reveal while a Current Player still requires an outcome. A successful sale must clear Current Player state so reveal can proceed.
- `packages/domain/src/increase-bid.ts`:
  - Uses persisted `parameters.bidIncrement`.
  - Appends undo and updates timestamp.
- `packages/persistence/src/index.ts`:
  - `ActionLogEntry.command` currently supports `StartAuction`, `RevealNextPlayer`, `SelectTeam`, and `IncreaseBid`; add `MarkSold`.
  - Each successful command uses a transaction, duplicate command check, current auction check, current-state update, action-log insert, then snapshot write after commit.
  - Snapshot failure marks `persistenceFailure` and later commands are rejected by `assertMutationsAllowed`.
- `apps/server/src/app.ts`:
  - `/api/auction/mark-sold` already checks content type, request schema, active state, persistence failure, duplicate id, and domain rejection.
  - The accepted branch currently returns `409 sale_blocked` with the accepted message. Replace this with `commitMarkSold` plus a `200` accepted response.
- `apps/web/src/main.tsx`:
  - `handleMarkSold` currently parses `markSoldResponseSchema` as a rejected schema only and treats every route result as an error/rejection.
  - The Mark Sold panel already renders the button, blocked reasons, and errors with test ids.
  - The UI currently blocks client-side submission if the selected Team capacity DTO says it cannot buy. Keep that as a duplicate-click/operator affordance, but domain remains authoritative.

### Domain Mutation Requirements

Accepted `MarkSold` must produce this state change atomically:

```ts
player.status = "Sold";
player.soldPrice = currentBid;
player.winningTeamId = selectedTeam.id;
player.acquisitionType = "Auction";

team.remainingBudget = team.remainingBudget - currentBid;
team.squadCount = team.squadCount + 1;
team.roleCounts[currentPlayer.role] = team.roleCounts[currentPlayer.role] + 1;

state.currentPlayerId = null;
state.currentBid = null;
state.selectedTeamId = null;
state.updatedAt = now();
```

The implementation should create new arrays/objects rather than mutating the input state. It must preserve all other Players, Teams, Phase 1 order, parameters, created timestamp, and persistence failure state.

### Persistence Ownership

This story owns accepted-sale persistence:

- `auction_state.state_json`: persisted updated authoritative state after accepted Mark Sold.
- `auction_state.phase`: remains `InitialAuction`.
- `auction_state.updated_at`: Mark Sold timestamp.
- `action_log`: insert exactly one `MarkSold` row for each accepted sale.
- `action_log.client_command_id`: unique, duplicate-protected.
- `action_log.undoable`: `1`.
- `action_log.payload_json`: include command, player id, winning Team id, sold price, previous/next Player ownership fields, previous/next Team budget/squad/role count, previous current player/bid/selected team, and `undo`.
- `undoHistory`: append the domain `MarkSold` undo entry.
- `snapshots/latest.json`: write updated state after commit.
- Resume/reopen: `loadCurrentState()` returns the sold Player and updated Team exactly.

Rejected Mark Sold ownership from Story 2.5 remains unchanged: no state update, no action-log row, no undo entry, no snapshot write, and unchanged `updatedAt`.

### Architecture Guardrails

- AD-2: `packages/domain` is the only module allowed to decide sale validity, budget capacity, squad capacity, role capacity, and sale outcome mutation.
- AD-3: React must reconcile from the authoritative state returned by the successful command. No optimistic sale state.
- AD-4: keep `POST /api/auction/mark-sold`, require `clientCommandId`, validate schemas, and return authoritative state plus compact result summary on success.
- AD-5: accepted sale must be one SQLite transaction plus post-commit snapshot behavior. Do not write action log without current-state update or snapshot ownership.
- AD-6: accepted sale must append undo data sufficient for Story 2.9 to restore Player, Team budget, squad, role count, current player, current bid, selected Team, and board state.
- AD-8: board DTOs, route responses, logs, snapshots, and UI must exclude private source/setup fields.
- AD-11: domain command changes need Vitest domain tests; persistence changes need transaction/resume/action-log/snapshot tests; Fastify routes need `inject()` schema/conflict/success tests; UI flow needs component/helper and Playwright/event-mode coverage.
- AD-12: keep this slice correctness-first. Do not build future phase features before accepted Mark Sold is reliable.
- AD-13: use persisted Auction Parameters for role targets and budgets. Do not hard-code league defaults except in tests/fixtures.
- AD-15: Team rosters are derived from Player ownership fields. Do not create a mutable roster source of truth.

### UX Requirements For This Story

- Mark Sold remains a routine live action. It is enabled only for Current Player + selected Team + passable hard-block rules.
- On success, show calm operational copy, e.g. `Sold Aarav Menon to Falcons for 10.` Avoid celebratory language, animation, or hype.
- Sale success must leave the board in a stable post-sale state: no Current Player, no selected Team, no Current Bid, sale summary visible, and Reveal Next Player as the safe next action when pending Players remain.
- Team tiles must immediately reflect updated remaining budget, squad count, and role count from the authoritative state.
- Blocked reasons remain inline near selected Team and Mark Sold and must be text, not color alone.
- Pending state must prevent duplicate submissions while the command is in flight.
- Preserve live-board readability and stable dimensions across 1440x900, 1366x768, 1920x1080, and 390x844 profiles.
- Maintain WCAG-oriented basics: visible focus, button semantics, accessible names, text status/alert exposure, keyboard operation, and 44 CSS px live controls.

### Previous Story Intelligence

- Story 2.5 added the `POST /api/auction/mark-sold` route, `markSoldRequestSchema`, rejected conflict schema, invalid sale capacity reasons, Mark Sold button, blocked/error UI, and tests proving rejected invalid sales do not mutate state.
- Story 2.5 explicitly deferred successful sale mutation to Story 2.6. Keep the same command and route contract; do not create a new `sell-player` route or second shared request schema.
- Story 2.5 current accepted domain result is intentionally validation-only. The server currently maps that accepted result to a placeholder `409 sale_blocked`; this is the exact branch to replace.
- Story 2.4 established the command pattern to reuse: fresh `clientCommandId`, in-flight ref/generation guard, strict response parsing, route duplicate check, persistence commit, action log, snapshot, and authoritative board response.
- Story 2.3 established Team selection and capacity projection via `getCurrentPlayerTeamCapacityDetails`. Reuse its capacity logic for sale validation.
- Story 2.2 established that `Reveal Next` is blocked until Current Player is resolved. Accepted Mark Sold must resolve the Current Player and clear bidding state.
- Story 2.1 established persisted `phase1Order` and progress. Mark Sold must not reshuffle or alter order; it changes Player status so progress reflects completion.

### Git Intelligence Summary

Recent commits:

- `f5b7951 Story 2.5: Block Invalid Sales With Clear Reasons`
- `0ecae5d Story 2.4: Increase Current Bid`
- `5c960b2 Story 2.3: Select Bidding Team From Team Tiles`
- `4801c58 Story 2.2: Reveal Current Player on the Live Board`
- `d7bfe7b Story 2.1: Create Persisted Phase 1 Player Order`

Story 2.5 changed the exact areas this story extends: shared contracts, domain `mark-sold`, persistence tests, server route/tests, web Mark Sold UI/tests, styles, and Playwright event-mode coverage. Preserve its rejected-path tests while adding the accepted path.

Repo pattern to preserve: strict shared Zod contracts, pure domain commands, transaction-backed persistence for successful state changes, thin Fastify adapters, React `safeParse` of server JSON, Vitest unit/integration coverage, and Playwright event-mode smoke coverage.

Package dependency direction to preserve: `shared` has no workspace dependencies; `domain` depends on `shared`; `persistence` depends on `domain` and `shared`; `imports` depends on `shared`; `server` adapts domain/persistence/imports/shared; `web` depends on `shared`.

### Latest Tech Information

Checked on 2026-07-07:

- Architecture pins Node.js `24.18.0`, npm `11.16.0`, TypeScript `6.0.3`, React `19.2.7`, Vite `8.1.3`, Fastify `5.9.0`, Zod `4.4.3`, better-sqlite3 `12.11.1`, Tailwind CSS `4.3.2`, Lucide React `1.23.0`, Vitest `4.1.9`, and Playwright `1.61.1`.
- The local `package-lock.json` currently resolves React `19.2.7`, React DOM `19.2.7`, Fastify `5.9.0`, Zod `4.4.3`, better-sqlite3 `12.11.1`, Vite `8.1.3`, Vitest `4.1.9`, TypeScript `6.0.3`, and Playwright `1.61.1`.
- npm registry check confirmed React latest is `19.2.7` on 2026-07-07, matching the architecture pin.
- This story should not upgrade dependencies. Use the installed lockfile/API unless a concrete framework bug is found; any dependency change must be explicit and run the full affected regression set.

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

- accepted Mark Sold is domain-owned and not calculated in React/Fastify/persistence;
- rejected Mark Sold remains non-mutating;
- accepted Mark Sold is one atomic persistence commit with action log, undo payload, snapshot, duplicate id behavior, and resume correctness;
- board DTO and UI remain privacy-safe;
- sale summary and next-action UX match the operational copy requirements;
- unit, integration, and event-mode tests cover the happy path and invalid-sale regressions.

### Project Context Reference

- Source story and Epic 2 context: `_bmad-output/planning-artifacts/epics.md`, Story 2.6 and neighboring Stories 2.1-2.10.
- PRD source: `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md`, FR9, FR13, FR14, FR19, and FR20.
- Architecture source: `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md`, AD-2 through AD-6, AD-8, AD-11 through AD-15.
- UX source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md`, Mark Sold, Sold success, State Patterns, accessibility, and key Flow 2.
- Visual design source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md`, live board, current bid, Mark Sold as primary button, blocked status, sale state, and stable controls.
- Prior story source: `_bmad-output/implementation-artifacts/2-5-block-invalid-sales-with-clear-reasons.md`.
- External version check: `https://registry.npmjs.org/react/latest`.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-07: `npm run typecheck` passed.
- 2026-07-07: `npm run test` passed: 31 files, 212 tests.
- 2026-07-07: `npm run test:e2e:event` passed: 8 Playwright tests.

### Completion Notes List

- Implemented accepted `MarkSold` as a domain-owned mutation that marks the Player sold, updates winning Team budget/squad/role count, clears current board selection/bid/player state, appends undo data, and preserves rejected-sale non-mutation behavior.
- Added accepted Mark Sold shared response contracts, Mark Sold undo-history schema, and a minimal sold roster projection helper derived from Player ownership fields.
- Added transactional `commitMarkSold` persistence with duplicate command protection, action-log payload, undoable flag, post-commit snapshot write, reopen behavior, and snapshot-failure mutation blocking.
- Updated `/api/auction/mark-sold` to return `200` with authoritative board state on success while preserving existing rejected response behavior.
- Updated the live board to reconcile accepted sales from the server response, show calm `mark-sold-success` copy, clear current player/bid/selection, and enable Reveal Next when pending Players remain.
- Added/updated domain, shared contract, persistence, API, UI, and event-mode coverage for accepted sale, invalid-sale non-mutation, duplicate command ids, privacy, roster projection, action log, snapshot, and resume behavior.

### File List

- `_bmad-output/implementation-artifacts/2-6-mark-player-sold-and-update-team-state.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/server/src/app.ts`
- `apps/server/src/app.test.ts`
- `apps/web/e2e/event-mode.spec.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/main.test.tsx`
- `apps/web/src/styles.css`
- `packages/domain/src/mark-sold.ts`
- `packages/domain/src/mark-sold.test.ts`
- `packages/persistence/src/index.ts`
- `packages/persistence/src/auction-repository.test.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/auction-state-contracts.test.ts`

### Change Log

- 2026-07-07: Completed Story 2.6 accepted Mark Sold implementation, persistence/API/UI integration, roster projection helper, and full Dev Gate validation.
- 2026-07-07: Code review patches applied — domain status guard, persistence metadata validation, strict accepted response parsing, sale summary lifecycle, post-sale role count display, snapshot failure handling, and test coverage gaps closed.

### Review Findings

- [x] [Review][Patch] Reject mark sold when current player status is not Current [packages/domain/src/mark-sold.ts:66]
- [x] [Review][Patch] Validate commitMarkSold metadata against committed state [packages/persistence/src/index.ts:386]
- [x] [Review][Patch] Use safeParse for accepted Mark Sold API response [apps/server/src/app.ts:979]
- [x] [Review][Patch] Strictly parse accepted Mark Sold response in web client [apps/web/src/main.tsx:1041]
- [x] [Review][Patch] Clear stale mark-sold summary on select-team and increase-bid [apps/web/src/main.tsx:892]
- [x] [Review][Patch] Handle snapshot_write_failed after persisted sale [apps/web/src/main.tsx:1041]
- [x] [Review][Patch] Skip null soldPrice in deriveSoldRosterRows [packages/shared/src/index.ts:898]
- [x] [Review][Patch] Show post-sale role count on team tiles from sold players [apps/web/src/main.tsx:2092]
- [x] [Review][Patch] Add no-selected-team API non-mutation test [apps/server/src/app.test.ts:943]
- [x] [Review][Patch] Assert winning-team roleCounts in API happy-path test [apps/server/src/app.test.ts:789]
- [x] [Review][Defer] Live roster list under team tiles deferred to Story 2.10 — minimal deriveSoldRosterRows helper satisfies task boundary
- [x] [Review][Defer] Optimistic concurrency / stale-state guard — matches existing live-command pattern across Stories 2.2–2.6
- [x] [Review][Defer] Post-commit snapshot write split — consistent with Start/Reveal/Select/Increase persistence pattern
