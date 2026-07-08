---
title: 'UI Live Board Label and Layout Refresh'
type: 'feature'
created: '2026-07-08'
status: 'done'
route: 'one-shot'
---

# UI Live Board Label and Layout Refresh

## Intent

**Problem:** The live auction UI had inconsistent type scale, outdated Board/Rosters language, a low-contrast empty current-player state, and action controls positioned below team selection.

**Approach:** Update visible labels to Auction/Teams vocabulary, move view switching into the top status band, place live commands above the team matrix, darken the no-player panel, and align live-board type sizing through shared CSS tokens.

## Suggested Review Order

**Live Board Structure**

- Start with the top status band and embedded Auction/Teams switch.
  [`main.tsx:3219`](../../apps/web/src/main.tsx#L3219)

- Confirm no-player state gets the darker styling hook.
  [`main.tsx:3306`](../../apps/web/src/main.tsx#L3306)

- Verify commands now precede team selection in the live flow.
  [`main.tsx:3455`](../../apps/web/src/main.tsx#L3455)

- Confirm team matrix remains intact below the command strip.
  [`main.tsx:3553`](../../apps/web/src/main.tsx#L3553)

**Labeling**

- Review the tab vocabulary and preserved keyboard behavior.
  [`main.tsx:2181`](../../apps/web/src/main.tsx#L2181)

- Check logo fallback visible text and accessible placeholder label.
  [`main.tsx:2278`](../../apps/web/src/main.tsx#L2278)

**Visual System**

- Review the live-board type scale tokens.
  [`styles.css:1744`](../../apps/web/src/styles.css#L1744)

- Check top-band grid sizing for Category plus view switch.
  [`styles.css:1817`](../../apps/web/src/styles.css#L1817)

- Confirm empty-player colors avoid the previous white panel.
  [`styles.css:1974`](../../apps/web/src/styles.css#L1974)

- Review compact command/team typography application.
  [`styles.css:2063`](../../apps/web/src/styles.css#L2063)

**Tests**

- Unit coverage verifies labels, removed Teams metric, and command order.
  [`main.test.tsx:769`](../../apps/web/src/main.test.tsx#L769)

- Closed-state test now expects Teams vocabulary.
  [`main.test.tsx:1058`](../../apps/web/src/main.test.tsx#L1058)

- E2E layout checks the scoped top-band switch.
  [`event-mode-layout.spec.ts:53`](../../apps/web/e2e/event-mode-layout.spec.ts#L53)

- E2E sale flow uses scoped Auction/Teams tab clicks.
  [`event-mode.spec.ts:360`](../../apps/web/e2e/event-mode.spec.ts#L360)

- Roster layout snapshots follow Teams naming.
  [`roster-layout.spec.ts:261`](../../apps/web/e2e/roster-layout.spec.ts#L261)
