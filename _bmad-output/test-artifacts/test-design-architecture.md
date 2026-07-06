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
  - '_bmad-output/planning-artifacts/research/technical-finalize-tech-stack-for-auction_manager-research-2026-07-05.md'
---

# Test Design for Architecture: Auction Manager

**Purpose:** Architectural concerns, testability gaps, and NFR requirements for Architecture/Dev review before test development begins.

**Date:** 2026-07-05  
**Author:** Udeet / TEA  
**Status:** Architecture Review Pending  
**Project:** auction_manager  
**PRD Reference:** `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md`  
**Architecture Reference:** `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md`

## Executive Summary

**Scope:** System-level test design for Auction Manager v1, a local single-PC live auction app covering setup imports, auction rules, live board, sold/unsold outcomes, multi-step undo, local persistence, recovery, privacy, dangerous operations, and event readiness.

**Business context:** The app replaces an Excel-driven live church cricket auction. The event-critical goal is that the operator can finish the auction without returning to Excel, while budgets, squad counts, role counts, privacy, and recoverability remain correct.

**Architecture:** Local modular monolith with React/Vite frontend, Fastify localhost API, TypeScript domain package, SQLite persistence through `better-sqlite3`, staged import adapters, shared schemas/DTOs, Vitest, and Playwright.

**Risk summary:** 12 risks identified; 10 high-priority risks score 6 or higher. Highest-risk areas are state integrity, auction-rule centralization, undo, randomness, privacy, import validation, file security, dangerous operations, and late test scaffolding.

## Quick Guide

### Blockers - Team Must Decide

1. **State-control test harness:** Provide temporary SQLite DB creation, managed asset directories, sample CSV/media fixtures, seeded RNG, and ready-made auction states. Owner: Dev/QA. Timeline: before API/UI slices.
2. **NFR thresholds:** Define command latency, import duration, startup/resume time, target player/team/media volume, and target projector/desktop viewport. Owner: PM/QA/Tech Lead. Timeline: before hardening.
3. **`clientCommandId` semantics:** Define duplicate-command and idempotency behavior for mutating routes. Owner: API/Architecture. Timeline: before route tests are finalized.
4. **Recovery behavior after failed persistence:** Define exact operator recovery path after DB write/snapshot failure. Owner: Architecture/UX/API. Timeline: before live rehearsal.

### High Priority - Team Should Validate

1. **R-003 Undo integrity:** Validate action-log payload strategy before implementation.
2. **R-006 Privacy projection:** Approve strict board/API DTO allowlists and log/snapshot redaction policy.
3. **R-008 Local file boundary:** Approve upload limits, content checks, generated asset IDs, and static serving boundary.
4. **R-009 Dangerous operations:** Approve separated menu and confirmation behavior, including keyboard handling.
5. **R-011 Media compatibility:** Schedule representative HEIC/JPEG/PNG/WebP dry run on the event PC.

### Info Only - Solutions Provided

1. **Test level split:** Domain rules in unit tests; persistence and routes in integration tests; only core event confidence flows in Playwright.
2. **Tooling:** Vitest for domain/import/persistence/API-adjacent tests, Fastify `inject()` for routes, Playwright for E2E and screenshots, k6 only after performance thresholds exist.
3. **Coverage:** 42 planned scenarios across P0-P2 priorities.
4. **Quality gates:** P0 100%, P1 at least 95%, no unmitigated high-risk items, coverage target at least 80% once code exists.

## Risk Assessment

**Total risks:** 12. High-priority score >=6: 10. Medium score 3-5: 2. Low score 1-2: 0.

### High-Priority Risks

| Risk ID | Category | Description | P | I | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | DATA/OPS | Live auction state lost or corrupted after sale, assignment, restart, or failed write. | 2 | 3 | 6 | Transaction tests, restart/resume tests, snapshot-after-commit tests, failed-write lockout. | Persistence/API | Before live UI E2E |
| R-002 | TECH/BUS | Auction rules diverge between domain, API, and UI. | 2 | 3 | 6 | Keep all decisions in `packages/domain`; route/UI assert domain response. | Domain | Before API/UI slices |
| R-003 | DATA/BUS | Multi-step undo restores only part of affected state. | 2 | 3 | 6 | Action-log before/after payload tests across all reversible commands. | Domain/Persistence | Before event smoke |
| R-004 | BUS | Invalid sale or assignment edge cases slip through. | 2 | 3 | 6 | Boundary matrix for budget, squad, role, selected team, valid team, and phase constraints. | Domain | Before Mark Sold/Assign UI |
| R-005 | BUS/DATA | Random order or assignment is not reproducible, persisted, or fair. | 2 | 3 | 6 | Injectable RNG, persisted generated output, deterministic seed tests. | Domain | Before unsold phase |
| R-006 | SEC/DATA | Private registration fields leak into board DTOs, UI, logs, or snapshots. | 2 | 3 | 6 | Allowlisted DTO schemas, redaction tests, Playwright privacy assertions. | Shared/API/UI | Before rehearsal |
| R-007 | DATA/BUS | Import validation lets bad source data reach live event. | 2 | 3 | 6 | CSV/media fixture suite with required headers, role normalization, placeholders, ignored fields. | Imports | Before Start Auction |
| R-008 | SEC | Upload or asset-serving path exposes arbitrary local files or unsafe content. | 2 | 3 | 6 | Generated asset IDs, traversal fixtures, extension/content checks, size/count limits. | Server/Imports | Before import UI |
| R-009 | BUS/OPS | Reset or close can be triggered too easily under live pressure. | 2 | 3 | 6 | E2E tests for separated dangerous menu, confirmation modal, Cancel/Escape, undo exclusion. | UI/Domain | Before rehearsal |
| R-012 | TECH/OPS | Test scaffolding arrives too late to shape implementation. | 3 | 2 | 6 | Scaffold domain, persistence, API, and Playwright smoke tests with first code slice. | Tech Lead/QA | Sprint 1 |

### Medium-Priority Risks

| Risk ID | Category | Description | P | I | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-010 | PERF/OPS | Event readiness cannot be objectively assessed because thresholds are undefined. | 2 | 2 | 4 | Define command, startup, resume, import, and display thresholds. | Product/QA |
| R-011 | OPS | Real HEIC/photo processing fails on target event PC. | 2 | 2 | 4 | Rehearse with representative source photos and event-machine runtime. | Imports/Ops |

## NFR Testability Requirements

| NFR Category | Threshold / Requirement | Current Design Support | Gap / Decision Needed | Planned Evidence |
| --- | --- | --- | --- | --- |
| Security / Privacy | Live board and board DTOs expose only auction-relevant fields. | Strong: AD-8 is explicit. | Log/snapshot redaction policy still needed. | DTO schema, route, E2E privacy tests. |
| Local File Security | Event mode serves only controlled assets and rejects unsafe uploads. | Strong: AD-9 is explicit. | Upload size/count/content limits need final values. | Fastify inject upload/static tests. |
| Reliability | State updates after every completed mutation; failed persistence blocks mutation. | Strong direction: AD-5/AD-10. | Resume RTO/RPO and failure recovery UX need values. | Temp SQLite, failure injection, restart tests. |
| Performance | Live actions feel fast on one local PC. | Partial: local monolith supports low latency. | No command/import/startup thresholds yet. | k6, Playwright timing, import benchmark. |
| Accessibility / Usability | WCAG 2.2 AA target, keyboard live operation, large-display readability. | Good UX detail. | Target viewport/projector constraints needed. | Playwright keyboard and screenshot evidence. |
| Maintainability | Tests protect architecture invariants; coverage target at least 80%. | Strong: AD-11/AD-12. | CI platform and exact coverage boundaries pending. | Vitest coverage, typecheck, audit, traces. |

**Unknown thresholds:** command latency, import size/duration, startup time, resume time, data-loss objective, supported projector viewport, maximum team/player/media count, file upload limits.

## Testability Concerns and Architectural Gaps

### Actionable Concerns

| Concern | Impact | What Architecture Must Provide | Owner | Timeline |
| --- | --- | --- | --- | --- |
| State seeding and reset are not specified | Slow/flaky UI-only tests | Temporary DB/data-dir harness, seed helpers, cleanup contract | Dev/QA | Before API tests |
| RNG test seam is not explicit | Random tests become non-reproducible | Injectable RNG and persisted generated order/result | Domain | Before randomization work |
| Undo payload strategy needs proof | Partial restore can corrupt live event | Action-log inverse or before/after payload contract | Domain/Persistence | Before undo implementation |
| NFR thresholds missing | Release readiness remains subjective | Measurable local-event thresholds | PM/QA/Tech Lead | Before hardening |
| Local file limits undecided | Security and performance tests cannot assert limits | File type, size, count, content, and path rules | Server/Imports | Before import UI |

### Architectural Improvements Needed

1. Add a test-only state harness that creates and disposes isolated SQLite DBs, asset roots, and snapshots.
2. Publish domain command fixtures for common states: setup ready, initial auction, current player revealed, team at budget boundary, team role full, unsold pool.
3. Define response schemas for all command routes before UI consumes them.
4. Define event-mode health and failed-write recovery contract before building recovery UI.

## Testability Assessment Summary

### What Works Well

- Domain owns auction truth, making rule correctness unit-testable.
- Server-authoritative command responses prevent UI-local state drift.
- SQLite transaction plus action log gives a clear durability and undo boundary.
- Staged import adapters isolate uncontrolled CSV/media inputs from live auction state.
- Privacy projection is explicit and schema-testable.
- AD-11 already names the expected test levels and critical flows.

### Accepted Trade-offs

- No auth/RBAC testing in v1 because the app is local-only and has no accounts.
- No contract testing in v1 because this is a modular monolith, not a microservice system.
- No cloud resilience testing in v1 because public deployment and multi-device usage are out of scope.

## Risk Mitigation Plans

For every high-priority risk, mitigation means both production design and automated evidence:

1. **State integrity (R-001):** Implement transaction-wrapped mutations, action log append, snapshot-after-commit behavior, and failed-write lockout. Verify with temporary SQLite and restart tests.
2. **Rule centralization (R-002/R-004):** Keep budget, squad, role, phase, sale, and assignment decisions inside `packages/domain`. Verify with table-driven domain tests.
3. **Undo (R-003):** Define action-log payload structure first. Verify multi-command sequences before UI wiring.
4. **Randomness (R-005):** Inject RNG, persist results, and test seeded outputs plus valid-team selection.
5. **Privacy/file security (R-006/R-008):** Use DTO allowlists and managed asset IDs. Verify with schema, route, and E2E privacy/security tests.
6. **Import readiness (R-007):** Build source fixture matrix before Start Auction UI is considered complete.
7. **Dangerous operations (R-009):** Treat reset/close as command and UI separation requirements; prove no undo inclusion.
8. **Test scaffolding (R-012):** Scaffold test harness in the first implementation slice, not after UI completion.

## Assumptions and Dependencies

### Assumptions

1. No epics/stories exist yet; this system design maps to PRD FR-1 through FR-22 and AD-1 through AD-12.
2. v1 remains local-only, single-PC, no public deployment, no auth, and no remote bidding.
3. The first implementation will follow the architecture structure: `apps/web`, `apps/server`, `packages/domain`, `packages/persistence`, `packages/imports`, `packages/shared`.
4. HEIC support is not accepted until representative event photos pass on the target machine.

### Dependencies

1. Final NFR thresholds before hardening and release-gate assessment.
2. Test fixture assets and representative event CSV/media samples.
3. CI decision before maintainability and trace evidence are enforced.
4. Event-PC dry run before treating media/recovery/performance evidence as complete.

### Risks to Plan

- **Risk:** Implementation begins with UI before domain/persistence test harness.
  - **Impact:** Core event correctness becomes expensive to retrofit.
  - **Contingency:** Gate live UI work on passing domain, persistence, and route tests for the current slice.

## Next Steps

1. Architecture/Dev: resolve blockers in the Quick Guide.
2. QA/Dev: use the companion QA document for test scenario implementation.
3. PM/Tech Lead: assign target thresholds and event-size assumptions before hardening.
