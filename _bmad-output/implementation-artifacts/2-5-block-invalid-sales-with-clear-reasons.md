---
baseline_commit: 0ecae5db9d2bccad5c0dd0172af1cadc0ac5868c
---

# Story 2.5: Block Invalid Sales With Clear Reasons

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want invalid sales to be blocked before they change auction state,
so that budgets, squad size, and role limits stay accurate during the live event.

## Acceptance Criteria

1. Given a Current Player, selected Team, and Current Bid exist, when the selected Team's remaining budget is lower than the Current Bid, then Mark Sold is blocked and the blocked reason clearly states the budget constraint.
2. Given a Current Player and selected Team exist, when the selected Team is already at the configured maximum squad size, then Mark Sold is blocked and the blocked reason clearly states the squad capacity constraint.
3. Given a Current Player and selected Team exist, when the selected Team is already at the Role Target for the Current Player's Role, then Mark Sold is blocked and the blocked reason clearly states the role capacity constraint.
4. Given Mark Sold is blocked, when the operator views the live board, then the reason appears near the selected Team and Mark Sold context and the reason is text, not color alone.
5. Given the operator attempts a blocked sale through API or repeated UI clicks, when the command is rejected, then no Player status, Sold Price, winning Team, Team budget, squad count, role count, action log, snapshot, or Undo History mutation occurs and the API returns a conflict-style result that the UI can display calmly.
6. Given a developer finishes this story, when they run the story's Dev Gate, then domain validation tests for budget, squad, and role limits pass, route conflict tests pass, non-mutation tests pass, component tests for blocked reasons pass, and typecheck passes, and an E2E or acceptance test proves invalid sales are blocked with exact reasons and no state mutation.
7. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks that sale validity lives in `packages/domain`, verifies non-mutation behavior, runs or adds unit/API/E2E tests, raises findings, and sends blocking issues back for iteration.

## Implementation Boundary

This story introduces sale-validity rules and the rejected `MarkSold` command path only. It may define the shared `MarkSold` command contract, request schema, conflict response shape, and UI blocked-state behavior, but it must not complete successful sale mutation.

Story 2.6 implements the accepted `MarkSold` path using this same contract. Do not update Player status to `Sold`, set Sold Price, set winning Team, decrement budget, increment squad/role counts, append sale undo history, insert a `MarkSold` action-log row, write a sale snapshot, or advance the board after a successful sale in this story.

## Tasks / Subtasks

- [x] Add strict shared `MarkSold` rejected-path contracts. (AC: 1-7)
  - [x] In `packages/shared/src/index.ts`, add `markSoldRequestSchema` requiring only `clientCommandId`.
  - [x] Add a `markSoldConflictReasonSchema` or equivalent strict shape with stable reason codes for `budget_exceeded`, `squad_full`, `role_target_full`, plus prerequisite conflicts such as wrong phase, no Current Player, no selected Team, no Current Bid, selected Team not found, and current Player not found.
  - [x] Add `markSoldRejectedResponseSchema` or a union response contract that lets React safely parse conflict responses with `{ ok: false, error, message, reasons }`.
  - [x] Keep board DTOs allowlisted. Do not expose action-log payloads, source filenames, source row numbers, registration fields, payment fields, raw persistence rows, or private setup diagnostics.
  - [x] Update `packages/shared/src/auction-state-contracts.test.ts` for strict request parsing, conflict reason parsing, privacy rejection, and no private-field leakage in any new response schema.

- [x] Implement domain-owned sale validation. (AC: 1, 2, 3, 5, 7)
  - [x] Add `packages/domain/src/mark-sold.ts` or `packages/domain/src/sale-validity.ts`, and export it from `packages/domain/src/index.ts`.
  - [x] Reuse or extract the existing validation in `getCurrentPlayerTeamCapacity` from `packages/domain/src/select-team.ts`; do not duplicate budget/squad/role rules in React, Fastify, or persistence.
  - [x] Validate only `InitialAuction` for this story. Phase 2 uses the same rules later, but do not enable `UnsoldBidding` `MarkSold` yet.
  - [x] Require a Current Player, selected Team, positive Current Bid, and existing selected Team. Return typed conflicts for missing prerequisites.
  - [x] Hard-block if `team.remainingBudget < currentBid`.
  - [x] Hard-block if `team.squadCount >= state.parameters.maxSquadSize`.
  - [x] Hard-block if `team.roleCounts[currentPlayer.role] >= state.parameters.roleTargets[currentPlayer.role]`; incomplete role count/target data must be treated as blocked, not as valid.
  - [x] Return exact operational reason text such as `Blocked: Falcons have 8 remaining; current bid is 10.`, `Blocked: Falcons already have 13 of 13 players.`, or `Blocked: Falcons have 2 of 2 Ace slots filled.`
  - [x] On every rejected result, return the original `AuctionState` by identity or an equal deep value with no mutation. Do not update `updatedAt`.

- [x] Add `POST /api/auction/mark-sold` rejected-path handling. (AC: 1-7)
  - [x] In `apps/server/src/app.ts`, add an intent-named same-origin route using `application/json` only and the shared `markSoldRequestSchema`.
  - [x] Return `400` for invalid request shape and `415` for unsupported content type.
  - [x] Return `409` for inactive auction, uncleared persistence failure, duplicate `clientCommandId`, wrong phase, missing Current Player, missing selected Team, missing Current Bid, missing selected Team record, or hard-blocked budget/squad/role validity.
  - [x] The route may adapt typed domain conflicts to HTTP responses only. It must not compute sale validity or mutate auction state directly.
  - [x] For blocked invalid sales, return conflict-style JSON that the UI can display without needing a successful board-state response.
  - [x] Do not call a persistence commit method for rejected `MarkSold`. Rejections must not create an action-log row, snapshot write, or undo entry.
  - [x] Duplicate `clientCommandId` behavior should match existing command routes: reject duplicates already present in `action_log`. Since rejected attempts are not logged in this story, repeated rejected attempts with fresh or same IDs must still be non-mutating.

- [x] Add Mark Sold UI blocked-state behavior without successful sale mutation. (AC: 1-6)
  - [x] In `apps/web/src/auction-board-helpers.ts`, add `canAttemptMarkSold(boardState)` for prerequisite enablement: `InitialAuction`, Current Player exists, Current Bid exists, selected Team exists, and no persistence failure.
  - [x] Add a visible `Mark Sold` routine action near the selected Team and Current Bid context in `apps/web/src/main.tsx`.
  - [x] Disable or visually block Mark Sold when no selected Team exists, when no Current Player exists, when Current Bid is missing, while command is in flight, or while persistence failure is set.
  - [x] When selected Team capacity is already invalid from `currentPlayerCapacity`, show the exact text reason near both selected Team and Mark Sold context. Do not rely on red or disabled state alone.
  - [x] On `POST /api/auction/mark-sold` `409`, display the returned text reason calmly in an inline blocked panel near Mark Sold. Use `role="alert"` or equivalent text status for accessibility.
  - [x] Use a fresh `clientCommandId`, an in-flight ref/generation guard, strict response/error parsing, and `refreshBoardState()` on command error, following `handleRevealNext`, `handleSelectTeam`, and `handleIncreaseBid`.
  - [x] Do not optimistically mark a player sold in React. Do not locally change budgets, role counts, selected Team, Current Player, Current Bid, or roster state.
  - [x] Add stable selectors: `mark-sold`, `mark-sold-blocked-reason`, and `mark-sold-error` if the implementation separates precomputed blocked reasons from API conflict errors.

- [x] Preserve existing state and privacy behavior. (AC: 5-7)
  - [x] Ensure rejected `MarkSold` leaves `players`, `teams`, `currentPlayerId`, `currentBid`, `selectedTeamId`, `phase1Order`, `undoHistory`, `updatedAt`, `persistenceFailure`, action log, and `data/snapshots/latest.json` unchanged.
  - [x] Ensure `toBoardStateDto` continues to return allowlisted Player/Team fields only.
  - [x] Keep `currentPlayerCapacity` as a board DTO projection derived from domain logic. Do not introduce client-only capacity truth.
  - [x] Keep `Reveal Next`, `Select Team`, and `Increase Bid` behavior and selectors intact.

- [x] Add focused tests and preserve regressions. (AC: 1-7)
  - [x] Domain tests: budget block, squad-size block, role-target block, combined reasons, missing selected Team, missing Current Player, missing Current Bid, unknown selected Team, wrong phase, incomplete role capacity data, and strict non-mutation of all relevant state fields.
  - [x] Shared contract tests: `MarkSold` request schema, rejected response/conflict reason schema, strict parsing, and privacy rejection.
  - [x] API tests in `apps/server/src/app.test.ts`: valid setup -> Start Auction -> Reveal Next -> Select Team -> invalid `MarkSold` returns `409` with exact reason; invalid content type/body return `415`/`400`; no selected Team/no Current Player/wrong phase return `409`; repeated rejected attempts do not mutate state; response JSON excludes private fixture values.
  - [x] Persistence assertions: no action-log row is inserted and snapshot file content is unchanged for rejected invalid sales.
  - [x] UI/helper/component tests: `canAttemptMarkSold` enablement, visible blocked reasons from capacity DTO, pending guard, error display, and no optimistic board mutation.
  - [x] Playwright event-mode test: complete valid setup, start auction, reveal current player, select a Team, make that Team invalid through a deterministic setup/state path or API fixture, attempt Mark Sold, assert exact text reason, assert Current Player/Current Bid/selected Team still match pre-attempt state, refresh and verify no mutation persisted.
  - [x] Regression tests from Stories 1.1-2.4 must still pass, especially setup import privacy, placeholder non-blocking behavior, parameter locking, Phase 1 order persistence/no-reshuffle, Reveal Next duplicate handling, Team selection selected-state persistence, Increase Bid exact increment, and `+` shortcut safety.

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Epic 2 `in-progress`, Stories 2.1 through 2.4 `done`, and Story 2.5 `backlog` at story creation time. This story updates Story 2.5 to `ready-for-dev`.
- Current `HEAD` at story creation is `5c960b2` (`Story 2.3: Select Bidding Team From Team Tiles`).
- The working tree is not clean at story creation time. Existing Story 2.4 implementation changes are present across shared/domain/persistence/server/web/tests, including a new `packages/domain/src/increase-bid.ts`. Treat them as existing work and do not revert them.
- No `project-context.md` file was found for the persistent-facts glob during story creation.

### Existing Files That This Story Will Touch

Read these before editing and update them in place:

- `packages/shared/src/index.ts`: owns strict Zod schemas/types for auction state, Board DTOs, command requests/responses, and undo history. Add `MarkSold` request and rejected conflict schema here.
- `packages/shared/src/auction-state-contracts.test.ts`: extend shared schema/privacy coverage for `MarkSold`.
- `packages/domain/src/select-team.ts`: currently owns `getCurrentPlayerTeamCapacity`, including budget, squad, role, and incomplete capacity reasons. Reuse or extract this logic for sale validation.
- `packages/domain/src/mark-sold.ts` or `packages/domain/src/sale-validity.ts` (new): preferred place for rejected `MarkSold` domain command/validation.
- `packages/domain/src/index.ts`: re-export new validation/command types.
- `packages/domain/src/select-team.test.ts`: contains current capacity-reason tests that should remain true or move with extracted validation tests.
- `packages/persistence/src/index.ts`: do not add a rejected-sale commit path. You may only touch this if tests need action-log inspection helpers; rejected invalid sales must not write persistence.
- `packages/persistence/src/auction-repository.test.ts`: add or extend assertions that rejected invalid sales do not insert action-log rows or modify snapshots if those assertions are better placed at persistence/API level.
- `apps/server/src/app.ts`: add `POST /api/auction/mark-sold`, import shared schemas and domain validation, and adapt conflicts to HTTP status.
- `apps/server/src/app.test.ts`: add Fastify inject coverage for invalid sale conflicts and non-mutation.
- `apps/web/src/main.tsx`: add Mark Sold visible control, blocked reason display, request handler, in-flight guard, strict conflict parsing, and no optimistic mutation.
- `apps/web/src/auction-board-helpers.ts`: add Mark Sold enablement helper only. Do not put sale validity here.
- `apps/web/src/auction-board-helpers.test.ts`: extend helper coverage for Mark Sold enablement.
- `apps/web/src/styles.css`: add blocked panel/Mark Sold button styles only as needed; preserve stable live-board dimensions.
- `apps/web/e2e/event-mode.spec.ts`: extend event-mode flow with invalid-sale blocked behavior.
- `packages/test-fixtures/src/index.ts` and `_bmad-output/test-artifacts/sample-test-data/*`: use existing fixtures when possible; runtime code must not import `@auction-manager/test-fixtures`.

Do not hand-edit `dist/` outputs. They are build artifacts.

### Current Behavior Of Key UPDATE Files

- `getCurrentPlayerTeamCapacity(state, teamId)` returns `null` when there is no Current Player, no Current Bid, or unknown Team. Otherwise it returns `{ teamId, canBuy, reasons }`.
- Existing capacity reasons already cover:
  - budget: `${team.name} has ${team.remainingBudget} remaining; current bid is ${state.currentBid}.`
  - squad: `${team.name} already has ${team.squadCount} of ${state.parameters.maxSquadSize} players.`
  - role target: `${team.name} has ${roleCount} of ${roleTarget} ${currentPlayer.role} slots filled.`
  - incomplete role data: `${team.name} role capacity data is incomplete for ${currentPlayer.role}.`
- `toBoardStateDto` calls `getCurrentPlayerTeamCapacity` for every Team and attaches `currentPlayerCapacity` to each Team DTO while preserving privacy allowlists.
- `selectTeam` requires `InitialAuction`, a Current Player, positive Current Bid, and an existing Team; it mutates only `selectedTeamId`, `undoHistory`, and `updatedAt` when the selected Team changes.
- `increaseBid` requires `InitialAuction`, a Current Player, and positive Current Bid; it mutates only `currentBid`, `undoHistory`, and `updatedAt`.
- Existing command routes check JSON content type, strict shared request schema, active current state, persistence failure, duplicate command id, domain result, persistence commit, and then return an authoritative board DTO.
- `SelectTeam` same-team no-op currently returns success without persistence. Do not copy that pattern for rejected Mark Sold as a successful command. Rejected invalid sale attempts should return conflict and remain non-mutating.
- `AuctionState` already has sale-related Player fields: `status`, `soldPrice`, `winningTeamId`, and `acquisitionType`; Story 2.5 must not set them.
- Board UI already shows selected Team capacity text in selected Team context and Team tiles. Story 2.5 should put Mark Sold-specific blocked text near the Mark Sold control too.

### MarkSold Rejected Command Contract Guidance

Preferred domain result shape, adjust only to match local style:

```ts
type MarkSoldBlockedReasonCode =
  | "budget_exceeded"
  | "squad_full"
  | "role_target_full"
  | "role_capacity_incomplete";

type MarkSoldErrorCode =
  | "auction_not_in_initial_phase"
  | "current_player_required"
  | "selected_team_required"
  | "current_bid_required"
  | "selected_team_not_found"
  | "sale_blocked";

type MarkSoldBlockedReason = {
  readonly code: MarkSoldBlockedReasonCode;
  readonly message: string;
};

type MarkSoldResult =
  | {
      readonly ok: true;
      readonly state: AuctionState;
      readonly accepted: false;
      readonly reasons: readonly MarkSoldBlockedReason[];
      readonly message: string;
    }
  | {
      readonly ok: false;
      readonly error: Exclude<MarkSoldErrorCode, "sale_blocked">;
      readonly message: string;
    };
```

For this story, an invalid sale with capacity reasons may be represented either as `ok: true, accepted: false` at domain level or as `ok: false, error: "sale_blocked"`. The route must still return HTTP `409`, and the state must remain unchanged. Pick one approach and make it consistent across shared contracts, route tests, and UI parsing.

Suggested route path and test ids:

- API: `POST /api/auction/mark-sold`
- UI button: `data-testid="mark-sold"`
- Inline reason: `data-testid="mark-sold-blocked-reason"`
- API error fallback: `data-testid="mark-sold-error"`

### Persistence Ownership

This story deliberately has no persistence ownership for rejected invalid sales.

Required non-ownership proof:

- `auction_state.state_json`: unchanged after rejected `MarkSold`.
- `action_log`: no `MarkSold` row inserted for rejected invalid sale attempts.
- `undoHistory`: unchanged after rejected `MarkSold`.
- `snapshots/latest.json`: unchanged after rejected `MarkSold`.
- `updatedAt`: unchanged after rejected `MarkSold`.

Story 2.6 will own accepted sale persistence: Player status, Sold Price, winning Team, Team budget, squad count, role count, roster projection, action-log payload, undo payload, and snapshot.

### Architecture Guardrails

- AD-2: `packages/domain` is the only module allowed to decide sale validity, budget capacity, squad capacity, and role capacity.
- AD-3: React may request and display `MarkSold` conflicts only. React may not keep independent sale validity truth or optimistic sale state.
- AD-4: `POST /api/auction/mark-sold` must require `clientCommandId`, validate request/response schemas, and return conflict-style JSON for rejected attempts.
- AD-5: rejected invalid sales must not enter SQLite transactions that update current state or append action log. Accepted sale atomicity belongs to Story 2.6.
- AD-6: no rejected invalid sale is an undoable action. Undo History must not change.
- AD-8: board DTOs, route responses, logs, snapshots, and UI must exclude private setup/source fields.
- AD-11: domain command changes need Vitest domain tests; Fastify routes require `inject()` conflict tests; UI flow changes need component/helper and Playwright/event-mode coverage.
- AD-12: keep this slice correctness-first. Do not build successful sale mutation, Mark Unsold, Undo execution, Team rosters, Phase 2, or Manual Assignment before invalid sale blocking is reliable.
- AD-13: use persisted `AuctionParameters.maxSquadSize` and `AuctionParameters.roleTargets`; do not hard-code current league defaults except in fixtures.
- AD-14: this story is Phase 1 `InitialAuction` only. Do not enable Phase 2 `MarkSold` yet.

### UX Requirements For This Story

- Mark Sold is a routine action, but it must be blocked with exact text when sale validity fails.
- Blocked status appears inline near the selected Team and Mark Sold context, not as a generic top-of-page alert.
- Blocked reasons must be text and must not rely on danger red alone.
- Use operational, calm, specific microcopy: `Blocked: Falcons have 8 remaining; current bid is 10.`
- Keep danger red for blocked/danger states only. Do not use it for ordinary unsold volume or neutral missing media.
- Pending state must prevent duplicate click/shortcut submissions while a command is in flight.
- Controls must preserve stable dimensions so blocked text does not push the Current Bid, Team tiles, or routine controls in a jarring way.
- Preserve the responsive acceptance profiles: 1440x900, 1366x768, 1920x1080 projected display, and 390x844 fallback without text overlap.
- Maintain WCAG-oriented basics: visible focus, real button semantics, accessible names, text reason, alert/status exposure, standard keyboard behavior, and live controls at least 44 CSS px.

### Previous Story Intelligence

- Story 2.4 added `IncreaseBid` shared contracts, pure domain command, persistence commit, `POST /api/auction/increase-bid`, live board button, `+` shortcut, and event-mode E2E coverage. Reuse its command handler pattern for `MarkSold`, especially fresh `clientCommandId`, in-flight ref, generation guard, strict response parsing, and board refresh on error.
- Story 2.4 established that Current Bid changes must remain server-authoritative and each increment is undoable. Rejected Mark Sold must not consume or modify that undo stack.
- Story 2.3 added `SelectTeam` and `getCurrentPlayerTeamCapacity`. That capacity projection is directly relevant; avoid introducing a second set of budget/squad/role formulas.
- Story 2.3 capacity reasons already appear in Team tiles and selected Team context. Story 2.5 should make the same reasons actionable near Mark Sold.
- Story 2.2 initializes `currentBid` from Player base price and clears `selectedTeamId` on reveal. Story 2.5 should require both a selected Team and Current Bid before attempting Mark Sold.
- Story 2.1 added persisted `phase1Order` and `phase1Progress`; rejected Mark Sold must not reshuffle, advance, complete, or alter any order/progress state.

### Git Intelligence Summary

- Recent commits:
  - `5c960b2 Story 2.3: Select Bidding Team From Team Tiles`
  - `4801c58 Story 2.2: Reveal Current Player on the Live Board`
  - `d7bfe7b Story 2.1: Create Persisted Phase 1 Player Order`
  - `70a0446 Update Readme`
  - `4ffbc6d refactor(web): remove verbose helper copy from setup UI`
- Story 2.4 is present as uncommitted work and has already extended the same command slice through shared/domain/persistence/server/web/tests.
- The repo pattern is strict shared contracts, pure domain commands, transaction-backed persistence only for successful state changes, thin Fastify adapters, React `safeParse` of server JSON, Vitest coverage, and Playwright event-mode coverage.
- Package dependency direction to preserve: `shared` has no workspace dependencies; `domain` depends on `shared`; `persistence` depends on `domain` and `shared`; `imports` depends on `shared`; `server` adapts domain/persistence/imports/shared; `web` depends on `shared`.

### Latest Tech Information

Checked on 2026-07-07:

- Architecture pins Node.js `24.18.0`, npm `11.16.0`, TypeScript `6.0.3`, React `19.2.7`, Vite `8.1.3`, Fastify `5.9.0`, Zod `4.4.3`, better-sqlite3 `12.11.1`, Tailwind CSS `4.3.2`, Lucide React `1.23.0`, Vitest `4.1.9`, and Playwright `1.61.1`.
- npm registry check confirmed React latest is `19.2.7` on 2026-07-07, matching the architecture pin.
- This story should use the installed lockfile/API and should not upgrade dependencies for invalid-sale blocking. If implementation hits a concrete framework bug, make the dependency change explicit and run the full affected regression set.

### Project Context Reference

- Source story and Epic 2 context: `_bmad-output/planning-artifacts/epics.md`, Story 2.5 and neighboring Stories 2.1-2.6.
- PRD source: `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md`, FR13 and FR14.
- Architecture source: `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md`, AD-2 through AD-6, AD-8, AD-11 through AD-15.
- UX source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` and `EXPERIENCE.md`, invalid sale, blocked status, live board, capacity indicator, and Mark Sold patterns.
- Prior story source: `_bmad-output/implementation-artifacts/2-4-increase-current-bid.md`.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test -- packages/shared/src/auction-state-contracts.test.ts`
- `npm run test -- packages/domain/src/mark-sold.test.ts packages/domain/src/select-team.test.ts`
- `npm run test -- apps/server/src/app.test.ts`
- `npm run test -- apps/web/src/auction-board-helpers.test.ts apps/web/src/main.test.tsx`
- `npm run test`
- `npm run typecheck`
- `npm run test:e2e:event`

### Completion Notes List

- Added strict shared Mark Sold request/conflict/rejected-response contracts and privacy-focused contract tests.
- Extracted reusable domain capacity details from `select-team.ts` and implemented `markSold` validation in `packages/domain`, returning typed conflicts with the original state unchanged.
- Added `POST /api/auction/mark-sold` as a non-mutating rejected-path route using shared schemas and domain validation only.
- Added Mark Sold UI control, blocked reason display near selected Team and command context, strict rejected-response parsing, in-flight guard, and board refresh on command error.
- Added unit, API, component, and event-mode E2E coverage for invalid-sale blocking and non-mutation.

### File List

- `_bmad-output/implementation-artifacts/2-5-block-invalid-sales-with-clear-reasons.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/server/src/app.test.ts`
- `apps/server/src/app.ts`
- `apps/web/e2e/event-mode.spec.ts`
- `apps/web/src/auction-board-helpers.test.ts`
- `apps/web/src/auction-board-helpers.ts`
- `apps/web/src/main.test.tsx`
- `apps/web/src/main.tsx`
- `apps/web/src/styles.css`
- `packages/domain/src/index.ts`
- `packages/domain/src/mark-sold.test.ts`
- `packages/domain/src/mark-sold.ts`
- `packages/domain/src/select-team.test.ts`
- `packages/domain/src/select-team.ts`
- `packages/shared/src/auction-state-contracts.test.ts`
- `packages/shared/src/index.ts`

### Change Log

- 2026-07-07: Implemented Story 2.5 invalid-sale blocking with shared contracts, domain validation, rejected API path, UI blocked state, and regression coverage.
- 2026-07-07: Code review patches — tightened Mark Sold guards, expanded tests, fixed error-state handling, and adapted valid-sale stub messaging from domain.

### Review Findings

- [x] [Review][Patch] Require positive Current Bid in `canAttemptMarkSold` [`apps/web/src/auction-board-helpers.ts:47`]
- [x] [Review][Patch] Guard `handleMarkSold` against precomputed capacity blockers [`apps/web/src/main.tsx:960`]
- [x] [Review][Patch] Show all API conflict reasons and avoid duplicate capacity/error panels [`apps/web/src/main.tsx:992`]
- [x] [Review][Patch] Reset `markSoldState` when other board commands succeed [`apps/web/src/main.tsx:780`]
- [x] [Review][Patch] Treat missing capacity details as a prerequisite conflict in domain [`packages/domain/src/mark-sold.ts:91`]
- [x] [Review][Patch] Adapt valid-sale stub message from domain validation result [`apps/server/src/app.ts:920`]
- [x] [Review][Patch] Assert action-log non-mutation and duplicate command-id rejection in API tests [`apps/server/src/app.test.ts:636`]
- [x] [Review][Patch] Add isolated squad-only and role-only domain tests [`packages/domain/src/mark-sold.test.ts:35`]
- [x] [Review][Patch] Add Mark Sold API error and click-flow component test [`apps/web/src/main.test.tsx:49`]
- [x] [Review][Patch] Replace magic E2E bid-increase count with capacity-driven loop [`apps/web/e2e/event-mode.spec.ts:319`]
- [x] [Review][Defer] E2E coverage for squad-full and role-target-full blocking paths — deferred, domain/API unit tests cover constraints; full E2E setup requires Story 2.6 sale mutation.
- [x] [Review][Defer] NaN/non-finite bid defensive guards — deferred, corrupt numeric state is out of scope for this slice.
- [x] [Review][Defer] Player-already-sold status guard in domain — deferred to Story 2.6 accepted-sale path.
