---
title: 'Improve Team Cards'
type: 'feature'
created: '2026-07-08'
status: 'in-review'
baseline_commit: 'a32fb02798c0b144ddfec0e56a8b611e47972271'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The live auction team cards are cramped and visually similar, so the auctioneer must read too much small text to know who can bid. The cards need to surface team identity, captain, purse, squad count, category quota, and bid eligibility as distinct scan targets.

**Approach:** Redesign the live team tile content and styling into clearer grouped regions while staying inside the existing live board grid. Use compact visual status chips derived from existing `currentPlayerCapacity`, budget, and role quota data: Eligible, Quota full, Low budget, and Cannot bid.

## Boundaries & Constraints

**Always:** Keep the change local to the web live auction team-card surface unless tests reveal shared helper extraction is needed. Source bid eligibility from `team.currentPlayerCapacity.canBuy` and `team.currentPlayerCapacity.reasons`; do not duplicate domain bidding rules in React. Preserve the existing select-team button behavior, Details trigger, accessible labels, selected state, and eight-team first-viewport layout requirements at 1440x900 and 1366x768.

**Ask First:** Halt before changing backend/domain eligibility logic, adding new DTO fields, changing auction parameters, or redesigning manual assignment cards beyond shared style compatibility.

**Never:** Do not hide any required team card facts. Do not replace textual data with color-only meaning. Do not make selected teams appear eligible if the capacity data says they cannot buy.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Eligible team | Current Player is revealed; team has `currentPlayerCapacity.canBuy === true`; role quota is not full; budget is comfortably above current bid | Card shows team name, captain, remaining purse, squad count, quota count, and an `Eligible` chip | N/A |
| Quota blocked | Current Player is revealed; team cannot buy and capacity reasons indicate the current role/category quota is full | Card shows quota count and a `Quota full` chip; accessible label includes the blocking reason | Existing disabled/blocked selection behavior remains unchanged |
| Low budget | Current Player is revealed; team has remaining purse at or below the current bid, or capacity reasons indicate insufficient budget | Card shows a `Low budget` chip when still technically eligible or as the leading reason when blocked by budget | Existing mark-sold/select-team validation remains the source of truth |
| Generic blocked | Current Player is revealed; team cannot buy for reasons that are not clearly quota or budget | Card shows `Cannot bid` and exposes the reason text without relying on color alone | Existing capacity reason fallback remains available |
| No current player | No Current Player is revealed yet | Card still shows team name, captain, purse, squad count, and the most relevant quota context available; eligibility chip does not falsely imply a live bid can happen | N/A |

</frozen-after-approval>

## Code Map

- `apps/web/src/main.tsx` -- renders the live auction team matrix, selected-team state, per-team capacity labels, and Details trigger.
- `apps/web/src/styles.css` -- owns live-board density, card layout, selected state, responsive first-viewport constraints, and team-tile visual treatment.
- `apps/web/src/main.test.tsx` -- React tests for the projected live board and team tile accessibility/visibility behavior.
- `apps/web/e2e/event-mode-layout.spec.ts` -- guards the eight-team live board first-viewport fit at 1440x900 and 1366x768.
- `packages/shared/src/index.ts` -- confirms existing `BoardTeamDto.currentPlayerCapacity` shape; no schema change expected.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/main.tsx` -- Extract or inline a small presentational status derivation for live team cards -- makes chip labels consistent without changing bidding rules.
- [x] `apps/web/src/main.tsx` -- Update live team tile markup to visually separate identity, status chip, purse, squad count, and category quota -- improves scanability for auctioneer use.
- [x] `apps/web/src/styles.css` -- Add compact chip and metric styles within existing live-board constraints -- keeps cards distinct without expanding the grid beyond viewport limits.
- [x] `apps/web/src/main.test.tsx` -- Add/adjust tests for Eligible, Quota full, Low budget, and Cannot bid chip rendering -- protects the new auctioneer-facing signals.
- [x] `apps/web/e2e/event-mode-layout.spec.ts` -- Keep or extend layout assertions as needed -- verifies the denser card design still fits eight teams in the first viewport.

**Acceptance Criteria:**
- Given a revealed Current Player and an eligible team, when the live team matrix renders, then the team card shows the team name, captain, remaining purse, squad count, quota count, and an `Eligible` chip.
- Given a revealed Current Player and a team blocked by full current-role quota, when the live team matrix renders, then the team card shows `Quota full` as a visible chip and still exposes the underlying reason for assistive tech.
- Given a team with budget pressure for the current bid, when the live team matrix renders, then the card surfaces `Low budget` as a visible chip without bypassing existing validation.
- Given a team that cannot bid for another reason, when the live team matrix renders, then the card surfaces `Cannot bid` and remains visually distinct from eligible cards.
- Given eight teams at 1440x900 and 1366x768, when the live auction board is displayed, then every team card remains within the first viewport and text does not visibly overlap.

## Design Notes

Prefer one primary chip per card so the auctioneer can scan quickly. Precedence should favor the most action-relevant state: `Quota full` and budget-blocked `Low budget` before generic `Cannot bid`; eligible low-budget teams may show `Low budget` only when it is genuinely helpful and not misleading.

## Verification

**Commands:**
- `npm run typecheck` -- expected: TypeScript succeeds.
- `npm test -- apps/web/src/main.test.tsx apps/web/src/auction-board-helpers.test.ts` -- expected: focused web tests succeed.
- `npm run test:e2e:event` -- expected: event mode and event layout Playwright suites succeed, including first-viewport screenshots.
