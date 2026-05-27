# 0005 — Parametrized real-vs-fake contract tests for adapters

Status: accepted
Date: 2026-05-27

## Context

[ADR 0001](0001-hexagonal-cqrs.md) introduces in-memory port fakes that
acceptance tests use to compose the application without hitting the
database. Those fakes are only useful if they **behave like the real
adapter**. If the fake silently diverges from the real implementation
(missing edge case, different sort order, different error semantics),
acceptance tests start lying — they pass even though prod is broken.

The conventional defenses (manual coordination, "remember to update both",
shared base classes) all fail in practice. We needed a mechanism that makes
divergence fail loudly the moment it appears.

## Decision

For every port, write **one test suite that runs against both implementations**
(real + in-memory fake) via `describe.each`:

```ts
const impls = [
  { name: 'InMemoryEventWriter', setup: setupInMemory },
  { name: 'ClickHouseEventWriter', setup: setupClickHouse },
];

describe.each(impls)('EventWriterPort contract: $name', ({ setup }) => {
  // identical test body
});
```

The test body asserts the port contract — *what every implementation must
do* — not implementation internals. If only one implementation passes a
test, that implementation is wrong (or the fake is lying about the contract).

These live under `api/test/integration/` (one file per port) and run via
`npm run test:integration`. They **do not** run as part of the TDD-green
gate (`scripts/tdd green` runs `test:fast` only) because they need the
docker stack up. They run in CI on every PR.

## Consequences

**What gets easier:**
- Adding a new adapter implementation (e.g., a `PostgresEventWriter`)
  reuses the same contract suite — drop in the setup, get the same
  invariants verified for free.
- The in-memory fake earns trust by passing the same tests as the real
  adapter. Acceptance tests using the fake become a reliable proxy for
  prod behavior.
- Contract drift between real and fake is caught immediately, not weeks
  later in a flaky acceptance test.

**What gets harder:**
- Each port-adding slice has to write *both* implementations (real +
  fake) plus the parametrized suite. More work per slice; justified by
  the safety net.
- Integration tests need a real database available. The docker-compose
  healthcheck makes `docker compose up -d --wait` reliable enough to
  use in scripts; tests use a per-suite `TRUNCATE` for isolation.

**Commits us to:**
- Every reader/writer port has two implementations: real (under
  `adapters/outbound/<vendor>/`) and in-memory (under `api/test/fakes/`).
- The shape `Setup` (interface) + `setupX()` (function) is the canonical
  pattern for these tests; the word "fixture" is reserved for test-data
  builders (`makeEvent`), not test-environment setups.
