---
baseline_commit: 22a61dd069db045326863e6ade23166fd8fb55fa
---

# Story 1.2: Import and Review Player CSV

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want to load the Player CSV and see import issues before the auction starts,
so that source data problems are fixed before the live event.

## Acceptance Criteria

1. Given the setup surface is open, when the operator uploads the Player CSV exported from the registration sheet, then the system parses the required PRD columns and derives each Player's name from `Full Name`, gender from `Gender`, Role from `Skill`, and Phase 1 Category from `Gender` plus `Skill`.
2. Given the CSV contains registration fields that are not needed for auction logic, when import completes, then those fields are classified or ignored according to the import adapter contract, and the normalized Player records used by setup and auction logic exclude email, mobile, payment status, payment transaction ID, source timestamp, and other non-auction registration fields from auction-facing state.
3. Given a Player row cannot be mapped into one configured Phase 1 Category, when import review is shown, then the issue appears as `must_fix`, and Start Auction remains blocked until the source CSV is corrected and reimported.
4. Given the CSV contains required headers and valid Player rows, when import review is shown, then the operator sees a privacy-safe list of imported Players and grouped import issues, and issue groups use `must_fix`, `can_proceed_with_placeholder`, and `ignored_source_field`.
5. Given a developer finishes this story, when they run the story's Dev Gate, then Player CSV parser unit tests, import issue classification tests, schema/typecheck, and setup import UI/component tests pass, and an E2E or acceptance test proves Start Auction is blocked for required Player data errors.
6. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks privacy projection, runs or adds relevant import unit tests, runs the setup import E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Tasks / Subtasks

- [x] Define shared Player import contracts and failing tests first. (AC: 1, 2, 3, 4)
  - [x] Add or update shared types/schemas in `packages/shared/src/index.ts` for canonical `Gender`, `AuctionRole`, `Phase1Category`, `ImportIssueSeverity`, privacy-safe setup Player preview records, grouped import issues, and Player CSV import review responses.
  - [x] Keep runtime package dependencies clean: do not add `@auction-manager/test-fixtures` to any `dependencies`; fixtures are test-only.
  - [x] Add focused tests that prove the contracts do not include private source fields in normalized Player preview records or future auction-facing DTOs.
  - [x] Reuse names already established in fixtures and architecture: `ImportIssue`, `must_fix`, `can_proceed_with_placeholder`, `ignored_source_field`, `Ace`, `Batting`, `Bowling`, `AllRounder`, `Girls`, `Ace Men`, `Ace Women`, `Women All Rounders`, `Men Bowlers`, `Men Batsmen`, `Men All Rounders`.

- [x] Implement the Player CSV import adapter in `packages/imports`. (AC: 1, 2, 3, 4)
  - [x] Add failing parser tests using `_bmad-output/test-artifacts/sample-test-data/players-valid.csv` and `players-invalid.csv` or equivalent fixture builders from `packages/test-fixtures`.
  - [x] Use `csv-parse/sync` for setup-sized CSV parsing; configure it deliberately with object records, empty-line handling, BOM/trim tolerance, and bounded record size.
  - [x] Validate the current PRD registration export headers: `Timestamp`, `Email address`, `Score`, `Place and Pastor Name`, `Full Name`, `Gender`, `Mobile Number`, `Email`, `Skill`, `TShirt Size`, `Jersey Number`, `Meal Preference (only applicable for Registrants Outside of Bangalore)`, `Photo Upload`, `Payment Confirmation`, `Payment Transaction Id`, and `Validated`.
  - [x] Normalize only auction-safe Player fields into setup preview records: Player name, normalized gender, canonical Role, Phase 1 Category, and non-private diagnostic row position if needed.
  - [x] Classify missing `Full Name`, missing/unknown `Gender`, unknown `Skill`, and unmappable `Gender` plus `Skill` combinations as `must_fix`.
  - [x] Classify ignored source columns as `ignored_source_field` without including private cell values in issue messages, logs, snapshots, rendered UI, or normalized records.
  - [x] Keep photo matching out of scope. `Photo Upload` may be retained only as internal import metadata for Story 1.3; it must not appear in the privacy-safe Player list or live-facing records.

- [x] Add the server-side setup import preview boundary. (AC: 1, 2, 3, 4)
  - [x] Update `apps/server/src/app.ts` to expose a setup upload/preview route such as `POST /api/setup/player-csv/preview` that uses the import adapter and returns the shared import review response.
  - [x] If multipart upload is used, register `@fastify/multipart` only for setup upload routes and enforce explicit `fileSize`, `files`, `fields`, and `parts` limits. Return `413` for oversized uploads and `415` for unsupported content type where applicable.
  - [x] Add Fastify `inject()` tests for valid CSV preview, invalid CSV `must_fix` response, privacy-safe response shape, and upload/content error handling.
  - [x] Do not introduce durable SQLite schema, action log, snapshots, Start Auction command execution, or player photo asset storage in this story unless explicitly required by tests; those are later setup/start stories.

- [x] Upgrade the setup UI to support Player CSV review. (AC: 1, 2, 3, 4)
  - [x] Update `apps/web/src/main.tsx` from the empty setup shell into a setup checklist section that includes a Player CSV upload control and privacy-safe import review.
  - [x] Preserve Story 1.1 shell behavior and selectors: `app-shell`, `phase-indicator`, `setup-empty-state`, and `setup-start` should continue to exist unless a test is deliberately migrated with equivalent coverage.
  - [x] Add stable setup selectors: `setup-player-csv`, `player-csv-input`, `player-csv-summary`, `import-issues-table`, `setup-start-auction`, and row/group selectors suitable for issue group assertions.
  - [x] Display imported Players using only privacy-safe fields. Never render email, mobile number, payment status, payment transaction ID, source timestamp, or ignored source field values.
  - [x] Show grouped import issues for `must_fix`, `can_proceed_with_placeholder`, and `ignored_source_field`. It is acceptable for `can_proceed_with_placeholder` to be zero-count until media stories add real placeholder issues.
  - [x] Keep Start Auction disabled in this story and show a specific blocker when Player CSV `must_fix` issues exist. Do not implement auction parameter validation, Team import validation, or actual Start Auction.
  - [x] Preserve setup styling from Story 1.1: light, dense, operational, restrained, field-green primary actions, sky/info notices, danger only for blockers, no live-board dark styling for setup.

- [x] Add story-level acceptance and regression coverage. (AC: 5, 6)
  - [x] Add unit tests for role/category mapping boundaries, required header validation, required value validation, ignored-field classification, and privacy exclusion.
  - [x] Add integration/API tests proving invalid Player data blocks Start Auction readiness and valid Player CSV produces a reviewable Player list without private fields.
  - [x] Add Playwright or equivalent acceptance coverage for uploading a valid Player CSV and uploading an invalid Player CSV. The invalid path must prove `setup-start-auction` stays disabled because of Player CSV `must_fix` issues.
  - [x] Update existing smoke tests only as needed to keep the setup shell openable after the Player CSV UI is added.
  - [x] Run the Dev Gate and record results in the Dev Agent Record before marking tasks complete.

## Dev Notes

### Current Repository State To Preserve

- The repo has uncommitted implementation work from Story 1.1. Do not revert or overwrite those changes.
- Story 1.1 is still `in-progress` in sprint status and its story file contains unresolved review patch items. Treat those as risk context, not as part of this story.
- Current scaffold files include `apps/web`, `apps/server`, `packages/domain`, `packages/persistence`, `packages/imports`, `packages/shared`, and `packages/test-fixtures`.
- `packages/imports/src/index.ts` and `packages/shared/src/index.ts` currently expose only readiness constants. This story is expected to turn them into real contract/adapter entrypoints.
- `packages/test-fixtures/src/index.ts` already defines canonical headers, sample Player CSV rows, invalid rows, private source field names, default auction parameters, role/category fixture types, and CSV helpers. Use those in tests, but do not import test fixtures from runtime code.

### Existing Files That This Story Will Touch

Read these before editing and update them in place:

- `packages/shared/src/index.ts`: currently only exports `sharedPackageReady`. Add shared import review schemas/types here so server, web, and imports use one contract. Preserve package ownership; do not put parser implementation here.
- `packages/imports/src/index.ts`: currently only exports `importsPackageReady`. Add the Player CSV adapter here or split to local files under `packages/imports/src/` with `index.ts` re-exporting public functions.
- `packages/imports/src/dependencies.test.ts`: keep the dependency smoke or move it deliberately; add real Player CSV tests in separate focused files.
- `apps/server/src/app.ts`: currently owns the Fastify app factory, `/api/health`, static serving, and SPA fallback. Add setup preview route without breaking health/static behavior.
- `apps/server/src/app.test.ts`: currently tests health/static serving. Extend with setup import route tests and preserve Fastify instance cleanup.
- `apps/web/src/main.tsx`: currently renders the Story 1.1 setup-ready shell. Extend it to include a Player CSV setup step and review state; do not create a marketing page.
- `apps/web/src/styles.css`: currently defines the light setup shell tokens. Extend styles with stable dimensions for upload/review controls and keep text fitting at 1440x900, 1366x768, 1920x1080, and 390x844.
- `apps/web/e2e/smoke.spec.ts` and/or new `apps/web/e2e/*player-csv*.spec.ts`: add acceptance coverage for import review and Start Auction blocker behavior.
- `playwright.config.ts` / `playwright.event.config.ts`: adjust only if the selected acceptance test path needs the Fastify event-mode server instead of Vite preview.
- `package.json`: update scripts only if needed for a clear story gate. Preserve npm workspaces and the existing build/typecheck/test script shape.

### Architecture Guardrails

- `packages/imports` owns parsing, validation, normalization, source-field classification, and import issue creation for the Player CSV adapter.
- `packages/shared` owns reusable DTO/schema names so route responses and UI props cannot drift.
- `apps/server` adapts local HTTP/multipart input to `packages/imports`; route handlers must not reimplement role/category mapping.
- `apps/web` displays the setup review and Start Auction blocker state; it must not become the source of auction truth.
- `packages/domain` should not own CSV parsing in this story. Domain auction rules begin in later stories.
- `packages/persistence` should not receive partial current-state tables in this story unless the dev agent explicitly scopes and tests a staged import persistence slice. Default expectation: this story returns/imports a preview review result and defers durable Start Auction state to Story 1.6.
- Do not add cloud services, hosted databases, public deployment, accounts/auth, Docker runtime requirements, or alternate package managers.
- Same-origin API remains local-only. Do not enable broad CORS to make setup upload work.
- No private source fields may leak to board/roster/live DTOs, rendered setup Player rows, logs, snapshots, or issue messages. Source column names may appear only for diagnosis; private cell values must not.

### Player CSV Mapping Contract

Minimum mapping behavior required by current PRD, architecture, and fixtures:

| Source input | Normalized output |
| --- | --- |
| `Full Name` non-empty | Player `name` |
| `Gender` `Male` | Gender `Male` |
| `Gender` `Female` | Gender `Female` |
| `Skill` `Ace` + Male | Role `Ace`, Phase 1 Category `Ace Men` |
| `Skill` `Ace` + Female | Role `Ace`, Phase 1 Category `Ace Women` |
| `Skill` `Batting` + Male | Role `Batting`, Phase 1 Category `Men Batsmen` |
| `Skill` `Bowling` + Male | Role `Bowling`, Phase 1 Category `Men Bowlers` |
| `Skill` `All Rounder` / `AllRounder` / `All-rounder` + Male | Role `AllRounder`, Phase 1 Category `Men All Rounders` |
| `Skill` `All Rounder` / `AllRounder` / `All-rounder` + Female | Role `Girls`, Phase 1 Category `Women All Rounders` |
| Missing name, missing gender, unknown gender, unknown skill, or unsupported category combo | `must_fix` import issue |

Implementation notes:

- Keep mapping table-driven and exhaustively tested; do not silently invent categories not in the configured Phase 1 order.
- If the dev agent decides to support additional source aliases, add explicit tests and keep canonical output values unchanged.
- Do not derive stable domain IDs from row numbers or source filenames. A non-private `sourceRowNumber` is acceptable for issue diagnosis only.

### Import Issue Contract

Use these severities exactly:

- `must_fix`: required header/value missing, unknown role/skill, unsupported gender/category mapping, or parse failure that prevents trusted Player import.
- `can_proceed_with_placeholder`: reserved for placeholder-compatible media issues. Story 1.2 should show this group and may leave it empty; Story 1.3 adds real missing-photo issues.
- `ignored_source_field`: source columns accepted for source compatibility but excluded from auction-facing normalized records. Messages must name the column but not private values.

Recommended issue fields:

- `id` or deterministic test-friendly key.
- `severity`.
- `code` such as `missing_required_header`, `missing_required_value`, `unmapped_phase1_category`, `ignored_source_field`.
- `message` in calm setup language.
- `sourceColumn` and optional `sourceRowNumber` for diagnosis.
- Optional `playerName` only after a name is available and safe to show.

### UX Requirements For This Story

- Keep setup light, dense, and checklist-like. Do not use live-board dark styling for Player CSV import review.
- The operator must be able to see: CSV uploaded/not uploaded, imported Player count, `must_fix` count, ignored source field count, privacy-safe Player rows, and whether Start Auction remains blocked.
- Required-data errors should be close to the import review table, not only as a top-level alert.
- Microcopy should be specific: "Blocked: 3 Player CSV issues must be fixed in the source CSV and reimported." Avoid vague "Invalid CSV."
- Keep manual editing out of scope. Data fixes happen in the source CSV followed by reimport.
- Use visible focus, real file inputs/buttons, accessible names, text issue reasons, and 44px minimum interactive targets where practical.
- Preserve stable layout. Issue counts and imported rows must not resize the page in a way that hides the Start Auction blocker.

### File Structure Requirements

Expected structure remains:

```text
auction_manager/
  apps/
    web/
    server/
  packages/
    domain/
    persistence/
    imports/
    shared/
    test-fixtures/
```

Expected new or updated test files may include:

```text
packages/imports/src/player-csv.test.ts
packages/shared/src/import-contracts.test.ts
apps/server/src/player-csv-preview.test.ts
apps/web/e2e/player-csv-import.spec.ts
```

Do not create new top-level app frameworks, nested monorepos, runtime Docker configs, or a second package manager.

### Project Structure Notes

- The required workspace package structure already exists. This story should extend existing packages instead of creating a new import app or utility workspace.
- Keep source files under `src/` and compiled output under `dist/`; do not edit generated `dist` files manually.
- Keep shared contracts in `packages/shared`, adapter implementation in `packages/imports`, HTTP adaptation in `apps/server`, and setup display logic in `apps/web`.
- The current `apps/web` setup shell is a single `main.tsx` entry. It may remain single-file for this slice if still readable, but move helper components into local files if the import review UI becomes hard to scan.

### Library And Framework Requirements

Use the versions already resolved by the repo lockfile and architecture unless a concrete compatibility bug is found:

| Tool | Requirement |
| --- | --- |
| TypeScript | Keep strict project references and `noUncheckedIndexedAccess`; no `any` parser shortcuts for normalized records. |
| Zod | Use for request/response/import review schemas where runtime validation is needed. Zod 4 is stable, TypeScript-first, supports JSON Schema conversion, and requires strict mode. Source: `https://zod.dev/`. |
| csv-parse | Use `csv-parse/sync` in `packages/imports` for setup-sized CSV files. Official docs show `parse(data, options)` with `columns: true` and `skip_empty_lines: true`; options include `bom`, `trim`, `columns`, `skip_empty_lines`, and `max_record_size`. Sources: `https://csv.js.org/parse/api/sync/`, `https://csv.js.org/parse/options/`. |
| Fastify | Keep route tests with `inject()` and compact JSON responses. |
| @fastify/multipart | If used, configure route/upload limits. Official docs expose `limits.fileSize`, `files`, `fields`, and `parts`, with security defaults for `parts` and `fileSize`. Source: `https://github.com/fastify/fastify-multipart`. |
| React | Keep React UI state as view/form state only. Do not make browser state authoritative for auction setup beyond displaying the latest import review. |
| Playwright | Use existing test ID guidance from TEA handoff. Prefer route/API assertions plus UI assertions for privacy and Start Auction blocking. |

Latest technical check performed during story creation on 2026-07-07 IST.

### Testing Requirements

Dev Gate commands for this story:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:e2e:event
```

If `npm run test:e2e` remains Vite-preview-only and cannot exercise the upload API, add a Story 1.2 event-mode Playwright spec under `npm run test:e2e:event` or add a documented dev proxy with tests.

Required tests:

- Unit: valid CSV parses all fixture rows and derives privacy-safe Player records.
- Unit: invalid CSV produces `must_fix` issues for missing name, missing gender, unknown skill, and unmappable category.
- Unit: known private fields are absent from normalized Player records and issue messages do not include private values.
- Unit/integration: ignored source fields produce `ignored_source_field` diagnostics by column name only.
- API/integration: upload/preview route returns expected grouped review response for valid and invalid CSV.
- UI/E2E: setup import review renders valid Player count and privacy-safe rows after upload.
- UI/E2E: invalid CSV keeps `setup-start-auction` disabled and shows a specific Player CSV blocker.
- Regression: existing Story 1.1 app shell smoke, `/api/health`, static serving, workspace boundary, dependency smoke, build, and typecheck continue to pass.

Review/Test Gate:

- A second agent must check parser mapping, privacy projection, runtime schema alignment, setup UX, Start Auction blocker behavior, test fixture usage, and no accidental runtime dependency on test fixtures.
- Blocking review findings must be fixed before this story can move from `review` to `done`.

### Previous Story Intelligence

- Story 1.1 established the React setup shell, `/api/health`, event-mode static serving, workspace boundary smoke tests, and setup selectors.
- Story 1.1 is not complete. Review patch items still call out local host/port validation, SPA fallback precision, Fastify cleanup, focus color, dev gate documentation, and workspace path assertions. Do not rely on those being resolved while implementing Story 1.2.
- Preserve the setup shell selectors and local-only framing from Story 1.1 unless the corresponding tests are deliberately migrated.
- Use the already selected npm workspace layout and local-only event mode; do not replace the scaffold.

### Git Intelligence Summary

- Recent commits: `1c76815 Docs done. Implementation Ready.` and `d10dc34 Initial commit`.
- The scaffold and Story 1.1 implementation files are local working-tree changes, not committed history. Treat them as current user/workflow state and edit carefully.
- Do not run destructive git commands or revert unrelated Story 1.1 files.

### Persistence Ownership

No durable SQLite table is required by default for Story 1.2.

- This story owns Player CSV parsing, classification, normalized preview records, setup upload/preview response, and UI review/blocking behavior.
- It does not own `auction_state`, `players`, `teams`, `import_issues`, `action_log`, snapshots, migrations, or resume/reconstruction.
- If the implementation chooses to persist staged Player import data anyway, it must add a concrete Persistence Ownership note to this story before completion and include temporary SQLite transaction/resume tests in the same slice.

### Scope Boundaries

In scope:

- Player CSV required header validation.
- Player row validation and role/category mapping.
- Ignored/private source field classification.
- Privacy-safe Player import review.
- Start Auction disabled/blocker state for Player CSV `must_fix` issues.
- Parser, schema, API, UI, and acceptance tests for Player CSV import review.

Out of scope:

- Player photo matching and placeholder issue creation beyond showing the empty `can_proceed_with_placeholder` group.
- Team CSV import and Team logo matching.
- Auction parameter editor and role base price validation beyond not breaking future setup layout.
- Actual Start Auction command execution.
- SQLite persistence, snapshots, action log, resume.
- Live board, bidding, undo, rosters, unsold bidding, manual assignment, reset, close.
- Accounts/auth/public hosting/cloud services.

### References

- `_bmad-output/planning-artifacts/epics.md` sections `Additional Requirements`, `UX Design Requirements`, `Epic 1`, and `Story 1.2`.
- `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md` sections `FR-1: Load player CSV`, `Privacy And Data Minimization`, `Data Compatibility`, and `MVP Scope`.
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md` sections `AD-7`, `AD-8`, `AD-9`, `AD-11`, `Consistency Conventions`, `Stack`, and `Capability -> Architecture Map`.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md` sections `Information Architecture`, `Component Patterns`, `State Patterns`, `Accessibility Floor`, and `Privacy And Data Visibility`.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` sections `Colors`, `Components`, and `Do's and Don'ts`.
- `_bmad-output/test-artifacts/test-design/auction_manager-handoff.md` sections `Quality Gates`, `Story-Level Integration Guidance`, and `Data-TestId Requirements`.
- `_bmad-output/test-artifacts/finalized-test-cases.md` cases `TD-022`, `TD-029`, `TD-035`, and `TD-040`.
- `_bmad-output/test-artifacts/sample-test-data/players-valid.csv`, `players-invalid.csv`, `README.md`, and `sample-data-map.json`.
- `packages/test-fixtures/src/index.ts` fixture contracts for Player CSV rows, private fields, canonical roles, phase categories, import issue severities, and CSV helpers.
- `https://csv.js.org/parse/api/sync/`
- `https://csv.js.org/parse/options/`
- `https://zod.dev/`
- `https://github.com/fastify/fastify-multipart`

## Dev Agent Record

### Agent Model Used

TBD by dev agent.

### Debug Log References

- 2026-07-07: Red/green contract tests: `npx vitest run packages/shared/src/import-contracts.test.ts`; regression: `npm test`.
- 2026-07-07: Red/green parser tests: `npx vitest run packages/imports/src/player-csv.test.ts`; regression: `npm test`.
- 2026-07-07: Red/green API tests: `npx vitest run apps/server/src/player-csv-preview.test.ts`; regression: `npm test`.
- 2026-07-07: Red/green UI tests: `npm run build --workspace @auction-manager/web`; `npx playwright test apps/web/e2e/player-csv-import.spec.ts --config playwright.config.ts`; `npm run typecheck`; `npm test`.
- 2026-07-07: Dev Gate passed: `npm run typecheck`; `npm test`; `npm run build`; `npm run test:e2e`; `npm run test:e2e:event`.

### Implementation Plan

- Implement shared DTO/schema contracts first, then the CSV adapter, API boundary, setup UI, and story gate tests in the story task order.

### Completion Notes List

- Story context created on 2026-07-07 from PRD, architecture, UX, TEA test artifacts, current code, previous story file, git status, and latest official docs for csv-parse, Zod, and Fastify multipart.
- Added canonical shared Player import contract constants, strict Zod schemas, inferred TypeScript types, and source-local tests proving setup Player previews exclude private registration fields.
- Added Player CSV adapter with header validation, table-driven role/category mapping, grouped import issues, ignored-source-field diagnostics by column name only, and privacy-safe normalized setup Player previews.
- Added `POST /api/setup/player-csv/preview` with `text/csv` request handling, explicit body size/type rejection, shared response shape, and no persistence or Start Auction command execution.
- Added setup Player CSV upload/review UI with privacy-safe Player rows, grouped issue rendering, specific `must_fix` Start Auction blocker copy, preserved Story 1.1 selectors, and focused Playwright coverage for valid/invalid upload flows.
- Added event-mode acceptance coverage for real API-backed Player CSV upload review and Start Auction blocking, then completed the full Story 1.2 Dev Gate successfully.

### File List

- packages/shared/src/index.ts
- packages/shared/src/import-contracts.test.ts
- packages/imports/src/index.ts
- packages/imports/src/player-csv.ts
- packages/imports/src/player-csv.test.ts
- apps/server/src/app.ts
- apps/server/src/player-csv-preview.test.ts
- apps/web/src/main.tsx
- apps/web/src/styles.css
- apps/web/e2e/event-mode.spec.ts
- apps/web/e2e/player-csv-import.spec.ts
- vitest.config.ts
- _bmad-output/implementation-artifacts/1-2-import-and-review-player-csv.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-07-07: Created Story 1.2 context file and marked ready for dev.
- 2026-07-07: Added shared Player import contracts and privacy-safe contract tests.
- 2026-07-07: Added Player CSV import adapter, parser tests, and Vitest workspace source aliases.
- 2026-07-07: Added server Player CSV preview API boundary and Fastify inject tests.
- 2026-07-07: Added setup Player CSV upload/review UI and Playwright UI acceptance tests.
- 2026-07-07: Code review completed; fixed upload race, review badge states, API 413 body, zero-player blocking, missing unit tests, and UI error handling. Dev Gate re-passed.
