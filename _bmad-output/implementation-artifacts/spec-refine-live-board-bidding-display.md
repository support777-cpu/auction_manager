---
title: 'Refine live board bidding display'
type: 'feature'
created: '2026-07-08'
status: 'done'
route: 'one-shot'
---

## Intent

**Problem:** The live board showed redundant unsold pool copy, separated bidding status from the current bid, a sidebar team matrix, and a small base price that was hard to read during bidding.

**Approach:** Combine current bid value and team bidding status in one bar, remove the unsold pool summary line, enlarge base price typography, move the team grid below the player card in a single-column layout, and surface block feedback beside the bid panel to preserve viewport fit.

## Suggested Review Order

- Live bidding status helper (team name only; bid shown separately)
  [`auction-board-helpers.ts:137`](../../apps/web/src/auction-board-helpers.ts#L137)

- Player stage: bid bar with value + team status, block feedback
  [`main.tsx:3377`](../../apps/web/src/main.tsx#L3377)

- Team matrix placement below player card
  [`main.tsx:3429`](../../apps/web/src/main.tsx#L3429)

- Layout CSS: single column, bid bar, base price, compact viewports
  [`styles.css:1874`](../../apps/web/src/styles.css#L1874)

- Unit tests for bidding status and removed unsold summary
  [`auction-board-helpers.test.ts:389`](../../apps/web/src/auction-board-helpers.test.ts#L389)

- E2E expectations for combined bid bar and layout fit
  [`event-mode.spec.ts:328`](../../apps/web/e2e/event-mode.spec.ts#L328)
