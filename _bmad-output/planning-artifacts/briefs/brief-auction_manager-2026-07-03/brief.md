---
title: Product Brief: Auction Manager
status: draft
created: 2026-07-03
updated: 2026-07-06
---

# Product Brief: Auction Manager

## Executive Summary

Auction Manager is a simple operator-controlled UI for running a live amateur cricket league auction at church. It replaces last year's Excel-based process with a clear auction board, fast controls, and a display-friendly experience that can be cast to a large screen while one operator manages the auction from a single PC.

The product is intentionally small and local. It is not meant to be shipped, hosted publicly, or built as a long-term SaaS product. The first version should be a locally hosted web app that runs on one PC. The goal is to deliver a reliable first version quickly so the auction feels organized, transparent, and easy to follow for captains and attendees.

## Problem

The league already has an auction process, but managing it in Excel puts too much pressure on the operator. During a live auction, the operator needs to reveal players, update bids, select teams, mark outcomes, track budgets, and recover from mistakes while everyone is watching. Excel can hold the data, but it is not a good live control surface or public display.

The audience also needs a clearer view of what is happening: which player is up, what role they play, what the current bid is, which team is bidding, and how each team is progressing against its budget and squad requirements.

## Solution

Auction Manager provides a local auction dashboard with two jobs:

1. Help the operator run the auction quickly using simple, obvious controls.
2. Show participants a clean live auction board on the large display.

The core experience is a phase-based player reveal. At auction creation, the operator enters auction parameters such as role-based base prices, bid increment, team budgets, player cap, role targets, and manual-assignment budget behavior. Phase 1 reveals players by role/gender category in this order: Ace Men, Ace Women, Women All Rounders, Men Bowlers, Men Batsmen, Men All Rounders. Each player appears with their name, photo, role, and configured base price. As captains bid, the operator updates the current bid, selects the active team, and marks the player as sold or unsold. Sold players update the winning team's budget and role counts according to the configured auction parameters. Unsold players are held for a randomized second bidding phase. Players still unsold after that second bidding phase move to a third phase where the operator manually assigns them to teams.

## Users

Primary user: the auction operator, who needs a low-stress control panel that works during a live event.

Secondary users: team captains and league participants watching the projected display. They need the state of the auction to be legible at a glance, without needing to see the operator's data-entry details.

## Core Workflow

1. Operator creates a new auction.
2. Operator enters or confirms auction parameters such as base prices, bid increment, team budgets, player cap, role targets, and manual-assignment budget behavior.
3. Operator loads auction data from CSV and local image files.
4. Operator starts the auction.
5. App reveals the next Phase 1 player with photo, role, and base price, following the configured role/gender category order.
6. Captains bid verbally.
7. Operator selects the bidding team and increases the current bid by the configured increment.
8. Operator marks the player as sold or unsold.
9. App updates team budget, squad size, and role counts.
10. Operator moves to the next player.
11. After Phase 1 bidding ends, operator starts a randomized second bidding phase for unsold players.
12. Operator runs normal bidding controls for each randomized second-phase unsold player.
13. After Phase 2 bidding ends, operator starts a third phase for any players still unsold.
14. Operator manually assigns remaining unsold players to teams.
15. Operator closes the auction when complete.

## Auction Parameters

The app should collect auction parameters during auction creation. The current known league values should be available as editable defaults, not hard-coded application rules:

- Team budgets: default 170 per team, editable before the auction starts.
- Role-based base prices:
  - Ace: 10
  - Batting: 8
  - Bowling: 6
  - Women: 6
- Minimum bid increment: default +2
- Player cap / maximum squad size: default 13 players per team
- Required role targets:
  - Ace: 2
  - Batting: 3
  - Bowling: 2
  - All Rounder: 2
  - Girls: 2
- Phase 1 role/gender category order:
  - Ace Men
  - Ace Women
  - Women All Rounders
  - Men Bowlers
  - Men Batsmen
  - Men All Rounders
- Unsold players should be available for a randomized second bidding phase after Phase 1 bidding is complete.
- Players still unsold after second-phase bidding should be available for a third phase where the operator manually assigns each remaining unsold player to a team.
- Manual assignment budget behavior: default no budget impact.

The operator should be able to edit these values at auction creation, including entering base prices for any role found in the player CSV. The app should prevent the auction from starting until required auction parameters are complete. After the auction starts, parameters are locked for that auction so budget and eligibility calculations remain consistent. The app should hard-block auction actions that violate configured budget, player cap, or role limits.

## Key Data

Player data should come from a CSV downloaded from the current Google Sheet. Player photos can be stored locally after being downloaded from Google Drive. Team data should come from a local file containing the team names and a local folder containing team logos.

The current source data is a Google Forms/Sheets registration export with these columns:

| Column |
| --- |
| Timestamp |
| Email address |
| Score |
| Place and Pastor Name |
| Full Name |
| Gender |
| Mobile Number |
| Email |
| Skill |
| TShirt Size |
| Jersey Number |
| Meal Preference (only applicable for Registrants Outside of Bangalore) |
| Photo Upload |
| Payment Confirmation |
| Payment Transaction Id |
| Validated |

Photo filenames contain the player's name as it appears in the CSV, but the full naming pattern is not controlled. The app should support common local image formats including JPEG, PNG, HEIC, and WebP.

Required player fields:

- Player name, sourced from `Full Name`
- Gender, sourced from `Gender`
- Photo reference, sourced from `Photo Upload` or matched local image file
- Role, sourced from `Skill`
- Phase 1 category, derived from `Gender` and `Skill`
- Base price, derived from the auction's configured role-based pricing rules
- Auction status: pending, current, sold, unsold
- Sold price, if sold
- Winning team, if sold

Required team fields:

- Team name, sourced from the local team list file
- Logo, sourced from the local team logos folder
- Captain
- Total budget, entered or confirmed during auction creation
- Remaining budget
- Squad size
- Count by role

## Operator Controls

Auction-level controls:

- Create Auction / Configure Auction Parameters
- Start Auction
- Close Auction, treated as a dangerous operation that is not always visible
- Reset Auction, treated as a dangerous operation that is not always visible

Live bidding controls:

- Next Player
- Select Team
- Increase Bid
- Mark Sold
- Mark Unsold
- Undo, supporting multiple steps back

Second-phase bidding controls:

- Start Unsold Bidding Phase
- Next Unsold Player
- Select Team
- Increase Bid
- Mark Sold
- Mark Unsold

Third-phase controls:

- Start Manual Assignment Phase
- Select Assignment Team
- Manually Assign Unsold Player

Undo should cover bid changes, selected team changes, next-player reveal, sold outcomes, unsold outcomes, second-phase bidding actions, and manual unsold assignments. It should not cover Reset Auction or Close Auction.

The interface should make the safe next action obvious. During a live event, the operator should not need to search through menus or edit spreadsheet cells. Dangerous operations such as Reset Auction and Close Auction should be separated from the normal live auction flow so the operator does not trigger them accidentally.

The first version can mirror the operator view on the large display. A separate audience-facing screen can be developed later if the mirrored view proves too cluttered.

## First Version Scope

In scope:

- Local single-PC operation
- Locally hosted web app surface
- Large-display-friendly auction board
- Auction creation flow for entering or confirming auction parameters
- Phase 1 player reveal by fixed role/gender category order
- Randomized second-phase bidding for unsold players
- Player reveal with name, photo, role, and base price
- Current bid tracking
- Team selection and sold/unsold outcomes
- Third-phase manual assignment for players still unsold after second-phase bidding
- Team budget, squad size, and role count tracking
- CSV-based data loading
- Local photo/logo support
- File-based local state persistence
- Multi-step undo for meaningful live auction actions
- Reset and close auction controls as dangerous operations
- Mirrored operator/display view for the first version

Out of scope:

- Public deployment
- User accounts or permissions
- Online multi-device bidding
- Payment collection
- Long-term league management
- Complex analytics
- Mobile-first experience

## Success Criteria

The first version succeeds if:

- The operator can run the full auction without returning to Excel during the event.
- The large display clearly shows the current player, current bid, and relevant team state.
- Team budgets and role counts remain accurate throughout the auction.
- Invalid sales are blocked when they would exceed configured budget, player cap, or role limits.
- Unsold players can be handled after Phase 1 through randomized second-phase bidding and, if still unresolved, operator-controlled third-phase manual assignment.
- Common mistakes can be corrected with multi-step undo or simple edits.
- Setup from auction parameters, CSV, and local images is practical before the auction starts.
- Auction state persists locally in files so the operator can recover during the event if needed.
- The app is stable enough for one live event on one PC.

## Deferred Stakeholder Inputs

No deferred stakeholder inputs remain for known auction parameter values because they can be entered or confirmed during auction creation.
