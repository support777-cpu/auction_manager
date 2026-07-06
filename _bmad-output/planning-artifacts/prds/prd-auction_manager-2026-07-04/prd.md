---
title: Auction Manager PRD
status: final
created: 2026-07-04
updated: 2026-07-06
---

# PRD: Auction Manager

## 0. Document Purpose

This PRD defines the first version of Auction Manager for the product owner, builder, UX/design work, architecture planning, and story breakdown. It is based on the current product brief at `_bmad-output/planning-artifacts/briefs/brief-auction_manager-2026-07-03/brief.md` and the PRD discovery decisions recorded in this workspace. Requirements are grouped by feature, functional requirements are globally numbered, and inferred items are marked with `[ASSUMPTION]`.

## 1. Vision

Auction Manager is a simple local web app for running a live amateur church cricket league auction from one PC. It replaces an Excel-driven live process with an operator-friendly control surface and a large-display-friendly auction board that captains and attendees can follow at a glance.

The product is intentionally small. It is not a public platform, SaaS product, mobile-first app, or long-term league-management system. The first version exists to make one live event easier to run: configure auction parameters, reveal players in the required role/gender order, track bidding, enforce auction rules, update team budgets and role counts, run a randomized second bidding phase for unsold players, manually assign any remaining unsold players, and recover from operator mistakes without returning to Excel.

The experience should feel calm under pressure. The operator should always see the safe next action, captains should understand the current auction state, and dangerous operations should be kept away from the normal live flow.

## 2. Target Users

### 2.1 Jobs To Be Done

- As an auction operator, run the full live auction from one PC without switching back to Excel during the event.
- As an auction operator, reveal players, update bids, select teams, mark outcomes, and recover mistakes quickly while people are watching.
- As a team captain, understand which player is currently up, what the current bid is, and whether my team can still bid.
- As a league participant or attendee, follow the auction state from the large display without needing access to operator controls.
- As the event organizer, trust that budgets, squad size, and role counts stay accurate throughout the auction.

### 2.2 Non-Users For v1

- Remote bidders or captains using their own devices.
- Public users outside the church league event.
- Administrators managing league operations after the auction.
- Players registering, paying, or editing their profile inside the app.

### 2.3 Key User Journeys

- **UJ-1. Aaron runs the first role-wise live bidding round from one PC.**
  - **Persona + context:** Aaron is the auction operator at the church event. The app is open on his PC and mirrored to a large display.
  - **Entry state:** Auction parameters, Player CSV, local player photos, team names, and team logos are loaded before the auction begins.
  - **Path:** Aaron creates the auction, confirms parameters, starts the auction, reveals players by the Phase 1 role/gender category order, selects the bidding team as captains bid verbally, increases the bid by the configured increment, and marks each player as sold or unsold.
  - **Climax:** The app records the sale and immediately updates the winning team's remaining budget, squad size, and role counts.
  - **Resolution:** The auction moves to the next pending player in the current category, or to the next category when that category is exhausted, and the display remains understandable for captains and attendees.
  - **Edge case:** If Aaron selects the wrong team or increments the bid incorrectly, he uses multi-step undo to return to a correct prior state.

- **UJ-2. Captains follow the auction from the projected board.**
  - **Persona + context:** Captains are watching the projected display while bidding verbally.
  - **Entry state:** A current player is visible on the auction board.
  - **Path:** Captains see the player's name, photo, role, base price, current bid, active bidding team, and relevant team state.
  - **Climax:** Captains can tell whether a team has enough configured budget, squad capacity, and role capacity for the player.
  - **Resolution:** Captains can keep bidding without asking the operator to inspect spreadsheet cells.

- **UJ-3. Aaron rebids unsold players after Phase 1 ends.**
  - **Persona + context:** Aaron has completed Phase 1 bidding and some players remain unsold.
  - **Entry state:** No Phase 1 pending players remain.
  - **Path:** Aaron starts the second-phase unsold bidding pass, the app randomizes the unsold player order, and Aaron runs normal bidding controls for each revealed unsold player.
  - **Climax:** A second-phase sale updates the winning team's remaining budget, squad size, and role counts using the same configured validation rules as Phase 1.
  - **Resolution:** Sold players leave the unsold pool; players still unsold move to the third-phase manual assignment pool.
  - **Edge case:** If Aaron starts the phase early or records the wrong outcome, he uses multi-step undo.

- **UJ-4. Aaron manually assigns players still unsold after rebidding.**
  - **Persona + context:** Aaron has completed Phase 2 and some players still remain unsold.
  - **Entry state:** No second-phase bidding players remain.
  - **Path:** Aaron starts the third-phase manual assignment flow, views the remaining unsold players, selects an assignment team, and manually assigns each player.
  - **Climax:** The app records the manual assignment only when the selected team can accept the player under squad and role rules; by default, manual assignment has no budget impact.
  - **Resolution:** Team squad and role counts update, and the operator continues until no remaining unsold players can or need to be assigned.
  - **Edge case:** If a manual assignment is wrong or triggered too early, Aaron can use multi-step undo.

## 3. Glossary

- **Auction** - The live event process where Players are revealed, Captains bid verbally, and the Auction Operator records outcomes.
- **Auction Board** - The large-display-friendly UI showing the current auction state.
- **Auction Creation** - The setup step where the Auction Operator creates a new auction, enters or confirms Auction Parameters, and loads source data before Start Auction.
- **Auction Operator** - The person controlling the app from the single PC during the event.
- **Auction Parameters** - The auction-specific values entered or confirmed during Auction Creation, including Role Base Prices, Bid Increment, Team Budgets, Player Cap, Role Targets, and Manual Assignment budget behavior.
- **Base Price** - The starting price for a Player, derived from the auction's configured Role Base Price for that Player's Role.
- **Bid Increment** - The auction's configured amount by which the Current Bid increases.
- **Captain** - The person bidding verbally on behalf of a Team.
- **Close Auction** - A Dangerous Operation that ends the auction workflow.
- **Current Bid** - The active bid value for the Current Player.
- **Current Player** - The Player currently revealed for bidding or assignment.
- **Dangerous Operation** - A high-impact operation, such as Reset Auction or Close Auction, that should be separated from the normal live flow and not always visible.
- **Initial Role-Wise Bidding Phase / Phase 1** - The first bidding phase where Players are revealed by role/gender category in the required order: Ace Men, Ace Women, Women All Rounders, Men Bowlers, Men Batsmen, Men All Rounders.
- **Local State File** - File-based local persistence used to recover auction state on the same system.
- **Manual Assignment Phase / Phase 3** - The final phase where the Auction Operator manually assigns Players still unsold after Phase 2 to valid Teams.
- **Pending Player** - A Player not yet revealed in the current bidding phase.
- **Player** - A registered participant in the cricket league auction.
- **Manual Assignment** - Operator-selected assignment of an Unsold Player to a valid Team during the Manual Assignment Phase.
- **Phase 1 Category** - A Player's role/gender bucket for Phase 1 sequencing, derived from the imported `Gender` and `Skill` fields.
- **Reset Auction** - A Dangerous Operation that clears or restarts auction progress.
- **Role** - A Player category used for Team composition. v1 roles are Ace, Batting, Bowling, All Rounder, and Girls.
- **Role Count** - The number of Players of each Role currently assigned to a Team.
- **Role Target** - The per-role Team composition target enforced as an upper bound during v1 sale and assignment validation.
- **Sold Player** - A Player assigned to a Team through bidding at a Sold Price.
- **Sold Price** - The final Current Bid recorded when a Player is marked sold.
- **Squad Size** - The number of Players assigned to a Team.
- **Team** - A cricket league team with a name, logo, Captain, budget, squad, and Role Counts.
- **Team Budget** - The configured total and remaining budget available to a Team.
- **Team CSV** - The local CSV file used to import Team names and Captain names in v1.
- **Undo History** - The app's record of reversible live auction actions across multiple steps.
- **Unsold Bidding Phase / Phase 2** - The second bidding phase where Players left unsold after Phase 1 are revealed in randomized order and bid on again.
- **Unsold Player** - A Player marked unsold during a bidding phase and held for the next configured unsold-player phase.

## 4. Features

### 4.1 Local Auction Setup

**Description:** The Auction Operator creates the auction before the live event by entering or confirming Auction Parameters and loading local files. Player data comes from a CSV exported from the current Google Sheet. Player photos are local files sourced from Google Drive. Team names and Captain names come from a local Team CSV, and Team logos come from a local folder. v1 setup is import-only for source data: source data fixes happen in the input files and are reimported, not edited manually inside the app. The setup flow should expose data and parameter problems before the auction starts, not during live bidding.

**Functional Requirements:**

#### FR-1: Load player CSV

The Auction Operator can load a CSV containing registered Player records.

**Consequences:**
- The system accepts the current Google Forms/Sheets registration export columns: `Timestamp`, `Email address`, `Score`, `Place and Pastor Name`, `Full Name`, `Gender`, `Mobile Number`, `Email`, `Skill`, `TShirt Size`, `Jersey Number`, `Meal Preference (only applicable for Registrants Outside of Bangalore)`, `Photo Upload`, `Payment Confirmation`, `Payment Transaction Id`, and `Validated`.
- The imported CSV is expected to contain only Players intended for the auction; v1 does not filter auction eligibility from `Payment Confirmation`, `Payment Transaction Id`, or `Validated`. [ASSUMPTION]
- The system derives Player name from `Full Name`.
- The system derives Player gender from `Gender`.
- The system derives Role from `Skill`.
- The system derives each Player's Phase 1 Category from `Gender` and `Skill`.
- The setup flow identifies Players that cannot be mapped into one of the configured Phase 1 Categories before Start Auction.
- The system ignores source fields that are not needed for the auction board or auction logic.
- The system does not support manual Player data editing inside setup in v1; Player data corrections require updating the source CSV and reimporting.

#### FR-2: Configure role-based base prices

During Auction Creation, the Auction Operator can enter or confirm Role Base Prices used to derive each Player's Base Price.

**Consequences:**
- The setup flow may prefill current league defaults: Ace 10, Batting 8, Bowling 6, and Women/Girls 6.
- The operator can edit default Role Base Prices before Start Auction.
- The operator can enter a Base Price for any additional Role found in the Player CSV, including All Rounder if it appears as a separate Role.
- Every Player whose Role has a configured pricing rule has a Base Price before the auction can start.
- The Base Price is visible when the Player is revealed.
- The setup flow identifies any Player Role without a configured Base Price before Start Auction.
- The system prevents Start Auction until every Player Role in the auction has a configured Base Price.

#### FR-3: Match local player photos

The Auction Operator can provide local Player photo files and the system can associate them with Players.

**Consequences:**
- The system supports common local image formats including JPEG, PNG, HEIC, and WebP.
- The system can use `Photo Upload` metadata where useful.
- The system can match local photo filenames that contain the Player name as it appears in the CSV.
- If a Player photo cannot be matched, the system identifies the missing match before the auction starts and still allows the operator to proceed with a clear placeholder. [ASSUMPTION]

#### FR-4: Load team CSV and logos

The Auction Operator can load Team names and Captain names from a local Team CSV and Team logos from a local folder.

**Consequences:**
- Every Team has a Team name before the auction starts.
- Every Team has a Captain name from the Team CSV.
- The system can associate a Team logo from the local logos folder.
- If a logo cannot be matched, the system identifies the missing logo before the auction starts and still allows the operator to proceed with a clear placeholder. [ASSUMPTION]
- The system does not support manual Team data editing inside setup in v1; Team data corrections require updating the Team CSV and reimporting.

#### FR-5: Configure auction parameters

During Auction Creation, the Auction Operator can enter or confirm the Auction Parameters that control bidding, budgets, squad limits, role limits, and manual assignment behavior.

**Consequences:**
- The setup flow may prefill current league defaults: Team Budget 170 per Team, Bid Increment +2, Maximum Squad Size 13 Players per Team, and Role Targets of Ace 2, Batting 3, Bowling 2, All Rounder 2, and Girls 2.
- The setup flow includes the Phase 1 Category order: Ace Men, Ace Women, Women All Rounders, Men Bowlers, Men Batsmen, Men All Rounders.
- The operator can edit the Bid Increment before Start Auction.
- The operator can enter or confirm Team Budget for each Team before Start Auction; a shared default may be applied to all Teams and then edited per Team.
- The operator can enter or confirm the Player Cap / Maximum Squad Size per Team before Start Auction.
- The operator can enter or confirm per-role Role Targets before Start Auction; Role Targets are enforced per Team as upper bounds.
- The operator can enter or confirm Manual Assignment budget behavior before Start Auction; the default is no Team Budget impact.
- The system prevents Start Auction until required Auction Parameters are complete and internally valid.
- The system prevents Start Auction until every Player can be assigned to exactly one Phase 1 Category.
- Auction Parameters are locked after Start Auction for the current auction. Changing them requires Reset Auction or creating a new auction. [ASSUMPTION]
- v1 uses hard blocks for rule violations, not warnings.

#### FR-6: Start the auction

The Auction Operator can start the Auction after setup is complete.

**Consequences:**
- The system prevents auction start when required Auction Parameters, non-image Player data, or Team data are missing.
- Starting the Auction initializes Pending Players, Team Budgets, Squad Sizes, Role Counts, and Undo History from the configured Auction Parameters.
- Starting the Auction creates or updates Local State Files for recovery.

### 4.2 Live Auction Board And Player Reveal

**Description:** The app shows a clear live Auction Board that works when mirrored from the operator's PC to a large display. v1 can use a single mirrored operator/display view; a separate audience-only screen is out of scope for v1 but may be developed later if the mirrored view is too cluttered.

**Functional Requirements:**

#### FR-7: Create Phase 1 role-wise player order

The system creates the Phase 1 player order by grouping Pending Players into the configured role/gender category sequence.

**Consequences:**
- Phase 1 uses this required category order: Ace Men, Ace Women, Women All Rounders, Men Bowlers, Men Batsmen, Men All Rounders.
- The system reveals all Players in one Phase 1 Category before moving to the next category.
- Each Player appears once in Phase 1.
- Within each Phase 1 Category, Player order is randomized. [ASSUMPTION]
- Sold Players and Unsold Players are removed from the Phase 1 Pending Player pool.
- The Phase 1 order persists in Local State Files so recovery does not reshuffle the auction.

#### FR-8: Reveal next player

The Auction Operator can reveal the next Pending Player as the Current Player.

**Consequences:**
- The Auction Board shows the Current Player's name, photo or placeholder, Role, and Base Price.
- The Current Bid starts from the Current Player's Base Price.
- Revealing a Player is included in Undo History.

#### FR-9: Display live auction state

The Auction Board shows the state needed by the Auction Operator, Captains, and attendees during live bidding.

**Consequences:**
- The board shows Current Player details, Current Bid, selected bidding Team, and outcome state.
- The board shows Team Budget, remaining budget, Squad Size, and Role Counts.
- Information must remain legible on a large display when mirrored from one PC.

#### FR-10: Keep operator controls obvious

The interface makes the safe next action clear during live auction flow.

**Consequences:**
- Primary live actions are visually easier to reach than destructive or rare actions.
- The Auction Operator should not need to search through spreadsheet cells or nested menus during routine bidding.
- Dangerous Operations are separated from routine controls.

### 4.3 Live Bidding And Outcomes

**Description:** During Phase 1 and Phase 2 bidding, Captains bid verbally and the Auction Operator records the app state. The system must keep the auction moving quickly while preventing invalid outcomes.

**Functional Requirements:**

#### FR-11: Select bidding team

The Auction Operator can select the Team currently associated with the Current Bid.

**Consequences:**
- The selected Team is visible on the Auction Board.
- Changing the selected Team is included in Undo History.
- The system can clear or change the selected Team before sale.

#### FR-12: Increase bid

The Auction Operator can increase the Current Bid by the configured Bid Increment.

**Consequences:**
- Bid changes are included in Undo History.
- The Auction Board immediately reflects the updated Current Bid.

#### FR-13: Hard-block invalid sales

The system prevents a sale that would violate configured Team Budget, Player Cap / Maximum Squad Size, or Role Targets.

**Consequences:**
- A Team cannot buy a Player if the Sold Price exceeds the Team's remaining budget.
- A Team cannot exceed the configured Player Cap / Maximum Squad Size.
- A Team cannot exceed the Role Target for the Player's Role.
- The block explains the reason clearly enough for the Auction Operator to resolve it during the event.

#### FR-14: Mark player sold

The Auction Operator can mark the Current Player as sold to the selected Team at the Current Bid.

**Consequences:**
- The Player status becomes Sold Player.
- The Player records Sold Price and winning Team.
- The system prevents Mark Sold when no Team is selected.
- The winning Team's remaining budget decreases by Sold Price.
- The winning Team's Squad Size and Role Count update.
- The sale is included in Undo History.

#### FR-15: Mark player unsold

The Auction Operator can mark the Current Player as unsold during a bidding phase.

**Consequences:**
- The Player status becomes Unsold Player.
- If the Player is marked unsold in Phase 1, the Player enters the Phase 2 Unsold Bidding pool.
- If the Player is marked unsold in Phase 2, the Player enters the Phase 3 Manual Assignment pool.
- Team Budget, Squad Size, and Role Counts do not change.
- The unsold action is included in Undo History.

### 4.4 Unsold Bidding And Manual Assignment Phases

**Description:** After Phase 1 bidding is complete, Unsold Players get a randomized second bidding phase. Any Players still unsold after Phase 2 move to a third phase where the Auction Operator manually assigns them to valid Teams.

**Functional Requirements:**

#### FR-16: Start second-phase unsold bidding

The Auction Operator can start the Unsold Bidding Phase after Phase 1 bidding is complete.

**Consequences:**
- The system makes Phase 1 Unsold Players available for second-phase bidding.
- The system creates a randomized order of Unsold Players for Phase 2.
- Each Phase 1 Unsold Player appears once in the Phase 2 randomized order.
- The Phase 2 randomized order persists in Local State Files so recovery does not reshuffle the phase.
- The system prevents the Unsold Bidding Phase from starting while Phase 1 Pending Players remain, unless the operator intentionally skips remaining Phase 1 Pending Players. [ASSUMPTION]
- Starting the phase updates Local State Files.

#### FR-17: Run second-phase bidding for unsold players

The Auction Operator can run normal bidding controls for each Player revealed in the Unsold Bidding Phase.

**Consequences:**
- The Auction Operator can reveal the next Phase 2 Unsold Player as the Current Player.
- The Current Bid starts from the Current Player's Base Price. [ASSUMPTION]
- Team selection, bid increment, Mark Sold, Mark Unsold, and hard-block validation work the same way as Phase 1 bidding.
- A second-phase Sold Player records Sold Price and winning Team, reduces the winning Team's remaining budget, and updates Squad Size and Role Count.
- A Player marked unsold in Phase 2 enters the Phase 3 Manual Assignment pool.
- Second-phase reveal, bid, sale, and unsold actions are included in Undo History.

#### FR-18: Run third-phase manual assignment

The Auction Operator can manually assign Players still unsold after Phase 2 to selected valid Teams.

**Consequences:**
- The Manual Assignment Phase can start only after Phase 2 bidding is complete, unless the operator intentionally skips remaining Phase 2 Pending Players. [ASSUMPTION]
- The operator selects the assignment Team.
- The system permits assignment only when the selected Team can accept the Player under Squad Size and per-role Role Target rules.
- Manual Assignment follows the configured Manual Assignment budget behavior; the default is no Team Budget impact.
- The assigned Player is no longer in the Unsold Player pool.
- The receiving Team's Squad Size and Role Count update.
- Manual Assignment is included in Undo History.
- The system supports continuing Manual Assignment until no Unsold Players remain or no valid assignment exists.
- If no valid Team exists for an Unsold Player, the system identifies the unresolved Player and reason. [ASSUMPTION]
- The Auction Operator can close the Auction after Phase 3 handling is complete.

### 4.5 Undo, Recovery, And Dangerous Operations

**Description:** The app must support fast correction during a live event. Undo is multi-step and applies to live auction actions. Reset Auction and Close Auction are intentionally excluded from undo and treated as Dangerous Operations.

**Functional Requirements:**

#### FR-19: Support multi-step undo

The Auction Operator can undo multiple prior live auction actions.

**Consequences:**
- Undo covers bid changes, selected Team changes, Next Player reveal, Mark Sold, Mark Unsold, second-phase bidding actions, and Manual Assignment.
- Undo restores affected Player status, Current Bid, selected Team, Team Budget, Squad Size, Role Counts, and phase state as needed.
- Undo does not cover Reset Auction or Close Auction.
- The system communicates what action will be undone before or immediately after undo. [ASSUMPTION]

#### FR-20: Persist local auction state

The system stores auction state in Local State Files on the local system.

**Consequences:**
- Local State Files preserve Auction Parameters, setup data references, Phase 1 ordering, Phase 2 randomized order, Player statuses, bids, Team Budgets, Squad Sizes, Role Counts, phase state, and Undo History.
- The system updates Local State Files after every completed state-changing setup or live auction action.
- If the app is closed and reopened on the same PC, the operator can resume from the latest saved state. [ASSUMPTION]
- State persistence is local-only for v1.

#### FR-21: Treat reset as dangerous

The system supports Reset Auction as a Dangerous Operation.

**Consequences:**
- Reset Auction is not always visible during the normal live flow.
- Reset Auction requires confirmation through a modal before execution.
- Reset Auction is not reversible through Undo.

#### FR-22: Treat close as dangerous

The system supports Close Auction as a Dangerous Operation.

**Consequences:**
- Close Auction is not always visible during the normal live flow.
- Close Auction requires confirmation through a modal before execution.
- Close Auction is not reversible through Undo.

## 5. Cross-Cutting Requirements

### 5.1 Reliability

- The app must be stable enough to run one live event from one PC without relying on Excel during the event.
- Local State Files must be updated after every completed state-changing action so accidental app close or browser refresh does not require restarting the auction from scratch.
- Auction Parameters must persist with the auction and remain consistent after Start Auction.
- The Phase 1 ordering and Phase 2 randomized order must not change after each phase starts unless Reset Auction is deliberately executed.

### 5.2 Usability

- Live controls must be fast enough for an operator under public pressure.
- Routine controls should be visible and obvious during the current phase.
- Dangerous Operations should be visually and interaction-wise separated from routine controls.
- The Auction Board must be readable on a large display when mirrored from the operator PC.

### 5.3 Privacy And Data Minimization

- The app should only display auction-relevant Player data: name, photo, Role, Base Price, Current Bid, status, Sold Price, and winning Team.
- The app should not display email addresses, mobile numbers, payment transaction IDs, or other non-auction registration fields on the Auction Board.
- v1 stores state locally and does not transmit auction data to a public service.

### 5.4 Data Compatibility

- Player photos should support JPEG, PNG, HEIC, and WebP.
- The app should tolerate uncontrolled local photo filename patterns when the Player name appears somewhere in the filename.
- Setup should surface missing or ambiguous data and incomplete Auction Parameters before Start Auction.

## 6. Non-Goals

- Public deployment or hosting.
- User accounts, login, permissions, or role-based access.
- Online multi-device bidding.
- Captains controlling bids from their own devices.
- Payment collection or registration management.
- Long-term league management after the event.
- Complex analytics or reporting.
- Mobile-first experience.
- Separate audience-only display in v1.
- Editing Auction Parameters after Start Auction without Reset Auction or creating a new auction.

## 7. MVP Scope

### 7.1 In Scope

- Local single-PC operation.
- Locally hosted web app surface.
- Mirrored operator/display view suitable for a large screen.
- CSV-based Player import from the current Google Sheets export.
- Local Player photo support.
- Local Team CSV with Captain names and Team logo folder support.
- Import-only setup for Player and Team source data.
- Auction Creation flow for entering or confirming Auction Parameters.
- Configurable Role Base Prices, Bid Increment, Team Budgets, Player Cap / Maximum Squad Size, Role Targets, and Manual Assignment budget behavior.
- Phase 1 role/gender category order with randomized Player order within each category.
- Randomized second-phase bidding order for Unsold Players.
- Player reveal with name, photo, Role, and Base Price.
- Current Bid tracking with the configured Bid Increment.
- Team selection and sold/unsold outcomes.
- Hard blocks for configured Team Budget, Player Cap / Maximum Squad Size, and Role Target violations.
- Team Budget, Squad Size, and Role Count tracking.
- Second-phase Unsold Bidding Phase.
- Third-phase Manual Assignment for Players still unsold after Phase 2.
- Configurable Manual Assignment budget behavior, with no Team Budget impact as the default.
- Multi-step Undo for live auction actions.
- File-based local state persistence.
- Reset Auction and Close Auction as Dangerous Operations.

### 7.2 Out Of Scope For MVP

- Public deployment: the event runs locally on one PC.
- User accounts and permissions: the Auction Operator controls the app directly.
- Online bidding: Captains bid verbally.
- Payment collection: registration/payment source data is imported only as needed for auction setup.
- Long-term league management: v1 ends at running the auction.
- Advanced analytics: not needed for the live event.
- Mobile-first UX: the primary surface is a PC mirrored to a large display.
- Separate audience display: deferred unless the mirrored operator view proves too cluttered.

## 8. Success Metrics

**Primary**

- **SM-1:** The Auction Operator completes the full auction without returning to Excel during the event. Validates FR-1 through FR-22.
- **SM-2:** Team Budget, Squad Size, and Role Counts remain accurate after every Sold Player and Manual Assignment according to configured Auction Parameters. Validates FR-13, FR-14, FR-17, FR-18, FR-19, and FR-20.
- **SM-3:** Invalid sales are blocked when they would exceed configured Team Budget, Player Cap / Maximum Squad Size, or Role Targets. Validates FR-13.
- **SM-4:** Unsold Players can be resolved through randomized second-phase bidding and third-phase operator-controlled Manual Assignment after Phase 1 bidding. Validates FR-16 through FR-18.

**Secondary**

- **SM-5:** The large display clearly shows the Current Player, Current Bid, selected Team, and Team state during live bidding. Validates FR-8, FR-9, and FR-10.
- **SM-6:** Common operator mistakes can be corrected with multi-step Undo without manually editing source files. Validates FR-19 and FR-20.
- **SM-7:** Setup from Auction Parameters, CSV, local photos, team list, and logos is practical before the auction starts. Validates FR-1 through FR-6.

**Counter-metrics**

- **SM-C1:** Do not optimize for public deployment or multi-device architecture at the expense of local event reliability. Counterbalances SM-1.
- **SM-C2:** Do not maximize on-screen controls if that makes Dangerous Operations easier to trigger accidentally. Counterbalances SM-5.
- **SM-C3:** Do not expose extra registration data just because it exists in the source CSV. Counterbalances SM-7.

## 9. Open Questions

No open questions block the current v1 PRD.

## 10. Assumptions Index

- FR-1: The imported CSV contains only Players intended for the auction; v1 does not filter eligibility from payment or validation fields.
- FR-3: If a Player photo cannot be matched, the system may proceed with a placeholder after surfacing the issue.
- FR-4: If a Team logo cannot be matched, the system may proceed with a placeholder after surfacing the issue.
- FR-5: Auction Parameters are locked after Start Auction for the current auction; changing them requires Reset Auction or creating a new auction.
- FR-7: Within each Phase 1 Category, Player order is randomized.
- FR-16: Unsold Bidding Phase cannot start while Phase 1 Pending Players remain unless the operator intentionally skips remaining Phase 1 Pending Players.
- FR-17: In second-phase bidding, Current Bid starts from the Current Player's Base Price.
- FR-18: Manual Assignment Phase cannot start while Phase 2 Pending Players remain unless the operator intentionally skips remaining Phase 2 Pending Players; if no valid Team exists for an Unsold Player, the system identifies the unresolved Player and reason.
- FR-19: The system communicates what action will be undone before or immediately after undo.
- FR-20: Reopening the app on the same PC can resume from the latest saved state.

## 11. Deferred Stakeholder Inputs

No deferred stakeholder inputs remain for current auction parameter values because they are entered or confirmed during Auction Creation.
