---
baseline_commit: 5159d9b
---

# Story 2.5.1: Apply Red/Black Event Console Tokens and App Frame

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want the live app to use the approved event-console visual system,
so that the board feels purpose-built for the room before unsold-player workflows are added.

## Acceptance Criteria

1. Given the app renders any post-setup live surface, when the visual shell loads, then it uses the red/black event-console tokens from `DESIGN.md`, and it no longer presents the earlier green/gold live-board palette as the primary Epic 2+ experience.
2. Given common live surfaces render, when colors, borders, radii, typography, and spacing are inspected, then they match the structural hierarchy of `mockups/epic-2-redesign-review.html`, and command red, live red, off-white text, dark raised panels, and compact metric cells are used consistently.
3. Given controls use icons, when buttons render, then Lucide icons are used where available, and icon-only affordances have accessible names or adjacent visible labels according to the UX accessibility floor.
4. Given a developer finishes this story, when they run the story's Dev Gate, then build, typecheck, component tests for tokenized shell/components, and at least one Playwright screenshot capture of the live frame pass.
5. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks design-token consistency, accessibility names, visual drift from the redesign mockup, and regression risk to existing Epic 2 behavior.

## Implementation Boundary

- This story is the **visual foundation** for Epic 2.5: CSS tokens, global post-setup app frame, live-board surface colors, command/bid button color system, focus rings, panel tones, radii, typography, and icon treatment.
- Keep behavior unchanged. Do **not** alter domain rules, API routes, persistence, DTO schemas, command names, randomized order, undo semantics, privacy allowlists, roster derivation, or phase transitions.
- Do **not** complete Story 2.5.2's full compact first-viewport layout rebuild. It is acceptable to prepare reusable classes/tokens, but do not claim eight-Team first-viewport fit unless Story 2.5.2 implements and tests it.
- Do **not** build Manual Assignment or Closed roster behavior in production. Later Epic 2.5 stories own those surfaces.
- Setup surfaces may remain light and checklist-like; Epic 2+ post-setup live/roster surfaces must move away from the prior green/gold primary palette.
- Preserve all existing stable test IDs and behaviors from Epic 2, especially `auction-board`, `live-command-strip`, `increase-bid`, `reveal-next`, `mark-sold`, `mark-unsold`, `undo-action`, `team-matrix`, `team-tile`, `board-rosters-switch`, and roster/drawer IDs from Story 2.10.

## Tasks / Subtasks

- [x] Introduce event-console design tokens in `apps/web/src/styles.css`. (AC: 1, 2)
  - [x] Add CSS variables for the authoritative tokens from `DESIGN.md`: `surface-base #08090B`, `surface-raised #111318`, `surface-muted #191C22`, `surface-panel-soft #22262E`, `ink-inverse #F9FAFB`, `ink-inverse-secondary #D1D5DB`, `command-red #E01F2D`, `command-red-strong #AF121F`, `live-red #FF3347`, `border-subtle #30343D`, `border-strong #4B5563`, and `focus-ring #FF3347`.
  - [x] Keep light setup variables separate so setup import/review forms are not accidentally darkened.
  - [x] Prefer token references over repeated hex values for post-setup surfaces. Leave old green/gold only where setup/success semantics still need it.
  - [x] Set live-surface radii to tight `4px`, `6px`, or `8px`; avoid introducing oversized rounded cards.

- [x] Apply the dark event-console app frame to post-setup surfaces. (AC: 1, 2)
  - [x] In `apps/web/src/main.tsx`, make `AuctionBoard` render inside a dark event-console shell while preserving existing React state, handlers, and command wiring.
  - [x] In `apps/web/src/styles.css`, update `.app-shell` and/or a scoped live shell class so auction/resume live surfaces use the black frame without forcing setup screens into dark mode unless explicitly intended.
  - [x] Keep phase strip, Board/Rosters switch, board, roster, and drawer surfaces visually coherent under the new frame.
  - [x] Ensure critical content remains inside safe gutters for 1440x900, 1366x768, and 1920x1080.

- [x] Retokenize existing live-board components. (AC: 1, 2)
  - [x] Update `.auction-board`, `.board-main`, `.current-player-panel`, `.bid-panel`, `.phase1-progress-panel`, `.team-board`, `.team-tile`, `.selected-team-panel`, `.undo-panel`, `.blocked-reason-panel`, `.team-rosters-view`, `.roster-team-section`, `.roster-player-row`, and `.team-detail-drawer` styles to the red/black event-console hierarchy.
  - [x] Change primary routine live actions from green to `command-red`; change Current Bid and bid-changing emphasis from gold/brown to `live-red`.
  - [x] Use dark raised panels and compact metric cells for phase progress, current player facts, bid state, Team stats, and roster counts.
  - [x] Preserve blocked/error states as textual red-alert panels; blocked reasons must remain visible text, not color-only signals.
  - [x] Use `font-variant-numeric: tabular-nums` for bid, budget, squad, role counts, and progress counters.

- [x] Align Lucide icon usage and accessible names. (AC: 3)
  - [x] Continue using existing Lucide React imports for visible command icons where available; add icons only when they clarify a control.
  - [x] Every decorative icon must be `aria-hidden="true"` with adjacent visible text.
  - [x] Any icon-only control, if introduced, must have an explicit `aria-label`; prefer visible label text for live-board controls.
  - [x] Keep button labels stable during loading/disabled states where possible so controls do not jump.

- [x] Add focused component/unit coverage for tokenized shell behavior. (AC: 1, 3, 4)
  - [x] Extend `apps/web/src/main.test.tsx` to assert resumed auction/live board renders in the event-console shell and still exposes the existing command controls.
  - [x] Add assertions that visible controls with Lucide icons retain accessible names (`Reveal Next Player`, `Undo`, details, etc.).
  - [x] Add regression coverage that Board/Rosters switch, Team details, Mark Sold blocked reasons, and command disabled states still render after the visual retokening.
  - [x] If helper changes are needed, keep them small and cover them in `apps/web/src/auction-board-helpers.test.ts`.

- [x] Add Playwright screenshot proof for the live frame. (AC: 2, 4)
  - [x] Extend `apps/web/e2e/event-mode.spec.ts` or add a focused e2e spec that starts/resumes a live auction state and captures at least one screenshot artifact of the live frame.
  - [x] Capture at minimum the 1366x768 or 1440x900 live frame; if practical, capture both because later stories rely on those viewports.
  - [x] Use Playwright `page.screenshot({ path })` or `locator.screenshot({ path })`; store artifacts in an ignored test output path, not committed `dist/`.
  - [x] Assert the board still renders and core controls are visible before capturing the screenshot.

- [x] Run the story Dev Gate. (AC: 4)
  - [x] `npm run typecheck`
  - [x] `npm run test`
  - [x] `npm run test:e2e:event`
  - [x] Record screenshot artifact path(s) and gate results in the Dev Agent Record.

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Epic 2 complete, Epic 2.5 newly started by story creation, Story 2.5.1 `ready-for-dev`, and Stories 2.5.2-2.5.5 still `backlog`.
- Current `HEAD` at story creation is `5159d9b` (`Story 2.10: View Team Rosters During the Auction`).
- `git status --short` already shows in-flight edits in `apps/web` and planning/status files. Treat those as the current user/worktree baseline; do not revert unrelated changes.
- No `project-context.md` exists for the persistent-facts glob.
- Repo uses npm workspaces. Run scripts from the root.

### Files To UPDATE

- `apps/web/src/styles.css` - primary implementation file for tokens, live shell, post-setup dark frame, live-board panels, command colors, roster/drawer retokening, responsive fit, focus ring.
- `apps/web/src/main.tsx` - likely small structural/class updates only; preserve existing handlers, local state, command wiring, test IDs, and component boundaries.
- `apps/web/src/main.test.tsx` - component/regression tests for shell, accessible control names, blocked reasons, and existing live controls after retokening.
- `apps/web/e2e/event-mode.spec.ts` - live-frame screenshot capture and regression assertions.
- `apps/web/src/auction-board-helpers.ts` / `apps/web/src/auction-board-helpers.test.ts` - only if a small helper is needed; avoid cosmetic helper churn.

### Files To READ Before Editing

- `apps/web/src/main.tsx` - current `AuctionBoard`, `LiveViewSwitch`, `TeamRostersView`, `TeamDetailDrawer`, command handlers, Lucide icon imports, and test IDs.
- `apps/web/src/styles.css` - current green/gold/light palette, board/roster/drawer styles, responsive blocks.
- `apps/web/src/main.test.tsx` - existing fixtures and mocked-fetch patterns.
- `apps/web/e2e/event-mode.spec.ts` - event-mode flow and existing setup/start/resume patterns.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/mockups/epic-2-redesign-review.html` - authoritative structural hierarchy for the redesign.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` - tokens and component appearance.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md` - behavior, accessibility floor, and responsive profiles.

### Current Behavior Of Key UPDATE Files

- `apps/web/src/main.tsx` currently imports Lucide icons (`CheckCircle2`, `Circle`, `AlertCircle`, `FileWarning`, `Info`, `ListChecks`, `PlayCircle`, `RotateCcw`, `Upload`) and uses React local state for setup, resume, live board commands, Board/Rosters view, and Team detail drawer.
- `AuctionBoard` already renders the Board/Rosters switch before the board/roster content, exposes `live-command-strip`, uses command handlers passed from `App`, and stores `liveView`/`detailTeamId` locally.
- `TeamRostersView` and `TeamDetailDrawer` already exist from Story 2.10 and read authoritative `boardState.teamRosters`; this story should retoken them, not replace them.
- `apps/web/src/styles.css` still has the old primary live palette in many places: setup and live surfaces use light backgrounds, `.primary-action` is green (`#136f45`), `.live-action` and Current Bid use gold/brown (`#fff7e0`, `#9a5b00`, `#5f3700`), focus ring is gold (`#f5b841`), and board panels are mostly white.
- Existing helper functions in `apps/web/src/auction-board-helpers.ts` already centralize role labels, roster lookup, live view gating, Team capacity copy, and live command enablement. Do not move visual/token logic into helpers.

### Architecture Guardrails

- AD-2: `packages/domain` owns auction truth. This story must not decide sale validity, phase behavior, undo, role capacity, or randomized order in the UI.
- AD-3: React may hold view/focus/pending-command state only. Every mutating command reconciles from server-authoritative state.
- AD-4: Existing command-oriented same-origin HTTP contracts must remain unchanged.
- AD-8: Board, roster, logs, snapshots, and DOM must continue to exclude private imported fields: email, mobile, payment status, transaction ID, source timestamp, ignored source fields.
- AD-11: UI changes need React Testing Library coverage plus Playwright smoke/screenshot evidence.
- AD-15: Rosters remain derived projections; do not create a client-side roster cache or mutate roster rows locally.

### UX Requirements For This Story

- Live/post-setup surfaces use the red/black event-console direction: black canvas, dark raised panels, off-white text, command red for primary routine actions, live red for Current Bid and bid-changing emphasis.
- The prior green/gold palette must no longer read as the primary Epic 2+ experience. Green can remain for setup readiness or committed success, but not for live command identity.
- Current Bid remains the dominant number. Do not give every metric scoreboard-scale typography.
- Command strip controls remain stable, visible, keyboard reachable, and at least 44 CSS px in both dimensions.
- Board/Rosters switch remains navigation, not a command; switching views must not mutate auction state or POST.
- Blocked reasons remain plain text near the Team/Mark Sold context and must not become hover-only.
- Lucide icons are acceptable only when they improve scan speed; icons do not replace accessible text unless the control has a robust accessible name.
- Text must fit inside buttons, tiles, panels, and roster rows at 1440x900, 1366x768, 1920x1080, and narrow fallback 390x844.
- Do not add decorative orbs, gradients, bokeh, celebratory animation, or marketing-style hero composition.

### Stable Test IDs To Preserve

| Test ID | Meaning |
| --- | --- |
| `app-shell` | App frame root |
| `auction-board` | Board tab panel |
| `live-board-stage` | Current player + bid/command area |
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
| `team-rosters-view` | Roster surface |
| `roster-team-section` | Per-Team roster card |
| `roster-player-row` | Per-Player roster row |
| `team-detail-trigger` | Read-only detail trigger |
| `team-detail-drawer` | Team detail dialog |

### Previous Story Intelligence

- Story 2.10 implemented Board/Rosters navigation, all-Team roster surface, and Team detail drawer. This story must keep those local view-state behaviors non-mutating and retoken the surfaces rather than rebuilding their behavior.
- Story 2.9 completed Phase 1 Undo. Visual changes must not affect `canUndo`, `lastUndoAction`, undo pending state, or post-undo reconciliation.
- Story 2.8 added resume contracts and `teamRosters` to `BoardStateDto`; the dark frame must render correctly immediately after resume.
- Story 2.6 established sale-to-roster projection. Roster retokening must keep using `boardState.teamRosters`.
- Stories 2.3-2.5 established Team tile selection and blocked sale reasons. Do not regress tile click selection, `aria-pressed`, or exact blocked-reason visibility.

### Git Intelligence Summary

Recent commits:

- `5159d9b Story 2.10: View Team Rosters During the Auction`
- `66be6db Story 2.9: Undo Phase 1 Live Actions`
- `9bb3024 Story 2.8: Persist and Resume Phase 1 Live State`
- `5a4298f Story 2.7: Mark Player Unsold Into Phase 2 Pool`
- `199c57b Story 2.6: Mark Player Sold and Update Team State`

Pattern to follow: narrow vertical slice, reuse existing DTOs and helpers, component tests in `main.test.tsx`, helper tests only for pure logic, and event-mode Playwright coverage for user-visible flow. Do not introduce domain/persistence/API churn for a visual story.

### Latest Technical Information

- React docs identify React `19.2` as the current major/minor docs line and list `v19.2.7` as a June 2026 release. The repo lockfile already resolves `react` and `react-dom` to `19.2.7`; do not upgrade React in this story. Source: https://react.dev/versions
- Lucide React remains the existing icon package (`lucide-react 1.23.0` in the lockfile). Keep importing named icons from `lucide-react`; use `aria-hidden` for decorative icons and labels/`aria-label` for control names. Source: https://lucide.dev/guide/react
- Tailwind CSS v4 supports design tokens via CSS theme variables and also emits regular CSS variables for token reuse. This repo currently uses custom CSS in `styles.css`; if using Tailwind `@theme`, keep tokens top-level and avoid disruptive framework migration. Source: https://tailwindcss.com/docs/theme
- Playwright supports `page.screenshot({ path })`, full-page screenshots, and element screenshots. Use this for the required live-frame artifact instead of committing generated `dist/` output. Source: https://playwright.dev/docs/screenshots
- Installed lockfile versions at story creation: React/React DOM 19.2.7, Lucide React 1.23.0, Tailwind CSS 4.3.2, Vite 8.1.3, TypeScript 6.0.3, Vitest 4.1.9, Playwright 1.61.1.

### Project Structure Notes

- The live UI is still concentrated in `apps/web/src/main.tsx`; for this story, className additions or a small wrapper are safer than broad component extraction.
- CSS lives in `apps/web/src/styles.css`. This story should improve tokenization there without adding a new component library.
- Do not edit `apps/web/dist/` or generated build output.
- Screenshot artifacts should be produced by tests under Playwright output or another ignored artifact path.
- Event mode is one local Fastify process serving the built React app; no internet, Docker, hosted DB, or cloud deployment should be introduced.

### Dev Gate

Required before marking implementation complete:

- `npm run typecheck`
- `npm run test`
- `npm run test:e2e:event`

Dev Gate evidence must include:

- Existing Epic 2 command flows still pass: resume, reveal, select Team, increase bid, blocked sale, Mark Sold, Mark Unsold, Undo, and roster view where currently covered.
- Component tests prove the tokenized shell still exposes accessible live controls and visible blocked reasons.
- At least one Playwright screenshot artifact for the live frame exists and is named in completion notes.
- No privacy fields appear in live board or roster DOM.

### Review/Test Gate

Second-agent review must check:

- Post-setup surfaces use the `DESIGN.md` red/black tokens consistently and no old green/gold primary live identity remains.
- CSS changes are scoped so setup remains usable and light unless intentionally changed.
- Lucide icons do not create unlabeled controls or duplicate confusing accessible names.
- Existing command handlers, DTO usage, Board/Rosters switch, Team details, roster projection, undo, and blocked-sale behavior are unchanged.
- Screenshot evidence is from the real app surface, not only the static redesign mockup.
- No generated `dist/` files or screenshot binaries are accidentally committed unless the project explicitly tracks them.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 2.5 boundary and Story 2.5.1 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-08-epic-2-ui-redesign.md` - redesign bridge scope and no-domain-change boundary]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md` - AD-2, AD-3, AD-4, AD-8, AD-11, AD-15, stack]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` - authoritative red/black tokens and component appearance]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md` - accessibility floor, live board behavior, responsive profiles]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/mockups/epic-2-redesign-review.html` - visual hierarchy reference]
- [Source: `apps/web/src/main.tsx` - current live board, roster, drawer, command handlers, Lucide imports]
- [Source: `apps/web/src/styles.css` - current palette and component styles to retoken]
- [Source: `apps/web/src/main.test.tsx` - component test patterns and fixtures]
- [Source: `apps/web/e2e/event-mode.spec.ts` - event-mode E2E patterns]
- [Source: `_bmad-output/implementation-artifacts/2-10-view-team-rosters-during-the-auction.md` - previous story implementation details]

### Open Questions

- None blocking. If the implementation reveals that the static mockup hierarchy conflicts with existing command regression tests, preserve command behavior first and document the visual tradeoff for Story 2.5.2.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-08T09:26:03+0530 - Red check: focused `main.test.tsx` failed because the live board root did not yet expose `live-app-shell`.
- 2026-07-08T09:28:11+0530 - Red check: focused `main.test.tsx` failed because Undo's accessible name was only `No actions to undo.`.
- 2026-07-08T09:28:24+0530 - Focused component test passed after adding live shell classing and stable Undo accessible name.
- 2026-07-08T09:28:39+0530 - `npm run test` passed: 33 files, 285 tests.
- 2026-07-08T09:29:10+0530 - `npm run test:e2e:event` passed: 8 Playwright tests.

### Completion Notes List

- Added scoped red/black event-console tokens and live-shell overrides while keeping setup surfaces light.
- Applied the dark live frame to resume/live auction surfaces and retokened board, bid, team, roster, drawer, status, focus, blocked, and command treatments.
- Preserved existing command handlers and stable test IDs; only visual classing/test anchors and Undo accessible naming changed in React.
- Added component coverage for the live shell, structural anchors, existing command controls, and accessible control names.
- Added Playwright live-frame screenshot proof at `test-results/event-mode-reviews-and-sav-eaf94-before-starting-the-auction-chromium/live-frame-1366x768.png`.
- Dev Gate passed: `npm run typecheck`, `npm run test`, and `npm run test:e2e:event`.
- Code review patches: restored command hierarchy (button-live Increase Bid, secondary Sold/Unsold), display-score sizing, focus/overflow guards, token cleanup, forced-colors support.

### File List

- apps/web/src/styles.css
- apps/web/src/main.tsx
- apps/web/src/main.test.tsx
- apps/web/e2e/event-mode.spec.ts
- _bmad-output/implementation-artifacts/2-5-1-apply-red-black-event-console-tokens-and-app-frame.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-07-08: Implemented Story 2.5.1 event-console visual foundation and moved story to review.
- 2026-07-08: Code review patches applied — command hierarchy, display-score sizing, focus/overflow guards, outcome button classes, token cleanup.

### Review Findings

- [x] [Review][Patch] Increase Bid uses command-red instead of button-live hierarchy [apps/web/src/styles.css:1782]
- [x] [Review][Patch] Mark Sold/Unsold styled as primary red commands [apps/web/src/main.tsx:2880]
- [x] [Review][Patch] live-action and primary-action visually identical on live surfaces [apps/web/src/styles.css:1771]
- [x] [Review][Patch] Current Bid typography undersized vs display-score tokens [apps/web/src/styles.css:1765]
- [x] [Review][Patch] Active phase step uses command-red instead of live-red [apps/web/src/styles.css:1699]
- [x] [Review][Patch] Live-shell overrides use repeated hardcoded hex values [apps/web/src/styles.css:1589]
- [x] [Review][Patch] Undo aria-label may duplicate "Undo" prefix [apps/web/src/main.tsx:2821]
- [x] [Review][Patch] Focus ring low contrast on red command buttons [apps/web/src/styles.css:1620]
- [x] [Review][Patch] Large bid values may overflow bid panel at mid-width [apps/web/src/styles.css:1765]
- [x] [Review][Patch] Status counters min-height excessive on narrow viewports [apps/web/src/styles.css:1681]
- [x] [Review][Patch] Missing forced-colors handling for live-shell controls [apps/web/src/styles.css:1589]
- [x] [Review][Patch] Screenshot captured before fonts settle [apps/web/e2e/event-mode.spec.ts:310]
- [x] [Review][Defer] Dev Gate build step not evidenced in completion notes — deferred, CI/build gate tracked separately
- [x] [Review][Defer] Screenshot captured at only 1366x768 viewport — deferred to Story 2.5.5 visual QA gate
- [x] [Review][Defer] E2E does not assert screenshot artifact existence — deferred, manual artifact path recorded in Dev Agent Record
