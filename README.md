# Auction Manager

Auction Manager is a local event-control app for running an auction from one PC.
Story 1.1 provides the setup-ready web shell and the local Fastify event server.

## Prerequisites

- Node.js 24.x
- npm 11.x
- A local checkout of this repository on the event PC

Install dependencies:

```bash
npm install
```

## Local Development

Open the setup shell through Vite:

```bash
npm run dev:web
```

Expected URL:

```text
http://127.0.0.1:5173
```

The first screen should show the setup-ready empty state with no active auction
loaded.

## Event Mode

Build the workspace and serve the built React app plus `/api/health` from one
local Fastify process:

```bash
npm run start:event
```

Expected URLs:

```text
http://127.0.0.1:3000
http://127.0.0.1:3000/api/health
```

Event mode binds to `127.0.0.1` by default. `HOST` and `PORT` may be overridden
for local machine operation only:

```bash
PORT=4174 npm run start:event
```

## Verification

Run the Story 1.1 Dev Gate:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:e2e:event
```

Additional script aliases:

```bash
npm run test:unit
npm run test:integration
```

For Story 1.1, unit and integration coverage both use Vitest. The integration
alias targets the real Fastify app factory and workspace boundary checks. The
event-mode Playwright smoke starts Fastify and checks both `/api/health` and the
built setup shell from the same local process.

## Local-Only Operation

Version 1 runs from one PC at the event. It does not require cloud services,
Docker, hosted databases, accounts, login, public hosting, API keys, or internet
access during the event after dependencies are installed.

## Troubleshooting

If a port is already in use, run the same local command with a different `PORT`:

```bash
PORT=3001 npm run start:event
```

If event mode reports that the built web app is missing, run:

```bash
npm run build
```

Then start event mode again. Keep the server bound to a local interface such as
`127.0.0.1`.
