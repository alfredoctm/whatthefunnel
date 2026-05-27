# Funnels — Design

> Status: SKELETON. Fill in after requirements, before tasks.

## ClickHouse query shape

TODO — invoke `clickhouse-expert`. ClickHouse has a `windowFunnel()` aggregate that may be a near-perfect fit. Investigate.

## API endpoint

TODO — e.g., `POST /funnels/analyze` with body `{ steps: [...], time_range, window_hours }`.

## Edge cases

TODO — users who completed steps out of order, repeat conversions, missing intermediate steps.

## Performance considerations

TODO — funnel queries are heavy. Index strategy? Pre-aggregation?
