# Event Segmentation — Design

> Status: SKELETON. Fill in after requirements, before tasks.

## ClickHouse query shape

TODO — invoke `clickhouse-expert`. Likely involves `GROUP BY toStartOfHour(timestamp), JSONExtractString(properties, ?)` or similar.

## API endpoint

TODO — e.g., `POST /segment` with body `{ event, filters, group_by, time_range, bucket }`.

## Frontend (if any)

TODO

## Edge cases

TODO — missing property, high-cardinality group_by, empty result.

## Performance considerations

TODO — materialized views for hot segments? sampling?
