## Deferred from: code review of 1-3-match-player-photos-with-placeholders (2026-07-07)

- Concurrent photo upload requests can interleave staging writes — single-operator event PC assumed for Story 1.3
- Full in-memory buffering of up to 200×10 MB uploads — within spec limits; streaming is a later NFR
- Missing aggregate placeholder count copy in UI — suggested UX copy only
- No viewport layout regression tests for photo UI — manual acceptance sufficient for this story
- getPlayerPhotos() staging accessor is unused — reserved for Story 1.6 persistence seam
- File-count limit test lacks specific error code/message assertion — status range check meets minimum gate

## Deferred from: code review of 1-6-start-auction-with-persisted-initial-state (2026-07-07)

- Route-level staged-data checks partially duplicate domain readiness — adapter guard for missing staged payloads
- persistence_failure marking happens outside the commit transaction — rare crash window; snapshot failure still blocks mutations
- Board DTO includes phase1/sold fields beyond the story's literal allowlist — fields are null-safe and needed for later live phases

## Deferred from: code review of 2-2-reveal-current-player-on-the-live-board (2026-07-07)

- Concurrent reveal lost-update race without optimistic concurrency — matches existing Start Auction pattern until concurrent live commands land
- Application-level duplicate clientCommandId pre-check is racy and O(n) — consistent with Start Auction idempotency pattern
- Strict undoHistory schema will need widening for future live commands — intentional for Story 2.2 scope

## Deferred from: code review of 2-4-increase-current-bid (2026-07-07)

- Bid increment has no budget/team cap guard — Story 2.5 owns invalid-sale blocking UX
- Concurrent stale-state / optimistic concurrency — matches existing live-command pattern until concurrency work lands
- Route-level listActionLog duplicate pre-check — consistent with Stories 2.2–2.3 idempotency pattern


- Concurrent select-team stale-state protection — matches existing Start Auction / Reveal Next pattern until optimistic concurrency lands
- Full UI/component test suite for tile accessibility and keyboard — helper and E2E tests cover primary flow; dedicated component tests deferred
- Blocked-capacity E2E scenario — domain and DTO tests cover capacity reasons; Story 2.5 owns sale blocking UX

## Deferred from: code review of 2-5-block-invalid-sales-with-clear-reasons (2026-07-07)

- E2E coverage for squad-full and role-target-full blocking paths — domain/API unit tests cover constraints; full E2E setup requires Story 2.6 sale mutation
- NaN/non-finite bid defensive guards — corrupt numeric state is out of scope for this slice
- Player-already-sold status guard in domain — deferred to Story 2.6 accepted-sale path

## Deferred from: code review of 2-6-mark-player-sold-and-update-team-state (2026-07-07)

- Live roster list under team tiles — Story 2.10 owns full Board/Rosters UI; deriveSoldRosterRows helper satisfies this story's task boundary
- Optimistic concurrency / stale-state guard on mark-sold — matches existing live-command pattern across Stories 2.2–2.6 until dedicated concurrency work lands
- Post-commit snapshot write split from SQLite transaction — consistent with Start/Reveal/Select/Increase persistence pattern

## Deferred from: code review of 2-7-mark-player-unsold-into-phase-2-pool (2026-07-07)

- Stale concurrent mutating commands can overwrite newer state — no optimistic locking on any live command; matches Stories 2.2–2.6 pattern
- Cross-command stale Mark Unsold response can overwrite fresher board state — per-command generation refs only; same pattern as Mark Sold / Reveal Next
- Additional route tests for `persistence_failure_uncleared`, wrong phase, snapshot write failure — same coverage gap as Mark Sold route tests

## Deferred from: code review of 2-8-persist-and-resume-phase-1-live-state (2026-07-08)

- `state` vs `resume` metadata torn read across separate repository reads — matches existing read-path pattern until snapshot-isolated load lands
- Legacy Phase 1 migration can write during `loadCurrentState` on GET — documented pre-2.1 migration behavior from Story 2.1
- No snapshot fallback when SQLite `state_json` is corrupt but `latest.json` is valid — recovery UX belongs to a later persistence story
- `deriveSoldRosterRows` silently omits or throws on corrupt sold-player rows — corrupt-row hardening is cross-cutting data-integrity work
- No in-app discard path when saved auction state is unrecoverable — Reset/Close belong to later stories
- E2E coverage for persistence-failure resume blocking — component and API tests cover the operator path for this story

## Deferred from: code review of 2-9-undo-phase-1-live-actions (2026-07-08)

- Concurrent undo requests can race like other live commands — single-writer pattern matches Stories 2.2–2.8 until optimistic concurrency lands
- E2E undo flow does not assert action log or snapshot files — API and repository tests cover audit/snapshot evidence for this story

## Deferred from: code review of 2-10-view-team-rosters-during-the-auction (2026-07-08)

- DOM-level roster privacy allowlist test — relies on existing shared contract tests; dedicated DOM scan deferred
- Full enabled/disabled control-state preservation test beyond AC5 minimum — E2E covers reveal-next; exhaustive control matrix deferred

## Deferred from: code review of 2-5-1-apply-red-black-event-console-tokens-and-app-frame (2026-07-08)

- Dev Gate build step not evidenced in completion notes — CI/build gate tracked separately
- Screenshot captured at only 1366x768 viewport — Story 2.5.5 owns multi-viewport visual QA
- E2E does not assert screenshot artifact existence — manual artifact path recorded in Dev Agent Record

## Deferred from: code review of 2-5-2-redesign-the-live-auction-board-layout (2026-07-08)

- Phase 1 per-category breakdown grid removed — intentional per story layout scope; aggregate counters replace per-category grid
- 390×844 mobile viewport proof not automated — CSS stacking exists without dedicated Playwright profile
