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

1. **Read** `goals.md` and any relevant `thoughts/`.
2. **Write `requirements.md`** — pair with the user, ask clarifying questions.
3. **Write `design.md`** — invoke `clickhouse-expert` sub-agent if it touches storage/queries.
4. **Run grill-me** — spawn `plan-griller` sub-agent against the design. Address findings.
5. **Write `tasks.md`** — vertical slices, 1–3 hours each.
6. **Implement in a worktree** (`EnterWorktree`) so the feature is isolated.
7. **Update `thoughts/phase-2/findings.md`** as you learn.

## Features

- [user-profiles/](user-profiles/) — per-user event log page
- [segmentation/](segmentation/) — filter/group events by properties over time
- [funnels/](funnels/) — ordered step conversion analysis
