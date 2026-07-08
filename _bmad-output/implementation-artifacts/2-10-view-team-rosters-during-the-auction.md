---
baseline_commit: 66be6db
---

# Story 2.10: View Team Rosters During the Auction

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want to switch between the live board and current Team rosters,
so that captains and attendees can inspect bought Players without leaving Auction Manager.

## Acceptance Criteria

1. Given the auction is in a live phase, when the live surface renders, then a compact Board/Rosters switch is visible and keyboard reachable before the main surface content, and changing the switch never creates an auction state mutation.
2. Given the operator switches to Team rosters, when roster state renders, then every Team appears with logo or placeholder, Team name, Captain, remaining budget, squad count, role counts, and current roster, and empty Teams remain visible with `No players bought yet.`
3. Given a Team has bought Players, when roster rows render, then each row shows Player name, Role, acquisition type `Sold`, and Sold Price, and no private registration fields appear in roster DTOs or UI.
4. Given the operator opens a Team detail drawer from a Team tile, when the drawer renders, then it shows that Team's budget, squad, role counts, roster, and current capacity reasons, and the drawer is read-only during live flow.
5. Given the operator switches from Rosters back to Board, when the board renders, then the previous authoritative Current Player, Current Bid, selected Team, and next safe action are preserved, and no reveal, bid, sale, unsold, or undo command is triggered by the view switch.
6. Given a developer finishes this story, when they run the story's Dev Gate, then roster projection tests, roster DTO privacy tests, Board/Rosters switch component tests, Team roster accessibility tests, and typecheck pass, and an E2E or acceptance test proves sold Players appear in current Team rosters and switching views does not mutate auction state.
7. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks roster projection source-of-truth, privacy allowlist, accessibility, view-switch non-mutation behavior, unit/component/API tests, and the roster-view E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Implementation Boundary

- This story implements the **navigable roster UI** for Phase 1 (`InitialAuction`) live flow: Board/Rosters switch, all-Team roster surface, and read-only Team detail drawer.
- Backend roster projection already exists in `BoardStateDto.teamRosters` from Stories 2.6 and 2.8. **Do not add new domain commands, persistence commits, or API routes** unless a strict schema gap blocks the drawer (unlikely).
- View switching and drawer open/close are **local React view state only**. They must never call mutating routes, generate `clientCommandId`, or patch `boardState`.
- Do **not** implement Close Auction default roster surface (Story 4.3), Reset/Close dangerous operations, Phase 2/3 roster behavior beyond displaying current sold rows, Manual Assignment `Assigned` rows, or post-close routine-control disabling.
- Do **not** derive roster rows client-side from `boardState.players`. Render from authoritative `boardState.teamRosters` returned by the server.
- Team tile **primary click must keep selecting the bidding Team** (Stories 2.3–2.9). Open the detail drawer through a separate affordance on the tile (for example an info/details control) so selection behavior is not regressed.
- `acquisitionType` in domain state is `"Auction"` for sold players; roster DTO rows expose `acquisitionType: "Sold"` per `soldRosterRowSchema`. Display the DTO value, not the internal enum.

## Tasks / Subtasks

- [x] Add Board/Rosters view navigation (local state only). (AC: 1, 5, 6, 7)
  - [x] In `apps/web/src/main.tsx`, add a `liveView` state such as `"board" | "rosters"` scoped to the auction surface. Default to `"board"`.
  - [x] Render a compact two-option switch **before** the main board/roster content with stable test id `board-rosters-switch`.
  - [x] Use a segmented control or tablist pattern with visible labels `Board` and `Rosters`, `role="tablist"` / `role="tab"` / `aria-selected`, and keyboard navigation (Arrow keys between options, Enter/Space to activate).
  - [x] Switching views must not POST to any API, change `boardState`, or reset command in-flight state.
  - [x] When returning to Board, preserve Current Player, Current Bid, selected Team, command summaries/errors, and enabled/disabled control state exactly as before the switch.

- [x] Build the all-Team roster surface. (AC: 2, 3, 5, 6)
  - [x] Add a `TeamRostersView` component (in `main.tsx` or extracted file if size warrants) with stable test id `team-rosters-view`.
  - [x] Map `boardState.teamRosters` (not `boardState.players`) into one section per Team with test id `roster-team-section` (optionally suffix team id for multi-team tests).
  - [x] Each section shows logo/placeholder (reuse team tile asset pattern), Team name, Captain, remaining budget, squad count, full role counts (`Ace`, `Batting`, `Bowling`, `All Rounder`, `Girls`), and roster rows.
  - [x] Empty roster arrays render `No players bought yet.` inside the Team section; never hide empty Teams.
  - [x] Each player row uses test id `roster-player-row` and shows name, Role, acquisition type, and sold price. Copy acquisition type as `Sold` from the DTO.
  - [x] Keep phase label visible on the roster surface (for Phase 1: `Initial Auction`) using the same phase strip/status pattern as the board.
  - [x] Roster view is read-only: no reveal, bid, sale, unsold, undo, or team-selection controls.

- [x] Add read-only Team detail drawer. (AC: 4, 6, 7)
  - [x] Add drawer state `detailTeamId: string | null` local to the auction surface.
  - [x] On the **board** team tile grid, add a distinct details trigger per tile with test id `team-detail-trigger` that opens the drawer for that Team without changing `selectedTeamId`.
  - [x] Drawer container test id: `team-detail-drawer`; use `role="dialog"`, `aria-modal="true"`, labelled by Team name, focus trap while open, Escape to close, and restore focus to the triggering control on close.
  - [x] Drawer content sources:
    - Team summary from matching `boardState.teams` entry (budget, remaining budget, squad, role counts, logo).
    - Roster rows from matching `boardState.teamRosters` entry.
    - Capacity reasons from `team.currentPlayerCapacity` when a Current Player exists; when no Current Player, show neutral copy such as `Capacity pending Current Player` (match board tile tone).
  - [x] Drawer is read-only: no edit controls, no team selection side effects, no mutating commands.
  - [x] Optionally allow opening the same drawer from a roster Team section details control; keep behavior identical.

- [x] Align team tile sold-player display with authoritative projection. (AC: 3, 7)
  - [x] Replace or narrow the ad-hoc `boardState.players.filter(...)` sold-player inference in `AuctionBoard` team tiles if it is used only for display text; prefer `boardState.teamRosters.find(t => t.teamId === team.id)?.roster` for sold-count/summary text.
  - [x] Keep `currentPlayerCapacity` and selection behavior unchanged.

- [x] Add styles for roster navigation and surfaces. (AC: 1, 2, 3, 4, 6)
  - [x] In `apps/web/src/styles.css`, add classes for Board/Rosters switch, roster grid, `roster-team-section`, `roster-player-row`, and team detail drawer overlay/panel.
  - [x] Follow UX tokens from `DESIGN.md`: raised light Team sections, compact muted player rows, readable body text on 1440x900, 1366x768, 1920x1080, and 390x844 profiles.
  - [x] Place the switch before main content in DOM order for keyboard and screen-reader priority.

- [x] Add helper coverage if needed. (AC: 1, 5)
  - [x] In `apps/web/src/auction-board-helpers.ts`, add small pure helpers only if they reduce duplication, e.g. `getTeamRoster(boardState, teamId)` or `canSwitchLiveView(boardState)` (always true unless loading/error gates exist). Do not add command gating that blocks view switching during in-flight commands unless UX requires it; view switch must remain non-mutating.

- [x] Expand automated tests. (AC: 3, 5, 6, 7)
  - [x] `apps/web/src/main.test.tsx`: Board/Rosters switch visibility and keyboard activation; roster sections for all Teams; empty Team copy; sold player row after `createSoldBoardState()`; switch back preserves current player/bid/selected team; drawer opens from details trigger, shows capacity reasons, closes with Escape; view switch performs zero `fetch` POSTs.
  - [x] `apps/web/src/auction-board-helpers.test.ts`: any new helpers.
  - [x] `apps/web/e2e/event-mode.spec.ts`: after Mark Sold in the existing flow, switch to Rosters UI, assert sold player visible under winning Team, switch back to Board, assert Current Player/bid/selection unchanged, assert `/api/state` JSON unchanged aside from timestamps if polled (no new `lastSavedAction` from view switch alone).
  - [x] Reuse existing `packages/shared/src/auction-state-contracts.test.ts` and `apps/server/src/app.test.ts` roster projection/privacy tests; extend only if schema changes occur (not expected).

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Epic 2 `in-progress`, Stories 2.1–2.9 `done`, and Story 2.10 `backlog` at story creation time. This story creation updates 2.10 to `ready-for-dev`.
- Current `HEAD` at story creation is `66be6db` (`Story 2.9: Undo Phase 1 Live Actions`).
- `git status --short` shows in-flight Story 2.9 implementation artifacts; dev agent should branch from latest `HEAD` and treat 2.9 as merged baseline.
- No `project-context.md` exists for the persistent-facts glob.
- Repo uses npm workspaces. Run scripts from the root.

### Files To UPDATE

- `apps/web/src/main.tsx` — `liveView` state, Board/Rosters switch, `TeamRostersView`, team detail drawer, team tile details trigger, render branching between board and rosters.
- `apps/web/src/styles.css` — roster switch, roster grid/sections/rows, drawer styles.
- `apps/web/src/auction-board-helpers.ts` — optional roster lookup helpers.
- `apps/web/src/auction-board-helpers.test.ts` — helper tests if added.
- `apps/web/src/main.test.tsx` — switch, roster, drawer, non-mutation, accessibility tests.
- `apps/web/e2e/event-mode.spec.ts` — roster UI E2E after sale; view-switch non-mutation.

### Files To READ (likely no changes)

- `packages/shared/src/index.ts` — `teamRosterDtoSchema`, `soldRosterRowSchema`, `deriveSoldRosterRows`, `boardStateDtoSchema`.
- `packages/shared/src/auction-state-contracts.test.ts` — existing roster DTO privacy tests.
- `apps/server/src/app.ts` — `toBoardStateDto()` already maps `teamRosters`.
- `apps/server/src/app.test.ts` — reference patterns for post-sale and post-undo roster assertions.

Do not hand-edit `dist/` outputs.

### Current Behavior Of Key UPDATE Files

- `packages/shared/src/index.ts` defines `teamRosterDtoSchema` with `roster: soldRosterRowSchema[]` and `deriveSoldRosterRows(state, teamId)` filtering players where `winningTeamId === teamId && acquisitionType === "Auction" && soldPrice !== null`, mapping to DTO rows with `acquisitionType: "Sold"`. `boardStateDtoSchema` includes `teamRosters` on every board response. [Source: `packages/shared/src/index.ts`]
- `apps/server/src/app.ts` `toBoardStateDto()` builds `teamRosters` per team via `deriveSoldRosterRows`. All Phase 1 command responses and `GET /api/state` already return populated `teamRosters` after sales and empty arrays at start. [Source: `apps/server/src/app.ts`]
- `apps/web/src/main.tsx` renders `AuctionBoard` when `boardState` is set. `AuctionBoard` shows team tiles with selection on tile click, capacity from `team.currentPlayerCapacity`, and sold-player hint text derived locally from `boardState.players.filter(...)`. **`boardState.teamRosters` is never read in the UI today.** No Board/Rosters switch or drawer exists. [Source: `apps/web/src/main.tsx`]
- `apps/web/e2e/event-mode.spec.ts` asserts `teamRosters` via `/api/state` after sale/undo/resume but does not exercise a roster UI surface. [Source: `apps/web/e2e/event-mode.spec.ts`]
- `apps/web/src/main.test.tsx` fixtures (`createSoldBoardState`, `createEligibleBoardState`) already include realistic `teamRosters` arrays for component tests. [Source: `apps/web/src/main.test.tsx`]
- Deferred work explicitly assigns "Live roster list under team tiles" and full Board/Rosters UI to Story 2.10. [Source: `_bmad-output/implementation-artifacts/deferred-work.md`]

### Architecture Guardrails

- AD-3: React reconciles auction truth only from authoritative server responses. View switching must not create client-side auction truth.
- AD-8: Roster UI must render only allowlisted DTO fields. Never surface email, mobile, payment fields, source timestamps, filenames, or paths.
- AD-11: UI flow changes require React Testing Library component tests and Playwright event-mode coverage for roster view and non-mutation.
- AD-15: Rosters are derived projections from Player ownership. UI reads `teamRosters` from the server DTO; it must not maintain a separate roster cache or mutate roster rows locally.
- UX-DR27: Board/Rosters switch is navigation, not a command.
- UX-DR28/29: All-Team roster screen with empty copy and compact sold rows.
- UX-DR16: Team detail drawer is read-only inspection without leaving the board context.

### UX Requirements For This Story

- Board/Rosters switch sits before main surface content, compact, clearly labelled, and keyboard reachable.
- Roster surface is scan-friendly: all Teams visible at once in a grid of raised sections.
- Empty Teams stay visible with exact copy `No players bought yet.`
- Player rows are factual and compact: name, Role, `Sold`, price — no celebratory cards.
- Team detail drawer shows the same roster data plus live capacity reasons for the Current Player when applicable.
- Preserve projected-board hierarchy on Board view: Current Player + Current Bid first; team state second; routine controls third.
- Controls remain at least 44 CSS px with visible focus states (WCAG 2.2 AA target).
- Use calm operational copy; no exclamation marks or hype.

### Stable Test IDs (required)

| Test ID | Element |
|---------|---------|
| `board-rosters-switch` | Board/Rosters navigation control |
| `team-rosters-view` | All-Team roster surface container |
| `roster-team-section` | Per-Team roster section |
| `roster-player-row` | Per-Player roster row |
| `team-detail-trigger` | Opens drawer without selecting Team |
| `team-detail-drawer` | Read-only Team detail dialog |

Existing board test IDs (`auction-board`, `team-tile`, `current-player-name`, etc.) must keep working when Board view is active.

### Previous Story Intelligence

- Story 2.9 completed Phase 1 Undo. Roster projection restores correctly on undo; roster UI must reflect authoritative post-undo `teamRosters` without local cache. [Source: `2-9-undo-phase-1-live-actions.md`]
- Story 2.8 added `teamRosters` to `BoardStateDto` and resume contracts. Roster view should work immediately after resume without extra fetches beyond existing `boardState`. [Source: `2-8-persist-and-resume-phase-1-live-state.md`]
- Story 2.6 established sale → roster projection updates in API responses. UI roster view is the missing consumer. [Source: `2-6-mark-player-sold-and-update-team-state.md`]
- Story 2.3–2.5 established team tile selection and capacity display. Do not regress `onSelectTeam` or `aria-pressed` selection semantics. [Source: Stories 2.3–2.5 artifacts]

### Git Intelligence Summary

Recent commits:

- `66be6db Story 2.9: Undo Phase 1 Live Actions`
- `9bb3024 Story 2.8: Persist and Resume Phase 1 Live State`
- `199c57b Story 2.6: Mark Player Sold and Update Team State`

Pattern to follow: narrow vertical slice, strict reuse of existing DTOs, local view state only for navigation, React Testing Library component tests, then event-mode Playwright coverage. No new domain/persistence unless a schema gap is discovered.

### Latest Technical Information

- Node.js: keep repository `>=24 <25` engine constraint; no runtime upgrade for this story. Source: https://nodejs.org/en/about/previous-releases
- Fastify 5.9.x and Zod 4 strict schemas remain the API boundary pattern; this story should not add routes. Sources: https://fastify.dev/docs/latest/ , https://zod.dev/
- Playwright 1.61+ remains sufficient for E2E roster view tests. Source: https://playwright.dev/docs/release-notes
- React 19 / Testing Library patterns in `main.test.tsx` use `vi.resetModules()`, mocked `fetch`, and `data-testid` selectors — extend the same approach.

### Project Structure Notes

- All live auction UI currently lives in `apps/web/src/main.tsx` (~3000 lines). Extracting `TeamRostersView` / `TeamDetailDrawer` into sibling files is acceptable if it improves readability, but keep exports minimal and match existing single-file patterns unless extraction is clearly warranted.
- Asset URLs: player photos `/assets/players/{id}.webp`, team logos `/assets/teams/{id}.webp` with placeholder fallbacks — reuse board patterns.
- CSS lives in `apps/web/src/styles.css`; no Tailwind in runtime despite UX design references.

### Dev Gate

Required before marking implementation complete:

- `npm run typecheck`
- `npm run test`
- `npm run test:e2e:event`

Dev Gate must include evidence that:

- Sold Players appear in the roster UI under the correct Team after Mark Sold.
- Empty Teams show `No players bought yet.`
- Board ↔ Rosters switching performs no mutating API calls and preserves board bidding state.
- Team detail drawer is read-only and shows capacity reasons when a Current Player exists.
- Existing Phase 1 command, undo, and resume tests remain green.

### Review/Test Gate

Second-agent review must check:

- Roster UI reads `boardState.teamRosters`, not client-filtered `players`.
- View switch and drawer are local state only; no `clientCommandId`, no POST on navigation.
- Team tile selection behavior unchanged; drawer uses separate trigger.
- Privacy allowlist preserved in rendered roster UI (no private fields in DOM).
- Accessibility: tablist/switch keyboard support, dialog focus trap, 44px targets, visible focus.
- Stable test IDs present and covered by component + E2E tests.
- No scope creep into Close Auction default roster, Phase 2/3 assignment rows, or dangerous operations.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 2.10 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md` — AD-3, AD-8, AD-11, AD-15]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md` — Board/Rosters peer surfaces, drawer, empty roster state]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` — roster-team-section, roster-player-row tokens]
- [Source: `packages/shared/src/index.ts` — `teamRosterDtoSchema`, `deriveSoldRosterRows`]
- [Source: `apps/server/src/app.ts` — `toBoardStateDto()`]
- [Source: `_bmad-output/implementation-artifacts/2-9-undo-phase-1-live-actions.md` — undo restores roster projection]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` — roster UI explicitly deferred to 2.10]

### Open Questions

- None blocking. If team tile click vs. drawer trigger UX is ambiguous during implementation, prefer a separate `team-detail-trigger` control to preserve bidding selection (documented above).

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

### Completion Notes List

- Added `liveView` and `detailTeamId` local state inside `AuctionBoard` with a keyboard-accessible `board-rosters-switch` tablist placed before board/roster content.
- Built `TeamRostersView` rendering authoritative `boardState.teamRosters` with empty-team copy, sold rows, and read-only roster surface.
- Added `TeamDetailDrawer` with focus trap, Escape close, focus restore, and separate `team-detail-trigger` controls that do not change `selectedTeamId`.
- Replaced client-side `players.filter` sold inference on team tiles with `getSoldRosterRowsForTeam` from `teamRosters`.
- Added roster helpers (`getTeamRoster`, `canSwitchLiveView`, `formatAuctionRoleLabel`, `formatRoleCountsSummary`, `getTeamCapacityCopy`, `getSoldRosterRowsForTeam`) and CSS for switch, roster grid, rows, and drawer.
- Dev Gate green: `npm run typecheck`, `npm run test` (281 passed), `npm run test:e2e:event` (8 passed).

### File List

- apps/web/src/main.tsx
- apps/web/src/styles.css
- apps/web/src/auction-board-helpers.ts
- apps/web/src/auction-board-helpers.test.ts
- apps/web/src/main.test.tsx
- apps/web/e2e/event-mode.spec.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-07-08: Implemented Board/Rosters navigation, all-team roster surface, read-only team detail drawer, authoritative roster projection in UI, helper coverage, and component/E2E tests.
- 2026-07-08: Code review patches applied — drawer focus restore from roster view, drawer cleared on view switch, persistence-failure recovery, tab/tabpanel a11y, empty capacity fallback, and expanded tests.

### Review Findings

- [x] [Review][Patch] Roster-view drawer did not restore focus to triggering control [apps/web/src/main.tsx:2276] — fixed by passing trigger element through `handleOpenTeamDetail`
- [x] [Review][Patch] Drawer remained open when switching Board/Rosters views [apps/web/src/main.tsx:2613] — fixed by clearing `detailTeamId` in `handleLiveViewChange`
- [x] [Review][Patch] Stale `detailTeamId` when team/roster missing [apps/web/src/main.tsx:2382] — fixed with auto-close effect in `TeamDetailDrawer`
- [x] [Review][Patch] Blank capacity copy when `reasons` array empty [apps/web/src/auction-board-helpers.ts:53] — added fallback `"Cannot buy current player"`
- [x] [Review][Patch] Keyboard nav bypassed disabled switch during persistence failure [apps/web/src/main.tsx:2137] — guard at start of `handleKeyDown`
- [x] [Review][Patch] Operator trapped on Rosters view during persistence failure [apps/web/src/main.tsx:2514] — reset to Board via `useEffect`
- [x] [Review][Patch] Tab/tabpanel ARIA linkage missing [apps/web/src/main.tsx:2157] — added `aria-controls`, `role="tabpanel"`, Home/End keys
- [x] [Review][Patch] No test for roster-view drawer path [apps/web/src/main.test.tsx:870] — added roster drawer focus-restore and view-switch close tests
- [x] [Review][Patch] `getTeamCapacityCopy` lacked direct unit coverage [apps/web/src/auction-board-helpers.test.ts:446] — added capacity copy tests
- [x] [Review][Defer] DOM-level roster privacy allowlist test [apps/web/src/main.test.tsx] — deferred, pre-existing; relies on shared contract tests
- [x] [Review][Defer] Full enabled/disabled control-state preservation test [apps/web/src/main.test.tsx] — deferred, pre-existing gap beyond AC5 minimum
