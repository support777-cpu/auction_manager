---
baseline_commit: 5a4298f8c9f6f9e84d45b1ac622fd9b7fcd8dd43
---

# Story 2.8: Persist and Resume Phase 1 Live State

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want Phase 1 live auction state to survive app refresh or restart,
so that the event can recover without returning to Excel or restarting the auction.

## Acceptance Criteria

1. Given any Phase 1 state-changing command succeeds, when persistence completes, then local state stores Auction Parameters, Phase 1 order, current phase/category, Current Player if any, Current Bid, selected Team, Player statuses, winning Team assignments, Sold Prices, Team budgets, Squad Sizes, Role Counts, Undo History, action log, and latest snapshot, and current Team rosters can be reconstructed from authoritative Player assignment state.
2. Given the app is closed or browser refreshes during Phase 1, when the operator reopens Auction Manager on the same PC, then the Resume/Start surface shows saved phase, last saved action, and a resume path, and resume restores the latest authoritative Phase 1 state.
3. Given Phase 1 order was generated before restart, when the auction is resumed, then Player order is not reshuffled, and already sold or unsold Players are not returned to the pending pool.
4. Given a Current Player was revealed before restart, when the auction is resumed, then the board restores the same Current Player, Current Bid, selected Team if any, and valid next actions, and no duplicate reveal or outcome action is inferred by resume.
5. Given sold Players existed before restart, when the auction is resumed and roster data is inspected, then each sold Player is reconstructable under the correct Team with Role, acquisition type, and price when applicable.
6. Given a local write failure occurs after a mutating command attempt, when the UI receives the failure state, then further state-changing actions are blocked until retry or a safe recovery path is clear, and the operator sees calm, specific recovery copy.
7. Given a developer finishes this story, when they run the story's Dev Gate, then persistence transaction tests, resume reconstruction tests, roster reconstruction tests, snapshot tests, write-failure tests, Resume/Start UI tests, and typecheck pass, and an E2E or acceptance test proves refresh/reopen resumes Phase 1 state and Team rosters without reshuffle or data loss.
8. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks persisted fields, action-log/snapshot consistency, write-failure behavior, unit/integration tests, and the Phase 1 resume E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Implementation Boundary

- This story hardens Phase 1 persistence/resume across the existing commands: `StartAuction`, `RevealNextPlayer`, `SelectTeam`, `IncreaseBid`, `MarkSold`, and `MarkUnsold`.
- Do NOT implement Undo execution; that is Story 2.9. Preserve and validate `undoHistory` and action-log payloads so Story 2.9 can consume them.
- Do NOT implement the Board/Rosters switch, Team detail drawer, all-Team roster screen, Phase 2 transition, Reset, or Close. Story 2.8 may add/strengthen roster projection data and tests needed to prove resumed roster reconstruction; the navigable roster UI belongs to Story 2.10.
- Do NOT create client-side recovery truth, localStorage auction state, or a browser-only resume cache. Resume must come from `GET /api/state` backed by SQLite current state.
- Do NOT reshuffle Phase 1 order during resume. Legacy migration may derive a missing Phase 1 order only for pre-2.1 state; normal Phase 1 resume must preserve persisted `phase1Order`.

## Tasks / Subtasks

- [x] Extend shared resume/roster contracts without leaking setup/private fields. (AC: 1, 2, 5, 7, 8)
  - [x] In `packages/shared/src/index.ts`, add a strict resume metadata schema such as `resumeSummarySchema` with `phase`, `lastSavedAction`, `lastSavedAt`, `pendingPlayerCount`, `currentPlayerName`, and `persistenceFailure` or equivalent compact fields. Keep it derived/allowlisted; do not expose raw `action_log` rows.
  - [x] Extend `appStateResponseSchema` so `GET /api/state` can return `{ mode: "auction", state, resume }` for active auctions and `{ mode: "setup", state: null, resume: null }` for no auction. Preserve strict parsing.
  - [x] Add team roster projection DTOs if they are not already sufficient: `TeamRosterDto` with Team id/name/captain/logo, budget, squad count, role counts, and `roster: SoldRosterRow[]`. Reuse `deriveSoldRosterRows`; do not make rosters mutable truth.
  - [x] Extend contract tests in `packages/shared/src/auction-state-contracts.test.ts` for resume summary parsing, roster projection privacy rejection, and sold roster reconstruction after multiple sold Players.

- [x] Add repository/API support for resume metadata. (AC: 1, 2, 3, 4, 6, 7, 8)
  - [x] In `packages/persistence/src/index.ts`, add a read-only method such as `getLatestActionSummary()` or `loadResumeMetadata()` that returns the latest action-log command, summary, timestamp, and `clientCommandId` for the current auction. Keep `listActionLog()` for tests; do not expose full logs through the HTTP DTO.
  - [x] Keep all accepted live commits as one transaction followed by post-commit `latest.json` write. The existing `commit*` methods already update `auction_state.state_json`, `phase`, `updated_at`, `action_log`, and snapshot; this story should add regression tests across the combined Phase 1 sequence, not rewrite the persistence model.
  - [x] In `apps/server/src/app.ts`, update `/api/state` to include resume metadata and roster projections derived from `loadCurrentState()` plus latest action summary.
  - [x] Validate the `/api/state` response with `appStateResponseSchema.safeParse` before sending; return a 500 without stack traces if resume/roster DTO construction fails.
  - [x] Preserve current persistence failure behavior: if `persistenceFailure` is set, `/api/state` still returns the latest loaded state plus failure metadata, while mutating routes continue to reject with `409`.
  - [x] Add server tests for `/api/state` after start, reveal, select-team, increase-bid, mark-sold, and mark-unsold, asserting resume metadata, stable Phase 1 order, no duplicate action inference, and no private fields.

- [x] Build the Resume/Start surface in the existing React app. (AC: 2, 4, 6, 7)
  - [x] In `apps/web/src/main.tsx`, distinguish three startup states: loading/error, no active auction setup start, and saved auction resume. Do not jump straight to the board without showing a visible saved-state resume path.
  - [x] When `/api/state` returns an active auction, render a Resume/Start panel that shows saved phase, last saved action, last saved timestamp, current/pending status, and a primary resume control. Suggested stable test ids: `resume-start-surface`, `resume-phase`, `resume-last-action`, `resume-last-saved-at`, `resume-current-player`, `resume-auction`.
  - [x] Activating Resume should set the existing `boardState` from the authoritative DTO already returned by `/api/state`; it must not call a mutating route, generate a `clientCommandId`, reveal a Player, or infer an outcome.
  - [x] Keep the existing no-state setup panel (`setup-empty-state`, `setup-start`) for `{ mode: "setup" }`.
  - [x] If `persistenceFailure` is present on the resumed state, show calm recovery copy on the Resume/Start surface and on the board; all state-changing controls must remain disabled through the existing helpers.
  - [x] Add component tests in `apps/web/src/main.test.tsx` for no-state start, saved-state resume, resumed Current Player/current bid/selected Team, resumed no-current-player state after sale/unsold, resume with persistence failure, and no accidental command POST during resume.

- [x] Add or strengthen roster reconstruction from resumed state. (AC: 1, 5, 7, 8)
  - [x] Use `deriveSoldRosterRows` from `packages/shared/src/index.ts` as the source for Phase 1 sold roster rows. Do not filter by Team tile display text alone.
  - [x] If adding roster projection to `BoardStateDto`, build it in `toBoardStateDto()` from `state.players` and `state.teams`; if adding it only to resume metadata, keep it explicitly typed and schema-validated.
  - [x] Tests must prove sold Players resume under the correct Team with `role`, `acquisitionType: "Sold"`, and `soldPrice`, and unsold Players do not appear in any roster projection.
  - [x] Keep Story 2.10 UI scope separate: no Board/Rosters switch or roster screen unless required only as a minimal hidden/testable projection for AC 5.

- [x] Expand persistence reconstruction tests across full Phase 1 command state. (AC: 1, 3, 4, 6, 7, 8)
  - [x] In `packages/persistence/src/auction-repository.test.ts`, add an end-to-end repository sequence: start -> reveal -> select Team -> increase bid -> mark sold -> reveal next -> select/clear/change Team -> increase bid -> mark unsold -> reopen repository.
  - [x] Assert after reopen: same `phase1Order`, same current phase/category progress, sold Player ownership/price, unsold Player status and `phase2Pool`, current player/bid/selectedTeam if one was current at close, unchanged Teams for unsold outcomes, and preserved `undoHistory`.
  - [x] Assert action-log order and payload coverage for every accepted command in the sequence; every live command after Start Auction should be undoable until Story 2.9 consumes it.
  - [x] Assert `latest.json` matches committed state after each command or at least after the final command, including `phase1Order`, `phase2Pool`, Players, Teams, current fields, `undoHistory`, and `persistenceFailure`.
  - [x] Add a corrupted or invalid `state_json` test if not already present: load failure should fail closed rather than silently starting a new auction.
  - [x] Keep existing pre-2.1 Phase 1 order migration and pre-2.7 `phase2Pool` default tests passing.

- [x] Expand API and event-mode resume coverage. (AC: 2, 3, 4, 5, 6, 7)
  - [x] In `apps/server/src/app.test.ts`, assert `/api/state` response after restart-like repository reopen includes resume metadata and board-ready state for sold, unsold, selected-team, raised-bid, and current-player cases.
  - [x] In `apps/web/e2e/event-mode.spec.ts`, add a dedicated refresh/reopen scenario: complete setup, start auction, reveal, select Team, increase bid, sell one Player, reveal another Player, select/raise bid, refresh/reopen, use the Resume surface, and assert the same current Player, current bid, selected Team, pending counts, sold Team state, and roster projection.
  - [x] Continue the E2E by marking the second Player unsold, refresh/reopen again, resume, and assert `phase2PoolCount`, no reshuffle, no returned pending sold/unsold Players, and no duplicate action-log effect.
  - [x] Add or preserve API privacy checks: no email, mobile, payment status, transaction ID, source timestamp, ignored source fields, source filenames, or raw local filesystem paths in `/api/state`, snapshots intended for board DTO assertions, route responses, or UI.

- [x] Preserve live-command regressions and UX constraints. (AC: 3, 4, 6, 7, 8)
  - [x] Reveal Next, Select Team, Increase Bid, Mark Sold, and Mark Unsold behavior from Stories 2.2-2.7 must remain unchanged after resume work.
  - [x] Resume must preserve valid next actions: if a Current Player exists, Reveal Next remains blocked until outcome; if no Current Player and pending Players remain, Reveal Next is enabled; if persistence failure exists, all mutating controls stay disabled.
  - [x] Resume/start copy must be operational and calm. Use text such as `Saved auction found`, `Last saved: Mark Sold`, `Resume Initial Auction`, and `Local recovery snapshot could not be written. Resolve persistence before the next command.` Avoid celebratory or vague copy.
  - [x] Keep live board dimensions stable across 1440x900, 1366x768, 1920x1080, and 390x844. Add CSS only as needed for the Resume/Start panel; do not redesign the live board.

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Epic 2 `in-progress`, Stories 2.1-2.7 `done`, and Story 2.8 `backlog` at story creation time. This story creation updates 2.8 to `ready-for-dev`.
- Current `HEAD` at story creation is `5a4298f` (`Story 2.7: Mark Player Unsold Into Phase 2 Pool`).
- No `project-context.md` exists for the persistent-facts glob.
- Repo uses npm workspaces. Run scripts from the root.

### Files To UPDATE

- `packages/shared/src/index.ts` - app-state/resume schemas, optional roster projection DTOs, contract exports.
- `packages/shared/src/auction-state-contracts.test.ts` - resume summary, app-state, roster projection, privacy tests.
- `packages/persistence/src/index.ts` - read-only latest action/resume metadata method; avoid changing transaction semantics unnecessarily.
- `packages/persistence/src/auction-repository.test.ts` - full Phase 1 reopen/reconstruction/action-log/snapshot/write-failure tests.
- `apps/server/src/app.ts` - `/api/state` response metadata and roster/resume DTO construction; schema-validate response before sending.
- `apps/server/src/app.test.ts` - state/resume API tests.
- `apps/web/src/main.tsx` - Resume/Start surface and resume activation using authoritative `/api/state` payload.
- `apps/web/src/main.test.tsx` - component tests for resume/no-state/error/failure cases.
- `apps/web/src/styles.css` - minimal styles for Resume/Start panel.
- `apps/web/e2e/event-mode.spec.ts` - refresh/reopen/resume event-mode coverage.

Do not hand-edit `dist/` outputs.

### Current Behavior Of Key UPDATE Files

- `apps/server/src/app.ts`: `/api/state` currently returns only `{ mode: "setup", state: null }` or `{ mode: "auction", state: toBoardStateDto(state) }` from `auctionRepository.loadCurrentState()`; it does not include last action metadata. [Source: apps/server/src/app.ts:176]
- `toBoardStateDto()` already allowlists board data, includes `phase2PoolCount`, `phase1Progress`, `canUndo`, and `persistenceFailure`, but it does not include team roster projection rows. [Source: apps/server/src/app.ts:1523]
- `packages/persistence/src/index.ts` already writes each accepted command to `auction_state.state_json`, appends `action_log`, and writes `latest.json` after commit; snapshot write failure calls `markPersistenceFailure` and later mutations are rejected. [Source: packages/persistence/src/index.ts:650]
- `loadCurrentState()` parses persisted `state_json`, migrates missing legacy Phase 1 order if needed, writes best-effort migrated snapshot, and returns `persistenceFailure` from the DB row. [Source: packages/persistence/src/index.ts:757]
- `apps/web/src/main.tsx` currently loads `/api/state` on mount and immediately sets `boardState` when `mode === "auction"`; there is no distinct saved-state Resume/Start surface. [Source: apps/web/src/main.tsx:284]
- The no-auction setup surface says `No auction is loaded` and shows `Start setup`; preserve that for the no-state path. [Source: apps/web/src/main.tsx:1340]
- The auction board already renders persistence failure copy and disables controls through helper predicates that check `persistenceFailure === null`. [Source: apps/web/src/main.tsx:1928]
- `boardStateDtoSchema` is strict and currently exposes board-safe Players, Teams, current bid/selection, `phase2PoolCount`, Phase 1 progress, `canUndo`, and persistence failure. [Source: packages/shared/src/index.ts:765]
- `deriveSoldRosterRows()` already derives sold roster rows from Player ownership fields (`winningTeamId`, `acquisitionType === "Auction"`, `soldPrice !== null`). Reuse or extend this; do not create roster truth on Team objects. [Source: packages/shared/src/index.ts:943]

### Persistence Ownership

This story owns Phase 1 resume completeness and metadata, not the base persistence architecture.

- `auction_state.state_json`: must remain the full authoritative `AuctionState`, including parameters, Players, Teams, `phase1Order`, `phase2Pool`, current fields, `undoHistory`, timestamps, and `persistenceFailure`.
- `auction_state.phase`: must match the state's phase, normally `InitialAuction` for this story.
- `auction_state.updated_at`: the timestamp of the latest accepted command.
- `current_auction`: identifies the resumable auction. Do not add multi-auction selection in this story.
- `action_log`: source for last-action resume metadata. Return compact resume metadata, not raw log rows.
- `snapshots/latest.json`: must match committed authoritative state after successful snapshot writes; failure marks `persistenceFailure` and blocks further mutating commands.
- Schema-version behavior: no SQLite migration is expected unless the implementation adds new tables or columns. App-state/roster/resume DTO additions are TypeScript/Zod contract changes.

### Architecture Guardrails

- AD-2: `packages/domain` remains the only module deciding auction state transitions and command outcomes. Resume is a read/reconstruct operation, not a domain mutation.
- AD-3: React must reconcile from server-authoritative state only. No optimistic resume and no browser-local auction truth.
- AD-4: `GET /api/state` is the read path for resume; mutating routes still require `clientCommandId`.
- AD-5: SQLite current-state tables plus `action_log` remain the durable authority; do not split state truth across snapshot-only files or UI storage.
- AD-6: Preserve action-log and `undoHistory` payloads for Story 2.9; resume must not consume or mutate undo state.
- AD-8: Board, roster, and live API DTOs are allowlisted projections. Private registration/source fields must not appear in state responses, logs, snapshots intended for UI projection checks, or UI.
- AD-11: Persistence changes need temp SQLite transaction/reopen/action-log/snapshot tests; Fastify route changes need `inject()` schema/conflict/privacy tests; UI flow changes need component and Playwright event-mode coverage.
- AD-15: Team rosters are derived projections from Player ownership. `CloseAuction` and full roster navigation are later-story concerns; do not materialize separate roster truth here.

### UX Requirements For This Story

- Build a Resume/Start surface, not a marketing page. It should make the first visible decision clear: no saved auction -> setup; saved auction -> resume.
- Resume copy should include saved phase, last saved action, timestamp, and current status in operational language.
- Resume is a safe read action. It must not create a command id or send a mutation.
- Persistence failure copy must be calm and specific, and controls must stay disabled until recovery exists in a later story.
- Use stable test ids for resume controls and status text. Keep controls at least 44 CSS px and keyboard reachable.
- Keep the live board's existing hierarchy: Current Player/current bid first, selected Team/phase progress second, routine controls third.

### Previous Story Intelligence

- Story 2.7 completed Mark Unsold and explicitly left resume/restart UX to Story 2.8. It already added `phase2Pool` with backward-compatible parsing and refresh coverage for the unsold pool.
- Story 2.7 established that `phase2PoolCount` is authoritative board state and that `Unsold` counts as completed Phase 1 progress; do not infer pool membership from status alone.
- Story 2.6 established the Mark Sold spine: domain mutation -> persistence transaction/action log/snapshot -> route response -> UI authoritative reconcile. Resume tests must cover this sold state and derived roster rows.
- Story 2.5 established invalid sale non-mutation discipline. Resume work must not hide or overwrite a blocked Current Player state.
- Stories 2.3 and 2.4 established selected Team and Current Bid persistence. Resume must restore both exactly, including cleared selection.
- Story 2.1 established persisted randomized Phase 1 order. Resume must never reshuffle that order.

### Git Intelligence Summary

Recent commits:

- `5a4298f Story 2.7: Mark Player Unsold Into Phase 2 Pool`
- `199c57b Story 2.6: Mark Player Sold and Update Team State`
- `f5b7951 Story 2.5: Block Invalid Sales With Clear Reasons`
- `0ecae5d Story 2.4: Increase Current Bid`
- `5c960b2 Story 2.3: Select Bidding Team From Team Tiles`

Pattern to follow: narrow vertical slices, strict shared Zod contracts, domain-owned mutation rules, persistence transaction tests, Fastify `inject()` tests, React Testing Library component tests, then event-mode Playwright coverage.

### Latest Technical Information

- Node.js official releases list v24 as LTS and v26 as Current as of the checked docs; keep the architecture's Node 24 LTS event-engine constraint for this story rather than upgrading runtime. Source: https://nodejs.org/en/about/previous-releases
- Fastify official latest docs are v5.9.x, matching the architecture's Fastify 5.9 line. Source: https://fastify.dev/docs/latest/
- Zod 4 is stable and requires TypeScript strict mode; continue using strict schemas and `safeParse` at API/UI boundaries. Source: https://zod.dev/
- Playwright official release notes are at 1.61; no new feature is required for this story, but event-mode coverage should remain on the configured project runner. Source: https://playwright.dev/docs/release-notes

### Dev Gate

Required before marking implementation complete:

- `npm run typecheck`
- `npm run test`
- `npm run test:e2e:event`

The Dev Gate must include evidence that refresh/reopen resumes Phase 1 after sold and unsold outcomes, with stable order, current state, derived roster rows, and persistence failure blocking.

### Review/Test Gate

Second-agent review must check:

- `/api/state` response contract and privacy.
- Phase 1 order is never reshuffled on resume.
- Current Player/current bid/selected Team resume exactly.
- Sold Players reconstruct into roster projections; unsold Players do not.
- Action-log last-action metadata is compact and accurate.
- Snapshot write failure blocks mutations and surfaces clear UI copy.
- No Story 2.9/2.10/3.1 scope was accidentally implemented.

### Open Questions

- None blocking. The implementation can choose whether roster projection lives inside `BoardStateDto` or a separate resume/app-state DTO, as long as it is schema-validated, allowlisted, and derived from Player ownership.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-07T23:53:32+0530 - Red-phase shared contract test failed for missing `resumeSummarySchema` and `teamRosterDtoSchema`.
- 2026-07-07T23:58:08+0530 - Targeted shared/persistence/server tests passed: 77 tests.
- 2026-07-08T00:02:59+0530 - Web component tests passed: 12 tests.
- 2026-07-08T00:04:53+0530 - Persistence reconstruction tests passed: 30 tests.
- 2026-07-08T00:05:37+0530 - Server route tests passed: 23 tests.
- 2026-07-08T00:07:40+0530 - Full Vitest suite passed: 32 files, 248 tests.
- 2026-07-08T00:07:40+0530 - Typecheck passed with `npm run typecheck`.
- 2026-07-08T00:07:50+0530 - Event-mode Playwright gate passed: 8 tests.

### Completion Notes List

- Added strict shared resume summary, app-state response, team roster DTO, and board roster projection contracts with privacy rejection tests.
- Added repository `getLatestActionSummary()` and `/api/state` resume metadata plus schema validation before sending responses.
- Added derived roster projections from authoritative Player ownership using `deriveSoldRosterRows`; no mutable Team roster truth was introduced.
- Added Resume/Start surface with loading/error/setup/saved-auction startup states, explicit resume control, and persistence-failure recovery copy.
- Expanded persistence, API, React component, and event-mode refresh/reopen coverage for sold, unsold, current-player, selected-team, bid, stable order, roster projection, and privacy behavior.

### File List

- apps/server/src/app.ts
- apps/server/src/app.test.ts
- apps/web/e2e/event-mode.spec.ts
- apps/web/src/auction-board-helpers.test.ts
- apps/web/src/main.test.tsx
- apps/web/src/main.tsx
- apps/web/src/styles.css
- packages/persistence/src/auction-repository.test.ts
- packages/persistence/src/index.ts
- packages/shared/src/auction-state-contracts.test.ts
- packages/shared/src/index.ts
- _bmad-output/implementation-artifacts/2-8-persist-and-resume-phase-1-live-state.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-07-08 - Implemented Story 2.8 Phase 1 persistence/resume metadata, roster projection, Resume/Start UI, and full Dev Gate coverage.
- 2026-07-08 - Code review: patched load/resume hardening, test gaps, and UX polish; story marked done.

### Review Findings

- [x] [Review][Patch] Fail closed on corrupt `state_json` with `PersistenceStateLoadError` [`packages/persistence/src/index.ts:889`]
- [x] [Review][Patch] Return `state_response_invalid` when `loadCurrentState()` throws on `/api/state` [`apps/server/src/app.ts:179`]
- [x] [Review][Patch] Re-fetch authoritative `/api/state` on resume click instead of stale cached DTO [`apps/web/src/main.tsx:1355`]
- [x] [Review][Patch] Use dynamic phase label on resume button [`apps/web/src/main.tsx:1979`]
- [x] [Review][Patch] Add mobile layout for resume summary grid [`apps/web/src/styles.css:1158`]
- [x] [Review][Patch] Add corrupted `state_json` fail-closed persistence test [`packages/persistence/src/auction-repository.test.ts:1641`]
- [x] [Review][Patch] Assert action-log payloads in full Phase 1 reopen sequence test [`packages/persistence/src/auction-repository.test.ts:1618`]
- [x] [Review][Patch] Add API tests for persistence failure resume, corrupt load, and server restart [`apps/server/src/app.test.ts:135`]
- [x] [Review][Patch] Expand resume component tests for timestamp, bid/team, board failure copy, and load error [`apps/web/src/main.test.tsx:69`]
- [x] [Review][Defer] `state` vs `resume` metadata torn read across separate repository reads [`apps/server/src/app.ts:203`] — deferred, matches existing read-path pattern until snapshot-isolated load lands
- [x] [Review][Defer] Legacy Phase 1 migration can write during `loadCurrentState` on GET [`packages/persistence/src/index.ts:908`] — deferred, documented pre-2.1 migration behavior from Story 2.1
- [x] [Review][Defer] No snapshot fallback when SQLite `state_json` is corrupt but `latest.json` is valid [`packages/persistence/src/index.ts:868`] — deferred, recovery UX belongs to a later persistence story
- [x] [Review][Defer] `deriveSoldRosterRows` silently omits or throws on corrupt sold-player rows [`packages/shared/src/index.ts:943`] — deferred, corrupt-row hardening is cross-cutting data-integrity work
- [x] [Review][Defer] No in-app discard path when saved auction state is unrecoverable [`apps/web/src/main.tsx:1351`] — deferred, Reset/Close belong to later stories
- [x] [Review][Defer] E2E coverage for persistence-failure resume blocking [`apps/web/e2e/event-mode.spec.ts`] — deferred, component and API tests cover the operator path for this story
