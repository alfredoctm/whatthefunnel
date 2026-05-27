# Phase 1 — Progress

## 2026-05-27

### Tooling block
- `.nvmrc` (Node 22), `api/package.json` with all deps + npm scripts, `api/tsconfig.json` + `tsconfig.build.json` (strict + ESM), `api/jest.config.js` (ts-jest ESM preset), `api/.eslintrc.json` (TS-aware), `.prettierrc.json` (repo root).
- `npm install` in `api/`: 428 packages, 0 vulnerabilities.
- Tool versions verified: prettier 3.8, eslint 8.57, tsc 5.9, jest 29.7.
- `scripts/tdd green` extended with second bootstrap escape (no `.ts` under `api/src/`) so it can flip cleanly during the Tooling → Slice 1 transition.

### Infrastructure block (files written; smoke test pending)
- `docker-compose.yml` — `clickhouse` (image 24.8) + `api` services, healthcheck on `/ping`, named volume `clickhouse-data`, schema mount from `./clickhouse/init/`.
- `clickhouse/init/01_events.sql` — events table with the schema designed by `clickhouse-expert` (MergeTree, `ORDER BY (event_name, toStartOfHour(timestamp), user_id, timestamp)`, monthly partitions, Map(String,String) properties, bloom-filter skip indexes). Rationale captured in `findings.md`.
- `api/Dockerfile` — multi-stage: build runs `tsc --build`, runtime copies `dist/` + prod-only `node_modules`. Won't build until Slice 1 creates `src/server.ts`.
- `.env.example` — `CLICKHOUSE_URL`, `PORT`, `LOG_LEVEL` documented with both docker-internal and host-local defaults.

### Verified
- `docker compose up -d clickhouse` brought up cleanly. ClickHouse healthcheck flipped to `healthy` in ~5s.
- `SHOW TABLES` → `events` (auto-loaded from `clickhouse/init/01_events.sql`).
- `DESCRIBE TABLE events` matches the DDL (6 columns, codecs intact, defaults for `event_id` + `ingested_at`).
- All 3 bloom-filter skip indexes present (`idx_user_id`, `idx_prop_keys`, `idx_prop_vals`).
- Smoke insert + select round-trips (event with Map properties, server-generated `event_id` UUID, server-stamped `ingested_at`). Test row truncated after.
- ClickHouse left running for Slice 1 (warm start).

### Slice 1 — Ingest one event (green)
- Acceptance test (`api/test/acceptance/ingest.test.ts`) flips through RED → GREEN. Hits `POST /events` via `fastify.inject`, asserts 201 + that the event landed in the `InMemoryEventWriter` fake's `writes` array.
- Domain `Event` (api/src/domain/Event.ts) — 6 readonly fields matching the schema.
- Port `EventWriterPort` (api/src/application/ports/EventWriterPort.ts) — single-method TS interface.
- Command + handler: `IngestEventCommand` + `IngestEventHandler`. Handler generates `eventId` (UUID) and `ingestedAt` (Date.now). Acceptance test covers the handler's behavior; no separate unit test (per testing strategy).
- Inbound HTTP adapter: `registerEventsRoutes(app, ingestHandler)`. Takes the handler directly — does NOT import composition's `Deps` type.
- Composition: `buildApp({ eventWriter })` factory — Slice 1's `Deps` only has `eventWriter`; Slice 2 will extend it with `eventReader` (deviation from the plan, which speculatively listed both — corrected here to honor vertical slicing).
- Production entry: `api/src/server.ts` reads env (`CLICKHOUSE_URL`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `PORT`), constructs `ClickHouseEventWriter` against `@clickhouse/client`, calls `buildApp`, listens.
- Outbound adapter: `ClickHouseEventWriter` implements `EventWriterPort`. Insert via `JSONEachRow` with a date-format helper for DateTime64.
- Parametrized integration test: `EventWriter.contract.test.ts` runs the same test body against `InMemoryEventWriter` and `ClickHouseEventWriter`. Both pass. This is the contract-parity guarantee.
- **Slice closeout via `scripts/tdd green`** — verified `npm run test:fast` (1 acceptance test) + `tsc --noEmit` both pass before flipping state. Audit log: `tdd_green {tests: passed, typecheck: passed}`. `api/src/**` re-locked.
- **Walking Skeleton half done.** Write path proven end-to-end (HTTP → handler → port → adapter → ClickHouse). Slice 2 (read path) is next.

### Slice 2 — Read events back (green)
- Acceptance test (`api/test/acceptance/read-events.test.ts`) — 3 tests: order, limit, `before` cursor. Hermetic — seeds `InMemoryEventReader` directly; doesn't depend on the writer.
- `InMemoryEventReader` (`api/test/fakes/InMemoryEventReader.ts`) — `implements EventReaderPort`. Optional seed-events constructor; `findByUser` filters by user, applies `before`, sorts DESC, slices to limit.
- Port: `EventReaderPort` — separate interface from writer per CQRS. Signature `findByUser(userId, { limit, before? })`.
- Query + handler: `GetUserEventsQuery` / `GetUserEventsHandler`. Handler is thin (per testing strategy, no unit test for it).
- Inbound HTTP adapter: extended `events.ts` route file with `GET /users/:user_id/events`. Signature of `registerEventsRoutes` changed to take a `{ ingest, getUserEvents }` handlers object. Slice 1's test updated to pass empty reader.
- Composition: Deps now requires both ports. `buildApp({ eventWriter, eventReader })`.
- Outbound adapter: `ClickHouseEventReader` — parameterized SQL with conditional `before` clause; row-to-domain mapping mirrors the writer's DateTime64 format helper.
- Production wiring: `server.ts` constructs both ClickHouse adapters and passes them.
- Parametrized integration test: `EventReader.contract.test.ts` — 4 tests × 2 implementations = 8 passing.
- Slice closeout via `scripts/tdd green` — passing acceptance (4 tests) + typecheck. Audit log: `tdd_green {tests: passed, typecheck: passed}`.
- **Walking Skeleton complete.** Both write and read paths verified by parametrized contract tests against real ClickHouse + in-memory fake. 12/12 integration green, 4/4 acceptance green.
