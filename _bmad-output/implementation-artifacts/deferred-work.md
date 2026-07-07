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
