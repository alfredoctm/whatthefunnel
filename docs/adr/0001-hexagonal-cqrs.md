# 0001 — Hexagonal architecture + CQRS

Status: accepted
Date: 2026-05-27

## Context

WTF is a small service (ingest + a few read endpoints) with a clear two-sided
shape: a hot write path (events come in) and a few read shapes (per-user
history, segmentation, funnels) that all hit the same `events` table from
different angles. The codebase will be worked on heavily by AI agents in an
outside-in TDD loop; that loop is much cheaper when the seams between
"things that talk to the outside world" and "things that compute" are
explicit and named.

The conventional alternatives — a Rails/Express-style flat MVC, a
service-layer monolith over an ORM — would have been faster to start. But
both make the seams implicit, which means tests either reach across the seam
(slow, brittle) or mock at module boundaries (brittle in different ways).

## Decision

Adopt **hexagonal architecture** (ports & adapters):

- `domain/` and `application/` are pure. No I/O, no framework imports.
- All I/O crosses an explicit **port** (TypeScript interface) implemented
  by an **adapter** under `adapters/`.
- Dependency direction points inward: adapters import from the core; the
  core never imports from adapters.
- `composition.ts` is the only file that knows concrete adapter classes.

Adopt **CQRS** as the application-layer organization:

- **Commands** (writes) and **queries** (reads) live in separate folders,
  separate handlers, separate ports (`EventWriterPort`, `EventReaderPort`).
- Reader and writer are separate interfaces *even when the same adapter
  backs both*. This preserves the option of read replicas, materialized
  views, or projection stores later without refactoring callers.
- A handler is either a command or a query, never both.

## Consequences

**What gets easier:**
- Acceptance tests compose the app with in-memory port fakes; no module
  mocking. The same `buildApp` factory is used in tests and prod.
- New storage strategies for reads (materialized views, separate read DB)
  ship as new adapter implementations of the existing reader port,
  without touching handlers or routes.
- Outside-in TDD becomes mechanical: write a failing test against the
  HTTP boundary, then walk the ports inward.

**What gets harder:**
- More files per slice than a flat MVC would have (port, command, handler,
  inbound adapter, outbound adapter, composition wiring). Justified by the
  benefits above; codified in [`feedback-aggregates`](#0006).
- More vocabulary up front for newcomers ("port", "adapter", "command
  handler"). Mitigated by [`CLAUDE.md`](../../CLAUDE.md) and the per-feature
  spec template.

**Commits us to:**
- Never importing a database client, HTTP library, `fs`, or `env` from
  inside `domain/` or `application/`. This is enforced by the
  `code-reviewer` sub-agent (treated as a blocker).
- Always defining a new reader/writer port pair when persistence is added
  (no shared bidirectional port).
