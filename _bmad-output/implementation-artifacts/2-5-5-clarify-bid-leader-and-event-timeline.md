---
baseline_commit: 6784c06
created_at: 2026-07-08T16:25:23+0530
story_key: 2-5-5-clarify-bid-leader-and-event-timeline
---

# Story 2.5.5: Clarify Bid Leader and Event Timeline

Status: ready-for-dev

## Story

As an auction operator,
I want selecting a Team to record that Team's bid at the current value and make the leading Team obvious,
so that I can run verbal bidding without reading the log or interpreting redundant selection chrome.

## Acceptance Criteria

1. Given a Current Player is revealed and the Current Bid is 6, when the operator selects `Warriors`, then the system records a bid event that `Warriors bid 6`, and `Warriors` becomes the current leading Team for the Current Player.
2. Given a different Team is already leading at the Current Bid, when the operator selects another valid Team, then the leading Team changes to the newly selected Team at the same Current Bid, and the event timeline records the new Team bid value without requiring a bid increment first.
3. Given the operator increases the Current Bid, when no Team has been selected at the increased value yet, then the board makes clear that the Current Bid needs a Team bid record, and the previous leading Team is not visually presented as having bid the new value unless that is the intended domain behavior and tests explicitly preserve it.
4. Given Team cards render during bidding, when one Team is the current leader, then that Team is visually highlighted with a strong border, glow, badge, or accent background, and the auctioneer can identify the leader without reading the event timeline.
5. Given the Team matrix header renders, when the board is in a live bidding phase, then the header no longer shows a selected-Team icon or selected-Team label beside the Teams title, and the Teams title no longer shows the count of Teams.
6. Given the live board section headers render, when Current Player, Teams, event timeline, roster, or command sections appear, then section headers are noticeably larger and more scannable than the surrounding body text, and the change does not cause truncation, overlap, or loss of first-viewport fit at 1440x900 and 1366x768.
7. Given live actions occur, when the event timeline renders, then it shows timestamped events such as `10:42 PM - Sold Stuti Jude to Warriors for 6`, `10:41 PM - Warriors bid 6`, `10:41 PM - Tigers bid 4`, and `10:40 PM - Revealed Stuti Jude`, and the latest event is visually emphasized compared with earlier entries.
8. Given timeline events render, when event types are displayed, then sold events use green/positive treatment, reveal events use gray/neutral treatment, unsold events use red or orange treatment, and bid-change or Team-bid events use blue treatment, and color is not the only cue for event type.
9. Given the operator marks the Current Player sold, when the sale succeeds, then the timeline records the sold event using the current leading Team and Current Bid, and prior Team bid events remain visible in reverse chronological order.
10. Given a developer finishes this story, when they run the story's Dev Gate, then typecheck, unit/component tests for bid-leader display and timeline rendering, relevant domain/API tests for bid-leader action log semantics, accessibility checks, and focused E2E coverage for reveal, select-Team-as-bid, increase bid, leader highlight, mark sold, undo, and timeline ordering pass.
11. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks bid-leader semantics, undo restoration, timeline ordering and colors, leader highlight readability, removed Teams-header clutter, larger section headers, accessibility, privacy, and regression risk to reveal, bid, sold, unsold, roster switching, and resume flows.

## Implementation Boundary

- This story replaces the previous Story 2.5.5 QA-only gate. It is a focused live-bidding interaction and visual clarity story.
- It may change the select-Team command semantics, action-log summaries, undo payloads, Board DTO fields, live board React rendering, event timeline rendering, CSS hierarchy, component tests, API/domain tests, and focused E2E coverage needed to prove the new behavior.
- Preserve the core auction rules: Current Bid still changes only through the configured bid increment, Mark Sold still uses the authoritative leading Team and Current Bid, invalid sales remain hard-blocked, and all state-changing commands reconcile from server-authoritative responses.
- Do not introduce online bidding, captain devices, multi-operator concurrency, new auction parameters, new persistence stores, or changes to Phase 2/Phase 3 behavior beyond keeping shared bidding controls compatible.
- Do not expose private imported fields in the event timeline, Team cards, logs, snapshots, or tests. Allowed live fields remain Player name/photo/Role/prices/status/winning Team, Team name/Captain/logo/budget/squad/role counts, bid values, and auction event timestamps.
- If domain semantics currently keep selected Team across bid increments, decide explicitly during implementation whether to clear the leader-at-value display after an increment or preserve the leader while marking the bid as needing confirmation. Cover the chosen behavior with tests and keep the UI unambiguous.

## Tasks / Subtasks

- [ ] Confirm current command and action-log behavior. (AC: 1, 2, 3, 9)
  - [ ] Read `packages/domain`, `apps/server`, shared DTO schemas, and current UI command handlers for `SelectTeam`, `IncreaseBid`, `MarkSold`, Undo, action-log summaries, and Board DTO projection.
  - [ ] Identify whether a Team selection already creates a distinct action-log entry that can be relabelled as a Team bid, or whether a richer domain/action-log payload is needed.
  - [ ] Preserve idempotency, persistence snapshot writes, and existing undo history shape where possible; add schema/test updates only where the new Team-bid semantics require them.

- [ ] Implement Team selection as bid-leader recording. (AC: 1, 2, 3, 9)
  - [ ] Update the domain command or action summary so selecting a Team at the Current Bid records a user-facing event like `Warriors bid 6`.
  - [ ] Ensure changing the Team at the same Current Bid records the new Team bid and makes that Team the current leader.
  - [ ] Ensure Mark Sold uses the authoritative current leader and Current Bid.
  - [ ] Ensure Undo restores prior Current Bid, leading Team, action log, snapshot, and board display consistently after Team-bid, bid-increment, and sale actions.
  - [ ] Add or update domain/API tests for select-Team-as-bid, leader change at same value, increase-bid ambiguity, Mark Sold after Team bid, and Undo restoration.

- [ ] Highlight the leading Team in the live Team matrix. (AC: 4, 5, 6)
  - [ ] In `apps/web/src/main.tsx`, make the leading Team state visually and semantically distinct from ordinary eligible/blocked cards.
  - [ ] Use accessible selected/leader semantics such as `aria-pressed`, visible badge text, or an equivalent label so the leader state is not color-only.
  - [ ] Remove the selected-Team icon/label beside the Teams header and remove the Team count from the Teams title.
  - [ ] Keep blocked Team reasons and Details controls visible and accessible.
  - [ ] Add/update React tests for leader highlight, removed header clutter, keyboard selection, and accessible names.

- [ ] Increase live section header hierarchy without breaking density. (AC: 6)
  - [ ] In `apps/web/src/styles.css`, increase the visual weight/size of operational section headers such as Current Player, Teams, event timeline, command/roster headings, and equivalent live-board section labels.
  - [ ] Keep text inside bounds at 1440x900, 1366x768, 1920x1080, and 390x844. Do not scale font size with viewport width.
  - [ ] Preserve the red/black event-console palette and avoid decorative gradients, extra cards, or explanatory copy.

- [ ] Convert the bottom log into a proper event timeline. (AC: 7, 8, 9)
  - [ ] Render recent events in reverse chronological order with local time formatting such as `10:42 PM - Sold Stuti Jude to Warriors for 6`.
  - [ ] Include reveal, Team bid, bid increment where still relevant, sold, unsold, and undo/restoration summaries using concise operational copy.
  - [ ] Apply event-type treatments: sold green/positive, reveal gray/neutral, unsold red/orange, bid changes and Team bids blue.
  - [ ] Make the latest event larger or otherwise more prominent without causing layout shift or overlap.
  - [ ] Provide non-color cues through labels, icons with accessible names, or text structure.
  - [ ] Add component tests for ordering, timestamp presence, latest-event emphasis, event-type labels/classes, and privacy-safe rendering.

- [ ] Add focused E2E and layout coverage. (AC: 1-10)
  - [ ] Extend event-mode E2E to cover reveal, select Team as bid, increase bid, select new leader, Mark Sold, and timeline ordering.
  - [ ] Assert the leading Team is visually identifiable and the Teams header no longer includes selected icon/label or Team count.
  - [ ] Capture or assert layout at 1440x900 and 1366x768 for leader highlight, larger section headers, and timeline visibility.
  - [ ] Keep existing Epic 2.5 layout tests passing for first-viewport fit and no critical overlap.

- [ ] Run the story Dev Gate and update this story record. (AC: 10, 11)
  - [ ] `npm run typecheck`
  - [ ] `npm run test`
  - [ ] `npm run test:e2e:event`
  - [ ] Record any screenshot paths, known exceptions, and review notes in the Dev Agent Record.

## Dev Notes

### Current Repository State To Preserve

- `sprint-status.yaml` has Epic `epic-2-5` in progress, Stories 2.5.1 through 2.5.4 done, and this Story 2.5.5 `ready-for-dev`.
- Current `HEAD` at story creation is `6784c06`.
- The worktree is not clean at story creation. Uncommitted files include `apps/web/e2e/event-mode.spec.ts`, `apps/web/src/main.tsx`, `apps/web/src/styles.css`, and `_bmad-output/implementation-artifacts/spec-flatten-live-board-borders-category-copy.md`. Treat them as existing user/developer work and do not revert them.
- No `project-context.md` exists for the persistent-facts glob.
- Repo uses npm workspaces. Run scripts from the repository root.

### Files To UPDATE

- `packages/domain` command/action-log files for select-Team, bid increment, Mark Sold, and Undo behavior if the new Team-bid event semantics require domain changes.
- `apps/server` routes or DTO projection files if action-log summaries or board state need new labels/fields.
- `packages/shared/src/index.ts` if DTO schemas need a leader-at-bid-value field, event type field, or timeline-safe summary shape.
- `apps/web/src/main.tsx` for live Team matrix leader highlight, Teams header cleanup, section headings, and event timeline rendering.
- `apps/web/src/styles.css` for leader highlight, larger section headers, event timeline typography/color treatments, and responsive fit.
- `apps/web/src/main.test.tsx` for component/accessibility/timeline/leader tests.
- `apps/web/e2e/event-mode.spec.ts` or focused event layout specs for the select-Team-as-bid flow and visual assertions.
- `apps/web/e2e/event-mode-layout.spec.ts` if additional screenshot/layout checks are needed for 1440x900 and 1366x768.

### Files To READ Before Editing

- `packages/domain/src/*` and tests covering `SelectTeam`, `IncreaseBid`, `MarkSold`, `Undo`, action-log summaries, and auction state projection.
- `apps/server/src/*` routes and persistence adapters for live commands and action-log projection.
- `packages/shared/src/index.ts` for `BoardStateDto`, action-log DTOs, command schemas, and privacy-safe fields.
- `apps/web/src/main.tsx` for `AuctionBoard`, Team matrix rendering, event/log rendering, command handlers, `handleSelectTeam`, `handleIncreaseBid`, `handleMarkSold`, Undo, and stable test IDs.
- `apps/web/src/auction-board-helpers.ts` for command enablement, selected Team helpers, and display-only helper boundaries.
- `apps/web/src/styles.css` for Story 2.5.1-2.5.4 event-console tokens and layout classes.
- `apps/web/src/main.test.tsx` for mocked board states, Team tile tests, action log tests, privacy tests, and route mock patterns.
- `apps/web/e2e/event-mode.spec.ts` and `apps/web/e2e/event-mode-layout.spec.ts` for event-mode flow helpers, screenshot conventions, and viewport assertions.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/mockups/epic-2-redesign-review.html` for the live board hierarchy being refined.

### Current Behavior To Recheck

- Previous Epic 2 semantics treated Team selection as the Team associated with the Current Bid. The new requirement makes that selection visibly and historically read as a Team bid at the Current Bid.
- The live board currently has Team selection/selected state, Current Bid, Mark Sold, and an action log, but feedback says the operator cannot infer the current leader quickly enough and the log is too plain.
- The Teams header currently includes redundant selected-Team chrome and Team count; this story removes both.
- The bottom log currently produces useful but terse messages such as `Sold Stuti Jude to Warriors for 6`; this story turns that area into a timestamped, typed event timeline.

### Architecture Guardrails

- `packages/domain` owns auction truth. React must not invent the leading Team, sale Team, or undo state separately from authoritative state.
- Existing same-origin command contracts should be extended only when needed for the new semantics; do not introduce external services or online bidding.
- Persistence snapshots and action log entries must stay consistent after every completed live mutation.
- Undo must restore all affected Current Bid, leading Team, Player, Team state, action log, and snapshot state.
- UI privacy allowlists still apply to live board, timeline, logs, screenshots, and tests.
- Keep the change compatible with Phase 2, which reuses normal bidding controls in Epic 3.

### Stable Test IDs To Preserve

| Test ID | Meaning |
| --- | --- |
| `app-shell` | App frame root |
| `auction-board` | Existing Board tab panel |
| `live-board-stage` | Existing Current Player plus command area |
| `current-player-panel` | Existing Current Player stage |
| `current-player-name` | Existing Current Player name |
| `current-bid` | Existing Current Bid display |
| `live-command-strip` | Existing bid and routine command area |
| `increase-bid` | Existing bid increment control |
| `mark-sold` | Existing sold command |
| `mark-unsold` | Existing unsold command |
| `undo-action` | Existing Undo control where allowed |
| `team-matrix` | Existing Team matrix container |
| `team-tile` / `team-tile-selected` | Existing Team cards and selected-state anchors |
| `board-rosters-switch` | Existing Board/Rosters navigation |

### New Stable Test IDs To Add Or Confirm

| Test ID | Meaning |
| --- | --- |
| `team-tile-leader` | Current leading Team card |
| `team-leader-badge` | Visible/non-color leader cue |
| `event-timeline` | Timeline root |
| `event-timeline-entry` | Generic timeline row |
| `event-timeline-latest` | Latest emphasized event row |
| `event-timeline-bid` | Bid or Team-bid event row |
| `event-timeline-sold` | Sold event row |
| `event-timeline-unsold` | Unsold event row |
| `event-timeline-reveal` | Reveal event row |

### Dev Gate

Required before marking implementation complete:

- `npm run typecheck`
- `npm run test`
- `npm run test:e2e:event`

Dev Gate evidence must include:

- Domain/API or shared tests proving Team selection records a Team bid at the Current Bid and Undo restores leader state.
- Component/accessibility tests proving leader highlight, Teams header cleanup, larger section headings, event timeline ordering, latest-event emphasis, and color-coded event types.
- E2E proof for reveal, select Team as bid, increase bid, select/change leader, Mark Sold, and timeline ordering.
- Layout proof that 1440x900 and 1366x768 first-viewport fit remains readable with larger headers and the timeline.

### Review/Test Gate

Second-agent review must check:

- Selecting a Team at a bid value creates the intended bidder/leader state and event timeline entry.
- Mark Sold uses the current authoritative leader and Current Bid.
- Undo restores bid, leader, action log, snapshot, and board display.
- The leading Team is obvious without reading the timeline and not conveyed by color alone.
- Teams header no longer shows selected-Team chrome or Team count.
- Section headers are larger but do not break density or viewport fit.
- Timeline events are timestamped, ordered newest-first, color/type coded, privacy-safe, and latest event is emphasized.
- Existing reveal, bid increment, invalid sale, sold, unsold, roster switch, resume, and privacy flows do not regress.
