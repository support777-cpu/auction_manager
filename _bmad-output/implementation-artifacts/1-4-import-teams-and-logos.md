---
baseline_commit: 32f035ac66293d1c7c70dd470c70993e486eb6ca
---

# Story 1.4: Import Teams and Logos

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want to load Teams, Captains, and Team logos before the auction,
so that captains and attendees can follow team state during live bidding.

## Acceptance Criteria

1. Given the setup surface is open, when the operator uploads the Team CSV, then the system imports each Team name and Captain name, and every Team has a Team name before Start Auction can proceed.
2. Given the Team CSV is missing required Team data, when import review is shown, then the issue appears as `must_fix`, and Start Auction remains blocked until the Team CSV is corrected and reimported.
3. Given the operator uploads or selects Team logo files, when the logo matching process runs, then the system associates logos to Teams where possible, and matched logos are copied or normalized into managed app storage using internal asset IDs, not source file paths.
4. Given a Team logo cannot be matched, when import review is shown, then the missing logo appears as `can_proceed_with_placeholder`, and Start Auction is not blocked solely because a Team logo is missing.
5. Given a Team has no matched logo, when setup review is shown, then the Team is associated with a placeholder-compatible logo state, and the setup review makes clear that Start Auction can proceed without styling the missing logo as a blocking failure.
6. Given a developer finishes this story, when they run the story's Dev Gate, then Team CSV parser tests, required-field validation tests, logo matching tests, asset path-safety tests, and setup UI/component tests pass, and an E2E or acceptance test proves missing required Team data blocks Start Auction while missing logos do not.
7. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks Team import correctness, logo placeholder behavior, file boundary safety, unit tests, and the Team import E2E/acceptance gate, raises findings, and sends blocking issues back for iteration.

## Tasks / Subtasks

- [x] Extend shared contracts for Team import and logo matching. (AC: 1, 2, 3, 4, 5)
  - [x] In `packages/shared/src/index.ts`, add `setupTeamPreviewSchema` (`sourceRowNumber`, `name`, `captain` — nothing else; keep `.strict()`), `teamCsvImportReviewSummarySchema` (mirror the player CSV summary shape: `totalRows`, `importedTeams`, `mustFixCount`, `canProceedWithPlaceholderCount`, `ignoredSourceFieldCount`, `startAuctionBlocked`), and `teamCsvImportReviewResponseSchema` (`teams`, `issueGroups`, `summary`).
  - [x] Add a Team logo match record schema (`team: setupTeamPreviewSchema`, `status`, optional `logoAssetId`) reusing the existing placeholder-status semantics from `photoMatchStatusValues` — either reuse that enum via a shared alias (e.g. `mediaMatchStatusValues`) or add `teamLogoMatchStatusValues` with the same four values (`matched`, `missing_uses_placeholder`, `ambiguous_uses_placeholder`, `undecodable_uses_placeholder`). Enforce with `superRefine` that `logoAssetId` is present exactly when status is `matched` (copy the `playerPhotoMatchRecordSchema` refinement).
  - [x] Add a Team logo review response schema (`teams` match records, `issueGroups`, summary with `totalTeams`, `matchedLogos`, `placeholderLogos`, the three severity counts, `startAuctionBlocked`) with the same `startAuctionBlocked === mustFixCount > 0` refinement as `playerPhotoReviewSummarySchema`.
  - [x] Add new import issue codes to `importIssueCodeValues` without touching existing codes (suggested: `missing_team_name`, `missing_captain_name`, `duplicate_team_name`, `missing_team_logo`, `ambiguous_logo_match`, `unmatched_logo_file`, `logo_not_decodable`, `logo_storage_failed`). Reuse existing generic codes (`missing_required_header`, `parse_error`) for header/parse failures rather than inventing team-specific duplicates.
  - [x] Add an optional `teamName` field to `importIssueSchema` (same shape as `playerName`: trimmed, min 1, optional) so logo/team issues can name the Team without abusing `playerName`.
  - [x] Extend `packages/shared/src/import-contracts.test.ts` (or a focused new file) proving: team preview records contain only name/captain/row, logo records expose only internal asset IDs (never source paths), and both new summaries keep `startAuctionBlocked` driven only by `mustFixCount`.

- [x] Implement the Team CSV parsing adapter in `packages/imports`. (AC: 1, 2)
  - [x] Add failing tests first in `packages/imports/src/team-csv.test.ts` using `teams-valid.csv` / `teams-invalid.csv` content and `packages/test-fixtures` team rows (`sampleTeamCsvRows`, `invalidTeamCsvRows`, `toCsv`) as test-only imports.
  - [x] Create `packages/imports/src/team-csv.ts` following the `player-csv.ts` pattern: `csv-parse/sync` with `bom`, trimmed headers, `skip_empty_lines`, `max_record_size`, a `parseTeamCsvForSetup(csvText)` returning the review, and a staging variant `parseTeamCsvForSetupStaging(csvText)` returning `{ review, teams }` for server staging.
  - [x] Header contract (architecture AD-7 vs fixtures conflict — resolve exactly this way): canonical required headers are `Team Name` and `Captain Name`; the adapter also accepts the aliases `Team` and `Captain` used by the TEA fixture CSVs. Alias handling lives only inside this adapter and its tests (AD-7 wording: "aliases, if supported, belong only inside the import adapter and its tests"). Missing both canonical and alias forms of a header is `must_fix` `missing_required_header`.
  - [x] Row validation: empty Team name → `must_fix` `missing_team_name` naming the row; empty Captain name → `must_fix` `missing_captain_name` naming the row and Team when available (PRD FR-4: "Every Team has a Captain name from the Team CSV"). Rows with issues are excluded from the imported team previews, mirroring the player CSV behavior.
  - [x] Duplicate Team names (case-insensitive, trimmed) → `must_fix` `duplicate_team_name`. Team name is the logo-matching key and the future Team identity; duplicates make matching and rosters ambiguous.
  - [x] Zero valid team rows (headers only, or all rows invalid) → `must_fix` (reuse `missing_required_value` with a clear message, mirroring the player CSV "no rows" behavior) so `startAuctionBlocked` is true for an empty Team CSV.
  - [x] Any extra columns beyond the required two are classified `ignored_source_field` (same pattern as player CSV). Do not surface their values anywhere.
  - [x] Re-export the new public functions from `packages/imports/src/index.ts`.

- [x] Implement the Team logo matching adapter in `packages/imports`. (AC: 3, 4, 5)
  - [x] Add failing tests first in `packages/imports/src/team-logos.test.ts` aligned to `media-manifest.json#teamLogos` (Falcons png matched, Tigers missing → placeholder, Royals webp matched, Warriors jpg matched).
  - [x] Create `packages/imports/src/team-logos.ts` modeled on `player-photos.ts`. Matching input is the staged Team previews plus uploaded file descriptors (filename, detected format, content). There is no metadata column for logos (unlike `Photo Upload`), so matching is filename-based only: (1) normalized filename equals normalized Team name, (2) normalized filename contains the normalized Team name. Normalization: lowercase, strip non-alphanumerics, compare on base filename without extension — reuse/extract the existing `normalizeMatchText`/`stripExtension` helpers from `player-photos.ts` into a small shared module inside `packages/imports` (Story 1.3 explicitly deferred this extraction until 1.4 needed it; it does now — extract, do not copy-paste).
  - [x] Ambiguity rule identical to photos: one file matching multiple Teams or multiple files matching one Team → no guess, `ambiguous_logo_match` (`can_proceed_with_placeholder`, listing candidate filenames for diagnosis), Team stays on placeholder. Guard against empty normalized team names matching everything (Story 1.3 review finding — the fixed pattern is in `findCandidates`).
  - [x] Every imported Team without a matched logo → `missing_team_logo`, `can_proceed_with_placeholder`, calm message naming the Team (match the fixture voice: "Tigers has no matched logo; team placeholder will be used.").
  - [x] Uploaded file matching no Team → `unmatched_logo_file` diagnostic (file not stored). Undecodable content → `logo_not_decodable` telling the operator to convert to JPEG/PNG and reimport. Write failure → `logo_storage_failed` with no filesystem paths in the message.
  - [x] Normalize matched logos with `sharp` exactly like photos (decode-validate, rotate, resize max 512px longest edge `fit: inside` without enlargement, WebP output) written to the provided asset directory as `{assetId}.webp` with `crypto.randomUUID()` IDs. Reuse/extract the `normalizeAndStorePhoto` logic rather than duplicating it; keep issue codes media-specific.
  - [x] Format allowlist identical to photos: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`. HEIC decode failure on prebuilt sharp is the expected placeholder path (`logo_not_decodable`), never a crash.
  - [x] Issue IDs must be deterministic and collision-safe (Story 1.3 review finding: include row number or index, not just a name slug).

- [x] Add server-side Team CSV preview, logo upload, staging, and managed logo asset serving. (AC: 1, 2, 3, 4)
  - [x] Extend `apps/server/src/setup-staging.ts` with team state mirroring the player pattern: `getTeamCsv`/`setTeamCsv`/`clearTeamCsv` and `getTeamLogos`/`setTeamLogos`. Setting a new Team CSV clears prior logo match state (same reasoning as the CSV→photos rule already documented there). Player and Team staging are independent: reimporting the Player CSV must NOT clear Team state, and vice versa. Staging remains explicitly non-durable until Story 1.6.
  - [x] Add `POST /api/setup/team-csv/preview` in `apps/server/src/app.ts` mirroring the player CSV route: `text/csv` content type required (415 otherwise), reuse the existing 256 KB `text/csv` content-type parser and `bodyLimit`, parse via `parseTeamCsvForSetupStaging`, stage on success. Follow the Story 1.3-reviewed staging rule exactly: stage only when `!startAuctionBlocked && importedTeams > 0`; otherwise clear team staging. Clear the team logo asset directory on every reimport (matching `clearPlayerAssetDirectory` usage).
  - [x] Add `POST /api/setup/team-logos` inside the existing multipart-scoped plugin (multipart is already registered for the setup routes plugin — add the route there; do not register multipart a second time or globally). Return `409` `team_csv_required` if no Team CSV is staged. Suggested limits: reuse 10 MB per file; logo file-count cap 50 (teams are few) — if you keep one shared multipart registration, the shared `files`/`parts` limit of 200 is acceptable; assert whichever limit you implement.
  - [x] Upload boundary rejections identical to photos, per `media-manifest.json#securityCases`: unsupported extension/content type → `415`; traversal/path-separator filenames → `400`; oversize → `413`; count overflow → clear `4xx`. Never write a rejected file to disk. Reuse `validatePhotoPart` by generalizing it (rename or parameterize the error copy) instead of copying it.
  - [x] Store normalized logos under `{dataDirectory}/assets/teams/{assetId}.webp`; create the directory at server start next to the players directory. Clear it via a generalized `clearManagedAssetDirectory` on reimport/re-upload (same orphan-cleanup behavior the 1.3 review added for photos).
  - [x] Serve logos read-only with a second `@fastify/static` registration: `root: {dataDirectory}/assets/teams`, `prefix: "/assets/teams/"`, `decorateReply: false`. The existing `onRequest` unsafe-asset hook already covers all `/assets/` URLs including encoded traversal — keep it and assert it applies to `/assets/teams/` requests.
  - [x] Update the shared error handler's fallback messages to be route-aware for the new endpoints (the current handler special-cases photo URLs; team CSV 413s must not return player-CSV copy, and team logo 413s must say logo, not photo).
  - [x] Add Fastify `inject()` tests in `apps/server/src/team-import.test.ts` (or split `team-csv.test.ts` / `team-logos.test.ts`) covering: valid Team CSV preview, invalid Team CSV keeps `startAuctionBlocked` true and clears staging, logos-before-team-CSV `409`, full security-case matrix (415/400 traversal/413 oversize/count limit), logo review response shape, logo asset served by internal ID with image content type, traversal request rejection, and that player staging is untouched by team imports. Use temp data directories and clean them up.

- [x] Upgrade the setup UI with Team CSV and Team logos steps. (AC: 1, 2, 4, 5)
  - [x] In `apps/web/src/main.tsx`, add a Team CSV section after Player photos with stable selectors: `setup-team-csv`, `team-csv-input` (single-file `.csv,text/csv` input), `team-csv-summary` (imported team count, must-fix count), and per-row previews `team-preview-row-{sourceRowNumber}` showing Team name and Captain only. Follow the TEA handoff test-ID names (`setup-team-csv`, `setup-team-logos`).
  - [x] Add a Team logos section with selectors `setup-team-logos`, `team-logos-input` (multi-file, same accept list as photos), `team-logos-summary` (matched count, placeholder count, non-blocking readiness note). Gate it (disabled + short explanation) until a valid Team CSV review with imported Teams exists, matching the server `409`.
  - [x] Reuse the exact Story 1.2/1.3 upload mechanics: a dedicated upload-generation ref per upload control to discard stale responses, `idle/loading/ready/error` states, `role="alert"` errors, schema `safeParse` of responses, previous-review restore on failure, accessible labels, 44px targets, and the existing light setup token styles in `apps/web/src/styles.css`.
  - [x] Merge Team CSV and logo issues into the existing `import-issues-table` groups by extending `mergeIssueGroups` to accept all four reviews (player CSV, photos, team CSV, logos). Missing logos render inside `can_proceed_with_placeholder` styled neutrally — no danger red, no error framing (UX: missing media is never a live-event failure).
  - [x] Update the Start Auction blocker text logic: it must now reflect Player CSV state AND Team CSV state. When the Team CSV has must-fix issues or is absent, the blocker names the Team CSV (e.g. "Blocked: Team CSV must be imported before Start Auction." / "Blocked: N Team CSV issues must be fixed in the source CSV and reimported."). When both CSVs are valid, the remaining-steps copy should now cite auction parameters only (parameters are Story 1.5; Start Auction stays disabled in this story). The blocker must never cite photos or logos.
  - [x] Preserve every existing selector and behavior verbatim: `app-shell`, `phase-indicator`, `setup-empty-state`, `setup-start`, `setup-player-csv`, `player-csv-input`, `player-csv-summary`, `setup-player-photos`, `player-photos-input`, `player-photos-summary`, `import-issues-table`, `import-issue-group-*`, `player-preview-row-*`, `setup-start-auction`, `start-auction-blocker`. The existing event-mode e2e assertions (e.g. exact blocker text "Blocked: 4 Player CSV issues must be fixed in the source CSV and reimported.") must keep passing.
  - [x] `main.tsx` is growing; extracting reusable local components (e.g. an upload section) into `apps/web/src/` files is acceptable — keep all selectors stable if you do.

- [x] Add story-level acceptance and regression coverage. (AC: 6, 7)
  - [x] Unit (team-csv): canonical headers, alias headers, missing header, missing Team name, missing Captain name, duplicate team names, zero-row CSV, ignored extra columns, parse failure — with correct severities and `startAuctionBlocked` behavior (TD-026).
  - [x] Unit (team-logos): exact-name match, name-contained match, no match → `missing_team_logo`, ambiguous file/team → placeholder without guessing, normalization boundaries (spaces/underscores/hyphens/case: `Falcons` matches `falcons.png`, `Falcons Logo.PNG`, `team-falcons (1).jpg` when unambiguous), undecodable content fallback, storage failure classification; logo issues never produce `must_fix` (TD-025).
  - [x] Unit/integration: normalized logo files exist under the managed teams directory with opaque generated IDs; source filenames never appear in stored names or response records.
  - [x] API: `409` before Team CSV; `415` unsupported type; `400` traversal filename; `413` oversize; count limit; logo asset served by internal ID; traversal request path rejected (TD-027, TD-028); player-CSV/photo staging unaffected by team routes.
  - [x] E2E (event mode, extend `apps/web/e2e/event-mode.spec.ts` — its config `testMatch` only picks up that filename; update `playwright.event.config.ts` if adding a new spec file): (a) upload `teams-invalid.csv` → must-fix issues shown, `start-auction-blocker` cites Team CSV, `setup-start-auction` disabled; (b) upload `teams-valid.csv` then a logo set with at least one matched and one missing logo → `can_proceed_with_placeholder` group shows the missing-logo issue, `team-logos-summary` shows matched/placeholder counts, blocker text does not mention logos (TD-025, TD-026). A route-mocked UI spec in `apps/web/e2e/` following `player-csv-import.spec.ts` may cover the Vite-preview config.
  - [x] Regression: all Story 1.1/1.2/1.3 tests pass unchanged — shell smoke, player CSV unit/API/UI/E2E, photo matching/upload/security suites, `/api/health`, static serving, build, typecheck.
  - [x] Run the Dev Gate and record results in the Dev Agent Record before marking tasks complete.

### Review Findings

- [x] [Review][Patch] Logo matcher ignores contains-match ambiguity when an exact match exists [packages/imports/src/team-logos.ts:167]
- [x] [Review][Patch] All-invalid Team CSV rows do not emit the required zero-valid-Teams issue [packages/imports/src/team-csv.ts:90]
- [x] [Review][Patch] Mixed canonical-plus-alias Team CSV columns can drop populated alias data when canonical cell is blank [packages/imports/src/team-csv.ts:263]
- [x] [Review][Patch] Pending Team logo upload can restore stale logo review after Team CSV changes [apps/web/src/main.tsx:308]
- [x] [Review][Patch] Team asset traversal test allows 404, so it does not prove the unsafe asset hook rejects traversal [apps/server/src/team-import.test.ts:282]
- [x] [Review][Patch] Managed asset cleanup fails if the asset directory contains a nested directory [apps/server/src/app.ts:495]

## Dev Notes

### Current Repository State To Preserve

- Stories 1.1–1.3 are done and committed; HEAD is `32f035a` ("Story 1.3: Match Player Photos With Placeholders") and the working tree is clean. Build on committed code.
- `packages/shared/src/index.ts` owns strict Zod contracts and canonical enum arrays: `setupPlayerPreviewSchema`, `importIssueSchema` (with optional `playerName`), `importIssueGroupSchema`, player CSV review schemas, `photoMatchStatusValues`, `playerPhotoMatchRecordSchema` (with matched⇔assetId refinement), and `playerPhotoReviewResponseSchema` (with `startAuctionBlocked === mustFixCount > 0` refinement). Extend these patterns; do not fork parallel contract shapes.
- `packages/imports/src/player-csv.ts` owns Player CSV parsing (`parsePlayerCsvForSetup` / `parsePlayerCsvForSetupStaging` returning `{ review, players }` with adapter-internal `photoUploadValue`). `packages/imports/src/player-photos.ts` owns photo matching + sharp normalization; its private helpers `normalizeMatchText`, `stripExtension`, `uniqueCandidates`, and `normalizeAndStorePhoto` are the extraction candidates for logo reuse.
- `apps/server/src/app.ts` owns the Fastify factory: `text/csv` content-type parser (256 KB), route-aware error handler, `POST /api/setup/player-csv/preview` with the reviewed staging rule (stage only valid non-empty reviews, clear otherwise, clear asset dir on reimport), a multipart-scoped setup plugin containing `POST /api/setup/player-photos` (10 MB/200 files limits, per-part validation via `validatePhotoPart`), an `onRequest` hook rejecting unsafe `/assets/` URLs including encoded traversal, `@fastify/static` for `{dataDirectory}/assets/players` at `/assets/players/`, SPA serving/fallback, and `clearPlayerAssetDirectory` orphan cleanup.
- `apps/server/src/setup-staging.ts` is the non-durable staging seam (player CSV + photo review). Its documented lifecycle rules came out of the 1.3 code review — replicate them for teams.
- `apps/web/src/main.tsx` renders the full setup surface: Player CSV section, Player photos section (gated on valid CSV), merged issue groups via `mergeIssueGroups`, blocker text logic, and the disabled Start Auction button. Current post-CSV blocker copy is "Start Auction stays disabled until Team CSV and auction parameters are added in later setup steps." — this story changes that copy path.
- `vitest.config.ts` aliases `@auction-manager/*` to `src/`, so new source files work in tests without builds. `npm run test:e2e` uses Vite preview (route-mock-friendly); `npm run test:e2e:event` boots the real server on port 4174 with `testMatch: "**/event-mode.spec.ts"`.
- Dependencies already present: `csv-parse`, `sharp` (packages/imports), `@fastify/multipart`, `@fastify/static` (apps/server). Do not add new dependencies.

### Existing Files That This Story Will Touch

Read these before editing and update them in place:

- `packages/shared/src/index.ts`: team preview/review schemas, logo match schemas, new issue codes, optional `teamName` issue field.
- `packages/shared/src/import-contracts.test.ts`: extend privacy/contract tests.
- `packages/imports/src/index.ts`: re-export team CSV and logo matching functions.
- `packages/imports/src/player-photos.ts`: extract shared matching/normalization helpers (behavior-preserving refactor; its tests must still pass).
- `apps/server/src/app.ts`: team CSV route, team logos route inside the existing multipart plugin, teams asset directory + static serving, error-handler copy, generalized part validation/asset cleanup.
- `apps/server/src/setup-staging.ts`: team CSV + logo staging state.
- `apps/web/src/main.tsx` and `apps/web/src/styles.css`: two new setup sections, merged issues, blocker logic.
- `apps/web/e2e/event-mode.spec.ts`: team import acceptance tests.
- `apps/web/e2e/player-csv-import.spec.ts`: only if shared UI behavior assertions need extension; do not break it.

Expected new files:

```text
packages/imports/src/team-csv.ts
packages/imports/src/team-csv.test.ts
packages/imports/src/team-logos.ts
packages/imports/src/team-logos.test.ts
packages/imports/src/media-matching.ts        (suggested name for extracted shared helpers)
apps/server/src/team-import.test.ts           (or team-csv.test.ts + team-logos.test.ts)
apps/web/e2e/team-import.spec.ts              (optional route-mocked spec; event coverage may live in event-mode.spec.ts)
```

### Architecture Guardrails

- `packages/imports` owns Team CSV parsing, logo matching, format validation, normalization, and issue creation (AD-7). Route handlers must not reimplement matching or validation rules.
- **Header contract (AD-7, resolves a real conflict):** the architecture spine names canonical Team CSV headers `Team Name` and `Captain Name`, but every TEA fixture (`teams-valid.csv`, `teams-invalid.csv`, `packages/test-fixtures` `teamCsvHeaders`) uses `Team` and `Captain`. AD-7 explicitly allows aliases "only inside the import adapter and its tests". Accept canonical headers as primary and `Team`/`Captain` as adapter-internal aliases, test both, and expose only normalized `name`/`captain` fields downstream.
- Managed logo storage uses generated internal asset IDs under `{dataDirectory}/assets/teams/` (AD-9, TD-028). The server never serves user-provided filesystem paths; stored filenames never contain source filenames. Multipart stays scoped to the setup routes plugin; CORS stays disabled; binding stays `127.0.0.1`.
- `packages/domain` and `packages/persistence` are not part of this story. No SQLite tables, action log, or snapshots. The in-memory setup staging remains the documented temporary seam that Story 1.6 replaces.
- Privacy by projection (AD-8): the Team CSV has only two auction-relevant columns, but the adapter must still ignore-and-classify any extra columns and never render their values. Logo/team issues may name Teams and uploaded filenames for setup diagnosis only.
- Severity rules: missing/ambiguous/undecodable logos are never `must_fix`. Missing Team name, missing Captain name, missing headers, duplicate team names, parse failures, and zero-team CSVs are `must_fix`. `summary.startAuctionBlocked` stays `mustFixCount > 0` per review — the UI combines reviews for the overall blocker.
- Entity naming (Consistency Conventions): `Team`, `Captain` (person bidding for the Team), `AssetFile`; commands and DTOs come later — do not invent `TeamDto`s beyond the setup preview schema.
- No cloud services, hosted storage, accounts, Docker runtime, or new native dependencies.

### Team CSV Contract

| Input situation | Outcome |
| --- | --- |
| Headers `Team Name,Captain Name` (canonical) or `Team,Captain` (fixture alias) | Accepted; parsed |
| A required header missing in both canonical and alias form | `must_fix` `missing_required_header` |
| Row with empty Team name | `must_fix` `missing_team_name`, row excluded from previews |
| Row with empty Captain name | `must_fix` `missing_captain_name`, row excluded from previews |
| Two rows with the same Team name (case-insensitive, trimmed) | `must_fix` `duplicate_team_name` |
| Headers present but zero valid team rows | `must_fix`, `startAuctionBlocked` true |
| Extra columns present | `ignored_source_field` per column, values never displayed |
| Unparseable CSV | `must_fix` `parse_error` |

Fixture expectations: `teams-valid.csv` yields 4 Teams (Falcons/Priya Captain, Tigers/Rahul Captain, Royals/Anita Captain, Warriors/Joel Captain) with zero must-fix issues; `teams-invalid.csv` yields 2 must-fix issues (missing Team name row, missing Captain row) and blocks Start Auction (TD-026).

### Team Logo Matching Contract

| Input situation | Outcome |
| --- | --- |
| Uploaded filename equals normalized Team name | Matched; normalize and store with generated asset ID |
| Uploaded filename contains normalized Team name (unique) | Matched; normalize and store |
| One file matches multiple Teams, or multiple files match one Team | `ambiguous_logo_match`, `can_proceed_with_placeholder`, Team keeps placeholder, candidates listed |
| Team has no matching file (or no logos uploaded yet) | `missing_team_logo`, `can_proceed_with_placeholder` |
| Uploaded file matches no Team | `unmatched_logo_file` diagnostic; file not stored |
| Supported extension but undecodable content (HEIC on prebuilt sharp, corrupt file) | `logo_not_decodable`, `can_proceed_with_placeholder` |
| Unsupported extension/content type at upload | HTTP `415`; nothing written |
| Traversal filename | HTTP `400`; nothing written |
| Oversize file | HTTP `413` |
| Logos uploaded before Team CSV staged | HTTP `409` `team_csv_required` |

There is no logo-filename metadata column (unlike `Photo Upload` for players), so matching is filename↔team-name only. Normalization: lowercase, strip all non-alphanumerics, compare base filename without extension.

### UX Requirements For This Story

- Setup stays light, dense, checklist-like. The Team CSV step reads as the third checklist item (after Player CSV and Player photos), Team logos as the fourth. Gate logos visibly until a valid Team CSV exists.
- Missing logos are neutral, never danger red (DESIGN.md: use clear placeholders for missing photos/logos; treating missing media as a failure is the explicit "don't"). Microcopy voice from EXPERIENCE.md: calm, specific, operational — e.g. "Tigers has no matched logo; team placeholder will be used." and "Start Auction is not blocked by missing logos."
- The operator must see: team count imported, captains listed per team, must-fix issues grouped in the existing import issues table, matched/placeholder logo counts, and blocker text that names the Team CSV when team data blocks Start Auction.
- Real file inputs with accessible names, visible focus, text-based issue reasons, 44px minimum targets. Layout must stay stable (no blocker jumping out of view) at 1440x900, 1366x768, 1920x1080, and 390x844.
- Privacy floor: Team name, Captain name, and logo/placeholder are visible fields; nothing else from source files appears on any surface.

### Latest Tech Information

Carried forward from Story 1.3, verified 2026-07-07 IST (stack unchanged since):

- **sharp 0.35.x cannot decode HEIC with prebuilt binaries** (patent-encumbered HEVC; requires custom global libvips). `.heic` logo uploads therefore hit the `logo_not_decodable` placeholder path on stock machines. This is expected behavior, not a bug. Do not add libheif builds or conversion tooling.
- Prebuilt sharp decodes JPEG, PNG, WebP, AVIF, TIFF, GIF, SVG — covering the allowlist minus HEIC. SVG stays rejected at the upload boundary per `media-manifest.json#securityCases` (`script.svg` → 415).
- **@fastify/multipart v9** is already registered in the setup plugin with explicit `limits` (default `fileSize` of 1 MB was overridden to 10 MB in 1.3). Adding the logos route inside the same plugin inherits that registration; registering multipart twice on the same scope will fail.
- `@fastify/static` supports multiple registrations with distinct `root`/`prefix` (the app already uses two); it rejects traversal outside `root` by default, and the app-level `onRequest` hook additionally rejects encoded traversal for all `/assets/` URLs — keep both and assert behavior in tests.

### Testing Requirements

Dev Gate commands for this story:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:e2e:event
```

Required tests (mapping to TEA cases TD-025, TD-026, TD-027, TD-028):

- Unit: Team CSV header/alias/required-field/duplicate/zero-row boundaries with correct severities (TD-026).
- Unit: logo matching happy paths, ambiguity, normalization boundaries, missing-logo classification; logo issues never `must_fix` (TD-025).
- Unit/integration: normalized logo assets under the managed teams directory with opaque IDs; JPEG/PNG/WebP normalize; HEIC falls back to `logo_not_decodable`.
- API: `409` before Team CSV; `415`/`400`/`413`/count-limit security matrix; logo review response shape; asset served by internal ID; traversal rejected; team routes leave player staging untouched (TD-027, TD-028).
- UI/E2E: invalid Team CSV blocks Start Auction with Team-CSV blocker text; valid Team CSV + partial logos shows placeholder issues and non-blocking summary; blocker never mentions logos; all prior-story flows regress clean.

Review/Test Gate (AC 7): a second agent must check Team import correctness (headers, aliases, required fields, duplicates), logo placeholder behavior and severity mapping, file boundary safety (traversal, allowlist, size/count limits, no source filenames in storage), the helper extraction not changing photo behavior, staging independence between player and team state, and run the Team import E2E gate. Blocking findings reopen the story.

### Previous Story Intelligence

- Story 1.3 established the exact pipeline this story mirrors: strict shared contracts → pure imports adapter with tests-first → scoped multipart route + staging + managed assets → gated UI section → event-mode E2E. Copy the structure, not the code — extract shared helpers where the tasks say so.
- Story 1.3's code review produced fixes this story must not regress or reintroduce: metadata-first matching false ambiguity, empty normalized names matching everything, stale staging kept after a must-fix reimport, empty multipart uploads wiping prior matches, orphan asset files on reimport (cleanup added), `application/octet-stream` content-type tolerance in part validation, matched-status⇔assetId schema refinement, encoded-URL traversal rejection, and deterministic collision-safe issue IDs. Each has a direct analog in the team/logo pipeline.
- Known deferred items that remain deferred (see `deferred-work.md`): concurrent upload interleaving (single-operator assumption), full in-memory buffering within limits, viewport layout regression tests, unused `getPlayerPhotos()` accessor (reserved for 1.6). Do not fix them here; keep the same assumptions for logos.
- The 1.3 error-handler lesson: shared error paths must be route-aware or messages leak across features (photo 413 vs CSV 413). The team routes add two more URL prefixes to that logic.
- Story 1.2's upload-generation ref pattern prevents response races in the UI; each of the two new upload controls needs its own ref.

### Git Intelligence Summary

- Commits: `32f035a Story 1.3: Match Player Photos With Placeholders`, `0a723dd Story 1.2: Import and Review Player CSV`, `22a61dd Local Auction Manager App Shell`, `1c76815 Docs done. Implementation Ready.`, `d10dc34 Initial commit`.
- Working tree is clean at story-creation time. Recent commits show the per-story slice pattern (contracts → adapter → server → UI → e2e in one commit per story). No destructive git commands.

### Persistence Ownership

No SQLite persistence is introduced by this story.

- This story owns: managed logo asset files under `{dataDirectory}/assets/teams/` with generated asset IDs, in-memory setup staging for the Team CSV review and logo match state, the Team CSV preview and logo review API responses, and logo asset serving by internal ID.
- It does not own: `teams` tables, action log, snapshots, migrations, or resume. Staged team state is lost on server restart by design until Story 1.6 persists Start Auction state.
- If the implementation persists anything durable anyway, it must add a concrete Persistence Ownership note naming tables/fields and include temporary SQLite transaction/resume tests in the same slice.

### Scope Boundaries

In scope:

- Team CSV upload/preview with canonical + alias header handling, required-field and duplicate validation, and must-fix blocking.
- Filename-based Team logo matching with explicit ambiguity handling and placeholder classification.
- Sharp normalization into `{dataDirectory}/assets/teams/` with internal asset IDs; HEIC placeholder fallback.
- Logo upload security boundary (allowlist, traversal, size, count) and read-only asset serving with path-safety tests.
- Setup UI Team CSV + Team logos sections, merged issue display, updated blocker text.
- Extraction of shared media-matching/normalization helpers inside `packages/imports` (photos tests must stay green).
- Unit, API, UI, and E2E coverage proving missing team data blocks Start Auction while missing logos do not.

Out of scope:

- Auction parameters (Story 1.5) and the Start Auction command/durable persistence (Story 1.6) — Start Auction stays disabled.
- Live board Team tiles, capacity indicators, and roster surfaces (Epic 2); this story stops at setup review plus asset serving.
- Team data editing inside the app — fixes happen in the source Team CSV and reimport (PRD FR-4).
- Manual logo match-fixing UI; fixes happen by renaming source files and re-uploading.
- Per-team budget entry (that is parameter setup in 1.5, not Team CSV data).
- SQLite, snapshots, action log, resume, accounts, cloud services, new native dependencies.

### Project Structure Notes

- Extend existing workspace packages in place; no new packages, apps, or top-level frameworks.
- Keep source under `src/`; never edit `dist/` output. The `data/` directory is runtime state, already gitignored — normalized logo assets must never be committed.
- Shared helper extraction stays inside `packages/imports` (e.g. `src/media-matching.ts`); do not promote it to a new package or into `packages/shared` (shared is for contracts/DTOs, not IO logic).
- Playwright event config `testMatch` is `**/event-mode.spec.ts` only — extend that spec or update `testMatch` when adding a new event spec file.

### References

- `_bmad-output/planning-artifacts/epics.md` sections `Additional Requirements`, `UX Design Requirements`, `Epic 1`, and `Story 1.4`.
- `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md` sections `FR-4: Load team CSV and logos`, `Privacy And Data Minimization`, and `Assumptions` (FR-4 placeholder assumption).
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md` sections `AD-7`, `AD-8`, `AD-9`, `AD-11`, `Consistency Conventions` (Import headers row), `Stack`, and `Structural Seed` (`data/assets/teams/`).
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md` sections `Information Architecture`, `Voice`, `Component Patterns` (Import review table, Team tile grid), `State Patterns` (Team logo missing), and `Privacy And Data Visibility`.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` sections `Components` and `Do's and Don'ts`.
- `_bmad-output/test-artifacts/test-design/auction_manager-handoff.md` sections `Quality Gates`, `Story-Level Integration Guidance`, and `Data-TestId Requirements` (`setup-team-csv`, `setup-team-logos`).
- `_bmad-output/test-artifacts/finalized-test-cases.md` cases `TD-025`, `TD-026`, `TD-027`, `TD-028`, `TD-035`.
- `_bmad-output/test-artifacts/sample-test-data/teams-valid.csv`, `teams-invalid.csv`, `media-manifest.json` (`#teamLogos`, `#securityCases`, `#assetCases`), `sample-data-map.json`.
- `packages/test-fixtures/src/index.ts` (`teamCsvHeaders`, `sampleTeamCsvRows`, `invalidTeamCsvRows`, `sampleTeams`, `toCsv`).
- `_bmad-output/implementation-artifacts/1-3-match-player-photos-with-placeholders.md` (patterns, review findings) and `_bmad-output/implementation-artifacts/deferred-work.md`.
- `https://sharp.pixelplumbing.com/install/#prebuilt-binaries`
- `https://github.com/fastify/fastify-multipart`

## Dev Agent Record

### Agent Model Used

### Debug Log References

- 2026-07-07: Ran `npm test -- packages/shared/src/import-contracts.test.ts` (pass: 9 tests) after adding Team import/logo shared contracts.
- 2026-07-07: Ran `npm test -- packages/imports/src/team-csv.test.ts` after a red run for missing exports (pass: 9 tests).
- 2026-07-07: Ran `npm test -- packages/imports/src/team-csv.test.ts packages/imports/src/team-logos.test.ts packages/imports/src/player-photos.test.ts` after Team logo adapter and media helper extraction (pass: 25 tests).
- 2026-07-07: Ran `npm test -- apps/server/src/team-import.test.ts` after a red run for missing Team routes (pass: 8 tests).
- 2026-07-07: Ran `npm test -- apps/server/src/player-csv-preview.test.ts apps/server/src/player-photos.test.ts` (pass: 16 tests) to verify player server regressions.
- 2026-07-07: Ran `npm run typecheck` after setup UI wiring (pass).
- 2026-07-07: Ran `npm run test:e2e:event` with Team CSV/logo acceptance coverage (pass: 6 tests).
- 2026-07-07: Ran `npm run test:e2e` for Vite-preview UI regressions (pass: 4 tests).
- 2026-07-07: Read IDE lints for touched shared/imports/server/web files (no linter errors).
- 2026-07-07: Ran full `npm test` (pass: 15 files, 76 tests).
- 2026-07-07: Ran full `npm run build` (pass: server, web, domain, imports, persistence, shared, test-fixtures).
- 2026-07-07: Reran complete Dev Gate after final story/sprint status updates: `npm run typecheck && npm test && npm run build && npm run test:e2e && npm run test:e2e:event` (pass: 76 Vitest tests, 4 Vite-preview E2E tests, 6 event-mode E2E tests).
- 2026-07-07: Ran post-review focused gate `npm test -- packages/imports/src/team-csv.test.ts packages/imports/src/team-logos.test.ts apps/server/src/team-import.test.ts` after patching review findings (pass: 27 tests).
- 2026-07-07: Ran post-review `npm run typecheck` (pass).
- 2026-07-07: Ran post-review full `npm test` (pass: 15 files, 79 tests).
- 2026-07-07: Reran post-review `npm run test:e2e:event` after updating Team CSV issue-count expectation (pass: 6 tests).

### Completion Notes List

- Story context created on 2026-07-07 from epics, PRD, architecture spine, UX docs, TEA test artifacts, current committed code at `32f035a`, Story 1.3 learnings and review findings, and git history.
- Added strict shared Team preview, Team CSV review, Team logo match/review schemas, Team issue codes, `teamName` issue projection, and contract tests for privacy-safe internal asset IDs and blocker semantics.
- Added Team CSV parsing/staging adapter with canonical plus fixture alias headers, required Team/Captain validation, duplicate detection, ignored-column projection, and focused tests.
- Added Team logo matching adapter and extracted shared media normalization helpers so player photos and Team logos use the same 512px WebP managed-asset pipeline.
- Added Team CSV preview and Team logo upload API routes with non-durable staging, managed `/assets/teams/` serving, route-specific error copy, security validation, and Fastify inject coverage.
- Added Team CSV and Team logos setup UI sections, merged all import issue groups, updated Start Auction blocker logic, and extended event-mode E2E acceptance coverage.
- Completed Story 1.4 Dev Gate: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`, and `npm run test:e2e:event` all passed.
- Resolved code review findings for exact-plus-contained logo ambiguity, all-invalid Team CSV zero-valid issue reporting, mixed canonical/alias cell fallback, stale pending logo upload invalidation, encoded traversal assertion, and recursive managed asset cleanup.

### File List

- _bmad-output/implementation-artifacts/1-4-import-teams-and-logos.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- packages/shared/src/index.ts
- packages/shared/src/import-contracts.test.ts
- packages/imports/src/index.ts
- packages/imports/src/media-matching.ts
- packages/imports/src/player-photos.ts
- packages/imports/src/team-csv.ts
- packages/imports/src/team-csv.test.ts
- packages/imports/src/team-logos.ts
- packages/imports/src/team-logos.test.ts
- apps/server/src/app.ts
- apps/server/src/setup-staging.ts
- apps/server/src/team-import.test.ts
- apps/web/src/main.tsx
- apps/web/src/styles.css
- apps/web/e2e/event-mode.spec.ts

### Change Log

- 2026-07-07: Created Story 1.4 context file and marked ready-for-dev.
- 2026-07-07: Added Team import/logo shared contracts and contract tests.
- 2026-07-07: Added Team CSV and Team logo import adapters with tests and shared media helper extraction.
- 2026-07-07: Added Team import server routes, staging, managed asset serving, and API/security tests.
- 2026-07-07: Added Team setup UI sections and event-mode acceptance tests.
- 2026-07-07: Completed Story 1.4 Dev Gate and marked all implementation tasks complete.
- 2026-07-07: Applied code review fixes, reran focused/unit/typecheck/event E2E verification, and marked Story 1.4 done.
