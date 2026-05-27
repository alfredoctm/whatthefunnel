# User Profiles — Design

> Status: SKELETON. Fill in after requirements, before tasks.

## Data flow

TODO — How does an event get from `POST /events` to the profile page?

## ClickHouse query

TODO — invoke `clickhouse-expert` sub-agent. Likely: `SELECT name, timestamp FROM events WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`.

## API endpoint(s)

TODO — e.g., `GET /users/:user_id/events?limit=...&before=...`

## Frontend (if any in MVP)

TODO — minimal HTML/SSR or JSON-only?

## Edge cases

TODO — unknown user_id, empty event log, very large event count.

## Performance considerations

TODO — index on `user_id`? sampling? pagination strategy?
