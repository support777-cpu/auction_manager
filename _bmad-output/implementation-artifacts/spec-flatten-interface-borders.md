---
title: 'Flatten interface borders'
type: 'refactor'
created: '2026-07-08'
status: 'in-progress'
baseline_commit: '96db17ef3e612ae140d62cc46d3c67be669f5d94'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-reduce-ui-verbosity.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-08-epic-2-ui-redesign.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app currently uses borders as the default separator for panels, cards, rows, counters, controls, and nested live-board surfaces, which makes the interface feel visually heavy and boxed-in.

**Approach:** Reduce routine outlines, increase local spacing where sections need separation, and use background contrast or shallow elevation for normal surfaces while reserving strong borders for active, selected, focused, error, and blocked states.

## Boundaries & Constraints

**Always:** Preserve the existing red/black event-console direction, responsive layout, accessibility focus rings, active/selected clarity, error visibility, and all current `data-testid`/ARIA behavior. Treat setup, live auction board, manual assignment, rosters, closed state, and team detail drawer as part of the visual pass.

**Ask First:** Changing component structure, moving major regions, altering copy, changing palette direction beyond lighter/darker surface tokens, or removing visual affordances from disabled/error/selected states.

**Never:** Change domain rules, auction commands, persistence behavior, CSV import logic, player/team data rendering, privacy allowlists, test selectors, or the meaning of selected/blocked/disabled states.

</frozen-after-approval>

## Code Map

- `apps/web/src/styles.css` -- primary styling surface; contains setup panels, live-board tokens, team tiles, rosters, manual assignment, drawer, and responsive rules.
- `apps/web/src/main.tsx` -- React markup and class names for live board, setup, rosters, drawer, and manual assignment; inspect only if styling cannot solve a visual issue safely.
- `apps/web/e2e/event-mode-layout.spec.ts` -- visual/layout regression coverage for event mode.
- `apps/web/e2e/manual-assignment-layout.spec.ts` -- visual/layout regression coverage for manual assignment.
- `apps/web/e2e/roster-layout.spec.ts` -- visual/layout regression coverage for roster and closed-state layout.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/styles.css` -- soften setup surfaces by removing non-semantic borders from normal cards/panels, using background contrast and spacing for grouping while retaining error, focus, disabled, and active affordances.
- [x] `apps/web/src/styles.css` -- flatten live-board containers (`live-topbar`, counters, player stage, command strip, outcome region, team matrix) so nested regions do not all carry equal outline weight.
- [x] `apps/web/src/styles.css` -- make team tiles, roster sections, roster rows, manual assignment cards, and drawer summary blocks read as cleaner surfaces; keep selected/active rows visibly stronger than idle rows.
- [x] `apps/web/src/styles.css` -- adjust spacing gaps/padding only where needed to preserve scannability after border removal, including desktop and mobile breakpoints.
- [x] `apps/web/src/styles.css` -- keep strong borders or equivalent high-contrast treatments for selected tabs, selected team tiles/options, active manual pool row, validation/error panels, and keyboard focus states.

**Acceptance Criteria:**
- Given the setup flow, when status cards, upload panels, parameter summaries, and start controls are visible, then routine cards use surface contrast/spacing instead of every element having an outline.
- Given the live auction board, when a player and teams are visible, then the hierarchy reads as topbar, player/bid stage, command strip, and team matrix without nested equal-weight borders competing for attention.
- Given a team is selected or blocked, when the team tile/option renders, then selected and blocked states remain visually obvious and accessible.
- Given roster or closed-state views, when team sections and player rows render, then rows are flatter and cleaner while still scan-friendly.
- Given mobile and short desktop viewports, when the redesigned surfaces render, then text does not overlap and controls remain stable.

## Spec Change Log

## Design Notes

Use tokens rather than one-off colors where possible. A good target is: page/background bands define large regions, slightly raised surfaces define cards, subtle shadows or inset contrast replace idle borders, and borders become scarce signals for selected, focused, alert, or blocked states.

## Verification

**Commands:**
- `npm test` -- passed: 33 files and 296 tests.
- `npm run test:e2e:event` -- passed: event-mode flows plus event/manual/roster layout viewport checks.
- `npm run build --workspace @auction-manager/web` -- passed: production web build.

**Notes:**
- The originally drafted `npm run test --workspace apps/web -- --run` command is not available because `@auction-manager/web` has no package-local `test` script; root `npm test` is the applicable Vitest command.
