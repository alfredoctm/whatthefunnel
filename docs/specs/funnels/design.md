# Funnels — Design

> Status: SKELETON. Fill in after requirements, before tasks.
> Follows hexagonal + CQRS per [`CLAUDE.md`](../../../CLAUDE.md#architecture).

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
