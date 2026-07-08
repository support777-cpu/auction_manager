---
baseline_commit: 1f0b5dd
---

# Story 2.5.2: Redesign the Live Auction Board Layout

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want the live auction board to match the approved compact event-console layout,
so that Current Player, Current Bid, commands, and all Teams remain visible under live pressure.

## Acceptance Criteria

1. Given the auction is in Initial Auction with a Current Player, when the live board renders at 1440x900 and 1366x768, then the first viewport shows the top status counters, Current Player stage, dominant Current Bid, fixed command strip, selected Team state, Team matrix, and blocked reason area, and eight Team cards remain visible without pushing routine commands below the first viewport.
2. Given the live board renders top counters, when auction state changes, then ordered, revealed, pending, unsold, category, and team-count metrics update from authoritative state, and numeric changes use stable dimensions without shifting the command strip or Team matrix.
3. Given routine commands render, when commands are enabled, disabled, pending, or recently completed, then Next/Reveal, Bid Increment, Sold, Unsold, and Undo stay in a stable fixed-height command strip, and disabled controls do not disappear in a way that changes muscle memory.
4. Given Team cards render, when a Team is selected or blocked for the Current Player, then selected state uses the approved red treatment, and blocked Team reasons remain visible as text near the Team matrix and Mark Sold context.
5. Given the board renders private imported data, when DTOs, UI, logs, and snapshots are inspected, then the existing privacy allowlist remains enforced, and no redesign element introduces email, mobile, payment, transaction, source timestamp, or ignored source fields.
6. Given a developer finishes this story, when they run the story's Dev Gate, then live-board component tests, accessibility tests, existing Epic 2 command E2E tests, and Playwright screenshots at 1440x900 and 1366x768 pass.
7. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks first-viewport fit, command stability, selected/blocked Team readability, privacy, keyboard operation, and regression risk to reveal, bid, sold, unsold, and undo flows.

## Implementation Boundary

- This story is a layout and responsive-fit story for the existing live Auction Board. It may reshape React markup, CSS layout, component class names, visual hierarchy, accessibility labels, stable selectors, and tests for the board layout.
- Keep behavior unchanged. Do not alter domain rules, API routes, persistence, DTO schemas, command names, randomized order, undo semantics, privacy allowlists, roster derivation, or phase transitions.
- Build on Story 2.5.1's completed red/black event-console token work. Do not reintroduce the old green/gold primary live-board identity.
- Do not implement focused Manual Assignment or redesigned roster/closed-state scope here. Stories 2.5.3 and 2.5.4 own those surfaces.
- Do not satisfy the eight-Team acceptance criterion with only the current four-Team event-mode path. Add or reuse an eight-Team fixture or mocked state for the layout proof.
- Preserve all existing command handlers and stable test IDs unless a selector must be added for layout proof. If adding selectors, keep the existing IDs working.

## Tasks / Subtasks

- [x] Recompose the live board into the approved compact event-console structure. (AC: 1, 2, 3, 4)
  - [x] In `apps/web/src/main.tsx`, keep `AuctionBoard` as the owner of current live view state, but restructure the Board tab so it follows the mockup hierarchy: top counter band, left Current Player/Bid stage, fixed command strip below the stage, right Team matrix, and blocked reason/outcome area near the Team matrix.
  - [x] Keep `BoardRostersSwitch` before the Board/Rosters tab panels and preserve non-mutating view switching from Story 2.10.
  - [x] Split display structure from command handlers only where it improves layout clarity. Do not move domain validity logic into the UI.
  - [x] Preserve test IDs: `app-shell`, `live-status-counters`, `auction-board`, `live-board-stage`, `current-player-panel`, `current-player-name`, `current-bid`, `live-command-strip`, `increase-bid`, `reveal-next`, `mark-sold`, `mark-unsold`, `undo-action`, `mark-sold-blocked-reason`, `team-matrix`, `team-tile`, `team-tile-selected`, `board-rosters-switch`, and `team-detail-trigger`.

- [x] Replace the current three-item status grid with stable operational counters. (AC: 2)
  - [x] Render six compact counters on the live board: ordered, revealed, pending, unsold, category, and teams.
  - [x] Source ordered/revealed/pending/category from `boardState.phase1Progress`, unsold from `boardState.phase2PoolCount`, and teams from `boardState.teams.length`.
  - [x] Use tabular numbers and stable min/max dimensions so value changes do not move the stage, command strip, or Team matrix.
  - [x] Keep recovery/snapshot warning visible when `boardState.persistenceFailure` exists, but do not let it break the normal six-counter row; place it as a compact warning region below or beside the row if needed.

- [x] Make Current Player and Current Bid the dominant left-stage read. (AC: 1, 3)
  - [x] Use a dark `player-stage` style with photo/placeholder on the left and player name, role, base price, category, and Current Bid hierarchy on the right or below photo as the mockup requires.
  - [x] Current Bid must be the largest number in the board surface and use `live-red`; no other metric should use display-score scale.
  - [x] Use stable dimensions for player photo, placeholder, player facts, and bid area so missing photo, long names, and larger bid values do not shift commands.
  - [x] Do not scale font sizes with viewport width. Use fixed responsive sizes via media/container breakpoints and ensure long names and large bid values wrap or clamp professionally without overlap.

- [x] Implement the fixed-height command strip. (AC: 1, 3, 7)
  - [x] Keep Reveal/Next, Increase Bid, Mark Sold, Mark Unsold, and Undo in a single predictable command strip beneath the player stage on desktop.
  - [x] Preserve Story 2.5.1 command hierarchy: Reveal/Next as command red, Increase Bid as off-white/live button with red text and `+increment` chip, Sold/Unsold as secondary outcome controls unless product design explicitly requires a stronger state.
  - [x] Disabled and pending controls must keep their slot size and visible label. Loading text must not resize the strip or cause wrapping that pushes content below the viewport.
  - [x] Keep controls at least 44 CSS px high, keyboard reachable, visibly focused, and accessible by role/name.
  - [x] Keep Undo's accessible name behavior from Story 2.5.1; do not recreate the prior duplicate/unclear Undo label issue.

- [x] Rebuild the Team matrix for first-viewport density. (AC: 1, 4)
  - [x] Place the Team matrix on the right side of the live layout at desktop widths, using a dense two-column matrix that can show eight Teams in the first viewport at 1440x900 and 1366x768.
  - [x] Each Team card must show logo/placeholder, Team name, captain, remaining budget, squad count, and Current Player role capacity.
  - [x] Selected Team uses the approved command-red treatment, preserves `aria-pressed`, and remains readable in forced-colors/high-contrast contexts.
  - [x] Blocked Teams stay visible and readable. Do not hide blocked cards, make reasons hover-only, or rely on red alone.
  - [x] Keep Team detail triggers available without stealing the main tile's selection click behavior.

- [x] Move blocked and outcome copy into stable layout regions. (AC: 1, 3, 4)
  - [x] Keep blocked reasons visible near both the selected Team/Team matrix context and the Mark Sold context.
  - [x] Reserve space for blocked reason, command error, sale summary, unsold summary, and undo summary so transient messages do not jump the command strip or Team matrix.
  - [x] Use concise operational copy. Avoid explanatory paragraphs and marketing-style helper text on the live board.

- [x] Tighten responsive behavior for target viewports and narrow fallback. (AC: 1, 6, 7)
  - [x] For 1440x900 and 1366x768, the first viewport must show counters, player stage, dominant bid, command strip, selected Team state, Team matrix with eight Team cards, and blocked-reason area.
  - [x] For 1920x1080, preserve safe margins and avoid over-stretching text, buttons, or Team cards.
  - [x] For 390x844, stack in workflow order: counters, player, bid, command strip, Team matrix, blocked/outcome messages; operation can scroll but controls must not overlap.
  - [x] Keep page sections unframed except for actual live-board surfaces; avoid cards inside cards beyond repeated Team cards and metric cells.
  - [x] Do not add decorative orbs, bokeh, gradients as the main solution, animated celebration, or a landing/hero treatment.

- [x] Add component/accessibility coverage for the redesigned layout. (AC: 1, 2, 3, 4, 5, 6)
  - [x] Extend `apps/web/src/main.test.tsx` with an eight-Team board fixture or builder.
  - [x] Assert the six counters render from authoritative `boardState` values and update when mocked state changes.
  - [x] Assert the command strip keeps all expected controls by role/name and stable test IDs across enabled, disabled, pending, and blocked states.
  - [x] Assert selected and blocked Team states remain textual and accessible, including `aria-pressed` on selected Team tile and visible blocked reasons.
  - [x] Assert privacy-sensitive strings are absent from the board and Team matrix in the redesigned markup.
  - [x] Prefer Testing Library role/name/text queries for accessibility-facing behavior; use `data-testid` for dynamic layout anchors and privacy assertions that cannot be expressed semantically.

- [x] Add Playwright first-viewport and screenshot proof. (AC: 1, 5, 6)
  - [x] Extend `apps/web/e2e/event-mode.spec.ts` or add a focused event-mode spec that reaches a live board with a Current Player and eight Teams.
  - [x] Capture Playwright screenshots of the real app board at 1440x900 and 1366x768 after `document.fonts.ready`; name artifact paths in the Dev Agent Record.
  - [x] Add bounding-box assertions that eight visible Team cards, the command strip, current bid, and blocked-reason region fit inside the first viewport at both target sizes.
  - [x] Keep existing Epic 2 event-mode regressions passing: setup-to-start, reveal, select Team, increase bid, blocked sale, mark sold, mark unsold, roster switch, resume, undo, command-in-flight protection, keyboard operation, and live-board privacy where covered.

- [x] Run the story Dev Gate. (AC: 6)
  - [x] `npm run typecheck`
  - [x] `npm run test`
  - [x] `npm run test:e2e:event`
  - [x] Record screenshot artifact paths and first-viewport assertions in the Dev Agent Record.

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Epic `epic-2-5` in progress, Story 2.5.1 done, Story 2.5.2 `backlog` at story creation time, and Stories 2.5.3-2.5.5 still `backlog`.
- Current `HEAD` at story creation is `1f0b5dd` (`Story 2.5.1: Apply Red/Black Event Console Tokens and App Frame`).
- `git status --short` was clean at story creation.
- No `project-context.md` exists for the persistent-facts glob.
- Repo uses npm workspaces. Run scripts from the repository root.

### Files To UPDATE

- `apps/web/src/main.tsx` - reshape `AuctionBoard` live Board tab markup, counters, player/bid stage, command strip grouping, Team matrix placement, and stable message regions. Preserve handlers and DTO use.
- `apps/web/src/styles.css` - primary layout work: top counter band, two-column desktop live layout, fixed command strip, dense Team matrix, stable dimensions, responsive profiles, forced-colors/focus/overflow guards.
- `apps/web/src/main.test.tsx` - component/accessibility coverage for six counters, eight-Team matrix, command strip stability, blocked reasons, selected Team state, and privacy-safe rendering.
- `apps/web/e2e/event-mode.spec.ts` - real-app viewport screenshots and first-viewport assertions at 1440x900 and 1366x768, plus existing command regression preservation.
- `packages/test-fixtures` or local test builders - only if needed to create an eight-Team fixture for layout proof. Keep fixture changes narrow and reusable.

### Files To READ Before Editing

- `apps/web/src/main.tsx` - current `AuctionBoard`, `BoardRostersSwitch`, `TeamRostersView`, `TeamDetailDrawer`, command handlers, Lucide icon imports, and stable test IDs.
- `apps/web/src/styles.css` - Story 2.5.1 tokens, live shell overrides, current responsive blocks, command hierarchy, forced-colors handling, and overflow guards.
- `apps/web/src/main.test.tsx` - existing mocked-fetch patterns, `loadEligibleBoard`, live structural anchor test, Board/Rosters tests, blocked sale tests, and privacy assertions.
- `apps/web/e2e/event-mode.spec.ts` - existing event-mode setup/start/reveal/increase/sale/unsold/undo flow and `live-frame-1366x768.png` screenshot pattern.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/mockups/epic-2-redesign-review.html` plus `epic-2-redesign-review-1366.png` and `epic-2-redesign-review-1440.png` - authoritative hierarchy and target density.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` - red/black event-console tokens and component appearance.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md` - behavior, accessibility floor, responsive profiles, and live board component rules.

### Current Behavior Of Key UPDATE Files

- `apps/web/src/main.tsx` currently renders `AuctionBoard` inside `<main className="app-shell live-app-shell" data-testid="app-shell">`.
- Current live status counters are only `Current phase`, `Auction state`, and `Teams`, with an optional recovery warning. Story 2.5.2 must replace this with ordered/revealed/pending/unsold/category/teams.
- Current Board tab has `board-main` with `current-player-panel` and `bid-panel`, followed by `phase1-progress-panel`, then `team-board`. This means the Team matrix is below the stage instead of in the right-side first-viewport matrix required by the mockup.
- Current `bid-panel` owns both Current Bid and command controls. Story 2.5.2 should make command strip fixed-height and keep it visually connected to the player/bid stage without pushing Teams downward.
- Current `phase1-progress-panel` duplicates ordered/pending/revealed metrics that belong in the top counter band for this story. Keep any useful phase copy, but avoid a bulky second metric panel that competes with first-viewport fit.
- Existing Team tile markup already exposes `aria-pressed`, role capacity text, logo/placeholder, budget, squad, role count, and details trigger. Reuse and densify it instead of rebuilding Team state from scratch.
- `apps/web/src/styles.css` contains both pre-2.5 light board styles around `.auction-board` and Story 2.5.1 dark overrides under `.live-app-shell`. The new layout should consolidate the live-board behavior under the live shell without breaking setup.
- Existing Story 2.5.1 E2E captures `app-shell` screenshot at `live-frame-1366x768.png` after `document.fonts.ready`, but current event-mode setup appears to use four Teams. Add proof for eight Teams.

### Architecture Guardrails

- AD-2: `packages/domain` owns auction truth. This story must not decide sale validity, phase behavior, undo, role capacity, bid increment legality, or randomized order in the UI.
- AD-3: React may hold view/focus/pending-command state only. Every mutating command reconciles from server-authoritative state.
- AD-4: Existing command-oriented same-origin HTTP contracts remain unchanged.
- AD-8: Board, roster, logs, snapshots, and DOM must continue to exclude private imported fields: email, mobile, payment status, transaction ID, source timestamp, and ignored source fields.
- AD-11: UI changes require React Testing Library coverage plus Playwright smoke/screenshot evidence.
- AD-15: Rosters remain derived projections; do not create a client-side roster cache or mutate roster rows locally.

### UX Requirements For This Story

- Match the redesign mockup's live board structure: brand/phase block plus six counters at top, large Current Player/Bid stage on the left, dense right-side Team matrix, command strip directly under the stage, and blocked reason panel near Teams/outcome context.
- Keep eight Teams visible in the first viewport at 1440x900 and 1366x768.
- Current Bid remains the only display-score number and uses `live-red`.
- Replace instructional live-board clutter with operational metrics and concise blocked/outcome copy.
- Command controls remain stable, visible, keyboard reachable, and at least 44 CSS px in both dimensions.
- Board/Rosters switch remains navigation only; switching views must not POST or mutate auction state.
- Blocked reasons remain plain text, visible without hover, and close to the Team/Mark Sold decision point.
- Text must fit inside buttons, tiles, counters, and panels across 1440x900, 1366x768, 1920x1080, and 390x844. Avoid viewport-width font sizing; use stable type sizes and breakpoints.
- Use Lucide icons where already present or clearly helpful, but decorative icons must be `aria-hidden="true"` and controls need visible labels or explicit accessible names.

### Stable Test IDs To Preserve

| Test ID | Meaning |
| --- | --- |
| `app-shell` | App frame root |
| `live-status-counters` | Live top counter band |
| `auction-board` | Board tab panel |
| `live-board-stage` | Current player plus bid and command area |
| `current-player-panel` | Current Player stage |
| `current-player-name` | Current Player name |
| `current-bid` | Current Bid display |
| `live-command-strip` | Bid and routine command area |
| `increase-bid` | Bid increment control |
| `reveal-next` | Reveal Next Player control |
| `mark-sold` | Mark Sold control |
| `mark-unsold` | Mark Unsold control |
| `undo-action` | Undo control |
| `mark-sold-blocked-reason` | Visible blocked-sale reasons |
| `team-matrix` | Team matrix container |
| `team-tile` / `team-tile-selected` | Team selection tiles |
| `board-rosters-switch` | Board/Rosters navigation |
| `team-detail-trigger` | Read-only Team detail trigger |

### Previous Story Intelligence

- Story 2.5.1 completed the red/black token foundation and live shell. This story should consume those tokens, not invent a second token system.
- Story 2.5.1 review patches specifically fixed command hierarchy, display-score sizing, focus/overflow guards, hardcoded hex cleanup, forced-colors support, and screenshot font readiness. Do not regress those patches.
- Story 2.10 implemented Board/Rosters navigation, all-Team roster surface, and Team detail drawer. Keep those local view-state behaviors non-mutating.
- Story 2.9 completed Phase 1 Undo. Visual changes must not affect `canUndo`, `lastUndoAction`, undo pending state, keyboard `u`, or post-undo reconciliation.
- Story 2.8 added resume contracts and `teamRosters` to `BoardStateDto`; the redesigned board must render correctly immediately after resume.
- Stories 2.3-2.5 established Team tile selection and blocked sale reasons. Do not regress tile click selection, `aria-pressed`, visible capacity reasons, or exact blocked-reason behavior.

### Git Intelligence Summary

Recent commits:

- `1f0b5dd Story 2.5.1: Apply Red/Black Event Console Tokens and App Frame`
- `5159d9b Story 2.10: View Team Rosters During the Auction`
- `66be6db Story 2.9: Undo Phase 1 Live Actions`
- `9bb3024 Story 2.8: Persist and Resume Phase 1 Live State`
- `5a4298f Story 2.7: Mark Player Unsold Into Phase 2 Pool`

Pattern to follow: narrow vertical slice, reuse existing DTOs and helpers, component tests in `main.test.tsx`, helper tests only for pure logic, and event-mode Playwright coverage for user-visible flow. Do not introduce domain/persistence/API churn for a visual layout story.

### Latest Technical Information

- React docs list `19.2` as the latest React docs line and `v19.2.7` as a June 2026 release. The repo lockfile already resolves React/React DOM to 19.2.7, so do not upgrade React in this story. Source: https://react.dev/versions
- Playwright supports page screenshots, full-page screenshots, and element screenshots via `page.screenshot({ path })` and `locator(...).screenshot({ path })`. Use real-app screenshots for 1440x900 and 1366x768 evidence. Source: https://playwright.dev/docs/screenshots
- Testing Library recommends accessible role/name queries first and `data-testid` only where semantic queries do not fit. Keep tests aligned with user-facing accessibility while preserving stable layout anchors. Source: https://testing-library.com/docs/queries/about/
- Lucide React provides tree-shakable standalone React icon components. Continue named imports from `lucide-react`; keep icons decorative with `aria-hidden` when adjacent text names the control. Source: https://lucide.dev/guide/react
- Installed lockfile versions at story creation include React/React DOM 19.2.7, Lucide React 1.23.0, Tailwind CSS 4.3.2, Vite 8.1.3, TypeScript 6.0.3, Vitest 4.1.9, Playwright 1.61.1, and Testing Library React 16.3.2.

### Project Structure Notes

- The live UI is still concentrated in `apps/web/src/main.tsx`; this story may restructure `AuctionBoard` locally but should not start a broad component-library migration.
- CSS lives in `apps/web/src/styles.css`. Implement the layout there using existing tokens and scoped live-shell styles.
- Do not edit `apps/web/dist/` or generated build output.
- Screenshot artifacts should be produced by Playwright under ignored test output, not committed as generated binaries unless the project explicitly asks for committed visual artifacts.
- Event mode is one local Fastify process serving the built React app; no internet, Docker, hosted DB, or cloud deployment should be introduced.

### Dev Gate

Required before marking implementation complete:

- `npm run typecheck`
- `npm run test`
- `npm run test:e2e:event`

Dev Gate evidence must include:

- Component/accessibility tests for counters, command strip, selected Team, blocked Team reasons, privacy-safe rendering, and eight-Team matrix structure.
- Playwright screenshots of the real app live board at 1440x900 and 1366x768 after fonts settle.
- Bounding-box or equivalent assertions that eight Team cards, command strip, Current Bid, and blocked-reason region fit in the first viewport at both target sizes.
- Existing Epic 2 command flows still pass: resume, reveal, select Team, increase bid, blocked sale, Mark Sold, Mark Unsold, Undo, and roster switch where currently covered.
- No private imported fields appear in live board DOM, logs, snapshots, or DTOs.

### Review/Test Gate

Second-agent review must check:

- First-viewport fit at 1440x900 and 1366x768 with eight Teams, not just four.
- Command strip slots remain stable across enabled, disabled, pending, blocked, and summary states.
- Current Bid is dominant, Team cards remain dense/readable, and counters use stable tabular dimensions.
- Selected and blocked Team states are visible, textual, keyboard reachable, and accessible.
- React structure still calls existing command handlers and reconciles from authoritative DTO responses.
- Board/Rosters switch and Team detail drawer remain non-mutating.
- Privacy allowlist is preserved across board, Team matrix, roster switch, logs, and screenshots.
- Screenshot evidence comes from the real app surface, not only the static redesign mockup.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - UX-DR31 through UX-DR36 and Story 2.5.2 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-08-epic-2-ui-redesign.md` - Epic 2.5 scope and no-domain-change boundary]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md` - AD-2, AD-3, AD-4, AD-8, AD-11, AD-15, stack]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` - live board components, tokens, command hierarchy, typography]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md` - live board behavior, accessibility floor, responsive acceptance profiles]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/mockups/epic-2-redesign-review.html` and screenshots - target layout hierarchy]
- [Source: `_bmad-output/implementation-artifacts/2-5-1-apply-red-black-event-console-tokens-and-app-frame.md` - previous story learnings and review patches]
- [Source: `apps/web/src/main.tsx` - current `AuctionBoard`, counters, command strip, Team matrix, handlers, test IDs]
- [Source: `apps/web/src/styles.css` - Story 2.5.1 live-shell tokens and current layout styles]
- [Source: `apps/web/src/main.test.tsx` - component test patterns and existing structural anchor test]
- [Source: `apps/web/e2e/event-mode.spec.ts` - event-mode E2E and screenshot pattern]

### Open Questions

- None blocking. If adding an eight-Team event-mode fixture is unexpectedly expensive, implement the eight-Team first-viewport proof in component tests and document the E2E limitation explicitly, but do not mark AC #1 complete without some automated eight-Team layout evidence.

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- First-viewport E2E initially failed on scroll position and 1366x768 height overflow; resolved with scroll-to-top assertions and height-based compact CSS (`max-height: 920px` / `780px`).
- Isolated eight-team layout proof in `event-mode-layout.spec.ts` with dedicated Playwright config to avoid auction-state bleed between E2E suites.

### Completion Notes List

- Restructured `AuctionBoard` into compact event-console layout: six-counter top band, left player/bid stage, fixed five-control command strip, right two-column Team matrix, and stable outcome/blocked region.
- Replaced bulky phase-1 progress panel metrics with top counters while preserving `phase1-*` test IDs and phase status copy in the brand block.
- Added height/viewport responsive compaction so eight Team cards fit first viewport at 1440x900 and 1366x768 without hiding blocked reasons or command controls.
- Added `createEightTeamBoardState()` plus component tests for counters, command strip stability, blocked Team readability, and privacy-safe rendering.
- Added isolated Playwright layout spec with bounding-box first-viewport assertions and screenshots: `live-frame-1440x900-eight-teams.png`, `live-frame-1366x768-eight-teams.png` (Playwright test output artifacts).
- Dev Gate passed: `npm run typecheck`, `npm run test` (287 tests), `npm run test:e2e:event` (8 regression + 1 layout).

### File List

- apps/web/src/main.tsx
- apps/web/src/styles.css
- apps/web/src/main.test.tsx
- apps/web/e2e/event-mode.spec.ts
- apps/web/e2e/event-mode-layout.spec.ts
- playwright.event-layout.config.ts
- package.json
- _bmad-output/test-artifacts/sample-test-data/teams-eight-valid.csv
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-07-08: Code review patches — restored blocked team-matrix text at target viewports, fixed `live-board-stage` scope, deduplicated blocked outcome copy, strengthened tests/E2E viewport proof, a11y and layout compaction fixes.

### Review Findings

- [x] [Review][Patch] Team-matrix blocked text hidden at 1440×900/1366×768 via `display:none` on `.team-capacity-text` [apps/web/src/styles.css]
- [x] [Review][Patch] `live-board-stage` test ID no longer wrapped player + command strip per spec [apps/web/src/main.tsx]
- [x] [Review][Patch] Duplicate `team-capacity-reason` test IDs on tile vs selected-team list [apps/web/src/main.tsx]
- [x] [Review][Patch] Hardcoded `#fff1f2` on `.selected-team-tag` [apps/web/src/styles.css]
- [x] [Review][Patch] `reveal-next` missing `aria-busy` during loading [apps/web/src/main.tsx]
- [x] [Review][Patch] Player photo missing `onError` fallback [apps/web/src/main.tsx]
- [x] [Review][Patch] Eight-team unit test asserted 7 tiles without total-8 guard [apps/web/src/main.test.tsx]
- [x] [Review][Patch] Layout E2E omitted current-player stage, privacy, and blocked-reason viewport proof [apps/web/e2e/event-mode-layout.spec.ts]
- [x] [Review][Patch] No counter-update or persistence-warning coverage [apps/web/src/main.test.tsx]
- [x] [Review][Patch] Duplicate blocked copy in selected-team panel and `mark-sold-blocked-reason` [apps/web/src/main.tsx]
- [x] [Review][Patch] `aria-live="polite"` wrapper conflicting with nested `role="alert"` nodes [apps/web/src/main.tsx]
- [x] [Review][Patch] E2E blocked-bid assertion race between DOM bid and blocked message [apps/web/e2e/event-mode.spec.ts]
- [x] [Review][Defer] Phase 1 per-category breakdown grid removed — intentional per story layout scope [apps/web/src/main.tsx] — deferred, pre-existing design choice
- [x] [Review][Defer] 390×844 mobile viewport proof not automated [apps/web/e2e/event-mode-layout.spec.ts] — deferred, CSS stacking exists without dedicated Playwright profile
