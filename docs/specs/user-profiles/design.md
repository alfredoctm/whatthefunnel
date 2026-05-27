# User Profiles — Design

> Status: SKELETON. Fill in after requirements, before tasks.
> Follows hexagonal + CQRS per [`CLAUDE.md`](../../../CLAUDE.md#architecture).

## Acceptance test entry point

TODO — the outermost behavior the failing acceptance test will assert.
Example:
```
GET /users/u1/events?limit=50
→ 200 OK
→ [{ event, timestamp }, …] ordered by timestamp DESC
```

## Query / Command

This feature is **read-only**, so a single **query** suffices.

- Query: `GetUserEventsQuery { userId, limit, before? }`
- Handler: `GetUserEventsHandler` — depends on `EventReaderPort`
- Returns: `Array<{ event, timestamp }>`

## Ports

- **Existing:** `EventReaderPort` (defined in Phase 1 Walking Skeleton)
- **New:** TODO — does this feature require extending the reader port? e.g., a `findByUser(userId, opts)` method.

## Adapters

- **Inbound:** Fastify route `GET /users/:user_id/events` builds the query and calls the handler.
- **Outbound:** `ClickHouseEventReader` adds the `findByUser` method. Invoke `clickhouse-expert` for the SQL.

## ClickHouse query

TODO — invoke `clickhouse-expert` sub-agent. Likely something like
`SELECT name, timestamp FROM events WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`,
fitted to the `EventReaderPort` contract.

## Edge cases

TODO — unknown user_id, empty event log, very large event count, `before` cursor edge values.

## Performance considerations

TODO — index on `user_id`? pagination strategy? expected event count per user at MVP scale.
