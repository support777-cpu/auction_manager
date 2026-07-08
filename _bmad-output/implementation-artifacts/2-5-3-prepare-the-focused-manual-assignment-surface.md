---
baseline_commit: 91d4e4d
---

# Story 2.5.3: Prepare the Focused Manual Assignment Surface

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want the manual-assignment UI shell ready before Epic 3 implements assignment behavior,
so that Epic 3 can add domain commands into an approved, uncluttered surface.

## Acceptance Criteria

1. Given the app can render a Manual Assignment phase fixture or mocked authoritative state, when the Manual Assignment surface appears, then it follows the redesign structure: top assignment counters, assignment player card, assignment pool list, eligible Team matrix, bottom blocked-reason panel, and one primary assignment command, and routine bidding controls are hidden from this surface.
2. Given the assignment pool list renders, when unresolved Players are present, then each row shows order, Player name, and Role only, and no private imported fields are exposed.
3. Given eligible and blocked Teams render, when the operator selects a Team or a Team is invalid, then selected and blocked states match the redesigned Team matrix, and exact blocked reasons are visible as text outside hover-only UI.
4. Given Epic 3 domain behavior is not implemented yet, when this story is completed, then any fixture/demo state is isolated to tests, story fixtures, or development-only rendering paths, and no fake assignment mutation is added to production command behavior.
5. Given a developer finishes this story, when they run the story's Dev Gate, then component tests, accessibility tests, privacy checks, and Playwright screenshot coverage for the Manual Assignment surface pass.
6. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks that this is UI preparation only, no domain/persistence shortcuts were introduced, bidding controls are absent, and Epic 3 can wire real assignment state into the surface.

## Implementation Boundary

- This story is a UI shell and test-fixture story for the future Phase 3 Manual Assignment surface.
- It may add React composition, CSS classes, UI-only derived view helpers, stable selectors, component tests, accessibility tests, and Playwright screenshot proof for a mocked Manual Assignment state.
- It must not add production assignment command behavior, API routes, domain reducers, persistence writes, action-log payloads, undo semantics, schema migrations, or fake state mutations.
- The assignment command may render as the one primary visual command, but it must be disabled or inert until Epic 3 wires a real `AssignManualPlayer` command. Tests must prove clicking it does not POST or mutate state in this story.
- Use mocked authoritative state in tests by rendering `BoardStateDto` with `phase: "ManualAssignment"` and fixture-only assignment data derived from existing safe fields. Do not insert fake assignment records into local SQLite or event-mode seed data.
- Do not broaden `teamRosterDtoSchema` for assigned roster rows in this story. `teamRosterDtoSchema` currently accepts only `acquisitionType: "Sold"` roster rows; Epic 3 owns the shared DTO/schema expansion needed for real assigned roster projection.
- Reuse Story 2.5.1 and Story 2.5.2 event-console tokens, Team matrix density, focus treatment, blocked-reason language, and screenshot approach.
- Preserve existing Phase 1 live board behavior, command handlers, Board/Rosters switching, Team details, Undo, privacy allowlists, and stable test IDs.

## Tasks / Subtasks

- [x] Add a Manual Assignment rendering branch without changing live command behavior. (AC: 1, 4, 6)
  - [x] In `apps/web/src/main.tsx`, keep `AuctionBoard` as the post-setup surface owner, but render a dedicated Manual Assignment surface when `boardState.phase === "ManualAssignment"`.
  - [x] Keep the existing Board and Rosters surfaces for `InitialAuction`; do not move or rewrite `handleRevealNext`, `handleSelectTeam`, `handleIncreaseBid`, `handleMarkSold`, `handleMarkUnsold`, or `handleUndo`.
  - [x] Hide or omit `live-command-strip`, `reveal-next`, `increase-bid`, `mark-sold`, and `mark-unsold` from the Manual Assignment panel.
  - [x] Keep Undo visible only if the existing `canUndo(boardState)` contract allows it and no persistence failure exists; do not add Manual Assignment undo logic.
  - [x] Preserve `BoardRostersSwitch` as non-mutating navigation where it remains relevant; if Manual Assignment uses a focused phase surface, ensure switching views does not POST.

- [x] Build the focused Manual Assignment surface structure. (AC: 1, 2, 3)
  - [x] Add a top Manual Assignment counter band with six stable counters: Pool, Assigned, Remaining, Valid, Blocked, and Teams.
  - [x] Add an assignment player card that shows photo or placeholder, Player name, Role, and Base Price only.
  - [x] Add an assignment pool list where each row shows order number, Player name, and Role only. Do not render email, phone, payment status, transaction ID, source timestamps, or ignored source fields.
  - [x] Add an eligible Team matrix that reuses existing Team tile visual rules where possible: logo/placeholder, Team name, Captain, remaining budget, squad count, and current Player role capacity.
  - [x] Add a bottom blocked-reason panel that shows exact invalid Team reasons as persistent text, not hover-only copy and not color-only feedback.
  - [x] Add one primary assignment command labelled for the selected Team, for example `Assign to Falcons`, but keep it disabled or otherwise inert until Epic 3 adds real command wiring.

- [x] Keep fixture/demo state isolated and explicit. (AC: 1, 4)
  - [x] Add a test-only Manual Assignment `BoardStateDto` builder in `apps/web/src/main.test.tsx` or a colocated test helper. It may use `phase: "ManualAssignment"`, `currentPlayer` as the active assignment Player, `players` with safe `Unsold`/`Assigned` statuses for counters, and `teams[].currentPlayerCapacity` as fixture eligibility text.
  - [x] If Playwright needs app-level mocked state, intercept `/api/state` in the Playwright spec and fulfill a mocked auction response. Do not add a production URL flag, local DB seed, route, or server command solely for this story.
  - [x] Ensure assignment pool rows are derived from safe fixture fields already allowed on board/player DTOs: id, name, role, phase category, base price, status, sold price, winning team, and acquisition type. Never introduce private source fields in fixture data unless the test asserts they are absent from the rendered DOM.
  - [x] Do not add an `AssignManualPlayer` HTTP call, request schema, response schema, domain command, or persistence transaction in this story.

- [x] Style the Manual Assignment surface with the Epic 2.5 event-console system. (AC: 1, 3, 5)
  - [x] In `apps/web/src/styles.css`, add scoped classes for the Manual Assignment topbar, manual layout, assignment player card, pool list, assignment Team matrix, blocked panel, and assignment command.
  - [x] Reuse existing CSS variables from Story 2.5.1: `--surface-base`, `--surface-raised`, `--surface-muted`, `--surface-panel-soft`, `--ink-inverse`, `--ink-inverse-secondary`, `--command-red`, `--live-red`, `--border-subtle`, and `--focus-ring`.
  - [x] Keep dense desktop structure close to the mockup: left manual column for assignment player and pool, right matrix for eligible Teams, bottom blocked reason, stable primary command.
  - [x] Preserve readable fallback at 390x844 by stacking counters, assignment player, pool, command, Team matrix, and blocked reasons in workflow order.
  - [x] Do not add decorative backgrounds, gradients, celebratory animation, marketing copy, or instructional helper paragraphs to the live Manual Assignment surface.

- [x] Add component and accessibility coverage. (AC: 1, 2, 3, 4, 5)
  - [x] Extend `apps/web/src/main.test.tsx` to render the Manual Assignment fixture after resume and assert the Manual Assignment surface appears.
  - [x] Assert the top counters render Pool, Assigned, Remaining, Valid, Blocked, and Teams from fixture state.
  - [x] Assert bidding controls are absent from the Manual Assignment surface by test ID and accessible role/name: `increase-bid`, `reveal-next`, `mark-sold`, and `mark-unsold` must not be present.
  - [x] Assert assignment pool rows expose only order, Player name, and Role, and do not expose private strings such as `private-player@example.com`, phone numbers, payment status, transaction IDs, or source timestamps.
  - [x] Assert selected and blocked Team states are visible and accessible, including `aria-pressed` or an equivalent selected state for Team options and visible blocked reason text.
  - [x] Assert the assignment command is present as the one primary assignment command but is disabled or inert in this story.
  - [x] Assert clicking the inert assignment command does not call `/api/auction/*`, does not change local rendered assignment state, and does not mask the future Epic 3 command boundary.

- [x] Add Playwright screenshot coverage for the mocked Manual Assignment surface. (AC: 1, 3, 4, 5)
  - [x] Add `apps/web/e2e/manual-assignment-layout.spec.ts` or extend the existing isolated layout spec with a route-mocked Manual Assignment app state.
  - [x] Use Playwright request routing to fulfill `/api/state` with mocked authoritative Manual Assignment state and `/api/setup/auction-parameters` as needed; avoid changing server state or event-mode seed data.
  - [x] Capture screenshots after `document.fonts.ready` at 1440x900 and 1366x768; name artifact paths in the Dev Agent Record.
  - [x] Add viewport/bounding-box assertions that top counters, assignment player card, assignment pool, Team matrix, blocked-reason panel, and assignment command are visible and do not overlap at both target desktop sizes.
  - [x] Include a 390x844 narrow fallback assertion if practical; if not, cover the narrow stacking path in component/CSS tests and document the exception for Story 2.5.5 visual QA.

- [x] Run the story Dev Gate and update the story record. (AC: 5, 6)
  - [x] `npm run typecheck`
  - [x] `npm run test`
  - [x] `npm run test:e2e:event`
  - [x] Record screenshot artifact paths, mocked Manual Assignment fixture approach, and no-mutation evidence in the Dev Agent Record.

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Epic `epic-2-5` in progress, Stories 2.5.1 and 2.5.2 done, Story 2.5.3 `backlog` at story creation time, and Stories 2.5.4-2.5.5 still `backlog`.
- Current `HEAD` at story creation is `91d4e4d` (`Story 2.5.2: Redesign the Live Auction Board Layout`).
- `git status --short` was clean at story creation.
- No `project-context.md` exists for the persistent-facts glob.
- Repo uses npm workspaces. Run scripts from the repository root.

### Files To UPDATE

- `apps/web/src/main.tsx` - add the Manual Assignment render branch, assignment surface markup, test IDs, inert assignment command, selected Team UI state, and safe pool rendering. Preserve existing command handlers and live board behavior.
- `apps/web/src/styles.css` - add Manual Assignment layout and responsive styles using existing event-console tokens.
- `apps/web/src/main.test.tsx` - add Manual Assignment fixture builders and component/accessibility/privacy/no-mutation tests.
- `apps/web/e2e/manual-assignment-layout.spec.ts` or `apps/web/e2e/event-mode-layout.spec.ts` - add route-mocked Manual Assignment screenshot and viewport proof.
- `playwright.event-layout.config.ts` or a narrow companion config - only if needed to include the new manual-assignment layout spec in `npm run test:e2e:event` without polluting existing event-mode state.

### Files To READ Before Editing

- `apps/web/src/main.tsx` - current `AuctionBoard`, `BoardRostersSwitch`, `TeamRostersView`, `TeamDetailDrawer`, command handlers, `liveView`, `detailTeamId`, and stable test IDs.
- `apps/web/src/styles.css` - Story 2.5.1 tokens and Story 2.5.2 live layout classes.
- `apps/web/src/main.test.tsx` - existing mocked-fetch patterns, `createEligibleBoardState()`, `createEightTeamBoardState()`, blocked-state tests, structural anchor tests, and privacy assertions.
- `apps/web/src/auction-board-helpers.ts` - current phase guards and helper boundaries. Use helpers for display logic only; do not add domain rules here.
- `apps/web/e2e/event-mode-layout.spec.ts` - screenshot naming, first-viewport assertions, and isolated event-layout config pattern.
- `packages/shared/src/index.ts` - `auctionPhaseValues`, `BoardStateDto`, `boardTeamDtoSchema`, `teamRosterDtoSchema`, and acquisition types. Note that roster rows currently allow only `Sold`.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/mockups/epic-2-redesign-review.html` - Screen 2 Manual Assignment structure and target density.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` - event-console tokens and Manual Assignment component notes.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md` - Manual Assignment behavior, accessibility floor, responsive profiles, and no-random-assignment boundary.

### Current Behavior Of Key UPDATE Files

- `apps/web/src/main.tsx` currently renders `AuctionBoard` for any loaded auction state, with one Board/Rosters switch and a Board tab optimized for `InitialAuction`.
- Existing live command enablement is guarded by `apps/web/src/auction-board-helpers.ts`; `canRevealNextPlayer`, `canSelectTeam`, `canIncreaseBid`, `canAttemptMarkSold`, and `canAttemptMarkUnsold` all require `boardState.phase === "InitialAuction"`.
- `AuctionBoard` already derives selected Team, selected Team capacity, blocked sale reasons, command disabled states, and Team matrix card text from `BoardStateDto`.
- `BoardStateDto` already accepts phase `ManualAssignment`, but it does not yet contain a first-class assignment pool DTO, assign command result, or manual-assignment roster projection.
- `teamRosterDtoSchema` currently requires roster rows with `acquisitionType: "Sold"` and `soldPrice`; do not fake assigned roster rows in `teamRosters`.
- `apps/web/src/styles.css` now has the dark event-console shell, top counters, `live-layout`, `live-board-stage`, compact `team-board`, dense `team-tile`, and `live-outcome-region` from Story 2.5.2.
- `apps/web/src/main.test.tsx` already contains strong mocked-state patterns and eight-Team fixtures that can be adapted for Manual Assignment UI fixtures.
- `apps/web/e2e/event-mode-layout.spec.ts` already captures 1440x900 and 1366x768 layout screenshots and bounding-box proof using an isolated Playwright config.

### Architecture Guardrails

- AD-2: `packages/domain` owns auction truth. This story must not decide real assignment eligibility, phase transitions, assignment budget effects, undo semantics, or roster ownership in React.
- AD-3: React may hold view state, focus state, fixture rendering state, and pending-command affordances only. Real mutating commands must continue to reconcile from server-authoritative responses.
- AD-4: Existing same-origin command contracts remain unchanged. Do not add `/api/auction/assign-manual-player` in this story.
- AD-5: No SQLite transaction, action-log payload, or snapshot behavior is introduced here.
- AD-8: Board, roster, logs, snapshots, and DOM must continue to exclude private imported fields: email, mobile, payment status, transaction ID, source timestamp, and ignored source fields.
- AD-11: UI changes require React Testing Library coverage plus Playwright smoke/screenshot evidence.
- AD-14: Manual Assignment is separate from Unsold Bidding. This story prepares the Phase 3 surface only; it must not skip or collapse Epic 3's Phase 2 behavior.
- AD-15: Rosters remain derived projections. Do not create a client-side roster truth or manually append assigned Players to Team rosters.

### UX Requirements For This Story

- Match the redesign mockup's Manual Assignment hierarchy: topbar with six counters, left manual column, assignment player card, assignment pool list, one assignment command, right eligible Team matrix, selected Team tag, and bottom blocked reason.
- Assignment pool rows show only order, Player name, and Role.
- Eligible Team cards stay visible even when blocked. Blocked Teams are subdued but readable, and exact reasons appear in persistent text.
- Selected Team treatment must follow the approved red event-console style and expose accessible selected state.
- Routine bidding controls are not present on the Manual Assignment surface. No Increase Bid, Mark Sold, Mark Unsold, or Reveal Next command should appear there.
- Use concise operational copy only. Avoid explanatory paragraphs on the live surface.
- Text must fit inside counters, pool rows, Team cards, and buttons at 1440x900, 1366x768, 1920x1080, and 390x844. Do not scale font size with viewport width.
- Use Lucide icons where helpful, with `aria-hidden="true"` when decorative and visible text or `aria-label` for controls.

### Stable Test IDs To Preserve

| Test ID | Meaning |
| --- | --- |
| `app-shell` | App frame root |
| `live-status-counters` | Existing live top counter band for board layout |
| `auction-board` | Existing Board tab panel |
| `live-board-stage` | Existing Current player plus command area |
| `current-player-panel` | Existing Current Player stage |
| `current-player-name` | Existing Current Player name |
| `current-bid` | Existing Current Bid display |
| `live-command-strip` | Existing bid and routine command area, absent on Manual Assignment |
| `increase-bid` | Existing bid increment control, absent on Manual Assignment |
| `reveal-next` | Existing Reveal Next Player control, absent on Manual Assignment |
| `mark-sold` | Existing Mark Sold control, absent on Manual Assignment |
| `mark-unsold` | Existing Mark Unsold control, absent on Manual Assignment |
| `undo-action` | Existing Undo control where allowed |
| `team-matrix` | Existing Team matrix container |
| `team-tile` / `team-tile-selected` | Existing Team selection tiles |
| `board-rosters-switch` | Existing Board/Rosters navigation |

### New Stable Test IDs To Add

| Test ID | Meaning |
| --- | --- |
| `manual-assignment-surface` | Manual Assignment root surface |
| `manual-assignment-counters` | Pool, assigned, remaining, valid, blocked, teams counters |
| `manual-assignment-player-card` | Active assignment Player card |
| `manual-assignment-player-name` | Active assignment Player name |
| `manual-assignment-pool` | Assignment pool list |
| `manual-assignment-pool-row` | Assignment pool row, containing only order, name, role |
| `manual-assignment-team-matrix` | Eligible Team matrix |
| `manual-assignment-team-option` | Team option card |
| `manual-assignment-team-selected` | Selected Team option |
| `manual-assignment-team-blocked` | Blocked Team option |
| `manual-assignment-blocked-reason` | Persistent blocked-reason panel |
| `manual-assignment-command` | Primary inert assignment command |

### Previous Story Intelligence

- Story 2.5.2 intentionally excluded focused Manual Assignment and redesigned roster/closed-state scope. Do not fold Story 2.5.4 rosters or Closed display into this story.
- Story 2.5.2 established the dense red/black event-console shell, live top counters, `live-layout`, first-viewport screenshot proof, and eight-Team fixture patterns. Reuse those patterns for Manual Assignment.
- Story 2.5.2 review patches fixed hidden blocked text, `live-board-stage` scope, duplicate blocked copy, `aria-live`/`role=alert` conflicts, forced-colors/accessibility concerns, and screenshot font readiness. Do not regress those patterns.
- Story 2.5.1 established the token system and command hierarchy. Continue using CSS variables and do not introduce a second token palette.
- Story 2.10 implemented Board/Rosters navigation and Team detail drawer. Any Manual Assignment interaction with rosters or details must remain read-only and non-mutating.
- Stories 2.3-2.5 established Team tile selected state, `aria-pressed`, visible capacity reasons, and exact blocked-reason behavior. Manual Assignment Team options should reuse the same accessibility expectations.

### Git Intelligence Summary

Recent commits:

- `91d4e4d Story 2.5.2: Redesign the Live Auction Board Layout`
- `1f0b5dd Story 2.5.1: Apply Red/Black Event Console Tokens and App Frame`
- `5159d9b Story 2.10: View Team Rosters During the Auction`
- `66be6db Story 2.9: Undo Phase 1 Live Actions`
- `9bb3024 Story 2.8: Persist and Resume Phase 1 Live State`

Pattern to follow: narrow frontend slice, reuse existing DTOs/helpers, component tests in `main.test.tsx`, Playwright layout specs for screenshot proof, and no domain/persistence/API churn for a UI preparation story.

### Latest Technical Information

- React docs identify `19.2` as the latest React docs line and list `v19.2.7` as a June 2026 release. The architecture and installed dependencies already align to React/React DOM 19.2.7, so do not upgrade React in this story. Source: https://react.dev/versions
- Playwright supports page, full-page, and element screenshots through `page.screenshot({ path })` and `locator(...).screenshot({ path })`. Use screenshots for the mocked Manual Assignment surface and keep artifacts in Playwright output. Source: https://playwright.dev/docs/screenshots
- Testing Library recommends queries that resemble how users find elements, prioritizing accessible role/name before test IDs. Use roles and names for commands/team options, and reserve `data-testid` for layout anchors and privacy assertions. Source: https://testing-library.com/docs/queries/about/
- Lucide React provides standalone React icon components imported by name from `lucide-react`. Keep icons decorative with `aria-hidden` when adjacent text names the control. Source: https://lucide.dev/guide/react
- Installed package ranges at story creation include React/React DOM 19.2.7 in the architecture, `@playwright/test ^1.61.0`, `@testing-library/react ^16.3.2`, `lucide-react 1.23.0`, Tailwind CSS 4.3.x, Vite 8.1.x, TypeScript 6.0.x, and Vitest 4.1.x. Do not add dependencies for this story.

### Project Structure Notes

- The live UI is still concentrated in `apps/web/src/main.tsx`. A local Manual Assignment subcomponent in the same file is acceptable; a broad component-library extraction is out of scope.
- CSS lives in `apps/web/src/styles.css`. Add scoped Manual Assignment styles near the existing live-shell styles and responsive blocks.
- Do not edit `apps/web/dist/` or generated build output.
- Screenshot artifacts should be produced by Playwright under ignored test output, not committed as generated binaries.
- Event mode remains one local Fastify process serving the built React app. No internet, Docker, hosted database, account system, or separate display service should be introduced.

### Dev Gate

Required before marking implementation complete:

- `npm run typecheck`
- `npm run test`
- `npm run test:e2e:event`

Dev Gate evidence must include:

- Component/accessibility tests for Manual Assignment counters, assignment player card, pool list, Team matrix, selected Team state, blocked Team reasons, inert assignment command, and hidden bidding controls.
- Privacy checks proving private imported fields are absent from the Manual Assignment DOM and screenshots.
- No-mutation evidence proving the inert assignment command does not POST to `/api/auction/*` and does not change rendered state.
- Playwright screenshots of the mocked Manual Assignment surface at 1440x900 and 1366x768 after fonts settle.
- Existing Epic 2 command flows still pass through the current `npm run test:e2e:event` suite.

### Review/Test Gate

Second-agent review must check:

- This story remains UI preparation only: no domain command, API route, persistence write, action-log payload, DTO schema migration, or fake assignment mutation.
- Manual Assignment surface contains the approved structure and no routine bidding controls.
- Fixture/demo state is isolated to tests or mocked authoritative state, not production event data.
- Assignment pool rows expose only order, Player name, and Role.
- Selected/blocked Team states are visible, textual, keyboard reachable, and accessible.
- Blocked reasons are persistent text, not hover-only or color-only.
- Privacy allowlist is preserved across Manual Assignment DOM, tests, screenshots, and any mocked DTOs.
- Epic 3 can wire real assignment commands into the prepared surface without undoing this story's structure.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 2.5 boundary and Story 2.5.3 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-08-epic-2-ui-redesign.md` - Epic 2.5 redesign bridge scope and no-domain-change boundary]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md` - AD-2, AD-3, AD-4, AD-5, AD-8, AD-11, AD-14, AD-15, stack]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` - Manual Assignment component direction and event-console tokens]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md` - Manual Assignment behavior, state patterns, accessibility floor, responsive profiles]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/mockups/epic-2-redesign-review.html` - Screen 2 Manual Assignment target hierarchy]
- [Source: `_bmad-output/implementation-artifacts/2-5-2-redesign-the-live-auction-board-layout.md` - previous story guardrails, test IDs, review patches, layout proof patterns]
- [Source: `_bmad-output/implementation-artifacts/2-5-1-apply-red-black-event-console-tokens-and-app-frame.md` - token and command hierarchy learnings]
- [Source: `apps/web/src/main.tsx` - current `AuctionBoard`, command handlers, Board/Rosters switch, Team matrix, roster/drawer components]
- [Source: `apps/web/src/styles.css` - Story 2.5.1 and 2.5.2 event-console styles]
- [Source: `apps/web/src/main.test.tsx` - mocked-fetch patterns and board-state builders]
- [Source: `apps/web/e2e/event-mode-layout.spec.ts` - isolated screenshot/viewport proof pattern]
- [Source: `packages/shared/src/index.ts` - `BoardStateDto`, phase enum, team roster schema, acquisition types]
- [Source: React versions - https://react.dev/versions]
- [Source: Playwright screenshots - https://playwright.dev/docs/screenshots]
- [Source: Testing Library queries - https://testing-library.com/docs/queries/about/]
- [Source: Lucide React guide - https://lucide.dev/guide/react]

### Open Questions

- None blocking. The only implementation choice is whether to keep the Manual Assignment subcomponent in `main.tsx` for this story or extract it into a small local component file. Prefer the smallest change that keeps tests readable.

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Scoped compact-layout CSS to `.manual-app-shell` so hiding `board-rosters-switch` at short desktop heights does not break the live Initial Auction flow in default Playwright viewports.
- Added 4-column team grid compaction at `max-height: 920px` so the mocked Manual Assignment surface fits the 1366x768 first-viewport proof.

### Completion Notes List

- Added `ManualAssignmentSurface` in `apps/web/src/main.tsx`, branched from `AuctionBoard` when `boardState.phase === "ManualAssignment"`, with UI-only team selection state and an inert `manual-assignment-command`.
- Reused event-console tokens and Story 2.5.2 team tile patterns for counters, assignment player card, pool list, eligible team matrix, blocked-reason panel, and disabled assignment command.
- Added display-only helpers in `apps/web/src/auction-board-helpers.ts` for pool rows, counters, and blocked-reason copy.
- Added `createManualAssignmentBoardState()` plus component/accessibility/privacy/no-mutation tests in `apps/web/src/main.test.tsx`.
- Added route-mocked Playwright layout proof in `apps/web/e2e/manual-assignment-layout.spec.ts` and included it in `playwright.event-layout.config.ts`.
- Dev Gate passed: `npm run typecheck`, `npm run test` (293 tests), `npm run test:e2e:event` (11 tests).
- Playwright screenshot artifacts (generated under Playwright output): `manual-assignment-frame-1440x900.png`, `manual-assignment-frame-1366x768.png`.
- No domain commands, API routes, persistence writes, or fake assignment mutations were introduced.

### File List

- `apps/web/src/main.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/auction-board-helpers.ts`
- `apps/web/src/main.test.tsx`
- `apps/web/e2e/manual-assignment-layout.spec.ts`
- `playwright.event-layout.config.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-5-3-prepare-the-focused-manual-assignment-surface.md`

### Change Log

- 2026-07-08: Implemented Story 2.5.3 Manual Assignment UI shell, styles, tests, and Playwright layout proof without domain or persistence changes.
- 2026-07-08: Code review patches — synced local team selection with server state, aligned blocked/valid counters with blocked-reason logic, preserved blocked styling when selected, improved accessibility for pool rows and blocked panel, forced board view during Manual Assignment, strengthened component/e2e coverage.

### Review Findings

- [x] [Review][Patch] Local `selectedTeamId` drifted from authoritative server updates [`main.tsx:2523-2530`]
- [x] [Review][Patch] Valid/blocked counters disagreed with blocked-reason panel when capacity was missing [`auction-board-helpers.ts:150-168`]
- [x] [Review][Patch] Empty blocked capacity reasons rendered `"Team blocked: "` with no explanation [`auction-board-helpers.ts:184-186`]
- [x] [Review][Patch] Selected blocked teams lost blocked styling and test ID precedence [`main.tsx:2814-2829`]
- [x] [Review][Patch] Active assignment pool row lacked assistive current-row state [`main.tsx:2718-2726`]
- [x] [Review][Patch] Blocked-reason panel was not exposed to screen readers [`main.tsx:2874-2882`]
- [x] [Review][Patch] Manual Assignment could remain on Rosters view while switch was hidden in compact layout [`main.tsx:2964-2976`]
- [x] [Review][Patch] Missing tests for bidding anchors, pool forbidden fields, rosters non-mutation, helper edge cases, and desktop non-overlap [`main.test.tsx`, `auction-board-helpers.test.ts`, `manual-assignment-layout.spec.ts`]
- [x] [Review][Defer] No `onSelectTeam` / assign callback props on `ManualAssignmentSurface` — deferred to Epic 3 wiring [`main.tsx:2496-2910`] — Epic 3 owns command handler seams
- [x] [Review][Defer] Compact layout hides `board-rosters-switch` by design for first-viewport fit [`styles.css:2428-2430`] — intentional per Dev Agent Record; board view is now forced when rosters would trap the operator
