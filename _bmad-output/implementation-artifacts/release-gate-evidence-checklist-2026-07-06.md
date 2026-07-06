---
title: Release Gate Evidence Checklist
project: auction_manager
date: 2026-07-06
status: template
source_proposal: _bmad-output/planning-artifacts/sprint-change-proposal-2026-07-06.md
source_proposal_followup: _bmad-output/planning-artifacts/sprint-change-proposal-2026-07-06-readiness-followup.md
---

# Release Gate Evidence Checklist

This checklist is completed after implementation stories are done and before live event use. It is not a feature implementation story.

## Required Evidence

- [ ] Build command was run and passed.
- [ ] Typecheck command was run and passed.
- [ ] Unit test command was run and passed.
- [ ] Integration test command was run and passed.
- [ ] Playwright event-flow tests were run and passed or have accepted triage.
- [ ] Privacy checks were run against board DTOs, Team rosters, rendered UI, logs, and snapshots.
- [ ] Event-mode smoke test was run from one local Fastify process on `127.0.0.1`.
- [ ] Viewport evidence was captured for 1440x900, 1366x768, 1920x1080, and 390x844.
- [ ] Local command-response behavior was observed under event-machine conditions, including pending affordances, duplicate-click rejection, and reconciliation from authoritative responses.
- [ ] P0 tests pass at 100%.
- [ ] P1 pass rate is at least 95%, with explicit triage for accepted remaining failures.
- [ ] Representative Player CSV, Player photos, Team CSV, Team logos, missing-media placeholders, and auction parameters were exercised.
- [ ] Restart/resume was verified across setup-started state, Phase 1, Phase 2, Manual Assignment, and Closed state.
- [ ] Final roster display after Close Auction was verified.
- [ ] Board, Team rosters, API DTOs, logs, snapshots, and rendered UI were checked for private-field exclusion.
- [ ] Every risk score >=6 has mitigation, owner, and verification evidence.
- [ ] Event-machine notes are recorded, including OS, Node version, data directory path, startup result, and any accepted constraints.

## Evidence Log

| Evidence Area | Command / Source | Result | Notes / Link |
| --- | --- | --- | --- |
| Build | TBD | TBD | TBD |
| Typecheck | TBD | TBD | TBD |
| Unit tests | TBD | TBD | TBD |
| Integration tests | TBD | TBD | TBD |
| Playwright event flow | TBD | TBD | TBD |
| Privacy checks | TBD | TBD | TBD |
| Event-mode smoke | TBD | TBD | TBD |
| Viewport evidence | TBD | TBD | TBD |
| Local command-response behavior | TBD | TBD | TBD |
| P0/P1 summary | TBD | TBD | TBD |
| Representative media coverage | TBD | TBD | TBD |
| Restart/resume coverage | TBD | TBD | TBD |
| Final roster coverage | TBD | TBD | TBD |
| Event-machine notes | TBD | TBD | TBD |

## Approval

| Role | Name | Decision | Date | Notes |
| --- | --- | --- | --- | --- |
| Product / event owner | TBD | TBD | TBD | TBD |
| Developer / implementation owner | TBD | TBD | TBD | TBD |
| QA / test reviewer | TBD | TBD | TBD | TBD |
