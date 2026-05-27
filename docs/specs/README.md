# docs/specs/

Per-feature specification dirs for spec-driven development (SDD).

Each feature has three files, filled out **before** implementation begins:

- **`requirements.md`** — what does this feature need to do? User-facing
  behavior, success criteria. No solutions, just constraints.
- **`design.md`** — how will we build it? Architecture, data model,
  endpoints, query shapes, edge cases.
- **`tasks.md`** — broken-down work items, each sized to 1–3 hours
  (per the Walking Skeleton / micro-step discipline).

## Why

For solo + AI-assisted development, the bottleneck is rarely typing — it's
clarity. Writing a spec forces decisions up front, gives sub-agents structured
input to design against, and creates a durable artifact that survives `/clear`.

## Workflow per feature

1. **Read** `goals.md`, the architecture section in `CLAUDE.md`, and any relevant `thoughts/`.
2. **Write `requirements.md`** — pair with the user, ask clarifying questions. No solutions.
3. **Write `design.md`** — must name:
   - the **ports** involved (new or existing reader/writer/etc.)
   - the **command(s) and/or query(ies)** with their shapes
   - the **acceptance test entry point** (the HTTP request + expected response)
   - the ClickHouse query/schema parts — invoke `clickhouse-expert` sub-agent for these.
4. **Run grill-me** — spawn `plan-griller` against the design. Address blockers and risks.
5. **Write `tasks.md`** — vertical slices, 1–3 hours each. **First task is always the failing acceptance test.** Then port → handler (with unit test) → inbound adapter → outbound adapter → composition wiring.
6. **Implement in a worktree** (`EnterWorktree`) so the feature is isolated.
7. **Update `thoughts/phase-2/findings.md`** as you learn.

## Features

- [user-profiles/](user-profiles/) — per-user event log page
- [segmentation/](segmentation/) — filter/group events by properties over time
- [funnels/](funnels/) — ordered step conversion analysis
