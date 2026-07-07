---
baseline_commit: 8681c74826f76ea09d918eb3f13aff197a023abb
created: 2026-07-07T12:22:51+0530
---

# Story 1.5: Configure Auction Parameters

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want to confirm or edit auction parameters before the auction starts,
so that bidding, budgets, squad limits, role limits, and manual assignment use the agreed event rules.

## Acceptance Criteria

1. Given Player and Team import data is available, when the operator opens auction parameter setup, then the app shows editable values for Role Base Prices, Bid Increment, Team Budgets, Maximum Squad Size, Role Targets, Phase 1 Category order, and Manual Assignment budget behavior, and current league defaults may be prefilled.
2. Given imported Players include a Role, when the operator reviews Role Base Prices, then every imported Role must have a configured Base Price, and Start Auction is blocked until every Player Role has a price.
3. Given the operator edits Bid Increment, Team Budgets, Maximum Squad Size, Role Targets, or Manual Assignment budget behavior, when the values are saved, then the system validates the parameters as structured Auction Parameters, and invalid or incomplete parameters block Start Auction with specific reasons.
4. Given the setup review is displayed, when all required source data and Auction Parameters are valid, then the operator sees a parameter summary including role prices, bid increment, budgets, squad cap, role targets, and manual-assignment budget behavior, and Start Auction becomes available.
5. Given Start Auction has not yet happened, when the operator changes parameters, then changes are allowed and reflected in setup review, and no historical auction state exists that could be invalidated.
6. Given a developer finishes this story, when they run the story's Dev Gate, then domain validation tests, shared schema tests, setup UI/component tests, and typecheck pass, and an E2E or acceptance test proves Start Auction remains blocked until required parameters are complete and valid.
7. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks parameter ownership in domain/shared schemas, validation coverage, setup UX, unit tests, and the parameter-blocking E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Tasks / Subtasks

- [x] Add Auction Parameter shared contracts. (AC: 1, 2, 3, 4)
  - [x] In `packages/shared/src/index.ts`, add canonical parameter constants/types for `ManualAssignmentBudgetBehavior`, role base prices, bid increment, team budget, max squad size, role targets, and Phase 1 category order. Reuse existing `auctionRoleValues` and `phase1CategoryValues`; do not create duplicate role/category enums.
  - [x] Add `auctionParametersSchema` and `auctionParameterValidationIssueSchema` using Zod 4. Keep money and counts as integers only.
  - [x] Enforce required role base prices for every imported Player role, positive bid increment, positive team budget, positive max squad size, nonnegative role targets, `sum(roleTargets) <= maxSquadSize`, Phase 1 order as an exact permutation of `phase1CategoryValues`, and v1 manual-assignment budget behavior value `NoBudgetImpact`.
  - [x] Add `auctionParameterReviewResponseSchema` or equivalent setup DTO with `parameters`, grouped/specific blocking reasons, and `startAuctionBlocked`. Keep the DTO setup-safe and free of private source CSV fields.
  - [x] Extend `packages/shared/src/import-contracts.test.ts` or add a focused shared test file proving strict schemas, defaults, role coverage, Phase 1 order permutation validation, and blocker semantics.

- [x] Implement domain-owned parameter validation. (AC: 2, 3, 5, 6)
  - [x] Replace the `packages/domain/src/index.ts` stub with exported parameter validation helpers, for example `getDefaultAuctionParameters()`, `validateAuctionParametersForSetup(parameters, context)`, and `applyAuctionParameterDraft(previous, patch, context)`.
  - [x] `context` must include imported Player roles and imported Teams or enough counts to validate role-price coverage and team budget applicability. Do not make React or Fastify decide completeness.
  - [x] Return structured reasons that can be rendered directly as calm setup copy: missing role price, invalid bid increment, invalid team budget, invalid max squad size, invalid role target, role targets exceed squad size, invalid Phase 1 order, unsupported manual-assignment budget behavior.
  - [x] Add `packages/domain/src/auction-parameters.test.ts` covering defaults, every invalid boundary, missing base price for imported role, valid edits, and no historical-state mutation before Start Auction.

- [x] Add server setup parameter staging and API routes. (AC: 1, 3, 4)
  - [x] Extend `apps/server/src/setup-staging.ts` with staged Auction Parameters. Existing Player CSV/photo and Team CSV/logo staging must remain independent and keep their clear-on-reimport behavior.
  - [x] Add intent-named setup routes in `apps/server/src/app.ts`, e.g. `GET /api/setup/auction-parameters` for defaults/current staged review and `POST /api/setup/auction-parameters` for saving a parameter draft. Use JSON content only; reject unsupported content type with `415`.
  - [x] The route must call `packages/domain` validation and return the shared setup DTO. Route handlers must not duplicate rule logic.
  - [x] Combine staged Player CSV, Team CSV, and parameter review in server-side readiness so the API can tell the UI when Start Auction is still blocked. It is acceptable for the actual Start Auction command to remain out of scope until Story 1.6, but this story must remove the hardcoded "parameters next step" blocker once valid parameters are saved.
  - [x] Add Fastify `inject()` tests for default parameter review, valid save, invalid save with specific reasons, unsupported content type, and imported-role base-price coverage.

- [x] Upgrade setup UI with an Auction Parameters section. (AC: 1, 3, 4, 5)
  - [x] In `apps/web/src/main.tsx`, add a setup section after Team logos with stable selectors: `setup-auction-parameters`, `auction-parameters-summary`, `role-base-price-{role}`, `bid-increment-input`, `team-budget-input`, `max-squad-size-input`, `role-target-{role}`, `phase1-category-order`, `manual-assignment-budget-behavior`, and `auction-parameters-save`.
  - [x] Use number inputs for integer money/counts and a select or segmented control for manual-assignment budget behavior. For v1, only `NoBudgetImpact` is valid; keep the UI honest rather than suggesting unsupported options.
  - [x] Show the default values: role base prices `Ace 10`, `Batting 8`, `Bowling 6`, `AllRounder 6`, `Girls 6`; bid increment `2`; team budget `170`; max squad size `13`; role targets `Ace 2`, `Batting 3`, `Bowling 2`, `AllRounder 2`, `Girls 2`; Phase 1 category order `Ace Men`, `Ace Women`, `Women All Rounders`, `Men Bowlers`, `Men Batsmen`, `Men All Rounders`; manual assignment budget behavior `NoBudgetImpact`.
  - [x] Parameter save responses must be schema-validated with `safeParse`, use upload-generation-style stale-response protection, restore previous review on failure, and show `role="alert"` for specific validation errors.
  - [x] Update `blockerText`: Player CSV must block first, Team CSV second, Auction Parameters third. Photos and logos remain non-blocking. When Player CSV and Team CSV are valid and parameters are valid, Start Auction may become enabled for this story's setup readiness even if the actual Start Auction mutation remains Story 1.6; if enabled, clicking it should either be a no-op with clear "Start Auction command arrives in next story" copy or remain disabled behind an explicit Story 1.6 blocker. Do not imply the auction can start if no command exists.
  - [x] Preserve existing selectors and behavior for player/team import and media sections: `app-shell`, `phase-indicator`, `setup-empty-state`, `setup-start`, `setup-player-csv`, `player-csv-input`, `setup-player-photos`, `player-photos-input`, `setup-team-csv`, `team-csv-input`, `setup-team-logos`, `team-logos-input`, `import-issues-table`, `setup-start-auction`, and `start-auction-blocker`.

- [x] Add story-level acceptance and regression coverage. (AC: 6, 7)
  - [x] Unit: shared schema tests for defaults, strictness, exact roles/categories, integer validation, and blocker semantics.
  - [x] Unit: domain validation tests for all parameter fields, imported-role coverage, Phase 1 order permutation, and `NoBudgetImpact`.
  - [x] API: Fastify route tests for defaults/current review, valid save, invalid save, content-type rejection, and no duplicate rule logic in routes.
  - [x] UI/E2E: valid Player CSV + valid Team CSV + default parameters shows a parameter summary; invalid parameters keep Start Auction blocked with specific text; saved edits update the summary; missing photos/logos do not block.
  - [x] Regression: all Story 1.1-1.4 tests pass unchanged, including event-mode import tests.
  - [x] Run the Dev Gate and record results in the Dev Agent Record before marking tasks complete.

## Dev Notes

### Current Repository State To Preserve

- Sprint status shows Stories 1.1-1.4 done and Story 1.5 backlog at creation time; this story changes 1.5 to ready-for-dev.
- Current `HEAD` is `8681c74826f76ea09d918eb3f13aff197a023abb`. The last five commit titles are `Story 1.3: Match Player Photos With Placeholders`, `Story 1.2: Import and Review Player CSV`, `Local Auction Manager App Shell`, `Docs done. Implementation Ready.`, and `Initial commit`.
- The source tree already contains Story 1.4 implementation files and tests: Team CSV and Team logo contracts/adapters/routes/UI are present. Treat current files as the baseline even though recent git commit titles do not include Story 1.4.
- No `project-context.md` file was found for the persistent-facts glob during story creation.

### Existing Files That This Story Will Touch

Read these before editing and update them in place:

- `packages/shared/src/index.ts`: currently owns strict Zod import/media contracts, `auctionRoleValues`, `phase1CategoryValues`, and setup preview schemas. Add Auction Parameter contracts here instead of creating a parallel shared file unless the codebase structure is deliberately split.
- `packages/shared/src/import-contracts.test.ts`: currently tests strict import/media DTOs. Extend or add adjacent tests for parameter DTO strictness and validation.
- `packages/domain/src/index.ts`: currently only exports `domainPackageReady`. This story should introduce the first real domain rules here or in a new `packages/domain/src/auction-parameters.ts` re-exported from `index.ts`.
- `packages/test-fixtures/src/index.ts`: already defines `AuctionParameters`, `ManualAssignmentBudgetBehavior`, and `defaultAuctionParameters` for tests. Align runtime shared/domain contracts to these shapes; avoid importing test fixtures from runtime packages.
- `apps/server/src/setup-staging.ts`: currently stages Player CSV/photos and Team CSV/logos in memory. Add parameter staging here and preserve CSV reimport clearing behavior.
- `apps/server/src/app.ts`: currently owns setup import routes, media upload routes, static asset serving, route-aware error copy, and `/api/health`. Add setup parameter routes here and keep route handlers thin.
- `apps/server/src/app.test.ts` or a new `apps/server/src/auction-parameters.test.ts`: add Fastify inject coverage.
- `apps/web/src/main.tsx`: currently renders Player CSV, Player photos, Team CSV, Team logos, merged issue groups, and a disabled Start Auction row whose blocker says parameters are the next setup step. Add the parameter editor and update blocker logic without breaking existing upload flows.
- `apps/web/src/styles.css`: extend the existing light setup-section styling. Keep stable dimensions and responsive behavior at the existing breakpoints.
- `apps/web/e2e/event-mode.spec.ts`: event-mode config only picks this spec for real-server E2E. Extend it for the parameter setup acceptance gate.
- `apps/web/e2e/player-csv-import.spec.ts`: update only if shared route-mocked UI assertions need new parameter readiness copy.

Expected new files:

```text
packages/domain/src/auction-parameters.ts
packages/domain/src/auction-parameters.test.ts
apps/server/src/auction-parameters.test.ts
```

Optional if it keeps `main.tsx` manageable:

```text
apps/web/src/auction-parameters.tsx
```

### Current Behavior Of Key UPDATE Files

- `packages/shared/src/index.ts`: exposes import/media enums, strict setup preview schemas, grouped import issue schemas, photo/logo match records, and review summaries. It has no Auction Parameter runtime schema today.
- `packages/domain/src/index.ts`: stub only. Any parameter rule placed in React or Fastify would violate AD-2/AD-13.
- `packages/test-fixtures/src/index.ts`: has the desired parameter shape and defaults but is test-only. Runtime code must copy the contract into shared/domain, not depend on fixtures.
- `apps/server/src/setup-staging.ts`: non-durable in-memory staging. `setPlayerCsv` clears photos; `setTeamCsv` clears logos. New parameter staging should not clear imports, and import reuploads should not silently mutate saved parameter drafts except when validation context changes and produces new blocking reasons.
- `apps/server/src/app.ts`: route patterns are already same-origin Fastify routes with explicit content-type checks and route-aware messages. For JSON parameter saves, use the same discipline: explicit schema validation, route-aware 4xx errors, and no private source fields.
- `apps/web/src/main.tsx`: uses React local state, generation refs for stale upload responses, Zod `safeParse` for API responses, accessible alerts, merged issue groups, and stable test IDs. Reuse these patterns for parameters.
- `apps/web/src/styles.css`: setup sections are light, dense, bordered panels with 8px radius; buttons are 44px+; mobile stacks at 760px. Extend these patterns instead of introducing a live-board look.

### Architecture Guardrails

- AD-2: `packages/domain` is the only module allowed to decide bid increments, role capacity, derived base prices, and manual-assignment eligibility/budget effects. The UI may collect drafts; it cannot own validity.
- AD-3: after setup begins, server/domain state is authoritative. React may hold form state and pending-command affordances only.
- AD-4: use intent-named same-origin HTTP. Mutations should be `POST` commands, validate request/response schemas, and return authoritative setup state or a compact result summary.
- AD-5/AD-13: parameters must eventually persist with the auction and be locked after Start Auction. This story may keep non-durable setup staging if Story 1.6 owns durable Start Auction, but the schema must be ready for persistence.
- AD-7: imports are staged adapters. Do not move Player/Team CSV parsing or media matching into the parameter code.
- AD-8: setup/live DTOs must not expose private source fields. Parameter DTOs should contain only auction rules and validation messages.
- AD-11: parameter/rule changes require Vitest domain tests. Fastify routes require `inject()` tests. Playwright must cover auction-parameter locking/readiness at the appropriate flow level.
- AD-13: Auction Parameters are setup-owned and locked after Start Auction. Manual assignment budget behavior is a domain enum with v1 default `NoBudgetImpact`; additional values are out of scope unless domain validation, persistence, API schema, UI, and tests are all updated in the same slice.
- Consistency conventions: role enum values are `Ace`, `Batting`, `Bowling`, `AllRounder`, `Girls`; Phase 1 categories are `Ace Men`, `Ace Women`, `Women All Rounders`, `Men Bowlers`, `Men Batsmen`, `Men All Rounders`; money and counts are integer units only.

### Auction Parameter Contract

Use this runtime shape, aligned to `packages/test-fixtures/src/index.ts`:

```ts
interface AuctionParameters {
  roleBasePrices: Record<AuctionRole, number>;
  bidIncrement: number;
  teamBudget: number;
  maxSquadSize: number;
  roleTargets: Record<AuctionRole, number>;
  phase1CategoryOrder: readonly Phase1Category[];
  manualAssignmentBudgetBehavior: "NoBudgetImpact";
}
```

Default values:

| Field | Default |
| --- | --- |
| `roleBasePrices.Ace` | `10` |
| `roleBasePrices.Batting` | `8` |
| `roleBasePrices.Bowling` | `6` |
| `roleBasePrices.AllRounder` | `6` |
| `roleBasePrices.Girls` | `6` |
| `bidIncrement` | `2` |
| `teamBudget` | `170` |
| `maxSquadSize` | `13` |
| `roleTargets.Ace` | `2` |
| `roleTargets.Batting` | `3` |
| `roleTargets.Bowling` | `2` |
| `roleTargets.AllRounder` | `2` |
| `roleTargets.Girls` | `2` |
| `phase1CategoryOrder` | `Ace Men`, `Ace Women`, `Women All Rounders`, `Men Bowlers`, `Men Batsmen`, `Men All Rounders` |
| `manualAssignmentBudgetBehavior` | `NoBudgetImpact` |

Validation rules:

- Every imported Player role must have a configured base price.
- Base prices, bid increment, team budget, and max squad size must be positive integers.
- Role targets must be nonnegative integers.
- Sum of role targets must not exceed max squad size.
- Phase 1 category order must contain every canonical category exactly once.
- `NoBudgetImpact` is the only supported v1 manual-assignment budget behavior.
- Parameter issues should be targetable as `parameter` issues or a parameter-specific issue shape so UI can show specific text near the relevant control.

### UX Requirements For This Story

- Setup remains light, dense, and checklist-like. Do not make this section look like the live board.
- The parameter editor must be an "Auction parameter row/section" for role base prices, bid increment, team budgets, squad cap, role targets, Phase 1 order, and manual-assignment budget behavior.
- Use numeric controls for integer values and a read-only or single-option control for `NoBudgetImpact`; avoid exposing unsupported future options.
- Parameter summary must be visible in setup review once valid, with role prices, bid increment, budgets, squad cap, role targets, and manual-assignment budget behavior.
- Microcopy must be calm and specific, e.g. "Base price is missing for Bowling" or "Role targets total 14, which exceeds max squad size 13." Avoid vague "Invalid parameters."
- Keep controls accessible: visible labels, keyboard operation, `role="alert"` for validation errors, 44px minimum hit targets, and stable layout at 1440x900, 1366x768, 1920x1080, and 390x844.
- Start Auction blocker priority: Player CSV required data, then Team CSV required data, then Auction Parameters. Photos and logos never block.

### Latest Tech Information

Checked against npm registry on 2026-07-07:

- Installed lockfile versions: React `19.2.7`, Vite `8.1.3`, `@vitejs/plugin-react` `6.0.3`, Fastify `5.9.0`, Zod `4.4.3`, Playwright `1.61.1`, Vitest `4.1.9`.
- Registry latest at check time: React `19.2.7`, Vite `8.1.3`, `@vitejs/plugin-react` `6.0.3`, Fastify `5.10.0`, Zod `4.4.3`, Playwright `1.61.1`, Vitest `4.1.10`.
- Do not upgrade dependencies in this story just to chase minor releases. Use the installed lockfile/API surface unless implementation hits a concrete bug requiring an explicit upgrade and full regression run.
- Sources: npm registry latest endpoints for `react`, `vite`, `@vitejs/plugin-react`, `fastify`, `zod`, `@playwright/test`, and `vitest`.

### Previous Story Intelligence

- Story 1.4 established the current setup slice pattern: strict shared contracts, focused adapter/domain logic, thin Fastify routes, setup staging, React UI with schema-validated responses, stable test IDs, and event-mode E2E.
- Story 1.4 added Team CSV/logo flows and preserved the blocker rule that photos/logos do not block Start Auction. Story 1.5 must keep that behavior and add parameters as the next blocking prerequisite.
- The Story 1.4 UI uses upload-generation refs to prevent stale async responses. Reuse the same stale-response protection for parameter saves.
- Existing import/media review summaries use `startAuctionBlocked === mustFixCount > 0`. Parameter review should follow an equally explicit invariant so UI and server do not infer different readiness.
- Known deferred work from earlier reviews remains deferred unless directly needed: concurrent upload interleaving, full in-memory buffering within limits, viewport layout regression tests, and unused staging accessors reserved for later persistence.

### Git Intelligence Summary

- Recent work is story-sliced and test-heavy: Story 1.2 introduced Player CSV contracts/import/UI/E2E, Story 1.3 introduced media matching and upload security, and Story 1.4 mirrors that for teams/logos in the current tree.
- Tests use Vitest for package/server coverage and Playwright for route-mocked plus real event-mode flows. `playwright.event.config.ts` only runs `apps/web/e2e/event-mode.spec.ts`.
- Package dependency direction to preserve: `shared` has no workspace dependencies; `domain` depends on `shared`; `persistence` depends on `domain` and `shared`; `imports` depends on `shared`; `server` depends on all runtime packages; `web` depends on `shared`.

### Persistence Ownership

No SQLite persistence is required in this story unless the implementation intentionally pulls persistence forward from Story 1.6.

- This story owns: structured Auction Parameter runtime contracts, domain validation rules, non-durable setup staging of a parameter draft/review, setup parameter API response shape, and setup UI parameter review.
- This story does not own: durable auction tables, action log entries, snapshots, resume, or parameter locking after a real Start Auction command. Those belong to Story 1.6 unless explicitly pulled in with full persistence tests.
- If durable persistence is introduced anyway, add a concrete Persistence Ownership note naming tables, fields, indexes/constraints, action-log payload fields, snapshot fields, schema-version behavior, and resume/reconstruction tests.

### Scope Boundaries

In scope:

- Auction Parameter defaults, editing, validation, review summary, and setup readiness blocker.
- Runtime shared/domain parameter schemas and tests.
- Thin Fastify setup parameter routes and staging.
- Setup UI controls and summary for parameters.
- E2E proof that invalid/incomplete parameters block Start Auction and valid parameters clear the parameter blocker.

Out of scope:

- The actual Start Auction command, durable initial auction state, SQLite commits, snapshots, action log, and resume. Story 1.6 owns those.
- Live board Current Bid, bid increment command, Team tiles, sale validation, role capacity indicators, rosters, Phase 2, Phase 3, Undo, Reset, and Close.
- Editing Player or Team source data in-app.
- Additional manual-assignment budget behavior values beyond `NoBudgetImpact`.
- Cloud services, accounts, RBAC, hosted databases, Docker runtime, public deployment, or new dependencies.

### Testing Requirements

Dev Gate commands:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:e2e:event
```

Review/Test Gate:

- A second agent must inspect parameter ownership and ensure route/UI code does not duplicate domain rules.
- The reviewer must run or add domain tests for each validation rule, shared schema tests for DTO strictness, Fastify inject tests for setup parameter routes, and Playwright coverage for the setup parameter flow.
- Blocking findings reopen the story for implementation iteration before it can be considered done.

### Project Structure Notes

- Extend existing packages; do not create a new package or app.
- Keep runtime source under `src/`; do not edit `dist/` output by hand.
- Do not import `@auction-manager/test-fixtures` from runtime packages. Fixtures are for tests only.
- Keep all new UI test IDs stable and specific; future Story 1.6 tests will rely on this setup state.

## Dev Agent Record

### Agent Model Used

TBD by dev agent.

### Debug Log References

- 2026-07-07T12:27:52+0530: Red phase shared/domain tests failed for missing Auction Parameter exports and domain helpers.
- 2026-07-07T12:29:18+0530: Focused shared/domain tests passed after adding schemas and domain validation.
- 2026-07-07T12:30:17+0530: Red phase server route tests failed with 404 for missing parameter endpoints.
- 2026-07-07T12:31:18+0530: Server parameter route tests passed after adding staging and endpoints.
- 2026-07-07T12:33:52+0530: `npm test` passed, 17 files / 97 tests.
- 2026-07-07T12:32:39+0530: `npm run typecheck` passed.
- 2026-07-07T12:34:00+0530: `npm run build` passed.
- 2026-07-07T12:34:10+0530: `npm run test:e2e` passed, 4 Playwright tests.
- 2026-07-07T12:34:20+0530: `npm run test:e2e:event` passed, 7 Playwright tests.

### Completion Notes List

- Added strict shared Auction Parameter schemas, validation issue DTOs, setup review DTOs, canonical `NoBudgetImpact` behavior, and tests for integer/permutation/blocker semantics.
- Added domain-owned defaults, setup validation, and draft application helpers with structured reasons for missing role prices, invalid numeric boundaries, role target totals, phase order, and unsupported manual-assignment behavior.
- Added non-durable server parameter staging plus `GET`/`POST /api/setup/auction-parameters`; route handlers derive context from staged Player/Team imports and call domain validation.
- Added setup UI parameter editor and summary with stable selectors, schema-validated save responses, stale-response protection, alert rendering for parameter errors, and blocker priority Player CSV -> Team CSV -> Auction Parameters -> Story 1.6 command.
- Added Vitest and Playwright coverage for shared/domain/API/UI/event-mode flows and ran the full Dev Gate.

### File List

- `_bmad-output/implementation-artifacts/1-5-configure-auction-parameters.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/server/src/app.ts`
- `apps/server/src/auction-parameters.test.ts`
- `apps/server/src/setup-staging.ts`
- `apps/web/e2e/event-mode.spec.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/styles.css`
- `packages/domain/src/auction-parameters.ts`
- `packages/domain/src/auction-parameters.test.ts`
- `packages/domain/src/index.ts`
- `packages/shared/src/import-contracts.test.ts`
- `packages/shared/src/index.ts`

### Change Log

- 2026-07-07: Implemented Story 1.5 Auction Parameter contracts, domain validation, setup API staging/routes, setup UI, and acceptance/regression tests.
- 2026-07-07: Code review applied 20 patches — relaxed blocked review schema, team-count validation, readiness endpoint, draft preview, component/E2E coverage, and setup UX hardening.

### Review Findings

- [x] [Review][Patch] Use relaxed review schema for blocked parameter states [packages/shared/src/index.ts, packages/domain/src/auction-parameters.ts, apps/web/src/main.tsx:484-492] — Decision: relax review schema when `startAuctionBlocked` so 400 responses always parse on the client.

- [x] [Review][Patch] Require imported team count in domain validation [packages/domain/src/auction-parameters.ts, apps/server/src/app.ts:574-588] — Decision: block parameter validity when `importedTeamCount === 0`.

- [x] [Review][Patch] Add server-side combined setup readiness endpoint [apps/server/src/app.ts, apps/web/src/main.tsx] — Decision: add `GET /api/setup/readiness` and drive blocker text from it.

- [x] [Review][Patch] Add Vitest/RTL component tests for parameter editor [apps/web/src/] — Decision: add dedicated setup UI/component tests beyond Playwright.

- [x] [Review][Patch] Role-target exceed responses fail client parse [packages/domain/src/auction-parameters.ts:127-168, apps/web/src/main.tsx:484-492]

- [x] [Review][Patch] Unsaved invalid draft bypasses parameter blocking [apps/web/src/main.tsx:172-173,1102]

- [x] [Review][Patch] CSV reimport clears parameter errors without revalidating review [apps/web/src/main.tsx:305,440]

- [x] [Review][Patch] GET `/api/setup/auction-parameters` mutates staging [apps/server/src/app.ts:208]

- [x] [Review][Patch] Blocked responses normalize invalid fields to defaults [packages/domain/src/auction-parameters.ts:193-224]

- [x] [Review][Patch] POST route skips `applyAuctionParameterDraft` merge [apps/server/src/app.ts:229-231]

- [x] [Review][Patch] Unsafe `as AuctionRole[]` cast on imported CSV roles [apps/server/src/app.ts:577-583]

- [x] [Review][Patch] Initial load failure shows "Parameters valid" on hardcoded defaults [apps/web/src/main.tsx:136-153,1094-1102]

- [x] [Review][Patch] In-flight GET can overwrite unsaved draft edits [apps/web/src/main.tsx:136-154]

- [x] [Review][Patch] Empty numeric inputs become `0`; `Number()` allows `NaN` [apps/web/src/main.tsx:527-528]

- [x] [Review][Patch] Start Auction blocker shows only first parameter reason [apps/web/src/main.tsx:241-243]

- [x] [Review][Patch] Field-level validation alerts only after failed save [apps/web/src/main.tsx:456-500,1298-1308]

- [x] [Review][Patch] Phase 1 order submitted via unsafe cast without client validation [apps/web/src/main.tsx:461-464]

- [x] [Review][Patch] Duplicate default parameters in domain and web client [packages/domain/src/auction-parameters.ts:26-53, apps/web/src/main.tsx:63-90]

- [x] [Review][Patch] Missing E2E for imported-role base price blocking [apps/web/e2e/event-mode.spec.ts]

- [x] [Review][Patch] Missing server test for non-object JSON body (`invalid_request`) [apps/server/src/auction-parameters.test.ts]
