---
title: 'Flatten Live Board Borders And Category Copy'
type: 'feature'
created: '2026-07-08T16:12:54+0530'
status: 'done'
route: 'one-shot'
---

# Flatten Live Board Borders And Category Copy

## Intent

**Problem:** The live board still read as overly boxed-in, and the category value repeated "Current category:" under an existing Category label.

**Approach:** Remove decorative child borders in the live-board treatment, keep the original black live shell background, preserve state/error/focus affordances, and update category-only expectations in e2e coverage.

## Suggested Review Order

**Visual Foundation**

- Removes decorative child borders from nested live counters and facts.
  [`styles.css:3496`](../../apps/web/src/styles.css#L3496)

- Flattens team, roster, media, and metric children while retaining tonal separation.
  [`styles.css:3510`](../../apps/web/src/styles.css#L3510)

**State Preservation**

- Restores filled selected states after the neutral child-surface override.
  [`styles.css:3616`](../../apps/web/src/styles.css#L3616)

- Keeps selected team and view switch controls strongly filled.
  [`styles.css:3626`](../../apps/web/src/styles.css#L3626)

**Category Copy**

- Shows only the category value beneath the visible Category label.
  [`main.tsx:3424`](../../apps/web/src/main.tsx#L3424)

- Preserves an accessible category label for the empty-player state.
  [`main.tsx:3483`](../../apps/web/src/main.tsx#L3483)

**Verification**

- Updates event-mode startup expectation to category-only copy.
  [`event-mode.spec.ts:277`](../../apps/web/e2e/event-mode.spec.ts#L277)

- Updates resumed-auction expectation to category-only copy.
  [`event-mode.spec.ts:553`](../../apps/web/e2e/event-mode.spec.ts#L553)
