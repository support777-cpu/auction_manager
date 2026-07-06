---
baseline_commit: 1c76815d83a5b10bff47d76bfee0ab7b6f6f11c5
---

# Story 1.1: Open Local Auction Manager App Shell

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As an auction operator,
I want to open Auction Manager locally on the event PC,
so that setup can begin from a reliable single-machine app.

## Acceptance Criteria

1. Given the project is checked out on the event PC, when the app is installed and started in development mode, then the operator can open a local Auction Manager web surface, and the app shows a setup-ready empty state, not a marketing page.
2. Given the app is started in event mode, when the server boots, then one local Fastify process serves the built React app, `/api/health`, and static app assets from `127.0.0.1` by default, and no cloud service, hosted database, Docker runtime, account system, or public deployment is required.
3. Given the architecture spine defines package boundaries, when the workspace is scaffolded, then it contains `apps/web`, `apps/server`, `packages/domain`, `packages/persistence`, `packages/imports`, `packages/shared`, and `packages/test-fixtures`, and shared types/schemas can be imported without circular ownership between app layers.
4. Given a developer finishes this story, when they run the story's Dev Gate, then the workspace exposes standard local verification scripts for build, typecheck, unit tests, integration tests, and Playwright smoke coverage, and the Story 1.1 Dev Gate runs the applicable commands successfully, including opening the local app in development mode and event mode.
5. Given the dev agent marks the story complete, when a second agent reviews it, then the reviewer checks architecture boundaries, runs or adds relevant unit tests, runs the app-opening E2E smoke test, raises findings, and sends blocking issues back for iteration.

## Tasks / Subtasks

- [x] Update the web app shell to a setup-ready empty state. (AC: 1)
  - [x] Replace the current dark heading-only shell in `apps/web/src/main.tsx` with a real first screen for `Setup`, not a landing page or marketing hero.
  - [x] Include the app name, current phase/status, no-state/start-setup affordance, and clear local-only/resume-ready framing without implementing CSV imports, auction parameters, bidding, or persistence.
  - [x] Apply the UX token intent from `DESIGN.md`: setup surfaces are light, dense, operational, and restrained; do not use live-board styling for setup.
  - [x] Add stable selectors for shell smoke coverage, at minimum `app-shell`, `phase-indicator`, `setup-empty-state`, and `setup-start`.
  - [x] Preserve accessibility basics: landmark `main`, visible focus styles, real buttons/links, accessible names, and text that fits at 1440x900, 1366x768, 1920x1080, and 390x844.

- [x] Make event mode serve the built app and health endpoint from one Fastify process. (AC: 2)
  - [x] Refactor `apps/server/src/main.ts` so server construction can be imported and tested without immediately binding a port. A typical shape is `src/app.ts` exporting a server factory and `src/main.ts` only reading env and calling `listen`.
  - [x] Add `GET /api/health` returning a compact JSON health payload. Keep or remove the existing `/health` route deliberately; the required route is `/api/health`.
  - [x] Serve the built React app and static assets from `apps/web/dist` in event mode using the existing `@fastify/static` dependency.
  - [x] Bind to `127.0.0.1` by default, with narrow `HOST` and `PORT` env overrides only for local operation. Do not enable broad CORS.
  - [x] Add a root or server script for event mode, for example `npm run start:event`, that builds/serves the production web app through Fastify without Vite preview.

- [x] Confirm monorepo boundaries and package contracts. (AC: 3)
  - [x] Keep the architecture-defined workspace paths: `apps/web`, `apps/server`, `packages/domain`, `packages/persistence`, `packages/imports`, `packages/shared`, and `packages/test-fixtures`.
  - [x] Do not import an unrelated starter template or replace the existing workspace wholesale.
  - [x] Keep shared DTO/schema contracts in `packages/shared`; keep auction-rule ownership in `packages/domain`; keep test-only factories and sample data in `packages/test-fixtures`.
  - [x] Do not use `packages/test-fixtures` as an application runtime dependency.
  - [x] If adding app-shell shared types, ensure dependency direction remains app -> shared/domain/imports/persistence as allowed, never package -> app.

- [x] Add scaffold-level verification coverage. (AC: 4, 5)
  - [x] Update Vitest server tests to exercise the real server factory with `inject()` and verify `GET /api/health`.
  - [x] Keep dependency smoke tests that prove Fastify, React/Lucide, Zod, csv-parse/Sharp, and better-sqlite3 load under the workspace.
  - [x] Update Playwright smoke to assert the setup-ready empty state and stable test IDs, not only the heading.
  - [x] Add event-mode smoke coverage that proves the built React app is served by Fastify and `/api/health` responds from the same local process.
  - [x] Ensure scripts cover build, typecheck, unit/integration tests, and E2E smoke. If unit/integration are both Vitest for now, document that split in scripts or README.

- [x] Update developer-facing documentation. (AC: 1, 2, 4)
  - [x] Expand `README.md` with local prerequisites, install command, development command, event-mode command, verification commands, and expected local URLs.
  - [x] State that v1 runs locally from one PC and does not require cloud services, Docker runtime, accounts, login, public hosting, API keys, or internet during the event.
  - [x] Include troubleshooting notes for local port conflicts without suggesting public exposure.

### Review Findings

- [x] [Review][Dismissed] Define the temporary Start setup behavior — user chose to leave the Story 1.1 start-setup affordance as-is.
- [ ] [Review][Patch] Restrict HOST override to loopback/local addresses [apps/server/src/main.ts:3]
- [ ] [Review][Patch] Validate PORT as a whole numeric string [apps/server/src/main.ts:14]
- [ ] [Review][Patch] Limit SPA fallback to GET/HEAD app routes and preserve API/asset 404s [apps/server/src/app.ts:37]
- [ ] [Review][Patch] Verify the built app entry and referenced assets are readable before event startup [apps/server/src/app.ts:51]
- [ ] [Review][Patch] Replace the gold focus outline with an allowed setup-focus color [apps/web/src/styles.css:26]
- [ ] [Review][Patch] Move `test:e2e:event` out of the Story 1.1 Dev Gate list and document it as additional event-mode smoke [README.md:60]
- [ ] [Review][Patch] Close Fastify instances and remove temp web-dist fixtures even when server tests fail [apps/server/src/app.test.ts:8]
- [ ] [Review][Patch] Assert required workspace paths are directories from a stable repo root [packages/shared/src/workspace-boundaries.test.ts:31]

## Dev Notes

### Current Repository State To Preserve

- The repo already has an uncommitted scaffold even though sprint tracking still marked Story 1.1 as backlog before this story was created.
- Existing workspace files include `package.json`, `package-lock.json`, `tsconfig.base.json`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `apps/web`, `apps/server`, and all required `packages/*` folders.
- `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e` passed during story creation. The first sandboxed E2E attempt failed because binding `127.0.0.1:4173` required local-server permission; the approved rerun passed.
- The only git commit is `d10dc34 Initial commit`, containing only `README.md`. Treat the current scaffold as local working-tree state, not as committed history. Do not delete it to recreate from a starter.
- There is no previous Epic 1 story file. No previous-story implementation learnings apply.

### Existing Files That This Story Will Touch

Read these before editing and update them in place:

- `apps/web/src/main.tsx`: currently renders only a dark `Auction Manager` heading. Replace with setup-ready app shell.
- `apps/web/src/styles.css`: currently imports Tailwind and sets global dark color scheme. Setup shell should use the product's light setup treatment; do not force the whole app dark.
- `apps/web/e2e/smoke.spec.ts`: currently checks only the heading. Update to app-shell/setup-ready assertions.
- `apps/web/vite.config.ts`: already uses React and `@tailwindcss/vite`, binds dev to `127.0.0.1:5173`, and preview to `127.0.0.1:4173`.
- `apps/server/src/main.ts`: currently creates and listens immediately, exposes `/health`, and does not serve the built React app. Split construction from listen and add `/api/health`.
- `apps/server/src/dependencies.test.ts`: currently tests a temporary Fastify instance rather than the real server route. Update or add tests against the real app factory.
- `package.json`: currently has `dev`, `dev:web`, `dev:server`, `build`, `typecheck`, `test`, and Playwright scripts. Add/adjust scripts so development and event mode are clear.
- `playwright.config.ts`: currently uses Vite preview for smoke testing. Keep this if useful, but add event-mode smoke or a separate config/script if needed.
- `README.md`: currently only contains `# auction_manager`; expand it.

Existing package entrypoints are placeholders except `packages/test-fixtures/src/index.ts`, which contains rich test data/types. Do not migrate all fixture contracts in this story unless needed to keep runtime boundaries clean.

### Architecture Guardrails

- v1 is a local modular monolith. Event mode is one Node/Fastify process serving React static assets and `/api/health` in this story, with broader `/api/*`, normalized assets, local SQLite, and snapshots added by later stories. No Story 1.1 work may require cloud infrastructure, hosted databases, Docker runtime, separate services at event time, public deployment, accounts, login, RBAC, OAuth, JWT, or API keys.
- Required package boundaries:
  - `apps/web`: React operator and mirrored board UI.
  - `apps/server`: Fastify startup, routes, static serving, upload handling later.
  - `packages/shared`: DTOs, API schemas, constants shared across apps.
  - `packages/domain`: auction commands, phases, rules, reducers, undo semantics.
  - `packages/persistence`: SQLite repositories, transactions, snapshots later.
  - `packages/imports`: CSV and asset adapters later.
  - `packages/test-fixtures`: sample data and test factories only.
- `packages/domain` is the only future owner of auction truth: phase transitions, sale validity, bid increments, capacity, randomization, unsold/manual assignment, undo, reset, and close rules. Story 1.1 should not implement these rules in React or Fastify.
- Server/domain state becomes authoritative after setup begins. Story 1.1 may show an empty setup shell, but must not create client-local auction truth that later stories must unwind.
- Same-origin HTTP is the API pattern. Reads use `GET /api/state` later; mutating commands use intent-named `POST` routes later. Story 1.1 only needs `/api/health`.
- Board, roster, and live DTOs must be privacy allowlisted later. The shell should not introduce source registration fields, sample private data, or placeholders that normalize showing email/mobile/payment data.

Sources:

- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md` sections `AD-1` through `AD-4`, `AD-8` through `AD-12`, `Consistency Conventions`, `Stack`, and `Structural Seed`.
- `_bmad-output/planning-artifacts/epics.md` sections `Additional Requirements`, `UX Design Requirements`, `Epic 1`, and `Story 1.1`.
- `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md` sections `Vision`, `Non-Goals`, `MVP Scope`, and `Cross-Cutting Requirements`.

### UX Requirements For This Story

- This is a usable app shell, not a landing page. Do not create a hero, marketing copy, decorative scene, or onboarding brochure.
- The first screen should communicate local setup readiness: no current auction state, setup can begin, and the app is running locally.
- Use setup styling: light background, dense operational layout, clear readiness/status areas. Do not use the dark live-board surface as the main shell for setup.
- Use the product's restrained palette and typography intent from `DESIGN.md`: field green for safe primary action, sky/info for non-blocking notices, red only for blocked/danger states, and no gold unless showing the live bid moment in later stories.
- Preserve room/operator accessibility basics now: visible focus, semantic headings, clear button labels, WCAG 2.2 AA target, minimal motion, and 44px minimum live-control target where applicable.
- The phase indicator should include `Setup` now and reserve the full phase sequence for later: `Setup`, `Initial Auction`, `Unsold Bidding`, `Manual Assignment`, `Closed`.

Sources:

- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md` sections `Foundation`, `Information Architecture`, `State Patterns`, `Accessibility Floor`, and `Responsive & Platform`.
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md` sections `Brand & Style`, `Colors`, `Typography`, `Layout & Spacing`, `Components`, and `Do's and Don'ts`.

### File Structure Requirements

Expected structure after this story remains:

```text
auction_manager/
  apps/
    web/
    server/
  packages/
    domain/
    persistence/
    imports/
    shared/
    test-fixtures/
```

Do not add new top-level app frameworks, nested monorepos, public cloud configs, Docker runtime requirements, or alternate package managers. npm workspaces are already the selected workspace mechanism.

### Library And Framework Requirements

Use the versions already resolved in `package-lock.json` unless there is a concrete compatibility bug:

| Tool | Locked version observed | Requirement |
| --- | ---: | --- |
| Node.js | local `v24.18.0` | Keep engine `>=24 <25`; Node 24 is LTS. |
| npm | local `11.16.0` | Keep npm workspaces; use `npm ci`/`npm install` workflow. |
| TypeScript | `6.0.3` | Keep `strict`, project references, and no unchecked indexed access. |
| React | `19.2.7` | Use React 19 client rendering already present. |
| Vite | `8.1.3` | Use Vite for development/build, not as the event-mode server. |
| Fastify | `5.9.0` | Use one local Fastify process for event mode. |
| Zod | `4.4.3` | Use for schemas when contracts are needed; no ad hoc validation for API contracts. |
| Tailwind CSS | `4.3.2` | Continue `@tailwindcss/vite` integration and `@import "tailwindcss"`. |
| Lucide React | `1.23.0` | Use Lucide icons only where they clarify controls; do not force icons into the shell. |
| Vitest | `4.1.9` | Use for unit/integration smoke. |
| Playwright | `1.61.1` | Use for app-opening smoke. |

Latest web check on 2026-07-06:

- Node official releases list `v24.18.0` as Latest LTS and v24 as LTS. Source: `https://nodejs.org/en/about/previous-releases`.
- React docs list latest major/minor as 19.2 and release `v19.2.7` in June 2026. Source: `https://react.dev/versions`.
- Fastify docs latest are `v5.9.x`. Source: `https://fastify.dev/docs/latest/`.
- Vite docs are v8 and require modern Node versions; the current project lockfile has `8.1.3`. Source: `https://vite.dev/guide/`.
- Tailwind's current Vite installation path uses `tailwindcss` plus `@tailwindcss/vite`, matching this project. Source: `https://tailwindcss.com/docs/installation/using-vite`.
- Zod 4 is stable, requires TypeScript strict mode, and fits this project's `strict` config. Source: `https://zod.dev/`.
- Vitest docs show v4.1.9 and require Vite >= 6 and Node >= 20, both satisfied. Source: `https://vitest.dev/guide/`.
- Playwright release notes show v1.61 and new trace/video options; this story only needs basic smoke. Source: `https://playwright.dev/docs/release-notes`.

### Testing Requirements

Dev Gate commands for this story:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Add or document an event-mode smoke command if `npm run test:e2e` continues to use Vite preview. Story 1.1 is not complete until one smoke path verifies the built React app and `/api/health` from Fastify event mode.

Required tests:

- Server Vitest: real server factory responds to `GET /api/health` with 200 and a compact health payload.
- Server Vitest or integration: built static app route serves `index.html` or the shell route from Fastify without requiring Vite preview.
- Web/Playwright: local web surface opens and shows setup-ready empty state, not only a heading.
- Workspace boundary smoke: existing dependency tests continue to pass.
- Script smoke: build, typecheck, unit/integration, and E2E scripts are runnable from the root.

Review/Test Gate:

- A second agent must inspect architecture boundaries and verify no auction business rules, persistence schema, import behavior, auth, cloud service, or public deployment dependency was introduced in this scaffold story.
- Reviewer reruns or audits the Dev Gate commands and event-mode smoke.
- Blocking findings must be fixed before the story can move to `done`.

Sources:

- `_bmad-output/test-artifacts/test-design/auction_manager-handoff.md` sections `Quality Gates`, `Story-Level Integration Guidance`, and `Data-TestId Requirements`.
- `_bmad-output/test-artifacts/automation-summary.md` sections `Preflight`, `Validation Checklist`, and `Open Risks`.
- `_bmad-output/implementation-artifacts/release-gate-evidence-checklist-2026-07-06.md` section `Required Evidence`.

### Persistence Ownership

No persistence schema is owned by Story 1.1.

- Do not create SQLite current-state tables, action-log schema, snapshots, auction state reconstruction, or data migrations in this story.
- It is acceptable to keep persistence dependency smoke proving `better-sqlite3` can open an in-memory database.
- Startup checks for data directory writability and database open status are required by the architecture for final event mode, but concrete persistence ownership begins in later setup/start/persistence stories unless a minimal local health check is needed here.

### Scope Boundaries

In scope:

- Local React shell.
- Local Fastify event-mode shell server.
- Workspace/package boundary readiness.
- `/api/health`.
- Static serving of the built app.
- Root scripts and README.
- Scaffold smoke tests.

Out of scope:

- Player CSV import.
- Photo/logo upload or matching.
- Auction parameter editing beyond placeholder shell affordance.
- Start Auction command.
- Domain auction rules.
- SQLite schema and snapshots.
- `GET /api/state` or mutating `/api/auction/*` commands.
- Undo, reset, close, bidding, team tiles, rosters, unsold bidding, manual assignment.
- Accounts/auth/public hosting/Docker runtime.

### Implementation Hints

- Avoid importing `apps/server/src/main.ts` in tests if it calls `listen` at module top level. Split server creation first.
- Keep event-mode static root deterministic. Resolve it relative to the server package or project root so `npm run build` followed by event start works from the repo root.
- If the static build is missing, fail startup with a clear local error instead of silently starting an API-only server that cannot open the app.
- Keep all new environment variables local and optional. Defaults should work on the event PC with no `.env` file.
- Preserve `package-lock.json`; do not switch package managers.
- Keep TypeScript project references compiling with `tsc -b`.

## Project Structure Notes

- Current structure already matches the architecture seed, but most package entrypoints are placeholders. That is acceptable for Story 1.1 if boundaries, scripts, and smoke tests are solid.
- Current server route `/health` conflicts with the story/architecture expectation of `/api/health`. Add the required route and update tests accordingly.
- Current web shell uses dark live-style treatment too early. Setup should be light and operational per UX requirements.
- Current Playwright smoke verifies Vite preview, not Fastify event mode. Keep preview smoke only if a separate event-mode smoke proves one-process serving.
- Current `packages/test-fixtures/src/index.ts` contains domain-like types. Do not deepen that pattern in runtime code. Later stories should move runtime DTO/schema contracts into `packages/shared` or domain-specific types into `packages/domain`.

## References

- `_bmad-output/planning-artifacts/epics.md#Story-1.1-Open-Local-Auction-Manager-App-Shell`
- `_bmad-output/planning-artifacts/epics.md#Additional-Requirements`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#Invariants--Rules`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#Stack`
- `_bmad-output/planning-artifacts/architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md#Structural-Seed`
- `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md#Vision`
- `_bmad-output/planning-artifacts/prds/prd-auction_manager-2026-07-04/prd.md#Non-Goals`
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/EXPERIENCE.md#State-Patterns`
- `_bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/DESIGN.md#Components`
- `_bmad-output/test-artifacts/test-design/auction_manager-handoff.md#Story-Level-Integration-Guidance`
- `_bmad-output/test-artifacts/automation-summary.md#Validation-Checklist`
- `package.json`
- `package-lock.json`
- `apps/web/src/main.tsx`
- `apps/server/src/main.ts`
- `playwright.config.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Red: `npm run test:e2e` failed because `getByTestId('app-shell')` was not present in the placeholder shell.
- Green: `npm run test:e2e` passed after the setup-ready shell implementation.
- Regression check for web shell task: `npm run typecheck`, `npm test`, and `npm run build` passed.
- Red: `npm test` failed because `apps/server/src/app.test.ts` imported the not-yet-created `./app.js` factory.
- Green: `npm test` passed after adding the Fastify app factory, `/api/health`, and static web serving.
- Regression check for event-server task: `npm run typecheck`, `npm run build`, and `npm run test:e2e` passed.
- Boundary verification: confirmed required workspace paths and no runtime dependency on `@auction-manager/test-fixtures`.
- Regression check for boundary task: `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:e2e` passed.
- Event smoke red: `npm run test:e2e:event` first failed because event mode resolved `apps/web/dist` from the server workspace cwd.
- Event smoke green: `npm run test:e2e:event` passed after resolving the static build path relative to the server package; sandboxed local bind required approved escalation for `127.0.0.1:4174`.
- Verification script check: `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm test`, `npm run typecheck`, and `npm run build` passed.
- Documentation regression check: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`, and `npm run test:e2e:event` passed.
- Final Dev Gate: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`, and `npm run test:e2e:event` passed.

### Implementation Plan

- Replace the placeholder web shell with a light, operational setup surface that carries no auction business state.
- Split the Fastify app factory from process startup, then cover `/api/health` and built static serving through tests.
- Keep npm workspaces and package ownership intact, with root scripts and README documenting local development and event mode.

### Completion Notes List

- Implemented the setup-ready web shell with local-only status, phase indicator, empty-state copy, and a real Start setup button.
- Added Playwright smoke assertions for `app-shell`, `phase-indicator`, `setup-empty-state`, and `setup-start`.
- Split Fastify construction into `apps/server/src/app.ts`, kept `main.ts` to env parsing plus `listen`, and added `/api/health`.
- Added event-mode static serving from `apps/web/dist` with a clear missing-build startup error and root `npm run start:event`.
- Confirmed the required app/package workspace boundaries and added a guardrail test preventing test fixtures from becoming runtime dependencies.
- Added event-mode Playwright coverage that starts Fastify, verifies `/api/health`, and opens the built React shell from the same local process.
- Added explicit root scripts for unit smoke, integration smoke, event-mode E2E, and event-mode start.
- Expanded README with install, local development, event-mode, Dev Gate, local-only constraints, and port troubleshooting.

### File List

- apps/web/e2e/smoke.spec.ts
- _bmad-output/implementation-artifacts/1-1-open-local-auction-manager-app-shell.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/server/src/app.test.ts
- apps/server/src/app.ts
- apps/server/src/main.ts
- apps/web/e2e/event-mode.spec.ts
- apps/web/src/main.tsx
- apps/web/src/styles.css
- package.json
- playwright.config.ts
- playwright.event.config.ts
- packages/shared/src/workspace-boundaries.test.ts
- README.md

## Change Log

- 2026-07-07: Implemented Story 1.1 local setup shell, Fastify event mode, scaffold verification coverage, and developer documentation.
