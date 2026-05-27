# 0006 — Per-aggregate folder layout under `api/src/`

Status: accepted
Date: 2026-05-27

## Context

[ADR 0001](0001-hexagonal-cqrs.md) commits to hexagonal + CQRS but leaves
the file layout open. The naive layout — `api/src/domain/`,
`api/src/application/`, `api/src/adapters/` directly under `src` — works
fine for one aggregate. The moment a second aggregate appears
(`users/`, `sessions/`, …), it has to either intermingle with the existing
files (bad) or trigger a costly restructure (worse).

The opportunity to fix this is cheap *before* the second aggregate exists.
After it exists, the cost grows fast.

## Decision

Each **aggregate** gets its own folder directly under `api/src/`. Inside,
the hexagonal layout (`domain/`, `application/`, `adapters/`) repeats.

```
api/src/
  events/                            ← aggregate
    domain/
    application/
      commands/
      queries/
      ports/
    adapters/
      inbound/http/
      outbound/clickhouse/
  users/                             ← future aggregate, same shape
  composition.ts                     ← cross-aggregate wiring
  server.ts                          ← process entry
```

**Definitions:**
- An **aggregate** is the unit of transactional consistency — owns its
  writes, owns its ports.
- **Query projections** (Segmentation, Funnels, etc.) are *not* aggregates.
  They're read-side patterns over an existing aggregate and live under
  that aggregate's `application/queries/`.
- **Cross-aggregate imports** are forbidden outside `composition.ts`
  (and `server.ts`). `events/` cannot import from `users/`. Enforced by
  `code-reviewer` as a blocker.

## Consequences

**What gets easier:**
- New aggregates slot in as siblings without restructuring existing code.
- The aggregate boundary is visible in the filesystem, not just in
  someone's head.
- Any cross-aggregate import shows up loudly in `git diff` and PRs —
  someone has to explicitly add `events/something` from inside `users/`,
  which is an immediate review flag.
- Maps cleanly to "modular monolith → extract a microservice later"
  if/when that becomes necessary.

**What gets harder:**
- One more folder level than the minimal-but-painful flat layout.
- Renaming an aggregate touches more paths (mitigated by the `find +
  xargs sed` pattern documented in `thoughts/phase-1/findings.md`).

**Commits us to:**
- `composition.ts` and `server.ts` are the only files allowed to import
  across aggregates. Anything else doing so is a refactor target.
- Query projections that genuinely span aggregates (e.g., a future
  "users-who-did-X" query that needs both `users/` and `events/`) need a
  decision — likely a new query handler at `composition.ts` level, or
  a dedicated read-model module. Defer until we have one.
