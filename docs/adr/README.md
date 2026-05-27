# Architecture Decision Records (ADRs)

Short, dated records of significant architectural decisions. One file per
decision, immutable once accepted (superseded by a new ADR, never edited in
place).

## Format

Each ADR uses [Michael Nygard's template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions):

```
# NNNN — Title

Status: accepted | superseded by NNNN | deprecated
Date: YYYY-MM-DD

## Context
What forces / constraints / observations led to this decision?

## Decision
What did we choose?

## Consequences
What gets easier? What gets harder? What does this commit us to?
```

## Numbering

Four-digit, zero-padded, sequential. Don't reuse numbers — if an ADR is
withdrawn, mark its status `deprecated` and leave the file.

## When to write one

Write an ADR when a decision will be **surprising or load-bearing later**:
- A non-obvious choice between credible alternatives ("why Jest not Vitest").
- A constraint that shapes downstream design ("ports are TS interfaces, not
  classes").
- A trade-off where the "wrong" path is more conventional ("we don't unit-test
  the application layer").
- Any decision that, if forgotten, will be argued about again next quarter.

**Don't write ADRs for:**
- Conventions covered by linters / formatters.
- Bug fixes (use the commit message).
- Tactical choices inside a single feature (use the feature's `design.md`).

## Index

- [0001 — Hexagonal + CQRS](0001-hexagonal-cqrs.md)
- [0002 — TypeScript strict + ESM](0002-typescript-strict-esm.md)
- [0003 — Jest + ts-jest for tests](0003-jest-and-ts-jest.md)
- [0004 — No application-layer unit tests](0004-no-application-unit-tests.md)
- [0005 — Parametrized real-vs-fake contract tests](0005-parametrized-contract-tests.md)
- [0006 — Per-aggregate folder layout](0006-per-aggregate-folder-layout.md)
- [0007 — React + Tailwind + esbuild for the UI (no Vite)](0007-react-tailwind-esbuild.md)
- [0008 — Playwright E2E is the primary test tier for UI features](0008-playwright-e2e-primary.md)
