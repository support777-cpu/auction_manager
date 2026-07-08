---
title: Sprint Change Proposal
project: auction_manager
date: 2026-07-08
status: applied-from-user-request
mode: batch
requested_by: Udeet
replaces_story: 2.5.5 Run Redesign Functional, E2E, Unit, and Visual QA Gates
replacement_story: 2.5.5 Clarify Bid Leader and Event Timeline
---

# Sprint Change Proposal - Bid Leader and Event Timeline

## 1. Issue Summary

The current live-bidding UI still reads like "select a Team, then increase bid or mark sold." The requested behavior is sharper: selecting a Team should record that the Team bid the current value, show that Team as the current leader, and make the bidding history readable as a proper event timeline.

Evidence from feedback:

- The auctioneer should select a Team and bid, log that this Team bid this value, and show the Team as the current leader.
- The UI should remove redundant selected-Team chrome beside the Teams header and remove the Team count beside the Teams header.
- Overall section headers should be bigger.
- The leading Team must be visually highlighted so the auctioneer does not need to read the log.
- The bottom log should become a timestamped, color-coded event timeline with a larger latest event.

## 2. Impact Analysis

### Epic Impact

Epic 2.5 remains the right place for this work because the change is part interaction semantics and part live-board readability refinement before Epic 3 reuses bidding controls for unsold players.

Current Story 2.5.5 is no longer needed as a standalone QA-gate story. Its broad QA responsibility is replaced by a more valuable implementation story with focused tests and review gates.

Epic 3 should still wait until Story 2.5.5 is complete because Phase 2 bidding will inherit the same Team-bid and current-leader behavior.

### Story Impact

Replace:

```
Story 2.5.5: Run Redesign Functional, E2E, Unit, and Visual QA Gates
```

With:

```
Story 2.5.5: Clarify Bid Leader and Event Timeline
```

This is one dev story, not two. The work is cohesive because Team-bid recording, current-leader highlight, header cleanup, section heading hierarchy, and event timeline all describe the same live-bidding feedback loop.

### PRD Impact

FR-11 changes from simply selecting the Team associated with the Current Bid to recording the Team bidding at that Current Bid and making it the visible leader. FR-12 now clarifies that the next selected Team at an increased Current Bid is recorded as the bidder at that value.

The MVP remains unchanged.

### Architecture Impact

The story may require domain/action-log/DTO changes if the current `SelectTeam` command cannot accurately represent "Team X bid value Y." Domain remains authoritative for the leading Team, sale Team, undo state, action log, and persistence snapshots.

No new external systems, online bidding, new persistence stores, or auction parameters are needed.

### UX Impact

The live board must make the current leader visually obvious, reduce redundant Teams-header chrome, increase section header hierarchy, and replace the plain action log with a typed event timeline.

## 3. Recommended Approach

Recommended path: Direct Adjustment.

Rationale:

- The change is clear, bounded, and inside the existing Epic 2.5 live-board scope.
- Replacing the QA-only story avoids adding extra sprint length while still preserving test and review gates inside the new story.
- One story is sufficient because the behavior and UI all support the same operator question: who is leading right now, and what just happened?

Effort estimate: Medium.

Risk level: Medium. The highest risk is action-log/undo semantics if the current selected-Team command needs richer bid-event meaning.

Timeline impact: No new story count. Story 2.5.5 changes scope from broad QA gate to focused implementation.

Scope classification: Moderate.

## 4. Checklist Results

| Checklist Item | Status | Finding |
| --- | --- | --- |
| 1.1 Triggering story | Done | Trigger affects current Story 2.5.5 backlog scope. |
| 1.2 Core problem | Done | Stakeholder feedback clarified Team selection should record a Team bid and leader, not read as passive selection. |
| 1.3 Evidence | Done | Feedback lists exact UI and log examples. |
| 2.1 Current epic impact | Done | Epic 2.5 remains valid; only Story 2.5.5 changes. |
| 2.2 Epic-level changes | Done | No new epic needed. |
| 2.3 Remaining epics review | Done | Epic 3 inherits the clarified bidding controls. |
| 2.4 New or obsolete epics | Done | No epic added or removed. |
| 2.5 Epic order | Done | No resequencing required. |
| 3.1 PRD conflict | Done | PRD FR-11/FR-12 updated to reflect Team-bid recording. |
| 3.2 Architecture conflict | Done | Potential domain/action-log/DTO update, but no architecture pivot. |
| 3.3 UX conflict | Done | Live board hierarchy and timeline need refinement. |
| 3.4 Other artifacts | Done | `sprint-status.yaml` and implementation story file updated. |
| 4.1 Direct adjustment | Viable | Best path. |
| 4.2 Rollback | Not viable | No completed story needs rollback. |
| 4.3 MVP review | Not viable | MVP scope remains unchanged. |
| 4.4 Path selected | Done | Direct Adjustment. |
| 5.1 Issue summary | Done | Included here. |
| 5.2 Artifact adjustment needs | Done | Included here. |
| 5.3 Recommendation | Done | Included here. |
| 5.4 MVP impact | Done | No MVP scope reduction. |
| 5.5 Handoff plan | Done | Route to Developer agent for Story 2.5.5 implementation. |
| 6.1 Checklist review | Done | All applicable items addressed. |
| 6.2 Proposal accuracy | Done | Grounded in PRD, epics, sprint status, and user feedback. |
| 6.3 User approval | Done | User explicitly requested replacing 2.5.5 with this work. |
| 6.4 sprint-status update | Done | Renamed Story 2.5.5 and set it to `ready-for-dev`. |
| 6.5 Handoff confirmation | Done | Next step is Developer implementation of Story 2.5.5. |

## 5. Detailed Change Proposals

### Proposal A - PRD FR-11/FR-12

OLD:

- Select, change, or clear the Team associated with the Current Bid.
- The selected Team is visible on the Auction Board.

NEW:

- Select the Team bidding at the Current Bid, record that Team's bid at that value, and make that Team the current visible leader.
- The leading Team is visibly highlighted on the Auction Board and Team bid records appear in Undo History and the event timeline.

Rationale: The source requirement now treats Team selection as a bid-recording action, not passive selection.

### Proposal B - Epics Story 2.5.5

OLD:

- `Story 2.5.5: Run Redesign Functional, E2E, Unit, and Visual QA Gates`

NEW:

- `Story 2.5.5: Clarify Bid Leader and Event Timeline`

Rationale: Current 2.5.5 is not needed; the replacement story captures the requested live-bidding behavior and includes focused test/review gates.

### Proposal C - Sprint Status

OLD:

- `2-5-5-run-redesign-functional-e2e-unit-and-visual-qa-gates: backlog`

NEW:

- `2-5-5-clarify-bid-leader-and-event-timeline: ready-for-dev`

Rationale: The story file now exists and is ready for implementation.

## 6. Implementation Handoff

Scope classification: Moderate.

Route to: Developer agent.

Responsibilities:

- Implement Team selection as a bid-at-current-value event.
- Make the current leading Team visually obvious and accessible.
- Remove redundant selected-Team icon/label and Team count from the Teams header.
- Increase live section header hierarchy without breaking first-viewport fit.
- Replace the bottom log with a timestamped, typed, color-coded event timeline.
- Preserve undo, persistence, privacy, invalid-sale blocking, roster switching, and Phase 2 compatibility.

Success criteria:

- Story 2.5.5 reaches `done`.
- `npm run typecheck`, `npm run test`, and `npm run test:e2e:event` pass or any exception is explicitly triaged.
- Reviewer can verify current leader without reading the timeline.
- Timeline shows reveal, Team bid, sold, and unsold events with timestamps, newest-first ordering, color/type treatment, and latest-event emphasis.
