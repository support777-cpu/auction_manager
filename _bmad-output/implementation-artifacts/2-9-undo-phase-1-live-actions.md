---
baseline_commit: 9bb3024
---

# Story 2.9: Undo Phase 1 Live Actions

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want to undo recent Phase 1 live actions,
so that ordinary bidding mistakes can be corrected while the room is watching.

## Acceptance Criteria

1. Given the operator has performed reversible Phase 1 actions, when the live board renders Undo, then Undo shows the last reversible action summary, and Undo is disabled with `No actions to undo.` when history is empty.
2. Given the last action was Reveal Next Player, when the operator performs Undo, then the Current Player is returned to the correct pending state, and Current Bid and selected Team return to the previous state.
3. Given the last action was Select Team or Increase Bid, when the operator performs Undo, then selected Team or Current Bid is restored to the prior value, and other Player and Team state remains unchanged.
4. Given the last action was Mark Sold, when the operator performs Undo, then the Player is no longer sold, Sold Price and winning Team are cleared, Team budget is restored, Squad Size and Role Count are decremented, roster projection removes the Player from the Team, phase/pending state is restored, and the board returns to the correct prior state.
5. Given the last action was Mark Unsold, when the operator performs Undo, then the Player is removed from the Phase 2 Unsold Bidding pool, and Current Player, pending state, and Team state are restored correctly.
6. Given Undo succeeds, when persistence completes, then undo is committed atomically with current-state updates, action-log entry, updated Undo History, and latest snapshot, and the response returns authoritative board-ready and roster-ready state.
7. Given keyboard-only operation is used, when the operator uses `u` or focuses Undo, then Undo is reachable and operable without a pointer, and it never affects Reset Auction or Close Auction.
8. Given a developer finishes this story, when they run the story's Dev Gate, then domain undo tests for reveal, select team, increase bid, sold, and unsold pass; persistence/action-log/snapshot tests pass; route/schema tests pass; Undo UI/accessibility tests pass; and typecheck passes, and an E2E or acceptance test proves undo after sale restores Player, Team, roster projection, bid, phase, board, action log, and snapshot state.
9. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks action-log inverse/before-after behavior, full state restoration including roster projection, Undo scope exclusions, unit/integration/API tests, and the undo-after-sale E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Implementation Boundary

- This story implements Phase 1 undo execution for `RevealNextPlayer`, `SelectTeam`, `IncreaseBid`, `MarkSold`, and `MarkUnsold`.
- Do not implement Phase 2 undo, phase-transition undo, Manual Assignment undo, Reset Auction, Close Auction, the Board/Rosters switch, or the Team detail drawer.
- Do not derive undo behavior in React or route handlers. `packages/domain` owns undo semantics.
- Do not replay raw `action_log` to rebuild state in this story. Use the authoritative persisted `AuctionState.undoHistory` entry as the command input, with action-log payloads kept as audit/evidence.
- Do not mutate state for no-op Select Team actions that were not recorded in `undoHistory`.
- Reset Auction and Close Auction are future dangerous commands and must remain excluded from Undo by design.

## Tasks / Subtasks

- [x] Add shared Undo contracts and board summary fields. (AC: 1, 6, 7, 8, 9)
  - [x] In `packages/shared/src/index.ts`, add `undoRequestSchema` with `clientCommandId`.
  - [x] Add `undoResponseSchema` with `{ state, result: { command: "Undo", clientCommandId, message } }`.
  - [x] Add a compact allowlisted Undo summary DTO, e.g. `lastUndoAction: { command, summary } | null`, to `boardStateDtoSchema`, or a similarly strict field that lets the UI show the next action to undo.
  - [x] Keep `canUndo` derived from `state.undoHistory.length > 0`.
  - [x] Add shared contract tests for request/response parsing, summary DTO strictness, and private/source-field rejection.

- [x] Implement a domain-owned `undoLastAction` command. (AC: 2, 3, 4, 5, 7, 8, 9)
  - [x] Add `packages/domain/src/undo.ts` and export it from `packages/domain/src/index.ts`.
  - [x] Return a conflict if `state.phase !== "InitialAuction"` for this story, if `undoHistory` is empty, or if the last entry command is unsupported.
  - [x] For `RevealNextPlayer`, restore the revealed Player to `previousPlayerStatus`, restore `currentPlayerId`, `currentBid`, and `selectedTeamId`, and pop exactly one undo entry.
  - [x] For `SelectTeam`, restore `previousSelectedTeamId`, keep the same Current Player and Current Bid, and pop exactly one undo entry.
  - [x] For `IncreaseBid`, restore `previousCurrentBid`, keep Player and Team state unchanged, and pop exactly one undo entry.
  - [x] For `MarkSold`, restore the Player fields from the undo entry, restore `currentPlayerId`, `currentBid`, `selectedTeamId`, restore the winning Team's `remainingBudget`, `squadCount`, and role count, remove the Player from derived roster projection by restoring Player ownership fields, and pop exactly one undo entry.
  - [x] For `MarkUnsold`, restore the Player status and current fields, remove only that Player from `phase2Pool`, preserve Team state, and pop exactly one undo entry.
  - [x] Set `updatedAt` from `now()` and return a calm summary such as `Undid Mark Sold: [Player].`
  - [x] Add domain tests for every supported command, empty history, unsupported/non-Initial phase rejection, one-entry pop behavior, and no mutation of the input state.

- [x] Persist Undo atomically. (AC: 6, 8, 9)
  - [x] In `packages/persistence/src/index.ts`, extend `ActionLogEntry["command"]` to include `"Undo"` and add `CommitUndoInput`.
  - [x] Add `commitUndo({ previousState, state, clientCommandId, summary, undoneAction })` using the same transaction pattern as existing live commands.
  - [x] Enforce duplicate `clientCommandId`, active matching auction, and persistence-failure blocking before commit.
  - [x] Update `auction_state.state_json`, `phase`, `updated_at`, clear `persistence_failure`, insert an `action_log` row with `command = "Undo"` and `undoable = 0`, then write `data/snapshots/latest.json` after commit.
  - [x] Payload should include a compact audit record: the undone command, previous last undo entry, next undo summary if any, before/after current fields, affected Player id, affected Team id when relevant, and roster/phase2Pool effects where relevant. Do not include private setup/source fields.
  - [x] Add repository tests for undo after reveal, select, bid, sold, and unsold; action-log ordering; snapshot contents; duplicate command id; persistence failure; and reopen/resume after undo.

- [x] Add Fastify route support for Undo. (AC: 1, 6, 8, 9)
  - [x] In `apps/server/src/app.ts`, import the domain command and shared schemas.
  - [x] Add `POST /api/auction/undo` with the same JSON content-type, request parsing, active-auction, persistence-failure, duplicate-command, and error style used by the Phase 1 command routes.
  - [x] Call `undoLastAction({ state: currentState, now })`, then `auctionRepository.commitUndo(...)`.
  - [x] Return schema-validated authoritative `toBoardStateDto(result.state)` plus `command: "Undo"`.
  - [x] Update `toBoardStateDto()` to include the last Undo summary field from `state.undoHistory.at(-1)`.
  - [x] Add `apps/server/src/app.test.ts` coverage for success, empty history conflict, undo after sale full restoration, undo after unsold pool removal, duplicate id, persistence failure, and DTO privacy.

- [x] Add Undo UI and keyboard operation to the existing board. (AC: 1, 6, 7, 8)
  - [x] In `apps/web/src/auction-board-helpers.ts`, add `canUndo(boardState)` requiring `boardState.canUndo` and `persistenceFailure === null`.
  - [x] In `apps/web/src/main.tsx`, add undo generation/in-flight state matching the existing command pattern.
  - [x] Render a secondary Undo control near routine live controls with stable test id `undo-action`.
  - [x] When history exists, show the last reversible summary in or near the control, e.g. `Undo Mark Sold: Aarav -> Eagles, 25.` Use the board DTO summary, not client-side state reconstruction.
  - [x] When history is empty, disable Undo and show `No actions to undo.`
  - [x] On success, reconcile from the authoritative response, clear stale sale/unsold summaries, and show the Undo result summary in a `role="status"` area with stable test id `undo-success`.
  - [x] On conflict or persistence failure, show calm copy in a `role="alert"` area with stable test id `undo-error`, then refresh board state.
  - [x] Add `u` keyboard handling so it focuses the Undo button or invokes it when safe and focus is not inside an editable target. Preserve existing `+` behavior and do not interfere with standard button Space/Enter behavior.
  - [x] Keep controls at least 44 CSS px, visible focus states, accessible names, and no layout shift in 1440x900, 1366x768, 1920x1080, or 390x844 profiles.

- [x] Expand event-mode and component coverage. (AC: 1, 2, 3, 4, 5, 7, 8, 9)
  - [x] Add React component tests for empty Undo state, last action summary display, successful Undo response reconciliation, error display, disabled state under persistence failure, and keyboard `u`.
  - [x] Add or extend Playwright event-mode coverage: complete setup, reveal, select team, increase bid, mark sold, verify roster projection, undo, verify Player returns to Current/Pending as appropriate, Team budget/count/role/roster revert, action log/snapshot evidence remains consistent, and refresh/resume after undo preserves the reverted state.
  - [x] Add a Mark Unsold E2E or integration path proving undo removes the Player from the Phase 2 pool and restores the Current Player without Team mutation.

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Epic 2 `in-progress`, Stories 2.1-2.8 `done`, and Story 2.9 `backlog` at story creation time. This story creation updates 2.9 to `ready-for-dev`.
- Current `HEAD` at story creation is `9bb3024` (`Story 2.8: Persist and Resume Phase 1 Live State`).
- `git status --short` was clean at story creation.
- No `project-context.md` exists for the persistent-facts glob.
- Repo uses npm workspaces. Run scripts from the root.

### Files To UPDATE

- `packages/shared/src/index.ts` - Undo request/response schemas, Undo result type, last-undo summary DTO on `BoardStateDto`.
- `packages/shared/src/auction-state-contracts.test.ts` - Undo contract parsing, strict summary DTO, privacy rejection.
- `packages/domain/src/index.ts` - export the new Undo command.
- `packages/domain/src/undo.ts` - new domain command for Phase 1 undo semantics.
- `packages/domain/src/undo.test.ts` - domain restoration tests for reveal/select/bid/sold/unsold and rejection cases.
- `packages/persistence/src/index.ts` - `CommitUndoInput`, `commitUndo`, `ActionLogEntry` command union, action-log payload.
- `packages/persistence/src/auction-repository.test.ts` - transaction, action-log, snapshot, reopen, duplicate-id, persistence-failure tests.
- `apps/server/src/app.ts` - `POST /api/auction/undo`, DTO summary mapping, response validation.
- `apps/server/src/app.test.ts` - route/schema/conflict/full-restoration/privacy tests.
- `apps/web/src/auction-board-helpers.ts` - `canUndo` helper.
- `apps/web/src/auction-board-helpers.test.ts` - Undo availability helper tests.
- `apps/web/src/main.tsx` - Undo command state, button, keyboard shortcut, success/error copy.
- `apps/web/src/main.test.tsx` - component/accessibility/keyboard tests.
- `apps/web/src/styles.css` - minimal Undo control/status styling.
- `apps/web/e2e/event-mode.spec.ts` - undo-after-sale and undo-after-unsold event-mode coverage.

Do not hand-edit `dist/` outputs.

### Current Behavior Of Key UPDATE Files

- `packages/shared/src/index.ts` already defines strict undo-history entry schemas for `RevealNextPlayer`, `SelectTeam`, `IncreaseBid`, `MarkSold`, and `MarkUnsold`; `AuctionState.undoHistory` is an array of that discriminated union. It does not yet define an Undo request/response schema or a last-undo summary DTO. [Source: `packages/shared/src/index.ts`]
- `packages/domain/src/reveal-next-player.ts` appends `RevealNextPlayer` undo entries with previous current fields and previous Player status. [Source: `packages/domain/src/reveal-next-player.ts`]
- `packages/domain/src/select-team.ts` appends `SelectTeam` undo entries only when selection actually changes; selecting the same Team succeeds without recording undo history. [Source: `packages/domain/src/select-team.ts`]
- `packages/domain/src/increase-bid.ts` appends one undo entry per increment with previous and next bid values. [Source: `packages/domain/src/increase-bid.ts`]
- `packages/domain/src/mark-sold.ts` stores all data needed to reverse a sale: previous Player fields, previous current fields, winning Team id, previous/next budget, squad count, role count, and sold price. [Source: `packages/domain/src/mark-sold.ts`]
- `packages/domain/src/mark-unsold.ts` stores the previous Player status and previous current fields but not the previous full `phase2Pool`; Undo should remove the affected Player id from `phase2Pool` and preserve the rest. [Source: `packages/domain/src/mark-unsold.ts`]
- `packages/persistence/src/index.ts` currently supports commit methods for Start, Reveal, Select, Increase, Mark Sold, and Mark Unsold. Each successful live mutation writes current state, appends `action_log`, and writes `latest.json` after commit. [Source: `packages/persistence/src/index.ts`]
- Existing action-log rows for Phase 1 commands already include `undo: input.state.undoHistory.at(-1) ?? null` or equivalent payloads. Story 2.9 should consume persisted `AuctionState.undoHistory` and continue logging compact undo audit payloads. [Source: `packages/persistence/src/index.ts`]
- `apps/server/src/app.ts` already follows a repeated route pattern for Phase 1 commands: content-type check, Zod request parse, `loadCurrentState`, persistence-failure check, duplicate `clientCommandId` check, domain command, repository commit, schema-validated response. Reuse this pattern for `/api/auction/undo`. [Source: `apps/server/src/app.ts`]
- `toBoardStateDto()` already derives `teamRosters` from Player ownership via `deriveSoldRosterRows`, exposes `phase2PoolCount`, and sets `canUndo` from `state.undoHistory.length > 0`. Extend it rather than creating a separate roster or undo truth. [Source: `apps/server/src/app.ts`]
- `apps/web/src/main.tsx` currently has command generation/in-flight patterns for reveal/select/increase/sold/unsold, keyboard handling for `+`, and no visible Undo control. Add Undo using the same command pattern. [Source: `apps/web/src/main.tsx`]
- `apps/web/src/auction-board-helpers.ts` has command availability helpers gated by phase/current state/persistence failure. Add `canUndo` here for consistent UI disabling. [Source: `apps/web/src/auction-board-helpers.ts`]

### Persistence Ownership

This story owns Phase 1 undo persistence and audit logging.

- `auction_state.state_json`: must store the post-undo authoritative `AuctionState` with exactly one fewer `undoHistory` entry, restored current fields, restored Player/Team state, and correct `phase2Pool`.
- `auction_state.phase`: remains `InitialAuction` for this story.
- `auction_state.updated_at`: must match the Undo command timestamp.
- `action_log`: append an `Undo` row with `undoable = 0`. Undo rows must not themselves become undoable entries.
- `snapshots/latest.json`: must match the post-undo authoritative state after commit.
- `current_auction`: unchanged.
- Schema migration: no SQLite schema migration is expected unless implementation chooses to constrain command values; TypeScript unions and tests are sufficient for the current table.

### Architecture Guardrails

- AD-2: `packages/domain` is the only module allowed to decide Undo semantics. React and Fastify must not patch state directly.
- AD-3: React reconciles only from the authoritative server response after Undo.
- AD-4: Undo is an intent-named `POST /api/auction/undo` mutation with `clientCommandId`.
- AD-5: Undo must be one SQLite transaction plus post-commit snapshot. If persistence fails, later mutations remain blocked by the existing persistence-failure behavior.
- AD-6: Undo is action-log/undo-history based and restores all affected Player, Team, bid, selected-team, role-count, budget, phase, pending-pool, and randomized-order fields relevant to Phase 1. Reset and Close remain excluded.
- AD-8: Board, roster, log, snapshot, and UI DTOs must not expose email, mobile, payment status, transaction IDs, source timestamps, source filenames, local paths, or ignored source fields.
- AD-11: Domain command changes require Vitest domain tests; persistence changes require temp SQLite transaction/reopen/action-log/snapshot tests; Fastify routes require `inject()` tests; UI flow changes require component and Playwright coverage.
- AD-15: Roster updates after Undo must be derived from restored Player ownership, not mutable Team roster state.

### UX Requirements For This Story

- Undo is a secondary live control, visible near routine bidding controls but visually less prominent than safe primary/live actions.
- Show the action that will be undone before execution, or at minimum directly beside the button.
- Empty state copy is exactly `No actions to undo.` unless implementation needs a longer accessible label.
- Use operational copy: `Undo Mark Sold`, `Undid Mark Sold: Aarav.`, `Undo is not available in this phase.` Avoid vague or celebratory messages.
- Keyboard `u` must work only when focus is not inside an editable field and must not bypass server validation.
- Undo must remain disabled during command in-flight states and under `persistenceFailure`.
- Maintain stable layout and readable projected board hierarchy: Current Player and Current Bid remain first read; selected Team/phase progress second; routine controls third.

### Previous Story Intelligence

- Story 2.8 added strict app-state/resume contracts, derived roster projections, and Resume/Start behavior. Undo must preserve resume correctness after app refresh/restart.
- Story 2.8 review patched `/api/state` to fail closed on corrupt persisted state and to re-fetch authoritative state on resume click. Do not introduce a stale client-side undo cache.
- Story 2.8 added `teamRosters` to `BoardStateDto` from `deriveSoldRosterRows`; use that projection to prove Mark Sold undo removes the roster row.
- Story 2.7 established `phase2Pool` as authoritative board state and `phase2PoolCount` as a DTO field. Undo of Mark Unsold must remove the Player from `phase2Pool`, not infer from status alone.
- Story 2.6 established the successful sale spine and action-log/Undo payload correctness. Undo after sale must restore budget, squad, role count, Player ownership, current fields, roster projection, action log, and snapshot.
- Story 2.5 established invalid sale non-mutation. Undo must not mask or rewrite blocked-attempt behavior because blocked attempts do not create undo history.
- Stories 2.3 and 2.4 established selected Team and Current Bid as persisted server-authoritative state. Undo must restore them exactly.
- Story 2.1 established persisted randomized Phase 1 order. Undo must not reshuffle or mutate `phase1Order`.

### Git Intelligence Summary

Recent commits:

- `9bb3024 Story 2.8: Persist and Resume Phase 1 Live State`
- `5a4298f Story 2.7: Mark Player Unsold Into Phase 2 Pool`
- `199c57b Story 2.6: Mark Player Sold and Update Team State`
- `f5b7951 Story 2.5: Block Invalid Sales With Clear Reasons`
- `0ecae5d Story 2.4: Increase Current Bid`

Pattern to follow: narrow vertical slices, strict shared Zod contracts, domain-owned mutation rules, persistence transaction tests, Fastify `inject()` tests, React Testing Library component tests, then event-mode Playwright coverage.

### Latest Technical Information

- Node.js official release information lists v24 as LTS and v26 as Current as of the checked docs; keep the repository's `>=24 <25` engine constraint and do not upgrade runtime for this story. Source: https://nodejs.org/en/about/previous-releases
- Fastify latest docs are `latest (v5.9.x)`, matching the architecture's Fastify 5.9 line. Source: https://fastify.dev/docs/latest/
- Zod 4 is stable, TypeScript-first, and requires `strict` mode; continue strict schemas and `safeParse` at API/UI boundaries. Source: https://zod.dev/
- Playwright release notes include Version 1.61; no special new API is required for this story, but event-mode coverage should stay on the configured runner. Source: https://playwright.dev/docs/release-notes

### Dev Gate

Required before marking implementation complete:

- `npm run typecheck`
- `npm run test`
- `npm run test:e2e:event`

The Dev Gate must include evidence that Undo after sale restores Player ownership, Team budget/count/role counts, roster projection, Current Player/bid/selection, action log, snapshot, and resume state. It must also include Undo after Mark Unsold restoring the Current Player and removing the Player from the Phase 2 pool.

### Review/Test Gate

Second-agent review must check:

- Undo semantics live in `packages/domain`, not UI/server patch code.
- One and only one undo-history entry is consumed per Undo command.
- Reveal/select/bid/sold/unsold restore exactly the previous authoritative state slices.
- Mark Sold undo restores Team budget, squad count, role count, Player sale fields, roster projection, current fields, action log, snapshot, and resume.
- Mark Unsold undo removes the Player from `phase2Pool` and preserves Team state.
- Undo route rejects empty history, duplicate command ids, persistence failure, and unsupported phase/scope.
- Undo rows are not themselves undoable.
- Reset and Close remain excluded and are not introduced in this story.
- No private setup/source fields leak through DTOs, UI, logs, or snapshots.

### Open Questions

- None blocking. The implementation may choose the exact shape of the last-undo summary DTO as long as it is strict, allowlisted, schema-validated, and generated server-side from authoritative `undoHistory`.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test -- packages/shared/src/auction-state-contracts.test.ts` failed before shared Undo schemas/DTO existed, then passed after implementation.
- `npm run test -- packages/domain/src/undo.test.ts` failed before `packages/domain/src/undo.ts` existed, then passed after implementation and corrected one-entry-pop assertions.
- `npm run test -- apps/web/src/main.test.tsx` exposed jsdom keyboard timing for Undo; fixed test synchronization and document-level shortcut listener.
- Dev Gate passed: `npm run typecheck`, `npm run test`, `npm run test:e2e:event`.

### Completion Notes List

- Added strict shared Undo request/response schemas and server-derived `lastUndoAction` board DTO summary with privacy rejection tests.
- Implemented domain-owned Phase 1 `undoLastAction` for reveal, select team, increase bid, mark sold, and mark unsold, consuming exactly one undo-history entry without mutating input state.
- Added atomic persistence for Undo with non-undoable action-log rows, compact before/after audit payloads, duplicate id handling, persistence-failure blocking, snapshot writes, and reopen coverage.
- Added `POST /api/auction/undo`, board DTO summary generation, route conflicts, duplicate handling, and full restoration tests for sold and unsold undo.
- Added Undo UI, disabled/empty state, server-authoritative summary display, success/error status areas, `u` keyboard shortcut, and event-mode coverage proving sale and unsold undo restore authoritative state across refresh/resume.

### File List

- `packages/shared/src/index.ts`
- `packages/shared/src/auction-state-contracts.test.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/undo.ts`
- `packages/domain/src/undo.test.ts`
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
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-9-undo-phase-1-live-actions.md`

### Change Log

- 2026-07-08: Implemented Story 2.9 Phase 1 Undo across shared contracts, domain, persistence, API, UI, and event-mode tests.
- 2026-07-08: Code review patches — cross-command in-flight guards, domain corruption guards, stale undo 409 mapping, expanded persistence/API/UI tests.

### Review Findings

- [x] [Review][Patch] Keyboard `u` and Undo handler ignored cross-command in-flight disable [`apps/web/src/main.tsx`]
- [x] [Review][Patch] Live commands did not block while Undo was in flight [`apps/web/src/main.tsx`]
- [x] [Review][Patch] Domain undo lacked guards for missing player or winning team [`packages/domain/src/undo.ts`]
- [x] [Review][Patch] Stale undo commit errors returned HTTP 500 instead of 409 [`apps/server/src/app.ts`]
- [x] [Review][Patch] `getUndoActionSummary` lacked a default branch [`apps/server/src/app.ts`]
- [x] [Review][Patch] Mark Unsold API undo test omitted action-log and snapshot assertions [`apps/server/src/app.test.ts`]
- [x] [Review][Patch] Persistence tests omitted reveal undo and unsold reopen coverage [`packages/persistence/src/auction-repository.test.ts`]
- [x] [Review][Patch] Added Increase Bid undo API route test [`apps/server/src/app.test.ts`]
- [x] [Review][Patch] Added Undo disabled-during-loading component test [`apps/web/src/main.test.tsx`]
- [x] [Review][Defer] Concurrent undo requests can race like other live commands [`apps/server/src/app.ts`] — deferred, pre-existing single-writer pattern
- [x] [Review][Defer] E2E undo flow does not assert action log or snapshot files [`apps/web/e2e/event-mode.spec.ts`] — deferred, covered by API/repository tests
