---
title: 'TEA Test Design to BMAD Handoff Document'
version: '1.0'
workflowType: 'testarch-test-design-handoff'
inputDocuments:
  - '_bmad-output/test-artifacts/test-design-architecture.md'
  - '_bmad-output/test-artifacts/test-design-qa.md'
sourceWorkflow: 'testarch-test-design'
generatedBy: 'TEA Master Test Architect'
generatedAt: '2026-07-05'
projectName: 'auction_manager'
---

# TEA to BMAD Integration Handoff

## Purpose

This document bridges TEA's system-level test design outputs with BMAD's epic/story decomposition workflow. It preserves the high-risk quality requirements that should become epic-level quality gates and story-level acceptance criteria.

## TEA Artifacts Inventory

| Artifact | Path | BMAD Integration Point |
| --- | --- | --- |
| Architecture Test Design | `_bmad-output/test-artifacts/test-design-architecture.md` | Epic quality requirements, architectural blockers |
| QA Test Design | `_bmad-output/test-artifacts/test-design-qa.md` | Story acceptance criteria, automation plan |
| Progress Log | `_bmad-output/test-artifacts/test-design-progress.md` | Workflow audit trail |

## Epic-Level Integration Guidance

### Risk References

The epics should carry these quality gates explicitly:

- **State integrity:** R-001, R-003, R-005 require transaction, action-log, restart/resume, and seeded-randomness coverage.
- **Domain correctness:** R-002 and R-004 require rule behavior to live in `packages/domain`, not UI or route handlers.
- **Privacy/security:** R-006 and R-008 require allowlisted DTOs, private-field exclusions, and local file boundary tests.
- **Import readiness:** R-007 requires CSV/media issue handling before Start Auction can be considered done.
- **Live-pressure safety:** R-009 requires undo-safe dangerous operations and separated confirmation flows.

### Quality Gates

- P0 tests pass at 100%.
- P1 pass rate is at least 95%, with accepted triage for any remaining failure.
- Every risk score >=6 has mitigation, owner, and verification evidence.
- No private source fields appear in board DTOs, live UI, logs, or snapshots.
- Event-PC rehearsal covers representative media and restart/resume before live use.
- Full NFR gate decision is deferred to `bmad-testarch-nfr` after implementation evidence exists.

## Story-Level Integration Guidance

### P0/P1 Test Scenarios to Story Acceptance Criteria

Stories should include acceptance criteria for these critical scenarios:

- Setup blocks Start Auction when required Player or Team CSV data is missing.
- Setup classifies missing photos/logos as placeholder-compatible, not live blockers.
- Randomized player order contains each player once and survives restart.
- Reveal Next starts current bid at base price; Increase Bid only adds +2.
- Mark Sold requires selected team and valid budget/squad/role capacity.
- Invalid sale explains the exact blocked reason and does not mutate state.
- Mark Sold updates player status, sold price, winning team, budget, squad, role count, action log, and snapshot.
- Mark Unsold moves player to unsold pool without budget/count mutation.
- Unsold assignment chooses only valid teams and has no v1 budget impact.
- Multi-step Undo restores full player/team/bid/phase state after sold, unsold, reveal, bid, team select, and assignment.
- Reset and Close are separated dangerous operations, confirmed explicitly, and excluded from Undo.
- Reopen/resume restores latest saved state and undo history.
- Board/API DTOs exclude email, mobile, payment status, payment transaction ID, source timestamp, and ignored source fields.
- Upload/static asset routes reject traversal paths and never serve arbitrary source file paths.
- Live board remains keyboard-operable and displays blocked reasons as text.

### Data-TestId Requirements

Recommended stable test IDs for E2E/component testability:

| Surface | Suggested Test IDs |
| --- | --- |
| Setup | `setup-player-csv`, `setup-player-photos`, `setup-team-csv`, `setup-team-logos`, `setup-start-auction`, `import-issues-table` |
| Live board | `phase-indicator`, `current-player-panel`, `current-bid`, `selected-team`, `team-grid`, `sale-summary` |
| Team tile | `team-tile-{teamId}`, `team-budget-{teamId}`, `team-squad-{teamId}`, `team-role-capacity-{teamId}` |
| Commands | `reveal-next`, `increase-bid`, `mark-sold`, `mark-unsold`, `undo-last-action` |
| Unsold | `unsold-player-panel`, `assign-random-unsold`, `unsold-progress`, `no-valid-team-reason` |
| Dangerous operations | `dangerous-menu`, `reset-auction`, `close-auction`, `confirm-dangerous-action`, `cancel-dangerous-action` |

## Risk-to-Story Mapping

| Risk ID | Category | P x I | Recommended Story/Epic | Test Level |
| --- | --- | --- | --- | --- |
| R-001 | DATA/OPS | 2 x 3 = 6 | Persistence and recovery epic | Integration/E2E |
| R-002 | TECH/BUS | 2 x 3 = 6 | Domain auction rules epic | Unit/API |
| R-003 | DATA/BUS | 2 x 3 = 6 | Undo/action-log story | Unit/Integration/E2E |
| R-004 | BUS | 2 x 3 = 6 | Sale validation and assignment rules stories | Unit/API/E2E |
| R-005 | BUS/DATA | 2 x 3 = 6 | Random order and unsold assignment stories | Unit/Integration/E2E |
| R-006 | SEC/DATA | 2 x 3 = 6 | Privacy projection story | Unit/API/E2E |
| R-007 | DATA/BUS | 2 x 3 = 6 | Setup import epic | Unit/Integration/E2E |
| R-008 | SEC | 2 x 3 = 6 | Upload and asset security story | API/Integration |
| R-009 | BUS/OPS | 2 x 3 = 6 | Dangerous operations and live control safety stories | Component/E2E |
| R-010 | PERF/OPS | 2 x 2 = 4 | Event readiness / NFR threshold story | k6/Playwright/Rehearsal |
| R-011 | OPS | 2 x 2 = 4 | Media import rehearsal story | Integration/Rehearsal |
| R-012 | TECH/OPS | 3 x 2 = 6 | Test infrastructure story | CI/Unit/Integration |

## Recommended BMAD to TEA Workflow Sequence

1. TEA Test Design (`TD`) produces this handoff.
2. BMAD Create Epics & Stories consumes this handoff and embeds quality requirements.
3. TEA ATDD (`AT`) generates acceptance tests per story.
4. BMAD implementation proceeds with test-first guidance.
5. TEA Automate (`TA`) expands the test suite.
6. TEA Trace (`TR`) validates coverage completeness.
7. TEA NFR (`NR`) assesses final NFR evidence after implementation.

## Phase Transition Quality Gates

| From Phase | To Phase | Gate Criteria |
| --- | --- | --- |
| Test Design | Epic/Story Creation | P0/P1 risks and blocker decisions represented in epics/stories |
| Epic/Story Creation | ATDD | Stories include acceptance criteria from this handoff |
| ATDD | Implementation | Failing acceptance tests or executable test specs exist for P0/P1 scenarios |
| Implementation | Test Automation | Domain, persistence, route, and E2E smoke tests pass for each slice |
| Test Automation | Release | Trace matrix covers P0/P1 requirements and NFR evidence is ready for assessment |

