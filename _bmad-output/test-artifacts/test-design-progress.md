---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-07-05'
inputDocuments:
  - '_bmad/tea/config.yaml'
  - '_bmad/config.toml'
  - '_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md'
  - '_bmad-output/planning-artifacts/research/technical-finalize-tech-stack-for-auction_manager-research-2026-07-05.md'
  - '.agents/skills/bmad-tea/resources/tea-index.csv'
  - '.agents/skills/bmad-tea/resources/knowledge/adr-quality-readiness-checklist.md'
  - '.agents/skills/bmad-tea/resources/knowledge/nfr-criteria.md'
  - '.agents/skills/bmad-tea/resources/knowledge/test-levels-framework.md'
  - '.agents/skills/bmad-tea/resources/knowledge/risk-governance.md'
  - '.agents/skills/bmad-tea/resources/knowledge/test-quality.md'
  - '.agents/skills/bmad-tea/resources/knowledge/probability-impact.md'
  - '.agents/skills/bmad-tea/resources/knowledge/test-priorities-matrix.md'
  - '.agents/skills/bmad-tea/resources/knowledge/overview.md'
  - '.agents/skills/bmad-tea/resources/knowledge/api-request.md'
  - '.agents/skills/bmad-tea/resources/knowledge/auth-session.md'
  - '.agents/skills/bmad-tea/resources/knowledge/recurse.md'
  - '.agents/skills/bmad-tea/resources/knowledge/playwright-cli.md'
---

# Step 1 - Detect Mode & Prerequisites

## Mode Decision

System-Level Mode.

## Rationale

- User invoked the test-design workflow without specifying PRD/ADR or epic/story scope.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` is not present, so file-based detection does not indicate Epic-Level Mode.
- Planning artifacts are present for PRD, architecture, UX design, and technical research.

## Prerequisite Check

System-level prerequisites are available:

- PRD: `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md`
- Architecture / decision records: `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md`
- Technical context: `_bmad-output/planning-artifacts/research/technical-finalize-tech-stack-for-auction_manager-research-2026-07-05.md`

## Notes

- No `project-context.md` files were found under the project root.
- No epic-level sprint status exists yet.

# Step 2 - Load Context & Knowledge Base

## Configuration Loaded

- `tea_use_playwright_utils`: `true`
- `tea_use_pactjs_utils`: `false`
- `tea_pact_mcp`: `none`
- `tea_browser_automation`: `auto`
- `test_stack_type`: `auto`
- `test_artifacts`: `_bmad-output/test-artifacts`
- `test_design_output`: `_bmad-output/test-artifacts/test-design`

## Stack Detection

No implementation files were found yet (`package.json`, Playwright/Cypress configs, backend manifests, or test directories are absent). The planned architecture defines a full-stack local TypeScript app:

- React + Vite frontend
- Fastify same-origin localhost API
- TypeScript shared/domain packages
- SQLite persistence through `better-sqlite3`
- Vitest for domain, persistence, and API tests
- Playwright for setup/live-event/recovery E2E flows

Detected testing context for this workflow: planned full-stack TypeScript, pre-implementation.

## Project Artifacts Loaded

- PRD with FR-1 through FR-22, cross-cutting reliability/usability/privacy/data compatibility requirements, success metrics SM-1 through SM-7, and assumptions.
- Architecture Spine with AD-1 through AD-12, capability-to-architecture mapping, local monolith boundaries, command-oriented API, SQLite/action-log persistence, privacy projection, and test invariant requirements.
- UX Experience Spine with setup, live board, unsold assignment, undo, dangerous operation, keyboard, accessibility, and privacy behavior.
- UX Design Spine with large-display visual hierarchy, live-bid emphasis, control separation, and accessibility-supporting visual constraints.
- Technical stack research summary for planned stack dependencies and rationale.

Epics are not present yet. This is acceptable for system-level test design; scope is PRD FR-1 through FR-22 plus architecture decisions AD-1 through AD-12.

## Knowledge Fragments Loaded

System-level required fragments:

- ADR Quality Readiness Checklist
- NFR Criteria
- Test Levels Framework
- Risk Governance
- Test Quality Definition of Done
- Probability and Impact Scale

Playwright/agent support fragments loaded because Playwright utils and browser automation are enabled:

- Playwright Utils Overview
- API Request Utility
- Auth Session Utility
- Recurse Polling Utility
- Playwright CLI

Pact.js utilities and Pact MCP were not loaded because the project is a local modular monolith and Pact support is disabled in config.

## Missing Or Ambiguous Inputs To Carry Forward

- No implementation exists yet, so existing test coverage, selectors, endpoints, and fixture patterns cannot be inspected.
- No epics/story acceptance criteria exist yet; system plan will map to PRD FRs and architecture decisions instead.
- Quantified performance/usability thresholds are not defined beyond qualitative requirements like "fast enough" and "readable on a large display."
- Target auction scale is not specified: expected number of players, number of teams, photo folder size, and worst-case import size are open test design assumptions.
- Recovery thresholds are not quantified: acceptable restart/resume time, acceptable data-loss objective, and snapshot write timing are not explicit.
- Real HEIC sample compatibility on the target event PC remains an implementation/rehearsal validation item.

# Step 3 - Testability & Risk Assessment

## Testability Concerns

1. Test state control is not specified yet.
   - Evidence: Architecture defines staged imports, SQLite state, and action-log persistence, but no explicit test fixture, seed, reset, or temporary data-directory contract exists yet.
   - Risk: Tests will become slow, order-dependent, or UI-only if they cannot create precise auction states.
   - Action: Define a test harness that can create temporary SQLite databases, managed asset directories, sample CSV/photo/logo fixtures, seeded RNG, and ready-made auction states.

2. Randomness needs an injectable and auditable design.
   - Evidence: FR-7 requires persisted random player order; FR-17 requires uniform random assignment among valid teams.
   - Risk: Random behavior becomes hard to test, hard to reproduce after incidents, or biased by implementation mistakes.
   - Action: Inject RNG into domain services, persist the generated order/result immediately, and test deterministic seeded sequences plus statistical/fairness invariants at the domain level.

3. Undo breadth is high and must be proven at the action-log boundary.
   - Evidence: FR-19 requires multi-step undo across bids, selected team, reveal, sold, unsold, random assignment, budgets, role counts, phase state, and player status.
   - Risk: Partial undo corrupts the live auction state while appearing successful to the operator.
   - Action: Treat undo as a first-class persistence/domain contract with table-driven sequence tests and restart-after-undo integration tests.

4. NFR thresholds are mostly qualitative.
   - Evidence: PRD says controls must be fast, board readable, local state updated after every action, and setup should surface issues, but does not define command latency, resume time, import volume, display viewport, or recovery targets.
   - Risk: The team cannot objectively prove event readiness before rehearsal.
   - Action: Convert unknowns into explicit readiness thresholds before implementation hardening.

5. Privacy and local file security are critical but easy to regress.
   - Evidence: FR-9/5.3 and AD-8 require live-board privacy projection; AD-9 requires localhost binding, CORS disabled, strict upload handling, generated asset IDs, and controlled asset serving.
   - Risk: Source CSV private fields, path traversal, or uploaded file names leak into the board, API, assets, logs, or snapshots.
   - Action: Use allowlisted DTO schemas, route-level injection tests, malicious filename fixtures, and Playwright live-board privacy assertions.

6. HEIC and real event media compatibility are not testable from docs alone.
   - Evidence: PRD requires JPEG, PNG, HEIC, and WebP; architecture defers "HEIC certainty" to representative rehearsal.
   - Risk: Setup succeeds in development but fails or degrades on the event PC with real photos.
   - Action: Include real sample photo rehearsal as a pre-event readiness gate.

7. There is no current code or test infrastructure to inspect.
   - Evidence: No `package.json`, Playwright config, backend manifest, or test directory exists yet.
   - Risk: Test strategy can be correct on paper but delayed until after risky behavior is already implemented.
   - Action: Scaffold domain, persistence, route, and Playwright smoke tests alongside the first implementation slice.

## Testability Assessment Summary

The architecture is testable if implementation preserves its boundaries:

- Domain ownership of auction truth (AD-2) gives a clean unit-test surface for budgets, squad size, role targets, phases, randomness, and undo.
- Server-authoritative command responses (AD-3/AD-4) make API integration tests meaningful without depending on UI state.
- SQLite transactions plus action log (AD-5/AD-6) give a clear integration-test surface for durability, restart, and undo.
- Staged imports (AD-7) isolate uncontrolled CSV/media inputs from live auction logic.
- Privacy by projection (AD-8) creates a schema-testable allowlist for board/API DTOs.
- Local file security boundary (AD-9) is concrete enough to test with malicious upload and asset-serving fixtures.
- AD-11 already names the right testing levels: domain-command Vitest, temporary SQLite integration tests, Fastify `inject()` route tests, and Playwright event-flow tests.

## Architecturally Significant Requirements

| ASR | Status | Evidence | Test Design Implication |
| --- | --- | --- | --- |
| ASR-1 Domain package owns auction truth | ACTIONABLE | AD-2, FR-5, FR-7, FR-11 through FR-19 | Domain unit/property tests are the primary correctness gate. |
| ASR-2 Same-origin command API with `clientCommandId` | ACTIONABLE | AD-4 | Fastify route tests must cover command idempotency/duplication behavior once defined. |
| ASR-3 Server-authoritative state DTO after every mutation | ACTIONABLE | AD-3 | API and E2E tests assert response state, not UI-local guesses. |
| ASR-4 Atomic SQLite persistence and action log | ACTIONABLE | AD-5 | Persistence tests use temporary DBs and failure injection around commit/snapshot behavior. |
| ASR-5 Undo is action-log based and excludes reset/close | ACTIONABLE | AD-6, FR-19 through FR-22 | Sequence tests must validate undo scope and dangerous-operation exclusion. |
| ASR-6 Imports are staged adapters with structured issues | ACTIONABLE | AD-7, FR-1 through FR-6 | Import fixture matrix must cover required fields, placeholders, ignored fields, aliases, and failures. |
| ASR-7 Privacy by projection | ACTIONABLE | AD-8, SM-C3 | DTO schema and E2E privacy tests must prove private fields never reach live board surfaces. |
| ASR-8 Local file security boundary | ACTIONABLE | AD-9 | Route tests cover host/origin/content-type rejection, traversal, file type, size, and serving boundaries. |
| ASR-9 Event mode startup checks | ACTIONABLE | AD-10 | Startup tests cover data directory writability, DB open failure, and disabled live commands when unhealthy. |
| ASR-10 Correctness-first delivery order | ACTIONABLE | AD-12 | CI should gate UI-heavy slices behind passing domain/persistence/API tests. |
| ASR-11 No cloud, auth, LAN, or multi-device scope in v1 | FYI | Non-goals, AD-1, AD-10 | Avoid contract/multi-tenant/auth test expansion unless scope changes. |

## Risk Register

| ID | Risk | Category | P | I | Score | Gate Impact | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | Live auction state is lost or corrupted after a sale, assignment, restart, or failed write. | DATA/OPS | 2 | 3 | 6 | High | Transaction tests, restart/resume tests, snapshot-after-commit tests, failed-write command lockout. | Persistence/API | Before live UI E2E |
| R-002 | Auction rules diverge between domain, API, and UI. | TECH/BUS | 2 | 3 | 6 | High | Keep all rule decisions in `packages/domain`; route/UI tests assert domain responses only. | Domain | Before API/UI slices |
| R-003 | Multi-step undo restores only part of the affected state. | DATA/BUS | 2 | 3 | 6 | High | Action-log before/after payload tests across sold, unsold, reveal, bid, team select, random assignment, and phase changes. | Domain/Persistence | Before event-flow smoke |
| R-004 | Invalid sale or invalid unsold assignment edge cases slip through. | BUS | 2 | 3 | 6 | High | Boundary matrix for budget, squad count, role count, no selected team, no valid team, and phase constraints. | Domain | Before Mark Sold/Assign UI |
| R-005 | Random player order or random assignment is not reproducible, persisted, or fair. | BUS/DATA | 2 | 3 | 6 | High | Injectable RNG, persisted generated order/result, deterministic seed tests, uniform valid-team selection checks. | Domain | Before unsold phase |
| R-006 | Private registration fields leak into board DTOs, live UI, logs, or snapshots. | SEC/DATA | 2 | 3 | 6 | High | Allowlisted DTO schemas, redaction tests, Playwright privacy assertions, log/snapshot field checks. | Shared/API/UI | Before first public rehearsal |
| R-007 | Import validation lets bad source data reach the live event. | DATA/BUS | 2 | 3 | 6 | High | CSV/media fixture suite for required headers, role normalization, missing/ambiguous media, placeholders, ignored fields. | Imports | Before Start Auction |
| R-008 | Upload or asset-serving path exposes arbitrary local files or unsafe content. | SEC | 2 | 3 | 6 | High | Generated asset IDs, path traversal fixtures, extension/content checks, size/count limits, static serving boundary tests. | Server/Imports | Before import UI |
| R-009 | Reset or close can be triggered too easily under live pressure. | BUS/OPS | 2 | 3 | 6 | High | E2E tests for separated dangerous menu, confirmation modal, Escape/Cancel behavior, and undo exclusion. | UI/Domain | Before live rehearsal |
| R-010 | Event readiness cannot be objectively assessed because performance/recovery thresholds are undefined. | PERF/OPS | 2 | 2 | 4 | Monitor | Define command response, import, startup, resume, and large-display thresholds; add k6/Playwright rehearsal evidence. | Product/QA | Before hardening |
| R-011 | Real HEIC/photo processing fails on the target event PC. | OPS | 2 | 2 | 4 | Monitor | Rehearse with representative source photos and event-machine Sharp/HEIC support before the auction. | Imports/Ops | Before event dry run |
| R-012 | Test scaffolding arrives late and cannot shape implementation. | TECH/OPS | 3 | 2 | 6 | High | Scaffold Vitest, Fastify inject tests, temporary DB fixtures, and Playwright smoke flow with the first code slice. | Tech Lead/QA | Sprint 1 |

## NFR Planning Assessment

| NFR Category | In Scope? | Known Thresholds | Unknown Thresholds | Planned Evidence |
| --- | --- | --- | --- | --- |
| Security / Privacy | Yes | Local-only v1; no public service; no auth; board DTO excludes email, mobile, payment status, transaction ID, source timestamp, and non-auction fields. | Exact log/snapshot redaction policy; upload file size/count limits; allowed host/origin behavior details. | Fastify inject rejection tests, DTO schema allowlist tests, malicious upload fixtures, Playwright privacy test, dependency audit. |
| Reliability / Recovery | Yes | State updates after every completed state-changing action; random order persists; failed persistence blocks further mutation until recovery. | Resume time target; acceptable data loss objective; snapshot timing guarantee; recovery UX details after DB failure. | SQLite transaction tests, restart/resume integration tests, action-log replay/undo tests, failure-injection tests. |
| Performance / Responsiveness | Yes | Single local PC; event mode is one local process; live controls must be fast enough under public pressure. | Max command latency, import duration, startup time, resume time, largest player/team/media dataset, projector viewport. | k6 localhost API thresholds once targets exist, Playwright flow timing, import benchmark fixtures, rehearsal checklist. |
| Usability / Accessibility | Yes | WCAG 2.2 AA target; 44 CSS px targets; large-display readability; keyboard operation for setup, live bidding, undo, unsold assignment, and confirmations. | Exact supported viewport/projector size; maximum team count visible without scroll; acceptable font/contrast evidence thresholds. | Playwright accessibility and keyboard E2E, screenshot review at desktop/projector/narrow sizes, reduced-motion checks. |
| Maintainability | Yes | Domain-first modules, shared DTOs/schemas, AD-11 test invariants, correctness-first delivery order. | Coverage thresholds, duplication thresholds, CI platform, required reports. | Vitest coverage, typecheck, lint, route test suite, Playwright traces retained on failure, CI quality gate. |
| Scalability | Limited | v1 is local single-PC, not multi-user or cloud. | Maximum practical event size. | Import/load fixtures using target-scale CSV/media counts; local resource usage observation. |
| Compliance | Limited | No regulated public deployment; privacy/data minimization is product-specific. | Whether church/event organizers require retention/deletion policy after event. | Snapshot/export review, local data deletion/reset tests, privacy traceability. |

## Highest-Risk Priorities

1. Build the domain and persistence test harness before UI polish. Risks R-001 through R-005 are the event-critical correctness risks.
2. Lock privacy and file boundaries early. R-006 and R-008 are local-app risks, but they are still high impact because source CSVs include private data and uploaded filenames/filesystem paths can leak.
3. Make undo and dangerous-operation behavior explicit before rehearsal. These are live-pressure recovery controls, not nice-to-have UX details.
4. Define measurable readiness thresholds. Without thresholds, NFR validation will remain subjective and should be treated as CONCERNS at release-gate time.

## Official Documentation Cross-Check Notes

- Playwright official docs support the planned split between direct API setup/assertions and UI tests using `APIRequestContext`, plus trace retention for failure evidence.
- Fastify official docs support route-level testing with `fastify.inject()` without opening a real network socket.
- SQLite official docs support the architecture reliance on transactions as the durability boundary.
- k6 official docs support using thresholds as pass/fail criteria for load/performance validation once concrete SLOs exist.
- Vitest official docs support coverage reporting through configured coverage providers once maintainability thresholds are set.

# Step 4 - Coverage Plan & Execution Strategy

## Coverage Matrix

| ID | Requirement / Risk | Atomic Scenario | Level | Priority | Evidence |
| --- | --- | --- | --- | --- | --- |
| TD-001 | FR-5, R-002 | V1 auction rules load as immutable domain constants: budget 170, bid increment 2, squad max 13, role caps Ace 2/Batting 3/Bowling 2/AllRounder 2/Girls 2. | Unit | P1 | Vitest domain test |
| TD-002 | FR-13, R-004 | Sale is blocked at exact budget boundary when sold price exceeds remaining budget and allowed when equal. | Unit | P0 | Vitest domain table test |
| TD-003 | FR-13, R-004 | Sale is blocked at squad size 13 and allowed at 12. | Unit | P1 | Vitest domain table test |
| TD-004 | FR-13, R-004 | Sale is blocked when current player's role target is full and allowed when one slot remains. | Unit | P1 | Vitest domain table test |
| TD-005 | FR-14, R-004 | Mark Sold requires selected team and updates player status, sold price, winning team, budget, squad count, role count, and next stable state. | Unit | P0 | Vitest domain command test |
| TD-006 | FR-8, FR-12 | Reveal Next sets current bid to base price; Increase Bid only increments by +2. | Unit | P1 | Vitest domain command test |
| TD-007 | FR-11 | Select Team can change or clear selected team and records reversible action. | Unit | P1 | Vitest domain command test |
| TD-008 | FR-15 | Mark Unsold moves current player into unsold pool with no budget/squad/role mutation. | Unit | P1 | Vitest domain command test |
| TD-009 | FR-16 | Unsold Assignment cannot start while pending players remain unless explicit skip/confirmation path is supplied. | Unit/API | P1 | Domain plus route conflict test |
| TD-010 | FR-17, R-005 | Random Assignment only chooses valid teams, has no budget impact, updates squad/role count, and persists result. | Unit/Integration | P1 | Seeded RNG unit test plus persistence test |
| TD-011 | FR-17, R-005 | Random Assignment distribution is not biased among valid teams under deterministic repeated seeds. | Unit | P1 | Domain statistical/invariant test |
| TD-012 | FR-18 | No-valid-team case returns unresolved player and specific reason categories. | Unit/API | P1 | Domain and route `409` test |
| TD-013 | FR-19, R-003 | Multi-step undo restores reveal, team select, bid, sold, unsold, assignment, phase, budget, squad, and role state. | Unit/Integration | P0 | Domain sequence tests plus DB action-log tests |
| TD-014 | FR-21, FR-22, R-009 | Reset and Close never enter undo stack and require dangerous command path. | Unit/API/E2E | P0 | Domain, route, and modal E2E |
| TD-015 | FR-7, R-005 | Initial random order contains every player exactly once and survives restart/resume. | Integration | P0 | Temporary SQLite restart test |
| TD-016 | FR-20, R-001 | Every successful mutation commits current state and action log in one transaction. | Integration | P0 | Temporary SQLite transaction test |
| TD-017 | FR-20, R-001 | Snapshot is written or queued only after DB commit; failed commit does not expose partial snapshot. | Integration | P1 | Persistence failure-injection test |
| TD-018 | FR-20, R-001 | App restart resumes latest saved state, including current player, bid, team state, phase, and undo history. | Integration/E2E | P0 | DB restart test plus Playwright resume flow |
| TD-019 | AD-5, R-001 | Persistence failure blocks further mutating commands until explicit recovery path. | API/E2E | P1 | Fastify inject test plus E2E error state |
| TD-020 | AD-4 | Mutating commands validate request schema, response schema, phase conflicts, and error codes. | API | P1 | Fastify inject test |
| TD-021 | AD-4 | Duplicate or missing `clientCommandId` behavior is deterministic once idempotency policy is finalized. | API | P1 | Fastify inject test |
| TD-022 | FR-1 | Player CSV required headers are validated; missing required non-image data blocks Start Auction. | Unit/Integration | P0 | Import fixture tests |
| TD-023 | FR-2 | Every imported player receives base price 13 unless approved pricing input exists. | Unit | P1 | Import/domain test |
| TD-024 | FR-3, R-011 | JPEG, PNG, WebP, and representative HEIC files normalize or produce clear placeholder-compatible issues. | Integration/Rehearsal | P1 | Import fixture test plus event-PC dry run |
| TD-025 | FR-3, FR-4 | Missing photos/logos create `can_proceed_with_placeholder`; missing required CSV fields create `must_fix`. | Integration/E2E | P1 | Import tests plus setup E2E |
| TD-026 | FR-4 | Team CSV validates Team Name and Captain Name and associates logos without manual in-app editing. | Integration | P1 | Import fixture test |
| TD-027 | AD-9, R-008 | Upload routes reject traversal filenames, unsupported content types, oversize files, and unexpected multipart fields. | API | P0 | Fastify inject multipart tests |
| TD-028 | AD-9, R-008 | Asset server only serves managed generated asset IDs, never source filesystem paths. | API | P0 | Static route boundary tests |
| TD-029 | AD-8, R-006 | Board/API DTO schemas exclude email, mobile, payment, transaction ID, timestamp, and ignored source fields. | Unit/API | P0 | Zod/schema tests plus route tests |
| TD-030 | FR-9, SM-5 | Live board shows current player, bid, selected team, budget, squad, and role capacity in stable hierarchy. | Component/E2E | P1 | Component assertions plus Playwright smoke |
| TD-031 | FR-10, R-009 | Safe next action is visible and dangerous operations are separated from routine controls. | Component/E2E | P1 | Playwright live-flow test |
| TD-032 | Accessibility | Keyboard operation covers setup, reveal, select team, bid +2, mark sold/unsold, undo, unsold assignment, reset/close confirmations. | E2E | P1 | Playwright keyboard test |
| TD-033 | Accessibility | Blocking reasons are visible as text and not color-only. | Component/E2E | P1 | Component and Playwright assertions |
| TD-034 | FR-9, UX | Large-display screenshot at target desktop/projector viewport has no overlapping or tiny critical state. | E2E/Visual | P2 | Playwright screenshots for review |
| TD-035 | FR-6, SM-7 | Setup happy path imports player CSV, photo folder, team CSV, logos, reviews issues, and starts auction. | E2E | P0 | Playwright setup flow |
| TD-036 | SM-1, SM-2 | Full happy path: reveal player, select team, increase bid, mark sold, verify team budget/squad/role state. | E2E | P0 | Playwright event smoke |
| TD-037 | SM-3 | Invalid sale is blocked in UI with exact reason and no state mutation. | E2E | P0 | Playwright invalid sale flow |
| TD-038 | SM-6 | Operator corrects wrong sold action with undo and sees restored board state. | E2E | P0 | Playwright undo flow |
| TD-039 | SM-4 | Initial auction ends, unsold assignment starts, random assignment updates valid team without budget impact. | E2E | P1 | Playwright unsold flow |
| TD-040 | SM-C3, R-006 | Live board privacy flow proves imported private fields never render. | E2E | P0 | Playwright privacy assertion |
| TD-041 | OPS | Event-mode startup fails safe when data directory is not writable or DB cannot open. | API/Integration | P1 | Startup health tests |
| TD-042 | Maintainability | CI runs typecheck, unit/integration tests, coverage, dependency audit, and Playwright traces on failure. | CI | P1 | CI reports/artifacts |

## NFR Coverage And Evidence Plan

| NFR | Validation Scenario | Tool / Level | Evidence Artifact | Status |
| --- | --- | --- | --- | --- |
| Security / Privacy | Board DTO and live UI never expose private CSV fields. | Zod/Vitest, Fastify inject, Playwright | Schema test report, route test report, Playwright trace/screenshot | Required P0 |
| Security / Local Files | Uploads and asset serving reject traversal, unsupported media, oversize files, and direct source paths. | Fastify inject, import integration | API test report with malicious fixtures | Required P0 |
| Reliability | Every mutation is atomic and recoverable after restart. | Vitest integration with temp SQLite | Transaction/restart test report | Required P0 |
| Reliability | Failed write blocks additional mutation until recovery. | Persistence/API integration, Playwright | Failure-injection test report | Required P0 |
| Performance | Command latency, startup, resume, and import duration meet defined thresholds. | k6 for API command/load checks; Playwright for flow timings | k6 summary, Playwright JSON report | Thresholds missing; risk R-010 |
| Usability / Accessibility | Keyboard-only operation and visible textual blocked reasons. | Playwright E2E, component tests | Playwright report, screenshots | Required P1 |
| Large Display | Critical state remains readable and non-overlapping at selected projector/desktop viewports. | Playwright screenshot review | Screenshot set under test artifacts | Thresholds missing; P2 until viewport target is set |
| Maintainability | Coverage, dependency audit, traces, and deterministic test quality gates run in CI. | Vitest coverage, npm audit, Playwright config/CI | CI report, coverage summary, trace artifacts | Required P1 |
| Scalability | Target-size CSV/media import and event command flow remains stable on local machine. | Import benchmark, k6 smoke, rehearsal | Benchmark summary, rehearsal notes | Needs target data volume |

## Execution Strategy

PR suite:

- Run typecheck, lint if configured, all P0/P1 unit tests, persistence/API integration tests, and the shortest Playwright smoke set.
- Target duration: under 15 minutes. If full functional coverage exceeds 15 minutes, keep P0 plus representative P1 in PR and move the rest to nightly.

Nightly suite:

- Run all unit/integration/API/component tests, all Playwright E2E flows, privacy/security upload fixture matrix, restart/resume, and large-display screenshots.
- Retain Playwright traces on failure.

Weekly / pre-rehearsal suite:

- Run k6/API performance checks after thresholds exist.
- Run target-size import/media fixtures.
- Run event-PC media rehearsal with representative HEIC/JPEG/PNG/WebP inputs.
- Run full dry-run script using realistic players/teams/logos.

## Resource Estimates

Automation build estimate for the initial system-level suite:

- P0: about 35-60 hours
- P1: about 30-50 hours
- P2: about 12-24 hours
- P3: about 4-8 hours
- Total: about 80-140 hours

Timeline estimate:

- Minimum viable gate for first implementation slices: 1-2 focused weeks if domain/persistence/API test harness is built first.
- Full event-readiness automation and rehearsal evidence: 2-4 weeks depending on UI completion, media samples, and threshold decisions.

## Quality Gates

- P0 pass rate: 100%.
- P1 pass rate: at least 95%, with no open high-risk P1 failure lacking an owner and mitigation.
- All risks scored 6 or higher must have implemented mitigation, documented waiver, or explicit release-blocking status.
- Coverage target: at least 80% line coverage overall once code exists, with higher scrutiny on `packages/domain` and `packages/persistence`.
- No private source fields in board DTOs, live UI, logs, or snapshots.
- No hard waits in Playwright tests; use network, state, or locator-based waits.
- All tests should remain deterministic, isolated, and under 1.5 minutes each.
- NFR validation evidence must be identified for every in-scope NFR category before release gate.
- Full NFR PASS/CONCERNS/FAIL status is deferred to `bmad-testarch-nfr` after implementation evidence exists.

# Step 5 - Generate Outputs & Validate

## Execution Mode

Sequential generation. The workflow config requested `auto`; this run did not require parallel workers because the architecture, QA, and handoff documents were generated directly from the completed progress artifact.

## Output Files

- `_bmad-output/test-artifacts/test-design-architecture.md`
- `_bmad-output/test-artifacts/test-design-qa.md`
- `_bmad-output/test-artifacts/test-design/auction_manager-handoff.md`
- `_bmad-output/test-artifacts/test-design-progress.md`

## Validation Completed

- System-level mode used.
- Architecture and QA templates populated.
- BMAD handoff generated under `_bmad-output/test-artifacts/test-design/`.
- No unresolved template placeholders found in final output documents.
- No browser/CLI sessions were opened, so no session cleanup was required.
- Temporary artifacts were kept under `_bmad-output/test-artifacts/`.
- Risk counts reconciled: 12 total risks, 10 high-priority risks, 2 medium-priority risks.
- Coverage counts reconciled: 42 scenario groups, with 16 P0, 25 P1, 1 P2, and 0 P3.

## Completion Summary

- Mode: System-Level Test Design.
- Key gate thresholds: P0 100%, P1 at least 95%, high-risk mitigations complete or explicitly waived, coverage target at least 80% once code exists, NFR evidence identified for every in-scope NFR category.
- Full NFR PASS/CONCERNS/FAIL status remains deferred until implementation evidence exists.

## Open Assumptions

- No implementation code or existing tests exist yet.
- No epics/stories exist yet, so scenario mapping is PRD/architecture-based.
- NFR thresholds remain undefined for command latency, import size/duration, startup/resume time, upload limits, target event size, and projector viewport.
- Representative event media, especially HEIC photos, still need event-PC validation.
