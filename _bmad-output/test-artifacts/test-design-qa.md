---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-07-05'
workflowType: 'testarch-test-design'
inputDocuments:
  - '_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md'
---

# Test Design for QA: Auction Manager

**Purpose:** QA execution recipe for what to test, how to test it, and what QA needs from Dev/Architecture.

**Date:** 2026-07-05  
**Author:** Udeet / TEA  
**Status:** Draft  
**Project:** auction_manager

**Related:** See `test-design-architecture.md` for architectural blockers and mitigation detail.

## Executive Summary

**Scope:** System-level QA plan for Auction Manager v1: local setup imports, live auction flow, sale validation, unsold assignment, multi-step undo, SQLite recovery, privacy, local file safety, dangerous operations, accessibility, and event-readiness evidence.

**Risk summary:** 12 risks total; 10 score 6 or higher. Critical categories for QA are DATA, BUS, SEC, OPS, and TECH.

**Coverage summary:** 42 planned scenarios: 16 P0, 25 P1, 1 P2, 0 P3. Effort estimate is about 80-140 hours for initial automation, including harness setup and CI integration.

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| Public deployment, LAN display, cloud DB | Explicitly out of v1 scope. | Reassess if scope changes. |
| Auth/RBAC/OAuth/JWT | v1 has one local operator and no accounts. | Local host/origin/file-boundary tests still required. |
| Contract testing | Modular monolith, no service contracts. | API schema tests cover route contracts. |
| Remote captain bidding | Captains bid verbally. | E2E covers operator-recorded bid flow. |
| Final NFR PASS/CONCERNS/FAIL | No implementation evidence yet. | Run `bmad-testarch-nfr` after evidence exists. |

## Dependencies & Test Blockers

### Backend/Architecture Dependencies

1. **State-control harness** - Dev/QA - pre-API testing
   - Need temporary SQLite DB, isolated data directory, asset root, snapshot root, seed helpers, and cleanup.
   - Blocks deterministic domain/persistence/API tests.

2. **Injectable RNG** - Domain - before randomization tests
   - Need seeded RNG seam for player order and unsold assignment.
   - Blocks reproducible tests for FR-7 and FR-17.

3. **Command schemas and `clientCommandId` policy** - API/Architecture - before route tests
   - Need request/response schemas and duplicate-command behavior.
   - Blocks complete Fastify inject coverage.

4. **NFR thresholds** - PM/QA/Tech Lead - before hardening
   - Need targets for command latency, import size/duration, startup/resume, projector viewport, and file upload limits.
   - Blocks objective performance and readiness validation.

### QA Infrastructure Setup

1. **Factories and fixtures**
   - Player factory with role, base price, photo metadata, private source fields.
   - Team factory with budget, captain, logo, squad, role counts.
   - Auction state factory for setup-ready, current-player, boundary team, unsold pool, and closed states.
   - CSV/media fixture folders for valid, missing, ambiguous, private-field, traversal, and unsupported-file cases.

2. **Test environments**
   - Local: one Fastify event-mode process, temp data dir per test worker where possible.
   - CI: npm workspace scripts for typecheck, unit, integration, API, and Playwright.
   - Rehearsal: event PC with representative CSV/photos/logos, including HEIC samples.

Example API test pattern:

```typescript
import { test } from '@seontechnologies/playwright-utils/api-request/fixtures';
import { expect } from '@playwright/test';

test('@P0 @API board DTO excludes private source fields', async ({ apiRequest }) => {
  const { status, body } = await apiRequest({
    method: 'GET',
    path: '/api/state',
  });

  expect(status).toBe(200);
  expect(JSON.stringify(body)).not.toContain('Mobile Number');
  expect(JSON.stringify(body)).not.toContain('Payment Transaction Id');
});
```

## Risk Assessment

### High-Priority Risks

| Risk ID | Category | Description | Score | QA Test Coverage |
| --- | --- | --- | --- | --- |
| R-001 | DATA/OPS | State loss/corruption after mutation, restart, or failed write. | 6 | TD-015 through TD-019 |
| R-002 | TECH/BUS | Rule drift across domain/API/UI. | 6 | TD-001 through TD-005, TD-020 |
| R-003 | DATA/BUS | Undo restores incomplete state. | 6 | TD-013, TD-038 |
| R-004 | BUS | Invalid sale/assignment edge cases slip through. | 6 | TD-002 through TD-005, TD-012, TD-037 |
| R-005 | BUS/DATA | Randomness is unreproducible, unpersisted, or unfair. | 6 | TD-010, TD-011, TD-015, TD-039 |
| R-006 | SEC/DATA | Private fields leak into DTOs/UI/logs/snapshots. | 6 | TD-029, TD-040 |
| R-007 | DATA/BUS | Import validation allows bad data into live event. | 6 | TD-022 through TD-026, TD-035 |
| R-008 | SEC | Upload/asset serving exposes unsafe files or paths. | 6 | TD-027, TD-028 |
| R-009 | BUS/OPS | Reset or Close can be triggered too easily. | 6 | TD-014, TD-031 |
| R-012 | TECH/OPS | Test scaffolding arrives too late. | 6 | CI setup and implementation handoff |

### Medium/Low-Priority Risks

| Risk ID | Category | Description | Score | QA Test Coverage |
| --- | --- | --- | --- | --- |
| R-010 | PERF/OPS | Event readiness lacks measurable thresholds. | 4 | NFR performance plan, k6 once thresholds exist |
| R-011 | OPS | HEIC/photo processing fails on event PC. | 4 | TD-024 rehearsal |

## NFR Test Coverage Plan

| NFR Category | Requirement / Threshold | Planned Validation | Tool / Level | Evidence Artifact | Priority |
| --- | --- | --- | --- | --- | --- |
| Security / Privacy | Private source fields never reach board DTO or live UI. | Schema, API, and E2E privacy checks. | Vitest/Zod, Fastify inject, Playwright | Test report, trace/screenshot | P0 |
| Security / Local Files | Uploads/assets stay inside managed storage and reject unsafe content. | Traversal, unsupported media, oversize, direct path tests. | Fastify inject, import integration | API test report | P0 |
| Reliability | Every mutation is atomic and recoverable. | Transaction, action-log, snapshot, restart/resume tests. | Vitest integration, Playwright | DB test report, E2E trace | P0 |
| Reliability | Failed write blocks further mutation. | Failure injection and UI recovery state. | API integration, Playwright | Failure test report | P1 |
| Performance | Command/import/startup/resume meet targets. | k6/API and Playwright timing after thresholds exist. | k6, Playwright | k6 summary, JSON report | P2 until thresholds exist |
| Accessibility | Keyboard operation and text blocked reasons. | Keyboard-only flows and assertions. | Playwright, component tests | Playwright report | P1 |
| Maintainability | Coverage and deterministic test quality enforced. | Coverage, audit, trace-retention, no hard waits. | Vitest/CI/Playwright | CI artifacts | P1 |
| Scalability | Target-size local event remains stable. | Import benchmark and realistic dry run. | Import test, rehearsal | Benchmark/rehearsal notes | P2 |

**Missing thresholds or evidence sources:** command latency, import size/duration, startup/resume target, upload limits, target player/team/media counts, projector viewport, CI platform, exact coverage boundaries for critical packages.

## Entry Criteria

- [ ] Requirements and current assumptions reviewed by QA, Dev, PM.
- [ ] State-control harness available.
- [ ] Seeded RNG seam implemented.
- [ ] Command request/response schemas drafted.
- [ ] Test fixture data available.
- [ ] Local event-mode app runnable in test.
- [ ] NFR thresholds either defined or explicitly tracked as risks.

## Exit Criteria

- [ ] All P0 tests passing.
- [ ] P1 pass rate at least 95%, with accepted triage for any remaining failure.
- [ ] No open high-priority bugs without owner and mitigation.
- [ ] Coverage target agreed and met, with at least 80% overall once code exists.
- [ ] NFR evidence collected for all in-scope categories, without final NFR gate decision.
- [ ] Event-PC rehearsal completed for representative import/media/recovery path.

## Test Coverage Plan

P0/P1/P2/P3 are priority and risk levels, not execution timing.

### P0 Critical

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| TD-002 | FR-13 budget boundary | Unit | R-004 | Sale blocked above budget, allowed at exact budget. |
| TD-005 | FR-14 Mark Sold state mutation | Unit | R-002/R-004 | Player/team/budget/role updates. |
| TD-013 | FR-19 multi-step undo | Unit/Integration | R-003 | Full reversible state sequence. |
| TD-014 | FR-21/FR-22 reset/close exclusion | Unit/API/E2E | R-009 | Not undoable, confirmed separately. |
| TD-015 | FR-7 persisted random order | Integration | R-005 | Every player once, survives restart. |
| TD-016 | FR-20 atomic mutation | Integration | R-001 | DB state and action log commit together. |
| TD-018 | FR-20 restart/resume | Integration/E2E | R-001 | Latest state resumes. |
| TD-022 | FR-1 import blocks missing required data | Unit/Integration | R-007 | Start Auction blocked. |
| TD-027 | AD-9 upload rejection | API | R-008 | Traversal/type/size/field cases. |
| TD-028 | AD-9 asset boundary | API | R-008 | Managed assets only. |
| TD-029 | AD-8 privacy DTO | Unit/API | R-006 | Allowlist excludes private fields. |
| TD-035 | FR-1 through FR-6 setup happy path | E2E | R-007 | Import and start auction. |
| TD-036 | SM-1/SM-2 live sale happy path | E2E | R-001/R-004 | Reveal, bid, select, sell. |
| TD-037 | SM-3 invalid sale UI block | E2E | R-004 | Reason shown, no mutation. |
| TD-038 | SM-6 undo after sale | E2E | R-003 | Board and state restored. |
| TD-040 | SM-C3 live privacy | E2E | R-006 | Private fields never render. |

**Total P0:** about 16 scenario groups.

### P1 High

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| TD-001 | FR-5 rule constants | Unit | R-002 | Budget, increment, squad, role caps. |
| TD-003 | FR-13 squad boundary | Unit | R-004 | 12 allowed, 13 blocked. |
| TD-004 | FR-13 role boundary | Unit | R-004 | Role slot allowed/blocked. |
| TD-006 | FR-8/FR-12 reveal and bid +2 | Unit | R-002 | Base price and increment. |
| TD-007 | FR-11 select/clear team | Unit | R-002 | Reversible team selection. |
| TD-008 | FR-15 mark unsold | Unit | R-004 | No team budget/count mutation. |
| TD-009 | FR-16 phase constraint | Unit/API | R-004 | Cannot start unsold early without explicit path. |
| TD-010 | FR-17 random assignment validity | Unit/Integration | R-005 | Valid team only, no budget impact. |
| TD-011 | FR-17 assignment fairness | Unit | R-005 | Deterministic distribution check. |
| TD-012 | FR-18 no valid team | Unit/API | R-004 | Specific unresolved reason. |
| TD-017 | FR-20 snapshot after commit | Integration | R-001 | No partial snapshot. |
| TD-019 | AD-5 failed write lockout | API/E2E | R-001 | Mutations blocked until recovery. |
| TD-020 | AD-4 schema/error contracts | API | R-002 | 400/409/413/415/500 behavior. |
| TD-021 | AD-4 `clientCommandId` behavior | API | R-002 | Pending policy decision. |
| TD-023 | FR-2 base price import | Unit | R-007 | Defaults to 13. |
| TD-024 | FR-3 media formats | Integration/Rehearsal | R-011 | Includes event-PC HEIC check. |
| TD-025 | FR-3/FR-4 issue severities | Integration/E2E | R-007 | Must-fix vs placeholder. |
| TD-026 | FR-4 team CSV/logo import | Integration | R-007 | Team/captain/logo handling. |
| TD-030 | FR-9 live board state | Component/E2E | R-009 | Current player/bid/team/capacity. |
| TD-031 | FR-10 safe next action | Component/E2E | R-009 | Dangerous operations separated. |
| TD-032 | Accessibility keyboard operation | E2E | UX | Setup/live/undo/unsold/confirmations. |
| TD-033 | Accessibility blocked reasons | Component/E2E | UX | Text, not color-only. |
| TD-039 | SM-4 unsold flow | E2E | R-005 | Valid random assignment. |
| TD-041 | AD-10 event startup checks | API/Integration | OPS | Data dir/DB health. |
| TD-042 | Maintainability CI | CI | R-012 | Coverage, audit, traces. |

**Total P1:** about 25 scenario groups.

### P2 Medium

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| TD-034 | FR-9 large display screenshot | E2E/Visual | R-010 | Needs viewport/projector threshold. |

**Total P2:** about 1 scenario group.

### P3 Low

No P3 automation is recommended before the first live-event readiness gate.

## Execution Strategy

Run everything in PRs unless it is expensive, long-running, or requires the event PC.

### Every PR: Vitest/Fastify/Playwright smoke, target 10-15 min

- Typecheck and lint when configured.
- P0/P1 domain, import, persistence, and API tests.
- Short Playwright smoke set: setup happy path, live sale, invalid sale, undo, privacy.
- Retain Playwright traces on failure.

### Nightly: full functional and security matrix

- All P0/P1/P2 tests.
- Full upload/file-security fixture matrix.
- Restart/resume and failed-write scenarios.
- Large-display screenshot set.

### Weekly / Pre-Rehearsal: expensive evidence

- k6/API performance checks after thresholds exist.
- Target-size import/media benchmark.
- Event-PC rehearsal with representative photos/logos/CSV.
- Full dry-run auction using realistic data.

## QA Effort Estimate

| Priority | Count | Effort Range | Notes |
| --- | --- | --- | --- |
| P0 | About 16 groups | About 30-50 hours | Harness-heavy, event-critical flows |
| P1 | About 25 groups | About 35-60 hours | Rules, imports, API contracts, accessibility |
| P2 | About 1 group | About 8-20 hours | Visual/readability plus threshold work |
| P3 | 0 | About 0-5 hours | Reserved for exploratory follow-up |
| Total | About 42 groups | About 80-140 hours | 1 QA/full-stack dev pairing or equivalent |

Assumptions: includes test design, implementation, debugging, fixture work, and CI wiring; excludes ongoing maintenance and production feature implementation.

## Implementation Planning Handoff

| Work Item | Owner | Target Milestone | Dependencies/Notes |
| --- | --- | --- | --- |
| Test harness: temp DB/data/assets/snapshots | Dev/QA | First code slice | Blocks P0 domain/persistence/API tests |
| Domain rules and undo test matrix | Domain/QA | Domain slice | Highest correctness risk |
| Import/security fixture matrix | Imports/API/QA | Setup slice | Needed before Start Auction UI |
| Playwright event smoke suite | UI/QA | Live board slice | Setup, live sale, invalid sale, undo, privacy |
| CI quality gate | Tech Lead/QA | Before review workflow | Needs final package scripts |

## Tooling & Access

| Tool or Service | Purpose | Access Required | Status |
| --- | --- | --- | --- |
| Vitest | Unit/integration/coverage | Dev dependency | Pending implementation |
| Fastify inject | Route tests without real socket | Built into Fastify test setup | Pending implementation |
| Playwright | E2E, screenshots, traces | Browser dependencies | Pending implementation |
| k6 | API performance thresholds | Local/CI install after targets exist | Deferred |
| Event PC media samples | HEIC/photo/logos rehearsal | Representative source files | Pending |

## Interworking & Regression

| Component | Impact | Regression Scope | Validation Steps |
| --- | --- | --- | --- |
| `packages/domain` | Owns auction truth | Rules, phase, randomness, undo | TD-001 through TD-014 |
| `packages/persistence` | Durable state and recovery | Transactions, action log, snapshots, restart | TD-015 through TD-019 |
| `apps/server` | Command API, upload, assets | Schemas, errors, host/file security | TD-020, TD-027, TD-028, TD-041 |
| `packages/imports` | CSV/media setup | Header validation, placeholders, media formats | TD-022 through TD-026 |
| `apps/web` | Operator/live board UX | Setup, live flow, undo, dangerous ops, accessibility | TD-030 through TD-040 |
| `packages/shared` | DTO/schema privacy | Board projection allowlist | TD-029, TD-040 |

## Appendix A: Code Examples & Tagging

```typescript
import { test } from '@seontechnologies/playwright-utils/api-request/fixtures';
import { expect } from '@playwright/test';

test('@P0 @API invalid sale is rejected at route boundary', async ({ apiRequest }) => {
  const { status, body } = await apiRequest({
    method: 'POST',
    path: '/api/auction/mark-sold',
    body: {
      clientCommandId: 'test-invalid-sale-001',
      teamId: 'team-at-budget-limit',
    },
  });

  expect(status).toBe(409);
  expect(body.reason).toContain('budget');
});
```

Suggested tags: `@P0`, `@P1`, `@API`, `@Domain`, `@Persistence`, `@E2E`, `@Privacy`, `@Security`, `@Import`, `@Recovery`.

## Appendix B: Knowledge Base References

- Risk Governance: `risk-governance.md`
- Probability and Impact Scale: `probability-impact.md`
- Test Priorities Matrix: `test-priorities-matrix.md`
- Test Levels Framework: `test-levels-framework.md`
- Test Quality Definition of Done: `test-quality.md`
- Playwright API testing: https://playwright.dev/docs/api-testing
- Playwright Trace Viewer: https://playwright.dev/docs/trace-viewer
- Fastify testing: https://fastify.dev/docs/latest/Guides/Testing/
- SQLite transactional behavior: https://www.sqlite.org/transactional.html
- k6 thresholds: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Vitest coverage: https://vitest.dev/guide/coverage.html

**Generated by:** BMad TEA Agent  
**Workflow:** `bmad-testarch-test-design`  
**Version:** BMad v6
