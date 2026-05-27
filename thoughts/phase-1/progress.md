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
