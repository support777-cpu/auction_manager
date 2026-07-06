---
baseline_commit: 22a61dd069db045326863e6ade23166fd8fb55fa
---

# Story 1.3: Match Player Photos With Placeholders

Status: ready-for-dev

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want to load local Player photos and match them to imported Players,
so that the live board can show Player photos where available and safe placeholders where not.

## Acceptance Criteria

1. Given Player CSV import has completed, when the operator uploads or selects local Player photo files, then the system accepts supported image formats including JPEG, PNG, HEIC, and WebP where practical on the event machine, and rejects unsupported files with a clear setup issue.
2. Given local photo filenames or source metadata contain Player-identifying text, when the matching process runs, then the system associates photos to Players using normalized Player names and useful `Photo Upload` metadata, and matched photos are copied or normalized into managed app storage using internal asset IDs, not source file paths.
3. Given a Player photo cannot be matched, when import review is shown, then the missing photo appears as `can_proceed_with_placeholder`, and Start Auction is not blocked solely because a Player photo is missing.
4. Given a Player has no matched photo, when setup review is shown, then the Player is associated with a placeholder-compatible media state, and the setup review makes clear that Start Auction can proceed without styling the missing photo as a blocking failure.
5. Given a developer finishes this story, when they run the story's Dev Gate, then photo matching unit tests, placeholder issue classification tests, asset storage/path-safety tests, and setup UI tests pass, and an E2E or acceptance test proves missing photos are surfaced but do not block Start Auction.
6. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks file boundary safety, placeholder behavior, supported-format handling, unit tests, and the missing-photo E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Tasks / Subtasks

- [ ] Extend shared contracts for photo matching and placeholder media state. (AC: 2, 3, 4)
  - [ ] In `packages/shared/src/index.ts`, add photo match status values (suggested: `matched`, `missing_uses_placeholder`, `ambiguous_uses_placeholder`, `undecodable_uses_placeholder`), a photo match record schema (player reference, status, optional `photoAssetId`), and a photo review/summary schema that extends the setup review shape with matched/placeholder counts.
  - [ ] Add new import issue codes to `importIssueCodeValues` (suggested: `missing_player_photo`, `unsupported_photo_format`, `ambiguous_photo_match`, `unmatched_photo_file`, `photo_not_decodable`, `photo_storage_failed`). Keep existing codes unchanged.
  - [ ] Keep all schemas `.strict()` and privacy-safe: no `Photo Upload` cell values, no source filesystem paths, no private registration fields in any response record.
  - [ ] Add source-local tests in `packages/shared/src/import-contracts.test.ts` (or a new focused file) proving photo review records expose only internal asset IDs, never source file paths, and that `startAuctionBlocked` remains driven only by `must_fix` count.

- [ ] Implement the photo matching adapter in `packages/imports`. (AC: 1, 2, 3, 4)
  - [ ] Add failing tests first in `packages/imports/src/player-photos.test.ts` using `_bmad-output/test-artifacts/sample-test-data/media-manifest.json` expectations and `packages/test-fixtures` player fixtures (test-only imports).
  - [ ] Create `packages/imports/src/player-photos.ts` with a pure matching function: inputs are the imported Player previews (with internal `Photo Upload` metadata carried from Story 1.2 parsing as adapter-internal data) plus uploaded file descriptors (filename, detected format); outputs are per-Player match results and grouped import issues.
  - [ ] Matching order: (1) exact normalized match of the Player's `Photo Upload` cell value against an uploaded filename, (2) uploaded filename contains the normalized Player name. Normalize by lowercasing and stripping non-alphanumeric characters.
  - [ ] Ambiguity rule: if more than one uploaded file matches one Player, or one file matches more than one Player, do not guess. Emit `ambiguous_photo_match` as `can_proceed_with_placeholder` and leave the Player on placeholder.
  - [ ] Classify every imported Player without a matched photo as `missing_player_photo` with severity `can_proceed_with_placeholder`, message in calm setup language naming the Player (e.g. "Dev Patel has no matched photo; player placeholder will be used.").
  - [ ] Add image normalization using `sharp` (already a dependency of `packages/imports`): validate the file is a decodable image, and normalize matched photos to a bounded-size web-safe output (suggested: max 512px longest edge, WebP or JPEG output) written under managed asset storage with a generated opaque asset ID.
  - [ ] HEIC handling: accept `.heic` uploads through the extension allowlist and attempt decode. If sharp cannot decode (expected with prebuilt binaries — see Latest Tech Information), emit `photo_not_decodable` as `can_proceed_with_placeholder` with a message telling the operator to convert the photo to JPEG and reimport. Never crash the import.
  - [ ] Extension/format allowlist: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`. Everything else is rejected at the upload boundary (see server task), not silently ignored.

- [ ] Add server-side photo upload, setup staging, and managed asset serving. (AC: 1, 2, 3)
  - [ ] Add an in-memory setup staging module (suggested: `apps/server/src/setup-staging.ts`) that holds the latest successful Player CSV review (including adapter-internal `Photo Upload` metadata) and the latest photo match state. Reimporting the Player CSV re-runs matching against already-staged photos or clears photo state — pick one behavior, document it in code, and test it. This staging is explicitly non-durable; durable persistence is Story 1.6.
  - [ ] Update the Player CSV preview route so its successful result populates staging without changing its existing response contract, selectors, or tests.
  - [ ] Register `@fastify/multipart` (already in `apps/server` dependencies) scoped to setup upload routes only, with explicit `limits`: `fileSize` (suggested 10 MB per photo), `files` (suggested 200), `fields`, and `parts`. Do not enable multipart globally.
  - [ ] Add `POST /api/setup/player-photos` accepting multipart photo uploads. Return the shared photo review response. Return `409` with a clear message if no Player CSV has been imported yet.
  - [ ] Upload boundary rejections per `media-manifest.json#securityCases`: unsupported extension/content type returns `415`; filenames containing path separators or traversal sequences return `400`; oversize file returns `413`; exceeding file-count limits returns a clear `4xx` error. Never write a rejected file to disk.
  - [ ] Store normalized photos under a managed data directory: add a `dataDirectory` option to `createAuctionManagerServer` (default `data/` at repo root; tests pass a temp dir) and write assets to `{dataDirectory}/assets/players/{assetId}.{ext}` with generated opaque IDs (e.g. `crypto.randomUUID()`), never source filenames.
  - [ ] Serve stored photos read-only via an internal-ID route (suggested: `GET /assets/players/:assetId.{ext}` backed by `@fastify/static` rooted at `{dataDirectory}/assets`). Per `media-manifest.json#assetCases`: traversal request paths are rejected (`400` or `404`, assert explicitly), and arbitrary filesystem paths are never served.
  - [ ] Add Fastify `inject()` tests in `apps/server/src/player-photos.test.ts` covering: successful match review, photos-before-CSV `409`, all security cases above, asset serving by internal ID, and asset traversal rejection. Use temp data directories and clean them up.
  - [ ] Add `data/` to `.gitignore`.

- [ ] Upgrade the setup UI with the Player photos step. (AC: 1, 3, 4)
  - [ ] In `apps/web/src/main.tsx`, add a Player photos section after the Player CSV section with stable selectors: `setup-player-photos`, `player-photos-input` (multi-file input accepting the allowlist), and `player-photos-summary` (matched count, placeholder count).
  - [ ] Disable or clearly gate the photo upload control until a Player CSV review with imported Players exists, matching the server's `409` behavior.
  - [ ] Render placeholder-compatible photo issues inside the existing `import-issues-table` group `can_proceed_with_placeholder` (the group and its selector already exist and currently render "None").
  - [ ] Style missing photos as neutral/informational per UX: no danger red, no error framing. Suggested copy: "3 Players will use the neutral placeholder. Start Auction is not blocked by missing photos."
  - [ ] Keep Start Auction disabled in this story (Team CSV and parameters are later stories), but ensure the blocker text never cites photos and `must_fix` counting is unchanged by photo state.
  - [ ] Preserve all Story 1.1/1.2 selectors and behavior: `app-shell`, `phase-indicator`, `setup-empty-state`, `setup-start`, `setup-player-csv`, `player-csv-input`, `player-csv-summary`, `import-issues-table`, `setup-start-auction`, `start-auction-blocker`.
  - [ ] Reuse the Story 1.2 upload patterns: upload-generation ref to discard stale responses, loading/ready/error states, `role="alert"` errors, real file input with accessible label, 44px minimum targets, and text kept fitting at 1440x900, 1366x768, 1920x1080, and 390x844. Extend `apps/web/src/styles.css` in the existing light setup token style.

- [ ] Add story-level acceptance and regression coverage. (AC: 5, 6)
  - [ ] Unit: matching boundaries (exact metadata match, name-in-filename match, no match, ambiguous file, ambiguous player, case/punctuation-insensitive normalization).
  - [ ] Unit: classification (missing photo, unsupported format, undecodable HEIC path, storage failure) all resolve to the correct severity, and only `must_fix` can set `startAuctionBlocked`.
  - [ ] Unit/integration: normalized asset files exist under the managed directory with generated IDs; source filenames never appear in stored names, response records, or issue-free UI fields.
  - [ ] API: full security-case matrix from `media-manifest.json` (`415`, `400` traversal, `413` oversize, asset-ID-only serving).
  - [ ] E2E (Playwright event mode, in `apps/web/e2e/event-mode.spec.ts` or a new spec added to `playwright.event.config.ts` `testMatch`): upload valid Player CSV, upload a photo set with at least one matched and one missing photo, assert the `can_proceed_with_placeholder` group shows the missing-photo issue, the photos summary shows matched/placeholder counts, `setup-start-auction` remains disabled, and `start-auction-blocker` text does not mention photos.
  - [ ] Regression: Story 1.1 shell smoke, Story 1.2 CSV preview unit/API/UI/E2E tests, `/api/health`, static serving, build, and typecheck all still pass.
  - [ ] Run the Dev Gate and record results in the Dev Agent Record before marking tasks complete.

## Dev Notes

### Current Repository State To Preserve

- Stories 1.1 and 1.2 are done. Story 1.2's implementation is uncommitted working-tree state on top of commit `22a61dd`; do not revert or overwrite those files.
- `packages/imports/src/player-csv.ts` owns Player CSV parsing with table-driven role/category mapping and privacy-safe previews. `parsePlayerCsvForSetup(csvText)` returns the full review response. Note: it currently does not retain `Photo Upload` values anywhere — this story must carry them as adapter-internal metadata (a new internal return field or parallel structure), without adding them to the privacy-safe `SetupPlayerPreview` schema.
- `packages/shared/src/index.ts` owns the strict Zod contracts (`setupPlayerPreviewSchema`, `importIssueSchema`, `importIssueGroupSchema`, `playerCsvImportReviewResponseSchema`) and canonical enum value arrays. Extend these; do not fork parallel contract shapes elsewhere.
- `apps/server/src/app.ts` owns the Fastify factory with `/api/health`, `POST /api/setup/player-csv/preview` (text/csv body, 256 KB limit, 413/415 handling), a shared error handler, static serving of `apps/web/dist`, and an SPA fallback. The preview flow is currently fully stateless.
- `apps/web/src/main.tsx` renders the setup checklist with the Player CSV upload/review UI. The `can_proceed_with_placeholder` issue group already renders (with count 0 / "None"), so photo issues will appear there without new table plumbing.
- `sharp@^0.35.0` is already a dependency of `packages/imports`, and `@fastify/multipart@^9.0.0` is already a dependency of `apps/server`. Neither is used yet. Do not add new dependencies for this story.
- `vitest.config.ts` aliases all `@auction-manager/*` packages to `src/` — new source files are picked up without build steps in tests.

### Existing Files That This Story Will Touch

Read these before editing and update them in place:

- `packages/shared/src/index.ts`: add photo match status, photo review schemas, and new issue codes.
- `packages/shared/src/import-contracts.test.ts`: extend privacy/contract tests.
- `packages/imports/src/player-csv.ts`: expose `Photo Upload` metadata internally for matching (keep it out of `SetupPlayerPreview`).
- `packages/imports/src/index.ts`: re-export the new photo matching public functions.
- `apps/server/src/app.ts`: register scoped multipart, add photo upload route, asset serving, `dataDirectory` option, staging wiring.
- `apps/server/src/player-csv-preview.test.ts`: keep passing; extend only if the preview route now populates staging in a way that needs assertion.
- `apps/web/src/main.tsx` and `apps/web/src/styles.css`: add the photos setup step.
- `apps/web/e2e/event-mode.spec.ts` (and `playwright.event.config.ts` if adding a new event spec file — its `testMatch` is currently `**/event-mode.spec.ts` only).
- `.gitignore`: add `data/`.

Expected new files:

```text
packages/imports/src/player-photos.ts
packages/imports/src/player-photos.test.ts
apps/server/src/setup-staging.ts
apps/server/src/player-photos.test.ts
apps/web/e2e/player-photos.spec.ts   (optional; event-mode.spec.ts extension is acceptable)
```

### Architecture Guardrails

- `packages/imports` owns matching, format validation, normalization, and photo issue creation (AD-7). Route handlers must not reimplement matching rules.
- `apps/server` adapts multipart HTTP to the adapter and owns the managed asset directory boundary (AD-9). Multipart is registered only for setup upload routes; CORS stays disabled; binding stays `127.0.0.1`.
- Managed asset storage uses generated internal asset IDs under `{dataDirectory}/assets/players/`. The server never serves user-provided filesystem paths, and stored filenames never contain source filenames (AD-9, TD-028).
- `packages/domain` and `packages/persistence` are not part of this story. No SQLite tables, action log, or snapshots. The in-memory setup staging is a documented temporary seam that Story 1.6 replaces with durable Start Auction persistence.
- Privacy by projection (AD-8): `Photo Upload` is in the private source field list. Its cell values may be used internally for matching but must never appear in response player records, rendered setup rows, live DTOs, logs, or snapshots. Operator-uploaded photo filenames may appear in setup issue messages for diagnosis only (e.g. ambiguous or unmatched files); prefer Player names in messages wherever possible.
- Missing/ambiguous/undecodable photos are never `must_fix`. Only the existing Story 1.2 CSV conditions may block Start Auction in this story. `summary.startAuctionBlocked` stays `mustFixCount > 0`.
- No cloud services, hosted storage, accounts, Docker runtime, or alternate package managers.

### Photo Matching Contract

| Input situation | Outcome |
| --- | --- |
| Uploaded filename equals Player's `Photo Upload` value (normalized) | Matched; normalize and store with generated asset ID |
| Uploaded filename contains normalized Player name | Matched (if unique); normalize and store |
| One file matches multiple Players, or multiple files match one Player | `ambiguous_photo_match`, `can_proceed_with_placeholder`, Player keeps placeholder |
| Player has no matching file | `missing_player_photo`, `can_proceed_with_placeholder` |
| Uploaded file matches no Player | `unmatched_photo_file`, `can_proceed_with_placeholder`-group diagnostic (file is not stored) |
| Supported extension but undecodable content (e.g. HEIC on prebuilt sharp, corrupt file) | `photo_not_decodable`, `can_proceed_with_placeholder`, Player keeps placeholder |
| Unsupported extension/content type at upload | HTTP `415` at the boundary; nothing written to disk |
| Traversal filename (`../`, path separators) | HTTP `400`; nothing written to disk |
| Oversize file | HTTP `413` |

Normalization for matching: lowercase, strip all non-alphanumeric characters, compare on the base filename without extension. Add explicit tests for spaces, underscores, hyphens, and case differences (`Aarav Menon` must match `aarav_menon.jpg`, `AaravMenon.JPG`, and `aarav-menon (1).png` — the last one only if unambiguous).

Fixture alignment: `media-manifest.json` names the expected statuses (`matched`, `missing_uses_placeholder`, `ambiguous_requires_review`, `event_pc_rehearsal_required`) and sample players (Aarav jpg, Neha png, Meera webp, Rohan heic, Dev Patel missing, Anika ambiguous). Reuse these players from `packages/test-fixtures` in tests. You may rename statuses to the shared enum suggested above, but keep semantics identical and keep tests traceable to TD-024/TD-025.

### Import Issue Contract Additions

Use severity `can_proceed_with_placeholder` for every photo issue. Recommended codes (extend `importIssueCodeValues`):

- `missing_player_photo` — imported Player with no matched file.
- `ambiguous_photo_match` — match could not be resolved uniquely; list candidate filenames in the message for diagnosis.
- `unmatched_photo_file` — uploaded file matched no Player; name the file.
- `photo_not_decodable` — allowlisted extension but sharp could not decode; tell the operator to convert to JPEG and reimport.
- `unsupported_photo_format` — reserve for review display if per-file rejection detail is surfaced after a 415; boundary rejection itself is the HTTP error.
- `photo_storage_failed` — normalization/write failed; message must not include filesystem paths.

Issue fields follow the existing `importIssueSchema`: `id` (deterministic, test-friendly), `severity`, `code`, `message`, optional `playerName`. `sourceColumn`/`sourceRowNumber` generally do not apply to photo issues; omit them rather than inventing values.

### UX Requirements For This Story

- Keep setup light, dense, checklist-like. Missing photos are neutral, never danger red (DESIGN.md Do's and Don'ts: "Use clear placeholders for missing photos/logos" / "Treat missing media as a live-event failure" is the don't).
- Microcopy pattern from EXPERIENCE.md: "Photo missing. Placeholder will be used." Calm, specific, no hype.
- The operator must see: photos uploaded or not, matched count, placeholder count, per-Player missing-photo issues in the placeholder group, and confirmation that Start Auction is not blocked by photos.
- The photos step reads as the second checklist item after Player CSV. Gate it visibly (disabled control plus short explanation) until a CSV review exists.
- Real file input with `multiple`, accessible name, visible focus, text-based issue reasons, 44px minimum interactive targets.
- Stable layout: adding photo issues or counts must not shift the Start Auction blocker out of view at the four acceptance viewports.

### Latest Tech Information

Verified 2026-07-07 IST:

- **sharp 0.35.x cannot decode HEIC with prebuilt binaries.** HEVC is patent-encumbered; decoding HEIC requires a globally installed libvips compiled with libheif/libde265/x265. This is confirmed current policy (sharp issues #4132, #4479; `https://sharp.pixelplumbing.com/install/#prebuilt-binaries`). Consequence: on a stock dev/event machine, `.heic` uploads will fail decode. The story must treat this as the expected placeholder-compatible path (`photo_not_decodable`), matching TD-024's "integration/rehearsal" framing and the PRD's "where practical" wording. Do not attempt to add libheif builds, HEIC conversion services, or new native dependencies in this story.
- Prebuilt sharp supports JPEG, PNG, WebP, AVIF, TIFF, GIF, SVG input. JPEG/PNG/WebP cover the allowlist minus HEIC.
- **@fastify/multipart v9**: register with `limits` (`fileSize`, `files`, `fields`, `parts`); security defaults are `parts: 1000` and `fileSize: 1048576` (1 MB) — the default `fileSize` is too small for photos, so set it explicitly. Oversize files throw `RequestFileTooLargeError` (map to `413`). Iterate `req.files()` for multi-file upload. Source: `https://github.com/fastify/fastify-multipart`.
- `@fastify/static` (already used) can serve the asset directory with a second registration using a different `prefix` and its own `root`; it rejects traversal outside `root` by default — still assert this in tests per TD-027/TD-028.

### Testing Requirements

Dev Gate commands for this story:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:e2e:event
```

The real multipart upload path requires the Fastify server, so the binding acceptance test belongs in event mode (`npm run test:e2e:event`). The Vite-preview config (`playwright.config.ts`) may carry a route-mocked UI spec for the photos section, following the `player-csv-import.spec.ts` pattern.

Required tests (mapping to TEA cases TD-024, TD-025, TD-027, TD-028):

- Unit: matching happy paths, ambiguity, normalization boundaries, missing-photo classification.
- Unit: severity rules — photo issues never produce `must_fix`; `startAuctionBlocked` unchanged by photo state.
- Unit/integration: normalized assets stored under managed directory with opaque IDs; JPEG/PNG/WebP decode and normalize; HEIC falls back to `photo_not_decodable`.
- API: `409` before CSV import; `415` unsupported type; `400` traversal filename; `413` oversize; file-count limit; grouped photo review response shape.
- API: asset served by internal ID returns 200 with image content type; traversal request path rejected; arbitrary path never served.
- UI/E2E: photos summary and placeholder group render; Start Auction blocker text unrelated to photos; existing CSV flows regress clean.

Review/Test Gate (AC 6): a second agent must check file boundary safety (traversal, allowlist, size/count limits, no source filenames in storage), placeholder behavior and severity mapping, supported-format handling including the HEIC fallback, privacy of `Photo Upload` values, staging behavior on CSV reimport, and run the missing-photo E2E gate. Blocking findings reopen the story.

### Previous Story Intelligence

- Story 1.2 established the working patterns to copy: contracts-first with strict Zod in `packages/shared`, pure adapter in `packages/imports` with focused test files, thin Fastify boundary with `inject()` tests, UI upload with generation-ref race protection and explicit loading/error states, and route-mocked preview E2E plus real event-mode E2E.
- Story 1.2's code review fixed: an upload race (solved with `uploadGenerationRef`), review badge states, `413` response body shape, zero-player blocking (`startAuctionBlocked` true when no valid players), and UI error handling. Reuse these solutions; do not reintroduce the race in the photos upload handler.
- The Story 1.2 error handler in `app.ts` maps body-too-large errors to a CSV-specific 413 message. Multipart oversize errors will hit the same handler — make the 413 message generic or route-aware so photo uploads do not return CSV copy.
- Story 1.1 established the light setup shell tokens, event-mode config (`PORT=4174`), and the selectors listed in the UI task. Event-mode Playwright uses `playwright.event.config.ts` with `testMatch: "**/event-mode.spec.ts"` — update `testMatch` if adding a separate photos event spec.

### Git Intelligence Summary

- Commits: `22a61dd Local Auction Manager App Shell`, `1c76815 Docs done. Implementation Ready.`, `d10dc34 Initial commit`.
- Story 1.2's full implementation is uncommitted working-tree state. Build on it in place; do not run destructive git commands, resets, or checkouts of the modified files.

### Persistence Ownership

No SQLite persistence is introduced by this story.

- This story owns: managed photo asset files under `{dataDirectory}/assets/players/` with generated asset IDs, the in-memory setup staging for CSV review plus photo match state, the photo upload/review API response, and asset serving by internal ID.
- It does not own: `auction_state`, `players`, `teams`, `import_issues` tables, action log, snapshots, migrations, or resume. Staged setup state is lost on server restart by design until Story 1.6 persists Start Auction state.
- If the implementation persists anything durable anyway, it must add a concrete Persistence Ownership note naming tables/fields and include temporary SQLite transaction/resume tests in the same slice.

### Scope Boundaries

In scope:

- Player photo multipart upload with extension/content/size/count limits and security rejections.
- Name- and metadata-based photo matching with explicit ambiguity handling.
- Sharp normalization into managed asset storage with internal asset IDs; HEIC placeholder fallback.
- Placeholder-compatible issue classification and setup review display.
- Asset serving by internal ID with path-safety tests.
- Unit, API, UI, and E2E coverage proving photos never block Start Auction.

Out of scope:

- Team CSV, Team logos (Story 1.4 — do not generalize the photo pipeline into a premature shared media framework; extract shared helpers only when 1.4 actually needs them).
- Auction parameters (1.5), Start Auction command and durable persistence (1.6).
- Live board Player panel rendering of photos/placeholders (Epic 2); this story stops at setup review plus asset serving.
- Building libheif/custom libvips, HEIC conversion tooling, or new native dependencies.
- Manual match-fixing UI; fixes happen by renaming source files and re-uploading.
- SQLite, snapshots, action log, resume, accounts, cloud services.

### Project Structure Notes

- Extend existing workspace packages in place; no new packages, apps, or top-level frameworks.
- Keep source under `src/`; never edit `dist/` output.
- `apps/web/src/main.tsx` remains a single-file setup surface only while readable — the photos section may justify extracting local components into `apps/web/src/` files; keep selectors stable if you do.
- The `data/` directory is runtime state, created on demand by the server, and must be gitignored.

### References

- `_bmad-output/planning-artifacts/epics.md` sections `Additional Requirements`, `UX Design Requirements`, `Epic 1`, and `Story 1.3`.
- `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md` sections `FR-3: Match local player photos`, `Privacy And Data Minimization`, and `Data Compatibility`.
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md` sections `AD-7`, `AD-8`, `AD-9`, `AD-11`, `Consistency Conventions`, `Stack`, `Structural Seed`, and `Deferred` (HEIC certainty row).
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md` sections `Information Architecture`, `Voice`, `Component Patterns`, `State Patterns`, and `Privacy And Data Visibility`.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` sections `Components` and `Do's and Don'ts`.
- `_bmad-output/test-artifacts/test-design/auction_manager-handoff.md` sections `Quality Gates`, `Story-Level Integration Guidance`, and `Data-TestId Requirements`.
- `_bmad-output/test-artifacts/finalized-test-cases.md` cases `TD-024`, `TD-025`, `TD-027`, `TD-028`.
- `_bmad-output/test-artifacts/sample-test-data/media-manifest.json`, `players-valid.csv`, `sample-data-map.json`.
- `packages/test-fixtures/src/index.ts` player/photo fixture data and `privateSourceFieldNames` (includes `Photo Upload`).
- `https://sharp.pixelplumbing.com/install/#prebuilt-binaries`
- `https://sharp.pixelplumbing.com/api-output/#heif`
- `https://github.com/fastify/fastify-multipart`

## Dev Agent Record

### Agent Model Used

TBD by dev agent.

### Debug Log References

### Implementation Plan

- Contracts first (shared schemas + tests), then the matching adapter, then server upload/staging/asset routes, then setup UI, then story gate tests, in task order.

### Completion Notes List

- Story context created on 2026-07-07 from PRD, architecture, UX, TEA test artifacts, current code, Story 1.2 learnings, git status, and verified current sharp/@fastify/multipart documentation.

### File List

### Change Log

- 2026-07-07: Created Story 1.3 context file and marked ready-for-dev.
