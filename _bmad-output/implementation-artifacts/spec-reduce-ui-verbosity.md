---
title: 'Reduce UI verbosity'
type: 'refactor'
created: '2026-07-07'
status: 'done'
route: 'one-shot'
---

## Intent

**Problem:** The setup and auction UI carried explanatory helper copy, meta eyebrows, and non-blocking reassurance messages that made the interface feel verbose and instructional rather than operational.

**Approach:** Remove instructional helper text and rely on headings, status badges, disabled controls, and error alerts; keep blocker and validation messages that explain why an action is blocked.

## Suggested Review Order

- Setup shell trims meta framing and status subtitles
  [`main.tsx:817`](../../apps/web/src/main.tsx#L817)

- Upload rows show status only while loading or errored
  [`main.tsx:898`](../../apps/web/src/main.tsx#L898)

- Photo and logo summaries drop non-blocking reassurance cards
  [`main.tsx:1075`](../../apps/web/src/main.tsx#L1075)

- Start Auction blocker hidden when setup is ready
  [`main.tsx:1306`](../../apps/web/src/main.tsx#L1306)

- Auction board uses compact status tiles without guidance copy
  [`main.tsx:1345`](../../apps/web/src/main.tsx#L1345)

- Parameters section drops save helper and idle hints
  [`auction-parameters-section.tsx:286`](../../apps/web/src/auction-parameters-section.tsx#L286)

- Ready readiness returns empty primary blocker message
  [`setup-readiness.ts:14`](../../packages/shared/src/setup-readiness.ts#L14)

- Schema allows empty blocker message when unblocked
  [`index.ts:245`](../../packages/shared/src/index.ts#L245)

- E2E expectations updated for quieter UI
  [`event-mode.spec.ts:251`](../../apps/web/e2e/event-mode.spec.ts#L251)
