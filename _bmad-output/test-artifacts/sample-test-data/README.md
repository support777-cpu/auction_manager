# Sample Test Data

This folder contains deterministic fixture data for the finalized TEA test cases in `../finalized-test-cases.md`.

Use the CSV files for setup/import stories, the JSON state fixtures for domain/persistence/API/UI state seeding, and `packages/test-fixtures/src/index.ts` for typed builders inside Vitest or Playwright tests.

## Files

| File | Purpose |
| --- | --- |
| `players-valid.csv` | Complete player import data with all phase 1 categories and private source fields present for privacy tests. |
| `players-invalid.csv` | Missing required fields, unmappable role, and missing base-price scenarios. |
| `teams-valid.csv` | Four Teams with Captains. Tigers intentionally relies on a placeholder logo through `media-manifest.json`. |
| `teams-invalid.csv` | Missing Team and missing Captain blockers. |
| `media-manifest.json` | Player photo and Team logo matching cases, missing placeholder cases, unsupported file, ambiguous file, traversal attempt. |
| `auction-states.json` | Setup, live sale, invalid sale, undo, unsold, manual assignment, privacy, and runtime state fixtures. |
| `sample-data-map.json` | Mapping from each `TD-*` test case to the fixture files/data sets it should use. |

## Privacy Rule

The player CSV intentionally includes email, mobile, payment, timestamp, and source metadata fields. Live board DTOs, roster DTOs, UI, logs, and snapshots must never contain the private field names or values listed in `auction-states.json#privacyDenyList`.
