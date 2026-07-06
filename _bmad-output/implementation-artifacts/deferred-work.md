## Deferred from: code review of 1-3-match-player-photos-with-placeholders (2026-07-07)

- Concurrent photo upload requests can interleave staging writes — single-operator event PC assumed for Story 1.3
- Full in-memory buffering of up to 200×10 MB uploads — within spec limits; streaming is a later NFR
- Missing aggregate placeholder count copy in UI — suggested UX copy only
- No viewport layout regression tests for photo UI — manual acceptance sufficient for this story
- getPlayerPhotos() staging accessor is unused — reserved for Story 1.6 persistence seam
- File-count limit test lacks specific error code/message assertion — status range check meets minimum gate
