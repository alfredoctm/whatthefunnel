# Event Segmentation — Design

> Status: SKELETON. Fill in after requirements, before tasks.
> Follows hexagonal + CQRS per [`CLAUDE.md`](../../../CLAUDE.md#architecture).

## Visual design

- **Preview component:** `ui/src/features/segmentation/Segmentation.preview.tsx` — produced by `ui-designer`. Mounted at `/preview/segmentation`. **This is the design contract.**
- **Real component:** `ui/src/features/segmentation/Segmentation.tsx` — pure, takes data as props.
- **Page wrapper:** `ui/src/features/segmentation/SegmentationPage.tsx` — fetches segmented data, handles loading/error/ok.
- **Spec:** [`ui-spec.md`](ui-spec.md) — rationale, states, interactions.
- **States covered:** TODO — pull from `ui-spec.md` (empty, loading, error, few groups, many groups, high-cardinality overflow, …).
- **Open design questions:** TODO — pull from `ui-spec.md`; must be empty before engineering implementation starts.
- **E2E test:** `e2e/test/segmentation.spec.ts` — seeds events via `/api/*`, navigates to real route, asserts the chart/table renders.

## Acceptance test entry point

TODO. Example:
```
POST /segment
{ event: "signup", filters: {...}, group_by: "country", time_range: {...}, bucket: "1h" }
→ 200 OK
→ [{ key: "US", buckets: [{ ts, count }, …] }, …]
```

## Query / Command

Read-only — a **query**.

- Query: `SegmentEventsQuery { event, filters, groupBy, timeRange, bucket }`
- Handler: `SegmentEventsHandler` — depends on `EventReaderPort`
- Returns: `Array<{ key, buckets: Array<{ ts, count }> }>`

## Ports

- **Existing:** `EventReaderPort`
- **New:** TODO — likely a `segment(query)` method on the reader port.

## Adapters

- **Inbound:** Fastify route `POST /segment` builds the query and calls the handler.
- **Outbound:** `ClickHouseEventReader.segment()`. Invoke `clickhouse-expert` for the SQL.

## ClickHouse query

TODO — invoke `clickhouse-expert`. Likely involves
`GROUP BY toStartOfHour(timestamp), properties['<group_by>']` shape, fitted to the reader-port contract.

## Edge cases

TODO — missing property, high-cardinality group_by, empty result, very wide time range.

## Performance considerations

TODO — materialized views for hot segments? sampling? max bucket count?
