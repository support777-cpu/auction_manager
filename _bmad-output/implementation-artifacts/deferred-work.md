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

## Deferred from: code review of 2-1-create-persisted-phase-1-player-order (2026-07-07)

- Legacy Story 1.6 rows cannot recover original within-category shuffle — identity backfill is the documented compatibility tradeoff for upgraded in-flight auctions
- Domain order generation invoked from persistence for legacy migration — accepted story-scoped compatibility seam per Dev Agent Record
