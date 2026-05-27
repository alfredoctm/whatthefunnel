# Phase 1 — Findings

## 2026-05-27 — Tooling

- **Node version pin.** `.nvmrc` set to `22` (current LTS). Local dev box was running v25; user should `nvm install 22 && nvm use 22` (or change `.nvmrc` if they want to stay on 25). Docker image uses `node:22-alpine` to match.
- **ESLint version.** Picked `8.57.1` (last 8.x) over ESLint 9 to keep `.eslintrc.json` from the plan. ESLint 9 requires flat config (`eslint.config.js`); easy upgrade later if desired.
- **Jest + ESM friction.** `node --experimental-vm-modules` is required in the test scripts for ts-jest ESM mode. Documented inline in `api/package.json` scripts. If this becomes painful in Slice 1, fall back to `swc-jest` (per testing-strategy memory).
- **`scripts/tdd green` bootstrap extension.** Original bootstrap escape (no `package.json` / `node_modules`) wasn't enough — `tsc --noEmit` errors `TS18003: No inputs were found` when `api/src/` has no `.ts` files. Extended the bootstrap to also escape when `api/src/**/*.ts` is empty. Real gate engages as soon as the first source file lands.

## 2026-05-27 — Infrastructure / ClickHouse schema

The `events` table schema was designed by the `clickhouse-expert` sub-agent.
Captured here so the rationale survives across sessions.

### Design choices

- **Engine: `MergeTree`.** Events are append-only and immutable. `ReplacingMergeTree` would tempt callers into `FINAL` (slow); idempotent ingest via `event_id` is the right dedupe layer (future work, not the engine's job).
- **`ORDER BY (event_name, toStartOfHour(timestamp), user_id, timestamp)`.** Load-bearing decision:
  - Segmentation (`WHERE event_name = ? AND timestamp BETWEEN ...`) and Funnels (`WHERE event_name IN (...)` + `windowFunnel`) are the hot scan shapes. Both lead with `event_name` → mark-level pruning on the highest-selectivity filter.
  - `toStartOfHour(timestamp)` second keeps the index time-sorted within an event_name → fast time-range scans + `windowFunnel` cheap (a single user's events for the same name are contiguous on disk).
  - `user_id` before raw `timestamp` clusters a single user's events together within a name; final `timestamp` is the deterministic tie-breaker.
- **User-profile queries (`WHERE user_id = ?`) are NOT the ORDER BY leader.** Served via the `idx_user_id` bloom filter. A profile reads ≤ a few hundred events for one user — bloom-pruned granules stay sub-second at 100M rows. Leading with `user_id` would have wrecked segmentation/funnels.
- **`Map(String, String)` for properties, not JSON string.** Native sub-column storage; `properties['k']` and `mapKeys/mapValues` are first-class — orders of magnitude faster than `JSONExtract*` over a string. Tradeoff: all values are strings (correct for MVP).
- **`LowCardinality(String)` for `event_name`.** Dictionary-encoded → ~10x smaller + faster `GROUP BY`. `user_id` is high-cardinality so stays plain `String`.
- **`PARTITION BY toYYYYMM(timestamp)`.** Monthly partitions — small enough to drop for retention, large enough not to spam parts.
- **Codecs.** `DoubleDelta + ZSTD(3)` for timestamps (monotonic-ish, ~5-10x compression). `ZSTD(3)` for high-entropy strings (CPU cost pays back in IO saved). `event_name` gets LC's built-in compression.

### Alternatives ruled out

- Per-event-type tables — funnels span event types; rejected.
- `ORDER BY (user_id, timestamp)` (user-first) — wrecks segmentation/funnels.
- `ORDER BY (toStartOfHour(timestamp), event_name, user_id)` (time-first) — scatters funnel reads across hour buckets.
- ClickHouse 24.8+ experimental `JSON` type — fragile; `Map(String, String)` is boring and proven.
- Projections / materialized views for user_id — premature; bloom filter is cheaper at MVP scale. Revisit at 1B+ rows.

### Scale risks (planning horizon: ~100M rows)

- **100M rows:** all three query patterns stay sub-second with good filters. Single-user profile queries fine via bloom + pagination (`WHERE timestamp < :before`, never offset).
- **1B rows:** watch property map cardinality (many distinct keys → wider Map sub-columns → slow merges). Mitigation when needed: materialize top-N property keys; keep the long tail in the map.
- **TTL deliberately commented out.** "Forever" works until storage fills; uncomment the `ALTER` with a chosen interval (24 months suggested) when a real deployment has data.
- **No replication.** Single-node `MergeTree` is fine until it isn't. Upgrade to `ReplicatedMergeTree` is mechanical; mention in deploy docs eventually.

### Port contract impact (advisory — applied during Slice 1 / Slice 2)

The schema enables these typed port methods cleanly:

```ts
// api/src/domain/Event.ts
export interface Event {
  readonly eventId: string;
  readonly eventName: string;
  readonly userId: string;
  readonly timestamp: Date;
  readonly properties: Readonly<Record<string, string>>;
  readonly ingestedAt: Date;
}

// api/src/application/ports/EventWriterPort.ts
export interface EventWriterPort {
  write(event: Event): Promise<void>;
}

// api/src/application/ports/EventReaderPort.ts  (Slice 2)
export interface EventReaderPort {
  findByUser(
    userId: string,
    opts: { limit: number; before?: Date },
  ): Promise<Event[]>;
}
```

Notes: ordering is part of the contract (always `timestamp DESC` for profiles —
don't add a `order` option). `before` is the keyset-pagination cursor; never
offset (offset is O(n) in ClickHouse). Return is `Event[]`, no total count —
"load more" UX until page is short.

## 2026-05-27 — Docker setup

- **ClickHouse image:** `clickhouse/clickhouse-server:24.8` (LTS).
- **Healthcheck:** `wget --spider http://localhost:8123/ping` every 5s, 12 retries → up to 60s for cold start. `api` service `depends_on` waits for `service_healthy`.
- **Schema auto-load:** `./clickhouse/init/` mounted to `/docker-entrypoint-initdb.d` (read-only). ClickHouse runs all `.sql` files there on first boot.
- **Persistent volume:** `clickhouse-data` named volume → data survives container restart.
- **`api` service in compose but not yet buildable.** The Dockerfile references `dist/server.js` which doesn't exist until Slice 1. Smoke-test path during Infrastructure phase is `docker compose up -d clickhouse` only. Once Slice 1 lands, the full stack starts together.
- **Smoke test pending Docker daemon.** Could not verify the schema loads on first boot because Docker Desktop daemon wasn't running at the time of Infrastructure block completion. Verification queued — see `progress.md`.
