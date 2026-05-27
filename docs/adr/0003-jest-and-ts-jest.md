# 0003 — Jest + ts-jest for tests

Status: accepted
Date: 2026-05-27

## Context

A test framework had to be chosen for a project that uses TypeScript strict
+ ESM (see [ADR 0002](0002-typescript-strict-esm.md)) and Fastify (which
ships `fastify.inject()` for in-process HTTP acceptance tests).

The serious candidates were:
- **Jest** — most familiar in the JS/TS ecosystem, huge plugin surface,
  but historically rough with ESM.
- **Vitest** — Vite-native, ESM-first, faster startup. Less battle-tested
  for the boring stuff (sequential parametrized suites with `describe.each`
  against a real DB).
- **Node built-in `node:test`** — zero dependencies, ESM-native, but
  spartan: no `describe.each`, weak assertion library, less rich tooling.

## Decision

**Jest 29 with `ts-jest` 29 ESM preset**, plus `fastify.inject()` for HTTP
acceptance tests. Locked in `api/package.json`.

The test runner needs `node --experimental-vm-modules` to load ESM modules;
this lives in the npm scripts (`test:fast`, `test:integration`) rather than
being a global Node flag.

If `ts-jest` ESM proves painful in practice, the **documented fallback** is
to swap in `swc-jest` (faster transpile, less strict type-checking during
tests — typecheck is handled separately via `tsc --noEmit` at the TDD-green
gate, so losing it in tests is not catastrophic). Record the swap in
`thoughts/phase-1/findings.md` if it happens.

## Consequences

**What gets easier:**
- `describe.each([impls])` for parametrized contract tests
  (see [ADR 0005](0005-parametrized-contract-tests.md)) — the killer
  feature for our testing strategy.
- Familiar `expect(...)` API; large pool of examples to draw from.
- `fastify.inject()` works out of the box (it's HTTP-library-agnostic).

**What gets harder:**
- ESM + Jest is genuinely fussy. The `extensionsToTreatAsEsm`,
  `moduleNameMapper` for `.js`-suffixed imports, and `useESM: true` in
  the `ts-jest` transform all have to line up.
- Slower than Vitest cold-start.

**Commits us to:**
- The `node --experimental-vm-modules` flag in test scripts until Node
  ships VM Modules as stable.
- Reviewing the ts-jest decision periodically — if Vitest's ecosystem
  surpasses Jest's for our needs, this ADR gets superseded.
