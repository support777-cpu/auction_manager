# Auction Manager

Auction Manager is a local event-control app for running an auction from one PC.
The setup surface imports Player and Team CSVs, reviews photos and logos, configures
auction parameters, and starts the auction with persisted local state.

## Prerequisites

- Node.js 24.x
- npm 11.x
- A local checkout of this repository on the event PC

Install dependencies:

```bash
npm install
```

## Running the App

There are two ways to run Auction Manager locally.

### Event mode (recommended for the event PC)

Build the workspace once, then serve the built React app and all `/api/*` routes from
one Fastify process:

```bash
npm run start:event
```

Open:

```text
http://127.0.0.1:3000
```

Health check:

```text
http://127.0.0.1:3000/api/health
```

Event mode binds to `127.0.0.1:3000` by default. Override the port for local use only:

```bash
PORT=4174 npm run start:event
```

Use this mode on the event PC. CSV uploads, photo/logo imports, and Start Auction all
go through the same server process.

### Local development (UI + API hot reload)

Development uses two processes:

1. **API server** — Fastify on port `3000`
2. **Web dev server** — Vite on port `5173`, proxying `/api` and `/assets` to the API server

In one terminal, start the API server:

```bash
npm run dev:server
```

In a second terminal, start the web dev server:

```bash
npm run dev:web
```

Open:

```text
http://127.0.0.1:5173
```

`npm run dev` is an alias for `npm run dev:server`. It does **not** start Vite.

Both processes must be running for setup imports to work in development. If only
`dev:web` is running, CSV uploads fail because there is no API backend to receive them.

To point the Vite proxy at a different API host or port:

```bash
VITE_API_PROXY_TARGET=http://127.0.0.1:3001 npm run dev:web
```

## Verification

Run the project quality gate:

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

Unit and integration coverage both use Vitest. The integration alias targets the real
Fastify app factory and workspace boundary checks. Event-mode Playwright tests start
Fastify and exercise CSV import, setup readiness, and Start Auction against the built
app from the same local process.

## Local-Only Operation

Version 1 runs from one PC at the event. It does not require cloud services,
Docker, hosted databases, accounts, login, public hosting, API keys, or internet
access during the event after dependencies are installed.

## Troubleshooting

### App opens in Initial Auction instead of Setup

Auction Manager resumes the last started auction from local SQLite state in `data/`.
If you previously started an auction (or ran tests against the default data folder),
the app skips setup and opens the live board.

Stop the server, clear local event data, then start again:

```bash
npm run reset:data
npm run dev:server
```

For event mode:

```bash
npm run reset:data
npm run start:event
```

To use a separate data folder instead of wiping the default one:

```bash
DATA_DIRECTORY=./data/my-event npm run dev:server
```

### CSV upload fails in development

Make sure the API server is running before uploading:

```bash
npm run dev:server
```

Then reload `http://127.0.0.1:5173` and try the upload again.

### Port already in use

Run the same command with a different port:

```bash
PORT=3001 npm run dev:server
```

If you change the API port, also point Vite at it:

```bash
VITE_API_PROXY_TARGET=http://127.0.0.1:3001 npm run dev:web
```

For event mode:

```bash
PORT=3001 npm run start:event
```

### Event mode reports that the built web app is missing

Build first, then start event mode again:

```bash
npm run build
npm run start:event
```

Keep the server bound to a local interface such as `127.0.0.1`.
