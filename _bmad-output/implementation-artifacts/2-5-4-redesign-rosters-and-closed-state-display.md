---
baseline_commit: 91d4e4d
created_at: 2026-07-08T11:15:38+0530
story_key: 2-5-4-redesign-rosters-and-closed-state-display
---

# Story 2.5.4: Redesign Rosters and Closed-State Display

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want roster and final closed-auction screens to match the approved dense room-facing design,
so that the room can inspect Teams without returning to Excel.

## Acceptance Criteria

1. Given the operator switches to Rosters during a live phase, when the roster surface renders, then it uses the redesigned dark roster board with compact Team cards, and every Team remains visible with logo or placeholder, Team name, Captain, budget, squad, relevant role count, and roster rows.
2. Given roster rows render, when Players have been sold or assigned, then rows show Player name, Role where space requires it, acquisition type, and price when applicable, and row density stays readable without turning each Player into a large decorative card.
3. Given Close Auction succeeds in later Epic 4 behavior, when the phase is `Closed`, then the redesigned roster surface is the default room-facing final surface, and routine live controls remain disabled or absent.
4. Given the Board/Rosters switch renders, when the operator changes views, then the switch is keyboard reachable, non-mutating, and styled consistently with the redesigned event-console frame.
5. Given a developer finishes this story, when they run the story's Dev Gate, then roster component tests, Board/Rosters switch non-mutation tests, privacy checks, accessibility checks, and Playwright screenshots for live roster and Closed fixtures pass.
6. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks all-Team visibility, row readability, closed-state readiness, privacy, non-mutation behavior, and consistency with the redesign mockup.

## Implementation Boundary

- This is a frontend roster and closed-state display redesign story. It may change React composition, CSS classes, view-mode defaults, stable test IDs, test fixtures, and Playwright layout coverage.
- Do not change domain rules, persistence writes, command contracts, randomized order behavior, undo semantics, Close Auction command behavior, or roster ownership.
- Team rosters remain read-only projections from authoritative state. Do not create client-side roster truth, append Players to rosters in React, or infer ownership from `players` outside a fixture-only test path.
- Current production `teamRosterDtoSchema` accepts `roster` rows with `acquisitionType: "Sold"` and required `soldPrice`. If this story broadens shared roster row schemas to include assigned rows, keep the change limited to display DTO typing and schema validation, add privacy/schema tests, and do not add assignment commands or persistence. If schema expansion is deferred to Epic 3, still prepare row layout/copy so assigned rows can be displayed once the authoritative DTO exists.
- Closed-state readiness is UI preparation only. Use mocked authoritative `BoardStateDto` fixtures with `phase: "Closed"` for component and Playwright coverage. Do not add `/api/auction/close`, dangerous-operation UI, confirmation modals, or close persistence in this story.
- Preserve existing Phase 1 live board behavior, Manual Assignment shell behavior, command handlers, Undo, Team detail drawer, Board/Rosters switch non-mutation, privacy allowlists, and existing stable test IDs.

## Tasks / Subtasks

- [x] Redesign the roster board structure. (AC: 1, 2, 4)
  - [x] In `apps/web/src/main.tsx`, update `TeamRostersView` into the approved dark roster-board structure from the redesign mockup: header/title block, Board/Rosters switch context, all-Team grid, compact roster cards, metric cells, and dense Player rows.
  - [x] Keep every Team visible, including empty Teams with `No players bought yet.` Do not hide teams with empty rosters.
  - [x] Show logo or placeholder, Team name, Captain, remaining budget, squad count, and one relevant compact role-count metric in the card header/summary. Preserve full role-count information where currently shown, but do not let it dominate the card.
  - [x] Render roster rows with Player name, Role, acquisition type, and price when applicable. Assigned rows should show assignment status without fabricating a price.
  - [x] Keep `TeamDetailDrawer` available and read-only from the roster surface, with focus returning to the triggering Details button.

- [x] Prepare Closed phase display behavior without implementing Close Auction. (AC: 3)
  - [x] Add UI handling for `boardState.phase === "Closed"` so the default view is Rosters and the screen title/treatment reads as final room-facing roster state, e.g. `Auction Closed` and `Final Rosters`.
  - [x] Ensure routine live controls (`live-command-strip`, `reveal-next`, `increase-bid`, `mark-sold`, `mark-unsold`) are absent or disabled when rendering a Closed fixture.
  - [x] Keep the Board/Rosters switch non-mutating. If the Board tab remains selectable in Closed fixtures, it must not expose enabled live commands.
  - [x] Do not add a close command, confirmation modal, dangerous menu, API route, persistence write, or undo exclusion logic; Epic 4 owns real Close Auction behavior.

- [x] Update roster styles using the Epic 2.5 event-console system. (AC: 1, 2, 3, 4)
  - [x] In `apps/web/src/styles.css`, replace the old light roster card treatment for `.live-app-shell .team-rosters-view` with the mockup-aligned dark roster board.
  - [x] Use existing Story 2.5.1 tokens: `--surface-base`, `--surface-raised`, `--surface-muted`, `--surface-panel-soft`, `--ink-inverse`, `--ink-inverse-secondary`, `--command-red`, `--live-red`, `--border-subtle`, and `--focus-ring`.
  - [x] Use a dense desktop grid that can show eight Teams across the 1440x900, 1366x768, and 1920x1080 visual QA targets without oversized decorative cards.
  - [x] Keep narrow 390x844 fallback readable by stacking Team cards in workflow order. Do not scale font size with viewport width.
  - [x] Avoid decorative gradients, hero treatment, celebratory copy, or card-in-card nesting. The roster board is an operational room-facing surface.

- [x] Add component, accessibility, and privacy tests. (AC: 1, 2, 3, 4, 5)
  - [x] Extend `apps/web/src/main.test.tsx` with a multi-Team roster fixture that includes empty Teams and sold roster rows from `teamRosters`.
  - [x] Add a Closed fixture using `phase: "Closed"` and authoritative `teamRosters`; assert Rosters is the default visible surface.
  - [x] Assert every Team section renders with logo/placeholder, Team name, Captain, budget, squad, role-count text, and roster rows or empty copy.
  - [x] Assert roster rows expose only allowed fields: Player name, Role, acquisition type, and price when applicable.
  - [x] Assert private strings such as email, mobile, payment status, transaction IDs, source timestamps, and ignored source fields never appear in the roster DOM.
  - [x] Assert Board/Rosters tab interaction and arrow-key navigation remain keyboard reachable and do not trigger any `POST`.
  - [x] Assert Closed fixture rendering does not expose enabled live bidding controls.

- [x] Add Playwright visual/layout coverage for live rosters and Closed fixtures. (AC: 1, 2, 3, 5)
  - [x] Add or extend a layout spec under `apps/web/e2e/`, preferably a focused roster layout spec included by `playwright.event-layout.config.ts`.
  - [x] For live roster coverage, either drive an event-mode sale and switch to Rosters or route-mock `/api/state` with an authoritative sold-roster state.
  - [x] For Closed coverage, route-mock `/api/state` with `phase: "Closed"` and all-Team roster data. Avoid adding production seed state or API behavior.
  - [x] Capture screenshots after `document.fonts.ready` at 1440x900 and 1366x768 for this story; prepare the 1920x1080 and 390x844 assertions or screenshots if practical, otherwise leave explicit handoff notes for Story 2.5.5's full QA gate.
  - [x] Add bounding-box assertions that roster header, Board/Rosters switch, roster grid, all Team cards, sample roster rows, and empty-Team copy are visible and do not overlap incoherently.

- [x] Run the story Dev Gate and update the Dev Agent Record. (AC: 5, 6)
  - [x] `npm run typecheck`
  - [x] `npm run test`
  - [x] `npm run test:e2e:event`
  - [x] Record screenshot artifact paths, Closed fixture approach, privacy evidence, and non-mutation evidence in the Dev Agent Record.

### Review Findings

- [x] [Review][Patch] `roster-team-summary` test ID scoped to role metric cell only — moved `data-testid` to the full `<dl>` summary block [`main.tsx`]
- [x] [Review][Patch] Blocked Manual Assignment teams remained selectable — disabled blocked tiles and guard `onClick` [`main.tsx`]
- [x] [Review][Patch] Stale or blocked `selectedTeamId` could persist — validate team existence and auto-fallback from blocked selection [`main.tsx`]
- [x] [Review][Patch] Empty teams showed misleading `0 / target` role metric — render `Roles / —` when no role counts are positive [`main.tsx`]
- [x] [Review][Patch] Empty manual-assignment pool had no operator copy — added `No players in assignment pool.` empty state [`main.tsx`]
- [x] [Review][Patch] Closed Board/roster class hooks had no styles — added `.closed-board-panel`, `.auction-board-closed`, `.roster-board-closed` CSS [`styles.css`]
- [x] [Review][Patch] Closed phase forced Rosters on every render — default only on phase transition so Board tab stays selectable [`main.tsx`]
- [x] [Review][Patch] React roots leaked document listeners between tests — reuse singleton root and unmount in `afterEach` [`main.tsx`, `main.test.tsx`]
- [x] [Review][Patch] Closed roster layout lacked 390×844 stacking proof — added mobile stacking assertion to Closed Playwright spec [`roster-layout.spec.ts`]
- [x] [Review][Defer] Privacy fixture injection blocked by strict `appStateResponseSchema` — roster row extra fields fail load validation; privacy enforced at schema boundary [`packages/shared/src/index.ts`] — deferred, schema boundary sufficient
- [x] [Review][Defer] Story 2.5.3 Manual Assignment bundled in same diff — intentional combined worktree state; split review only, no revert [`main.tsx`, `styles.css`] — deferred, combined epic delivery
- [x] [Review][Defer] 1920×1080 screenshot proof — explicit handoff to Story 2.5.5 full visual QA gate — deferred, planned in 2.5.5

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has `epic-2-5` in progress, Stories 2.5.1, 2.5.2, and 2.5.3 done, Story 2.5.4 `backlog` at story creation time, and Story 2.5.5 still `backlog`.
- Current `HEAD` at story creation is `91d4e4d` (`Story 2.5.2: Redesign the Live Auction Board Layout`).
- The worktree is not clean at story creation. Uncommitted changes include Story 2.5.3 implementation files and `_bmad-output/implementation-artifacts/2-5-3-prepare-the-focused-manual-assignment-surface.md`; treat them as current state and do not revert them.
- No `project-context.md` exists for the persistent-facts glob.
- Repo uses npm workspaces. Run scripts from the repository root.

### Files To UPDATE

- `apps/web/src/main.tsx` - update `TeamRostersView`, Closed-phase default view behavior, roster header/title copy, test IDs, and any small helper wiring needed for dense roster rows. Preserve command handlers and live board behavior.
- `apps/web/src/styles.css` - redesign roster board, roster cards, roster metrics, roster rows, switch placement, desktop density, and narrow fallback using existing event-console tokens.
- `apps/web/src/main.test.tsx` - add roster redesign, Closed fixture, privacy, accessibility, and non-mutation tests.
- `apps/web/e2e/event-mode-layout.spec.ts`, `apps/web/e2e/manual-assignment-layout.spec.ts`, or a new focused roster layout spec - add screenshot and viewport proof.
- `playwright.event-layout.config.ts` - update `testMatch` only if a new roster layout spec is added.
- `packages/shared/src/index.ts` - read before deciding assigned-row handling. Update only if this story deliberately broadens roster display DTO schemas with tests and no domain/persistence behavior.

### Files To READ Before Editing

- `apps/web/src/main.tsx` - current `TeamRostersView`, `BoardRostersSwitch`, `TeamDetailDrawer`, `ManualAssignmentSurface`, `AuctionBoard`, `liveView`, `detailTeamId`, phase handling, and stable test IDs.
- `apps/web/src/styles.css` - current light roster styles, dark `.live-app-shell` overrides, Story 2.5.2 live layout classes, Story 2.5.3 manual-assignment classes, and responsive media blocks.
- `apps/web/src/main.test.tsx` - existing mocked-fetch patterns, Board/Rosters switching tests, sold roster tests, drawer focus tests, Manual Assignment fixtures, and privacy assertions.
- `apps/web/src/auction-board-helpers.ts` - `canSwitchLiveView`, `formatRoleCountsSummary`, `getTeamRoster`, `getSoldRosterRowsForTeam`, and Manual Assignment helpers. Use helpers for display logic only; do not add domain rules.
- `apps/web/e2e/event-mode-layout.spec.ts` - screenshot naming, first-viewport helper, event-mode sale setup, and current layout proof style.
- `apps/web/e2e/manual-assignment-layout.spec.ts` - route-mocked authoritative state pattern, no-overlap helper, screenshot capture, and narrow stacking assertion.
- `packages/shared/src/index.ts` - `auctionPhaseValues`, `acquisitionTypeValues`, `soldRosterRowSchema`, `teamRosterDtoSchema`, and `BoardStateDto`.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/mockups/epic-2-redesign-review.html` - Screen 3 roster/closed-state structure and target density.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` - roster board component notes and event-console tokens.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md` - roster flow, closed-state flow, accessibility floor, privacy rules, and responsive profiles.

### Current Behavior Of Key UPDATE Files

- `apps/web/src/main.tsx` currently renders `TeamRostersView` as a two-column roster grid with Team logo/placeholder, Team name, captain, Details button, remaining budget, squad count, full role-count summary, empty copy, and sold roster rows.
- Roster rows currently render four columns: Player name, formatted Role, `acquisitionType`, and `soldPrice`.
- `TeamRostersView` receives `BoardStateDto.teamRosters` and opens the same read-only `TeamDetailDrawer` used by live Team tiles.
- `BoardRostersSwitch` is already keyboard reachable with ArrowLeft, ArrowRight, Home, and End, uses `role="tablist"`/`role="tab"`, and changes only React view state.
- `AuctionBoard` currently has `liveView` defaulting to `"board"`. It resets to Board when `canSwitchLiveView(boardState)` is false and also resets Manual Assignment back to Board; there is no Closed default-to-Rosters behavior yet.
- The live phase strip/topbar in `AuctionBoard` is currently hardcoded for Initial Auction in the normal branch. Closed fixtures need explicit handling so the UI does not read as Initial Auction.
- `apps/web/src/styles.css` still contains old light roster styles first, then dark `.live-app-shell` overrides. Story 2.5.4 should consolidate the live roster appearance into the approved dark roster board rather than layering accidental mixed styles.
- `apps/web/src/main.test.tsx` already covers Board/Rosters switching, empty roster copy, sold roster rows, no-POST view switching, and roster drawer focus restoration.
- `apps/web/e2e/event-mode-layout.spec.ts` currently proves eight-Team live board first-viewport fit at 1440x900 and 1366x768.
- `apps/web/e2e/manual-assignment-layout.spec.ts` already route-mocks a Manual Assignment `BoardStateDto` and captures layout screenshots at 1440x900 and 1366x768, with a 390x844 stacking assertion.
- `packages/shared/src/index.ts` currently defines `acquisitionTypeValues = ["Auction", "ManualAssignment"]`, but `teamRosterDtoSchema.roster` is `z.array(soldRosterRowSchema)` and `soldRosterRowSchema` requires `acquisitionType: "Sold"` plus `soldPrice`.

### Architecture Guardrails

- AD-2: `packages/domain` owns auction truth. React may display rosters, but must not decide ownership, assignment eligibility, phase transitions, close eligibility, undo semantics, or roster mutations.
- AD-3: Server/domain state is authoritative after setup begins. Board/Rosters switching is view state only.
- AD-4: Existing same-origin command contracts remain unchanged. Do not add `/api/auction/close` or assignment routes here.
- AD-5: No SQLite transaction, action-log payload, or snapshot behavior is introduced here.
- AD-6: Reset and Close are dangerous commands and never undoable, but real Close implementation is Epic 4 scope.
- AD-8: Board, roster, logs, snapshots, and DOM must exclude private imported fields: email, mobile, payment status, transaction ID, source timestamp, and ignored source fields.
- AD-11: UI changes require React Testing Library coverage plus Playwright smoke/screenshot evidence.
- AD-15: Team rosters are derived projections. `CloseAuction` changes phase/final display state only; it must not change Player ownership. A Board/Rosters switch is UI navigation only and must not mutate auction state.

### UX Requirements For This Story

- Match Screen 3 of `epic-2-redesign-review.html`: dense dark roster board, roster header, Board/Rosters switch with Rosters active, all-Team grid, compact Team cards, metric cells, and dense Player rows.
- During live phases, Rosters is a peer room-facing surface under the Board/Rosters switch. Switching away and back must preserve Current Player, Current Bid, selected Team, and next safe action.
- In Closed phase fixtures, Rosters must be the default final room-facing surface with phase shown as `Closed`/`Auction Closed` and final title treatment such as `Final Rosters`.
- Empty Teams remain visible and use `No players bought yet.`
- Player rows stay factual and compact. Show Player name, Role where needed for comprehension, acquisition type, and price only when applicable. Do not build large player cards.
- Keep text readable and non-overlapping at 1440x900, 1366x768, 1920x1080, and 390x844.
- Use accessible section headings for Team roster cards and accessible names for Details controls. Critical roster information must not be hover-only or color-only.
- Preserve privacy allowlists: Player name/photo/Role/prices/status/winning Team, roster row Player name/Role/acquisition type/Sold Price when applicable, Team name/Captain/logo/budget/squad/role counts are visible; email, mobile, payment status, transaction ID, source timestamp, and ignored source fields are never visible.

### Stable Test IDs To Preserve

| Test ID | Meaning |
| --- | --- |
| `app-shell` | App frame root |
| `board-rosters-switch` | Board/Rosters navigation |
| `team-rosters-view` | Existing roster tab panel root |
| `roster-team-section` | Existing Team roster card/section |
| `roster-player-row` | Existing roster Player row |
| `team-detail-trigger` | Existing read-only Details trigger |
| `team-detail-drawer` | Existing Team detail drawer |
| `auction-board` | Existing Board tab panel |
| `live-command-strip` | Existing live command strip, absent/disabled in Closed |
| `reveal-next` | Existing reveal command, absent/disabled in Closed |
| `increase-bid` | Existing bid command, absent/disabled in Closed |
| `mark-sold` | Existing sold command, absent/disabled in Closed |
| `mark-unsold` | Existing unsold command, absent/disabled in Closed |

### New Stable Test IDs To Add

| Test ID | Meaning |
| --- | --- |
| `roster-board` | Redesigned roster board surface |
| `roster-board-header` | Roster/Closed title and phase header |
| `roster-board-title` | Current title, e.g. `Team Rosters` or `Final Rosters` |
| `roster-team-grid` | All-Team roster grid |
| `roster-team-summary` | Compact budget/squad/role metric cells for a Team |
| `roster-empty-team` | Empty Team roster copy |
| `closed-rosters-view` | Optional alias/root marker when `phase === "Closed"` |

### Previous Story Intelligence

- Story 2.5.3 prepared Manual Assignment as UI-only and explicitly avoided production assignment commands, persistence, and fake mutations. Continue that discipline for Closed-state preparation.
- Story 2.5.3 introduced route-mocked Playwright layout testing and a 390x844 stacking assertion; reuse that pattern for Closed roster fixtures.
- Story 2.5.2 established the dense red/black event-console shell, top counters, first-viewport screenshot proof, eight-Team fixture patterns, and current live-board stable test IDs.
- Story 2.5.2 review patches fixed hidden blocked text, `aria-live`/`role=alert` conflicts, forced-colors/accessibility concerns, and screenshot font readiness. Do not regress those patterns.
- Story 2.5.1 established the token system and command hierarchy. Continue using CSS variables and do not introduce a second palette.
- Story 2.10 implemented Board/Rosters navigation and Team detail drawer. Preserve its source-of-truth and non-mutation behavior while changing visual density.

### Git Intelligence Summary

Recent commits:

- `91d4e4d Story 2.5.2: Redesign the Live Auction Board Layout`
- `1f0b5dd Story 2.5.1: Apply Red/Black Event Console Tokens and App Frame`
- `5159d9b Story 2.10: View Team Rosters During the Auction`
- `66be6db Story 2.9: Undo Phase 1 Live Actions`
- `9bb3024 Story 2.8: Persist and Resume Phase 1 Live State`

Pattern to follow: narrow frontend slice, reuse existing DTOs/helpers, component tests in `main.test.tsx`, Playwright layout specs for screenshot proof, and no domain/persistence/API churn for UI preparation.

### Latest Technical Information

- React docs list the latest docs line as React `19.2` and list `v19.2.7` as a June 2026 release. The architecture pins React/React DOM 19.2.7 and `package.json` ranges already align, so do not upgrade React for this story. Source: https://react.dev/versions
- Playwright supports page and locator screenshots. Use `locator.screenshot({ path })` or app-shell screenshots after `document.fonts.ready` for roster/closed visual evidence. Source: https://playwright.dev/docs/screenshots
- Testing Library recommends queries that resemble how users find elements, with accessible role/name preferred over test IDs. Use roles/names for tabs, buttons, headings, and Details controls; use `data-testid` for layout anchors and privacy assertions. Source: https://testing-library.com/docs/queries/about/
- Lucide React provides tree-shakable icon components imported from `lucide-react`. Keep icons decorative with `aria-hidden="true"` when adjacent text names the control. Source: https://lucide.dev/guide/react
- Installed package ranges at story creation include React/React DOM `^19.2.0`, `@playwright/test ^1.61.0`, `@testing-library/react ^16.3.2`, `lucide-react ^1.0.0`, Tailwind CSS `^4.3.0`, Vite `^8.1.2`, TypeScript `^6.0.0`, and Vitest `^4.1.0`. Do not add dependencies for this story.

### Project Structure Notes

- The live UI is still concentrated in `apps/web/src/main.tsx`. A local roster subcomponent or small display helper in the same file is acceptable; broad component extraction is out of scope unless it removes immediate duplication with no behavior change.
- CSS lives in `apps/web/src/styles.css`. Add roster styles near the existing live-shell roster styles and responsive blocks.
- Do not edit `apps/web/dist/` or generated build output.
- Screenshot artifacts should be produced by Playwright under ignored test output, not committed as generated binaries.
- Event mode remains one local Fastify process serving the built React app. No internet, Docker, hosted database, account system, or separate display service should be introduced.

### Dev Gate

Required before marking implementation complete:

- `npm run typecheck`
- `npm run test`
- `npm run test:e2e:event`

Dev Gate evidence must include:

- Component/accessibility tests for roster board header, Board/Rosters switch, all-Team roster grid, empty Team cards, sold roster rows, Closed default-rosters behavior, and Details drawer focus.
- Privacy checks proving private imported fields are absent from roster DOM and screenshots.
- Non-mutation evidence proving Board/Rosters switching does not call any `POST` and does not change authoritative board state.
- Playwright screenshots of live roster and Closed roster fixtures at 1440x900 and 1366x768 after fonts settle.
- A note on whether 1920x1080 and 390x844 were covered now or deferred explicitly to Story 2.5.5's full visual QA gate.

### Review/Test Gate

Second-agent review must check:

- Roster display remains read-only and derived from authoritative `teamRosters`.
- No domain command, API route, persistence write, action-log payload, fake close behavior, or fake roster mutation was introduced.
- Every Team stays visible, including empty Teams.
- Roster rows are dense, readable, and include only allowed Player fields.
- Closed fixtures default to final roster display and do not expose routine live controls.
- Board/Rosters switch remains keyboard reachable and non-mutating.
- Team detail drawer remains read-only and focus-safe from the roster surface.
- Privacy allowlist is preserved across roster DOM, tests, screenshots, and any mocked DTOs.
- Visual structure matches the redesign mockup's roster/closed hierarchy closely enough for Story 2.5.5 to perform final visual QA rather than redesign the surface again.

## Project Structure Notes

- Alignment: implementation stays within the existing React/Vite web app and uses shared DTOs as the display contract.
- Variance: assigned roster row display conflicts with current `teamRosterDtoSchema` shape. Treat this as an explicit design/implementation junction; resolve narrowly with tests or defer the schema expansion to Epic 3 while avoiding fake UI truth.

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 2.5 boundary and Story 2.5.4 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-08-epic-2-ui-redesign.md` - Epic 2.5 redesign bridge scope and no-domain-change boundary]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md` - AD-2, AD-3, AD-4, AD-5, AD-6, AD-8, AD-11, AD-15, stack]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` - roster board component notes and event-console tokens]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md` - Team rosters surface, Closed state, accessibility, privacy, responsive profiles, and flows 6-7]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/mockups/epic-2-redesign-review.html` - Screen 3 roster/closed-state mockup]
- [Source: `_bmad-output/implementation-artifacts/2-5-3-prepare-the-focused-manual-assignment-surface.md` - previous story intelligence and current Epic 2.5 frontend patterns]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-08T11:23:51+0530: Story marked in progress; existing `baseline_commit: 91d4e4d` preserved.
- 2026-07-08T11:34:12+0530: `PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test` passed, 33 files / 295 tests.
- 2026-07-08T11:53:11+0530: `npm run typecheck` passed.
- 2026-07-08T11:53:11+0530: `PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test` passed after visual label fix, 33 files / 295 tests.
- 2026-07-08: `PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:e2e:event` passed with elevated local-server permission, 8 event-mode tests and 5 event-layout tests.
- Note: default `/usr/local/bin/node` is v20.10.0 and cannot start Vitest/Rolldown because `node:util.styleText` is unavailable. Gates were run with the existing local Node 24 binary at `/opt/homebrew/opt/node@24/bin`.

### Completion Notes List

- Implemented a dark event-console roster board with `roster-board`, `roster-board-header`, `roster-board-title`, `roster-team-grid`, `roster-team-summary`, `roster-empty-team`, and `closed-rosters-view` anchors while preserving existing roster and drawer test IDs.
- Kept rosters read-only and derived from authoritative `teamRosters`; no domain command, API route, persistence write, close command, confirmation modal, dangerous-operation UI, action-log payload, undo behavior, or roster mutation was added.
- Added Closed phase display preparation: `Closed` defaults to `Final Rosters`, labels the status/header as `Auction Closed`, and exposes no routine live bidding controls. The Board tab remains selectable as a read-only panel without live commands.
- Broadened the shared display DTO only for roster rows: sold rows remain `{ acquisitionType: "Sold", soldPrice: number }`, and manual-assignment display rows are accepted as `{ acquisitionType: "ManualAssignment", soldPrice: null }`. `getSoldRosterRowsForTeam` still filters to sold rows for existing live-board logic.
- Added component/schema coverage for all-Team roster visibility, empty Teams, sold and assigned rows, privacy absence checks, Closed default-rosters behavior, Details drawer focus preservation, keyboard Board/Rosters navigation, and no-POST switching.
- Added focused Playwright roster layout coverage using route-mocked authoritative live and Closed states. Screenshots were captured after `document.fonts.ready` at 1440x900 and 1366x768; the live roster spec also asserts 390x844 stacking. 1920x1080 remains for Story 2.5.5's full visual QA target.
- Visual evidence inspected manually after rerun: compact logo placeholders and assigned-row labels no longer overlap; Closed screenshot shows `Final Rosters` and no live command strip.

### File List

- `_bmad-output/implementation-artifacts/2-5-4-redesign-rosters-and-closed-state-display.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/e2e/roster-layout.spec.ts`
- `apps/web/src/auction-board-helpers.ts`
- `apps/web/src/main.test.tsx`
- `apps/web/src/main.tsx`
- `apps/web/src/styles.css`
- `packages/shared/src/auction-state-contracts.test.ts`
- `packages/shared/src/index.ts`
- `playwright.event-layout.config.ts`

### Change Log

- 2026-07-08: Implemented Story 2.5.4 roster and Closed display redesign; added roster display DTO support for manual-assignment rows, component/schema coverage, and Playwright roster layout screenshots.
