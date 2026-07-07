---
baseline_commit: 4ffbc6d16f5f49688dc3831e60a106769b3efa78
created: 2026-07-07T16:54:24+0530
---

# Story 2.1: Create Persisted Phase 1 Player Order

Status: ready-for-dev

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want the app to prepare the Phase 1 reveal order automatically,
so that Players are revealed in the required role/gender sequence without spreadsheet work.

## Acceptance Criteria

1. Given the auction has been started from valid setup data, when Initial Auction phase is initialized, then the system groups Pending Players into the configured Phase 1 category order: Ace Men, Ace Women, Women All Rounders, Men Bowlers, Men Batsmen, Men All Rounders, and every Player belongs to exactly one Phase 1 category.
2. Given Players exist within a Phase 1 category, when the Phase 1 order is generated, then the system randomizes Player order within that category, and every Player appears exactly once in the overall Phase 1 order.
3. Given the Phase 1 order has been generated, when the app persists auction state, then the full Phase 1 order is stored locally with the auction state, and app restart or resume does not reshuffle the order.
4. Given the UI requests auction state, when the server returns the board-ready DTO, then the UI can display the active phase and current category/progress without receiving private registration fields.
5. Given a developer finishes this story, when they run the story's Dev Gate, then domain tests for category grouping, one-time inclusion, randomization boundaries, and unmapped-player rejection pass, and persistence tests prove the generated order survives reload without reshuffle.
6. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks that ordering logic lives in `packages/domain`, runs or adds unit and persistence tests, verifies privacy-safe DTO shape, raises findings, and sends blocking issues back for iteration.

## Tasks / Subtasks

- [ ] Add Phase 1 order contracts to shared state and board DTOs. (AC: 1, 3, 4)
  - [ ] Extend `packages/shared/src/index.ts` with strict Zod schemas/types for persisted Phase 1 order state, using existing `phase1CategorySchema`, `phase1CategoryValues`, and opaque Player ids.
  - [ ] Store the full persisted order in authoritative `AuctionState`, grouped by category and/or as an ordered Player id sequence. The structure must be enough for Story 2.2 to reveal the next Player without recalculating or reshuffling.
  - [ ] Add board DTO progress fields that expose only category/progress metadata needed by the UI, such as current category, category counts, total ordered count, and revealed/pending counts. Do not expose private source fields. Do not expose source row numbers or source filenames.
  - [ ] Preserve existing Start Auction response parsing by updating `startAuctionResponseSchema`, `appStateResponseSchema`, and test fixtures together.

- [ ] Implement domain-owned Phase 1 order generation. (AC: 1, 2, 5)
  - [ ] Add a domain function, for example `createPhase1Order` in `packages/domain/src/phase1-order.ts`, and re-export it from `packages/domain/src/index.ts`.
  - [ ] Call the domain generator from `startAuctionFromSetup` after Players are normalized and ids are assigned, so a newly started Initial Auction already has its persisted Phase 1 order.
  - [ ] Use the locked `AuctionParameters.phase1CategoryOrder` as the category sequence. Do not hard-code the default order inside the generator except through shared/default parameters.
  - [ ] Randomize within each category only. Do not randomize category order, and do not move Players across categories.
  - [ ] Inject deterministic randomness or a shuffle function for tests. Do not call `Math.random()` directly inside untestable domain logic.
  - [ ] Validate that every normalized Player maps to exactly one configured Phase 1 category and that the generated order contains each Player id exactly once. Return a typed domain error if this invariant is violated.
  - [ ] Keep this story scoped to order creation. Do not implement Reveal Next mutation, Current Player selection, Current Bid initialization, Mark Sold, Mark Unsold, or Undo behavior here.

- [ ] Persist the generated order without reshuffle on resume. (AC: 3, 5)
  - [ ] Extend `packages/persistence/src/index.ts` so `commitStartAuction` persists the new Phase 1 order fields as part of the authoritative state and writes them to `data/snapshots/latest.json` only after DB commit.
  - [ ] Update reconstruction/loading tests to open a new repository instance and prove `loadCurrentState()` returns the exact same Phase 1 order after reopen.
  - [ ] Keep `action_log` command `StartAuction` undoable false, but include Phase 1 order metadata in its payload where useful for audit/debugging. Prefer Player ids and category counts over names.
  - [ ] If changing the `auctionStateSchema` would make old Story 1.6 `state_json` fail to parse, add explicit compatibility handling or migration behavior and test it. Do not silently reshuffle existing state on read.
  - [ ] Preserve the existing persistence failure behavior: a snapshot write failure marks `persistenceFailure` and blocks further mutations.

- [ ] Update API projection and initial board shell. (AC: 4)
  - [ ] Update `toBoardStateDto` in `apps/server/src/app.ts` to derive Phase 1 progress from authoritative state. Route handlers must not duplicate category ordering or shuffle rules.
  - [ ] Keep `POST /api/auction/start` as the entry point unless a separate initialization command is truly necessary. Any new mutating route must require `clientCommandId` and use the same content-type/status-code discipline.
  - [ ] Update `GET /api/state` so resume returns the same progress metadata without exposing full private setup fields.
  - [ ] In `apps/web/src/main.tsx`, show Initial Auction order readiness and category/progress on the board using stable selectors such as `phase1-progress` and `phase1-current-category`.
  - [ ] Keep `reveal-next` disabled or clearly unavailable until Story 2.2 implements the command. Do not fake reveal behavior in React.
  - [ ] Preserve existing selectors from Story 1.6: `auction-board`, `phase-indicator`, `current-player-panel`, `current-bid`, `reveal-next`, and setup import selectors.

- [ ] Add story-level acceptance and regression coverage. (AC: 5, 6)
  - [ ] Unit: domain generator follows `parameters.phase1CategoryOrder`, randomizes within categories with deterministic test injection, rejects missing/duplicate category coverage, and includes every Player id exactly once.
  - [ ] Contract: shared schemas accept the new order/progress state and reject private fields or unexpected DTO properties.
  - [ ] Integration: persistence stores and reloads the exact generated order and snapshot. This is TEA `TD-015`.
  - [ ] API: Start Auction response and `GET /api/state` include Phase 1 progress metadata and exclude private source fields.
  - [ ] UI/E2E: valid setup starts auction, board displays Initial Auction plus Phase 1 order readiness/current category/progress, refresh/reopen keeps the same progress state, and private sample values are absent.
  - [ ] Regression: Story 1.1-1.6 tests still pass, including setup import privacy, placeholder non-blocking behavior, parameter locking, Start Auction duplicate command behavior, and snapshot failure handling.
  - [ ] Run the full Dev Gate and record results in the Dev Agent Record before marking tasks complete.

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Epic 2 and Story 2.1 in `backlog` at story creation time; this story updates Epic 2 to `in-progress` and Story 2.1 to `ready-for-dev`.
- Current `HEAD` is `4ffbc6d16f5f49688dc3831e60a106769b3efa78` (`refactor(web): remove verbose helper copy from setup UI`).
- The worktree has unrelated local changes at story creation time: `README.md`, `apps/web/vite.config.ts`, `package.json`, untracked `_bmad-output/test-artifacts/.DS_Store`, and untracked `scripts/`. Do not revert or overwrite those changes unless the user explicitly asks.
- No `project-context.md` file was found for the persistent-facts glob during story creation.

### Existing Files That This Story Will Touch

Read these before editing and update them in place:

- `packages/shared/src/index.ts`: owns runtime enums, Auction Parameters, auction-state schemas, board DTO schemas, Start Auction response schemas, and exported types. Add Phase 1 order/progress contracts here unless splitting adjacent shared files and re-exporting.
- `packages/shared/src/auction-state-contracts.test.ts`: extend DTO and Start Auction response contract coverage.
- `packages/domain/src/start-auction.ts`: currently initializes Players and Teams but intentionally does not create the Phase 1 order. Extend it to call domain order generation.
- `packages/domain/src/start-auction.test.ts`: extend Start Auction expectations to include generated order and locked parameters.
- `packages/domain/src/index.ts`: re-export any new Phase 1 order generator/types.
- `packages/persistence/src/index.ts`: currently stores authoritative state as JSON in `auction_state.state_json`, writes `snapshots/latest.json` after commit, and lists `action_log`. Extend this behavior without breaking rollback/snapshot tests.
- `packages/persistence/src/auction-repository.test.ts`: add reload/no-reshuffle and snapshot assertions for Phase 1 order.
- `apps/server/src/app.ts`: `toBoardStateDto` maps authoritative state to board DTOs. Add progress projection here; do not implement ordering rules here.
- `apps/server/src/app.test.ts`: extend Start Auction and resume tests for progress metadata and privacy.
- `apps/web/src/main.tsx`: current board shell shows Initial Auction, no Current Player, no current bid, disabled Reveal Next, and Team tiles. Add order/progress display without implementing reveal.
- `apps/web/src/styles.css`: extend board styles with stable dimensions and no layout shift.
- `apps/web/e2e/event-mode.spec.ts`: extend the Start Auction E2E to assert Phase 1 progress and resume stability.
- `packages/test-fixtures/src/index.ts`: update fixture types/builders if shared contracts change, but runtime code must not import `@auction-manager/test-fixtures`.

### Current Behavior Of Key UPDATE Files

- `startAuctionFromSetup` creates `AuctionState` with `phase: "InitialAuction"`, all Players `Pending`, initialized Teams, `currentPlayerId: null`, `currentBid: null`, `selectedTeamId: null`, empty `undoHistory`, locked cloned parameters, timestamps, and `persistenceFailure: null`.
- Shared `AuctionPlayer` already includes `gender`, `role`, and `phase1Category`, so Phase 1 grouping can use normalized auction fields and does not need raw CSV fields.
- `phase1CategoryValues` and `AuctionParameters.phase1CategoryOrder` already exist in shared contracts. Reuse them.
- `commitStartAuction` validates `auctionStateSchema`, inserts state and `StartAuction` action log in one SQLite transaction, then writes `snapshots/latest.json` after commit.
- `loadCurrentState` parses persisted JSON through `auctionStateSchema`; schema changes therefore need compatible fixture/test updates and, if needed, migration/backfill handling.
- `toBoardStateDto` currently maps Players and Teams to allowlisted DTO fields and finds `currentPlayer` from `currentPlayerId`.
- `AuctionBoard` currently renders a basic Initial Auction board with disabled `Reveal Next Player`. This is the correct boundary until Story 2.2.

### Phase 1 Order Contract Guidance

Preferred shape, adjust only if a simpler established local pattern emerges:

```ts
interface Phase1OrderCategory {
  category: Phase1Category;
  playerIds: string[];
}

interface Phase1OrderState {
  categories: Phase1OrderCategory[];
  playerIds: string[]; // flattened reveal order, category sequence preserved
  generatedAt: string;
}

interface Phase1ProgressDto {
  currentCategory: Phase1Category | null;
  orderedPlayerCount: number;
  pendingPlayerCount: number;
  categories: Array<{
    category: Phase1Category;
    total: number;
    pending: number;
    completed: number;
  }>;
}
```

Implementation notes:

- `Phase1OrderState.playerIds.length` must equal `state.players.length` immediately after Start Auction.
- The flattened order must be category sequence first, randomized within each category second.
- Empty categories are valid and should remain represented in progress so the UI can explain the configured sequence.
- Do not expose future Player names as "up next" in this story. Full order is persisted server-side for deterministic reveal, not displayed as a public room-facing list.
- Current category at Initial Auction start should be the first configured category with pending Players, or `null` if there are no ordered Players. Setup should normally prevent zero Players, but the DTO should still be defensive.

### Persistence Ownership

This story owns persisted Phase 1 order state introduced into the current durable auction record.

Minimum durable concepts:

- `auction_state.state_json`: add Phase 1 order state and any progress cursor fields needed by future reveal logic.
- `action_log.payload_json`: for `StartAuction`, include enough Phase 1 order metadata for local diagnostics, such as category counts and ordered Player ids. Keep `undoable` false.
- `snapshots/latest.json`: include the same authoritative Phase 1 order fields after commit.

Constraints:

- Do not create a separate roster truth or order truth in React.
- Do not write the snapshot before DB commit.
- Do not regenerate order during `GET /api/state`, `loadCurrentState`, or React render.
- If a materialized table is introduced for order rows, it must be committed in the same transaction as `auction_state` and `action_log`, with a uniqueness constraint preventing duplicate `(auction_id, player_id)` order rows.

### Architecture Guardrails

- AD-2: `packages/domain` is the only module allowed to decide randomized orders. Fastify, persistence, and React adapt results only.
- AD-3: after setup begins, server/domain state is authoritative. React may render progress but may not calculate order.
- AD-4: any mutating command requires `clientCommandId`; avoid adding a new command unless needed.
- AD-5: Phase 1 order persistence must be atomic with current state and action log.
- AD-8: privacy by projection. Board DTOs, logs, snapshots, and UI must exclude email, mobile, payment status, payment transaction id, source timestamp, ignored source fields, source row numbers, and source file paths.
- AD-11: domain command changes need Vitest domain tests; persistence changes need transaction, resume, action-log, and snapshot tests; route changes need Fastify `inject()` tests; UI flow changes need Playwright/event-mode coverage.
- AD-12: this story continues the correctness-first delivery sequence by finishing the domain/persistence ordering substrate before reveal/bidding UI.
- AD-13: use locked Auction Parameters after Start Auction; do not read mutable setup form state to determine order.
- AD-14: this story is Phase 1 order only. Do not implement Phase 2 unsold order, Phase 3 assignment, skip paths, or phase transitions.

### UX Requirements For This Story

- Board display remains an Initial Auction board with no Current Player and no current bid.
- Show order readiness in operational language, for example `Phase 1 order ready` and `Current category: Ace Men`.
- Progress must be text, not color alone. Suggested stable selectors: `phase1-progress`, `phase1-current-category`, `phase1-ordered-count`.
- Keep the live board calm and readable. Do not list all unrevealed Players on the mirrored board.
- Keep `Reveal Next Player` visible as the safe next action but disabled or clearly unavailable until Story 2.2 implements the command.
- Do not use danger styling for normal empty categories or pending counts.
- Maintain visible focus states and 44 CSS px minimum targets for controls already present.

### Previous Story Intelligence

- Story 1.6 added shared auction runtime contracts, domain-owned Start Auction initialization, SQLite repository, `POST /api/auction/start`, `GET /api/state`, setup locking after start, and the first Initial Auction board shell.
- Story 1.6 explicitly deferred Phase 1 order creation to Story 2.1. Do not treat missing order logic as a regression in Story 1.6; extend that path now.
- Story 1.6 review patched duplicate Start Auction handling, data directory creation before SQLite open, recomputing parameter review at Start Auction, snapshot-write failure surfacing, typed persistence errors, scoped action-log reads, and `persistenceFailure` DTO/UI handling. Preserve those fixes.
- Deferred Story 1.6 work includes route-level staged-data checks partially duplicating domain readiness and `persistence_failure` marking outside the commit transaction. Do not expand those issues unless required for this story.
- Recent commits are story-sliced and test-heavy. Maintain the existing pattern: strict shared contracts, focused domain logic, thin Fastify routes, React `safeParse` of server JSON, Vitest coverage, and event-mode Playwright coverage.

### Git Intelligence Summary

- Recent commits:
  - `4ffbc6d refactor(web): remove verbose helper copy from setup UI`
  - `e316f9a Story 1.6: Start Auction With Persisted Initial State`
  - `428ca0f Story 1.5: Configure Auction Parameters`
  - `8681c74 Story 1.4: Import Teams and Logos`
  - `32f035a Story 1.3: Match Player Photos With Placeholders`
- Story 1.6 touched `packages/shared/src/index.ts`, `packages/domain/src/start-auction.ts`, `packages/persistence/src/index.ts`, `apps/server/src/app.ts`, `apps/web/src/main.tsx`, `apps/web/src/styles.css`, and event-mode tests. Story 2.1 should build on those files rather than introduce a parallel flow.
- The current package dependency direction to preserve: `shared` has no workspace dependencies; `domain` depends on `shared`; `persistence` depends on `domain` and `shared`; `imports` depends on `shared`; `server` depends on runtime packages; `web` depends on `shared`.

### Latest Tech Information

Checked on 2026-07-07:

- npm registry latest: Fastify `5.10.0`, better-sqlite3 `12.11.1`, Zod `4.4.3`, Vitest `4.1.10`, Playwright `1.61.1`.
- This repo currently uses npm ranges in `package.json` and an installed lockfile. Do not upgrade dependencies in this story just to chase patch/minor releases. Use the installed API surface unless implementation hits a concrete bug requiring an explicit upgrade and full regression run.
- Fastify latest docs still emphasize schema-based validation and content-type-specific validation; current code additionally enforces JSON content type and validates bodies with Zod. Keep that route discipline for any new mutation.
- Zod 4 remains the runtime schema library. Use strict schemas for external DTOs and `safeParse` at React/server boundaries.
- better-sqlite3 supports transaction wrappers via `database.transaction(...)`; keep DB mutation and action-log writes inside one transaction.
- SQLite official docs state transactions are atomic, consistent, isolated, and durable when used correctly. Persistence tests should verify commit/reopen behavior, not just in-memory state.
- Sources: `https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/`, `https://zod.dev/api`, `https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md`, `https://www.sqlite.org/transactional.html`, npm registry latest endpoints.

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

- `TD-015` P0: Phase 1 order follows category sequence, includes each Player once, and survives restart without reshuffle.
- `TD-029` P0: board DTOs exclude private registration fields and source-only metadata.
- `TD-021` P1: any mutating command requires `clientCommandId`; if no new command is added, Start Auction duplicate behavior must remain covered.
- `TD-035` P0 regression: valid setup still starts the auction and lands on the Initial Auction board.

Review/Test Gate:

- A second agent must inspect that route/UI code does not duplicate Phase 1 ordering or shuffle rules.
- The reviewer must verify category-order correctness, deterministic randomization tests, one-time inclusion, persistence/reload no-reshuffle behavior, snapshot/action-log content, DTO privacy, and UI progress rendering.
- Blocking findings reopen the story for implementation iteration before it can be considered done.

### Project Structure Notes

- Extend existing packages; do not create a new app or package.
- Keep runtime source under `src/`; do not edit `dist/` output by hand.
- Runtime packages must not import `@auction-manager/test-fixtures`.
- Keep all new UI test IDs stable and specific because Stories 2.2-2.10 will build on the Initial Auction board.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 2.1: Create Persisted Phase 1 Player Order`
- `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md#FR-7: Create Phase 1 role-wise player order`
- `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md#FR-20: Persist local auction state`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#AD-2 - Domain Package Owns Auction Truth`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#AD-5 - Atomic SQLite Persistence`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#AD-8 - Privacy By Projection`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#AD-14 - Three-Phase Auction State Machine`
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md#State Patterns`
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md#Components`
- `_bmad-output/test-artifacts/finalized-test-cases.md#Final Case Matrix`
- `_bmad-output/test-artifacts/test-design/auction_manager-handoff.md#Story-Level Integration Guidance`
- `_bmad-output/implementation-artifacts/1-6-start-auction-with-persisted-initial-state.md#Previous Story Intelligence`

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
