---
name: Auction Manager
status: final
sources:
  - ../../prds/prd-auction_manager-2026-07-04/prd.md
  - ../../architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md
updated: 2026-07-08
---

# Auction Manager - Experience Spine

Fast-path draft, updated against the PRD revised on 2026-07-06, the architecture spine, and the Epic 2 redesign review mockup at `mockups/epic-2-redesign-review.html`. `[ASSUMPTION]` marks choices inferred from the source docs and not yet explicitly selected by Udeet. `DESIGN.md` is the visual identity reference; this spine owns information architecture, behavior, state, accessibility, and journeys. If older mockups conflict with these spines, the 2026-07-08 Epic 2 redesign direction wins for live, manual-assignment, roster, and closed-state surfaces.

## Foundation

Single-surface locally hosted responsive web app. The primary operating surface is a PC browser mirrored to a large display during a live amateur church cricket league auction. The architecture binds this to a React/Vite UI served by a local Fastify event-mode process on `127.0.0.1`, with same-origin HTTP commands and local SQLite persistence. Mobile-first UX, public hosting, accounts, permissions, online bidding, and separate audience-only display are out of scope for v1.

No full UI component system is named. Tailwind CSS and Lucide React are stack choices, not a component-library contract. Visual tokens and component appearance come from `DESIGN.md`.

The server/domain layer is authoritative after setup begins. React may hold view state, form state, focus state, and pending-command affordances, but every reveal, bid, sale, unsold outcome, assignment, undo, reset, close, and phase transition must reconcile to the authoritative state returned by the command response. Phase ordering, randomized orders, and Team rosters are displayed by the UI, not created by it. Team rosters are read projections from Players assigned to Teams through Mark Sold or Manual Assignment.

The experience must optimize for three simultaneous audiences:

| Audience | Need |
|---|---|
| Auction Operator | Fast, low-error control while people are watching |
| Captains | Understand Current Player, Current Bid, selected Team, and whether teams can bid |
| Attendees | Follow the auction state without seeing operator-only or private registration data |

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Resume / Start | App open when local state exists or no auction has started | Choose to resume saved auction, start setup, or review prior setup |
| Setup checklist | App open / setup route | Load Player CSV, player photos, Team CSV, team logos, and auction parameters |
| Import review | Setup checklist step | Surface missing required data, missing images/logos, ambiguous matches, and privacy-safe imported fields |
| Auction board | Start Auction / resume live auction | Main mirrored live surface for Phase 1 and Phase 2 reveal, bidding, team state, sold/unsold outcomes, and undo |
| Team rosters | Board/Rosters switch, Close Auction success | Room-facing roster surface showing every Team with its current bought/assigned Players; becomes the final displayed screen after Auction is Closed |
| Team detail drawer | Team tile click | Inspect one team's budget, squad, role counts, roster, and current capacity reasons without leaving the live board |
| Phase transition review | Phase completion on Auction board | Confirm Start Unsold Bidding or Start Manual Assignment, including skipped-player consequences when applicable |
| Unsold bidding | After Phase 1 pending players end | Run randomized Phase 2 rebidding using the same live bidding controls as Phase 1 |
| Manual assignment | After Phase 2 pending players end | Manually assign players still unsold after rebidding to selected valid teams and track unresolved players |
| Auction history | Live board secondary action | Review recent actions and undo scope; not a reporting surface |
| Dangerous operations | Separated menu or management surface | Reset Auction and Close Auction with confirmation modals |

Global phase indicator: `Setup` -> `Initial Auction` -> `Unsold Bidding` -> `Manual Assignment` -> `Closed`. The current phase should be visible on every surface because allowed actions change by phase.

Navigation is intentionally shallow. During the live auction, Auction board and Team rosters are peer display surfaces under an obvious Board/Rosters switch. Drawers and modals may open on top, but they must return to the same board or roster state when dismissed. After Close Auction succeeds, Team rosters becomes the default final surface.

## Voice and Tone

Microcopy should be operational, calm, and specific. Brand posture lives in `DESIGN.md`.

| Do | Don't |
|---|---|
| "Sold to Eagles for 25." | "Congratulations! Eagles won the player!" |
| "Blocked: Eagles have 0 Girls slots left." | "Invalid action." |
| "Undo Mark Sold: Aarav -> Eagles, 25." | "Undo last action?" |
| "Photo missing. Placeholder will be used." | "Upload failed." |
| "Resume auction from last saved action." | "Restore session?" |
| "Start Unsold Bidding: 7 players will be rebid in randomized order." | "Shuffle losers." |
| "Marked unsold. Moves to Phase 2 rebid." | "Player failed to sell." |
| "Marked unsold. Moves to manual assignment." | "Assignment failed." |
| "No valid team can receive this player." | "Assignment failed." |
| "Final rosters are displayed." | "Auction over!" |

Use complete short sentences for blocking states. Avoid exclamation marks, jokes, hype language, and celebratory animation copy. The operator is managing a live room; copy should reduce cognitive load.

## Component Patterns

Behavioral rules. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Setup checklist | Setup | Shows required inputs, import readiness, auction parameter readiness, and the configured Phase 1 category order. Start Auction remains disabled until required non-image Player data, Team data, and parameters are valid. |
| Import review table | Setup / import review | Groups issues by architecture severity: `must_fix`, `can_proceed_with_placeholder`, `ignored_source_field`. Never displays phone numbers, payment IDs, or private fields on live surfaces. |
| Live board | Auction board | First read is Current Player + Current Bid. Second read is the compact status counter row plus selected Team/team capacity. Third read is the fixed command strip and Team matrix. Team tiles stay in the first viewport for 1440x900 and 1366x768 targets. |
| Board/Rosters switch | Auction board / Team rosters | Two-option switch for the room-facing surfaces. It must be visible during live phases and closed state, preserve current auction state, and never trigger a mutation by itself. |
| Player stage | Auction board | Shows name, photo/placeholder, Role, Base Price, Category, and Current Bid in one stable stage. Missing photo is neutral, not blocking. |
| Auction parameter editor | Setup | Captures role base prices, bid increment, team budgets, squad cap, role targets, and manual-assignment budget behavior. Values are editable only before Start Auction and become read-only after Start Auction. |
| Current bid control | Auction board | Used in Phase 1 and Phase 2. Bid starts at the configured Base Price for the revealed Player's Role. Increment button adds the configured Bid Increment. No custom bid editing appears during live bidding. Current Bid is displayed as the dominant red live number. |
| Command strip | Auction board | Fixed-height row below the player stage for Next/Reveal, Bid Increment, Sold, Unsold, and Undo. Controls must not jump when enabled, disabled, pending, or after outcome summaries. |
| Team matrix | Auction board | Dense Team cards in a right-side matrix on desktop. Each tile shows logo/placeholder, Team name, Captain name, remaining budget, squad count, and Current Player role capacity. Selecting a tile sets bidding Team and records undo history. |
| Capacity indicator | Team tile / Team detail | Indicates whether the Team can buy or receive the Current Player under budget, squad, and role rules. Blocked reasons must be specific. |
| Mark Sold | Auction board | Enabled only when a Current Player exists, a Team is selected, and all hard-block rules pass. On success, updates Player status, price, team budget, squad, role count, roster projection, local state, and undo history. |
| Mark Unsold | Auction board | Enabled when a Current Player exists during Initial Auction or Unsold Bidding. In Phase 1, sends Player to the Phase 2 Unsold Bidding pool. In Phase 2, sends Player to the Phase 3 Manual Assignment pool. No budget or count changes. |
| Phase transition control | Auction board / phase transition review | Starts Unsold Bidding after Phase 1 or starts Manual Assignment after Phase 2. Shows count, next phase, and whether skipped pending players will be recorded. Transition commands are included in undo whenever they change phase state or skipped-player state. |
| Unsold pool summary | Auction board / Manual assignment | Shows Phase 1 unsold count before Phase 2, Phase 2 remaining count during rebidding, and Phase 3 manual-assignment count after rebidding. Counts come from authoritative state. |
| Team roster board | Team rosters / Closed | Shows all Teams at once with Team name, captain, logo/placeholder, remaining budget, squad count, role counts, and current roster. It is read-only during live phases and closed state. |
| Roster team section | Team rosters / Team detail | Groups Players by Team. Each Player row shows name, Role, acquisition type (`Sold` or `Assigned`), and price when applicable. Empty Teams show `No players bought yet.` |
| Undo | Auction board / history | Multi-step. Shows the action that will be undone before execution or confirms what was undone immediately after. Covers Phase 2 bidding actions and Manual Assignment. Does not cover Reset or Close. |
| Team detail drawer | Team tile click | Read-only during live flow. Shows Team budget, squad, role counts, roster, and current capacity reasons. [ASSUMPTION] Editing team data is not supported in-app because source data is import-only. |
| Manual assignment control | Manual assignment | Phase 3 only. Assignment is its own focused mode: left column for assignment player plus pool list, right side for eligible Team matrix, bottom blocked reason, and one primary assignment command. Bidding controls are hidden. Assignment updates squad, role counts, roster projection, follows the configured manual-assignment budget behavior, and records undo history. |
| Dangerous menu | Any post-setup phase | Contains Reset Auction and Close Auction only. Access is visually separated from routine controls and requires confirmation modal. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| No local state | Resume / Start | Primary action: begin setup. No empty marketing page. |
| Saved state found | Resume / Start | Show phase, last saved action, timestamp if available, and primary action to resume. [ASSUMPTION] Timestamp depends on persistence implementation. |
| Player CSV missing | Setup checklist | Required step incomplete; Start Auction disabled. |
| Required CSV field missing | Import review | `must_fix` issue with source field name and affected rows. Requires source CSV correction and reimport. |
| Player photo missing | Import review / Player panel | Setup shows `can_proceed_with_placeholder`; live board uses neutral placeholder. |
| Team logo missing | Import review / Team tile | Setup shows `can_proceed_with_placeholder`; live board uses neutral logo placeholder. |
| Auction ready | Setup checklist | Start Auction primary action becomes available; show parameter summary: role base prices, bid increment, team budgets, squad cap, role targets, and manual-assignment budget behavior. |
| No Current Player | Auction board | Primary action: Reveal Next Player when pending players remain in the current bidding phase. |
| Current Player revealed | Auction board | Current Bid starts at the Player's configured role Base Price. |
| Team selected | Auction board | Selected tile visually active; Mark Sold validity recalculates immediately. |
| Team blocked | Auction board / Manual assignment | Blocked Team cards remain visible in the matrix with subdued treatment. Exact blocked reasons appear in a text panel near the Team matrix and command context, not as tooltip-only or color-only feedback. |
| Roster view active | Team rosters | Show every Team with current roster, budget, squad count, and role counts from authoritative state. Provide a clear return to Board while the auction is live. |
| Empty Team roster | Team rosters / Team detail | Show `No players bought yet.` inside that Team section; do not hide the Team. |
| Invalid sale | Auction board | Mark Sold disabled or blocked with reason: budget, squad size, or role target. The reason appears near Mark Sold and selected Team. |
| Sold success | Auction board / Team rosters | Sale summary appears briefly and board advances to a stable post-sale state with Reveal Next Player as safe next action. Team rosters immediately include the sold Player under the winning Team. |
| Marked unsold in Phase 1 | Auction board | Player enters the Phase 2 Unsold Bidding pool; Reveal Next Player becomes safe next action if Phase 1 pending players remain. |
| Initial pending complete | Auction board | Show transition action to start Unsold Bidding if Phase 1 unsold pool has players; otherwise show Close Auction path. |
| Start Unsold Bidding | Phase transition review | Show Phase 1 unsold count and copy that Phase 2 order will be randomized and persisted. On success, Auction board enters `Unsold Bidding`. |
| Unsold Bidding active | Auction board | Board uses normal reveal, select-team, increase-bid, Mark Sold, Mark Unsold, hard-block, and undo patterns. Phase label and unsold progress distinguish it from Phase 1. |
| Marked unsold in Phase 2 | Auction board | Player enters the Phase 3 Manual Assignment pool; Reveal Next Player becomes safe next action if Phase 2 pending players remain. |
| Phase 2 pending complete | Auction board | Show transition action to start Manual Assignment if Phase 3 pool has players; otherwise show Close Auction path. |
| Pending players remain but user starts next phase | Phase transition review | Confirmation required because this skips remaining players in the current phase. Skipped players must be visible in the confirmation summary. [ASSUMPTION] |
| Manual assignment active | Manual assignment | Current Player comes from the Phase 3 pool; bidding controls are hidden because this phase is assignment-only. The assignment pool list remains visible so the operator can see who remains. |
| Unsold team selected | Manual assignment | Selected Team recalculates assignment validity immediately from squad, role target, and configured budget behavior. |
| Manual assignment recorded | Manual assignment / Team rosters | Assigned Player leaves the Phase 3 pool and appears under the receiving Team with assignment status and no price unless configured budget behavior records one. |
| No valid team for unsold player | Manual assignment | Block assignment and show exact reason per invalid Team category. Keep player unresolved. |
| Resume in Unsold Bidding | Resume / Start | Show current phase, Phase 2 remaining count, and last saved action; resume must preserve the persisted randomized order. |
| Resume in Manual Assignment | Resume / Start | Show current phase, Phase 3 remaining count, and last saved action; resume must not send players back to Phase 2. |
| Undo available | Live surfaces | Undo control shows last reversible action. |
| Undo empty | Live surfaces | Undo disabled with `No actions to undo.` |
| Command in flight | Any mutating action | Disable the triggering control or show pending affordance until the server returns authoritative state. Duplicate clicks must not create duplicate mutations. |
| Local write failure | Any state-changing action | Block further state-changing action until retry or safe recovery path is clear. Architecture requires mutating commands to stop after persistence failure. |
| Reset confirmation | Dangerous modal | Requires explicit confirmation. Copy states that Undo cannot reverse Reset. |
| Close confirmation | Dangerous modal | Requires explicit confirmation. Copy states that Undo cannot reverse Close. |
| Auction closed | Team rosters | Automatically switch to Team rosters and display final roster state for the room. Routine live controls are disabled; dangerous/reset access remains separated. |
| Resume in Closed | Resume / Start | Primary action opens Team rosters in final-read mode with phase shown as `Closed`. |

## Interaction Primitives

Primary input is mouse/trackpad with keyboard acceleration. [ASSUMPTION] The operator may be under public pressure and needs both large click targets and fast repeatable keyboard actions.

| Primitive | Rule |
|---|---|
| Click / tap | Every routine action must be reachable without keyboard shortcuts. |
| Keyboard focus | Focus order follows the current phase workflow: player, team selection, bid, outcome actions, undo in bidding phases; player, team selection, assign, undo in Manual Assignment. |
| Enter | Activates the focused primary control only. Never triggers phase transitions or dangerous operations from a background surface. |
| Space | Activates focused buttons and team tiles using standard browser behavior. |
| View switch | Board/Rosters switch is keyboard reachable before the main surface content and changes view without changing auction state. |
| `+` | Increases Current Bid by the configured Bid Increment when a Current Player is active and focus is not inside text input. [ASSUMPTION] |
| `u` | Focuses Undo or opens Undo confirmation when undo is available. [ASSUMPTION] |
| `n` | Focuses Reveal Next Player when no Current Player requires outcome in Phase 1 or Phase 2. [ASSUMPTION] |
| Escape | Closes the topmost drawer, popover, or modal unless a destructive confirmation requires explicit choice. |

Banned for v1: drag-to-reorder players, hidden hover-only controls for routine live actions, multi-level modal stacks, infinite scroll in live surfaces, celebratory animations that delay the next auction action, and random team assignment during Manual Assignment.

## Accessibility Floor

Behavioral accessibility. Visual contrast and tokens live in `DESIGN.md`.

- WCAG 2.2 AA target for the web surface. Large-display legibility is an additional product requirement, not a substitute for accessibility.
- Routine controls must have visible focus states and accessible names.
- All team tiles expose selected state, budget, squad count, and Current Player role capacity to assistive technology.
- Team rosters expose Team sections as headings with roster counts, then Player rows with name, Role, acquisition type, and price when applicable.
- Phase changes announce the new phase and the next safe action, e.g., `Unsold Bidding started. Reveal next unsold player.`
- Close Auction announces `Auction closed. Final rosters are displayed.`
- Unsold pool counts are text, not color alone, and identify whether the count belongs to Phase 2 rebidding or Phase 3 manual assignment.
- Blocking reasons are text, not color alone.
- Keyboard-only operation must cover setup review, Phase 1 bidding, Phase 2 unsold bidding, Phase 3 manual assignment, undo, and dangerous confirmations.
- Motion should be minimal. If Reduce Motion is active, skip transitions and update sale/assignment states immediately.
- Touch/click targets for live controls should be at least 44 CSS px in both dimensions. [ASSUMPTION]
- The mirrored display must not rely on tiny captions for critical state; bid, selected Team, Current Player, and blocked reason need primary-size treatment.
- Lucide icons, where used, must have accessible names or be decorative with adjacent text. Icon-only controls require visible labels on the live board unless space constraints are proven in rehearsal.

## Responsive & Platform

| Viewport / context | Behavior |
|---|---|
| Desktop / laptop operator view | Primary target. Live board, top counters, command strip, and Team matrix visible without scrolling for eight Teams at 1440x900 and 1366x768. |
| Large mirrored display | Optimize for readability at distance. Avoid private fields and avoid operator-only clutter dominating the board or roster screen. |
| Team rosters on desktop / display | Use a scan-friendly multi-column grid of Team sections. The closed-state roster surface uses the same red/black event-console frame and dense roster cards as the Epic 2 redesign review. |
| Narrow browser width | Preserve operation but not mobile-first polish. Stack player panel, bid, team grid, controls, and roster Team sections in workflow order. |
| Projector / TV overscan risk | Keep critical live content away from extreme edges with `{spacing.app-gutter}` equivalent safe margins. [ASSUMPTION] |
| Event mode | One Fastify process serves UI, API, assets, health, and local state. The operator should not need a Vite dev server, internet, Docker, or manual asset hosting during the event. |

Implementation acceptance profiles:

- Laptop operator profile: 1440x900 browser viewport.
- Compact laptop profile: 1366x768 browser viewport.
- Projected display profile: 1920x1080 browser viewport with critical content kept inside safe margins.
- Narrow fallback profile: 390x844 browser viewport, preserving workflow order without mobile-first polish.
- Local command profile: mutating controls show immediate pending affordance, reject duplicate clicks, and reconcile from the authoritative server response without layout jumps. Rehearsal records any command response that feels slow under event-machine conditions.
- Redesign implementation profile: live board, manual assignment, roster, and closed-state surfaces visually match `mockups/epic-2-redesign-review.html` in structure and hierarchy while using real app components, DTOs, accessibility semantics, and authoritative command behavior.

Separate audience display is deferred. If v1 mirrored view becomes too cluttered, the first v2 candidate is an audience-only route derived from the same live state, not a second control system.

## Privacy And Data Visibility

Auction Manager imports registration data but should display only auction-relevant data:

| Data | Live board visibility |
|---|---|
| Player name | Visible |
| Photo / placeholder | Visible |
| Role | Visible |
| Base Price, Current Bid, Sold Price | Visible |
| Winning Team | Visible |
| Team roster: Player name, Role, acquisition type, Sold Price when applicable | Visible |
| Team name, Captain name, logo | Visible |
| Email, mobile number, payment status, transaction ID, source timestamp | Never visible on live board |
| Ignored source fields | Setup/import review only when needed for issue diagnosis |

The import review may reference source columns but should not turn private data into live display content. Board and live API DTOs should behave like allowlisted projections; if a field is not needed for the room-facing auction state, the live board should not receive it.

The Team rosters surface follows the same visibility allowlist as the live board. It may show only auction-relevant Player and Team fields needed to understand final or current rosters.

## Inspiration & Anti-patterns

- **Lifted from live scoreboards:** one dominant number, stable layout, high contrast, and predictable team tiles.
- **Lifted from control-room tools:** routine actions stay close to the live state; dangerous operations require deliberate separation.
- **Lifted from command consoles:** state-changing controls acknowledge pending work and reconcile to the authoritative result instead of assuming the client-side action succeeded.
- **Lifted from spreadsheet replacement goals:** dense setup review is acceptable before the event, but the live surface must avoid spreadsheet-like cell hunting.
- **Lifted from tournament brackets:** phase progression is explicit and count-based; the operator should always know which pool a Player belongs to next.
- **Rejected - betting app energy:** no odds language, flashy transitions, or aggressive win/loss framing.
- **Rejected - admin dashboard default:** the live auction board is not a table of records; it is a room-facing state surface.
- **Rejected - hidden power features:** shortcuts may accelerate the operator, but the visible controls remain complete.
- **Rejected - direct manual assignment after Phase 1:** the current PRD requires Phase 2 rebidding before Phase 3 manual assignment.
- **Rejected - random assignment:** Phase 2 randomizes player order only; Phase 3 team assignment is always operator-selected.
- **Rejected - blank closed state:** closing the auction should leave the room with final rosters, not a disabled board with no useful summary.

## Key Flows

### Flow 1 - Setup before the event (Aaron, auction operator, afternoon before the auction)

1. Aaron opens the local app on the event PC.
2. Resume / Start shows no active auction state, so he starts setup.
3. He loads the Player CSV, player photo folder, Team CSV, and team logo folder.
4. Import review flags any missing required data as `must_fix` and any missing photos/logos as `can_proceed_with_placeholder`.
5. Aaron fixes source files outside the app where required and reimports.
6. He confirms or edits auction parameters: role base prices, bid increment, team budgets, squad cap, role targets, and manual-assignment budget behavior.
7. **Climax:** Start Auction becomes available only when required non-image data and auction parameters are valid, giving Aaron confidence that the live flow will not start with hidden setup problems.

Failure: local state from a previous dry run exists -> Aaron must choose Resume or Reset through a dangerous confirmation path.

### Flow 2 - First live bidding round (Aaron, auction operator, app mirrored to large display)

1. Aaron starts or resumes the Initial Auction phase.
2. Auction board opens with no Current Player and `Reveal Next Player` as the safe next action.
3. He reveals the next randomized Player.
4. The board shows player name, photo/placeholder, Role, Base Price, and Current Bid initialized from the configured Base Price for that Role.
5. Captains bid verbally. Aaron selects the active bidding Team and uses the increment control to increase Current Bid by the configured Bid Increment.
6. Each Team tile recalculates budget, squad, and Current Player role capacity.
7. Aaron clicks Mark Sold.
8. **Climax:** The sale records immediately; the winning team's remaining budget, squad size, role count, and roster update on the board state.
9. The board settles with a sale summary and `Reveal Next Player` as the next safe action.

Failure: Aaron selected the wrong team -> he uses Undo, sees which action will be undone, and returns to the prior correct state.

### Flow 3 - Captain reads whether bidding is possible (Mathew, captain watching the projection) [ASSUMPTION]

1. Mathew watches the projected board as a Current Player appears.
2. He reads the player Role, Base Price, Current Bid, and selected Team without asking Aaron to inspect a spreadsheet.
3. He looks at his Team tile and sees remaining budget, squad count, and role capacity for that Player's Role.
4. Another Team becomes selected as bidding changes.
5. **Climax:** Mathew can tell whether his team can still bid before speaking, because blocked capacity is visible in plain language.

Failure: the projected image is slightly soft -> the Current Bid, player name, and active Team remain readable because they use primary-size treatment.

### Flow 4 - Second-phase unsold rebidding (Aaron, auction operator, near the end of Phase 1)

1. Initial pending players are complete.
2. Auction board offers `Start Unsold Bidding` because the Phase 1 Unsold pool has players.
3. Aaron reviews the transition summary: count of players to rebid and confirmation that the Phase 2 order will be randomized and saved.
4. He starts Phase 2.
5. Auction board returns in `Unsold Bidding` with no Current Player and `Reveal Next Player` as the safe next action.
6. Aaron reveals the next randomized Unsold Player, selects the active bidding Team, increments the Current Bid, and marks the Player sold or unsold using the same controls as Phase 1.
7. **Climax:** A Phase 2 sale updates the winning team's remaining budget, squad size, role count, and roster exactly like a Phase 1 sale, while a Phase 2 unsold outcome moves that Player to the Phase 3 pool.

Failure: Aaron starts Phase 2 too early or records the wrong outcome -> he uses Undo, sees the affected transition or action, and returns to the prior correct phase state.

### Flow 5 - Manual assignment after rebidding (Aaron, auction operator, final unresolved players)

1. Phase 2 pending players are complete.
2. Auction board offers `Start Manual Assignment` because the Phase 3 pool has players.
3. Aaron opens Manual Assignment.
4. The first remaining Unsold Player appears with Team eligibility calculated from squad and role targets.
5. Aaron selects a receiving Team from the valid options.
6. The app records the manual assignment, updates the receiving Team's squad, role count, and roster, applies the configured manual-assignment budget behavior, and persists undo history.
7. **Climax:** The Phase 3 pool count decreases and the receiving Team state updates without Aaron manually balancing a spreadsheet.

Failure: no valid Team exists -> the surface identifies the unresolved Player and reason; Aaron can continue with other unresolved decisions or stop before Close Auction. [ASSUMPTION]

### Flow 6 - Roster view during the auction (Aaron, auction operator, between bidding actions)

1. A sale has just completed and the board is waiting for the next safe action.
2. Aaron switches from Board to Rosters.
3. Team rosters shows every Team with current budget, squad count, role counts, and Players bought or assigned so far.
4. A captain asks who is already on a Team.
5. Aaron scans the Team section without opening Excel or leaving the app.
6. **Climax:** The room can inspect current rosters from the same authoritative auction state, then Aaron switches back to Board and continues bidding.

Failure: a roster looks wrong because the previous sale used the wrong Team -> Aaron switches back to Board, uses Undo while it is still available, and the roster projection updates from the corrected state.

### Flow 7 - Dangerous close (Aaron, auction operator, auction complete)

1. No Pending Players remain and Phase 2 / Phase 3 handling is complete or intentionally stopped.
2. Aaron opens the separated Dangerous Operations area.
3. He chooses Close Auction.
4. Confirmation modal states that Close Auction is not reversible through Undo.
5. Aaron confirms.
6. **Climax:** The auction phase becomes Closed, routine live controls are disabled, and Team rosters becomes the final displayed screen for the room.

Failure: Aaron opened Close by mistake -> Escape or Cancel returns to the live board or roster view with no state change.
