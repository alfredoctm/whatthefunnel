# Funnels — Design

> Status: SKELETON. Fill in after requirements, before tasks.
> Follows hexagonal + CQRS per [`CLAUDE.md`](../../../CLAUDE.md#architecture).

## Visual design

- **Preview component:** `ui/src/features/funnels/Funnels.preview.tsx` — produced by `ui-designer`. Mounted at `/preview/funnels`. **This is the design contract.**
- **Real component:** `ui/src/features/funnels/Funnels.tsx` — pure, takes funnel result data as props.
- **Page wrapper:** `ui/src/features/funnels/FunnelsPage.tsx` — fetches funnel analysis, handles loading/error/ok.
- **Spec:** [`ui-spec.md`](ui-spec.md) — rationale, states, interactions.
- **States covered:** TODO — pull from `ui-spec.md` (empty, loading, error, 2-step, many-step, zero-conversion, …).
- **Open design questions:** TODO — pull from `ui-spec.md`; must be empty before engineering implementation starts.
- **E2E test:** `e2e/test/funnels.spec.ts` — seeds a funnel sequence via `/api/*`, navigates to real route, asserts step counts + conversion %.

## Acceptance test entry point

TODO. Example:
```
POST /funnels/analyze
{ steps: ["signup","activated","purchased"], time_range: {...}, window_hours: 168 }
→ 200 OK
→ [{ step: "signup", count: 1000 }, { step: "activated", count: 420 }, …]
```

## Query / Command

Read-only — a **query**.

- Query: `AnalyzeFunnelQuery { steps, timeRange, windowHours }`
- Handler: `AnalyzeFunnelHandler` — depends on `EventReaderPort`
- Returns: `Array<{ step, count }>` (or richer per-step shape including conversion %)

## Ports

- **Existing:** `EventReaderPort`
- **New:** TODO — a `funnel(query)` method on the reader port.

## Adapters

- **Inbound:** Fastify route `POST /funnels/analyze`.
- **Outbound:** `ClickHouseEventReader.funnel()`. Invoke `clickhouse-expert` — ClickHouse's `windowFunnel()` aggregate is almost certainly the right primitive.

## ClickHouse query

TODO — invoke `clickhouse-expert`. Investigate `windowFunnel()` shape and how to map step indices back to event names.

## Edge cases

TODO — users with steps out of order, repeated step events, window edges, missing intermediate steps.

## Performance considerations

TODO — funnel queries are heavy. Index strategy? Pre-aggregation? Sampling for large date ranges?
