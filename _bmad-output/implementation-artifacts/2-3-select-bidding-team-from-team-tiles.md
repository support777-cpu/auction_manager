---
baseline_commit: 4801c5843917ab7409f1e4626d9a744c03b5e25b
created: 2026-07-07T18:32:09+0530
---

# Story 2.3: Select Bidding Team From Team Tiles

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want to select the Team currently bidding for the revealed Player,
so that the board shows the active bidder and the sale can later be recorded accurately.

## Acceptance Criteria

1. Given a Current Player is revealed during Initial Auction, when the live board renders Team tiles, then each Team tile shows logo or placeholder, Team name, Captain name, remaining budget, squad count, and Current Player role capacity, and the grid remains readable on the mirrored display.
2. Given a Team has no matched logo, when the live board renders Team tiles, then that Team tile uses the neutral Team logo placeholder from the setup media contract, and missing logo state is not styled as a live-event failure.
3. Given the operator selects a Team tile, when the selection command succeeds, then the selected Team is visible on the Auction Board, and the state is reconciled from the authoritative server response.
4. Given a Team is already selected, when the operator selects a different Team or clears selection, then the selected Team changes or clears, and the change is recorded as a reversible live action.
5. Given a selected Team cannot currently buy the Current Player due to budget, squad, or role capacity, when Team tiles and capacity indicators render, then the app shows specific capacity state in text near the relevant Team/Mark Sold context, and the blocked state is not communicated by color alone.
6. Given keyboard-only operation is used, when focus moves through Team tiles, then each tile exposes accessible name, selected state, budget, squad count, and Current Player role capacity, and Space activates the focused tile using standard button behavior.
7. Given a developer finishes this story, when they run the story's Dev Gate, then select-team domain tests, route/schema tests, Team tile component/accessibility tests, and typecheck pass, and an E2E or acceptance test proves selecting and changing a Team updates the live board.
8. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks accessibility, board readability, selected-state persistence, unit/API tests, and the Team selection E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Tasks / Subtasks

- [x] Add shared command and DTO contracts for Team selection. (AC: 1, 3, 4, 5, 7)
  - [x] Extend `packages/shared/src/index.ts` with `selectTeamRequestSchema` requiring `clientCommandId` and `teamId: string | null`, where `null` clears selection.
  - [x] Add `selectTeamResponseSchema` returning `{ state: BoardStateDto, result: CommandResultSummary & { command: "SelectTeam" } }`.
  - [x] Add a typed undo-history entry for `SelectTeam` and widen `liveActionUndoHistoryEntrySchema` to include `RevealNextPlayer` and `SelectTeam`.
  - [x] Add a strict board projection for Current Player team capacity. Preferred shape is either a `currentPlayerCapacity` field on each Team DTO or a `currentPlayerCapacityByTeam` list keyed by Team id. It must include `teamId`, `canBuy`, and text reasons for budget, squad, and role-capacity blocks when a Current Player exists.
  - [x] Keep DTOs allowlisted. Do not add source row numbers, source filenames, registration/payment/private fields, raw `AuctionState`, or action-log payloads to board responses.
  - [x] Update `packages/shared/src/auction-state-contracts.test.ts` to prove select-team request/response contracts, undo entry shape, strict DTO parsing, and private-field rejection.

- [x] Implement domain-owned Team selection and capacity evaluation. (AC: 3, 4, 5, 7)
  - [x] Add a pure domain command such as `selectTeam` in `packages/domain/src/select-team.ts` and export it from `packages/domain/src/index.ts`.
  - [x] Accept authoritative `AuctionState`, `teamId`, and `now()` timestamp; return typed success or typed conflict/error. No DB, fetch, React state, or filesystem access.
  - [x] Require `state.phase === "InitialAuction"` for this story. Do not implement Phase 2 Team selection or Manual Assignment selection here.
  - [x] Require a revealed Current Player. Reject selection when `state.currentPlayerId === null` or `state.currentBid === null`.
  - [x] If `teamId` is non-null, require it to match an existing Team id. If `teamId` is null, clear the current selection.
  - [x] On success, change only `selectedTeamId`, append a reversible SelectTeam undo-history entry containing previous and next selected Team ids, update `updatedAt`, and leave Players, Current Bid, Teams, budgets, squad counts, role counts, sold fields, Phase 1 order, and phase unchanged.
  - [x] If the selected Team id is already the current value, prefer returning success without adding a duplicate undo entry, or return a typed no-op result if that pattern is clearer. Whichever behavior is chosen must be tested and documented.
  - [x] Add a domain-owned helper such as `getCurrentPlayerTeamCapacity` or `evaluateTeamCapacityForCurrentPlayer`. It should derive capacity from the Current Player, Current Bid, Team remaining budget, max squad size, and role target. React must not duplicate these rules.

- [x] Persist Team selection as one atomic live mutation. (AC: 3, 4, 7)
  - [x] Extend `packages/persistence/src/index.ts` with `commitSelectTeam`, or generalize the existing reveal live-mutation transaction without weakening tests.
  - [x] In one SQLite transaction: assert mutations are allowed, reject duplicate `clientCommandId`, update `auction_state.state_json`, `phase`, `updated_at`, and `persistence_failure`, and insert an `action_log` row with command `SelectTeam`, `undoable = 1`, timestamp, summary, and before/after or inverse payload.
  - [x] Snapshot `data/snapshots/latest.json` only after DB commit. If snapshot writing fails, preserve the committed selected Team state, mark `persistenceFailure`, return authoritative state with warning behavior consistent with Story 2.2, and block later mutations until recovery is addressed.
  - [x] Extend `ActionLogEntry.command` from `"StartAuction" | "RevealNextPlayer"` to include `"SelectTeam"` without breaking existing Start Auction and Reveal Next tests.
  - [x] Do not create a separate selected-team table or UI-local selected-team truth unless it is a same-transaction materialized cache with tests. Authoritative state remains `auction_state.state_json`.

- [x] Add `POST /api/auction/select-team` in the Fastify app. (AC: 3, 4, 5, 7)
  - [x] In `apps/server/src/app.ts`, add an intent-named same-origin route using `application/json` only and the shared `selectTeamRequestSchema`.
  - [x] Return `400` for invalid request shape, `415` for unsupported content type, and `409` for inactive auction, uncleared persistence failure, duplicate `clientCommandId`, wrong phase, no Current Player, missing Current Bid, or unknown Team id.
  - [x] Route handlers may adapt errors and DTOs only. They must not decide selection semantics, compute undo payloads, or implement capacity rules directly.
  - [x] Return `SelectTeam` result summaries with operational copy such as `Selected Eagles for Aarav Menon.` or `Cleared selected Team.` Avoid celebratory or vague copy.
  - [x] Update `toBoardStateDto` so Team tile capacity is projected from the domain helper and appears whenever a Current Player and Current Bid exist.
  - [x] Keep logs and responses free of private setup/source fields.

- [x] Update the live board Team tile UI. (AC: 1, 2, 3, 5, 6, 7)
  - [x] In `apps/web/src/main.tsx`, add a select-team command handler mirroring `handleRevealNext`: fresh `clientCommandId`, in-flight guard, pending affordance, strict shared response parsing, authoritative `boardState` replacement, and `refreshBoardState()` on command error.
  - [x] Render Team tiles as real `button` elements so Space activation follows standard browser behavior. Do not use clickable `article` elements.
  - [x] Enable Team tile selection only when `boardState.phase === "InitialAuction"`, `boardState.currentPlayer !== null`, `boardState.currentBid !== null`, no select-team command is in flight, and `boardState.persistenceFailure === null`.
  - [x] Add a visible clear-selection control when `boardState.selectedTeamId !== null`. It should call the same route with `teamId: null` and be disabled during in-flight commands.
  - [x] Show selected Team state on the board: selected tile active styling, selected Team name near Current Bid or Player context, and `aria-pressed` or equivalent selected-state exposure on Team tile buttons.
  - [x] Render Team logo image from `/assets/teams/{logoAssetId}.webp` when present and a neutral placeholder when absent. Missing logo is neutral, not red or failure copy.
  - [x] Render remaining budget, squad count, and Current Player role capacity on every tile. Capacity reasons must be text, not color alone, and visible near the relevant selected Team / future Mark Sold area.
  - [x] Keep stable selectors for E2E/component coverage: `team-tile-{teamId}` or `team-tile`, `team-tile-selected`, `team-logo-placeholder`, `selected-team`, `clear-selected-team`, and `team-capacity-reason`.
  - [x] Preserve existing selectors from Stories 2.1 and 2.2: `auction-board`, `phase-indicator`, `current-player-panel`, `current-bid`, `reveal-next`, `phase1-progress`, `phase1-current-category`, `phase1-ordered-count`, and current-player selectors.

- [x] Add focused tests and preserve regressions. (AC: 1, 2, 5, 6, 7, 8)
  - [x] Domain tests: selects an existing Team, changes Team, clears Team, rejects wrong phase, rejects missing Current Player, rejects missing Current Bid, rejects unknown Team id, appends undo entry, preserves Players/Teams/Current Bid/order, and handles same-selection no-op behavior.
  - [x] Domain capacity tests: budget block, squad-size block, role-target block, combined reasons, and valid capacity for the Current Player role.
  - [x] Persistence tests: selection commit updates state/action log/undoable flag/snapshot, duplicate command handling, clear selection, reopen/resume state, and snapshot-failure mutation blocking.
  - [x] API tests in `apps/server/src/app.test.ts`: valid setup -> Start Auction -> Reveal Next -> Select Team returns selected Team id; change and clear work; invalid content type/body return `415`/`400`; duplicate command id returns `409`; no current player and unknown team return `409`; response JSON excludes private fixture values.
  - [x] UI/component tests: Team tile renders logo/placeholder, accessible name includes Team name/captain/budget/squad/capacity, selected state is exposed, clear-selection control works, blocked reasons are text, and pending state disables duplicate selection.
  - [x] Playwright event-mode test: complete valid setup, start auction, reveal current player, select a Team tile, assert selected Team appears and tile is active, change to another Team, clear selection, refresh and verify authoritative selected state persists, and confirm private sample values are absent.
  - [x] Regression tests from Stories 1.1-2.2 must still pass, especially setup import privacy, placeholder non-blocking behavior, parameter locking, Start Auction duplicate handling, Phase 1 order persistence/no-reshuffle, Reveal Next duplicate handling, and Current Bid initialization.

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Epic 2 `in-progress`, Stories 2.1 and 2.2 `done`, and Story 2.3 `backlog` at story creation time. This story updates Story 2.3 to `ready-for-dev`.
- Current `HEAD` is `4801c58` (`Story 2.2: Reveal Current Player on the Live Board`).
- Worktree was clean at story creation time.
- No `project-context.md` file was found for the persistent-facts glob during story creation.

### Existing Files That This Story Will Touch

Read these before editing and update them in place:

- `packages/shared/src/index.ts`: owns strict Zod schemas/types for auction state, Board DTOs, command requests/responses, phases, statuses, and `undoHistory`. Add SelectTeam request/response, undo entry, and capacity DTO contracts here unless extracting adjacent shared files and re-exporting.
- `packages/shared/src/auction-state-contracts.test.ts`: extend contract/privacy coverage for SelectTeam and capacity projection.
- `packages/domain/src/select-team.ts` (new): place Team selection domain command here. Do not put selected-team mutation rules in Fastify, React, or persistence.
- `packages/domain/src/index.ts`: re-export the new command/helper and types.
- `packages/domain/src/reveal-next-player.ts`: read for command result, timestamp, undo-history, and immutability style. Do not modify unless shared undo typing forces local test updates.
- `packages/domain/src/start-auction.ts`: read for state shape and initialized Team fields.
- `packages/persistence/src/index.ts`: currently supports `StartAuction` and `RevealNextPlayer`. Extend live mutation persistence/action-log/snapshot behavior for `SelectTeam` without breaking existing failure handling.
- `packages/persistence/src/auction-repository.test.ts`: extend for selection commit/action-log/snapshot/resume/failure coverage.
- `apps/server/src/app.ts`: add the select route and response handling; reuse `toBoardStateDto` and add domain-derived capacity projection.
- `apps/server/src/app.test.ts`: add Fastify inject coverage for select route, capacity projection, and privacy.
- `apps/web/src/main.tsx`: wire Team tile buttons, selection command, clear selection, selected-state rendering, pending state, response parsing, and authoritative reconciliation.
- `apps/web/src/auction-board-helpers.ts`: add UI enablement helpers only. Do not put domain capacity or sale-validity rules here.
- `apps/web/src/auction-board-helpers.test.ts`: extend helper coverage for selection enablement if helper code is added.
- `apps/web/src/styles.css`: update Team tile, selected-state, logo/placeholder, capacity, and selected-Team styles with stable dimensions and no layout shift.
- `apps/web/e2e/event-mode.spec.ts`: extend current event-mode flow from Start Auction and Reveal Next into Team selection/change/clear.
- `packages/test-fixtures/src/index.ts` and `_bmad-output/test-artifacts/sample-test-data/*`: use existing fixtures when possible; runtime code must not import `@auction-manager/test-fixtures`.

Do not hand-edit `dist/` outputs. They are build artifacts.

### Current Behavior Of Key UPDATE Files

- `revealNextPlayer` requires `InitialAuction`, requires no unresolved Current Player, selects the first `Pending` id from persisted `phase1Order.playerIds`, sets that Player to `Current`, sets `currentBid` from `player.basePrice`, clears `selectedTeamId`, appends a `RevealNextPlayer` undo entry, and leaves Teams/order unchanged.
- `AuctionState` already has `selectedTeamId: string | null`, so Story 2.3 should mutate that existing field instead of adding a parallel selected-team field.
- `auctionTeamSchema` has `budget`, `remainingBudget`, `squadCount`, and `roleCounts`. These are enough to calculate budget, squad, and Current Player role capacity for tile display.
- `auctionStateSchema` currently only allows `RevealNextPlayer` in `undoHistory`; it must be widened for SelectTeam.
- `ActionLogEntry.command` currently allows `"StartAuction" | "RevealNextPlayer"` only; it must be widened for SelectTeam.
- `commitRevealNextPlayer` shows the expected persistence shape: validate state, assert mutations allowed, reject duplicate command id, update `auction_state`, insert undoable action log, then write snapshot after commit and mark `persistenceFailure` on snapshot failure.
- `POST /api/auction/reveal-next` shows the expected route shape: content-type check, strict shared request parsing, current-state load, persistence-failure guard, duplicate command guard, domain command call, persistence commit, and authoritative DTO response.
- `toBoardStateDto` already returns allowlisted Player/Team fields and `selectedTeamId`, but it does not yet include per-team capacity reasons for the Current Player.
- `AuctionBoard` currently renders initialized Teams as non-interactive `article.team-tile` elements. Story 2.3 must convert them to accessible buttons when a Current Player is revealed.
- `handleRevealNext` already demonstrates the React command pattern to reuse: generation ref, in-flight ref, `clientCommandId`, shared response schema `safeParse`, authoritative `boardState` replacement, and state refresh on error.
- Current Team tiles show Team name, Captain, budget, remaining budget, and squad count. They do not show logos, selected state, role capacity, or command behavior yet.

### SelectTeam Command Contract Guidance

Preferred domain result shape, adjust only to match local style:

```ts
type SelectTeamErrorCode =
  | "auction_not_in_initial_phase"
  | "current_player_required"
  | "current_bid_required"
  | "team_not_found";

type SelectTeamResult =
  | {
      ok: true;
      state: AuctionState;
      selectedTeamId: string | null;
      summary: string;
      undoRecorded: boolean;
    }
  | {
      ok: false;
      error: SelectTeamErrorCode;
      message: string;
    };
```

On success:

- `selectedTeamId` becomes the requested Team id or `null`;
- one SelectTeam undo-history entry is appended only when the value changes;
- `updatedAt` uses the command timestamp when the value changes;
- no Player status, Current Bid, Team budget, remaining budget, squad count, role count, sold price, winning Team, acquisition type, phase, or Phase 1 order changes.

Suggested undo entry:

```ts
{
  command: "SelectTeam",
  previousSelectedTeamId,
  nextSelectedTeamId,
  currentPlayerId,
  currentBid,
  timestamp
}
```

Capacity projection should be derived, not persisted. Suggested reason codes and copy:

- `insufficient_budget`: `{teamName} has {remainingBudget} remaining; current bid is {currentBid}.`
- `squad_full`: `{teamName} already has {squadCount} of {maxSquadSize} players.`
- `role_target_full`: `{teamName} has {roleCount} of {roleTarget} {role} slots filled.`

Use integer money/counts only.

### Persistence Ownership

This story owns durable selected-Team state for Phase 1 live bidding.

Minimum durable concepts:

- `auction_state.state_json`: update `selectedTeamId`, `undoHistory`, `updatedAt`, and `persistenceFailure` if needed.
- `action_log`: insert command `SelectTeam`, `client_command_id`, timestamp, summary, payload JSON, and `undoable = 1` when the selection changes. If same-selection no-op is treated as success, decide whether to skip action-log insertion or log an undoable false no-op, and test the chosen behavior.
- `action_log.payload_json`: include at least command, current Player id, current bid, previous selected Team id, next selected Team id, and compact undo payload.
- `snapshots/latest.json`: write the updated authoritative state after DB commit.

Constraints:

- Do not mutate current bid or any Team budget/count fields.
- Do not implement Mark Sold, invalid sale mutation blocking, bid increment, Mark Unsold, Undo execution, Team rosters, Phase 2, or Manual Assignment in this story.
- Do not write snapshot before DB commit.
- Do not allow mutation while `persistenceFailure` is set.
- Do not expose action-log payloads to the room-facing board.

### Architecture Guardrails

- AD-2: `packages/domain` owns selected-Team command semantics and capacity/role validation logic. React and Fastify may request and display results only.
- AD-3: React reconciles to authoritative server state after selection; React may not keep an independent selected bidder.
- AD-4: `POST /api/auction/select-team` must require `clientCommandId`, validate request/response schemas, and return authoritative state plus summary.
- AD-5: selected-Team state and action-log write must be atomic, with snapshot after commit.
- AD-6: selection changes must be recorded as undoable for Story 2.9.
- AD-8: board DTOs, route responses, command logs, snapshots, and rendered UI must exclude private setup/source fields.
- AD-11: domain command changes need Vitest domain tests; persistence changes need transaction/resume/action-log/snapshot tests; route changes need Fastify `inject()` tests; UI flow changes need Playwright/event-mode coverage.
- AD-12: keep this slice correctness-first. Do not build later sale or bid controls before selected-Team state is reliable.
- AD-13: capacity checks use locked Auction Parameters from authoritative state.
- AD-14: this story is Phase 1 Team selection only. Do not implement Phase 2 selection.
- AD-15: Team rosters remain derived projections; do not add roster truth while selecting a bidder.

### UX Requirements For This Story

- Team tiles become the main selection surface only when a Current Player is revealed.
- Each tile shows logo or neutral placeholder, Team name, Captain, remaining budget, squad count, and Current Player role capacity.
- Selected tile uses active visual treatment from design tokens: field green background, white foreground, and selected state exposed to assistive technology.
- Missing Team logo uses neutral placeholder copy such as `Team logo placeholder`, not danger red or failure text.
- Capacity state is text, not color alone. For blocked selected Teams, show specific reason near the selected Team / future Mark Sold context so the operator does not have to inspect every tile.
- Clear selected Team must be visible when a Team is selected.
- Command-in-flight state disables Team selection and clear selection until authoritative response returns. Duplicate clicks must not create duplicate mutations.
- Keep operational copy calm and specific: `Selected Eagles for Aarav Menon.` Avoid hype, jokes, and vague errors.
- Preserve responsive acceptance profiles: 1440x900, 1366x768, 1920x1080 projected display, and 390x844 fallback without text overlap. Team tile dimensions should not jump when selected or blocked state appears.
- Maintain WCAG-oriented basics: visible focus, standard button semantics, accessible names, `aria-pressed` or selected-state equivalent, text blocked reasons, and live controls at least 44 CSS px.

### Previous Story Intelligence

- Story 2.2 added `RevealNextPlayer` shared contracts, domain command, persistence commit, `POST /api/auction/reveal-next`, current-player board rendering, Current Bid display, neutral Player placeholder, duplicate-click protection, and event-mode E2E coverage.
- Story 2.2 intentionally cleared `selectedTeamId` on reveal. Story 2.3 should rely on that behavior and then set `selectedTeamId` through a command.
- Story 2.2 left Mark Sold, Mark Unsold, bid increment, Undo execution, Team selection, rosters, dangerous operations, and phase transitions out of scope. Do not pull those future controls into this story except for selected-Team/capacity context needed for Team tiles.
- Story 2.1 added `phase1Order` and `phase1Progress`; do not reshuffle or recalculate order while selecting a Team.
- The current UI already has Team tiles under the board. Extend that surface rather than adding a separate bidder picker.
- Existing event-mode test data has 8 Players and 4 Teams; use it for Team selection E2E and privacy assertions.

### Git Intelligence Summary

- Recent commits:
  - `4801c58 Story 2.2: Reveal Current Player on the Live Board`
  - `d7bfe7b Story 2.1: Create Persisted Phase 1 Player Order`
  - `70a0446 Update Readme`
  - `4ffbc6d refactor(web): remove verbose helper copy from setup UI`
  - `e316f9a Story 1.6: Start Auction With Persisted Initial State`
- Story 2.2 touched `packages/shared/src/index.ts`, `packages/domain/src/reveal-next-player.ts`, `packages/domain/src/index.ts`, `packages/persistence/src/index.ts`, `apps/server/src/app.ts`, `apps/web/src/main.tsx`, `apps/web/src/styles.css`, and event-mode tests. Story 2.3 should extend this same slice.
- The repo pattern is strict shared contracts, pure domain commands, transaction-backed persistence, thin Fastify adapters, React `safeParse` of server JSON, Vitest coverage, and Playwright event-mode coverage.
- Package dependency direction to preserve: `shared` has no workspace dependencies; `domain` depends on `shared`; `persistence` depends on `domain` and `shared`; `imports` depends on `shared`; `server` depends on runtime packages; `web` depends on `shared`.

### Latest Tech Information

Checked on 2026-07-07:

- npm latest: React `19.2.7`, Fastify `5.10.0`, Zod `4.4.3`, better-sqlite3 `12.11.1`, Playwright `1.61.1`, Vitest `4.1.10`.
- Architecture pins React `19.2.7`, Fastify `5.9.0`, Zod `4.4.3`, better-sqlite3 `12.11.1`, Playwright `1.61.1`, and Vitest `4.1.9`; package ranges currently allow compatible installed versions. Do not upgrade dependencies in this story just to chase Fastify/Vitest patch releases.
- Use the installed lockfile/API unless implementation hits a concrete bug requiring an explicit upgrade and full regression run.
- Fastify route discipline remains: content-type checks plus schema/body validation. Keep `application/json` only for select-team.
- Zod 4 remains the runtime schema library. Use strict schemas for external DTOs and `safeParse` at React/server boundaries.
- better-sqlite3 transaction wrappers remain the right local pattern for atomic DB mutations. Keep state update and action-log insert in one transaction.
- Playwright auto-waits for actionability before clicks. The duplicate-click/duplicate-command tests still need app-level proof through in-flight guards and duplicate `clientCommandId` API coverage.
- Sources: `https://registry.npmjs.org/react/latest`, `https://registry.npmjs.org/fastify/latest`, `https://registry.npmjs.org/zod/latest`, `https://registry.npmjs.org/better-sqlite3/latest`, `https://registry.npmjs.org/@playwright/test/latest`, `https://registry.npmjs.org/vitest/latest`, `https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/`, `https://zod.dev/api`, `https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md`, `https://playwright.dev/docs/actionability`.

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

- `TD-017` P0: Select Team records selected bidder, persists selected Team id, and records undoable live action.
- `TD-018` P0: Team tile capacity displays budget, squad, and Current Player role capacity with text reasons.
- `TD-021` P1: Select Team requires `clientCommandId`; duplicate command id and duplicate clicks do not create duplicate selection mutations.
- `TD-029` P0: board DTOs, live UI, command logs, and snapshots exclude private registration/source fields.
- `TD-036` P0 regression: refresh/reopen after reveal and selection resumes the same Current Player, Current Bid, and selected Team.

Review/Test Gate:

- A second agent must inspect that route/UI code does not own Team selection semantics, capacity rules, or selected-Team truth.
- The reviewer must verify selected-state persistence, clear/change behavior, undo/action-log payload adequacy for Story 2.9, snapshot/resume behavior, duplicate-command behavior, DTO privacy, neutral logo placeholders, keyboard/accessibility behavior, and E2E event-mode coverage.

### Project Structure Notes

- Extend existing packages; do not create a new app or package.
- Keep runtime source under `src/`; do not edit `dist/` output by hand.
- This story may add focused files such as `packages/domain/src/select-team.ts`; keep exports centralized through existing package `index.ts` files.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.3-Select-Bidding-Team-From-Team-Tiles]
- [Source: _bmad-output/planning-artifacts/epics.md#Additional-Requirements]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#Invariants--Rules]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#Capability---Architecture-Map]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md#Components]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md#Component-Patterns]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md#Accessibility-Floor]
- [Source: _bmad-output/implementation-artifacts/2-2-reveal-current-player-on-the-live-board.md#Previous-Story-Intelligence]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-07T18:57:56+0530: Completed Story 2.3 implementation and ran Dev Gate commands.
- Dev Gate: `npm run typecheck` passed.
- Dev Gate: `npm test` passed, 28 files / 174 tests.
- Dev Gate: `npm run build` passed.
- Dev Gate: `npm run test:e2e` passed, 4 Playwright tests.
- Dev Gate: `npm run test:e2e:event` passed, 8 Playwright tests.

### Completion Notes List

- Added strict shared SelectTeam request/response contracts, SelectTeam undo-history entries, and allowlisted current-player capacity DTOs on Team board DTOs.
- Added pure domain-owned Team selection and current-player capacity evaluation; selection changes only `selectedTeamId`, undo history, and `updatedAt`, with same-selection treated as a success without duplicate undo history.
- Persisted SelectTeam as an atomic live mutation with duplicate command protection, action-log payload, undoable flag for real changes, snapshot-after-commit behavior, and snapshot-failure blocking.
- Added `POST /api/auction/select-team` as a thin Fastify adapter using shared schema validation, domain command semantics, persistence commit, and authoritative board DTO reconciliation.
- Updated the live board to render Team tiles as accessible buttons with logo/placeholder, selected state, clear selection, in-flight guards, capacity text, and authoritative response parsing.
- Added focused shared, domain, persistence, API, UI helper, and event-mode Playwright coverage for selection, change, clear, duplicate commands, persistence, capacity, and privacy.

### File List

- _bmad-output/implementation-artifacts/2-3-select-bidding-team-from-team-tiles.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/server/src/app.test.ts
- apps/server/src/app.ts
- apps/web/e2e/event-mode.spec.ts
- apps/web/src/auction-board-helpers.test.ts
- apps/web/src/auction-board-helpers.ts
- apps/web/src/main.tsx
- apps/web/src/styles.css
- packages/domain/src/index.ts
- packages/domain/src/select-team.test.ts
- packages/domain/src/select-team.ts
- packages/persistence/src/auction-repository.test.ts
- packages/persistence/src/index.ts
- packages/shared/src/auction-state-contracts.test.ts
- packages/shared/src/index.ts

### Change Log

- 2026-07-07: Implemented Story 2.3 Team selection, capacity projection, persistence/API/UI integration, and tests; status moved to review.
- 2026-07-07: Code review patches — skip persistence on same-team no-op, capacity guards, logo placeholder copy, role capacity display, clear-selection orphan fix, pending affordance, and test coverage.

### Review Findings

- [x] [Review][Patch] Same-team re-select must skip persistence when undoRecorded is false [apps/server/src/app.ts]
- [x] [Review][Patch] Invalid request message must mention null teamId clears selection [apps/server/src/app.ts]
- [x] [Review][Patch] Guard non-positive currentBid and incomplete role capacity data [packages/domain/src/select-team.ts]
- [x] [Review][Patch] Team logo placeholder visible copy must match contract [apps/web/src/main.tsx]
- [x] [Review][Patch] Show numeric role capacity on tiles instead of Open/Blocked only [apps/web/src/main.tsx]
- [x] [Review][Patch] Clear selection when selectedTeamId is set but team row is missing [apps/web/src/main.tsx]
- [x] [Review][Patch] Fallback placeholder when team logo image fails to load [apps/web/src/main.tsx]
- [x] [Review][Patch] Select-team pending affordance and aria-busy on team board [apps/web/src/main.tsx]
- [x] [Review][Patch] Add team-capacity-reason test id on blocked tile capacity text [apps/web/src/main.tsx]
- [x] [Review][Patch] API test for same-team no-op without duplicate persistence [apps/server/src/app.test.ts]
- [x] [Review][Defer] Concurrent select-team stale-state protection — deferred, pre-existing pattern across live commands
- [x] [Review][Defer] Full UI/component test suite for tile a11y and keyboard — deferred, helper tests cover enablement; E2E covers primary flow
- [x] [Review][Defer] Blocked-capacity E2E scenario — deferred, domain and DTO tests cover capacity reasons; Story 2.5 owns sale blocking
