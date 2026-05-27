# docs/specs/

Per-feature specification dirs for spec-driven development (SDD).

Each feature has these artifacts, split across `docs/specs/<feature>/` (specs) and `ui/src/features/<feature>/` (the design contract is real code):

In `docs/specs/<feature>/`:
- **`requirements.md`** — what does this feature need to do? User-facing behavior, success criteria. No solutions, just constraints.
- **`ui-spec.md`** — design rationale: intent, states, interactions, components used, decisions, open design questions.
- **`design.md`** — engineering: data model, ports, command/query shapes, endpoints, acceptance test entry point. Visual Design section links to the React preview component.
- **`tasks.md`** — broken-down work items, each sized to 1–3 hours, vertical slices, **first item is always the failing acceptance test** (or failing E2E test for UI-only features).

In `ui/src/features/<feature>/` (produced by `ui-designer`):
- **`<Feature>.tsx`** — pure React component, Tailwind-styled.
- **`<Feature>.preview.tsx`** — stub-data mount of `<Feature>`, registered at `/preview/<feature>` in `ui/src/routes.tsx`. **This is the design contract.**
- **`<Feature>Page.tsx`** — data-fetching wrapper for the real route.

In `e2e/test/`:
- **`<feature>.spec.ts`** — Playwright E2E. Primary verification per [ADR 0008](../adr/0008-playwright-e2e-primary.md).

## Why

For solo + AI-assisted development, the bottleneck is rarely typing — it's
clarity. Writing a spec forces decisions up front, gives sub-agents structured
input to design against, and creates a durable artifact that survives `/clear`.

## Workflow per feature

Eleven steps. Mirrors a real product-team flow (PRD review → design + eng in parallel → joint review → build → review → document). See [`../../CLAUDE.md`](../../CLAUDE.md) → "Spec-driven features" and "Design phase" for full context.

1. **Read** `goals.md`, the Architecture + Design phase sections of `CLAUDE.md`, `docs/design-system.md`, and any relevant `thoughts/`.
2. **Write `requirements.md`** — pair with user on ambiguity. No solutions.
3. **Grill 1 — requirements.** Spawn `plan-griller` against `requirements.md` alone. Address blockers before any detailed work.
4. **Design.** Invoke `ui-designer` sub-agent. Produces `<Feature>.tsx` + `<Feature>.preview.tsx` (registered at `/preview/<feature>`) + `ui-spec.md`. If `ui-spec.md` has open design questions, resolve them before step 5.
5. **Write `design.md`** (engineering) — must name:
   - the **ports** involved (new or existing reader/writer/etc.)
   - the **command(s) and/or query(ies)** with their shapes
   - the **acceptance test entry point** (the HTTP request + expected response)
   - the **Visual Design** section: link to the React preview component path + route, summary of states
   - the ClickHouse query/schema parts — invoke `clickhouse-expert` sub-agent for these.
6. **Grill 2 — combined design.** Spawn `plan-griller` against `design.md` (which references the preview component + `ui-spec.md`). Attacks engineering correctness *and* whether engineering supports the design. Address blockers and risks.
7. **Write `tasks.md`** — vertical slices, 1–3 hours each. **First task is always the failing acceptance test (api side) or failing E2E test (ui side).** Then port → handler → inbound adapter → outbound adapter → composition wiring; or `<Feature>Page.tsx` + route registration + `lib/api.ts` addition.
8. **Implement in a worktree** (`EnterWorktree`). Invoke `design-handoff` to plan the data wiring (real route + page wrapper + `lib/api.ts` fetch). Implement under the TDD-guard hook.
9. **After tests green:** run `code-reviewer` (engineering diff) and `design-reviewer` (Playwright comparison of real route vs `/preview/<feature>`). Address findings. Exit worktree.
10. **Documentation pass.** See [`../architecture.md`](../architecture.md) and [`../adr/`](../adr/) for the canonical pattern. For this feature:
    - Update the **C4 Component** diagram in `docs/architecture.md` if you added new components.
    - Add a **Mermaid sequence diagram** of the feature's flow(s) to its `design.md` next to the Visual Design section.
    - Write **ADRs** (`docs/adr/NNNN-<title>.md`) for any decision that will be surprising or load-bearing later (criteria in `docs/adr/README.md`).
    - Update `docs/glossary.md` if any new domain term entered the ubiquitous language.
11. **Update `thoughts/phase-2/findings.md`** as you learn.

## Features

- [user-profiles/](user-profiles/) — per-user event log page
- [segmentation/](segmentation/) — filter/group events by properties over time
- [funnels/](funnels/) — ordered step conversion analysis
