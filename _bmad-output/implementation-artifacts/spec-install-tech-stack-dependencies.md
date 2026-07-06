---
title: 'Install Tech Stack Dependencies'
type: 'chore'
created: '2026-07-06'
status: 'done'
route: 'one-shot'
---

# Install Tech Stack Dependencies

## Intent

**Problem:** The project had finalized architecture and stack decisions but no npm workspace, package manifests, installed dependencies, or smoke checks for implementation agents to build on.

**Approach:** Bootstrap the approved local TypeScript monorepo shape, install and lock the selected stack under Node 24/npm 11, and add minimal smoke tests proving the main runtime dependencies load.

## Suggested Review Order

**Workspace And Runtime Baseline**

- Start here to confirm the monorepo, runtime, scripts, and approved install scripts.
  [`package.json:5`](../../package.json#L5)

- Confirm Node 24/npm 11 are enforced for future installs.
  [`package.json:11`](../../package.json#L11)

- Check strict shared compiler defaults and workspace import paths.
  [`tsconfig.base.json:3`](../../tsconfig.base.json#L3)

**Application Workspaces**

- Review Fastify/server dependencies and local dev commands.
  [`package.json:12`](../../apps/server/package.json#L12)

- Review React/Vite/Tailwind/Lucide frontend dependencies.
  [`package.json:12`](../../apps/web/package.json#L12)

- Confirm the server shell stays minimal before domain stories begin.
  [`main.ts:1`](../../apps/server/src/main.ts#L1)

- Confirm the web shell is only a render target for stack smoke.
  [`main.tsx:1`](../../apps/web/src/main.tsx#L1)

**Domain Package Skeleton**

- Check SQLite ownership lands in the persistence package.
  [`package.json:18`](../../packages/persistence/package.json#L18)

- Check CSV/image import ownership lands in the imports package.
  [`package.json:18`](../../packages/imports/package.json#L18)

**Verification Harness**

- Review Vitest scope so unit smoke tests exclude Playwright specs.
  [`vitest.config.ts:4`](../../vitest.config.ts#L4)

- Review Playwright preview-server behavior and Chromium target.
  [`playwright.config.ts:8`](../../playwright.config.ts#L8)

- Confirm native SQLite loads against Node 24.
  [`dependencies.test.ts:1`](../../packages/persistence/src/dependencies.test.ts#L1)

- Confirm CSV parsing and Sharp image normalization load.
  [`dependencies.test.ts:1`](../../packages/imports/src/dependencies.test.ts#L1)

- Confirm the browser smoke test exercises the built Vite shell.
  [`smoke.spec.ts:3`](../../apps/web/e2e/smoke.spec.ts#L3)
