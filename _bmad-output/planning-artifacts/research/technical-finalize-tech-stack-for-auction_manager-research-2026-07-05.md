---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'finalize tech stack for auction_manager'
research_goals: 'Select a practical, defensible implementation stack for the auction_manager product based on existing project requirements, UX direction, and current technology guidance.'
user_name: 'Udeet'
date: '2026-07-05'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-07-05
**Author:** Udeet
**Research Type:** technical

---

## Research Overview

This research finalizes a practical v1 technology stack for Auction Manager, a local web application for running a live amateur church cricket league auction from one operator PC with a mirrored large-display board. The analysis used current primary technical sources, existing product/PRD/UX planning artifacts, and architecture trade-off review across runtime, UI, API, persistence, imports, testing, operations, and security.

The final recommendation is a local-first TypeScript stack: Node.js 24 LTS, npm workspaces, React 19 with Vite, Fastify, SQLite via `better-sqlite3`, Zod, `csv-parse`, Sharp, Tailwind CSS, Lucide React, Vitest, and Playwright. The decisive architectural choice is not a single library but a shape: a local modular monolith with one domain core owning auction rules, phase transitions, undo behavior, and privacy-safe state projection.

The full executive summary, consolidated technical analysis, roadmap, risk assessment, and source verification are in the Research Synthesis section at the end of this document.

---

## Technical Research Scope Confirmation

**Research Topic:** finalize tech stack for auction_manager
**Research Goals:** Select a practical, defensible implementation stack for the auction_manager product based on existing project requirements, UX direction, and current technology guidance.

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-07-05

## Technology Stack Analysis

### Web Search Analysis

Current-source verification supports a pragmatic local-first TypeScript web stack:

- Node.js v24 is the current LTS line, while v26 is current release; Node's own guidance is to use Active LTS or Maintenance LTS for production applications. Source: <https://nodejs.org/en/about/previous-releases>
- Vite's current docs list v8.1.2 and require modern Node versions; it remains a strong fit for a fast React single-page app build. Source: <https://vite.dev/guide/>
- React 19 is stable and current docs show v19.2; it is suitable for the operator-facing interactive UI. Source: <https://react.dev/blog/2024/12/05/react-19>
- Stack Overflow's 2025 survey shows JavaScript, SQL, TypeScript, Node.js, React, npm, Vite, and SQLite are all mainstream enough to avoid unusual hiring/support risk. Source: <https://survey.stackoverflow.co/2025/technology/>
- SQLite remains a good local persistence fit: it is self-contained, reliable, and broadly embedded. Source: <https://www.sqlite.org/index.html>

**Final v1 stack recommendation:** TypeScript across the app, React 19 + Vite for the UI, Fastify 5 on Node.js 24 LTS for a localhost API, SQLite via `better-sqlite3` for local event state, `csv-parse` + Zod for import validation, Sharp for image normalization, Tailwind CSS 4 with project design tokens for styling, Vitest + Playwright for tests, and npm for package management.

Confidence: **High** for the main stack. **Medium** for image handling because HEIC support should be verified with real source photos on the target event PC before implementation is considered complete.

### Programming Languages

**Decision:** Use **TypeScript** for frontend, backend, shared domain rules, import validation, and tests.

TypeScript is the lowest-friction choice because Auction Manager needs the same business rules in multiple places: budget validation, role-capacity validation, undo action shape, player/team imports, and phase transitions. TypeScript lets the project share domain types between React and the Node API without introducing a second runtime language.

_Popular Languages:_ JavaScript and TypeScript are both mainstream in current developer survey data; JavaScript remains the broadest web language and TypeScript is widely used by professional developers. Source: <https://survey.stackoverflow.co/2025/technology/>

_Emerging Languages:_ Rust is relevant only if the project chooses Tauri later. It is not needed for v1 because the product brief asks for a locally hosted web app, not a packaged desktop binary.

_Language Evolution:_ TypeScript continues to be a typed superset of JavaScript, preserving JavaScript runtime behavior while adding static checking. Source: <https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html>

_Performance Characteristics:_ TypeScript compiles away to JavaScript; performance will be determined by browser rendering, Node file/DB work, and persistence design rather than by TypeScript itself.

_Source:_ <https://www.typescriptlang.org/docs/>

### Development Frameworks and Libraries

**Frontend decision:** **React 19 + Vite**.

React fits the live board because the UI is state-heavy, interactive, and component-oriented: player panel, bid control, team tiles, undo summary, setup review, and dangerous-operation modals. Vite fits because the app does not need SSR, SEO, server components, or public deployment; it needs fast local development and a production build that a local backend can serve.

**Backend decision:** **Fastify 5 on Node.js 24 LTS**, bound to localhost by default.

Fastify is a good fit because the API surface is small but validation matters. The app will accept local CSV/image imports and state-changing auction commands; Fastify's schema-based request validation and serialization align with that need. Source: <https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/>

**Styling decision:** **Tailwind CSS 4 + CSS custom properties** generated from `DESIGN.md` tokens.

Tailwind's Vite integration is current and direct, and its utility model is useful for stable board/tile/control layouts. The project should still centralize colors, spacing, and typography as CSS variables so the BMad design tokens remain the source of truth. Source: <https://tailwindcss.com/docs/installation/using-vite>

**Import and validation libraries:**

- `csv-parse` for CSV ingestion because it has Node APIs and supports streaming or sync usage. Source: <https://csv.js.org/parse/>
- Zod for domain/input validation because it is TypeScript-first, works in Node and browsers, and supports strict TypeScript projects. Source: <https://zod.dev/>
- Sharp for normalizing local player/team images to browser-friendly output during setup; verify HEIC samples before relying on it for the event. Source: <https://sharp.pixelplumbing.com/>
- Lucide React for small operational icons in buttons and controls. Source: <https://lucide.dev/guide/react>

_Major Frameworks:_ React is the recommended UI library; Fastify is the recommended local API framework.

_Micro-frameworks:_ No separate state-management framework is recommended for v1. Use a typed domain reducer and server-persisted authoritative state. Add TanStack Query or Zustand only if implementation proves that plain React state is creating real complexity.

_Evolution Trends:_ React 19 is stable, Vite is current, and Node v24 is LTS. This keeps the stack modern without using unstable runtime releases.

_Ecosystem Maturity:_ The selected stack is well represented in current surveys and official docs; it should be easy to troubleshoot compared with a niche desktop or browser-storage stack.

_Source:_ <https://react.dev/blog/2024/12/05/react-19>, <https://vite.dev/guide/>, <https://fastify.dev/docs/latest/>

### Database and Storage Technologies

**Decision:** Use **SQLite** as the authoritative local state file, with an optional JSON snapshot/export after every committed action.

Auction Manager is a single-PC, single-operator app. It does not need PostgreSQL, Supabase, Firebase, Redis, or a hosted database. It does need reliable local recovery, transactional updates, and a compact state history for undo. SQLite matches that shape better than browser-only `localStorage` or IndexedDB because it is an actual local file controlled by the local backend.

Use this storage layout:

- `data/auction.db` - SQLite database for teams, players, phases, action log, undo stack, and imports.
- `data/assets/players/*` and `data/assets/teams/*` - copied and normalized image assets.
- `data/snapshots/latest.json` - optional readable snapshot written after successful DB transaction for emergency inspection/recovery.

Use `better-sqlite3` for Node SQLite access in v1. It has transaction support, prebuilt binaries for LTS Node versions, and a simple synchronous API that is acceptable for a local, single-user event app. Source: <https://github.com/WiseLibs/better-sqlite3>

_Relational Databases:_ SQLite is the primary recommendation. PostgreSQL is unnecessary for v1 because there is no multi-user server or public deployment.

_NoSQL Databases:_ IndexedDB is a fallback only if the app must run as static browser-only code. It weakens the PRD's file-backed recovery and local asset handling.

_In-Memory Databases:_ Redis or Valkey are not needed; the app has one operator and minimal concurrency.

_Data Warehousing:_ Not applicable. Analytics are out of scope.

_Source:_ <https://www.sqlite.org/index.html>, <https://github.com/WiseLibs/better-sqlite3>

### Development Tools and Platforms

**Decision:** Use **npm workspaces or a simple monorepo folder layout** with one package manager: npm.

Recommended repo shape:

- `apps/web` - React/Vite frontend.
- `apps/server` - Fastify local API and static asset serving.
- `packages/domain` - shared auction rules, types, reducers, and validation schemas.
- `packages/test-fixtures` - sample CSVs, teams, and small image fixtures.

Use npm for setup simplicity. Stack Overflow's 2025 survey shows npm is still much more common than pnpm, Yarn, or Bun in reported cloud/build tooling use. Source: <https://survey.stackoverflow.co/2025/technology/>

_IDE and Editors:_ VS Code is a reasonable default, but the stack should not depend on a specific editor.

_Version Control:_ Git only. No special branching model is required for v1.

_Build Systems:_ Vite for frontend build; TypeScript project references if shared packages need clean builds; npm scripts for `dev`, `build`, `test`, and `start`.

_Testing Frameworks:_ Vitest for domain/backend unit tests and Playwright for browser-level flows. Vitest is Vite-powered and currently requires Vite >= 6 and Node >= 20; Playwright supports Chromium, WebKit, and Firefox across major OSes. Sources: <https://vitest.dev/guide/>, <https://playwright.dev/docs/intro>

_Source:_ <https://vite.dev/guide/>, <https://vitest.dev/guide/>, <https://playwright.dev/docs/intro>

### Cloud Infrastructure and Deployment

**Decision:** **No cloud infrastructure for v1.**

The product brief and PRD are explicit: local single-PC operation, locally hosted web app, no public deployment, no accounts, no online bidding, no SaaS. The implementation should run a local server on the event PC and open `http://127.0.0.1:<port>`.

Recommended runtime model:

- Development: Vite dev server plus Fastify API.
- Event/production mode: Fastify serves the built React app and local APIs from one localhost process.
- Network binding: default to `127.0.0.1`; expose `0.0.0.0` only if a second display device or audience route is intentionally added later.
- Packaging: defer Electron/Tauri. Add Tauri only if installation or native file dialogs become more important than keeping the stack small. Tauri supports web frontends with a Rust-backed shell, but it adds native prerequisites and another runtime boundary. Source: <https://tauri.app/start/>

_Major Cloud Providers:_ AWS, Azure, and GCP are not recommended for v1.

_Container Technologies:_ Docker is not required for the live event. A future Docker dev environment is optional, not part of the product stack.

_Serverless Platforms:_ Not applicable.

_CDN and Edge Computing:_ Not applicable.

_Source:_ <https://nodejs.org/en/about/previous-releases>, <https://tauri.app/start/>

### Technology Adoption Trends

Current adoption data supports a mainstream web stack but also warns against overfitting to popularity alone:

- JavaScript, TypeScript, SQL, Node.js, React, npm, Vite, and SQLite all appear in current Stack Overflow survey results, so the recommended stack is not exotic. Source: <https://survey.stackoverflow.co/2025/technology/>
- Fastify has lower survey share than Express, but its schema-first validation is a better match for this app's small, correctness-sensitive API. Express remains an acceptable fallback if team familiarity matters more than built-in validation ergonomics.
- SQLite has lower operational overhead than PostgreSQL for this product because there is no remote server, no accounts, and no concurrent online bidding.
- Desktop shells are viable but premature. Electron bundles Chromium and Node into a desktop app, while Tauri uses the system webview and native bindings; both add packaging concerns that v1 does not need by default. Sources: <https://www.electronjs.org/docs/latest/>, <https://tauri.app/start/>

_Migration Patterns:_ Start with local Node + React. If v2 needs an audience-only second device, reuse the same server and add a read-only route. If v2 needs distributed bidding, revisit authentication, network deployment, and database choices.

_Emerging Technologies:_ Tauri is the most relevant later option if the project needs native packaging. Bun/Deno are not recommended for v1 because Node LTS has the broadest compatibility with Vite, Fastify, Sharp, and SQLite packages.

_Legacy Technology:_ Excel remains source-adjacent only for CSV export; it should not remain in the live event loop.

_Community Trends:_ The stack is intentionally mainstream, but the final decision is driven primarily by project requirements: local-only, reliable recovery, fast operator controls, and privacy.

_Source:_ <https://survey.stackoverflow.co/2025/technology/>

### Finalized Stack For Architecture

| Layer | Final v1 choice | Rationale |
|---|---|---|
| Runtime | Node.js 24 LTS | Current LTS, compatible with Vite/Fastify/Vitest/Sharp |
| Package manager | npm | Lowest setup friction; mainstream |
| Language | TypeScript strict | Shared domain types and safer auction rules |
| Frontend | React 19 + Vite 8 | Fast local SPA, no unnecessary SSR/public hosting |
| Styling | Tailwind CSS 4 + CSS variables | Fast implementation while preserving design tokens |
| Icons | Lucide React | Lightweight operational icon set |
| Local API | Fastify 5 | Small localhost API with schema validation |
| CSV import | `csv-parse` | Mature Node CSV parser |
| Validation | Zod + Fastify route schemas | Type-safe imports and defensive API boundaries |
| Persistence | SQLite via `better-sqlite3` | Local transactional file state and undo/action log |
| Image handling | Sharp | Normalize photos/logos to web-friendly formats |
| Unit tests | Vitest | Fits Vite/TypeScript stack |
| E2E tests | Playwright | Validates live operator flows in real browsers |
| Hosting | Localhost only | Matches v1 non-goals and privacy constraints |
| Desktop packaging | Defer; consider Tauri later | Useful only if native install/file-dialog needs grow |

**Rejected for v1:** Next.js, Supabase/Firebase, PostgreSQL, Redis, Docker-first runtime, Electron-first desktop packaging, browser-only IndexedDB/localStorage persistence.

**Primary technical risk:** local file and image import ergonomics. Mitigation: implement setup import early, test with real CSV/photo/logo samples, verify HEIC handling on the target PC, and make local write failures block further live actions until resolved.

## Integration Patterns Analysis

### Web Search Analysis

Current-source verification supports a simple local integration model rather than distributed-service integration:

- Fastify routes support typed HTTP methods, route schemas, request validation, response schemas, hooks, and localhost binding, which fits a small command API. Source: <https://fastify.dev/docs/latest/Reference/Routes/>
- The browser Fetch API is the standard client-side request mechanism for app-to-server calls, and FormData supports multipart-style file transfer from web forms. Sources: <https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API>, <https://developer.mozilla.org/en-US/docs/Web/API/FormData>
- Web apps can ask users to select local files through file inputs or drag/drop, but the file API exposes selected file objects, not arbitrary ongoing access to the user's file system. Source: <https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications>
- `@fastify/multipart` supports streamed and disk-mode multipart processing with file-size limits, which is important for CSV/photo/logo import safety. Source: <https://github.com/fastify/fastify-multipart>
- `@fastify/static` can serve a Vite single-page application build and local normalized assets from the same process. Source: <https://github.com/fastify/fastify-static>
- SSE and WebSocket are valid browser-server push options, but v1 does not need them unless a separate audience route or second device is added. Sources: <https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events>, <https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API>

**Final v1 integration pattern recommendation:** a same-origin localhost web app served by Fastify, using JSON-over-HTTP for state and commands, multipart/form-data for setup imports, static routes for built UI and normalized image assets, SQLite transactions for persistence, and a domain action log for undo/recovery. Keep all integration local. Do not add GraphQL, gRPC, message queues, service mesh, API gateway, OAuth, or cloud integrations for v1.

Confidence: **High** for REST-style HTTP, multipart import, same-origin serving, and local SQLite-backed command processing. **Medium** for photo folder ergonomics because browser file selection behavior should be tested with the event PC and real photo/logo folders.

### API Design Patterns

**Decision:** Use a **command-oriented REST-style API** over localhost.

The auction is not a CRUD admin app. It is a live event workflow with commands that must preserve domain intent: reveal next player, select team, increase bid, mark sold, mark unsold, undo, start unsold assignment, assign random unsold player, reset, and close. The API should expose those commands directly instead of generic table updates.

Recommended API shape:

- `GET /api/state` - returns the full current app state needed by the board.
- `POST /api/setup/player-csv` - multipart upload for player CSV.
- `POST /api/setup/player-photos` - multipart upload for selected player image files.
- `POST /api/setup/team-csv` - multipart upload for team CSV.
- `POST /api/setup/team-logos` - multipart upload for selected logo files.
- `POST /api/auction/start`
- `POST /api/auction/reveal-next`
- `POST /api/auction/select-team`
- `POST /api/auction/increase-bid`
- `POST /api/auction/mark-sold`
- `POST /api/auction/mark-unsold`
- `POST /api/auction/unsold/start`
- `POST /api/auction/unsold/assign-random`
- `POST /api/auction/undo`
- `POST /api/auction/reset`
- `POST /api/auction/close`

Each mutating endpoint should accept a `clientCommandId` and return the new authoritative state plus a compact result summary. This protects against accidental double-clicks, browser retry behavior, or a user pressing Enter twice.

_RESTful APIs:_ Recommended, but command-oriented rather than resource-patch-oriented. Fastify's route schema support should validate every request and response. Source: <https://fastify.dev/docs/latest/Reference/Routes/>

_GraphQL APIs:_ Not recommended for v1. GraphQL is useful when clients need flexible typed queries, graph-shaped APIs, and schema introspection. Auction Manager has one first-party client and a small fixed command set, so GraphQL adds avoidable schema/resolver complexity. Source: <https://graphql.org/learn/>

_RPC and gRPC:_ Not recommended for v1. gRPC is useful for distributed applications and cross-language service calls using Protocol Buffers. Auction Manager has a browser UI talking to a local Node process, so JSON-over-HTTP is simpler and easier to debug. Source: <https://grpc.io/docs/what-is-grpc/introduction/>

_Webhook Patterns:_ Not applicable. The app has no third-party service that needs callback delivery.

_Source:_ <https://fastify.dev/docs/latest/Reference/Routes/>

### Communication Protocols

**Decision:** Use **HTTP on 127.0.0.1** for v1.

For the event runtime, Fastify should serve both the built React app and the API from the same localhost origin, such as `http://127.0.0.1:4317`. Same-origin serving avoids CORS complexity and keeps the browser security model simple.

Development can use Vite's dev server with an API proxy to Fastify, or a narrow CORS allowlist for the Vite origin. For the live event mode, use one Fastify process and same-origin paths.

_HTTP/HTTPS Protocols:_ HTTP on localhost is sufficient for the v1 single-PC app. If the app is later exposed to other devices on a LAN, revisit HTTPS, operator authentication, and network binding.

_WebSocket Protocols:_ Not needed for v1. WebSocket enables two-way persistent browser-server communication, but the mirrored single-browser flow can update state from command responses and `GET /api/state`. Consider WebSocket only if v2 adds multiple live clients with bidirectional needs. Source: <https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API>

_Server-Sent Events:_ Optional v2 candidate for audience-only display. SSE is simpler than WebSocket when the server only needs to push live state updates to passive clients. Source: <https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events>

_Message Queue Protocols:_ Not applicable. AMQP, MQTT, Kafka, and queue-backed processing solve distributed or asynchronous workloads that v1 does not have.

_grpc and Protocol Buffers:_ Not applicable for v1. There are no cross-language internal services or high-throughput binary contracts.

_Source:_ <https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API>, <https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API>, <https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events>

### Data Formats and Standards

**Decision:** Use **JSON for API state/commands**, **CSV for source imports**, **multipart/form-data for uploads**, **SQLite for durable local state**, and **browser-friendly image files for served assets**.

JSON is the right API format because the frontend and backend are both JavaScript/TypeScript, the data is human-inspectable, and the state shape is moderate. CSV remains the import format because the source registration data comes from Google Sheets export. Multipart is the correct transport for CSV and image uploads from the browser.

_JSON and XML:_ Use JSON. XML is unnecessary. JSON is a standards-track, text-based, language-independent data interchange format. Source: <https://www.rfc-editor.org/rfc/rfc8259>

_Protobuf and MessagePack:_ Not recommended. Binary formats add tooling and debugging cost without solving a v1 problem.

_CSV and Flat Files:_ Required for player and team import. The CSV parser should tolerate real spreadsheet exports while validating required source columns explicitly. Sources: <https://www.rfc-editor.org/rfc/rfc4180>, <https://csv.js.org/parse/>

_Multipart Uploads:_ Use browser `FormData` plus `@fastify/multipart`. Set file count and file size limits, stream files to a staging directory, and reject unsupported extensions before copying to managed assets. Sources: <https://developer.mozilla.org/en-US/docs/Web/API/FormData>, <https://github.com/fastify/fastify-multipart>

_Custom Data Formats:_ Use a project-specific JSON snapshot only as a recovery/export aid, not as the primary database. Example: `data/snapshots/latest.json`.

_Source:_ <https://www.rfc-editor.org/rfc/rfc8259>, <https://www.rfc-editor.org/rfc/rfc4180>, <https://developer.mozilla.org/en-US/docs/Web/API/FormData>

### System Interoperability Approaches

**Decision:** Use **point-to-point local integration** with strict boundaries.

The app integrates with external systems only through files selected by the operator:

- Google Sheets -> downloaded Player CSV -> `POST /api/setup/player-csv`.
- Google Drive -> downloaded player photos -> `POST /api/setup/player-photos`.
- Local team list -> Team CSV -> `POST /api/setup/team-csv`.
- Local logo folder -> selected logo files -> `POST /api/setup/team-logos`.

There should be no Google API, OAuth consent, Drive sync, cloud database, or online import in v1. File export/import keeps the live event independent of internet access and avoids handling long-lived third-party credentials.

_Point-to-Point Integration:_ Recommended. Direct browser-to-localhost calls are sufficient and debuggable.

_API Gateway Patterns:_ Not applicable. There is one local API process. A gateway would only add an extra moving part.

_Service Mesh:_ Not applicable. There are no distributed services.

_Enterprise Service Bus:_ Not applicable. This is not an enterprise integration project.

_Local File Interoperability:_ The browser should select files through file inputs or drag/drop. The backend should copy selected files into managed app storage, because browser file objects do not represent durable permission to read arbitrary folders after restart. Source: <https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications>

_Source:_ <https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications>, <https://github.com/fastify/fastify-static>

### Microservices Integration Patterns

**Decision:** Do **not** use microservices for v1.

Auction Manager should be a local modular monolith: one frontend, one local API process, one SQLite database, one managed asset directory, and shared domain logic. The operational risk during a live auction is process and state reliability, not distributed scaling.

_API Gateway Pattern:_ Rejected for v1. If a future v2 becomes a hosted multi-user system, gateway routing may become relevant. Source: <https://learn.microsoft.com/en-us/azure/architecture/patterns/gateway-routing>

_Service Discovery:_ Rejected. All services live in one process and fixed localhost address.

_Circuit Breaker Pattern:_ Rejected for v1's internal flow. There are no remote dependencies during the live event. The equivalent local resilience pattern is simpler: fail closed on local write errors and block further state-changing actions until the operator can retry or recover. Source: <https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker>

_Saga Pattern:_ Rejected. A sale or random assignment should be one SQLite transaction, not a distributed transaction. Saga is relevant to distributed transactions across services, which v1 does not have. Source: <https://microservices.io/patterns/data/saga.html>

_Source:_ <https://learn.microsoft.com/en-us/azure/architecture/patterns/gateway-routing>, <https://microservices.io/patterns/data/saga.html>

### Event-Driven Integration

**Decision:** Use an **internal action log**, not distributed event-driven infrastructure.

Undo and recovery need a durable history of meaningful actions. That does not require Kafka, RabbitMQ, or full event sourcing. The recommended pattern is:

1. Validate command input.
2. Open SQLite transaction.
3. Load current state and rule constraints.
4. Apply domain command.
5. Write action log entry with before/after or inverse payload.
6. Update current state tables.
7. Write optional JSON snapshot.
8. Commit.
9. Return authoritative state.

This gives the product what it needs: multi-step undo, auditability, and recovery from browser refresh/app restart. It avoids the complexity of pure event sourcing. Microsoft explicitly warns that event sourcing has significant trade-offs and that traditional data management is sufficient for most systems. Source: <https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing>

_Publish-Subscribe Patterns:_ Not needed in v1. If v2 adds passive audience clients, publish state changes from the same process using SSE.

_Event Sourcing:_ Do not use full event sourcing. Use a pragmatic action log plus current-state tables.

_Message Broker Patterns:_ Not applicable. No RabbitMQ, Kafka, Redis Streams, or cloud pub/sub.

_CQRS Patterns:_ Use a light command/query separation in API naming and domain code, but not separate stores. `POST` endpoints are commands; `GET /api/state` is a query. Microsoft notes CQRS can improve clarity but adds complexity when combined with separate stores or event sourcing. Source: <https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs>

_Source:_ <https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing>, <https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs>

### Integration Security Patterns

**Decision:** Keep v1 **local, same-origin, schema-validated, and file-safe**.

Security in this app is mostly about preventing accidental exposure and protecting the local process from malformed imports:

- Bind the live event server to `127.0.0.1` by default.
- Serve frontend and API from one origin in event mode to avoid broad CORS.
- If dev CORS is enabled, allow only the Vite dev origin.
- Validate every command and setup input with Zod/Fastify schemas.
- Apply multipart file count and file size limits.
- Strip path data from uploaded filenames; generate internal asset IDs.
- Copy files into `data/assets/*`; never serve arbitrary local filesystem paths.
- Do not display private CSV fields on the board.
- Keep reset and close behind explicit confirmation.
- Block state-changing actions after persistence failure.

_OAuth 2.0 and JWT:_ Not recommended for v1 because there are no accounts, remote users, or cloud APIs. If the app is exposed beyond localhost later, add operator authentication.

_API Key Management:_ Not applicable for v1.

_Mutual TLS:_ Not applicable for v1 localhost use.

_Data Encryption:_ HTTPS is unnecessary for same-device localhost. If the app moves to LAN or cloud, revisit TLS and authentication together.

_CORS:_ Avoid in event mode by serving same-origin. Browser CORS exists to control cross-origin script requests; using one origin avoids the need to broaden access. Source: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS>

_API Security Baseline:_ OWASP's API Security project is aimed at sensitive APIs and highlights risks from insecure APIs. Even local APIs should still validate inputs, avoid excessive data exposure, and keep dangerous operations explicit. Source: <https://owasp.org/API-Security/>

_Source:_ <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS>, <https://owasp.org/API-Security/>, <https://github.com/fastify/fastify-multipart>

### Finalized Integration Contract For Architecture

| Concern | Final v1 decision |
|---|---|
| Client-server protocol | Same-origin HTTP on localhost |
| API style | Command-oriented REST-style JSON API |
| State reads | `GET /api/state`, full board-ready DTO |
| State writes | `POST` command endpoints, one SQLite transaction each |
| Idempotency | `clientCommandId` on mutating commands |
| File import | Multipart upload with limits and staging |
| CSV source | Downloaded CSV only; no Google API |
| Image source | User-selected local files; copy to managed asset store |
| Asset serving | `@fastify/static` for built UI and normalized assets |
| Push updates | None in v1; SSE candidate for v2 audience route |
| Undo/recovery | SQLite action log plus current-state tables |
| Security | Bind localhost, same-origin, validate inputs, avoid private fields |

**Rejected for v1:** GraphQL, gRPC, webhooks, message brokers, service mesh, API gateway, distributed microservices, full event sourcing, OAuth/JWT, cloud import integrations, browser-only persistent file access.

**Primary integration risk:** setup import UX. Mitigation: build import review early, test real CSV/photo/logo sets, support multi-file selection and drag/drop, normalize copied assets, and preserve a clear local data directory for recovery.

## Architectural Patterns and Design

### Web Search Analysis

Current-source verification supports a **local modular monolith** with layered internal boundaries:

- Microsoft's architecture-style guidance emphasizes matching architecture style complexity to the problem and being practical rather than chasing architectural purity. Source: <https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/>
- N-tier/layered architecture separates responsibilities and manages dependencies, but physical tiers can add latency and complexity. For Auction Manager, keep logical layers but run them in one local process. Source: <https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/n-tier>
- Microservices provide independent deployment and scaling, but introduce service discovery, data consistency, and distributed-system management complexity. That cost does not fit a single-PC v1. Source: <https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/>
- DDD guidance is useful for building a shared domain language and defining bounded concepts, but the app does not need to split those concepts into separate services. Source: <https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis>
- SQLite is transactional and supports ACID behavior even across crashes or power loss; this directly supports the PRD's local recovery requirement. Source: <https://www.sqlite.org/transactional.html>

**Final architecture recommendation:** a local modular monolith with four internal layers: React presentation, Fastify API/adapters, shared TypeScript domain core, and SQLite/file-system infrastructure. The authoritative flow is command -> validation -> domain transition -> SQLite transaction -> action log/snapshot -> state DTO. Keep setup imports as adapters and keep auction rules in the domain package, not in React components or route handlers.

Confidence: **High** for v1. The architecture matches the PRD's local, single-operator, no-cloud, file-backed requirements.

### System Architecture Patterns

**Decision:** Use a **local modular monolith** with logical layering.

Auction Manager should deploy as one local app, but be internally organized like this:

- `apps/web` - React presentation and interaction state.
- `apps/server` - Fastify API, static serving, upload handling, and process startup.
- `packages/domain` - auction entities, rules, commands, reducers/state transitions, validation helpers, and undo logic.
- `packages/persistence` or server infrastructure module - SQLite repositories, action log, snapshot writer, and asset store.

This structure keeps v1 simple to run while preserving boundaries needed for correctness. The most important architectural rule is that **the domain core owns auction truth**: React can ask for a command, routes can validate transport shape, and SQLite can persist results, but only domain functions decide whether a sale, assignment, undo, reset, or phase transition is valid.

_Layered/N-tier:_ Use logical layers, not physical tiers. Microsoft describes N-tier as separating responsibilities into presentation, business logic, and data access; physical separation is optional and can add latency/complexity. Source: <https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/n-tier>

_Microservices:_ Rejected. The domain is small, the deployment is one PC, and there is one operator. Microservices would add network boundaries, service discovery, distributed data consistency, and operational overhead without delivering v1 value. Source: <https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/>

_Serverless:_ Rejected. The product must work locally during one live event and should not depend on cloud availability.

_Event-driven architecture:_ Rejected as infrastructure. Use an internal action log, not an event broker. Event-driven architectures are useful for decoupled high-volume systems but add ordering, delivery, and eventual-consistency concerns. Source: <https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/>

_Source:_ <https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/>

### Design Principles and Best Practices

**Decision:** Use **domain-first design with explicit workflow states**.

The code should model the PRD language directly:

- `Setup`, `InitialAuction`, `UnsoldAssignment`, `Closed`
- `PendingPlayer`, `CurrentPlayer`, `SoldPlayer`, `UnsoldPlayer`
- `RevealNextPlayer`, `SelectTeam`, `IncreaseBid`, `MarkSold`, `MarkUnsold`, `Undo`, `RandomAssignUnsold`
- `TeamBudget`, `SquadSize`, `RoleTarget`, `RoleCount`

This is a practical DDD subset. It gives the code a shared vocabulary with the product docs without overbuilding DDD infrastructure. Microsoft DDD guidance emphasizes ubiquitous language, bounded contexts, entities, aggregates, and domain services; Auction Manager can use these ideas inside one bounded context named `Auction`. Source: <https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis>

Recommended internal boundaries:

- **Domain entities:** Player, Team, AuctionState, AuctionRules, ActionLogEntry.
- **Domain commands:** typed command objects with idempotency IDs.
- **Domain services:** randomization, eligibility, assignment, undo.
- **Adapters:** CSV parser, photo matcher, logo matcher, SQLite repository, asset storage.
- **DTOs:** board-ready state returned by `GET /api/state`.

Best practices for v1:

- Keep route handlers thin.
- Keep React components presentation-oriented.
- Put all hard-block rules in domain functions.
- Use pure functions for state transitions where feasible.
- Require tests for every domain command and undo inverse.
- Treat random order and random assignment as domain operations with persisted random results, not UI behavior.

_Source:_ <https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis>

### Scalability and Performance Patterns

**Decision:** Optimize for **live-event responsiveness and local reliability**, not horizontal scale.

The performance target is not internet-scale throughput. It is: clicking a live action updates the board immediately, writes local state reliably, and keeps the operator moving under public pressure.

Recommended performance pattern:

1. Keep the full board DTO small and return it after every command.
2. Keep all live commands synchronous from the operator's perspective.
3. Use one SQLite write transaction per state-changing command.
4. Normalize images during setup, not during live bidding.
5. Avoid expensive filesystem scans during the live auction.
6. Keep team tile capacity calculations deterministic and cheap.
7. Use optimistic UI only for visual affordances; the authoritative state still comes from the server response.

SQLite supports multiple readers but only one simultaneous writer, which is fine for one operator. Source: <https://www.sqlite.org/lang_transaction.html>

Consider SQLite WAL mode if reads and writes need smoother concurrency or future audience display routes are added. SQLite's WAL documentation notes that readers and writers can proceed concurrently, with same-host constraints that fit the single-PC product. Source: <https://www.sqlite.org/wal.html>

Avoid these scale patterns in v1:

- Load balancers
- Caches such as Redis
- Queue-backed command processing
- Background workers for live commands
- Separate read/write databases
- WebSocket push for the mirrored single-browser view

_Source:_ <https://www.sqlite.org/lang_transaction.html>, <https://www.sqlite.org/wal.html>

### Integration and Communication Patterns

**Decision:** Use **same-origin command/query HTTP** with explicit state transitions.

Architecturally, every write should be handled as a command:

```text
React control -> POST command -> Fastify route validation -> domain transition -> SQLite transaction -> action log -> state DTO response
```

Every read should return a display-safe DTO:

```text
React load/resume -> GET /api/state -> privacy-filtered board/setup DTO
```

This gives the frontend a stable contract while preventing privacy leaks from source CSV fields. API route schemas should validate request and response shape. Fastify route options support request schemas and response schemas. Source: <https://fastify.dev/docs/latest/Reference/Routes/>

The architecture should include a local API module by feature area:

- `setupRoutes`
- `auctionRoutes`
- `assetRoutes`
- `healthRoutes`

Rejected communication patterns:

- GraphQL: too flexible for one fixed first-party UI.
- gRPC/Protobuf: unnecessary binary/interface tooling for localhost browser/API.
- Message broker: unnecessary for synchronous single-operator workflow.
- WebSocket: reserve for future multi-client live display.

_Source:_ <https://fastify.dev/docs/latest/Reference/Routes/>

### Security Architecture Patterns

**Decision:** Use a **local threat model with file-safe boundaries and privacy-by-design display DTOs**.

The biggest v1 security and safety risks are not remote attackers in a hosted service. They are accidental privacy exposure, malformed files, path traversal, oversized uploads, and unsafe local file serving.

Security architecture rules:

- Bind to `127.0.0.1` by default.
- Serve frontend and API same-origin in event mode.
- Do not expose arbitrary local filesystem paths.
- Copy accepted files into a managed asset store.
- Generate internal filenames/IDs for assets.
- Validate upload extension, content type, size, and image decode/normalization.
- Store registration-private fields only if required for import diagnostics; never include them in board DTOs.
- Keep dangerous operations behind route-level domain checks and UI confirmation.
- Validate workflow sequence server-side. The API must reject `mark-sold` if there is no current player, no selected team, or invalid team capacity.

OWASP REST guidance emphasizes server-side workflow validation, input validation, request-size limits, content-type validation, and appropriate status codes. Source: <https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html>

OWASP file upload guidance recommends allowlisted extensions, generated filenames, file size limits, safe storage location, and defense in depth. Source: <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html>

_Source:_ <https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html>, <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html>

### Data Architecture Patterns

**Decision:** Use **current-state tables plus action log**, not pure event sourcing.

The database should support three jobs:

1. Resume the latest auction state quickly.
2. Undo meaningful live actions.
3. Inspect/recover the event if the app closes unexpectedly.

Recommended SQLite model groups:

- `app_meta` - schema version, created time, last saved action.
- `auction_state` - phase, current player, selected team, current bid, rules.
- `players` - imported player records and auction status.
- `teams` - team/captain/logo/budget/squad state.
- `team_role_counts` - role counts per team.
- `asset_files` - normalized local asset metadata.
- `action_log` - command type, timestamp, summary, before/after or inverse payload, clientCommandId.
- `import_issues` - setup review issues and severity.

Use SQLite transactions for every command. SQLite states that all changes inside a single transaction occur completely or not at all, even if interrupted by crash or power loss. Source: <https://www.sqlite.org/transactional.html>

Do not use full event sourcing. Microsoft's event-sourcing pattern guidance explicitly notes significant trade-offs and says traditional data management is sufficient for most systems. Auction Manager needs an undoable action log, not a pure event store. Source: <https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing>

Do not split read and write stores. A light CQRS naming convention is useful, but Microsoft notes CQRS can introduce significant complexity, especially with event sourcing and separate stores. Source: <https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs>

_Source:_ <https://www.sqlite.org/transactional.html>, <https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing>, <https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs>

### Deployment and Operations Architecture

**Decision:** Deploy v1 as a **single local Node process** for event mode.

Recommended modes:

- **Development mode:** Vite dev server for React, Fastify server for API, npm scripts to run both.
- **Event mode:** Build React with Vite, then run one Fastify process that serves `/api/*`, `/assets/*`, and the SPA.
- **Data directory:** configurable but default to a local `data/` folder under the project or user-chosen event folder.
- **Backup/export:** write `data/snapshots/latest.json` after committed actions and optionally provide `Export Auction State`.
- **Health check:** `GET /api/health` returns server status, DB open status, and data directory path.
- **Pre-event verification:** a setup screen should confirm CSV validity, image/logo match counts, rule summary, and write-test success before `Start Auction`.

`@fastify/static` supports serving static files and includes guidance for hosting a single-page application build such as Vite output. Source: <https://github.com/fastify/fastify-static>

Node's release guidance says production applications should use Active LTS or Maintenance LTS releases. Source: <https://nodejs.org/en/about/previous-releases>

Operational guardrails:

- The server should refuse to start if the data directory is not writable.
- The live UI should block further state-changing actions after a failed persistence write.
- Reset and close should not be undoable and should require confirmation.
- The app should display resume metadata when saved state exists.
- Do not require Docker, cloud hosting, or internet during the event.

_Source:_ <https://github.com/fastify/fastify-static>, <https://nodejs.org/en/about/previous-releases>

### Architecture Decision Summary

| Decision | Final v1 architecture choice |
|---|---|
| Architecture style | Local modular monolith |
| Internal structure | React UI, Fastify API, domain core, SQLite/file adapters |
| Domain model | One `Auction` bounded context with explicit phases and commands |
| State authority | Server/domain layer, not React component state |
| Persistence | SQLite current-state tables plus action log |
| Recovery | DB transaction durability plus JSON snapshot/export |
| Undo | Domain inverse/before-after action log |
| Imports | File adapter pipeline with setup review issues |
| Deployment | Single localhost Node process in event mode |
| Security | Localhost binding, same-origin API, upload hardening, privacy-filtered DTOs |
| Scalability stance | Optimize one-PC reliability, not distributed scale |

**Rejected for v1:** physical N-tier deployment, microservices, serverless, API gateway, service mesh, distributed event-driven architecture, full event sourcing, separate CQRS read/write stores, Redis/cache layer, background workers for live commands, Docker-required event runtime, desktop shell as the default architecture.

**Primary architecture risk:** rule logic drifting between frontend, backend routes, and persistence. Mitigation: put every auction rule and phase transition in `packages/domain`, test it directly, and make routes/UI call the same command functions.

## Implementation Approaches and Technology Adoption

### Technology Adoption Strategies

**Decision:** Adopt the recommended stack incrementally, starting from the domain model rather than the UI shell.

For Auction Manager, the highest implementation risk is not React, Fastify, or SQLite individually. The risk is encoding auction rules in multiple places and discovering during the event that the UI permits an invalid sale, squad overflow, or wrong unsold assignment. The adoption sequence should therefore be:

1. Create the domain package first.
2. Add command handlers and tests for every auction transition.
3. Add SQLite persistence around those command handlers.
4. Add Fastify routes as thin adapters.
5. Add the React operator and display views on top of authoritative server state.
6. Add image and CSV import pipelines once the live command loop is stable.
7. Add event-mode packaging and operator rehearsal scripts last.

Recommended workspace structure:

```text
apps/
  web/
  server/
packages/
  domain/
  persistence/
  shared/
```

Use npm workspaces rather than adding a separate monorepo tool. npm workspaces support managing multiple local packages from one root package and automatically symlink workspace packages during install. That is enough for a small local product and avoids adding Turborepo, Nx, or pnpm as additional decisions. Source: <https://docs.npmjs.com/cli/v10/using-npm/workspaces/>

This is not a legacy migration, but the rollout should still follow the same risk principle as the Strangler Fig pattern: move functionality in small slices and keep the system working after each slice. Microsoft describes the pattern as incremental migration that reduces risk by replacing specific pieces over time. For Auction Manager, the slices are not old-vs-new services; they are setup import, initial auction loop, undo/recovery, unsold assignment, and final export. Source: <https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig>

Adoption guardrail: do not start with a visually complete demo that lacks domain and persistence behavior. For this product, a correct plain UI beats a polished UI with untested auction logic.

_Source:_ <https://docs.npmjs.com/cli/v10/using-npm/workspaces/>, <https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig>

### Development Workflows and Tooling

**Decision:** Use a simple npm workspace workflow with strict TypeScript, local scripts, and a small CI pipeline.

Recommended root scripts:

```json
{
  "scripts": {
    "dev": "npm run dev --workspaces --if-present",
    "build": "npm run build --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "test:e2e": "npm run test:e2e --workspace=apps/web",
    "start:event": "npm run build && node apps/server/dist/index.js"
  }
}
```

npm workspaces support running commands in individual workspaces or across all configured workspaces, which fits the proposed package split without adding tooling. Source: <https://docs.npmjs.com/cli/v10/using-npm/workspaces/>

Use TypeScript strict mode from the first commit. TypeScript's strict null checks catch cases where values can be missing before runtime. This matters directly for auction state: selected team, current player, next player, remaining budget, and role counts must be explicit rather than nullable by accident. Source: <https://www.typescriptlang.org/tsconfig/#strictNullChecks>

Use Zod at every external boundary:

- CSV row parsing.
- Multipart import metadata.
- API command bodies.
- Server configuration.
- Snapshot/export payloads.
- Any persisted JSON fields in SQLite.

Zod's `safeParse` returns a success/error result, which maps cleanly to setup validation screens and API `400` responses without exception-driven control flow. Source: <https://zod.dev/basics>

Use Vite's production build for the React app. Vite documents `vite build` as producing a bundle suitable for serving as static files. In event mode, Fastify should serve that build plus `/api/*` from the same local origin. Source: <https://vite.dev/guide/build>

Recommended source control and review workflow:

- Protect the domain package from UI-driven shortcuts.
- Require every PR that changes auction rules to include domain tests.
- Keep API request/response DTOs in shared types, but keep rule execution in `packages/domain`.
- Review `apps/web` for display privacy: no email, mobile, payment, or private fields on the live board.
- Pin Node to the selected LTS line in `.nvmrc` or `.node-version`.

_Source:_ <https://docs.npmjs.com/cli/v10/using-npm/workspaces/>, <https://www.typescriptlang.org/tsconfig/#strictNullChecks>, <https://zod.dev/basics>, <https://vite.dev/guide/build>

### Testing and Quality Assurance

**Decision:** Use layered automated testing, with domain tests as the quality gate.

Testing layers:

| Layer | Tool | Purpose |
|---|---|---|
| Domain unit tests | Vitest | Auction rules, phase transitions, undo, budgets, role counts |
| Import parser tests | Vitest | CSV mapping, duplicate detection, required fields, bad rows |
| Persistence tests | Vitest + temporary SQLite DB | Transaction behavior, resume, action log, snapshots |
| API route tests | Fastify `inject()` | Request validation, command outcomes, error status codes |
| Browser workflow tests | Playwright | Operator flow, board display, setup import review, recovery |
| Accessibility/UI smoke tests | Playwright | Large-display layout, focus behavior, readable controls |

Fastify has built-in HTTP injection support for fake requests without starting a real server, which is ideal for testing route adapters around the domain layer. Source: <https://fastify.dev/docs/latest/Guides/Testing/>

Vitest supports V8 coverage through `@vitest/coverage-v8`, with modern coverage remapping. Use coverage as a warning signal, not the only quality measure. The non-negotiable gate is behavioral coverage of auction invariants. Source: <https://vitest.dev/guide/coverage.html>

Playwright should cover a small number of high-value event flows:

- Fresh setup import with valid sample files.
- Import with invalid CSV rows and blocked start.
- Initial auction: reveal player, select team, increment bid, mark sold.
- Invalid sale blocked when squad/budget/role constraints fail.
- Undo after sale restores player, budget, squad, role counts, and phase.
- Resume after app restart shows the same state.
- Unsold random assignment follows remaining capacity and role rules.
- Display view never shows private fields.

Playwright's CI guidance includes installing browsers and running `npx playwright test`, and recommends stable CI worker settings for reproducibility. Source: <https://playwright.dev/docs/ci>

Use GitHub Actions only as a lightweight quality gate:

```text
npm ci
npm run typecheck
npm test
npm run build
npx playwright install --with-deps
npm run test:e2e
```

GitHub's Node.js CI guide documents Node setup, dependency install, build, and test workflows. Source: <https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs>

_Source:_ <https://fastify.dev/docs/latest/Guides/Testing/>, <https://vitest.dev/guide/coverage.html>, <https://playwright.dev/docs/ci>, <https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs>

### Deployment and Operations Practices

**Decision:** Treat deployment as a local event-mode release, not a cloud release.

Recommended event-mode command:

```text
npm run start:event -- --data-dir ./data/event-YYYY-MM-DD
```

Event mode should:

- Build the React app with Vite.
- Start one Fastify process bound to localhost.
- Serve `/api/*`, `/assets/*`, and the SPA from that process.
- Open with an operator URL such as `http://127.0.0.1:3000`.
- Expose `GET /api/health` with app version, DB status, and data directory.
- Refuse startup if the data directory is not writable.
- Write a JSON snapshot after committed commands.
- Keep all event-critical assets local.

SQLite should run in WAL mode unless testing proves rollback journal is better for the event machine. SQLite documents WAL as appending changes to a separate log and allowing readers and writers to coexist, while also noting checkpoint behavior that developers must be mindful of. The Auction Manager workload is small and local, so the main rule is to use one short write transaction per command and avoid long-running reads. Source: <https://www.sqlite.org/wal.html>

Use `better-sqlite3` transaction wrappers for command persistence. Each command should:

1. Load current state.
2. Validate and execute the domain transition.
3. Persist state changes.
4. Append action log entry.
5. Write or queue snapshot update.
6. Return the authoritative state DTO.

The live UI must treat a failed write as a hard stop for further mutating actions. An auction operator can retry or recover; the app must not continue in an in-memory-only state.

Deployment checklist:

- Confirm Node LTS version.
- Run `npm ci`.
- Run `npm run typecheck`.
- Run all tests.
- Run sample import rehearsal with event-like CSV/photos/logos.
- Run `npm run start:event`.
- Verify health endpoint.
- Verify projector/display URL.
- Verify restart and resume.
- Verify export/snapshot files.
- Disable machine sleep and notifications before the event.

_Source:_ <https://vite.dev/guide/build>, <https://www.sqlite.org/wal.html>, <https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md>

### Team Organization and Skills

**Decision:** Organize implementation around ownership of product risks, not around technology silos.

Minimum effective ownership for v1:

| Area | Owner focus | Required skills |
|---|---|---|
| Domain/rules | Correct auction behavior | TypeScript modeling, pure functions, test design |
| Persistence/recovery | No data loss during event | SQLite transactions, file IO, snapshots |
| Imports/assets | Clean setup flow | CSV parsing, file validation, image normalization |
| Operator UI | Fast live operation | React state, command UX, accessibility |
| Display UI | Readable projector board | Responsive layout, privacy filtering |
| Release rehearsal | Event readiness | Local deployment, backup, recovery drills |

The same developer can own multiple areas, but the review checklist should stay separated. For example, a UI change can pass visual review and still fail if it bypasses domain authority.

Relevant skill requirements:

- TypeScript strict modeling of discriminated unions for phases and commands.
- React reducer-style local UI state for view-only interaction state.
- Fastify route composition and validation.
- SQLite schema design and transactions.
- Zod schemas for boundary parsing.
- Playwright workflow tests.
- OWASP-inspired file upload hardening.
- Basic event operations: start, health check, backup, restart, resume.

React's `useReducer` documentation emphasizes pure reducer functions and action objects, which is useful for local UI interaction state. The authoritative auction reducer should live in `packages/domain`, while React reducers can handle panel toggles, pending command UI, and local form state. Source: <https://react.dev/reference/react/useReducer>

Lucide React is appropriate for operator controls because it provides standalone, typed, tree-shakable icon components. Source: <https://lucide.dev/guide/react>

_Source:_ <https://react.dev/reference/react/useReducer>, <https://lucide.dev/guide/react>, <https://fastify.dev/docs/latest/Reference/Routes/>

### Cost Optimization and Resource Management

**Decision:** Keep v1 close to zero infrastructure cost by avoiding hosted services and paid runtime dependencies.

Cost profile:

| Cost area | Recommended v1 choice | Reason |
|---|---|---|
| Hosting | Localhost only | No public deployment requirement |
| Database | SQLite file | No managed database cost |
| Auth | None for v1 local event | Single operator PC, no accounts |
| Storage | Local files | Photos/logos already local |
| CI | GitHub Actions free/minimal | Lightweight checks only |
| Packaging | npm scripts first | Avoid installer complexity until needed |
| Monitoring | Local health/log files | No cloud observability need |

Avoid adding Supabase, Firebase, hosted Postgres, Redis, S3, Docker runtime, Electron packaging, or analytics in v1. These can be useful later, but they do not reduce the event's main risks.

Use Sharp during setup to normalize photos and logos into web-friendly dimensions/formats. Sharp supports common formats and is designed for high-performance Node.js image processing. Normalizing assets before the event reduces browser memory pressure and avoids live resizing work. Source: <https://sharp.pixelplumbing.com/>

Use CSV Parse for player/team imports. It supports Node streams plus callback and sync APIs. For this small event app, the sync API may be acceptable for simplicity after upload size limits, but the parser should still produce structured import issues rather than failing with raw parser errors. Source: <https://csv.js.org/parse/>

Tailwind CSS with the Vite plugin is a low-operational-cost styling choice. Tailwind describes its output as generated static CSS with zero runtime, which fits the event-mode goal of avoiding runtime UI dependencies beyond React. Source: <https://tailwindcss.com/docs/installation/using-vite>

_Source:_ <https://sharp.pixelplumbing.com/>, <https://csv.js.org/parse/>, <https://tailwindcss.com/docs/installation/using-vite>

### Risk Assessment and Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Rule drift between UI and server | Invalid sale or wrong assignment during event | Put all rule decisions in `packages/domain`; UI only requests commands |
| Incomplete import validation | Bad player/team data discovered live | Setup review screen with blocking errors and warnings |
| File upload abuse or accidental bad files | App crash, storage bloat, bad display assets | Allowlisted extensions, size limits, generated filenames, signature/content validation |
| Persistence write failure | Lost auction state | One SQLite transaction per command; block further writes on failure; snapshot after commit |
| Undo inconsistency | Operator cannot recover from mistake | Action log with inverse/before-after payloads; test every undoable command |
| Live UI latency | Auction flow stalls | Normalize images during setup; no filesystem scans during live loop |
| Projector exposes private data | Privacy breach | Separate display DTO; no email/mobile/payment/private fields |
| Browser refresh/restart loses state | Event disruption | `GET /api/state` resume path; restart rehearsal |
| Overbuilt architecture | Slower delivery and more failure modes | Local modular monolith, no cloud, no distributed services |
| CI confidence gap | Broken event build | Typecheck, unit tests, route tests, Playwright event smoke tests |

OWASP's file upload guidance recommends allowlisted extensions, not trusting client content type, generated filenames, size limits, and secure storage choices. Auction Manager should apply those controls even though it is local-only, because the operator will import arbitrary image folders and CSVs. Source: <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html>

OWASP REST guidance recommends validating content types, safe response types, audit logs, error handling, and semantically appropriate HTTP status codes. For this app, that maps to `400` for invalid commands, `409` for phase/rule conflicts, `413` for oversized uploads, `415` for unsupported media types, and `500` only for unexpected failures without leaking stack traces to the UI. Source: <https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html>

_Source:_ <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html>, <https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html>

## Technical Research Recommendations

### Implementation Roadmap

Recommended implementation order:

| Phase | Outcome | Exit criteria |
|---|---|---|
| 1. Project scaffold | npm workspaces, TypeScript strict, test runner | `npm run typecheck`, `npm test`, `npm run build` pass |
| 2. Domain core | Auction phases, commands, rule validation | Domain tests cover sale, block, undo, unsold assignment |
| 3. Persistence | SQLite schema, transactions, action log, snapshots | Restart/resume tests pass with temporary DB |
| 4. Fastify API | Thin command/query endpoints | Route tests pass via `fastify.inject()` |
| 5. Setup imports | CSV/photo/logo import and review issues | Invalid setup blocks auction start |
| 6. Operator UI | Live controls for reveal, bid, sold, unsold, undo | Playwright happy path passes |
| 7. Display UI | Projector-safe board | Privacy and layout smoke tests pass |
| 8. Event mode | Single local process serving API and SPA | `start:event`, health, restart, resume verified |
| 9. Rehearsal | Dry run with sample event data | Operator checklist completed |

Do not build optional packaging, remote access, auth, or cloud sync until v1 has completed a full dry run.

### Technology Stack Recommendations

Final v1 stack:

| Layer | Recommendation |
|---|---|
| Runtime | Node.js 24 LTS |
| Package manager | npm workspaces |
| Language | TypeScript strict |
| Web UI | React 19 + Vite |
| Styling | Tailwind CSS 4 with CSS variables |
| Icons | Lucide React |
| Server | Fastify 5 |
| Validation | Zod |
| Database | SQLite via `better-sqlite3` |
| CSV imports | `csv-parse` |
| Image processing | Sharp |
| Unit/integration tests | Vitest |
| Browser tests | Playwright |
| Deployment | Localhost-only Node process serving API and SPA |

Explicit v1 non-goals remain: Next.js, GraphQL, Supabase/Firebase, PostgreSQL, Redis, Docker-required runtime, Electron-first packaging, cloud hosting, authentication, remote bidding, and SaaS-style account management.

### Skill Development Requirements

Before implementation, the developer should be comfortable with:

- Modeling TypeScript discriminated unions for phases and commands.
- Writing pure domain functions and table-driven tests.
- Creating Zod schemas and converting validation errors into user-facing setup issues.
- Using Fastify route plugins and `inject()` tests.
- Designing small SQLite schemas and wrapping writes in transactions.
- Building Vite React apps with a static production output.
- Writing Playwright tests around stable locators and event workflows.
- Applying OWASP upload controls without overbuilding auth/cloud security.
- Running a local release rehearsal from a clean checkout.

### Success Metrics and KPIs

Use product-specific operational metrics rather than generic SaaS metrics:

| Metric | Target for v1 |
|---|---|
| Setup import completion | Valid sample event data imports with zero blocking issues |
| Invalid setup blocking | Bad CSV/assets prevent `Start Auction` |
| Command persistence latency | Live commands commit fast enough to feel immediate on event machine |
| Invalid sale escapes | Zero known rule-invalid sales possible through UI/API |
| Undo correctness | Every undoable command restores state fully |
| Restart recovery | App resumes latest committed state after process restart |
| Snapshot/export availability | Latest snapshot/export exists after committed actions |
| Display privacy | No private fields render in board DTO or UI |
| E2E rehearsal pass | Full auction dry run completes before event |
| Operator confidence | Operator can run start, resume, undo, export without developer help |

DORA metrics are useful for implementation discipline, but should be applied in context. DORA identifies throughput and instability metrics such as change lead time, deployment frequency, failed deployment recovery time, change fail rate, and deployment rework rate. For Auction Manager v1, the practical adaptation is small batches, fast recovery from broken builds, and a rehearsal loop that proves the local release before the live event. Source: <https://dora.dev/guides/dora-metrics/>

_Source:_ <https://dora.dev/guides/dora-metrics/>

---

# Auction Manager v1 Local-First Stack: Comprehensive Technical Research Synthesis

## Executive Summary

Auction Manager v1 should be built as a local-first, single-PC web application, not as a SaaS, cloud, microservices, or desktop-packaging-first product. The product requirements are operationally narrow but correctness-sensitive: run one live auction, import local CSV/photos/logos, mirror a clear display board, block invalid sales, support undo and recovery, and avoid showing private player fields. That shape rewards a small, inspectable stack with strong domain modeling and durable local persistence.

The recommended stack is TypeScript across the system, React 19 + Vite for the browser UI, Fastify 5 on Node.js 24 LTS for the localhost API/static host, SQLite through `better-sqlite3` for event state, Zod for boundary validation, `csv-parse` for imports, Sharp for image normalization, Tailwind CSS 4 + CSS variables for styling, Lucide React for icons, Vitest for domain/API/persistence tests, and Playwright for workflow tests. Current-source verification supports these choices: Node's release guidance says production applications should use Active or Maintenance LTS releases, Vite targets fast modern web development and production static builds, React 19 is stable, Fastify is actively documented, and SQLite remains a reliable embedded database.

The strategic conclusion is that v1 should optimize for event reliability, rule correctness, and operator recovery rather than general scalability. The architecture should be a local modular monolith with logical boundaries: React UI, Fastify API, domain core, SQLite/file adapters, import pipeline, and display projection. The most important engineering invariant is that every auction rule and phase transition lives in `packages/domain`; UI and API code should request commands, not reimplement auction decisions.

**Key Technical Findings:**

- Node.js 24 LTS is the right runtime target because it is current LTS and Node recommends Active LTS or Maintenance LTS for production applications. Source: <https://nodejs.org/en/about/previous-releases>
- React 19 + Vite is sufficient for the operator and display UI without Next.js, SSR, React Server Components, or a hosted deployment platform. Sources: <https://react.dev/blog/2024/12/05/react-19>, <https://vite.dev/guide/>
- Fastify provides a small, high-performance HTTP layer with route/validation/test support while avoiding framework weight that does not help the local event use case. Source: <https://fastify.dev/docs/latest/>
- SQLite fits because the event state is local, relational, transactional, and small. SQLite documents transactional behavior and WAL support for local read/write patterns. Sources: <https://www.sqlite.org/transactional.html>, <https://www.sqlite.org/wal.html>
- Full event sourcing, microservices, GraphQL, Redis, cloud databases, Docker-required runtime, and Electron-first packaging add complexity without reducing the core v1 risks.

**Technical Recommendations:**

- Build `packages/domain` first and make it the only authority for auction rules, phases, undo, and assignment.
- Use command-oriented same-origin HTTP endpoints, with Fastify routes as thin adapters over domain commands.
- Persist each mutating command in one SQLite transaction and append an action log entry for undo/recovery.
- Normalize CSV and image inputs during setup, not during live bidding.
- Gate v1 quality on domain tests, Fastify injection tests, persistence restart tests, and a small set of Playwright event-flow tests.

## Table of Contents

1. Technical Research Introduction and Methodology
2. Technical Landscape and Architecture Analysis
3. Implementation Approaches and Best Practices
4. Technology Stack Evolution and Current Trends
5. Integration and Interoperability Patterns
6. Performance and Scalability Analysis
7. Security and Compliance Considerations
8. Strategic Technical Recommendations
9. Implementation Roadmap and Risk Assessment
10. Future Technical Outlook and Innovation Opportunities
11. Technical Research Methodology and Source Verification
12. Technical Appendices and Reference Materials
13. Technical Research Conclusion

## 1. Technical Research Introduction and Methodology

### Technical Research Significance

Auction Manager is technically significant because it sits in a deceptively risky product category: a small local app that must behave correctly under live-event pressure. The business context does not require internet scale, multi-user accounts, hosted infrastructure, or remote collaboration. It does require accurate rule enforcement, resilient local state, a clear operator workflow, and a privacy-safe display surface.

The stack decision therefore has to resist two bad defaults: overbuilding with cloud/platform machinery and underbuilding with browser-only state. A local web app with a real server and embedded database is the middle path. It preserves the speed and familiarity of web development while giving the auction durable state, file import control, and recovery behavior.

_Technical Importance:_ The chosen stack must make auction invariants explicit and testable.  
_Business Impact:_ A correct local app can run the event with minimal setup cost and no internet dependency.  
_Source:_ <https://nodejs.org/en/about/previous-releases>, <https://www.sqlite.org/transactional.html>

### Technical Research Methodology

The research used five analysis lenses:

- **Product fit:** PRD, brief, and UX constraints were treated as the primary decision frame.
- **Current-source verification:** Runtime, framework, database, security, and testing claims were checked against current official documentation where possible.
- **Architecture trade-off analysis:** Local modular monolith, N-tier, microservices, event-driven, CQRS, and event sourcing were compared against the actual v1 workload.
- **Implementation feasibility:** Tooling choices were evaluated for developer speed, testability, local operations, and event rehearsal.
- **Risk reduction:** Recommendations prioritize invalid-action prevention, persistence correctness, recovery, import safety, and display privacy.

The research period is current as of 2026-07-05. Confidence is high for the main stack and architecture. Confidence is medium for real-world image format support until sample player photos are tested on the target machine, especially if HEIC/phone-photo variants are common.

### Technical Research Goals and Objectives

**Original Technical Goals:** Select a practical, defensible implementation stack for the `auction_manager` product based on existing project requirements, UX direction, and current technology guidance.

**Achieved Technical Objectives:**

- Finalized the runtime, frontend, backend, persistence, import, styling, testing, and local deployment stack.
- Defined the integration contract between React, Fastify, the domain package, SQLite, and file assets.
- Chose a local modular monolith as the v1 architecture and rejected cloud/distributed alternatives.
- Produced a practical implementation order with test and operational gates.
- Documented security, privacy, recovery, and event-readiness risks.

## 2. Technical Landscape and Architecture Analysis

### Current Technical Architecture Patterns

The final architecture is a local modular monolith: one deployable local Node process in event mode, with strict internal module boundaries. Microsoft describes architecture styles as families of architectures with specific characteristics and notes that N-tier separates presentation, business logic, and data access. For Auction Manager, physical tier separation is unnecessary, but logical separation is valuable. Source: <https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/>

Recommended structure:

| Area | Responsibility |
|---|---|
| `apps/web` | React operator UI and display board |
| `apps/server` | Fastify routes, static serving, startup, uploads |
| `packages/domain` | Auction entities, commands, rules, phases, undo |
| `packages/persistence` | SQLite repositories, action log, snapshots |
| `packages/shared` | DTOs, constants, validation schemas where appropriate |

The domain package should define the bounded context: one auction, explicit phases, command types, players, teams, role counts, budgets, and sale/assignment outcomes. Routes and React components should not compute whether a sale is valid; they should call the same domain command functions used by tests.

_Dominant Pattern:_ Local modular monolith.  
_Architectural Evolution:_ Can later evolve to packaged desktop or multi-device local network mode, but those are not v1 needs.  
_Architectural Trade-offs:_ Lower operational complexity and high local reliability in exchange for no remote collaboration.  
_Source:_ <https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/>

### System Design Principles and Best Practices

Core design principles:

- **Domain authority:** One source of truth for auction state transitions.
- **Command atomicity:** Every mutating command commits or fails as a unit.
- **Recovery first:** Restart/resume must be part of normal design, not a later patch.
- **Setup validation before live mode:** Bad CSV/assets should be caught before the event begins.
- **Privacy by projection:** Display board DTOs must exclude private fields by construction.
- **Local operability:** The app must run without internet during the auction.

SQLite's transactional guarantee is central: changes inside a transaction happen completely or not at all, even under interruption scenarios. This supports the product requirement that live auction state should not become half-sold or partially assigned. Source: <https://www.sqlite.org/transactional.html>

## 3. Implementation Approaches and Best Practices

### Current Implementation Methodologies

Implementation should proceed from correctness outward:

1. Domain model and command tests.
2. SQLite schema, transactions, action log, snapshots.
3. Fastify command/query routes with validation.
4. Setup import pipeline.
5. React operator UI.
6. Display board.
7. Event-mode build/start/rehearsal.

This is similar in spirit to incremental modernization patterns: Microsoft describes the Strangler Fig pattern as replacing functionality gradually to reduce risk. Auction Manager is greenfield, but the same delivery principle applies: implement and verify thin vertical slices rather than building a large UI shell first. Source: <https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig>

### Implementation Framework and Tooling

npm workspaces should be used for the monorepo. npm documents workspaces as managing multiple local packages from a single root package and automatically linking them during install. This is sufficient for `apps/*` and `packages/*` without introducing Nx, Turborepo, or pnpm. Source: <https://docs.npmjs.com/cli/v10/using-npm/workspaces/>

TypeScript strict mode should be enabled immediately. TypeScript documents that `strictNullChecks` distinguishes `null` and `undefined`, catching code that assumes missing values are present. In this app, missing current player, selected team, or budget fields are exactly the kind of errors that should fail during development. Source: <https://www.typescriptlang.org/tsconfig/#strictNullChecks>

Zod should validate API bodies, CSV rows, server config, import metadata, and exported snapshots. Zod's `safeParse` returns a success/error result suitable for user-facing setup validation and API errors. Source: <https://zod.dev/basics>

Testing should use Vitest for unit/integration tests and Playwright for browser workflows. Fastify's `inject()` allows route testing without starting a network server, which keeps API tests fast and deterministic. Sources: <https://vitest.dev/guide/coverage.html>, <https://playwright.dev/docs/ci>, <https://fastify.dev/docs/latest/Guides/Testing/>

## 4. Technology Stack Evolution and Current Trends

### Current Technology Stack Landscape

The stack is intentionally mainstream. Stack Overflow's 2025 technology survey shows JavaScript, TypeScript, Node.js, React, npm, Vite, SQL, and SQLite remain familiar to a broad developer base. That matters because v1 should not depend on niche tooling for a community-event app. Source: <https://survey.stackoverflow.co/2025/technology/>

Final stack:

| Layer | Choice |
|---|---|
| Runtime | Node.js 24 LTS |
| Package manager | npm workspaces |
| Language | TypeScript strict |
| UI | React 19 + Vite |
| Styling | Tailwind CSS 4 + CSS variables |
| Icons | Lucide React |
| Server | Fastify 5 |
| Validation | Zod |
| Database | SQLite via `better-sqlite3` |
| CSV imports | `csv-parse` |
| Images | Sharp |
| Unit/API tests | Vitest |
| Browser tests | Playwright |
| Event runtime | Single localhost Node process |

React 19 is stable and available on npm, with features for pending state and form actions. Auction Manager can use React 19 without adopting React Server Components or SSR. Source: <https://react.dev/blog/2024/12/05/react-19>

Vite provides a dev server and production build command for modern web projects. The event build should be static assets served by Fastify. Source: <https://vite.dev/guide/>

### Technology Adoption Patterns

The adoption pattern should be conservative:

- Adopt one language across the system.
- Keep one deployment process.
- Keep one embedded database.
- Keep one command API boundary.
- Add packaging/cloud/network features only after v1 proves the live event flow.

Explicitly deferred:

- Next.js: unnecessary SSR/platform complexity for a local app.
- Supabase/Firebase/Postgres: unnecessary hosted persistence.
- Redis: no distributed cache or queue need.
- Docker-required runtime: adds event-machine setup risk.
- Electron-first packaging: useful later, but not necessary to validate v1.
- GraphQL/gRPC: no integration ecosystem or complex query graph.

## 5. Integration and Interoperability Patterns

### Current Integration Approaches

Use a same-origin command/query HTTP API:

- `GET /api/state`
- `POST /api/setup/player-csv`
- `POST /api/setup/player-photos`
- `POST /api/setup/team-csv`
- `POST /api/setup/team-logos`
- `POST /api/auction/start`
- `POST /api/auction/reveal-next`
- `POST /api/auction/select-team`
- `POST /api/auction/increase-bid`
- `POST /api/auction/mark-sold`
- `POST /api/auction/mark-unsold`
- `POST /api/auction/unsold/start`
- `POST /api/auction/unsold/assign-random`
- `POST /api/auction/undo`
- `POST /api/auction/reset`
- `POST /api/auction/close`

Fastify route handlers should parse and validate input, call domain commands, commit persistence, and return the authoritative state DTO. Fastify's route documentation supports this style directly. Source: <https://fastify.dev/docs/latest/Reference/Routes/>

Multipart setup imports should use Fastify's multipart plugin, with size limits and structured import results. Static React assets and normalized image/logo files should be served by Fastify static routes. Sources: <https://github.com/fastify/fastify-multipart>, <https://github.com/fastify/fastify-static>

### Interoperability Standards and Protocols

Use standard browser and HTTP capabilities:

- Fetch API for same-origin JSON commands.
- FormData/multipart for setup imports.
- JSON for state and command DTOs.
- CSV for source player/team inputs.
- Static file serving for normalized images and logos.

Avoid WebSockets for v1 unless testing shows multi-window display updates need push. A simple polling or manual refresh strategy is acceptable for one operator PC and one display if latency is acceptable. WebSocket/SSE can be added later behind the same server state model.

Sources: <https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API>, <https://developer.mozilla.org/en-US/docs/Web/API/FormData>, <https://www.rfc-editor.org/rfc/rfc8259>, <https://www.rfc-editor.org/rfc/rfc4180>

## 6. Performance and Scalability Analysis

### Performance Characteristics and Optimization

Auction Manager's performance target is local responsiveness, not distributed throughput. The key performance decisions are:

- Use short SQLite transactions per command.
- Avoid filesystem scans during the live auction.
- Normalize images during setup.
- Return compact state DTOs.
- Keep display board rendering simple and stable.
- Avoid real-time background workers for core commands.

SQLite WAL mode can allow reads and writes to coexist by appending changes to a WAL file, but it introduces checkpointing considerations. For this app, use short reads, short writes, and rehearsal on the target machine. Source: <https://www.sqlite.org/wal.html>

Sharp should normalize source photos and logos into predictable dimensions and formats. Sharp documents high-performance Node.js image processing and support for common image formats. Source: <https://sharp.pixelplumbing.com/>

### Scalability Patterns and Approaches

The correct scalability stance is "scale to the room":

- One auction.
- One operator.
- One local machine.
- One display.
- Dozens to hundreds of players, not millions.
- Local files, not object storage.

Microservices and event-driven architectures are rejected for v1 because they introduce service discovery, distributed consistency, brokers, deployment coordination, and observability needs. Microsoft notes microservices introduce significant complexity around service discovery, data consistency, and distributed system management. Source: <https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/>

## 7. Security and Compliance Considerations

### Security Best Practices and Frameworks

The v1 app is local-only, but it still handles untrusted input: CSV files, photos, and logos. Security should focus on upload safety, privacy, and avoiding accidental exposure.

Required controls:

- Bind server to localhost by default.
- Do not enable broad CORS.
- Allowlist upload extensions and expected MIME/signatures.
- Do not trust client-provided content type.
- Generate internal filenames.
- Set file and request size limits.
- Store files in controlled asset folders.
- Never render email, mobile, payment, or private fields on display board DTOs.
- Return safe API errors without stack traces.

OWASP file upload guidance recommends extension allowlists, file type validation, generated filenames, size limits, and safe storage choices. Source: <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html>

OWASP REST guidance recommends content type validation, audit logs, safe error handling, security headers, CORS care, and semantically appropriate HTTP status codes. Source: <https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html>

### Compliance and Regulatory Considerations

The product should treat private player fields as sensitive even though it is not a public SaaS. The main compliance-style requirement is data minimization:

- Import only fields needed for auction operation.
- Persist private fields only if required by setup or administration.
- Exclude private fields from board DTOs.
- Avoid analytics and external telemetry in v1.
- Keep event data local and exportable.

There is no v1 need for OAuth, account RBAC, payment compliance, public TLS termination, or cloud audit controls.

## 8. Strategic Technical Recommendations

### Technical Strategy and Decision Framework

The strategy is to make the app boring in infrastructure and rigorous in rules.

Recommended decision framework:

1. If a technology does not improve event reliability, rule correctness, recovery, setup validation, or operator speed, defer it.
2. If logic affects sale validity, assignment, budget, squad size, role counts, or undo, put it in `packages/domain`.
3. If input comes from outside the process, validate it with Zod or a structured parser.
4. If a command changes auction state, wrap it in one SQLite transaction.
5. If data appears on the display board, use a privacy-filtered DTO.

### Competitive Technical Advantage

For this product, technical advantage is not a novel framework. It is operational confidence:

- The operator can rehearse the whole auction.
- The app blocks invalid states.
- Undo is trustworthy.
- Restart/resume is tested.
- The display board is clear and privacy-safe.
- Setup issues are visible before the event starts.

This is the difference between a demo and a tool that can run a live auction without developer intervention.

## 9. Implementation Roadmap and Risk Assessment

### Technical Implementation Framework

Recommended roadmap:

| Phase | Outcome | Exit Criteria |
|---|---|---|
| 1. Scaffold | npm workspaces, TypeScript strict, Vitest | typecheck/test/build pass |
| 2. Domain | Phases, commands, validation, undo | domain invariant tests pass |
| 3. Persistence | SQLite schema, transactions, action log | restart/resume tests pass |
| 4. API | Fastify command/query routes | `inject()` route tests pass |
| 5. Imports | CSV/photo/logo setup flow | invalid setup blocks start |
| 6. Operator UI | Live auction controls | Playwright happy path passes |
| 7. Display UI | Projector-safe board | privacy/layout checks pass |
| 8. Event Mode | single local process | health/start/restart verified |
| 9. Rehearsal | dry run with sample data | operator checklist complete |

### Technical Risk Management

| Risk | Severity | Mitigation |
|---|---:|---|
| Rule drift between UI/API/persistence | High | Single domain command package |
| Invalid sale escapes | High | Domain tests plus API conflict responses |
| Persistence failure during auction | High | SQLite transactions, hard-stop UI on write failure |
| Bad import data discovered live | High | Setup review with blocking errors |
| Undo restores partial state | High | Action log/inverse tests for every undoable command |
| Private data appears on board | High | Separate display DTO and Playwright privacy check |
| Large photos slow live board | Medium | Sharp normalization during setup |
| Event machine environment mismatch | Medium | Pre-event clean install and rehearsal |
| Overbuilding cloud/distributed pieces | Medium | Enforce v1 non-goals |

## 10. Future Technical Outlook and Innovation Opportunities

### Emerging Technology Trends

Near-term opportunities after v1:

- Local network display mode if multiple screens need real-time updates.
- Optional Electron or Tauri packaging after the web app proves useful.
- Import templates and validation profiles for future auction formats.
- Richer projector themes while preserving privacy DTOs.
- Automated event backup/export after each command.

Medium-term opportunities:

- Multi-event history if the league repeats auctions.
- Role/rule configuration UI if rules vary by season.
- Read-only remote display on a trusted LAN.
- Print/export reports for teams and organizers.

Long-term opportunities:

- Hosted mode only if the product expands to remote bidding, multiple organizers, accounts, or persistent league management. None of those are v1 requirements.

### Innovation and Research Opportunities

The best research opportunities are domain-specific:

- Better unsold assignment algorithms that optimize fairness under role/budget constraints.
- Operator workload reduction through command batching or keyboard workflows.
- Projection layouts optimized for room readability.
- Dry-run simulation to catch auction rule configuration errors before the event.

## 11. Technical Research Methodology and Source Verification

### Comprehensive Technical Source Documentation

Primary technical sources:

- Node.js releases and LTS guidance: <https://nodejs.org/en/about/previous-releases>
- React 19 stable release: <https://react.dev/blog/2024/12/05/react-19>
- Vite guide and production build guidance: <https://vite.dev/guide/>, <https://vite.dev/guide/build>
- Fastify docs: <https://fastify.dev/docs/latest/>
- SQLite home, transactions, WAL: <https://www.sqlite.org/index.html>, <https://www.sqlite.org/transactional.html>, <https://www.sqlite.org/wal.html>
- npm workspaces: <https://docs.npmjs.com/cli/v10/using-npm/workspaces/>
- TypeScript strict/null checks: <https://www.typescriptlang.org/tsconfig/#strictNullChecks>
- Zod basics: <https://zod.dev/basics>
- CSV Parse: <https://csv.js.org/parse/>
- Sharp: <https://sharp.pixelplumbing.com/>
- Tailwind + Vite: <https://tailwindcss.com/docs/installation/using-vite>
- Lucide React: <https://lucide.dev/guide/react>
- Vitest coverage: <https://vitest.dev/guide/coverage.html>
- Playwright CI: <https://playwright.dev/docs/ci>
- GitHub Actions Node CI: <https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs>
- OWASP File Upload and REST Security: <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html>, <https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html>
- Microsoft architecture styles and Strangler Fig pattern: <https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/>, <https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig>
- DORA metrics: <https://dora.dev/guides/dora-metrics/>

Technical web search themes:

- Current Node.js LTS and production guidance.
- Current Vite, React, Fastify, SQLite documentation.
- REST, multipart, JSON, CSV, and browser API guidance.
- Architecture style trade-offs, CQRS, event sourcing, microservices.
- Testing and CI practices for TypeScript/Node/React apps.
- File upload and REST security controls.

### Technical Research Quality Assurance

Source verification approach:

- Prefer official documentation for tools and standards.
- Use independent architecture/security sources for cross-checking trade-offs.
- Treat survey/adoption data as context, not as primary proof of fit.
- Mark implementation-sensitive uncertainties explicitly.

Confidence levels:

- **High:** Local modular monolith, Node LTS, React/Vite UI, Fastify API, SQLite persistence, TypeScript strict, Zod validation, Vitest/Playwright testing.
- **Medium:** Exact image format support and performance on the target event PC until real sample assets are tested.
- **Low/Deferred:** Cloud hosting, multi-operator collaboration, remote bidding, packaged desktop distribution, and long-term league management because these are outside v1 scope.

Limitations:

- No implementation benchmark has been run yet because the repo does not contain the app implementation.
- Real CSV/photo/logo samples should be tested before final event readiness.
- Event-machine OS, browser, and display setup should be verified during rehearsal.

## 12. Technical Appendices and Reference Materials

### Detailed Technical Data Tables

**Rejected Technology Decisions**

| Technology/Pattern | v1 Decision | Reason |
|---|---|---|
| Next.js | Reject | SSR/platform features do not help local event mode |
| Supabase/Firebase | Reject | Hosted persistence conflicts with local/no-internet requirement |
| PostgreSQL | Reject | Strong DB, but unnecessary server setup for one PC |
| Redis | Reject | No distributed cache/queue need |
| GraphQL | Reject | Adds schema/query complexity without client need |
| gRPC | Reject | Browser-local command API does not need it |
| Microservices | Reject | Distributed complexity exceeds product scope |
| Event sourcing | Reject | Action log is enough for undo/recovery |
| Docker-required runtime | Reject | Adds event machine setup risk |
| Electron-first | Defer | Useful later only if packaging becomes required |

**Architecture Invariants**

| Invariant | Enforcement |
|---|---|
| Domain owns rules | `packages/domain` command tests |
| Commands are atomic | SQLite transaction per mutation |
| Display is privacy-safe | Separate DTO and UI test |
| Setup blocks bad imports | Structured import issues |
| Undo is trustworthy | Action log and inverse tests |
| Event can recover | Health, snapshot, restart/resume test |

### Technical Resources and References

Technical standards and references:

- JSON: <https://www.rfc-editor.org/rfc/rfc8259>
- CSV: <https://www.rfc-editor.org/rfc/rfc4180>
- Fetch API: <https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API>
- FormData: <https://developer.mozilla.org/en-US/docs/Web/API/FormData>
- OWASP API Security: <https://owasp.org/API-Security/>

Open source projects and communities:

- Node.js: <https://nodejs.org/>
- React: <https://react.dev/>
- Vite: <https://vite.dev/>
- Fastify: <https://fastify.dev/>
- SQLite: <https://www.sqlite.org/>
- Playwright: <https://playwright.dev/>
- Vitest: <https://vitest.dev/>

## 13. Technical Research Conclusion

### Summary of Key Technical Findings

The finalized stack is intentionally small, local, and testable. Auction Manager should be a TypeScript local web app with a React/Vite frontend, Fastify backend, SQLite persistence, and a shared domain core. The application should run as one local Node process in event mode and avoid dependencies on cloud services, public deployment, accounts, remote bidding, or distributed runtime components.

The core architecture decision is to put every auction rule in the domain package and make UI/API/persistence layers adapters around that domain. This is the strongest defense against invalid sales, inconsistent undo, and recovery bugs.

### Strategic Technical Impact Assessment

This stack keeps v1 implementation effort focused on the product's real operational risks: setup validation, auction flow speed, rule correctness, undo, recovery, and display privacy. It also leaves sensible future paths open: desktop packaging, LAN display mode, multi-event history, or hosted mode can be added later without distorting the v1 design.

### Next Steps Technical Recommendations

1. Scaffold npm workspaces with strict TypeScript.
2. Implement and test `packages/domain` before UI polish.
3. Add SQLite persistence and restart/resume tests.
4. Build Fastify routes as thin domain adapters.
5. Implement setup import review and image normalization.
6. Add operator/display UI and Playwright event flows.
7. Run a full dry-run rehearsal on the target event PC.

**Technical Research Completion Date:** 2026-07-05  
**Research Period:** Current comprehensive technical analysis  
**Source Verification:** All major technical claims cited with current sources  
**Technical Confidence Level:** High for v1 stack and architecture; medium for image-format handling until sample assets are tested

_This comprehensive technical research document serves as the authoritative technical reference for implementing Auction Manager v1._
