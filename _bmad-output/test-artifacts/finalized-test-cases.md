---
workflowType: testarch-automate-finalized-cases
generatedBy: TEA Master Test Architect
generatedAt: 2026-07-06
projectName: auction_manager
sourceArtifacts:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/test-artifacts/test-design-qa.md
  - _bmad-output/test-artifacts/test-design/auction_manager-handoff.md
sampleDataRoot: _bmad-output/test-artifacts/sample-test-data
status: finalized-for-story-implementation
---

# Finalized Test Cases and Sample Test Data

## Scope

This catalog finalizes the TEA `TD-*` test scenarios against the completed epic/story plan. The current implementation is still scaffold-level, so these are executable-ready story gates and fixture contracts rather than committed failing tests against routes and domain APIs that do not exist yet.

The automation destination column identifies where each case should become code as the owning story is implemented. P0 and P1 gates should be added in the same story slice as the behavior they protect.

## Test Data Packs

| Pack | Path | Use |
| --- | --- | --- |
| Valid player CSV | `sample-test-data/players-valid.csv` | Setup happy path, privacy, role/category derivation, base prices |
| Invalid player CSV | `sample-test-data/players-invalid.csv` | `must_fix` import issues, unmappable roles, missing required fields |
| Valid team CSV | `sample-test-data/teams-valid.csv` | Team/captain import, logo matching, setup happy path |
| Invalid team CSV | `sample-test-data/teams-invalid.csv` | Missing Team/Captain Start Auction blockers |
| Media manifest | `sample-test-data/media-manifest.json` | Matched, missing, ambiguous, unsupported, and traversal media cases |
| Auction state fixtures | `sample-test-data/auction-states.json` | Domain, persistence, API, E2E state setup |
| Case/data map | `sample-test-data/sample-data-map.json` | Machine-readable mapping from `TD-*` cases to fixture packs |
| Typed factories | `packages/test-fixtures/src/index.ts` | Reusable deterministic builders for unit/integration/E2E setup |

## Final Case Matrix

| ID | Priority | Story | Level | Automation Destination | Required Data | Primary Assertions |
| --- | --- | --- | --- | --- | --- | --- |
| TD-001 | P1 | 1.5 | Unit | `packages/domain` | `auction-states.json#parameters` | Defaults use integer units: role prices 10/8/6/6/6, bid increment 2, budget 170, squad max 13, role targets 2/3/2/2/2, manual assignment `NoBudgetImpact`. |
| TD-002 | P0 | 2.5 | Unit | `packages/domain` | `auction-states.json#invalidSaleBudget` | Sale at exact remaining budget is allowed; sale above remaining budget is blocked with budget reason and no mutation. |
| TD-003 | P1 | 2.5 | Unit | `packages/domain` | `auction-states.json#invalidSaleSquad` | Team at 12 of 13 can buy one more player; team at 13 is blocked with squad capacity reason. |
| TD-004 | P1 | 2.5 | Unit | `packages/domain` | `auction-states.json#invalidSaleRole` | Role target boundary is enforced for the Current Player role; blocked reason names the role capacity. |
| TD-005 | P0 | 2.6 | Unit | `packages/domain` | `auction-states.json#liveSale` | Mark Sold sets Player status, sold price, winning Team, budget, squad, role count, roster projection, action summary, and undo payload. |
| TD-006 | P1 | 2.2, 2.4 | Unit | `packages/domain` | `auction-states.json#setupReady` | Reveal initializes Current Bid from Base Price; Increase Bid adds exactly configured increment and is undoable. |
| TD-007 | P1 | 2.3 | Unit | `packages/domain` | `auction-states.json#liveSale` | Select, change, and clear selected Team mutate only selected-team state and are reversible. |
| TD-008 | P1 | 2.7 | Unit | `packages/domain` | `auction-states.json#liveSale` | Mark Unsold moves Phase 1 player to Phase 2 pool without changing budget, squad, or role counts. |
| TD-009 | P1 | 3.1 | Unit/API | `packages/domain`, `apps/server` | `auction-states.json#phaseTransitions` | Unsold Bidding cannot start before Phase 1 completion unless explicit skip path records skipped Players. |
| TD-010 | P1 | 3.6 | Unit/Integration | `packages/domain`, `packages/persistence` | `auction-states.json#manualAssignment` | Manual assignment chooses only valid Teams and v1 `NoBudgetImpact` leaves budget unchanged. |
| TD-011 | P1 | 3.6 | Unit | `packages/domain` | `auction-states.json#manualAssignment` | Seeded/manual assignment selection is deterministic for tests and does not assign to invalid Teams. |
| TD-012 | P1 | 3.7 | Unit/API | `packages/domain`, `apps/server` | `auction-states.json#noValidTeam` | No-valid-Team response lists exact budget/squad/role reasons without mutating assignment state. |
| TD-013 | P0 | 2.9 | Unit/Integration | `packages/domain`, `packages/persistence` | `auction-states.json#undoChain` | Multi-step Undo restores player, bid, selected-team, budget, squad, role, phase, pool, log, and snapshot state. |
| TD-014 | P0 | 4.2, 4.3 | Unit/API/E2E | `packages/domain`, `apps/server`, `apps/web/e2e` | `auction-states.json#dangerousOperations` | Reset and Close require confirmation, commit atomically, are excluded from Undo, and cannot be reversed. |
| TD-015 | P0 | 2.1 | Integration | `packages/domain`, `packages/persistence` | `auction-states.json#setupReady` | Phase 1 order follows category sequence, includes each player once, and survives restart without reshuffle. |
| TD-016 | P0 | 1.6, 2.6 | Integration | `packages/persistence` | `auction-states.json#liveSale` | Mutation commits current state and action log in one transaction; rollback leaves prior state intact. |
| TD-017 | P1 | 2.8 | Integration | `packages/persistence` | `auction-states.json#liveSale` | Snapshot is written only after commit and never represents a partial mutation. |
| TD-018 | P0 | 2.8 | Integration/E2E | `packages/persistence`, `apps/web/e2e` | `auction-states.json#resumeLiveState` | Reopen/resume restores latest phase, current player, bid, selected Team, Teams, rosters, and Undo History. |
| TD-019 | P1 | 2.8, 4.5 | API/E2E | `apps/server`, `apps/web/e2e` | `auction-states.json#writeFailure` | Persistence failure blocks further mutating commands until retry/recovery; UI does not show uncommitted state as final. |
| TD-020 | P1 | Cross-story API | API | `apps/server` | `auction-states.json#errorContracts` | Invalid input returns 400, rule conflict 409, oversized upload 413, unsupported media 415, unexpected fault 500 without UI stack trace. |
| TD-021 | P1 | Cross-story API | API | `apps/server` | `auction-states.json#clientCommandId` | Mutating commands require `clientCommandId`; duplicate/unknown policy is implemented consistently and documented. |
| TD-022 | P0 | 1.2 | Unit/Integration | `packages/imports` | `players-invalid.csv` | Missing required Player data and unmappable category create `must_fix` issues and block Start Auction. |
| TD-023 | P1 | 1.5 | Unit | `packages/domain`, `packages/shared` | `players-valid.csv`, `auction-states.json#parameters` | Every imported Role has a Base Price; missing pricing blocks Start Auction with specific reason. |
| TD-024 | P1 | 1.3 | Integration/Rehearsal | `packages/imports`, event PC | `media-manifest.json` | JPEG, PNG, WebP, and event-PC HEIC are handled where practical; unsupported files produce clear setup issues. |
| TD-025 | P1 | 1.3, 1.4 | Integration/E2E | `packages/imports`, `apps/web/e2e` | `media-manifest.json` | Missing photos/logos are `can_proceed_with_placeholder`; required data remains `must_fix`. |
| TD-026 | P1 | 1.4 | Integration | `packages/imports` | `teams-valid.csv`, `teams-invalid.csv` | Team/Captain import works; missing required Team data blocks Start Auction; missing logo does not. |
| TD-027 | P0 | 1.3, 4.5 | API | `apps/server` | `media-manifest.json#securityCases` | Upload routes reject traversal, unsupported type, bad content type, oversize, and excessive file-count cases. |
| TD-028 | P0 | 1.3, 1.4 | API | `apps/server` | `media-manifest.json#assetCases` | Static asset serving uses internal asset IDs only and never serves arbitrary source filesystem paths. |
| TD-029 | P0 | 2.1, 2.2, 4.3 | Unit/API | `packages/shared`, `apps/server` | `players-valid.csv`, `auction-states.json#privacyDenyList` | Board/roster DTO allowlist excludes email, mobile, payment status, transaction ID, source timestamp, and ignored source fields. |
| TD-030 | P1 | 2.3, 2.10 | Component/E2E | `apps/web` | `auction-states.json#liveSale` | Live board shows current player, current bid, selected Team, team budget, squad, role capacity, and roster projection. |
| TD-031 | P1 | 4.1 | Component/E2E | `apps/web` | `auction-states.json#dangerousOperations` | Routine controls are reachable and dangerous operations are separated, non-mutating until confirmed, and keyboard accessible. |
| TD-032 | P1 | UX | E2E | `apps/web/e2e` | `auction-states.json#keyboardFlow` | Keyboard-only setup/live/undo/unsold/manual/danger flows work with visible focus and accessible names. |
| TD-033 | P1 | UX | Component/E2E | `apps/web` | `auction-states.json#invalidSaleBudget` | Blocked reasons are text, specific, and not communicated by color alone. |
| TD-034 | P2 | 4.5 | E2E/Visual | `apps/web/e2e` | `auction-states.json#liveSale` | 1440x900, 1366x768, 1920x1080, and 390x844 profiles preserve readability and workflow order. |
| TD-035 | P0 | 1.6 | E2E | `apps/web/e2e` | `players-valid.csv`, `teams-valid.csv`, `media-manifest.json` | Valid setup imports Players/Teams/media, accepts placeholders, starts auction, locks parameters, and lands on live board. |
| TD-036 | P0 | 2.6 | E2E | `apps/web/e2e` | `auction-states.json#liveSale` | Reveal, increase bid, select Team, and Mark Sold update board and roster from authoritative state. |
| TD-037 | P0 | 2.5 | E2E | `apps/web/e2e` | `auction-states.json#invalidSaleBudget` | Invalid sale shows exact reason and leaves player/team/bid/roster state unchanged. |
| TD-038 | P0 | 2.9 | E2E | `apps/web/e2e` | `auction-states.json#undoChain` | Undo after sale restores Current Player, bid, selected Team, Team budget/counts, and roster projection. |
| TD-039 | P1 | 3.2, 3.3 | E2E | `apps/web/e2e` | `auction-states.json#unsoldPhases` | Phase 2 unsold bidding uses normal bidding controls and moves second unsold Players into Phase 3. |
| TD-040 | P0 | 4.5 | E2E | `apps/web/e2e` | `players-valid.csv`, `auction-states.json#privacyDenyList` | Live board, roster UI, DTOs, logs, and snapshots never render private source field names or values. |
| TD-041 | P1 | 4.5 | API/Integration | `apps/server`, `packages/persistence` | `auction-states.json#startupChecks` | Startup validates Node version, data dir writability, DB open, asset paths, and health endpoint before live commands. |
| TD-042 | P1 | CI | CI | `.github/workflows` | N/A | CI runs typecheck, Vitest, P0/P1 Playwright smoke, trace artifacts on failure, and burn-in for changed critical tests. |

## Promotion Gates

| Gate | Required Cases |
| --- | --- |
| Every PR | Typecheck, all unit/integration tests for touched packages, all P0 API tests, smoke E2E subset `TD-035`, `TD-036`, `TD-037`, `TD-038`, `TD-040` once flows exist |
| Story review | Owning story P0/P1 cases plus changed-source regression coverage |
| Nightly | All P0/P1/P2 cases, upload/file-security matrix, restart/resume, failed-write, accessibility, visual profiles |
| Event readiness | Full dry-run using `players-valid.csv`, `teams-valid.csv`, `media-manifest.json`, restart/resume, close/final roster privacy, event-PC media rehearsal |

## Assumptions and Open Test Decisions

- `clientCommandId` duplicate behavior is still a design decision; `TD-021` should become precise before API implementation closes.
- HEIC handling is marked integration/rehearsal because support depends on event-machine codecs/tooling.
- Performance thresholds are not yet fixed; `TD-034` and k6-style checks should move from P2 to P1 once targets are set.
- Generated sample source CSVs intentionally contain private fields so privacy tests can prove those values never reach live DTOs, UI, logs, or snapshots.
