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

## 2026-05-27 — Slice 1 friction logged

- **ClickHouse 24.x `default` user is localhost-only by default.** The shipped image installs `/etc/clickhouse-server/users.d/default-user.xml` restricting `default` to `127.0.0.1`/`::1` from *inside the container*. Connections through the Docker port mapping (host → bridge → container) come from the bridge gateway IP and are denied. Worked from `docker exec clickhouse-client` (running inside the container) but failed from `@clickhouse/client` on the host.
- **Fix:** added a dedicated `wtf` user via `clickhouse/users.d/wtf-user.xml`, mounted as a single-file volume into `/etc/clickhouse-server/users.d/`. Password `wtf` for local dev (documented in `.env.example` as "change for non-local deployments"). `default` stays locked down.
- **Mounting strategy:** mounted the user file individually (`./clickhouse/users.d/wtf-user.xml:/etc/clickhouse-server/users.d/wtf-user.xml:ro`) rather than the whole directory, to preserve the shipped `default-user.xml`.
- **`docker compose restart` doesn't pick up new volume mounts.** `restart` just SIGHUPs the container with the existing config. Had to `docker compose down && docker compose up -d` to recreate. Worth knowing for any future compose change that adds/changes mounts.
- **DateTime64 round-trip via `@clickhouse/client` JSONEachRow** needs `'YYYY-MM-DD HH:MM:SS.sss'` string format (not ISO). The adapter has a `formatDateTime64()` helper that strips the `T` and `Z`. The integration test reverses it on read. Brittle — replace with `Date` typed inputs if/when the client supports it natively.

## 2026-05-27 — Aggregate folder restructure

- Mid-Slice-1 (post-closeout), realized the `api/src/` hex layout was missing the **aggregate** level. Original layout put `domain/application/adapters` directly under `api/src/`. Refactored to `api/src/events/{domain,application,adapters}/` so that adding a future `users/` aggregate is a sibling, not a restructure.
- Saved as `feedback-aggregates` memory. Updated CLAUDE.md (Architecture + Layout), plan.md (Slice 1 done-list + Slice 2 paths), `code-reviewer` + `plan-griller` + `clickhouse-expert` sub-agents (cross-aggregate import is a blocker; composition is the only allowed multi-aggregate importer).
- Cross-aggregate query projections (e.g., the future Funnels/Segmentation queries) live under the **events** aggregate as queries — they're not aggregates themselves. Codified in the memory.
- **Refactor handled via `scripts/tdd unlock "refactor: per-aggregate folder structure"`.** No new behavior, but `api/src/**` had to be touched while state was GREEN. UNLOCK + reason was the right primitive; once moves + import updates were done, re-ran `scripts/tdd green` which re-verified tests + typecheck before flipping back. Audit log captures both events.
- Open question: where do *cross-cutting HTTP assets* (HTMX, design-system CSS) live in Phase 1.5? Not an aggregate. Likely `api/src/http/static/` or `api/src/shared/http/`. Deferred to Phase 1.5 design-system work.

## 2026-05-27 — Filename + fixture naming corrections

- **Switched all `.ts` filenames from PascalCase to kebab-case.** `Event.ts` → `event.ts`, `EventWriterPort.ts` → `event-writer-port.ts`, etc. Kebab-case is the dominant convention in modern Node/TS ESM (Fastify, ClickHouse client, most of npm). PascalCase-per-file is more C#/Angular. Saved in `feedback-typescript` memory under "TS-specific architectural conventions."
- **macOS APFS is case-insensitive.** The `Event.ts` → `event.ts` rename needed a two-step `mv Event.ts event-tmp.ts && mv event-tmp.ts event.ts` because a direct `mv` would resolve src and dest to the same path. The other renames (which also changed letters, not just case) didn't need the dance.
- **Bulk sed for import updates worked cleanly.** Pattern: `find src test -name '*.ts' -print0 | xargs -0 sed -i '' -e "s|/OldName\.js'|/new-name.js'|g" ...` (note the trailing single quote in the pattern — anchors to the import path's closing quote so it doesn't match identifiers).
- **"Fixture" terminology corrected.** Originally used "fixture" for the test-environment setup (`inMemoryFixture` returning `{ writer, readBack, cleanup }`). User clarified: fixture = test-data builder (`makeEvent({...})`). Renamed contract-test setups to `setupInMemory` / `setupClickHouse` with type `Setup` (was `Fixture`). The actual fixture (`makeEvent`) was duplicated across `read-events.test.ts` and `event-reader.contract.test.ts` — extracted to `api/test/fixtures/event.ts`. Saved in `feedback-testing-strategy` memory.

## 2026-05-27 — Lint added to the TDD-green gate

- We shipped commit `3368e2b` (the kebab-case refactor) with lint errors. `scripts/tdd green` previously ran `test:fast` + `typecheck` only — lint wasn't part of the slice-closeout gate, so it slipped through.
- Lint errors that escaped: 3 `no-unnecessary-type-assertion` (fastify-inject's `response.json()` is already typed, the `as Array<...>` cast was redundant), and 2 `require-await` (`setupInMemory` was `async` but had no `await` in body).
- **Fixed by:** switching to the typed generic form `response.json<EventJson[]>()`; dropping `async` from the `setupInMemory` functions and returning `Promise.resolve({...})` explicitly. Eliminates both error classes at the source rather than disabling lint rules.
- **Added `npm run lint` to `scripts/tdd green`** as the third check (after `test:fast` and `typecheck`). Lint failure now refuses the green flip with the same audit log treatment as the other gates. CLAUDE.md and `feedback-typescript` memory updated.
