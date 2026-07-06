# Review - Version And Reality Check

Verdict: Pass after applied fixes.

Checks:

- Local package layout matches the spine's package names: `apps/web`, `apps/server`, `packages/domain`, `packages/persistence`, `packages/imports`, `packages/shared`, and `packages/test-fixtures`.
- Root `package.json` engines bind Node to `>=24 <25`, matching the architecture's Node 24 LTS decision.
- Local runtime reports Node `24.18.0`, and `better-sqlite3` reports SQLite `3.53.2`.
- Lockfile versions now match the stack table: TypeScript `6.0.3`, React `19.2.7`, Vite `8.1.3`, Fastify `5.9.0`, better-sqlite3 `12.11.1`, Zod `4.4.3`, csv-parse `5.6.0`, Sharp `0.35.3`, Tailwind CSS `4.3.2`, Lucide React `1.23.0`, Vitest `4.1.9`, Playwright `1.61.1`.

Finding:

- Resolved: The previous stack table had stale minor/patch lines for Vite and csv-parse and broader ranges for other packages. It now records scaffold reality rather than unverified estimates.

Note:

- Registry latest on 2026-07-06 differs from the current lockfile for Fastify `5.10.0`, csv-parse `7.0.1`, and Vitest `4.1.10`. No architecture rule depends on those newer releases.
